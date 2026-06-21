import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { FileDown, Edit2, Trash2, Plus } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import {
  statusMeta,
  formatDateShort,
  daysLeftLabel,
  formatApiErrorDetail,
} from "../lib/utils";
import ProductModal from "../components/ProductModal";
import InventoryFilters from "../components/InventoryFilters";
import { rowFadeIn } from "../lib/motion";

const STATUS_PILL_CLASSES = {
  pulse: "animate-pulse_dot",
  static: "",
};

function statusPulseClass(status) {
  return status === "critical" || status === "expired"
    ? STATUS_PILL_CLASSES.pulse
    : STATUS_PILL_CLASSES.static;
}

function TableBodyState({ loading, isEmpty, children }) {
  if (loading) {
    return (
      <tr>
        <td colSpan={8} className="px-5 py-10 text-center text-ink-muted font-mono text-sm">
          Loading…
        </td>
      </tr>
    );
  }
  if (isEmpty) {
    return (
      <tr>
        <td colSpan={8} className="px-5 py-16 text-center text-ink-muted font-sans">
          No products match. Try clearing filters or add a new one.
        </td>
      </tr>
    );
  }
  return children;
}

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

  const load = useCallback(async () => {
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
  }, [q, statusF, catF]);

  useEffect(() => {
    load();
  }, [statusF, catF, load]);

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
      const res = await api.get("/reports/export", {
        params: statusF !== "all" ? { status_filter: statusF } : {},
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inventory-${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Excel exported");
    } catch (_e) {
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
              className="inline-flex items-center gap-2 glass text-ink font-semibold px-5 py-3 rounded-full hover:border-brand-primary/50 hover:bg-white/70 transition"
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

      <InventoryFilters
        q={q}
        setQ={setQ}
        statusF={statusF}
        setStatusF={setStatusF}
        catF={catF}
        setCatF={setCatF}
        summary={summary}
        onSubmit={onSearchSubmit}
      />

      <div className="glass rounded-2xl overflow-hidden">
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
              <TableBodyState loading={loading} isEmpty={items.length === 0}>
                {items.map((p) => {
                  const s = statusMeta(p.status);
                  return (
                    <motion.tr
                      key={p.id}
                      {...rowFadeIn}
                      className="hover:bg-brand-cream/60 transition"
                      data-testid={`inventory-row-${p.id}`}
                    >
                      <td className="px-5 py-4">
                        <div className="font-display font-bold text-ink">{p.product_name}</div>
                        {p.notes && (
                          <div className="text-xs text-ink-muted mt-0.5 truncate max-w-[280px]">
                            {p.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 font-mono text-sm">{p.batch_number}</td>
                      <td className="px-5 py-4 font-sans text-sm capitalize text-ink-soft">
                        {p.category}
                      </td>
                      <td className="px-5 py-4 font-mono text-sm text-ink-soft">
                        {formatDateShort(p.mfg_date)}
                      </td>
                      <td className="px-5 py-4 font-mono text-sm font-semibold text-ink">
                        {formatDateShort(p.exp_date)}
                      </td>
                      <td className="px-5 py-4 font-mono text-sm tabular-nums">{p.quantity}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full ${s.bg}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${statusPulseClass(p.status)}`} />
                          <span className={`font-mono text-[11px] font-bold uppercase tracking-wide ${s.text}`}>
                            {s.label}
                          </span>
                          <span className={`font-mono text-[11px] ${s.text} opacity-70`}>
                            · {daysLeftLabel(p.days_left)}
                          </span>
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
              </TableBodyState>
            </tbody>
          </table>
        </div>
      </div>

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
