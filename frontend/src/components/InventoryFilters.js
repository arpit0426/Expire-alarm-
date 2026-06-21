import React from "react";
import { Search, Filter } from "lucide-react";
import { statusMeta } from "../lib/utils";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "safe", label: "Safe" },
  { value: "near_expiry", label: "Near" },
  { value: "critical", label: "Critical" },
  { value: "expired", label: "Expired" },
];

const CATEGORIES = [
  "all",
  "general",
  "food",
  "beverage",
  "dairy",
  "pharma",
  "cosmetics",
  "snacks",
  "frozen",
];

export default function InventoryFilters({
  q,
  setQ,
  statusF,
  setStatusF,
  catF,
  setCatF,
  summary,
  onSubmit,
}) {
  return (
    <div className="glass rounded-2xl p-5 flex flex-col gap-4">
      <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-3">
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
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          data-testid="inventory-filter-category"
          value={catF}
          onChange={(e) => setCatF(e.target.value)}
          className="bg-brand-cream border border-line rounded-xl px-4 py-3 font-sans text-sm focus:border-brand-primary outline-none"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
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
        {["safe", "near_expiry", "critical", "expired"].map((k) => {
          const s = statusMeta(k);
          return (
            <div
              key={k}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${s.bg}`}
            >
              <span className={`h-2 w-2 rounded-full ${s.dot}`} />
              <span className={`font-mono text-xs font-bold ${s.text}`}>
                {s.label} · {summary[k]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
