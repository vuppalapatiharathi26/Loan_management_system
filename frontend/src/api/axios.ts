import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8080", // FastAPI default
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔐 Attach JWT automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
