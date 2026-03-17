// ============================================

// LOAN MANAGER SERVICE

// ============================================

import apiClient from './api.client';
import type { LoanApplicationDTO } from "../types/loan";
 
// ============================================

// Types

// ============================================

export interface ManualLoanDecision {
  decision: 'APPROVE' | 'REJECT';
  reason?: string;
}

 
export interface AutoDecisionConfirmation {
  system_decision: 'AUTO_APPROVED' | 'AUTO_REJECTED';
}

 
export interface EscalationRequest {

  reason: string;

}
 
export interface LoanFinalization {
  interest_rate: number;
  tenure_months: number;
}

 
// ============================================

// Loan Manager Service

// ============================================

export const LoanManagerService = {

  // ====================================
  // LOAN APPLICATIONS

  // ====================================

  async listApplications(
    filters?: {
      status?: string;
      system_decision?: string;
    }
  ): Promise<LoanApplicationDTO[]> {
    const response = await apiClient.get<LoanApplicationDTO[]>(
      "/manager/loan/applications",
      {
        params: filters,
      }
    );

    return response.data;
  },
  async listEscalated(): Promise<LoanApplicationDTO[]> {
    const response = await apiClient.get<LoanApplicationDTO[]>(
      "/manager/loan/applications/escalated"
    );

    return response.data;
  },

  async listFinalized(): Promise<LoanApplicationDTO[]> {
    const response = await apiClient.get<LoanApplicationDTO[]>(
      "/manager/loan/applications/finalized"
    );

    return response.data;
  },
 
  // ====================================
  // MANUAL DECISION

  // ====================================
  async makeManualDecision(loanId: string, decision: ManualLoanDecision) {
    const idempotencyKey =
      (crypto as any).randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const response = await apiClient.post(
      `/manager/loan/applications/${loanId}/decision`,
      decision,
      { headers: { 'Idempotency-Key': idempotencyKey } }
    );

    return response.data;
  },
 
  // ====================================
  // AUTO DECISION CONFIRMATION

  // ====================================
  async confirmAutoDecision(loanId: string, confirmation: AutoDecisionConfirmation) {

    const response = await apiClient.post(
      `/manager/loan/applications/${loanId}/auto-decision`,
      confirmation
    );

    return response.data;

  },
 
  // ====================================
  // ESCALATION

  // ====================================
  async escalateLoan(loanId: string, escalation: EscalationRequest) {
    const idempotencyKey =
      (crypto as any).randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const response = await apiClient.post(
      `/manager/loan/applications/${loanId}/escalate`,
      escalation,
      { headers: { 'Idempotency-Key': idempotencyKey } }
    );

    return response.data;

  },
 
  // ====================================
  // LOAN FINALIZATION

  // ====================================
  async finalizeLoan(loanId: string, finalization: LoanFinalization) {
    const idempotencyKey =
      (crypto as any).randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const response = await apiClient.post(
      `/manager/loan/applications/${loanId}/finalize`,
      finalization,
      { headers: { 'Idempotency-Key': idempotencyKey } }
    );

    return response.data;

  },

  async approveNoc(loanId: string) {
    const response = await apiClient.post(
      `/manager/loan/applications/${loanId}/noc/approve`
    );
    return response.data;
  },

  async rejectNoc(loanId: string, reason: string) {
    const response = await apiClient.post(
      `/manager/loan/applications/${loanId}/noc/reject`,
      { reason }
    );
    return response.data;
  },

  async downloadNoc(loanId: string): Promise<Blob> {
    const response = await apiClient.get(
      `/manager/loan/applications/${loanId}/noc/download`,
      { responseType: "blob" }
    );
    return response.data as Blob;
  },

};
