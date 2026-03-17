// ============================================
// API CLIENT - Centralized HTTP Client
// ============================================
import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';

 
// ============================================
// Configuration
// ============================================
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';
 
// ============================================
// Token Management
// ============================================
export const TokenManager = {
  getToken: (): string | null => {
    return localStorage.getItem('access_token');
  },
 
  setToken: (token: string): void => {
    localStorage.setItem('access_token', token);
  },
 
  removeToken: (): void => {
    localStorage.removeItem('access_token');
  },
 
  decodeToken: (token: string): any => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  },
 
  getUserRole: (): string | null => {
    const token = TokenManager.getToken();
    if (!token) return null;
    const decoded = TokenManager.decodeToken(token);
    return decoded?.role || null;
  },
 
  getUserId: (): string | null => {
    const token = TokenManager.getToken();
    if (!token) return null;
    const decoded = TokenManager.decodeToken(token);
    return decoded?.sub || null;
  },
 
  isTokenExpired: (): boolean => {
    const token = TokenManager.getToken();
    if (!token) return true;
 
    const decoded = TokenManager.decodeToken(token);
    if (!decoded?.exp) return true;
 
    return Date.now() >= decoded.exp * 1000;
  }
};
 
// ============================================
// Axios Instance
// ============================================
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  withCredentials: true,
});
 
// ============================================
// Request Interceptor - Attach JWT Token
// ============================================
apiClient.interceptors.request.use(
  (config) => {
    const token = TokenManager.getToken();
    if (token && !TokenManager.isTokenExpired()) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

 
// ============================================
// Response Interceptor - Handle 401/403
// ============================================
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      TokenManager.removeToken();
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      // Forbidden - access denied
      console.error('Access denied:', error.response.data);
    }
 
    return Promise.reject(error);
  }
);
 
// ============================================
// Export
// ============================================
export default apiClient;