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
from typing import Optional, List, Annotated, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Request, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, EmailStr, Field, BeforeValidator, ConfigDict
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from openpyxl import Workbook

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent, TextDelta, StreamDone

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
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@inventory.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Admin@12345")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "*")

NEAR_EXPIRY_DAYS_DEFAULT = int(os.environ.get("NEAR_EXPIRY_DAYS_DEFAULT", "30"))
CRITICAL_EXPIRY_DAYS_DEFAULT = int(os.environ.get("CRITICAL_EXPIRY_DAYS_DEFAULT", "7"))

ROLES = ["worker", "manager", "admin"]

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
    pwd = password.encode("utf-8")[:72]
    return bcrypt.hashpw(pwd, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8")[:72], hashed.encode("utf-8"))
    except Exception:
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


async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else request.cookies.get("access_token")
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
    s = str(s).strip()
    s = re.sub(r"\s+", " ", s)
    for fmt in DATE_FORMATS:
        try:
            d = datetime.strptime(s, fmt)
            if fmt in ("%b %Y", "%B %Y", "%m-%Y", "%m/%Y", "%Y-%m"):
                # default to end-of-month for month-only dates
                next_month = d.replace(day=28) + timedelta(days=4)
                return (next_month - timedelta(days=next_month.day))
            if fmt == "%Y":
                return d.replace(month=12, day=31).date()
            return d.date()
        except ValueError:
            continue
    return None


async def get_thresholds(category: str) -> tuple[int, int]:
    cat = (category or "general").lower()
    cfg = await db.thresholds.find_one({"category": cat})
    if cfg:
        return int(cfg.get("near_expiry_days", NEAR_EXPIRY_DAYS_DEFAULT)), int(cfg.get("critical_days", CRITICAL_EXPIRY_DAYS_DEFAULT))
    return NEAR_EXPIRY_DAYS_DEFAULT, CRITICAL_EXPIRY_DAYS_DEFAULT


def compute_status(exp_date_str: Optional[str], near_days: int, critical_days: int) -> tuple[str, int]:
    d = parse_date(exp_date_str)
    if not d:
        return ("unknown", 9999)
    today = date.today()
    diff = (d - today).days
    if diff < 0:
        return ("expired", diff)
    if diff <= critical_days:
        return ("critical", diff)
    if diff <= near_days:
        return ("near_expiry", diff)
    return ("safe", diff)


async def enrich_product(p: dict) -> dict:
    near, crit = await get_thresholds(p.get("category", "general"))
    status_str, days_left = compute_status(p.get("exp_date"), near, crit)
    p["status"] = status_str
    p["days_left"] = days_left
    return p


# ---------------------------------------------------------------------------
# OCR (Gemini Vision)
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
    text = text.strip()
    # Strip markdown fences if any
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    # Find first {...} blob
    m = re.search(r"\{.*\}", text, re.DOTALL)
    if not m:
        return None
    try:
        return json.loads(m.group(0))
    except Exception:
        return None


async def run_ocr_on_image(image_b64: str) -> dict:
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    session_id = f"ocr-{datetime.now(timezone.utc).timestamp()}"
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=OCR_SYSTEM_PROMPT,
    ).with_model("gemini", "gemini-3-flash-preview")

    image = ImageContent(image_base64=image_b64)
    msg = UserMessage(text="Extract the product label fields. Respond ONLY with JSON.", file_contents=[image])

    response_text = ""
    async for ev in chat.stream_message(msg):
        if isinstance(ev, TextDelta):
            response_text += ev.content
        elif isinstance(ev, StreamDone):
            break

    parsed = _extract_json_blob(response_text) or {}
    fields = OcrFields(
        product_name=parsed.get("product_name"),
        batch_number=parsed.get("batch_number"),
        mfg_date=parsed.get("mfg_date"),
        exp_date=parsed.get("exp_date"),
        quantity=str(parsed.get("quantity")) if parsed.get("quantity") is not None else None,
        category=(parsed.get("category") or "general").lower() if parsed.get("category") else "general",
    )
    raw_conf = parsed.get("confidence", 0.0)
    try:
        confidence = max(0.0, min(1.0, float(raw_conf)))
    except Exception:
        confidence = 0.0

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
async def create_alert(kind: str, message: str, severity: str = "info", product_id: Optional[str] = None, meta: Optional[dict] = None):
    await db.alerts.insert_one({
        "kind": kind,
        "message": message,
        "severity": severity,
        "product_id": product_id,
        "meta": meta or {},
        "read": False,
        "created_at": datetime.now(timezone.utc),
    })


