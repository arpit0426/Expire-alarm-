import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Boxes,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  TrendingDown,
  ScanLine,
  Bell,
  ArrowUpRight,
  Leaf,
} from "lucide-react";
import { api } from "../lib/api";
import { statusMeta, formatDateShort, daysLeftLabel } from "../lib/utils";
import { useAuth } from "../contexts/AuthContext";

const KPI_DEFS = [
  { key: "total", label: "Total Products", icon: Boxes, accent: "bg-brand-primary" },
  { key: "safe", label: "Safe", icon: ShieldCheck, accent: "bg-status-safe" },
  { key: "near_expiry", label: "Near Expiry", icon: AlertTriangle, accent: "bg-status-near" },
  { key: "critical", label: "Critical", icon: AlertOctagon, accent: "bg-status-critical" },
  { key: "expired", label: "Expired", icon: TrendingDown, accent: "bg-status-expired" },
];

const ALERT_SEVERITY_CLASSES = {
  critical: "bg-status-criticalBg border-status-critical/30",
  warning: "bg-status-nearBg border-status-near/30",
  info: "bg-brand-cream border-line",
};

function alertSeverityClass(sev) {
  return ALERT_SEVERITY_CLASSES[sev] || ALERT_SEVERITY_CLASSES.info;
}

export default function OverviewPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [recent, setRecent] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);

  const load = useCallback(async () => {
    const [{ data: s }, { data: p }, { data: a }] = await Promise.all([
      api.get("/dashboard/summary"),
      api.get("/products", { params: { limit: 6 } }),
      api.get("/alerts", { params: { limit: 5 } }),
    ]);
    setSummary(s);
    setRecent(p);
    setRecentAlerts(a);
  }, []);

  useEffect(() => {
    load().catch((err) => {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Overview load failed:", err?.message);
      }
    });
  }, [load]);

  return (
    <div className="space-y-10" data-testid="overview-page">
      {/* Heading */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
        <div>
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-brand-primary mb-2">
            / Workspace overview
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-black text-ink tracking-tight">
            Hi {user?.name?.split(" ")[0] || "team"}, your shelves{" "}
            <span className="italic text-brand-primary">today</span>.
          </h1>
          <p className="text-ink-soft mt-2 max-w-xl">
            Live snapshot of what is safe, what is about to flip, and what to act on first.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/app/scan"
            data-testid="overview-scan-cta"
            className="inline-flex items-center gap-2 bg-brand-primary text-white font-semibold px-5 py-3 rounded-full hover:bg-brand-primaryHover shadow-glow"
          >
            <ScanLine className="h-4 w-4" /> Scan a label
          </Link>
          <Link
            to="/app/inventory"
            data-testid="overview-inventory-cta"
            className="inline-flex items-center gap-2 bg-surface border border-line text-ink font-semibold px-5 py-3 rounded-full hover:border-brand-primary transition"
          >
            <Boxes className="h-4 w-4" /> Inventory
          </Link>
        </div>
      </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
        {KPI_DEFS.map((k, i) => {
          const value = summary?.counts?.[k.key] ?? 0;
          return (
            <motion.div
              key={k.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              data-testid={`kpi-${k.key}`}
              className="relative bg-surface border border-line rounded-2xl p-5 sm:p-6 overflow-hidden hover:-translate-y-0.5 hover:shadow-soft transition"
            >
              <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10 ${k.accent}`} />
              <div className="flex items-center gap-3 mb-4">
                <div className={`h-9 w-9 rounded-xl grid place-items-center text-white ${k.accent}`}>
                  <k.icon className="h-4.5 w-4.5" strokeWidth={2} />
                </div>
                <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
                  {k.label}
                </div>
              </div>
              <div className="font-display text-4xl sm:text-5xl font-black text-ink tabular-nums">
                {value}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Two-column: Recent items + Recent alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent products */}
        <div className="lg:col-span-2 bg-surface border border-line rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted">
                / Recently scanned
              </div>
              <h3 className="font-display text-2xl font-bold text-ink mt-1">Latest intake</h3>
            </div>
            <Link to="/app/inventory" className="text-sm text-brand-primary font-semibold inline-flex items-center gap-1">
              View all <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          {recent.length === 0 ? (
            <EmptyState text="No products yet. Scan your first label to get started." />
          ) : (
            <div className="space-y-2">
              {recent.map((p) => {
                const s = statusMeta(p.status);
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-brand-cream transition"
                  >
                    <div className={`h-10 w-10 rounded-xl grid place-items-center ${s.bg}`}>
                      <span className={`h-2.5 w-2.5 rounded-full ${s.dot} ${["critical","expired"].includes(p.status) ? "animate-pulse_dot" : ""}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-bold text-ink truncate">{p.product_name}</div>
                      <div className="font-mono text-xs text-ink-muted">batch {p.batch_number} · {p.category}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-semibold text-ink">{formatDateShort(p.exp_date)}</div>
                      <div className={`text-xs font-mono ${s.text}`}>{daysLeftLabel(p.days_left)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Alerts */}
        <div className="bg-surface border border-line rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted">
                / Activity
              </div>
              <h3 className="font-display text-2xl font-bold text-ink mt-1">Recent alerts</h3>
            </div>
            <Link to="/app/alerts" className="text-sm text-brand-primary font-semibold inline-flex items-center gap-1">
              All <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          {recentAlerts.length === 0 ? (
            <EmptyState text="No alerts. You are on top of it." />
          ) : (
            <div className="space-y-3">
              {recentAlerts.map((a) => (
                <div
                  key={a.id}
                  className={`p-3 rounded-xl border ${alertSeverityClass(a.severity)}`}
                >
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-muted">
                    <Bell className="h-3 w-3" /> {a.kind}
                  </div>
                  <div className="text-sm font-sans text-ink mt-1">{a.message}</div>
                  <div className="font-mono text-[10px] text-ink-muted mt-1">{formatDateShort(a.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Impact */}
      <div className="relative bg-brand-primary text-brand-cream rounded-3xl p-8 sm:p-10 overflow-hidden grain">
        <div className="absolute -top-10 -right-10 h-56 w-56 rounded-full bg-brand-accent/30 blur-3xl" />
        <div className="relative grid sm:grid-cols-3 gap-6 items-center">
          <div className="sm:col-span-2">
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-brand-accent">
              / Impact estimate
            </div>
            <h3 className="font-display text-3xl sm:text-4xl font-black tracking-tight mt-2">
              {summary?.estimated_waste_saved || 0} batches saved from waste this cycle.
            </h3>
            <p className="mt-3 text-brand-cream/80 max-w-lg">
              That is roughly <span className="font-bold text-brand-accent">{(summary?.estimated_waste_saved || 0) * 0.5} kg</span> of stock pulled forward before going bad.
            </p>
          </div>
          <div className="flex items-center justify-center sm:justify-end">
            <div className="h-24 w-24 rounded-full bg-brand-accent grid place-items-center shadow-accent">
              <Leaf className="h-10 w-10 text-brand-dark" strokeWidth={2.2} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="border border-dashed border-line rounded-xl p-8 text-center">
      <div className="text-ink-muted font-sans text-sm">{text}</div>
    </div>
  );
}
