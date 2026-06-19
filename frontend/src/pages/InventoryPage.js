import React, { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Search, Filter, FileDown, Edit2, Trash2, Plus, X } from "lucide-react";
import { api, API } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { statusMeta, formatDateShort, daysLeftLabel, formatApiErrorDetail } from "../lib/utils";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "safe", label: "Safe" },
  { value: "near_expiry", label: "Near" },
  { value: "critical", label: "Critical" },
  { value: "expired", label: "Expired" },
];

const CATEGORIES = ["all", "general", "food", "beverage", "dairy", "pharma", "cosmetics", "snacks", "frozen"];

export default function InventoryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [catF, setCatF] = useState("all");
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const canEdit = ["manager", "admin"].includes(user?.role);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (q) params.q = q;
      if (statusF !== "all") params.status_filter = statusF;
      if (catF !== "all") params.category = catF;
      const { data } = await api.get("/products", { params });
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusF, catF]);

  const onSearchSubmit = (e) => {
    e.preventDefault();
    load();
  };

  const onDelete = async (id) => {
    if (!window.confirm("Delete this product? This cannot be undone.")) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success("Deleted");
      load();
    } catch (err) {
      toast.error(formatApiErrorDetail(err?.response?.data?.detail) || "Delete failed");
    }
  };

  const onExport = async () => {
    try {
      const token = localStorage.getItem("token");
      const url = `${API}/reports/export${statusF !== "all" ? `?status_filter=${statusF}` : ""}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `inventory-${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("Excel exported");
    } catch (e) {
      toast.error("Export failed");
    }
  };

  const summary = useMemo(() => {
    const c = { safe: 0, near_expiry: 0, critical: 0, expired: 0 };
    items.forEach((p) => {
      if (c[p.status] !== undefined) c[p.status] += 1;
    });
    return c;
  }, [items]);

  return (
    <div className="space-y-8" data-testid="inventory-page">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
        <div>
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-brand-primary mb-2">
            / Inventory
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-black text-ink tracking-tight">
            Every batch, on a single shelf.
          </h1>
        </div>
        <div className="flex flex-wrap gap-3">
          {canEdit && (
            <button
              data-testid="export-excel-btn"
              onClick={onExport}
              className="inline-flex items-center gap-2 bg-surface border border-line text-ink font-semibold px-5 py-3 rounded-full hover:border-brand-primary transition"
            >
              <FileDown className="h-4 w-4" /> Export
            </button>
          )}
          <button
            data-testid="add-product-btn"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 bg-brand-primary text-white font-semibold px-5 py-3 rounded-full hover:bg-brand-primaryHover shadow-glow"
          >
            <Plus className="h-4 w-4" /> Add product
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface border border-line rounded-2xl p-5 flex flex-col gap-4">
        <form onSubmit={onSearchSubmit} className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              data-testid="inventory-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search product or batch…"
              className="w-full pl-9 pr-3 py-3 bg-brand-cream border border-line rounded-xl font-sans text-sm focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none"
            />
          </div>
          <select
            data-testid="inventory-filter-status"
            value={statusF}
            onChange={(e) => setStatusF(e.target.value)}
            className="bg-brand-cream border border-line rounded-xl px-4 py-3 font-sans text-sm focus:border-brand-primary outline-none"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select
            data-testid="inventory-filter-category"
            value={catF}
            onChange={(e) => setCatF(e.target.value)}
            className="bg-brand-cream border border-line rounded-xl px-4 py-3 font-sans text-sm focus:border-brand-primary outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <button
            data-testid="inventory-search-submit"
            type="submit"
            className="inline-flex items-center gap-2 bg-brand-dark text-brand-cream font-semibold px-5 py-3 rounded-xl hover:bg-ink"
          >
            <Filter className="h-4 w-4" /> Apply
          </button>
        </form>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-line">
          {["safe","near_expiry","critical","expired"].map((k) => {
            const s = statusMeta(k);
            return (
              <div key={k} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${s.bg}`}>
                <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                <span className={`font-mono text-xs font-bold ${s.text}`}>{s.label} · {summary[k]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-line rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-brand-cream border-b border-line">
              <tr className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                <th className="px-5 py-4">Product</th>
                <th className="px-5 py-4">Batch</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">MFG</th>
                <th className="px-5 py-4">EXP</th>
                <th className="px-5 py-4">Qty</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line" data-testid="inventory-table-body">
              {loading ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-ink-muted font-mono text-sm">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-16 text-center text-ink-muted font-sans">No products match. Try clearing filters or add a new one.</td></tr>
              ) : items.map((p) => {
                const s = statusMeta(p.status);
                return (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-brand-cream/60 transition"
                    data-testid={`inventory-row-${p.id}`}
                  >
                    <td className="px-5 py-4">
                      <div className="font-display font-bold text-ink">{p.product_name}</div>
                      {p.notes && <div className="text-xs text-ink-muted mt-0.5 truncate max-w-[280px]">{p.notes}</div>}
                    </td>
                    <td className="px-5 py-4 font-mono text-sm">{p.batch_number}</td>
                    <td className="px-5 py-4 font-sans text-sm capitalize text-ink-soft">{p.category}</td>
                    <td className="px-5 py-4 font-mono text-sm text-ink-soft">{formatDateShort(p.mfg_date)}</td>
                    <td className="px-5 py-4 font-mono text-sm font-semibold text-ink">{formatDateShort(p.exp_date)}</td>
                    <td className="px-5 py-4 font-mono text-sm tabular-nums">{p.quantity}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full ${s.bg}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${["critical","expired"].includes(p.status) ? "animate-pulse_dot" : ""}`} />
                        <span className={`font-mono text-[11px] font-bold uppercase tracking-wide ${s.text}`}>{s.label}</span>
                        <span className={`font-mono text-[11px] ${s.text} opacity-70`}>· {daysLeftLabel(p.days_left)}</span>
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {canEdit && (
                          <>
                            <button
                              data-testid={`edit-product-${p.id}`}
                              onClick={() => setEditing(p)}
                              className="p-2 rounded-lg hover:bg-brand-primary/10 text-brand-primary"
                              title="Edit"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              data-testid={`delete-product-${p.id}`}
                              onClick={() => onDelete(p.id)}
                              className="p-2 rounded-lg hover:bg-status-expiredBg text-status-expired"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {creating && (
        <ProductModal
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            load();
          }}
        />
      )}
      {editing && (
        <ProductModal
          product={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function ProductModal({ product, onClose, onSaved }) {
  const editing = !!product;
  const [form, setForm] = useState(() => ({
    product_name: product?.product_name || "",
    batch_number: product?.batch_number || "",
    mfg_date: product?.mfg_date || "",
    exp_date: product?.exp_date || "",
    quantity: product?.quantity ?? 0,
    category: product?.category || "general",
    notes: product?.notes || "",
  }));
  const [saving, setSaving] = useState(false);

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

  return (
    <div className="fixed inset-0 z-50 bg-brand-dark/60 backdrop-blur-sm flex items-center justify-center p-4" data-testid="product-modal">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-brand-cream rounded-3xl w-full max-w-xl overflow-hidden border border-line shadow-soft"
      >
        <div className="flex items-center justify-between p-5 border-b border-line">
          <h3 className="font-display text-2xl font-bold text-ink">
            {editing ? "Edit product" : "Add new product"}
          </h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-line/40" data-testid="modal-close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5 grid sm:grid-cols-2 gap-4">
          <Field label="Product name *">
            <input data-testid="modal-product-name" value={form.product_name} onChange={(e) => update("product_name", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Batch number *">
            <input data-testid="modal-batch-number" value={form.batch_number} onChange={(e) => update("batch_number", e.target.value)} className={inputCls} />
          </Field>
          <Field label="MFG date">
            <input data-testid="modal-mfg" type="date" value={form.mfg_date || ""} onChange={(e) => update("mfg_date", e.target.value)} className={inputCls} />
          </Field>
          <Field label="EXP date *">
            <input data-testid="modal-exp" type="date" value={form.exp_date || ""} onChange={(e) => update("exp_date", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Quantity">
            <input data-testid="modal-qty" type="number" min="0" value={form.quantity} onChange={(e) => update("quantity", parseInt(e.target.value || "0", 10))} className={inputCls} />
          </Field>
          <Field label="Category">
            <select data-testid="modal-category" value={form.category} onChange={(e) => update("category", e.target.value)} className={inputCls}>
              {CATEGORIES.filter((c) => c !== "all").map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <textarea data-testid="modal-notes" value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={2} className={inputCls} />
          </Field>
        </div>
        <div className="p-5 border-t border-line flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-full font-semibold text-ink-soft hover:bg-line/40">Cancel</button>
          <button
            data-testid="modal-save"
            disabled={saving || !form.product_name || !form.batch_number || !form.exp_date}
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
