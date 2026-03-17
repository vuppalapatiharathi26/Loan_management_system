import React, { useState } from "react";
import type { LoanApplicationDTO } from "../../types/loan";

interface Props {
  loan: LoanApplicationDTO;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}

export const EscalationModal: React.FC<Props> = ({ loan, onClose, onSubmit }) => {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(reason.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black opacity-30" onClick={onClose} />
      <form
        className="bg-white rounded shadow-lg max-w-md w-full p-6 z-10"
        onSubmit={handleSubmit}
      >
        <h3 className="text-lg font-bold mb-3">Escalate Loan — {loan.loan_id}</h3>

        <div className="mb-4">
          <textarea
            placeholder="Explain why this loan should be escalated to admin"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border rounded p-2"
            rows={5}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <button type="button" className="px-3 py-1" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="bg-yellow-600 text-white px-4 py-1 rounded"
            disabled={submitting}
          >
            {submitting ? "Escalating..." : "Escalate"}
          </button>
        </div>
      </form>
    </div>
  );
};