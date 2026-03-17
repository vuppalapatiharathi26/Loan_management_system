import React, { useState } from "react";
import type { LoanApplicationDTO } from "../../types/loan";

interface Props {
  loan: LoanApplicationDTO;
  onClose: () => void;
  onSubmit: (decision: "APPROVE" | "REJECT", reason?: string) => Promise<void>;
}

const LoanDecisionModal: React.FC<Props> = ({ loan, onClose, onSubmit }) => {
  const [decision, setDecision] = useState<"APPROVE" | "REJECT">("APPROVE");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(decision, reason || undefined);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black opacity-30" onClick={onClose} />
      <form
        className="bg-white rounded shadow-lg max-w-lg w-full p-6 z-10"
        onSubmit={handleSubmit}
      >
        <h3 className="text-lg font-bold mb-3">Decision — {loan.loan_id}</h3>

        <div className="mb-3 text-sm text-gray-700">
          <div><strong>User:</strong> {loan.user_name ?? loan.user_id}</div>
          <div><strong>Amount:</strong> {loan.loan_amount}</div>
          <div><strong>Type:</strong> {loan.loan_type ?? "-"} <strong className="ml-4">Tenure:</strong> {loan.tenure_months ?? "-"} months</div>
          <div><strong>Interest:</strong> {loan.interest_rate ?? "-"}% <strong className="ml-4">EMI (est):</strong> {loan.emi_preview ?? "-"}</div>
          <div><strong>CIBIL:</strong> {loan.cibil_score ?? "-"} <strong className="ml-4">System Decision:</strong> {loan.system_decision ?? "-"}</div>
        </div>

        <div className="mb-3">
          <label className="mr-4">
            <input
              type="radio"
              name="decision"
              checked={decision === "APPROVE"}
              onChange={() => setDecision("APPROVE")}
              className="mr-2"
            />
            Approve
          </label>
          <label>
            <input
              type="radio"
              name="decision"
              checked={decision === "REJECT"}
              onChange={() => setDecision("REJECT")}
              className="mr-2"
            />
            Reject
          </label>
        </div>

        <div className="mb-4">
          <textarea
            placeholder="Optional reason (recommended for rejection/escalation)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border rounded p-2"
            rows={4}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <button type="button" className="px-3 py-1" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="bg-green-600 text-white px-4 py-1 rounded"
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoanDecisionModal;