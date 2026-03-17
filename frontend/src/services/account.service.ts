import apiClient from './api.client';
import type { Transaction } from '../types/transaction';

type BackendTx = {
  _id?: string;
  id?: string;
  user_id?: string;
  userId?: string;
  created_at?: string;
  amount?: number;
  type?: string;
  reference?: string;
  balance_after?: number;
  loan_id?: string;
  manager_id?: string;
};

type TxListResponse = { transactions: BackendTx[]; total?: number; skip?: number; limit?: number };

const isRecord = (v: unknown): v is Record<string, unknown> =>
  Boolean(v) && typeof v === "object" && !Array.isArray(v);

export const AccountService = {
  async getSecureBalance(digi_pin: string) {
    const res = await apiClient.post('/accounts/me/secure-balance', { digi_pin });
    return res.data; // { balance, account_number, ifsc_code, updated_at }
  },

  async getBalance() {
    const res = await apiClient.get('/accounts/me');
    return res.data; // { balance, account_number, ifsc_code, updated_at }
  },

  async getBankDetails() {
    const res = await apiClient.get('/accounts/me/bank-details');
    return res.data as { account_number?: string | null; ifsc_code?: string | null; updated_at?: string };
  },

  async getTransactions(limit = 50) {
    const res = await apiClient.get('/accounts/transactions', { params: { limit } });
    const data: unknown = res.data;
    const raw: BackendTx[] = Array.isArray(data)
      ? (data as BackendTx[])
      : isRecord(data) && Array.isArray((data as { transactions?: unknown }).transactions)
      ? (((data as { transactions: unknown }).transactions as unknown[]) as BackendTx[])
      : [];
    // map backend tx shape to frontend Transaction[]
    const txs = raw.map((t: BackendTx) => ({
      id: t._id || t.id,
      userId: t.user_id || t.userId,
      date: t.created_at,
      amount: t.amount,
      type: t.type,
      status: 'PAID', // backend does not have status; treat as PAID
      reference: t.reference,
      balanceAfter: t.balance_after,
      loanId: t.loan_id,
      managerId: t.manager_id,
    }));

    return txs as Transaction[];
  },

  async getTransactionsPaged(params: {
    page: number;
    pageSize: number;
    txType?: "CREDIT" | "DEBIT" | "ALL";
    dateFrom?: string; // YYYY-MM-DD
    dateTo?: string; // YYYY-MM-DD
  }) {
    const page = Math.max(1, Number(params.page || 1));
    const pageSize = Math.min(200, Math.max(1, Number(params.pageSize || 10)));
    const skip = (page - 1) * pageSize;

    const res = await apiClient.get('/accounts/transactions', {
      params: {
        limit: pageSize,
        skip,
        tx_type: params.txType && params.txType !== "ALL" ? params.txType : undefined,
        date_from: params.dateFrom || undefined,
        date_to: params.dateTo || undefined,
      }
    });

    const data: unknown = res.data;
    const obj: TxListResponse | null =
      isRecord(data) && Array.isArray((data as { transactions?: unknown }).transactions)
        ? (data as TxListResponse)
        : null;
    const raw: BackendTx[] = obj?.transactions || (Array.isArray(data) ? (data as BackendTx[]) : []);

    const txs = raw.map((t: BackendTx) => ({
      id: t._id || t.id,
      userId: t.user_id || t.userId,
      date: t.created_at,
      amount: t.amount,
      type: t.type,
      status: 'PAID',
      reference: t.reference,
      balanceAfter: t.balance_after,
      loanId: t.loan_id,
      managerId: t.manager_id,
    })) as Transaction[];

    const total = typeof obj?.total === "number" ? obj.total : txs.length;

    return { transactions: txs, total };
  },

  async credit(amount: number, digi_pin: string) {
    const res = await apiClient.post('/accounts/credit', { amount, digi_pin });
    return res.data;
  },

  async debit(amount: number, digi_pin: string) {
    const res = await apiClient.post('/accounts/debit', { amount, digi_pin });
    return res.data;
  }
};
