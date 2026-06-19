import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Camera,
  CameraOff,
  ScanLine,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Save,
  RotateCcw,
  Image as ImageIcon,
} from "lucide-react";
import { api } from "../lib/api";
import { formatApiErrorDetail } from "../lib/utils";

const CATEGORIES = ["general", "food", "beverage", "dairy", "pharma", "cosmetics", "snacks", "frozen"];

export default function ScanPage() {
  const videoRef = useRef(null);
  const fileRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [captured, setCaptured] = useState(null); // base64
  const [ocr, setOcr] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    product_name: "",
    batch_number: "",
    mfg_date: "",
    exp_date: "",
    quantity: 1,
    category: "general",
    notes: "",
  });

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
  };

  useEffect(() => () => stopCamera(), []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch (e) {
      toast.error("Camera unavailable. Use 'Upload image' instead.");
    }
  };

  const capture = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 800;
    canvas.height = v.videoHeight || 600;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCaptured(dataUrl);
    stopCamera();
  };

  const onUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => setCaptured(r.result);
    r.readAsDataURL(file);
  };

  const runOcr = async () => {
    if (!captured) return;
    setProcessing(true);
    setOcr(null);
    try {
      const formData = new FormData();
      formData.append("image_base64", captured);
      const { data } = await api.post("/ocr/scan", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setOcr(data);
      // Pre-fill form
      const f = data.fields || {};
      setForm({
        product_name: f.product_name || "",
        batch_number: f.batch_number || "",
        mfg_date: normalizeDate(f.mfg_date),
        exp_date: normalizeDate(f.exp_date),
        quantity: parseInt((f.quantity || "1").toString().match(/\d+/)?.[0] || "1", 10),
        category: (f.category || "general").toLowerCase(),
        notes: "",
      });
      if (data.needs_review) toast.warning("Low confidence — please verify the fields.");
      else toast.success("Label parsed");
    } catch (err) {
      toast.error(formatApiErrorDetail(err?.response?.data?.detail) || "OCR failed");
    } finally {
      setProcessing(false);
    }
  };

  const resetAll = () => {
    setCaptured(null);
    setOcr(null);
    setForm({
      product_name: "",
      batch_number: "",
      mfg_date: "",
      exp_date: "",
      quantity: 1,
      category: "general",
      notes: "",
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.post("/products", form);
      toast.success("Saved to inventory");
      resetAll();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 409) {
        toast.error("Duplicate: product+batch already in inventory");
      } else {
        toast.error(formatApiErrorDetail(detail) || "Save failed");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8" data-testid="scan-page">
      <div>
        <div className="font-mono text-xs uppercase tracking-[0.2em] text-brand-primary mb-2">
          / Scanner
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-black text-ink tracking-tight">
          Point. <span className="italic text-brand-primary">Scan.</span> Done.
        </h1>
        <p className="text-ink-soft mt-2 max-w-xl">
          Capture a label with your camera or upload an image. Our AI extracts the data —
          you confirm and save.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left: Camera/Capture */}
        <div className="bg-surface border border-line rounded-2xl p-5 sm:p-6">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted mb-4">
            / 01 — Capture
          </div>

          <div className="viewfinder relative w-full aspect-[4/3] bg-brand-dark rounded-2xl overflow-hidden">
            <span className="vf-bl" />
            <span className="vf-br" />
            {captured ? (
              <img src={captured} alt="captured" className="w-full h-full object-cover" data-testid="captured-preview" />
            ) : cameraOn ? (
              <>
                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline data-testid="camera-video" />
                {/* Scanline */}
                <div className="absolute inset-x-12 top-12 bottom-12 overflow-hidden pointer-events-none">
                  <div className="h-0.5 w-full bg-brand-accent shadow-[0_0_18px_2px_rgba(193,213,68,0.7)] animate-scanline" />
                </div>
              </>
            ) : (
              <div className="absolute inset-0 grid place-items-center text-brand-cream/70">
                <div className="flex flex-col items-center gap-3">
                  <Camera className="h-10 w-10 text-brand-accent" strokeWidth={1.5} />
                  <span className="font-sans text-sm">Camera idle</span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-5">
            {captured ? (
              <button
                data-testid="retake-btn"
                onClick={resetAll}
                className="inline-flex items-center justify-center gap-2 bg-brand-cream border border-line text-ink font-semibold px-4 py-3 rounded-full hover:border-brand-primary"
              >
                <RotateCcw className="h-4 w-4" /> Retake
              </button>
            ) : cameraOn ? (
              <>
                <button
                  data-testid="capture-btn"
                  onClick={capture}
                  className="inline-flex items-center justify-center gap-2 bg-brand-accent text-brand-dark font-bold px-4 py-3 rounded-full hover:bg-brand-accentHover shadow-accent"
                >
                  <ScanLine className="h-4 w-4" /> Capture
                </button>
                <button
                  onClick={stopCamera}
                  className="inline-flex items-center justify-center gap-2 bg-surface border border-line text-ink-soft font-semibold px-4 py-3 rounded-full hover:bg-line/30"
                >
                  <CameraOff className="h-4 w-4" /> Stop
                </button>
              </>
            ) : (
              <>
                <button
                  data-testid="start-camera-btn"
                  onClick={startCamera}
                  className="inline-flex items-center justify-center gap-2 bg-brand-primary text-white font-semibold px-4 py-3 rounded-full hover:bg-brand-primaryHover shadow-glow"
                >
                  <Camera className="h-4 w-4" /> Start camera
                </button>
                <button
                  data-testid="upload-image-btn"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 bg-surface border border-line text-ink font-semibold px-4 py-3 rounded-full hover:border-brand-primary"
                >
                  <Upload className="h-4 w-4" /> Upload image
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={onUpload}
                  data-testid="upload-file-input"
                />
              </>
            )}
          </div>

          {captured && (
            <button
              data-testid="run-ocr-btn"
              onClick={runOcr}
              disabled={processing}
              className="w-full mt-3 inline-flex items-center justify-center gap-2 bg-brand-dark text-brand-cream font-bold px-4 py-3 rounded-full hover:bg-ink disabled:opacity-60"
            >
              {processing ? "Reading label…" : (
                <>
                  <ImageIcon className="h-4 w-4 text-brand-accent" /> Run OCR extraction
                </>
              )}
            </button>
          )}
        </div>

        {/* Right: OCR result / Verify */}
        <div className="bg-surface border border-line rounded-2xl p-5 sm:p-6">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted mb-4">
            / 02 — Verify & save
          </div>

          {!ocr && !processing && (
            <div className="border border-dashed border-line rounded-xl p-10 text-center">
              <ScanLine className="h-8 w-8 text-ink-muted mx-auto mb-3" strokeWidth={1.5} />
              <div className="font-sans text-sm text-ink-soft">
                Capture or upload a label, then run OCR. Extracted fields appear here.
              </div>
            </div>
          )}

          {processing && (
            <div className="border border-dashed border-brand-primary/50 rounded-xl p-10 text-center bg-brand-primary/5">
              <div className="inline-flex items-center gap-2 text-brand-primary font-mono text-sm">
                <span className="h-2 w-2 rounded-full bg-brand-primary animate-pulse_dot" />
                Vision AI is reading the label…
              </div>
            </div>
          )}

          <AnimatePresence>
            {ocr && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
                data-testid="ocr-result"
              >
                {/* Confidence */}
                <div
                  className={`rounded-2xl p-4 border ${
                    ocr.needs_review ? "bg-status-nearBg border-status-near/30" : "bg-status-safeBg border-status-safe/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {ocr.needs_review ? (
                        <AlertTriangle className="h-4 w-4 text-status-near" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-status-safe" />
                      )}
                      <span className="font-mono text-xs uppercase tracking-[0.15em] font-bold">
                        {ocr.needs_review ? "Needs review" : "Confident"}
                      </span>
                    </div>
                    <span className="font-mono text-sm font-bold tabular-nums" data-testid="ocr-confidence">
                      {Math.round((ocr.confidence || 0) * 100)}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 bg-white/70 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${ocr.needs_review ? "bg-status-near" : "bg-status-safe"}`}
                      style={{ width: `${Math.round((ocr.confidence || 0) * 100)}%` }}
                    />
                  </div>
                  {ocr.issues?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {ocr.issues.map((i) => (
                        <span key={i} className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-white text-ink-soft border border-line uppercase tracking-wider">
                          {i.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Form */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Product name *">
                    <input data-testid="scan-product-name" value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="Batch number *">
                    <input data-testid="scan-batch-number" value={form.batch_number} onChange={(e) => setForm({ ...form, batch_number: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="MFG date">
                    <input data-testid="scan-mfg" type="date" value={form.mfg_date || ""} onChange={(e) => setForm({ ...form, mfg_date: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="EXP date *">
                    <input data-testid="scan-exp" type="date" value={form.exp_date || ""} onChange={(e) => setForm({ ...form, exp_date: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="Quantity">
                    <input data-testid="scan-qty" type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value || "0", 10) })} className={inputCls} />
                  </Field>
                  <Field label="Category">
                    <select data-testid="scan-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls}>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                <button
                  data-testid="scan-save-btn"
                  disabled={saving || !form.product_name || !form.batch_number || !form.exp_date}
                  onClick={save}
                  className="w-full inline-flex items-center justify-center gap-2 bg-brand-primary text-white font-bold px-4 py-3.5 rounded-full hover:bg-brand-primaryHover shadow-glow disabled:opacity-60"
                >
                  <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save to inventory"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function normalizeDate(s) {
  if (!s) return "";
  // try parse common formats
  const direct = new Date(s);
  if (!Number.isNaN(direct.getTime()) && /\d{4}/.test(s)) {
    return direct.toISOString().slice(0, 10);
  }
  return s;
}

const inputCls =
  "w-full bg-white border border-line rounded-xl px-3 py-2.5 text-ink text-sm font-sans focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 outline-none";

function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <label className="block font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mb-1.5">{label}</label>
      {children}
    </div>
  );
}
