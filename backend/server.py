from dotenv import load_dotenv
load_dotenv()

import os
import io
import re
import json
import base64
import bcrypt
import jwt as pyjwt
import logging
from datetime import datetime, timezone, timedelta, date
from typing import Optional, List, Annotated, Any, Dict, Tuple
from contextlib import asynccontextmanager

from fastapi import (
    FastAPI, APIRouter, Depends, HTTPException, Request, Response,
    UploadFile, File, Form,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr, Field, BeforeValidator
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from openpyxl import Workbook

from emergentintegrations.llm.chat import (
    LlmChat, UserMessage, ImageContent, TextDelta, StreamDone,
)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("inventory")

# ---------------------------------------------------------------------------
# Env & constants
# ---------------------------------------------------------------------------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_TTL_MIN = 60 * 24  # 1 day
ACCESS_COOKIE_MAX_AGE = ACCESS_TOKEN_TTL_MIN * 60
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@inventory.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Admin@12345")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "*")

NEAR_EXPIRY_DAYS_DEFAULT = int(os.environ.get("NEAR_EXPIRY_DAYS_DEFAULT", "30"))
CRITICAL_EXPIRY_DAYS_DEFAULT = int(os.environ.get("CRITICAL_EXPIRY_DAYS_DEFAULT", "7"))

ROLES = ["worker", "manager", "admin"]
ACCESS_COOKIE = "access_token"

# ---------------------------------------------------------------------------
# DB
# ---------------------------------------------------------------------------
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# ---------------------------------------------------------------------------
# Pydantic helpers
# ---------------------------------------------------------------------------
def _validate_oid(v: Any) -> str:
    if isinstance(v, ObjectId):
        return str(v)
    if isinstance(v, str):
        return v
    raise ValueError("Invalid ObjectId")


PyObjectId = Annotated[str, BeforeValidator(_validate_oid)]


def serialize_doc(doc: dict) -> dict:
    if not doc:
        return doc
    doc = {**doc}
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    for k, v in list(doc.items()):
        if isinstance(v, ObjectId):
            doc[k] = str(v)
        elif isinstance(v, datetime):
            doc[k] = v.isoformat()
    return doc


# ---------------------------------------------------------------------------
# Password & JWT
# ---------------------------------------------------------------------------
def hash_password(password: str) -> str:
    # bcrypt has a 72-byte input limit – truncate defensively.
    pwd: bytes = password.encode("utf-8")[:72]
    return bcrypt.hashpw(pwd, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8")[:72], hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_TTL_MIN),
        "type": "access",
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def set_access_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=ACCESS_COOKIE,
        value=token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=ACCESS_COOKIE_MAX_AGE,
        path="/",
    )


def clear_access_cookie(response: Response) -> None:
    response.delete_cookie(key=ACCESS_COOKIE, path="/")


async def get_current_user(request: Request) -> dict:
    # Prefer httpOnly cookie; fall back to Authorization header for API/test clients.
    token = request.cookies.get(ACCESS_COOKIE)
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    user = serialize_doc(user)
    user.pop("password_hash", None)
    return user


def require_roles(*allowed: str):
    async def _dep(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in allowed:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user

    return _dep


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=80)
    role: str = "worker"


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str
    role: str
    created_at: Optional[str] = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
    role_overridden: bool = False


class OcrFields(BaseModel):
    product_name: Optional[str] = None
    batch_number: Optional[str] = None
    mfg_date: Optional[str] = None
    exp_date: Optional[str] = None
    quantity: Optional[str] = None
    category: Optional[str] = None


class OcrResult(BaseModel):
    fields: OcrFields
    confidence: float
    issues: List[str] = []
    needs_review: bool
    raw_text: Optional[str] = None


class ProductIn(BaseModel):
    product_name: str
    batch_number: str
    mfg_date: Optional[str] = None
    exp_date: str
    quantity: Optional[int] = 0
    category: Optional[str] = "general"
    notes: Optional[str] = None


class ProductUpdate(BaseModel):
    product_name: Optional[str] = None
    batch_number: Optional[str] = None
    mfg_date: Optional[str] = None
    exp_date: Optional[str] = None
    quantity: Optional[int] = None
    category: Optional[str] = None
    notes: Optional[str] = None


class ThresholdIn(BaseModel):
    category: str
    near_expiry_days: int = Field(ge=1, le=365)
    critical_days: int = Field(ge=1, le=365)


class UpdateUserRoleIn(BaseModel):
    role: str


# ---------------------------------------------------------------------------
# Helpers: date parsing / status
# ---------------------------------------------------------------------------
DATE_FORMATS = [
    "%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d",
    "%d %b %Y", "%d %B %Y", "%b %d %Y", "%B %d %Y",
    "%d-%b-%Y", "%d-%B-%Y", "%b %Y", "%B %Y", "%m-%Y", "%m/%Y",
    "%Y-%m", "%Y", "%d.%m.%Y",
]


def parse_date(s: Optional[str]) -> Optional[date]:
    if not s:
        return None
    s = re.sub(r"\s+", " ", str(s).strip())
    for fmt in DATE_FORMATS:
        try:
            d = datetime.strptime(s, fmt)
            if fmt in ("%b %Y", "%B %Y", "%m-%Y", "%m/%Y", "%Y-%m"):
                next_month = d.replace(day=28) + timedelta(days=4)
                return next_month - timedelta(days=next_month.day)
            if fmt == "%Y":
                return d.replace(month=12, day=31).date()
            return d.date()
        except ValueError:
            continue
    return None


async def load_threshold_map() -> Dict[str, Tuple[int, int]]:
    """Fetch all thresholds once per request to avoid N+1 lookups."""
    out: Dict[str, Tuple[int, int]] = {}
    async for t in db.thresholds.find():
        out[t["category"]] = (
            int(t.get("near_expiry_days", NEAR_EXPIRY_DAYS_DEFAULT)),
            int(t.get("critical_days", CRITICAL_EXPIRY_DAYS_DEFAULT)),
        )
    return out


def thresholds_for(category: Optional[str], cache: Dict[str, Tuple[int, int]]) -> Tuple[int, int]:
    cat = (category or "general").lower()
    return cache.get(cat, (NEAR_EXPIRY_DAYS_DEFAULT, CRITICAL_EXPIRY_DAYS_DEFAULT))


def compute_status(exp_date_str: Optional[str], near_days: int, critical_days: int) -> Tuple[str, int]:
    d = parse_date(exp_date_str)
    if not d:
        return ("unknown", 9999)
    diff = (d - date.today()).days
    if diff < 0:
        return ("expired", diff)
    if diff <= critical_days:
        return ("critical", diff)
    if diff <= near_days:
        return ("near_expiry", diff)
    return ("safe", diff)


def enrich_product_sync(p: dict, cache: Dict[str, Tuple[int, int]]) -> dict:
    near, crit = thresholds_for(p.get("category"), cache)
    status_str, days_left = compute_status(p.get("exp_date"), near, crit)
    p["status"] = status_str
    p["days_left"] = days_left
    return p


async def enrich_product(p: dict) -> dict:
    """Single-product variant; for multi-product use load_threshold_map() + enrich_product_sync."""
    cache = await load_threshold_map()
    return enrich_product_sync(p, cache)


# ---------------------------------------------------------------------------
# OCR (Gemini Vision) — split into small helpers for testability
# ---------------------------------------------------------------------------
OCR_SYSTEM_PROMPT = """You are an OCR + structured extraction engine for product labels.
Extract the following fields from the image of a product label:
- product_name (the brand + descriptive name as printed)
- batch_number (also shown as "Batch No", "Lot", "B.No.", "L/N", "BN")
- mfg_date (Manufacturing Date - "MFG", "MFD", "Mfd.", "Manufactured")
- exp_date (Expiry / Best Before Date - "EXP", "Best Before", "Use By", "BB")
- quantity (numeric quantity if present, e.g. "500ml", "1 kg", "12 units")
- category (one of: food, beverage, dairy, pharma, cosmetics, snacks, frozen, general)
- raw_text (the full text you can read on the label)
- confidence (0.0 - 1.0 overall confidence of the extraction)

Return ONLY valid minified JSON with this exact schema:
{"product_name": str|null, "batch_number": str|null, "mfg_date": str|null, "exp_date": str|null, "quantity": str|null, "category": str|null, "raw_text": str|null, "confidence": number}

Normalize dates to ISO format YYYY-MM-DD when day is known, otherwise YYYY-MM or YYYY.
If a field is missing or unreadable, set it to null. Never invent data.
Do not wrap the JSON in markdown fences. No explanations."""


def _extract_json_blob(text: str) -> Optional[dict]:
    text = re.sub(r"\s*```$", "", re.sub(r"^```(?:json)?\s*", "", text.strip()))
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except Exception:
        return None


def _parse_confidence(raw: Any) -> float:
    try:
        return max(0.0, min(1.0, float(raw)))
    except (TypeError, ValueError):
        return 0.0


def _build_ocr_fields(parsed: dict) -> OcrFields:
    quantity = parsed.get("quantity")
    category = parsed.get("category")
    return OcrFields(
        product_name=parsed.get("product_name"),
        batch_number=parsed.get("batch_number"),
        mfg_date=parsed.get("mfg_date"),
        exp_date=parsed.get("exp_date"),
        quantity=str(quantity) if quantity is not None else None,
        category=(category or "general").lower() if category else "general",
    )


def _validate_ocr_fields(fields: OcrFields) -> List[str]:
    issues: List[str] = []
    for fname in ("product_name", "batch_number", "exp_date"):
        if not getattr(fields, fname):
            issues.append(f"missing_{fname}")
    mfg_d = parse_date(fields.mfg_date)
    exp_d = parse_date(fields.exp_date)
    if mfg_d and exp_d and exp_d <= mfg_d:
        issues.append("exp_before_mfg")
    if fields.exp_date and not exp_d:
        issues.append("unparseable_exp_date")
    return issues


async def _call_gemini_vision(image_b64: str) -> str:
    session_id = f"ocr-{datetime.now(timezone.utc).timestamp()}"
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=OCR_SYSTEM_PROMPT,
    ).with_model("gemini", "gemini-3-flash-preview")
    image = ImageContent(image_base64=image_b64)
    msg = UserMessage(
        text="Extract the product label fields. Respond ONLY with JSON.",
        file_contents=[image],
    )
    response_text = ""
    async for ev in chat.stream_message(msg):
        if isinstance(ev, TextDelta):
            response_text += ev.content
        elif isinstance(ev, StreamDone):
            break
    return response_text


