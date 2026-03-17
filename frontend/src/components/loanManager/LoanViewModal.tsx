import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useToast } from "../../context/ToastContext";
import type { LoanApplicationDTO } from "../../types/loan";
import { LoanManagerService } from "../../services/loanManager.service";
import DocumentViewerModal from "./DocumentViewerModal";

interface Props {
  loan: LoanApplicationDTO;
  onClose: () => void;
  onSaved?: () => void;
  // context controls which actions are shown:
  // 'dashboard' => full actions (default)
  // 'history' => view-only (no action buttons)
  // 'escalated' => only finalize (and only if admin accepted)
  context?: "dashboard" | "history" | "escalated";
}

const LoanViewModal: React.FC<Props> = ({ loan, onClose, onSaved, context = "dashboard" }) => {
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [finalInterest, setFinalInterest] = useState<number | "">(loan.interest_rate ?? "");
  const [finalTenure, setFinalTenure] = useState<number | "">(loan.tenure_months ?? "");
  const [viewingDocument, setViewingDocument] = useState(false);
  const [nocPreviewUrl, setNocPreviewUrl] = useState<string | null>(null);

  const isEscalated = (loan as any).escalated ?? false;
  const status = (loan as any).loan_status ?? loan.loan_status ?? null;
  const systemDecision = loan.system_decision ?? null;

  // Determine button states based on system_decision
  let canApprove = false;
  let canReject = false;
  let canEscalate = false;
  let canFinalize = false;
  let canApproveNoc = false;
  let canRejectNoc = false;
  let actionMessage = "";

  if (systemDecision === "AUTO_APPROVED") {
    // Auto-approved: first confirm approval, then finalize
    if (status === "PENDING") {
      canApprove = true; // Show Confirm Auto Approval button
    } else if (status === "APPROVED") {
      canFinalize = true;
    }
  } else if (systemDecision === "AUTO_REJECTED") {
    // Auto-rejected: no actions allowed
    actionMessage = "This loan was auto-rejected and cannot be modified.";
  } else if (systemDecision === "MANUAL_REVIEW") {
    // Manual review: check based on status
    if (isEscalated) {
      // Escalated: only finalize allowed
      canFinalize = status === "APPROVED";
    } else if (status === "PENDING") {
      // Pending: can approve, reject, or escalate
      canApprove = true;
      canReject = true;
      canEscalate = true;
    } else if (status === "APPROVED") {
      // Approved: only finalize allowed
      canFinalize = true;
    } else if (status === "REJECTED") {
      // Rejected: no actions allowed
      actionMessage = "This loan has been rejected and cannot be modified.";
    }
  }

  if (status === "CLOSED" && ["REQUESTED", "PENDING"].includes(String(loan.noc_status || ""))) {
    canApproveNoc = true;
    canRejectNoc = true;
  }

  const showAnyActions = context === "dashboard";
  const showFinalizeOnlyInEscalated = context === "escalated" && isEscalated;

  const doApprove = async () => {
    setSubmitting(true);
    setActionError(null);
    try {
      if (systemDecision === "AUTO_APPROVED") {
        // For AUTO_APPROVED, call confirmAutoDecision
        await LoanManagerService.confirmAutoDecision(loan.loan_id, { system_decision: "AUTO_APPROVED" });
        toast.push({ type: 'success', message: 'Loan auto-approved confirmed' });
      } else {
        // For MANUAL_REVIEW, call makeManualDecision
        await LoanManagerService.makeManualDecision(loan.loan_id, { decision: "APPROVE" });
        toast.push({ type: 'success', message: 'Loan approved' });
      }
      onSaved && onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      setActionError(err?.response?.data?.detail || "Failed to approve");
    } finally {
      setSubmitting(false);
    }
  };

  const doReject = async () => {
    setActionError(null);
    if (!reason.trim()) {
      setActionError("Reject reason is required");
      return;
    }
    setSubmitting(true);
    try {
      await LoanManagerService.makeManualDecision(loan.loan_id, { decision: "REJECT", reason: reason.trim() });
      toast.push({ type: 'success', message: 'Loan rejected' });
      onSaved && onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      setActionError(err?.response?.data?.detail || "Failed to reject");
    } finally {
      setSubmitting(false);
    }
  };

  const doEscalate = async () => {
    setActionError(null);
    if (!reason) {
      setActionError("Please provide a reason to escalate");
      return;
    }
    setSubmitting(true);
    try {
      await LoanManagerService.escalateLoan(loan.loan_id, { reason: reason.trim() });
      toast.push({ type: 'success', message: 'Loan escalated' });
      onSaved && onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      setActionError(err?.response?.data?.detail || "Failed to escalate");
    } finally {
      setSubmitting(false);
    }
  };

  const doFinalize = async () => {
    if (finalInterest === "" || finalTenure === "") {
      setActionError("Please enter interest rate and tenure");
      return;
    }
    setSubmitting(true);
    setActionError(null);
    try {
      await LoanManagerService.finalizeLoan(loan.loan_id, { interest_rate: Number(finalInterest), tenure_months: Number(finalTenure) });
      toast.push({ type: 'success', message: 'Loan finalized' });
      onSaved && onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      setActionError(err?.response?.data?.detail || "Failed to finalize");
    } finally {
      setSubmitting(false);
    }
  };

  const doApproveNoc = async () => {
    setSubmitting(true);
    setActionError(null);
    try {
      await LoanManagerService.approveNoc(loan.loan_id);
      toast.push({ type: 'success', message: 'NOC approved successfully' });
      onSaved && onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      setActionError(err?.response?.data?.detail || "Failed to approve NOC");
    } finally {
      setSubmitting(false);
    }
  };

  const doRejectNoc = async () => {
    const cleanReason = reason.trim();
    if (cleanReason.length < 5) {
      setActionError("NOC rejection reason must be at least 5 characters");
      return;
    }
    setSubmitting(true);
    setActionError(null);
    try {
      await LoanManagerService.rejectNoc(loan.loan_id, cleanReason);
      toast.push({ type: 'success', message: 'NOC rejected successfully' });
      onSaved && onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      setActionError(err?.response?.data?.detail || "Failed to reject NOC");
    } finally {
      setSubmitting(false);
    }
  };

  const viewNoc = async () => {
    setSubmitting(true);
    setActionError(null);
    try {
      const blob = await LoanManagerService.downloadNoc(loan.loan_id);
      const url = URL.createObjectURL(blob);
      setNocPreviewUrl(url);
    } catch (err: any) {
      setActionError(err?.response?.data?.detail || "Failed to open NOC");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (nocPreviewUrl) {
        URL.revokeObjectURL(nocPreviewUrl);
      }
    };
  }, [nocPreviewUrl]);

  const toast = useToast();

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-black/30 p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative z-[11001] flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="text-lg font-bold text-gray-900">Loan Details</h3>
          <button className="rounded border px-3 py-1.5 hover:bg-gray-50" onClick={onClose}>Close</button>
        </div>
        <div className="min-h-0 overflow-y-auto p-5 space-y-4 md:p-6">
        <div className="text-xs text-gray-500 break-all">{loan.loan_id}</div>

        <div className="mb-4 grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
          <div><strong>User:</strong> {loan.user_name ?? loan.user_id}</div>
          <div><strong>Loan Type:</strong> {loan.loan_type ?? "-"}</div>
          <div><strong>Amount:</strong> {loan.loan_amount}</div>
          <div><strong>Tenure (months):</strong> {loan.tenure_months ?? "-"}</div>
          <div><strong>Interest Rate:</strong> {loan.interest_rate ?? "-"}%</div>
          <div><strong>EMI (est):</strong> {loan.emi_preview ?? "-"}</div>
          <div><strong>CIBIL Score:</strong> {loan.cibil_score ?? "-"}</div>
          <div><strong>System Decision:</strong> {loan.system_decision ?? "-"}</div>
          <div><strong>Status:</strong> {loan.loan_status ?? "-"}</div>
          <div><strong>Active Loan ID:</strong> {loan.active_loan_id ?? "-"}</div>
          <div><strong>Applied At:</strong> {loan.applied_at ?? loan.created_at ?? "-"}</div>
          <div><strong>Decision Reason:</strong> {loan.decision_reason ?? "-"}</div>
          <div><strong>Escalated At:</strong> {(loan as any).escalated_at ?? "-"}</div>
          <div><strong>Finalized At:</strong> {loan.finalized_at ?? "-"}</div>
          <div><strong>Disbursed:</strong> {loan.disbursed ? `Yes (${loan.disbursed_at ?? "-"})` : "No"}</div>
          <div><strong>NOC Status:</strong> {loan.noc_status ?? "-"}</div>
          <div><strong>NOC Requested At:</strong> {(loan as any).noc_requested_at ?? "-"}</div>
          <div><strong>NOC Reference:</strong> {loan.noc_reference_no ?? "-"}</div>
          <div><strong>NOC Approved By:</strong> {loan.noc_approved_by_name ?? "-"}</div>
          <div><strong>NOC Approved At:</strong> {loan.noc_approved_at ?? "-"}</div>
          <div><strong>NOC Rejected At:</strong> {(loan as any).noc_rejected_at ?? "-"}</div>
          <div><strong>NOC Rejection Reason:</strong> {(loan as any).noc_rejection_reason ?? "-"}</div>
        </div>

        {["REQUESTED", "PENDING"].includes(String(loan.noc_status || "")) && (
          <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            User has requested NOC. Please approve or reject with a valid reason.
          </div>
        )}

        {loan.income_slip_url && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-gray-700 mb-2"><strong>Income Slip Document:</strong></p>
            <button
              onClick={() => setViewingDocument(true)}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition"
            >
              View Document
            </button>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Reason (for Reject / Escalate / NOC Reject)</label>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="w-full border rounded p-2" rows={3} />
          {actionError && <div className="mt-2 text-sm text-red-600">{actionError}</div>}
          {actionMessage && <div className="mt-2 text-sm text-red-600">{actionMessage}</div>}
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-1">Finalize — Interest Rate (%)</label>
            <input type="number" value={finalInterest as any} onChange={(e) => setFinalInterest(e.target.value === "" ? "" : Number(e.target.value))} className="w-full border rounded p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Finalize — Tenure (months)</label>
            <input type="number" value={finalTenure as any} onChange={(e) => setFinalTenure(e.target.value === "" ? "" : Number(e.target.value))} className="w-full border rounded p-2" />
          </div>
        </div>

        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 px-5 py-4">
          {showAnyActions && (
            <>
              {canApprove && (
                <button className="rounded bg-green-600 px-3 py-1 text-white" onClick={doApprove} disabled={submitting}>
                  {systemDecision === "AUTO_APPROVED" ? "Confirm Auto Approval" : "Approve"}
                </button>
              )}
              {canReject && (
                <button className="rounded bg-red-600 px-3 py-1 text-white" onClick={doReject} disabled={submitting}>Reject</button>
              )}
              {canEscalate && (
                <button className="rounded bg-yellow-500 px-3 py-1 text-white" onClick={doEscalate} disabled={submitting}>Escalate</button>
              )}
              {canFinalize && (
                <button className="rounded border border-green-600 bg-white px-3 py-1 text-green-700" onClick={doFinalize} disabled={submitting}>Finalize</button>
              )}
              {canApproveNoc && (
                <button className="rounded bg-indigo-600 px-3 py-1 text-white" onClick={doApproveNoc} disabled={submitting}>
                  Approve NOC
                </button>
              )}
              {canRejectNoc && (
                <button className="rounded bg-rose-600 px-3 py-1 text-white" onClick={doRejectNoc} disabled={submitting}>
                  Reject NOC
                </button>
              )}
              {loan.noc_status === "APPROVED" && (
                <button className="rounded border border-indigo-600 bg-white px-3 py-1 text-indigo-700" onClick={viewNoc} disabled={submitting}>
                  View NOC
                </button>
              )}
            </>
          )}

          {showFinalizeOnlyInEscalated && (
            <button className="rounded border border-green-600 bg-white px-3 py-1 text-green-700" onClick={doFinalize} disabled={submitting || !canFinalize}>Finalize</button>
          )}
        </div>
      </div>

      {viewingDocument && loan.income_slip_url && (
        <DocumentViewerModal
          documentUrl={loan.income_slip_url}
          documentName="Income Slip"
          onClose={() => setViewingDocument(false)}
        />
      )}

      {nocPreviewUrl && (
        <div className="fixed inset-0 z-[12000] overflow-y-auto">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => {
              URL.revokeObjectURL(nocPreviewUrl);
              setNocPreviewUrl(null);
            }}
          />
          <div className="relative z-[12001] mx-auto my-4 w-[95vw] max-w-6xl px-2">
            <div className="flex h-[92vh] flex-col overflow-hidden rounded bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b p-4">
              <h3 className="text-lg font-semibold">NOC Preview</h3>
              <button
                type="button"
                className="px-3 py-1 rounded border"
                onClick={() => {
                  URL.revokeObjectURL(nocPreviewUrl);
                  setNocPreviewUrl(null);
                }}
              >
                Close
              </button>
              </div>
              <div className="flex-1 bg-gray-100">
                <iframe src={nocPreviewUrl} title="NOC Preview" className="h-full w-full border-0" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default LoanViewModal;
