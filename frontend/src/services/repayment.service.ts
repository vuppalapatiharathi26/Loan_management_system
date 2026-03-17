import apiClient from "./api.client";

export type RepaymentRow = {
  _id: string;
  emi_number: number;
  emi_amount: number;
  due_date: string;
  status: "PAID" | "PENDING";
  paid_at?: string;
};

export type RepaymentSummary = {
  loan_application_id: string;
  active_loan_id: string;
  loan_status: string;
  disbursed: boolean;
  total_emis: number;
  paid_emis: number;
  pending_emis: number;
  outstanding_amount: number;
  interest_due_now: number;
  emis: RepaymentRow[];
};

export type StripeIntentResponse = {
  payment_id: string;
  payment_intent_id: string;
  client_secret: string;
  amount: number;
  currency: string;
};

export const RepaymentService = {
  async getSummary(loanApplicationId: string): Promise<RepaymentSummary> {
    const res = await apiClient.get(`/repayments/summary/${loanApplicationId}`);
    return res.data;
  },

  async payEmi(loanApplicationId: string, digi_pin: string) {
    const res = await apiClient.post(`/repayments/loan/${loanApplicationId}/pay-emi`, { digi_pin });
    return res.data;
  },

  async payFull(loanApplicationId: string, digi_pin: string) {
    const res = await apiClient.post(`/repayments/loan/${loanApplicationId}/pay-full`, { digi_pin });
    return res.data;
  },

  async payInterestOnly(loanApplicationId: string, digi_pin: string) {
    const res = await apiClient.post(`/repayments/loan/${loanApplicationId}/pay-interest`, { digi_pin });
    return res.data;
  },

  async createStripeIntentForEmi(emiId: string): Promise<StripeIntentResponse> {
    const res = await apiClient.post(`/repayments/stripe/emi/${emiId}/intent`);
    return res.data;
  },

  async createStripeIntentForFull(loanApplicationId: string): Promise<StripeIntentResponse> {
    const res = await apiClient.post(`/repayments/stripe/loan/${loanApplicationId}/pay-full/intent`);
    return res.data;
  },

  async createStripeIntentForInterest(loanApplicationId: string): Promise<StripeIntentResponse> {
    const res = await apiClient.post(`/repayments/stripe/loan/${loanApplicationId}/pay-interest/intent`);
    return res.data;
  },

  async verifyStripePaymentIntent(payment_intent_id: string) {
    const res = await apiClient.post(`/repayments/stripe/verify`, { payment_intent_id });
    return res.data;
  }
};
