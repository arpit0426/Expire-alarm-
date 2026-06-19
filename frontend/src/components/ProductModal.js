import React from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../lib/api";
import { formatApiErrorDetail } from "../lib/utils";

export const PRODUCT_CATEGORIES = [
  "general",
  "food",
  "beverage",
  "dairy",
  "pharma",
  "cosmetics",
  "snacks",
  "frozen",
];

const inputCls =
  "w-full bg-white border border-line rounded-xl px-3 py-2.5 text-ink text-sm font-sans focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 outline-none";

function Field({ label, children, className = "" }) {
  return (
    <div className={className}>
      <label className="block font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

const emptyForm = {
  product_name: "",
  batch_number: "",
  mfg_date: "",
  exp_date: "",
  quantity: 0,
  category: "general",
  notes: "",
};

export default function ProductModal({ product, onClose, onSaved }) {
  const editing = Boolean(product);
  const [form, setForm] = React.useState(() => ({
    ...emptyForm,
    ...(product
      ? {
          product_name: product.product_name || "",
          batch_number: product.batch_number || "",
          mfg_date: product.mfg_date || "",
          exp_date: product.exp_date || "",
          quantity: product.quantity ?? 0,
          category: product.category || "general",
          notes: product.notes || "",
        }
      : {}),
  }));
  const [saving, setSaving] = React.useState(false);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/products/${product.id}`, form);
        toast.success("Updated");
      } else {
        await api.post(`/products`, form);
        toast.success("Saved to inventory");
      }
      onSaved();
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail) || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const canSubmit = form.product_name && form.batch_number && form.exp_date && !saving;

  return (
    <div
      className="fixed inset-0 z-50 bg-brand-dark/60 backdrop-blur-sm flex items-center justify-center p-4"
      data-testid="product-modal"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-brand-cream rounded-3xl w-full max-w-xl overflow-hidden border border-line shadow-soft"
      >
        <div className="flex items-center justify-between p-5 border-b border-line">
          <h3 className="font-display text-2xl font-bold text-ink">
            {editing ? "Edit product" : "Add new product"}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-line/40"
            data-testid="modal-close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 grid sm:grid-cols-2 gap-4">
          <Field label="Product name *">
            <input
              data-testid="modal-product-name"
              value={form.product_name}
              onChange={(e) => update("product_name", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Batch number *">
            <input
              data-testid="modal-batch-number"
              value={form.batch_number}
              onChange={(e) => update("batch_number", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="MFG date">
            <input
              data-testid="modal-mfg"
              type="date"
              value={form.mfg_date || ""}
              onChange={(e) => update("mfg_date", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="EXP date *">
            <input
              data-testid="modal-exp"
              type="date"
              value={form.exp_date || ""}
              onChange={(e) => update("exp_date", e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Quantity">
            <input
              data-testid="modal-qty"
              type="number"
              min="0"
              value={form.quantity}
              onChange={(e) => update("quantity", parseInt(e.target.value || "0", 10))}
              className={inputCls}
            />
          </Field>
          <Field label="Category">
            <select
              data-testid="modal-category"
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
          <Field label="Notes" className="sm:col-span-2">
            <textarea
              data-testid="modal-notes"
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              rows={2}
              className={inputCls}
            />
          </Field>
        </div>
        <div className="p-5 border-t border-line flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-full font-semibold text-ink-soft hover:bg-line/40"
          >
            Cancel
          </button>
          <button
            data-testid="modal-save"
            disabled={!canSubmit}
            onClick={save}
            className="px-6 py-2.5 rounded-full bg-brand-primary text-white font-semibold shadow-glow disabled:opacity-50"
          >
            {saving ? "Saving…" : editing ? "Save changes" : "Save product"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