# ---------------------------------------------------------------------------
# App lifecycle
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.products.create_index([("product_name", 1), ("batch_number", 1)], unique=True)
    await db.alerts.create_index([("created_at", -1)])
    await db.thresholds.create_index("category", unique=True)

    # Seed admin
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

    # Seed default category thresholds
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if FRONTEND_URL == "*" else [FRONTEND_URL],
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
async def register(body: RegisterIn):
    email = body.email.lower()
    role = body.role.lower() if body.role else "worker"
    if role not in ROLES:
        raise HTTPException(status_code=400, detail="Invalid role")
    if role == "admin":
        # Admin role cannot be self-assigned via register
        role = "worker"
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
    return TokenOut(
        access_token=token,
        user=UserOut(id=uid, email=email, name=body.name, role=role, created_at=doc["created_at"].isoformat()),
    )


@api.post("/auth/login", response_model=TokenOut)
async def login(body: LoginIn):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    uid = str(user["_id"])
    token = create_access_token(uid, email, user["role"])
    return TokenOut(
        access_token=token,
        user=UserOut(
            id=uid,
            email=email,
            name=user["name"],
            role=user["role"],
            created_at=user["created_at"].isoformat() if user.get("created_at") else None,
        ),
    )


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
async def list_users(user: dict = Depends(require_roles("admin"))):
    out = []
    async for u in db.users.find().sort("created_at", -1):
        u = serialize_doc(u)
        u.pop("password_hash", None)
        out.append(u)
    return out


class UpdateUserRoleIn(BaseModel):
    role: str


@api.put("/users/{user_id}/role")
async def update_user_role(user_id: str, body: UpdateUserRoleIn, current: dict = Depends(require_roles("admin"))):
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
    user: dict = Depends(get_current_user),
):
    if file is not None:
        raw = await file.read()
        b64 = base64.b64encode(raw).decode("utf-8")
    elif image_base64:
        # Strip data URI prefix if present
        b64 = image_base64.split(",", 1)[-1] if "," in image_base64 else image_base64
    else:
        raise HTTPException(status_code=400, detail="Provide file or image_base64")

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
async def create_product(body: ProductIn, user: dict = Depends(require_roles("worker", "manager", "admin"))):
    # validate dates
    exp_d = parse_date(body.exp_date)
    if not exp_d:
        raise HTTPException(status_code=400, detail="Invalid exp_date")
    if body.mfg_date:
        mfg_d = parse_date(body.mfg_date)
        if mfg_d and mfg_d >= exp_d:
            raise HTTPException(status_code=400, detail="exp_date must be after mfg_date")

    # duplicate check
    key = {"product_name": body.product_name.strip(), "batch_number": body.batch_number.strip()}
    existing = await db.products.find_one(key)
    if existing:
        await create_alert(
            "duplicate",
            f"Duplicate batch attempted: {body.product_name} / {body.batch_number}",
            severity="warning",
            product_id=str(existing["_id"]),
        )
        raise HTTPException(status_code=409, detail="Duplicate product+batch already exists")

    doc = {
        "product_name": body.product_name.strip(),
        "batch_number": body.batch_number.strip(),
        "mfg_date": body.mfg_date,
        "exp_date": body.exp_date,
        "quantity": body.quantity or 0,
        "category": (body.category or "general").lower(),
        "notes": body.notes,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    res = await db.products.insert_one(doc)
    saved = await db.products.find_one({"_id": res.inserted_id})
    saved = serialize_doc(saved)
    saved = await enrich_product(saved)

    if saved["status"] in ("near_expiry", "critical"):
        await create_alert(
            f"{saved['status']}",
            f"{saved['product_name']} (batch {saved['batch_number']}) is {saved['status'].replace('_',' ')}",
            severity="warning" if saved["status"] == "near_expiry" else "critical",
            product_id=saved["id"],
        )
    elif saved["status"] == "expired":
        await create_alert(
            "expired",
            f"{saved['product_name']} (batch {saved['batch_number']}) is EXPIRED",
            severity="critical",
            product_id=saved["id"],
        )
    return saved


@api.get("/products")
async def list_products(
    q: Optional[str] = None,
    status_filter: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 200,
    user: dict = Depends(get_current_user),
):
    query: dict = {}
    if q:
        query["$or"] = [
            {"product_name": {"$regex": q, "$options": "i"}},
            {"batch_number": {"$regex": q, "$options": "i"}},
        ]
    if category:
        query["category"] = category.lower()

    items = []
    async for p in db.products.find(query).sort("created_at", -1).limit(limit):
        p = serialize_doc(p)
        p = await enrich_product(p)
        items.append(p)

    if status_filter:
        items = [p for p in items if p["status"] == status_filter]
    return items


@api.get("/products/{pid}")
async def get_product(pid: str, user: dict = Depends(get_current_user)):
    p = await db.products.find_one({"_id": ObjectId(pid)})
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    p = serialize_doc(p)
    return await enrich_product(p)


@api.put("/products/{pid}")
async def update_product(pid: str, body: ProductUpdate, user: dict = Depends(require_roles("manager", "admin"))):
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
async def delete_product(pid: str, user: dict = Depends(require_roles("manager", "admin"))):
    res = await db.products.delete_one({"_id": ObjectId(pid)})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"ok": True}


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
@api.get("/dashboard/summary")
async def dashboard_summary(user: dict = Depends(get_current_user)):
    counts = {"total": 0, "safe": 0, "near_expiry": 0, "critical": 0, "expired": 0, "unknown": 0}
    category_counts: dict = {}
    async for p in db.products.find():
        p = serialize_doc(p)
        p = await enrich_product(p)
        counts["total"] += 1
        counts[p["status"]] = counts.get(p["status"], 0) + 1
        cat = p.get("category", "general")
        category_counts[cat] = category_counts.get(cat, 0) + 1

    # Estimated waste reduction = (near_expiry + critical) products saved before going expired
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
async def list_alerts(limit: int = 100, unread_only: bool = False, user: dict = Depends(get_current_user)):
    q = {}
    if unread_only:
        q["read"] = False
    out = []
    async for a in db.alerts.find(q).sort("created_at", -1).limit(limit):
        out.append(serialize_doc(a))
    return out


