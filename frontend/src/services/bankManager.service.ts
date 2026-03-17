
// ============================================
// BANK MANAGER SERVICE
// ============================================
import apiClient from './api.client';
 
// ============================================
// Types
// ============================================
export interface KYCDecision {
  approved: boolean;
  remarks?: string;
}
 
export interface UserDecision {
  approved: boolean;
  remarks?: string;
  account_number?: string;
  ifsc_code?: string;
}

export interface DeleteEscalationDecision {
  approved: boolean;
  reason?: string;
}

export interface ManagerProfile {
  manager_id: string;
  name: string;
  phone?: string;
  role?: string;
}

export interface AccountDetails {
  account_number: string;
  ifsc_code: string;
  generated_at?: string;
  generated_by?: string;
  state?: string;
}

export interface UserDocument {
  document_id: string;
  doc_type?: string;
  original_name?: string;
  content_type?: string;
  uploaded_at?: string | null;
  url?: string;
}

export interface BankUserSearchResult {
  user_id: string;
  name?: string;
  phone?: string;
  approval_status?: string;
  kyc_status?: string;
}
 
// ============================================
// Bank Manager Service
// ============================================
export const BankManagerService = {
  async getManagerProfile(): Promise<ManagerProfile> {
    const response = await apiClient.get("/manager/bank/me");
    return response.data;
  },

  // ====================================
  // USER MANAGEMENT
  // ====================================
  async listUsers(filters?: {
    approval_status?: string;
    kyc_status?: string;
    deletion_requested?: boolean;
  }) {
    const response = await apiClient.get('/manager/bank/users', {
      params: filters,
    });
    return response.data;
  },
 
  async getUserDetails(userId: string) {
    const response = await apiClient.get(`/manager/bank/users/${userId}`);
    return response.data;
  },
 
  // ====================================
  // KYC REVIEW
  // ====================================
  async reviewKYC(userId: string) {
    const response = await apiClient.get(
        `/manager/bank/users/${userId}/kyc`
    );
    return response.data;
    },

  async saveKycDraft(userId: string, payload: {
    aadhaar: string;
    pan: string;
    dob: string;
    gender: string;
    occupation: string;
    address: {
      line1: string;
      city: string;
      state: string;
      pincode: string;
    };
  }) {
    const response = await apiClient.patch(`/manager/bank/users/${userId}/kyc-draft`, payload);
    return response.data;
  },

  async searchUsersByName(query: string): Promise<BankUserSearchResult[]> {
    const response = await apiClient.get("/manager/bank/users/search", {
      params: { q: query },
    });
    const users = (response.data as any)?.users;
    return Array.isArray(users) ? (users as BankUserSearchResult[]) : [];
  },

  async generateAccountDetails(userId: string): Promise<AccountDetails> {
    const response = await apiClient.post(`/manager/bank/users/${userId}/account/generate`);
    return response.data as AccountDetails;
  },

  async listUserDocuments(userId: string, docType?: string): Promise<UserDocument[]> {
    const response = await apiClient.get(`/manager/bank/users/${userId}/documents`, {
      params: docType ? { doc_type: docType } : undefined,
    });
    const docs = (response.data as any)?.documents;
    return Array.isArray(docs) ? (docs as UserDocument[]) : [];
  },

  async fetchDocumentBlob(documentId: string) {
    const res = await apiClient.get(`/uploads/identity-docs/${documentId}`, {
      responseType: "blob",
    });
    return res.data as Blob;
  },

 
  // ====================================
  // USER APPROVAL
  // ====================================
  async approveOrRejectUser(userId: string, decision: UserDecision) {
  const payload = {
    decision: decision.approved ? "APPROVE" : "REJECT",
    reason: decision.remarks,
    account_number: decision.account_number,
    ifsc_code: decision.ifsc_code,
  };

  const response = await apiClient.post(
    `/manager/bank/users/${userId}/decision`,
    payload
  );
  return response.data;
},

 
  // ====================================
  // USER DELETION
  // ====================================
  async deleteUser(userId: string, reason: string) {
    const response = await apiClient.post(
        `/manager/bank/users/${userId}/delete`,
        { reason }
    );
    return response.data;
    },

  async handleDeleteEscalation(userId: string, payload: DeleteEscalationDecision) {
    const response = await apiClient.post(
      `/manager/bank/users/${userId}/delete/decision`,
      {
        decision: payload.approved ? "APPROVE" : "REJECT",
        reason: payload.reason,
      }
    );
    return response.data;
  },

  async clearKycEditRequest(userId: string) {
    const response = await apiClient.post(`/manager/bank/users/${userId}/kyc-edit/clear`);
    return response.data;
  },
 
}