async def run_ocr_on_image(image_b64: str) -> dict:
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    raw_response = await _call_gemini_vision(image_b64)
    parsed = _extract_json_blob(raw_response) or {}
    fields = _build_ocr_fields(parsed)
    confidence = _parse_confidence(parsed.get("confidence", 0.0))
    issues = _validate_ocr_fields(fields)
    needs_review = confidence < 0.75 or bool(issues)
    return {
        "fields": fields.model_dump(),
        "confidence": confidence,
        "issues": issues,
        "needs_review": needs_review,
        "raw_text": parsed.get("raw_text"),
    }


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------
async def create_alert(
    kind: str,
    message: str,
    severity: str = "info",
    product_id: Optional[str] = None,
    meta: Optional[dict] = None,
) -> None:
    await db.alerts.insert_one({
        "kind": kind,
        "message": message,
        "severity": severity,
        "product_id": product_id,
        "meta": meta or {},
        "read": False,
        "created_at": datetime.now(timezone.utc),
    })


async def _emit_product_status_alert(saved: dict) -> None:
    status_ = saved["status"]
    if status_ not in ("near_expiry", "critical", "expired"):
        return
    if status_ == "expired":
        message = f"{saved['product_name']} (batch {saved['batch_number']}) is EXPIRED"
        severity = "critical"
    else:
        message = (
            f"{saved['product_name']} (batch {saved['batch_number']}) is "
            f"{status_.replace('_', ' ')}"
        )
        severity = "warning" if status_ == "near_expiry" else "critical"
    await create_alert(status_, message, severity=severity, product_id=saved["id"])


