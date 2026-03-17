import apiClient from "./api.client";

export type LoanDetailsResponse = {
  loan_id: string;
  loan_type?: string;
  loan_amount: number;
  tenure_months?: number | null;
  application_status?: string;
  system_decision?: string;
  interest_rate?: number | null;
  emi_amount?: number | null;
  disbursed?: boolean;
  disbursed_at?: string | null;
  applied_at?: string | null;
  active_loan_id?: string | null;
  active_loan_status?: string | null;
  closed_at?: string | null;
  repayments?: {
    total_emis: number;
    paid_emis: number;
    pending_emis: number;
    emi_remaining: number;
    outstanding_amount: number;
  };
  penalties?: Array<unknown>;
  penalties_total?: number;
  approved_by?: {
    id?: string;
    manager_id?: string;
    name?: string;
    phone?: string;
  } | null;
  noc?: {
    status?: "NOT_REQUESTED" | "REQUESTED" | "REJECTED" | "PENDING" | "APPROVED" | null;
    requested_at?: string | null;
    reference_no?: string | null;
    approved_at?: string | null;
    generated_at?: string | null;
    rejected_at?: string | null;
    rejection_reason?: string | null;
    can_request?: boolean;
    can_download?: boolean;
    approved_by?: {
      id?: string;
      manager_id?: string;
      name?: string;
      phone?: string;
    } | null;
  } | null;
};

export type LoanNocDetailsResponse = {
  loan_id: string;
  status: "NOT_REQUESTED" | "REQUESTED" | "REJECTED" | "PENDING" | "APPROVED";
  requested_at?: string | null;
  reference_no?: string | null;
  approved_at?: string | null;
  generated_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  can_request?: boolean;
  can_download: boolean;
  approved_by?: {
    id?: string;
    manager_id?: string;
    name?: string;
    phone?: string;
  } | null;
};

const tryGet = async (path: string) => {
  const res = await apiClient.get(path);
  return res.data;
};

const isNotFound = (err: unknown) => {
  const maybe = err as { response?: { status?: number } };
  return maybe?.response?.status === 404;
};

export const LoanDetailsService = {
  async getDetails(loanId: string): Promise<LoanDetailsResponse> {
    try {
      return (await tryGet(`/loans/${loanId}/details`)) as LoanDetailsResponse;
    } catch (e: unknown) {
      // keep compatibility with earlier accidental nested prefixes used elsewhere
      if (isNotFound(e)) {
        try {
          return (await tryGet(`/loans/loans/${loanId}/details`)) as LoanDetailsResponse;
        } catch (e2: unknown) {
          if (isNotFound(e2)) {
            return (await tryGet(`/loans/loans/loans/${loanId}/details`)) as LoanDetailsResponse;
          }
          throw e2;
        }
      }
      throw e;
    }
  },

  async getNocDetails(loanId: string): Promise<LoanNocDetailsResponse> {
    try {
      return (await tryGet(`/loans/${loanId}/noc`)) as LoanNocDetailsResponse;
    } catch (e: unknown) {
      if (isNotFound(e)) {
        try {
          return (await tryGet(`/loans/loans/${loanId}/noc`)) as LoanNocDetailsResponse;
        } catch (e2: unknown) {
          if (isNotFound(e2)) {
            return (await tryGet(`/loans/loans/loans/${loanId}/noc`)) as LoanNocDetailsResponse;
          }
          throw e2;
        }
      }
      throw e;
    }
  },

  async downloadNoc(loanId: string): Promise<Blob> {
    const downloadTry = async (path: string) => {
      const res = await apiClient.get(path, { responseType: "blob" });
      return res.data as Blob;
    };

    try {
      return await downloadTry(`/loans/${loanId}/noc/download`);
    } catch (e: unknown) {
      if (isNotFound(e)) {
        try {
          return await downloadTry(`/loans/loans/${loanId}/noc/download`);
        } catch (e2: unknown) {
          if (isNotFound(e2)) {
            return await downloadTry(`/loans/loans/loans/${loanId}/noc/download`);
          }
          throw e2;
        }
      }
      throw e;
    }
  },

  async requestNoc(loanId: string) {
    try {
      return (await apiClient.post(`/loans/${loanId}/noc/request`)).data;
    } catch (e: unknown) {
      if (isNotFound(e)) {
        try {
          return (await apiClient.post(`/loans/loans/${loanId}/noc/request`)).data;
        } catch (e2: unknown) {
          if (isNotFound(e2)) {
            return (await apiClient.post(`/loans/loans/loans/${loanId}/noc/request`)).data;
          }
          throw e2;
        }
      }
      throw e;
    }
  },
};
