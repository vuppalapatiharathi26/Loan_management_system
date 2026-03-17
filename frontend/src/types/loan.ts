export type LoanStatus =
  | "NONE"
  | "PENDING"
  | "ACTIVE"
  | "REJECTED"
  | "COMPLETED"
  | "OVERDUE";

export interface Loan {
  id: string;
  userId: string;
  amount: number;
  tenure: number;
  interestRate: number;
  status: LoanStatus;
  outstandingAmount: number;
  rejectedCount: number;
}

export interface LoanApplicationDTO {
  loan_id: string;
  user_id: string;
  user_name?: string | null;
  loan_amount: number;
  loan_type?: string;
  tenure_months?: number;
  interest_rate?: number | null;
  emi_preview?: number | null;
  cibil_score?: number | null;
  decision_reason?: string | null;
  active_loan_id?: string | null;
  applied_at?: string | null;
  escalated_at?: string | null;
  finalized_at?: string | null;
  disbursed?: boolean;
  disbursed_at?: string | null;
  income_slip_url?: string | null;
  noc_status?: "NOT_REQUESTED" | "REQUESTED" | "REJECTED" | "PENDING" | "APPROVED" | null;
  noc_requested_at?: string | null;
  noc_approved_at?: string | null;
  noc_generated_at?: string | null;
  noc_reference_no?: string | null;
  noc_approved_by_name?: string | null;
  noc_rejected_at?: string | null;
  noc_rejection_reason?: string | null;

  // existing fields
  loan_status: "PENDING" | "APPROVED" | "REJECTED" | "FINALIZED" | "CLOSED" | "ESCALATED";
  system_decision?: string;
  created_at?: string;
}


// ============================================
// Status Mapper
// ============================================

export const mapLoanStatus = (status: string): LoanStatus => {
  switch (status) {
    case "PENDING":
      return "PENDING";
    case "APPROVED":
      return "ACTIVE";
    case "REJECTED":
      return "REJECTED";
    case "FINALIZED":
      return "COMPLETED";
    default:
      return "NONE";
  }
};

// ============================================
// DTO → Domain Mapper
// ============================================

export const mapLoanApplicationToLoan = (
  dto: LoanApplicationDTO
): Loan => ({
  id: dto.loan_id,
  userId: dto.user_id,
  amount: dto.loan_amount,

  // backend doesn't provide these yet
  tenure: 0,
  interestRate: 0,
  outstandingAmount: dto.loan_amount,
  rejectedCount: 0,

  status: mapLoanStatus(dto.loan_status),
});


