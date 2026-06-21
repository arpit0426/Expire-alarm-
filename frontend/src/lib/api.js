import axios from "axios";

/**
 * Base URL strategy:
 *   – Prefer same-origin (window.location.origin + "/api") so cookie-based auth
 *     ALWAYS attaches naturally, regardless of which preview/canonical URL the
 *     user lands on.
 *   – Fall back to REACT_APP_BACKEND_URL only when running outside a browser
 *     (SSR / unit tests).
 */
const SAME_ORIGIN_API =
  typeof window !== "undefined" ? `${window.location.origin}/api` : null;
const ENV_API = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : null;

export const API = SAME_ORIGIN_API || ENV_API;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      const onAuthPage = ["/login", "/register", "/"].includes(
        window.location.pathname,
      );
      if (!onAuthPage) window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);
