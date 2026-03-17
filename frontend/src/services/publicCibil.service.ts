import apiClient from "./api.client";

export type HomepageCibilEstimateRequest = {
  fullName: string;
  phone: string;
  email: string;
  dob: string; // YYYY-MM-DD
  netIncome: number;
  employmentType: "government" | "private" | "startup" | "freelancer" | "selfEmployed";
  experienceYears: number;
  totalEmi: number;
  missedEmiLast12Months: number;
  hasDefaulted: boolean;
  hasSettledAccount: boolean;
  creditUtilization: number;
  residenceType: "owned" | "rented" | "parents";
  addressYears: number;
};

export type HomepageCibilEstimateResponse = {
  score: number;
  band: "Excellent" | "Good" | "Fair" | "Weak" | "High Risk";
  breakdown: {
    paymentPoints: number;
    utilPoints: number;
    incomePoints: number;
    dtiPoints: number;
    resPoints: number;
  };
};

export const PublicCibilService = {
  async estimate(payload: HomepageCibilEstimateRequest): Promise<HomepageCibilEstimateResponse> {
    const res = await apiClient.post("/public/cibil/estimate", payload);
    return res.data as HomepageCibilEstimateResponse;
  },
};

