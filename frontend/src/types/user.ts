export type LoanStatus =
  | "APPROVED"
  | "REJECTED"
  | "PENDING"
  | "FINALIZED"
  | "CLOSED"
  | "NO_LOAN"
  | "ESCALATED";

export type AccountStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "DELETED";

export type KYCStatus = "PENDING" | "COMPLETED";


export interface User {
  // core identity
  userId: string;
  name: string;

  // account state (from backend)
  phone?: string;
  accountStatus?: AccountStatus;      // maps to approval_status
  kycStatus?: KYCStatus;              // COMPLETED is correct
  deletionRequestStatus?: "APPROVE" | "REJECT";
  deletionRequested?: boolean;
  createdAt?: string;
  isMinor?: boolean;
  has_digi_pin?: boolean;
  approvedByManagerId?: string;
  kycEditRequested?: boolean;
  kycEditRequestReason?: string;
  kycEditRequestedAt?: string;

  // KYC details (ONLY from /me/details)
  aadhaar?: string;                   // masked
  pan?: string;                       // masked
  dob?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  occupation?: string;

  address?: {
    line1: string;
    city: string;
    state: string;
    pincode: string;
  };

  nominee?: {
    name?: string;
    relation?: string;
  };

  guarantor?: {
    name?: string;
    relation?: string;
    contact_no?: string;
  };

  // ⚠️ Derived / frontend-only fields
  loanAmount?: number;
  loanStatus?: LoanStatus;
  cibilScore?: number;
  emiPaid?: number;
  emiTotal?: number;
  loanId?: string;
  nocStatus?: "NOT_REQUESTED" | "REQUESTED" | "REJECTED" | "PENDING" | "APPROVED" | null;
  nocReferenceNo?: string | null;
  nocApprovedAt?: string | null;
  nocGeneratedAt?: string | null;
  nocApprovedByName?: string | null;
}
