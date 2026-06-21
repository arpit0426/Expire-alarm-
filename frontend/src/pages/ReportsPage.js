import React, { useCallback, useEffect, useState } from "react";
import { Leaf, FileDown, TrendingDown } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { toast } from "sonner";
import { api } from "../lib/api";
import { logger } from "../lib/logger";
import { statusMeta, formatDateShort, daysLeftLabel } from "../lib/utils";
import { useAuth } from "../contexts/AuthContext";

const STATUS_COLORS = {
  safe: "#259E7E",
  near_expiry: "#B89424",
  critical: "#C45A3D",
  expired: "#C41E1E",
  unknown: "#8EA19A",
};

export default function ReportsPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const canExport = ["manager", "admin"].includes(user?.role);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/reports/summary");
      setSummary(data);
    } catch (err) {
      logger.warn("Reports load failed:", err?.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onExport = async () => {
    try {
      const res = await api.get("/reports/export", { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inventory-${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Excel ready");
    } catch (_err) {
      toast.error("Export failed");
    }
  };

  const statusData = summary
    ? Object.entries(summary.by_status).map(([k, v]) => ({ name: k, value: v }))
    : [];
  const categoryData = summary
    ? Object.entries(summary.by_category).map(([k, v]) => ({ category: k, count: v }))
    : [];

  return (
    <div className="space-y-8" data-testid="reports-page">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
        <div>
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-brand-primary mb-2">
            / Reports & analytics
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-black text-ink tracking-tight">
            Counted, classified, <span className="italic text-brand-primary">charted.</span>
          </h1>
        </div>
        {canExport && (
          <button
            data-testid="reports-export-btn"
            onClick={onExport}
            className="inline-flex items-center gap-2 bg-brand-primary text-white font-semibold px-5 py-3 rounded-full hover:bg-brand-primaryHover shadow-glow"
          >
            <FileDown className="h-4 w-4" /> Export Excel
          </button>
        )}
      </div>

      {/* Hero KPI */}
      <div className="relative bg-brand-accent text-brand-dark rounded-3xl p-8 sm:p-10 grain overflow-hidden">
        <div className="absolute -top-12 -right-12 h-56 w-56 rounded-full bg-brand-primary/30 blur-3xl" />
        <div className="relative grid sm:grid-cols-3 items-center gap-6">
          <div className="sm:col-span-2">
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand-dark/70">
              / Estimated food waste reduction
            </div>
            <h3 className="font-display text-5xl sm:text-6xl font-black tracking-tight mt-2">
              {summary?.estimated_kg_saved ?? 0} kg saved
            </h3>
            <p className="mt-3 font-sans max-w-lg">
              Items pulled forward from Near Expiry or Critical before they expired.
              Rough estimate at 0.5kg / batch.
            </p>
          </div>
          <div className="hidden sm:flex items-center justify-end">
            <div className="h-28 w-28 rounded-full bg-brand-dark grid place-items-center shadow-soft">
              <Leaf className="h-12 w-12 text-brand-accent" strokeWidth={2.2} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-5">
        <ChartCard title="Status distribution">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={100} innerRadius={55} paddingAngle={3}>
                {statusData.map((d) => (
                  <Cell key={d.name} fill={STATUS_COLORS[d.name] || "#8EA19A"} />
                ))}
              </Pie>
              <Tooltip />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontFamily: "JetBrains Mono", fontSize: 11 }}
                formatter={(v) => v.replace("_", " ")}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Inventory by category">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={categoryData}>
              <XAxis dataKey="category" stroke="#8EA19A" tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} />
              <YAxis stroke="#8EA19A" tick={{ fontSize: 11, fontFamily: "JetBrains Mono" }} />
              <Tooltip cursor={{ fill: "#E9F5F2" }} />
              <Bar dataKey="count" fill="#259E7E" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Lists */}
      <div className="grid lg:grid-cols-2 gap-5">
        <ListCard title="Near-expiry leaders" items={summary?.near_expiry_top || []} />
        <ListCard title="Expired backlog" items={summary?.expired_top || []} variant="expired" />
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted mb-3">
        / {title}
      </div>
      {children}
    </div>
  );
}

function ListCard({ title, items, variant }) {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted">/ {title}</div>
        {variant === "expired" && (
          <span className="font-mono text-[11px] text-status-expired flex items-center gap-1.5">
            <TrendingDown className="h-3 w-3" /> action needed
          </span>
        )}
      </div>
      {items.length === 0 ? (
        <div className="text-sm text-ink-muted py-6 text-center font-sans">No items in this bucket.</div>
      ) : (
        <ul className="divide-y divide-line">
          {items.slice(0, 8).map((p) => {
            const s = statusMeta(p.status);
            return (
              <li key={p.id} className="py-3 flex items-center gap-3">
                <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-display font-semibold text-ink truncate">{p.product_name}</div>
                  <div className="font-mono text-[11px] text-ink-muted truncate">
                    {p.batch_number} · {p.category}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm text-ink">{formatDateShort(p.exp_date)}</div>
                  <div className={`font-mono text-[11px] ${s.text}`}>{daysLeftLabel(p.days_left)}</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
