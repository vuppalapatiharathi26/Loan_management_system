import React, { useState } from "react";
import type { LoanApplicationDTO } from "../../types/loan";

interface Props {
  loan: LoanApplicationDTO;
  onClose: () => void;
  onSubmit: (interest_rate: number, tenure_months: number) => Promise<void>;
}

const LoanFinalizationForm: React.FC<Props> = ({ loan, onClose, onSubmit }) => {
  const [interestRate, setInterestRate] = useState<number>(12);
  const [tenure, setTenure] = useState<number>(12);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(Number(interestRate), Number(tenure));
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
        <h3 className="text-lg font-bold mb-3">Finalize Loan — {loan.loan_id}</h3>

        <div className="mb-3">
          <label className="block text-sm mb-1">Interest Rate (%)</label>
          <input
            type="number"
            step="0.01"
            value={interestRate}
            onChange={(e) => setInterestRate(Number(e.target.value))}
            className="w-full border rounded p-2"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm mb-1">Tenure (months)</label>
          <input
            type="number"
            value={tenure}
            onChange={(e) => setTenure(Number(e.target.value))}
            className="w-full border rounded p-2"
          />
        </div>

        <div className="flex justify-end space-x-2">
          <button type="button" className="px-3 py-1" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="bg-green-700 text-white px-4 py-1 rounded"
            disabled={submitting}
          >
            {submitting ? "Finalizing..." : "Finalize"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoanFinalizationForm;