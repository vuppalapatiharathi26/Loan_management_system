import apiClient from "./api.client";

export interface Transaction {
  _id: string;
  type: string;         // CREDIT / DEBIT
  amount: number;
  description?: string;
  created_at: string;
  balance_after?: number;
}

export interface TransactionResponse {
  transactions: Transaction[];
  total: number;
  skip: number;
  limit: number;
}

export interface UserDetail {
  user_id: string;
  name: string;
  phone?: string;
  email?: string;
  approval_status?: string;
  kyc_status?: string;
  created_at?: string;
}

export interface AccountDetails {
  account_number?: string;
  ifsc_code?: string;
  generated_at?: string;
  generated_by?: string;
}

export interface UserDocument {
  document_id: string;
  doc_type?: string;
  original_name?: string;
  content_type?: string;
  uploaded_at?: string | null;
  url?: string;
}

export interface AdminLoanNoc {
  loan_id: string;
  status: "PENDING" | "APPROVED";
  reference_no?: string | null;
  approved_at?: string | null;
  generated_at?: string | null;
  approved_by_name?: string | null;
  can_view: boolean;
}

export const AdminUserService = {
  async getUserTransactions(
    userId: string,
    skip: number,
    limit: number
  ): Promise<TransactionResponse> {
    const response = await apiClient.get(
      `/admin/users/${userId}/transactions`,
      {
        params: { skip, limit },
      }
    );

    return response.data;
  },

  async getUserDetails(userId: string): Promise<UserDetail> {
    const response = await apiClient.get(`/admin/users/${userId}`);
    return response.data;
  },

  async getUserAccount(userId: string): Promise<AccountDetails> {
    const response = await apiClient.get(`/admin/users/${userId}/account`);
    return response.data;
  },

  async getUserDocuments(userId: string): Promise<UserDocument[]> {
    const response = await apiClient.get(`/admin/users/${userId}/documents`);
    const docs = (response.data as any)?.documents;
    return Array.isArray(docs) ? (docs as UserDocument[]) : [];
  },

  async fetchDocumentBlob(documentId: string): Promise<Blob> {
    const res = await apiClient.get(`/uploads/identity-docs/${documentId}`, {
      responseType: "blob",
    });
    return res.data as Blob;
  },

  async getLoanNoc(loanId: string): Promise<AdminLoanNoc> {
    const response = await apiClient.get(`/admin/loans/${loanId}/noc`);
    return response.data as AdminLoanNoc;
  },

  async downloadLoanNoc(loanId: string): Promise<Blob> {
    const res = await apiClient.get(`/admin/loans/${loanId}/noc/download`, {
      responseType: "blob",
    });
    return res.data as Blob;
  },
};
