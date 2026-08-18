import axios from "axios";

// Set NEXT_PUBLIC_API_URL in .env.local for local dev (e.g. http://127.0.0.1:8000)
// and as a Vercel environment variable pointing at your live Render URL for production.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("dsms_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// NEW: handle expired/invalid tokens globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("dsms_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;