import apiClient from "./api.client";

export type LoanPreviewRequest = {
  loan_amount: number;
  tenure_months: number;
  monthly_income: number;
  occupation: string;
  income_slip_url: string;
  pending_emis: number;
  previous_loans: number;
};

export type LoanPreviewResponse = {
  emi: number;
  interest_rate: number;
  system_decision: "AUTO_APPROVED" | "AUTO_REJECTED" | "MANUAL_REVIEW";
  cibil_score: number;
  eligible_min_amount: number;
  eligible_max_amount: number;
};

export const LoanPreviewService = {
  async preview(data: LoanPreviewRequest): Promise<LoanPreviewResponse> {
    try {
      const res = await apiClient.post("/loans/preview", data);
      return res.data;
    } catch (e: any) {
      if (e?.response?.status === 404) {
        try {
          const fallback = await apiClient.post("/loans/loans/preview", data);
          return fallback.data;
        } catch (fallbackErr: any) {
          if (fallbackErr?.response?.status === 404) {
            const fallback2 = await apiClient.post("/loans/loans/loans/preview", data);
            return fallback2.data;
          }
          throw fallbackErr;
        }
      }
      throw e;
    }
  },
};
