import { useEffect, useState } from "react";
import { LoanManagerService } from "../../services/loanManager.service";
import type { LoanApplicationDTO } from "../../types/loan";
import LoanApplicationTable from "../../components/loanManager/LoanApplicationTable";
import LoanViewModal from "../../components/loanManager/LoanViewModal";

const LoanHistory = () => {
  const [loans, setLoans] = useState<LoanApplicationDTO[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<LoanApplicationDTO | null>(null);
  const [showView, setShowView] = useState(false);

  useEffect(() => {
    fetchLoans();
  }, []);

  const fetchLoans = async () => {
    try {
      const data = await LoanManagerService.listFinalized();
      setLoans(data);
    } catch (err) {
      console.error("Failed to fetch loan history", err);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Loan History</h2>

      <LoanApplicationTable
        loans={loans}
        onView={(loan) => { setSelectedLoan(loan); setShowView(true); }}
      />

      {showView && selectedLoan && (
        <LoanViewModal
          loan={selectedLoan}
          onClose={() => { setSelectedLoan(null); setShowView(false); }}
          onSaved={() => fetchLoans()}
          context="history"
        />
      )}
    </div>
  );
};

export default LoanHistory;