# ---------------------------------------------------------------------------
# Product validation helpers
# ---------------------------------------------------------------------------
def _validate_product_dates(body: ProductIn) -> None:
    exp_d = parse_date(body.exp_date)
    if not exp_d:
        raise HTTPException(status_code=400, detail="Invalid exp_date")
    if body.mfg_date:
        mfg_d = parse_date(body.mfg_date)
        if mfg_d and mfg_d >= exp_d:
            raise HTTPException(status_code=400, detail="exp_date must be after mfg_date")


async def _check_duplicate_product(name: str, batch: str) -> None:
    existing = await db.products.find_one({"product_name": name, "batch_number": batch})
    if existing:
        await create_alert(
            "duplicate",
            f"Duplicate batch attempted: {name} / {batch}",
            severity="warning",
            product_id=str(existing["_id"]),
        )
        raise HTTPException(status_code=409, detail="Duplicate product+batch already exists")


def _build_product_doc(body: ProductIn, user_id: str) -> dict:
    now = datetime.now(timezone.utc)
    return {
        "product_name": body.product_name.strip(),
        "batch_number": body.batch_number.strip(),
        "mfg_date": body.mfg_date,
        "exp_date": body.exp_date,
        "quantity": body.quantity or 0,
        "category": (body.category or "general").lower(),
        "notes": body.notes,
        "created_by": user_id,
        "created_at": now,
        "updated_at": now,
    }


