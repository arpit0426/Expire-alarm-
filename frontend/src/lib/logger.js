/**
 * Tiny logger wrapper.
 * - In development, forwards to console so devs see issues during local work.
 * - In production, is a no-op so no leaked diagnostics in the browser console.
 * Swap the implementation here to plug in Sentry / Datadog / LogRocket later.
 */
const isDev = process.env.NODE_ENV !== "production";

function emit(level, label, args) {
  if (!isDev) return;
  const fn = console[level] || console.log;
  fn(`[${label}]`, ...args);
}

export const logger = {
  debug: (...args) => emit("debug", "debug", args),
  info: (...args) => emit("info", "info", args),
  warn: (...args) => emit("warn", "warn", args),
  error: (...args) => emit("error", "error", args),
};
