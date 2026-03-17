import apiClient from "../services/api.client";

export class LoanService {
  static async getActiveLoan() {
    const res = await apiClient.get("/loans/loans/loans/active");
    return res.data;
  }
}
