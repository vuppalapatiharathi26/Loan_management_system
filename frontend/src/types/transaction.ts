export type TransactionStatus = "PAID" | "PENDING" | "FAILED";

export type TransactionType =
  | "CREDIT"
  | "DEBIT"
  | "EMI"
  | "FINE";

export interface Transaction {
  id: string;
  userId: string;
  date: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  reference?: string;
  loanId?: string;
  managerId?: string;
  balanceAfter?: number;
}
