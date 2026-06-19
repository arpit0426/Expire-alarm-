import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  }
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export function statusMeta(status) {
  switch (status) {
    case "safe":
      return { label: "Safe", dot: "bg-status-safe", text: "text-status-safe", bg: "bg-status-safeBg" };
    case "near_expiry":
      return { label: "Near Expiry", dot: "bg-status-near", text: "text-status-near", bg: "bg-status-nearBg" };
    case "critical":
      return { label: "Critical", dot: "bg-status-critical", text: "text-status-critical", bg: "bg-status-criticalBg" };
    case "expired":
      return { label: "Expired", dot: "bg-status-expired", text: "text-status-expired", bg: "bg-status-expiredBg" };
    default:
      return { label: "Unknown", dot: "bg-ink-muted", text: "text-ink-muted", bg: "bg-line/40" };
  }
}

export function formatDateShort(s) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

export function daysLeftLabel(days) {
  if (days === undefined || days === null) return "—";
  if (days < 0) return `${Math.abs(days)}d ago`;
  if (days === 0) return "today";
  return `${days}d left`;
}
