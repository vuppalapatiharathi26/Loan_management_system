// ============================================
// USER SERVICE
// ============================================
import apiClient from './api.client';
import type { User } from '../types/user';
 
// ============================================
// Types
// ============================================
export interface KYCSubmission {
  dob: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  occupation: string;
  aadhaar: string;
  pan: string;
  address: {
    line1: string;
    city: string;
    state: string;
    pincode: string;
  };
}
 
export interface LoanApplication {
  loan_type: 'PERSONAL' | 'HOME' | 'AUTO' | 'EDUCATION';
  loan_amount: number;
  tenure_months: number;
  reason: string;
  income_slip_url: string;
  monthly_income: number;
  occupation: string;
  pending_emis: number;
  previous_loans: number;
}

const mapUser = (data: any): User => ({
    userId: data.user_id,
    name: data.name,
    phone: data.phone,

    accountStatus: data.approval_status,
    kycStatus: data.kyc_status,
    createdAt: data.created_at,
    isMinor: data.is_minor,
    has_digi_pin: data.has_digi_pin,
    approvedByManagerId: data.approved_by_manager_id,
    kycEditRequested: data.kyc_edit_request?.requested,
    kycEditRequestReason: data.kyc_edit_request?.reason,
    kycEditRequestedAt: data.kyc_edit_request?.requested_at,

    aadhaar: data.kyc?.aadhaar,
    pan: data.kyc?.pan,
    dob: data.kyc?.dob,
    gender: data.kyc?.gender,
    occupation: data.kyc?.occupation,
    address: data.kyc?.address,
    nominee: data.kyc?.nominee,
    guarantor: data.kyc?.guarantor,
  });
 
// ============================================
// User Service
// ============================================
export const UserService = {
  // ====================================
  // USER PROFILE
  // ====================================
  async getProfile(): Promise<User> {
    const response = await apiClient.get('/users/me');
    const data = response.data || {};
    return {
      userId: data.user_id || data._id,
      name: data.name,
      phone: data.phone,
      kycStatus: data.kyc_status,
      accountStatus: data.approval_status,
      createdAt: data.created_at,
      isMinor: data.is_minor,
      has_digi_pin: data.has_digi_pin,
      approvedByManagerId: data.approved_by_manager_id,
    };
  },

  // ====================================
  // KYC
  // ====================================
  async submitKYC(data: KYCSubmission) {
    const response = await apiClient.post('/users/me/kyc', data);
    return response.data;
  },

  // ====================================
  // DIGI PIN
  // ====================================
  async setDigiPin(aadhaar: string, digi_pin: string) {
    return (
      await apiClient.post("/users/me/digi-pin", { aadhaar, digi_pin })
    ).data;
  },

  // ====================================
  // FULL DETAILS
  // ====================================
  async getMyFullDetails(): Promise<User> {
    const res = await apiClient.get("/users/me/details");
    return mapUser(res.data);
  },
 
  // ====================================
  // PROFILE UPDATE
  // ====================================
  async updateProfile(data: any) {
    const res = await apiClient.put('/users/me/profile-update', data);
    return res.data;
  },

  // ====================================
  // REQUEST KYC EDIT
  // ====================================
  async requestKycEdit(reason: string) {
    const res = await apiClient.post('/users/me/kyc-edit-request', { reason });
    return res.data;
  },

  // ====================================
  // ACCOUNT DETAILS
  // ====================================
  async getAccountDetails() {
    const res = await apiClient.get('/users/me/account');
    return res.data;
  },

  // ====================================
  // MY DOCUMENTS
  // ====================================
  async getMyDocuments() {
    const res = await apiClient.get('/users/me/documents');
    return (res.data as any)?.documents || [];
  },

  async fetchDocumentBlob(documentId: string): Promise<Blob> {
    const res = await apiClient.get(`/uploads/identity-docs/${documentId}`, {
      responseType: "blob",
    });
    return res.data as Blob;
  },

  // ====================================
  // LOAN PREVIEW
  // ====================================
  async previewLoan(data: any) {
    try {
      const res = await apiClient.post('/loans/preview', data);
      return res.data;
    } catch (e: any) {
      if (e?.response?.status === 404) {
        try {
          const fallback = await apiClient.post('/loans/loans/preview', data);
          return fallback.data;
        } catch (fallbackErr: any) {
          if (fallbackErr?.response?.status === 404) {
            const fallback2 = await apiClient.post('/loans/loans/loans/preview', data);
            return fallback2.data;
          }
          throw fallbackErr;
        }
      }
      throw e;
    }
  },
 
  // ====================================
  // LOAN APPLICATION
  // ====================================
  async applyForLoan(data: LoanApplication, idempotencyKey: string) {
    try {
      const response = await apiClient.post('/loans', data, {
        headers: {
          'Idempotency-Key': idempotencyKey
        }
      });
      return response.data;
    } catch (e: any) {
      if (e?.response?.status === 404) {
        try {
          const fallback = await apiClient.post('/loans/loans', data, {
            headers: {
              'Idempotency-Key': idempotencyKey
            }
          });
          return fallback.data;
        } catch (fallbackErr: any) {
          if (fallbackErr?.response?.status === 404) {
            const fallback2 = await apiClient.post('/loans/loans/loans', data, {
              headers: {
                'Idempotency-Key': idempotencyKey
              }
            });
            return fallback2.data;
          }
          throw fallbackErr;
        }
      }
      throw e;
    }
  },

  async getLoan() {
    try {
      const res = await apiClient.get('/loans');
      return res.data; // list of loans
    } catch (e: any) {
      if (e?.response?.status === 404) {
        try {
          const fallback = await apiClient.get('/loans/loans');
          return fallback.data;
        } catch (fallbackErr: any) {
          if (fallbackErr?.response?.status === 404) {
            const fallback2 = await apiClient.get('/loans/loans/loans');
            return fallback2.data;
          }
          throw fallbackErr;
        }
      }
      return null;
    }
  }


};