@api.post("/alerts/{aid}/read")
async def mark_alert_read(aid: str, user: dict = Depends(get_current_user)):
    await db.alerts.update_one({"_id": ObjectId(aid)}, {"$set": {"read": True}})
    return {"ok": True}


@api.post("/alerts/read-all")
async def read_all_alerts(user: dict = Depends(get_current_user)):
    await db.alerts.update_many({"read": False}, {"$set": {"read": True}})
    return {"ok": True}


@api.post("/alerts/scan")
async def scan_alerts(user: dict = Depends(require_roles("manager", "admin"))):
    """Re-scan all products and emit alerts for any near-expiry / expired ones."""
    created = 0
    async for p in db.products.find():
        p = serialize_doc(p)
        p = await enrich_product(p)
        if p["status"] in ("near_expiry", "critical", "expired"):
            await create_alert(
                p["status"],
                f"{p['product_name']} (batch {p['batch_number']}) is {p['status'].replace('_',' ')}",
                severity="warning" if p["status"] == "near_expiry" else "critical",
                product_id=p["id"],
            )
            created += 1
    return {"alerts_created": created}


# ---------------------------------------------------------------------------
# Thresholds
# ---------------------------------------------------------------------------
@api.get("/thresholds")
async def list_thresholds(user: dict = Depends(get_current_user)):
    out = []
    async for t in db.thresholds.find().sort("category", 1):
        out.append(serialize_doc(t))
    return out


@api.put("/thresholds")
async def upsert_threshold(body: ThresholdIn, user: dict = Depends(require_roles("manager", "admin"))):
    if body.critical_days >= body.near_expiry_days:
        raise HTTPException(status_code=400, detail="critical_days must be less than near_expiry_days")
    await db.thresholds.update_one(
        {"category": body.category.lower()},
        {"$set": {"category": body.category.lower(), "near_expiry_days": body.near_expiry_days, "critical_days": body.critical_days}},
        upsert=True,
    )
    return {"ok": True}


# ---------------------------------------------------------------------------
# Reports / Export
# ---------------------------------------------------------------------------
@api.get("/reports/export")
async def export_excel(
    status_filter: Optional[str] = None,
    user: dict = Depends(require_roles("manager", "admin")),
):
    wb = Workbook()
    ws = wb.active
    ws.title = "Inventory"
    headers = ["Product Name", "Batch Number", "Category", "MFG Date", "EXP Date", "Quantity", "Status", "Days Left"]
    ws.append(headers)

    async for p in db.products.find().sort("created_at", -1):
        p = serialize_doc(p)
        p = await enrich_product(p)
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
async def reports_summary(user: dict = Depends(get_current_user)):
    """Detailed analytics: counts by status, by category, top near-expiry items."""
    by_status = {"safe": 0, "near_expiry": 0, "critical": 0, "expired": 0, "unknown": 0}
    by_category: dict = {}
    near_list: list = []
    expired_list: list = []
    async for p in db.products.find():
        p = serialize_doc(p)
        p = await enrich_product(p)
        by_status[p["status"]] = by_status.get(p["status"], 0) + 1
        cat = p.get("category", "general")
        by_category[cat] = by_category.get(cat, 0) + 1
        if p["status"] in ("near_expiry", "critical"):
            near_list.append(p)
        elif p["status"] == "expired":
            expired_list.append(p)

    near_list.sort(key=lambda x: x.get("days_left", 999))
    expired_list.sort(key=lambda x: x.get("days_left", 0))
    estimated_kg_saved = (by_status.get("near_expiry", 0) + by_status.get("critical", 0)) * 0.5  # simple heuristic
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
