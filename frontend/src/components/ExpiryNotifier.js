import React, { useCallback, useEffect, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Bell, AlertOctagon, Tag, ShoppingCart, Megaphone, Clock } from "lucide-react";
import { api } from "../lib/api";
import { logger } from "../lib/logger";

const SEEN_KEY = "freshtrack_seen_alert_ids";
const POPUP_LIMIT = 3;
const POLL_INTERVAL_MS = 15000;

const TIER_VISUAL = {
  expired:   { Icon: AlertOctagon, ring: "ring-status-expired",   chip: "bg-status-expiredBg text-status-expired",   bar: "bg-status-expired" },
  tier_3h:   { Icon: Clock,        ring: "ring-status-critical",  chip: "bg-status-criticalBg text-status-critical", bar: "bg-status-critical" },
  tier_6h:   { Icon: Clock,        ring: "ring-status-critical",  chip: "bg-status-criticalBg text-status-critical", bar: "bg-status-critical" },
  tier_24h:  { Icon: Clock,        ring: "ring-status-critical",  chip: "bg-status-criticalBg text-status-critical", bar: "bg-status-critical" },
  tier_3d:   { Icon: ShoppingCart, ring: "ring-status-near",      chip: "bg-status-nearBg text-status-near",         bar: "bg-status-near" },
  tier_1w:   { Icon: Tag,          ring: "ring-status-near",      chip: "bg-status-nearBg text-status-near",         bar: "bg-status-near" },
  tier_1m:   { Icon: Megaphone,    ring: "ring-brand-primary",    chip: "bg-brand-primarySoft text-brand-primary",   bar: "bg-brand-primary" },
};

function tierKeyFromKind(kind) {
  if (!kind) return null;
  if (kind === "expiry_expired") return "expired";
  if (kind.startsWith("expiry_")) return kind.replace("expiry_", "");
  return null;
}

function loadSeen() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"));
  } catch {
    return new Set();
  }
}
function saveSeen(set) {
  try {
    const arr = Array.from(set).slice(-500); // cap the seen list
    localStorage.setItem(SEEN_KEY, JSON.stringify(arr));
  } catch {
    /* quota exceeded — ignore */
  }
}

/**
 * Dashboard-only popup notification stack.
 * Polls /alerts every 15s and shows up to 3 new tiered-expiry alerts in
 * the bottom-right corner. Each popup includes product name, remaining
 * time and the sales recommendation from the alert's meta.
 */
export default function ExpiryNotifier() {
  const [popups, setPopups] = useState([]);
  const seenRef = useRef(loadSeen());

  const dismiss = useCallback(async (id) => {
    setPopups((prev) => prev.filter((p) => p.id !== id));
    try { await api.post(`/alerts/${id}/read`); } catch { /* swallow */ }
  }, []);

  const poll = useCallback(async () => {
    try {
      const { data } = await api.get("/alerts", {
        params: { unread_only: true, limit: 25 },
      });
      const tiered = (data || []).filter((a) => tierKeyFromKind(a.kind));
      const fresh = tiered.filter((a) => !seenRef.current.has(a.id));
      if (!fresh.length) return;
      const next = fresh.slice(0, POPUP_LIMIT);
      next.forEach((n) => seenRef.current.add(n.id));
      saveSeen(seenRef.current);
      setPopups((prev) => [...next, ...prev].slice(0, POPUP_LIMIT));
    } catch (err) {
      logger.warn("ExpiryNotifier poll failed:", err?.message);
    }
  }, []);

  useEffect(() => {
    poll();
    const t = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [poll]);

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-3 max-w-sm w-[calc(100vw-3rem)] sm:w-96 pointer-events-none">
      <AnimatePresence>
        {popups.map((a) => {
          const tier = tierKeyFromKind(a.kind);
          const visual = TIER_VISUAL[tier] || TIER_VISUAL.tier_1m;
          const meta = a.meta || {};
          const Icon = visual.Icon;
          return (
            <motion.div
              key={a.id}
              layout
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.95, transition: { duration: 0.18 } }}
              transition={{ type: "spring", damping: 22, stiffness: 280 }}
              data-testid={`expiry-popup-${a.id}`}
              className={`glass-strong relative pointer-events-auto rounded-2xl p-4 pl-5 ring-1 ${visual.ring}/30 overflow-hidden`}
            >
              <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${visual.bar}`} />
              <div className="flex items-start gap-3">
                <div className={`h-10 w-10 rounded-xl ${visual.chip} grid place-items-center flex-shrink-0`}>
                  <Icon className="h-5 w-5" strokeWidth={2.2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${visual.chip} font-mono text-[10px] uppercase tracking-wider font-bold`}>
                      <Bell className="h-3 w-3" /> {meta.tier_label || "expiry"}
                    </span>
                    <button
                      data-testid={`expiry-popup-close-${a.id}`}
                      onClick={() => dismiss(a.id)}
                      className="text-ink-muted hover:text-ink p-1 rounded"
                      aria-label="Dismiss"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="font-display font-bold text-ink text-base leading-tight">
                    {meta.product_name || "Product"}
                  </div>
                  {meta.remaining && (
                    <div className="font-mono text-xs text-ink-soft mt-1">
                      {meta.remaining}
                      {meta.batch_number && (
                        <> · batch {meta.batch_number}</>
                      )}
                    </div>
                  )}
                  {meta.recommendation && (
                    <div className="mt-2 text-sm text-ink leading-snug">
                      <span className="font-semibold text-brand-primary">Action:</span>{" "}
                      {meta.recommendation}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
