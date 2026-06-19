import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// All requests send the httpOnly session cookie.
export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      const onAuthPage = ["/login", "/register", "/"].includes(window.location.pathname);
      if (!onAuthPage) window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);
