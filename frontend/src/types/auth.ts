export type Role =
  | 'USER'
  | 'ADMIN'
  | 'LOAN_MANAGER'
  | 'BANK_MANAGER';

export interface AuthResponse {
  token: string;
  role: Role;
  userId: string;
}
