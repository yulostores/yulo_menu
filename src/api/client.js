import axios from "axios";

// This app is 100% unauthenticated — no login, no tokens, no refresh cookies. Unlike
// yulo_restaurant's api/client.js (multi-portal token + refresh machinery), a plain axios
// instance is all a guest-ordering app needs.

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

const client = axios.create({
  baseURL: `${API_BASE}/api`,
});

// Unwrap Axios error so callers get a plain Error with the API's own message — same
// envelope shape yulo_restaurant's api/client.js normalises (utils/ApiResponse.js /
// ApiError.js on the backend).
client.interceptors.response.use(
  (res) => res,
  (err) => {
    const message = err.response?.data?.message ?? err.message ?? "Request failed";
    const apiError = new Error(message);
    apiError.code = err.response?.data?.code;
    apiError.status = err.response?.status;
    apiError.details = err.response?.data?.details;
    return Promise.reject(apiError);
  },
);

export default client;
