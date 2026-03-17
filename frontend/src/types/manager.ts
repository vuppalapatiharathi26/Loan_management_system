export type ManagerStatus = "ACTIVE" | "DISABLED" | "PENDING";
export type ManagerRole = "BANK_MANAGER" | "LOAN_MANAGER";

export interface Manager {
  _id: string; 
  manager_id: string;
  name: string;
  phone: string;
  role: ManagerRole;
  status: ManagerStatus;
  created_at: string;
}

export interface CreateManagerPayload {
  manager_id: string;
  name: string;
  phone: string;
  role: ManagerRole;
  password: string;
}

