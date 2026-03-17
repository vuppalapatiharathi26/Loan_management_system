// ============================================
// ADMIN SERVICE (FINAL)
// ============================================

import apiClient from "./api.client";

// ============================================
// Types
// ============================================

export interface CreateManagerRequest {
  manager_id: string;
  name: string;
  role: "BANK_MANAGER" | "LOAN_MANAGER";
  password: string;
  phone: string;
}

export interface UpdateManagerRequest {
  name?: string;
  phone?: string;
  role?: "BANK_MANAGER" | "LOAN_MANAGER";
}

export interface AdminLoanDecision {
  decision: "APPROVE" | "REJECT";
  reason?: string;
}

export interface AdminNotificationItem {
  notification_id: string;
  type: string;
  message: string;
  loan_id?: string | null;
  user_id?: string | null;
  user_name?: string | null;
  manager_id?: string | null;
  manager_name?: string | null;
  reason?: string | null;
  is_read: boolean;
  created_at?: string | null;
}

// ============================================
// Admin Service
// ============================================

export const AdminService = {
  // ====================================
  // ADMIN SELF
  // ====================================
  async getProfile() {
    const response = await apiClient.get("/admin/me");
    return response.data;
  },

  // ====================================
  // MANAGER MANAGEMENT
  // ====================================
  async getManagers() {
    const response = await apiClient.get("/admin/managers");
    return response.data;
  },

  async createManager(data: CreateManagerRequest) {
    const response = await apiClient.post("/admin/managers", data);
    return response.data;
  },

  async updateManager(managerId: string, data: UpdateManagerRequest) {
    const response = await apiClient.put(
      `/admin/managers/${managerId}`,
      data
    );
    return response.data;
  },

  async disableManager(managerId: string) {
    const response = await apiClient.patch(
      `/admin/managers/${managerId}/disable`
    );
    return response.data;
  },

  async deleteManager(managerId: string) {
    const response = await apiClient.delete(
      `/admin/managers/${managerId}`
    );
    return response.data;
  },

  // ====================================
  // USER OVERSIGHT
  // ====================================
  async listUsers() {
    const response = await apiClient.get("/admin/users");
    return response.data;
  },

  async requestUserDeletion(
    userId: string,
    payload: { reason: string }
  ) {
    const response = await apiClient.post(
      `/admin/users/${userId}/delete-request`,
      payload
    );
    return response.data;
  },

  // ====================================
  // LOAN OVERSIGHT (ESCALATED)
  // ====================================
  async getEscalatedLoans() {
    const response = await apiClient.get("/admin/loans/escalated");
    return response.data;
  },

  async decideEscalatedLoan(
    loanId: string,
    decision: AdminLoanDecision
  ) {
    const response = await apiClient.post(
      `/admin/loans/${loanId}/decision`,
      decision
    );
    return response.data;
  },
  async getNotifications(params?: { unread_only?: boolean; active_only?: boolean; limit?: number }) {
    const response = await apiClient.get<AdminNotificationItem[]>("/admin/notifications", { params });
    return response.data;
  },
  async markAllNotificationsRead() {
    const response = await apiClient.patch("/admin/notifications/read-all");
    return response.data;
  },
  // ================================
  // LOANS (ADMIN)
  // ================================
  async listLoans() {
    const response = await apiClient.get("/admin/loans");
    return response.data;
  },
};