# ---------------------------------------------------------------------------
# App lifecycle
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(_app: FastAPI):
    await db.users.create_index("email", unique=True)
    await db.products.create_index([("product_name", 1), ("batch_number", 1)], unique=True)
    await db.alerts.create_index([("created_at", -1)])
    await db.thresholds.create_index("category", unique=True)

    existing = await db.users.find_one({"email": ADMIN_EMAIL.lower()})
    if not existing:
        await db.users.insert_one({
            "email": ADMIN_EMAIL.lower(),
            "password_hash": hash_password(ADMIN_PASSWORD),
            "name": "System Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc),
        })
        logger.info("Admin user seeded: %s", ADMIN_EMAIL)

    defaults = [
        {"category": "general", "near_expiry_days": 30, "critical_days": 7},
        {"category": "dairy", "near_expiry_days": 7, "critical_days": 2},
        {"category": "food", "near_expiry_days": 30, "critical_days": 7},
        {"category": "beverage", "near_expiry_days": 60, "critical_days": 14},
        {"category": "pharma", "near_expiry_days": 90, "critical_days": 30},
        {"category": "cosmetics", "near_expiry_days": 90, "critical_days": 30},
        {"category": "snacks", "near_expiry_days": 30, "critical_days": 7},
        {"category": "frozen", "near_expiry_days": 30, "critical_days": 7},
    ]
    for d in defaults:
        await db.thresholds.update_one(
            {"category": d["category"]},
            {"$setOnInsert": d},
            upsert=True,
        )
    yield


app = FastAPI(title="Expiry Detection & Inventory Management", lifespan=lifespan)
api = APIRouter(prefix="/api")

