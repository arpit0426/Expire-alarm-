import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanLine, CheckCircle2, AlertTriangle, Save } from "lucide-react";
import { resultEnter } from "../../lib/motion";
import { PRODUCT_CATEGORIES } from "../ProductModal";

const inputCls =
  "w-full bg-white border border-line rounded-xl px-3 py-2.5 text-ink text-sm font-sans focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 outline-none";

function Field({ label, children }) {
  return (
    <div>
      <label className="block font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="border border-dashed border-line rounded-xl p-10 text-center">
      <ScanLine className="h-8 w-8 text-ink-muted mx-auto mb-3" strokeWidth={1.5} />
      <div className="font-sans text-sm text-ink-soft">
        Capture or upload a label, then run OCR. Extracted fields appear here.
      </div>
    </div>
  );
}

function ProcessingState() {
  return (
    <div className="border border-dashed border-brand-primary/50 rounded-xl p-10 text-center bg-brand-primary/5">
      <div className="inline-flex items-center gap-2 text-brand-primary font-mono text-sm">
        <span className="h-2 w-2 rounded-full bg-brand-primary animate-pulse_dot" />
        Vision AI is reading the label…
      </div>
    </div>
  );
}

function ConfidenceBar({ ocr }) {
  const pct = Math.round((ocr.confidence || 0) * 100);
  const flagged = ocr.needs_review;
  const wrap = flagged
    ? "bg-status-nearBg border-status-near/30"
    : "bg-status-safeBg border-status-safe/30";
  const fill = flagged ? "bg-status-near" : "bg-status-safe";

  return (
    <div className={`rounded-2xl p-4 border ${wrap}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {flagged ? (
            <AlertTriangle className="h-4 w-4 text-status-near" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-status-safe" />
          )}
          <span className="font-mono text-xs uppercase tracking-[0.15em] font-bold">
            {flagged ? "Needs review" : "Confident"}
          </span>
        </div>
        <span className="font-mono text-sm font-bold tabular-nums" data-testid="ocr-confidence">
          {pct}%
        </span>
      </div>
      <div className="mt-2 h-1.5 bg-white/70 rounded-full overflow-hidden">
        <div className={`h-full transition-all ${fill}`} style={{ width: `${pct}%` }} />
      </div>
      {ocr.issues?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {ocr.issues.map((i) => (
            <span
              key={i}
              className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-white text-ink-soft border border-line uppercase tracking-wider"
            >
              {i.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function VerifyForm({ form, setForm, onSave, saving }) {
  const update = (k, v) => setForm({ ...form, [k]: v });
  const canSave =
    form.product_name && form.batch_number && form.exp_date && !saving;
  return (
    <>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Product name *">
          <input
            data-testid="scan-product-name"
            value={form.product_name}
            onChange={(e) => update("product_name", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Batch number *">
          <input
            data-testid="scan-batch-number"
            value={form.batch_number}
            onChange={(e) => update("batch_number", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="MFG date">
          <input
            data-testid="scan-mfg"
            type="date"
            value={form.mfg_date || ""}
            onChange={(e) => update("mfg_date", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="EXP date *">
          <input
            data-testid="scan-exp"
            type="date"
            value={form.exp_date || ""}
            onChange={(e) => update("exp_date", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Quantity">
          <input
            data-testid="scan-qty"
            type="number"
            min="0"
            value={form.quantity}
            onChange={(e) => update("quantity", parseInt(e.target.value || "0", 10))}
            className={inputCls}
          />
        </Field>
        <Field label="Category">
          <select
            data-testid="scan-category"
            value={form.category}
            onChange={(e) => update("category", e.target.value)}
            className={inputCls}
          >
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <button
        data-testid="scan-save-btn"
        disabled={!canSave}
        onClick={onSave}
        className="w-full mt-4 inline-flex items-center justify-center gap-2 bg-brand-primary text-white font-bold px-4 py-3.5 rounded-full hover:bg-brand-primaryHover shadow-glow disabled:opacity-60"
      >
        <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save to inventory"}
      </button>
    </>
  );
}

export default function ScanResults({ ocr, processing, form, setForm, onSave, saving }) {
  return (
    <div className="bg-surface border border-line rounded-2xl p-5 sm:p-6">
      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted mb-4">
        / 02 — Verify &amp; save
      </div>
      {!ocr && !processing && <EmptyState />}
      {processing && <ProcessingState />}
      <AnimatePresence>
        {ocr && (
          <motion.div {...resultEnter} className="space-y-4" data-testid="ocr-result">
            <ConfidenceBar ocr={ocr} />
            <VerifyForm form={form} setForm={setForm} onSave={onSave} saving={saving} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
