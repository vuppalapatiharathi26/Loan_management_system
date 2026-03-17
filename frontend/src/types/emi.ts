export interface EMI {
  emiNumber: number;
  dueDate: string;
  amount: number;
  status: "PAID" | "PENDING";
  penalty?: number;
}