# CORS — when allow_credentials=True is in play, wildcard "*" is rejected by browsers.
# In dev (FRONTEND_URL=*) we accept the preview-domain pattern + localhost via regex.
# In prod, set FRONTEND_URL to the explicit origin.
if FRONTEND_URL == "*":
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[],
        allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|.+\.preview\.emergentagent\.com)(:\d+)?",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[FRONTEND_URL],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# ---------------------------------------------------------------------------
# Health & meta
# ---------------------------------------------------------------------------
@api.get("/health")
async def health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
@api.post("/auth/register", response_model=TokenOut)
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    requested_role = body.role.lower() if body.role else "worker"
    if requested_role not in ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")
    role = "worker" if requested_role == "admin" else requested_role
    role_overridden = role != requested_role
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    doc = {
        "email": email,
        "password_hash": hash_password(body.password),
        "name": body.name,
        "role": role,
        "created_at": datetime.now(timezone.utc),
    }
    res = await db.users.insert_one(doc)
    uid = str(res.inserted_id)
    token = create_access_token(uid, email, role)
    set_access_cookie(response, token)
    return TokenOut(
        access_token=token,
        role_overridden=role_overridden,
        user=UserOut(
            id=uid, email=email, name=body.name, role=role,
            created_at=doc["created_at"].isoformat(),
        ),
    )


@api.post("/auth/login", response_model=TokenOut)
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    uid = str(user["_id"])
    token = create_access_token(uid, email, user["role"])
    set_access_cookie(response, token)
    return TokenOut(
        access_token=token,
        user=UserOut(
            id=uid, email=email, name=user["name"], role=user["role"],
            created_at=user["created_at"].isoformat() if user.get("created_at") else None,
        ),
    )


@api.post("/auth/logout")
async def logout(response: Response):
    clear_access_cookie(response)
    return {"ok": True}


@api.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return UserOut(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        created_at=user.get("created_at"),
    )


@api.get("/users")
async def list_users(_user: dict = Depends(require_roles("admin"))):
    out = []
    async for u in db.users.find().sort("created_at", -1):
        u = serialize_doc(u)
        u.pop("password_hash", None)
        out.append(u)
    return out


@api.put("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    body: UpdateUserRoleIn,
    _current: dict = Depends(require_roles("admin")),
):
    if body.role not in ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")
    res = await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": {"role": body.role}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True}


# ---------------------------------------------------------------------------
# OCR
# ---------------------------------------------------------------------------
@api.post("/ocr/scan", response_model=OcrResult)
async def ocr_scan(
    file: Optional[UploadFile] = File(None),
    image_base64: Optional[str] = Form(None),
    _user: dict = Depends(get_current_user),
):
    if file is not None:
        raw = await file.read()
        b64 = base64.b64encode(raw).decode("utf-8")
    elif image_base64:
        b64 = image_base64.split(",", 1)[-1] if "," in image_base64 else image_base64
    else:
        raise HTTPException(status_code=400, detail="Provide file or image_base64")

    result: Optional[dict] = None
    try:
        result = await run_ocr_on_image(b64)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("OCR failed")
        await create_alert("ocr_failure", f"OCR failed: {str(e)[:120]}", severity="warning")
        raise HTTPException(status_code=500, detail=f"OCR failed: {e}")

    if result["needs_review"]:
        await create_alert(
            "ocr_review",
            f"Low-confidence scan ({int(result['confidence']*100)}%) needs review",
            severity="warning",
            meta={"fields": result["fields"], "issues": result["issues"]},
        )
    return result


# ---------------------------------------------------------------------------
# Products / Inventory
# ---------------------------------------------------------------------------
@api.post("/products")
async def create_product(
    body: ProductIn,
    user: dict = Depends(require_roles("worker", "manager", "admin")),
):
    _validate_product_dates(body)
    await _check_duplicate_product(body.product_name.strip(), body.batch_number.strip())
    doc = _build_product_doc(body, user["id"])
    res = await db.products.insert_one(doc)
    saved = serialize_doc(await db.products.find_one({"_id": res.inserted_id}))
    saved = await enrich_product(saved)
    await _emit_product_status_alert(saved)
    return saved


