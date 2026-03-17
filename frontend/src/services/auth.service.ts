// ============================================
// AUTHENTICATION SERVICE (FINAL)
// Backend: FastAPI + JWT Bearer
// ============================================

import apiClient, { TokenManager } from "./api.client";

// ============================================
// Types
// ============================================

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface RegisterUserData {
  first_name: string;
  last_name: string;
  phone: string;
  password: string;
  aadhaar: string;
}

// ============================================
// Authentication Service
// ============================================

export const AuthService = {
  // ====================================
  // USER AUTH (JSON BODY – NOT OAuth2)
  // ====================================

  async registerUser(data: RegisterUserData): Promise<void> {
    await apiClient.post("/auth/user/register", data);
  },

  async loginUser(aadhaar: string, password: string): Promise<string> {
    const response = await apiClient.post<AuthResponse>(
      "/auth/user/login",
      {
        aadhaar,
        password,
      }
    );

    const token = response.data.access_token;
    TokenManager.setToken(token);
    return token;
  },

  // ====================================
  // ADMIN AUTH (OAuth2PasswordRequestForm)
  // ====================================

  async loginAdmin(username: string, password: string): Promise<string> {
    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);

    const response = await apiClient.post<AuthResponse>(
      "/auth/admin/login",
      formData,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const token = response.data.access_token;
    TokenManager.setToken(token);
    return token;
  },

  // ====================================
  // MANAGER AUTH (OAuth2PasswordRequestForm)
  // BANK_MANAGER / LOAN_MANAGER
  // ====================================

  async loginManager(managerId: string, password: string): Promise<string> {
    const formData = new URLSearchParams();
    formData.append("username", managerId);
    formData.append("password", password);

    const response = await apiClient.post<AuthResponse>(
      "/auth/manager/login",
      formData,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const token = response.data.access_token;
    TokenManager.setToken(token);
    return token;
  },

  // ====================================
  // AUTH STATE
  // ====================================

  logout(): void {
    TokenManager.removeToken();
  },

  isAuthenticated(): boolean {
    return !!TokenManager.getToken() && !TokenManager.isTokenExpired();
  },

  getRole(): string | null {
    return TokenManager.getUserRole();
  },

  getUserId(): string | null {
    return TokenManager.getUserId();
  },
};
