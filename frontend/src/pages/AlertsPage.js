import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, Check, RefreshCw, AlertTriangle, AlertOctagon, Info } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { formatDateShort } from "../lib/utils";

const SEVERITY_META = {
  critical: { icon: AlertOctagon, cls: "bg-status-criticalBg border-status-critical/30 text-status-critical" },
  warning: { icon: AlertTriangle, cls: "bg-status-nearBg border-status-near/30 text-status-near" },
  info: { icon: Info, cls: "bg-brand-primary/10 border-brand-primary/30 text-brand-primary" },
};

export default function AlertsPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const canScan = ["manager", "admin"].includes(user?.role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/alerts", { params: { limit: 200 } });
      setAlerts(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = async (id) => {
    await api.post(`/alerts/${id}/read`);
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)));
  };

  const readAll = async () => {
    await api.post("/alerts/read-all");
    setAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    toast.success("All alerts marked read");
  };

  const rescan = async () => {
    setScanning(true);
    try {
      const { data } = await api.post("/alerts/scan");
      toast.success(`Scanned. ${data.alerts_created} alerts emitted.`);
      load();
    } catch {
      toast.error("Scan failed");
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-8" data-testid="alerts-page">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5">
        <div>
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-brand-primary mb-2">
            / Alerts
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-black text-ink tracking-tight">
            What needs your <span className="italic text-brand-primary">attention</span>.
          </h1>
        </div>
        <div className="flex flex-wrap gap-3">
          {canScan && (
            <button
              data-testid="rescan-alerts-btn"
              onClick={rescan}
              disabled={scanning}
              className="inline-flex items-center gap-2 bg-surface border border-line text-ink font-semibold px-5 py-3 rounded-full hover:border-brand-primary disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} /> Re-scan inventory
            </button>
          )}
          <button
            data-testid="read-all-alerts-btn"
            onClick={readAll}
            className="inline-flex items-center gap-2 bg-brand-primary text-white font-semibold px-5 py-3 rounded-full hover:bg-brand-primaryHover shadow-glow"
          >
            <Check className="h-4 w-4" /> Mark all read
          </button>
        </div>
      </div>

      <div className="bg-surface border border-line rounded-2xl p-6">
        {loading ? (
          <div className="py-10 text-center font-mono text-sm text-ink-muted">Loading…</div>
        ) : alerts.length === 0 ? (
          <div className="py-16 text-center">
            <Bell className="h-8 w-8 mx-auto text-ink-muted mb-3" strokeWidth={1.5} />
            <div className="font-sans text-ink-soft">No alerts. Clean shelves all around.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((a) => {
              const meta = SEVERITY_META[a.severity] || SEVERITY_META.info;
              const Icon = meta.icon;
              return (
                <div
                  key={a.id}
                  data-testid={`alert-row-${a.id}`}
                  className={`flex items-start gap-4 p-4 rounded-2xl border ${meta.cls} ${a.read ? "opacity-60" : ""}`}
                >
                  <div className="h-10 w-10 rounded-xl bg-white/70 grid place-items-center">
                    <Icon className="h-5 w-5" strokeWidth={2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] font-bold">{a.kind}</span>
                      {!a.read && <span className="h-1.5 w-1.5 rounded-full bg-brand-accent animate-pulse_dot" />}
                    </div>
                    <div className="font-display font-semibold text-ink mt-0.5 text-base">
                      {a.message}
                    </div>
                    <div className="font-mono text-[11px] text-ink-muted mt-1">
                      {formatDateShort(a.created_at)}
                    </div>
                  </div>
                  {!a.read && (
                    <button
                      data-testid={`alert-read-${a.id}`}
                      onClick={() => markRead(a.id)}
                      className="text-xs font-semibold text-ink-soft hover:text-brand-primary px-3 py-1.5 rounded-full hover:bg-white/60"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