@api.get("/products")
async def list_products(
    q: Optional[str] = None,
    status_filter: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 200,
    _user: dict = Depends(get_current_user),
):
    query: dict = {}
    if q:
        query["$or"] = [
            {"product_name": {"$regex": q, "$options": "i"}},
            {"batch_number": {"$regex": q, "$options": "i"}},
        ]
    if category:
        query["category"] = category.lower()

    cache = await load_threshold_map()
    items: List[dict] = []
    async for p in db.products.find(query).sort("created_at", -1).limit(limit):
        items.append(enrich_product_sync(serialize_doc(p), cache))

    if status_filter:
        items = [p for p in items if p["status"] == status_filter]
    return items


@api.get("/products/{pid}")
async def get_product(pid: str, _user: dict = Depends(get_current_user)):
    p = await db.products.find_one({"_id": ObjectId(pid)})
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return await enrich_product(serialize_doc(p))


@api.put("/products/{pid}")
async def update_product(
    pid: str,
    body: ProductUpdate,
    _user: dict = Depends(require_roles("manager", "admin")),
):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    if "exp_date" in update:
        d = parse_date(update["exp_date"])
        if not d:
            raise HTTPException(status_code=400, detail="Invalid exp_date")
    if "category" in update and update["category"]:
        update["category"] = update["category"].lower()
    update["updated_at"] = datetime.now(timezone.utc)
    res = await db.products.update_one({"_id": ObjectId(pid)}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    p = await db.products.find_one({"_id": ObjectId(pid)})
    return await enrich_product(serialize_doc(p))


@api.delete("/products/{pid}")
async def delete_product(pid: str, _user: dict = Depends(require_roles("manager", "admin"))):
    res = await db.products.delete_one({"_id": ObjectId(pid)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
@api.get("/dashboard/summary")
async def dashboard_summary(_user: dict = Depends(get_current_user)):
    counts = {"total": 0, "safe": 0, "near_expiry": 0, "critical": 0, "expired": 0, "unknown": 0}
    category_counts: dict = {}
    cache = await load_threshold_map()
    async for p in db.products.find():
        p = enrich_product_sync(serialize_doc(p), cache)
        counts["total"] += 1
        counts[p["status"]] = counts.get(p["status"], 0) + 1
        cat = p.get("category", "general")
        category_counts[cat] = category_counts.get(cat, 0) + 1

    estimated_waste_saved = counts.get("near_expiry", 0) + counts.get("critical", 0)
    unread_alerts = await db.alerts.count_documents({"read": False})
    return {
        "counts": counts,
        "category_counts": category_counts,
        "estimated_waste_saved": estimated_waste_saved,
        "unread_alerts": unread_alerts,
    }


# ---------------------------------------------------------------------------
# Alerts
# ---------------------------------------------------------------------------
@api.get("/alerts")
async def list_alerts(
    limit: int = 100,
    unread_only: bool = False,
    _user: dict = Depends(get_current_user),
):
    q = {"read": False} if unread_only else {}
    out = []
    async for a in db.alerts.find(q).sort("created_at", -1).limit(limit):
        out.append(serialize_doc(a))
    return out


@api.post("/alerts/{aid}/read")
async def mark_alert_read(aid: str, _user: dict = Depends(get_current_user)):
    await db.alerts.update_one({"_id": ObjectId(aid)}, {"$set": {"read": True}})
    return {"ok": True}


@api.post("/alerts/read-all")
async def read_all_alerts(_user: dict = Depends(get_current_user)):
    await db.alerts.update_many({"read": False}, {"$set": {"read": True}})
    return {"ok": True}


@api.post("/alerts/scan")
async def scan_alerts(_user: dict = Depends(require_roles("manager", "admin"))):
    """Re-scan all products and emit alerts for any near-expiry / critical / expired ones."""
    cache = await load_threshold_map()
    created = 0
    async for p in db.products.find():
        p = enrich_product_sync(serialize_doc(p), cache)
        if p["status"] in ("near_expiry", "critical", "expired"):
            await _emit_product_status_alert(p)
            created += 1
    return {"alerts_created": created}


# ---------------------------------------------------------------------------
# Thresholds
# ---------------------------------------------------------------------------
@api.get("/thresholds")
async def list_thresholds(_user: dict = Depends(get_current_user)):
    out = []
    async for t in db.thresholds.find().sort("category", 1):
        out.append(serialize_doc(t))
    return out


@api.put("/thresholds")
async def upsert_threshold(
    body: ThresholdIn,
    _user: dict = Depends(require_roles("manager", "admin")),
):
    if body.critical_days >= body.near_expiry_days:
        raise HTTPException(
            status_code=400,
            detail="critical_days must be less than near_expiry_days",
        )
    cat = body.category.lower()
    await db.thresholds.update_one(
        {"category": cat},
        {"$set": {
            "category": cat,
            "near_expiry_days": body.near_expiry_days,
            "critical_days": body.critical_days,
        }},
        upsert=True,
    )
    return {"ok": True}


# ---------------------------------------------------------------------------
# Reports / Export
# ---------------------------------------------------------------------------
@api.get("/reports/export")
async def export_excel(
    status_filter: Optional[str] = None,
    _user: dict = Depends(require_roles("manager", "admin")),
):
    wb = Workbook()
    ws = wb.active
    ws.title = "Inventory"
    ws.append([
        "Product Name", "Batch Number", "Category", "MFG Date",
        "EXP Date", "Quantity", "Status", "Days Left",
    ])

    cache = await load_threshold_map()
    async for p in db.products.find().sort("created_at", -1):
        p = enrich_product_sync(serialize_doc(p), cache)
        if status_filter and p["status"] != status_filter:
            continue
        ws.append([
            p.get("product_name", ""),
            p.get("batch_number", ""),
            p.get("category", ""),
            p.get("mfg_date", ""),
            p.get("exp_date", ""),
            p.get("quantity", 0),
            p.get("status", ""),
            p.get("days_left", ""),
        ])

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    fname = f"inventory-{datetime.now().strftime('%Y%m%d-%H%M%S')}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={fname}"},
    )


@api.get("/reports/summary")
async def reports_summary(_user: dict = Depends(get_current_user)):
    """Detailed analytics: counts by status, by category, top near-expiry items."""
    by_status = {"safe": 0, "near_expiry": 0, "critical": 0, "expired": 0, "unknown": 0}
    by_category: dict = {}
    near_list: List[dict] = []
    expired_list: List[dict] = []
    cache = await load_threshold_map()
    async for p in db.products.find():
        p = enrich_product_sync(serialize_doc(p), cache)
        by_status[p["status"]] = by_status.get(p["status"], 0) + 1
        cat = p.get("category", "general")
        by_category[cat] = by_category.get(cat, 0) + 1
        if p["status"] in ("near_expiry", "critical"):
            near_list.append(p)
        elif p["status"] == "expired":
            expired_list.append(p)

    near_list.sort(key=lambda x: x.get("days_left", 999))
    expired_list.sort(key=lambda x: x.get("days_left", 0))
    estimated_kg_saved = (by_status.get("near_expiry", 0) + by_status.get("critical", 0)) * 0.5
    return {
        "by_status": by_status,
        "by_category": by_category,
        "near_expiry_top": near_list[:25],
        "expired_top": expired_list[:25],
        "estimated_kg_saved": round(estimated_kg_saved, 2),
    }


app.include_router(api)


@app.get("/")
async def root():
    return {"service": "Expiry Detection & Inventory Management"}
