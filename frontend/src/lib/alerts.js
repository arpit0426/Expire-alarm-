/**
 * Format a remaining-time string from the backend "tier_label" or
 * "remaining" field into a compact display.
 */
export function formatRemaining(remaining) {
  if (!remaining) return "—";
  return String(remaining).replace("h left", " hours").replace("d left", " days");
}

/**
 * Friendly description per tier key.
 */
export const TIER_META = {
  expired: { label: "Expired", icon: "⚠", bg: "bg-status-expiredBg", text: "text-status-expired" },
  tier_3h: { label: "3 hours", icon: "🔥", bg: "bg-status-criticalBg", text: "text-status-critical" },
  tier_6h: { label: "6 hours", icon: "🔥", bg: "bg-status-criticalBg", text: "text-status-critical" },
  tier_24h: { label: "24 hours", icon: "⏰", bg: "bg-status-criticalBg", text: "text-status-critical" },
  tier_3d: { label: "3 days", icon: "🛒", bg: "bg-status-nearBg", text: "text-status-near" },
  tier_1w: { label: "1 week", icon: "🏷️", bg: "bg-status-nearBg", text: "text-status-near" },
  tier_1m: { label: "1 month", icon: "📅", bg: "bg-brand-primarySoft", text: "text-brand-primary" },
};
