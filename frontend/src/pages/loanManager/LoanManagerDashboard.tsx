import { useCallback, useEffect, useMemo, useState } from "react";
import { BellRing, CheckCircle2, ClipboardList, Search, ShieldAlert, TimerReset, XCircle } from "lucide-react";
import { LoanManagerService } from "../../services/loanManager.service";
import type { LoanApplicationDTO } from "../../types/loan";
import LoanApplicationTable from "../../components/loanManager/LoanApplicationTable";
import LoanDecisionModal from "../../components/loanManager/LoanDecisionModal";
import { EscalationModal } from "../../components/loanManager/EscalationModal";
import LoanFinalizationForm from "../../components/loanManager/LoanFinalizationForm";
import LoanViewModal from "../../components/loanManager/LoanViewModal";
const LoanManagerDashboard = () => {
  const [loans, setLoans] = useState<LoanApplicationDTO[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [systemDecisionFilter, setSystemDecisionFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLoan, setSelectedLoan] = useState<LoanApplicationDTO | null>(null);

  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [showEscalationModal, setShowEscalationModal] = useState(false);
  const [showFinalizationForm, setShowFinalizationForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [animatedCounts, setAnimatedCounts] = useState({
    total: 0,
    pending: 0,
    autoApproved: 0,
    manualReview: 0,
    closed: 0,
  });

  // ===============================
  // Fetch loan applications
  // ===============================
  const fetchLoans = useCallback(async () => {
    try {
      const params = systemDecisionFilter ? { system_decision: systemDecisionFilter } : undefined;
      const data = await LoanManagerService.listApplications(params);
      setLoans(data);
    } catch (err) {
      console.error("Failed to fetch loans", err);
    }
  }, [systemDecisionFilter]);

  useEffect(() => {
    let isMounted = true;
    const run = async () => {
      try {
        const params = systemDecisionFilter ? { system_decision: systemDecisionFilter } : undefined;
        const data = await LoanManagerService.listApplications(params);
        if (isMounted) setLoans(data);
      } catch (err) {
        console.error("Failed to fetch loans", err);
      }
    };

    void run();
    return () => {
      isMounted = false;
    };
  }, [systemDecisionFilter]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return loans.filter((it) => {
      if (systemDecisionFilter && it.system_decision !== systemDecisionFilter) return false;
      if (statusFilter && it.loan_status !== statusFilter) return false;
      if (q) {
        const loanId = it.loan_id?.toLowerCase() ?? "";
        const userName = (it.user_name ?? it.user_id ?? "").toLowerCase();
        if (!loanId.includes(q) && !userName.includes(q)) return false;
      }
      return true;
    });
  }, [loans, systemDecisionFilter, statusFilter, searchQuery]);

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const displayed = useMemo(() => filtered.slice(start, start + pageSize), [filtered, start, pageSize]);
  const pendingNocRequests = useMemo(
    () =>
      loans.filter(
        (l) => l.loan_status === "CLOSED" && ["REQUESTED", "PENDING"].includes(String(l.noc_status || ""))
      ).length,
    [loans]
  );
  const pendingNocRequestNames = useMemo(() => {
    return loans
      .filter((l) => l.loan_status === "CLOSED" && ["REQUESTED", "PENDING"].includes(String(l.noc_status || "")))
      .map((l) => l.user_name || l.user_id)
      .filter((n): n is string => Boolean(n))
      .slice(0, 5);
  }, [loans]);

  const kpiTargets = useMemo(() => {
    const source = filtered;
    return {
      total: source.length,
      pending: source.filter((l) => l.loan_status === "PENDING").length,
      autoApproved: source.filter((l) => l.system_decision === "AUTO_APPROVED").length,
      manualReview: source.filter((l) => l.system_decision === "MANUAL_REVIEW").length,
      closed: source.filter((l) => l.loan_status === "CLOSED").length,
    };
  }, [filtered]);

  useEffect(() => {
    const duration = 700;
    const startTs = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - startTs) / duration, 1);
      setAnimatedCounts({
        total: Math.round(kpiTargets.total * progress),
        pending: Math.round(kpiTargets.pending * progress),
        autoApproved: Math.round(kpiTargets.autoApproved * progress),
        manualReview: Math.round(kpiTargets.manualReview * progress),
        closed: Math.round(kpiTargets.closed * progress),
      });

      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [kpiTargets]);

  // ===============================
  // Actions
  // ===============================
  const handleDecision = async (
    decision: "APPROVE" | "REJECT",
    reason?: string
  ) => {
    if (!selectedLoan) return;

    try {
      await LoanManagerService.makeManualDecision(selectedLoan.loan_id, {
        decision,
        reason,
      });
      alert(`Decision ${decision} submitted successfully`);
    } catch (err) {
      console.error(err);
      alert("Failed to submit decision");
    }

    closeAll();
    fetchLoans();
  };

  const handleEscalation = async (reason: string) => {
    if (!selectedLoan) return;

    try {
      await LoanManagerService.escalateLoan(selectedLoan.loan_id, { reason });
      alert("Escalation submitted successfully");
    } catch (err) {
      console.error(err);
      alert("Failed to escalate loan");
    }

    closeAll();
    fetchLoans();
  };

  const handleFinalize = async (interest_rate: number, tenure_months: number) => {
    if (!selectedLoan) return;

    try {
      await LoanManagerService.finalizeLoan(selectedLoan.loan_id, {
        interest_rate,
        tenure_months,
      });
      alert("Finalization completed successfully");
    } catch (err) {
      console.error(err);
      alert("Failed to finalize loan");
    }

    closeAll();
    fetchLoans();
  };

  const closeAll = () => {
    setSelectedLoan(null);
    setShowDecisionModal(false);
    setShowEscalationModal(false);
    setShowFinalizationForm(false);
    setShowViewModal(false);
  };

  // ===============================
  // UI
  // ===============================
  return (
    <div className="loan-dashboard-fade-in space-y-6">
      <div className="loan-dashboard-slide-up flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-green-900">Loan Applications</h2>
          <p className="mt-1 text-sm text-gray-600">Monitor, filter, and review applications with a complete status overview.</p>
        </div>
        <div className="rounded-md bg-green-50 px-3 py-2 text-sm font-medium text-green-800">
          {total} results
        </div>
      </div>

      {pendingNocRequests > 0 && (
        <div className="loan-dashboard-slide-up rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <div className="flex items-center gap-2 font-medium">
            <BellRing size={16} />
            NOC requests pending: {pendingNocRequests}
          </div>
          <div className="mt-1 text-amber-700">
            Pending users: {pendingNocRequestNames.join(", ")}
            {pendingNocRequests > pendingNocRequestNames.length ? " ..." : ""}
          </div>
          <div className="mt-1 text-amber-700">Open a loan and use View to approve/reject requested NOC.</div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { key: "total", label: "Total Applications", value: animatedCounts.total, icon: ClipboardList },
          { key: "pending", label: "Pending", value: animatedCounts.pending, icon: TimerReset },
          { key: "autoApproved", label: "Auto Approved", value: animatedCounts.autoApproved, icon: CheckCircle2 },
          { key: "manualReview", label: "Manual Review", value: animatedCounts.manualReview, icon: ShieldAlert },
          { key: "closed", label: "Closed", value: animatedCounts.closed, icon: XCircle },
        ].map((card, idx) => (
          <div
            key={card.key}
            className="loan-dashboard-slide-up group rounded-lg border border-green-100 bg-white p-4 shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-md"
            style={{ animationDelay: `${idx * 65}ms` }}
          >
            <div className="mb-3 inline-flex rounded-md bg-green-50 p-2 text-green-700">
              <card.icon size={16} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{card.value}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-500">{card.label}</div>
            <div className="mt-3 h-1 w-10 rounded bg-green-500/50 transition-all duration-300 ease-in-out group-hover:w-16" />
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="loan-dashboard-slide-up rounded-lg border border-green-100 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="loan-filter-input w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-800 outline-none transition-all duration-300 ease-in-out"
              placeholder="Search Loan ID / User Name"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">System Decision</label>
            <select
              value={systemDecisionFilter ?? ""}
              onChange={(e) => { setSystemDecisionFilter(e.target.value || undefined); setPage(1); }}
              className="loan-filter-input w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none transition-all duration-300 ease-in-out"
            >
              <option value="">All</option>
              <option value="MANUAL_REVIEW">MANUAL_REVIEW</option>
              <option value="AUTO_APPROVED">AUTO_APPROVED</option>
              <option value="AUTO_REJECTED">AUTO_REJECTED</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <select
              value={statusFilter ?? ""}
              onChange={(e) => { setStatusFilter(e.target.value || undefined); setPage(1); }}
              className="loan-filter-input w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none transition-all duration-300 ease-in-out"
            >
              <option value="">All</option>
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
              <option value="FINALIZED">FINALIZED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>

          <div className="flex items-center justify-end">
            <button
              onClick={() => {
                setSearchQuery("");
                setSystemDecisionFilter(undefined);
                setStatusFilter(undefined);
                setPage(1);
              }}
              className="rounded-md border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 transition-all duration-300 ease-in-out hover:bg-green-100"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="loan-dashboard-slide-up">
        <LoanApplicationTable
          loans={displayed}
          onApprove={(loan) => {
            setSelectedLoan(loan);
            setShowDecisionModal(true);
          }}
          onReject={(loan) => {
            setSelectedLoan(loan);
            setShowDecisionModal(true);
          }}
          onEscalate={(loan) => {
            setSelectedLoan(loan);
            setShowEscalationModal(true);
          }}
          onFinalize={(loan) => {
            setSelectedLoan(loan);
            setShowFinalizationForm(true);
          }}
          onView={(loan) => {
            setSelectedLoan(loan);
            setShowViewModal(true);
          }}
        />
      </div>

      {/* Pagination */}
      <div className="loan-dashboard-slide-up flex items-center justify-end">
        <div className="flex items-center gap-2 rounded-md border border-green-100 bg-white px-3 py-2 shadow-sm">
          <label className="text-sm text-gray-600">Page size:</label>
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="loan-filter-input rounded border border-gray-200 px-2 py-1 text-sm outline-none transition-all duration-300 ease-in-out"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
          </select>

          <div className="text-sm text-gray-600">
            {total === 0 ? "0 - 0" : `${start + 1} - ${Math.min(start + pageSize, total)}`} of {total}
          </div>

          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded border border-gray-200 px-2 py-1 text-sm transition-all duration-300 ease-in-out disabled:cursor-not-allowed disabled:opacity-40"
          >
            Prev
          </button>
          <button
            disabled={start + pageSize >= total}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-gray-200 px-2 py-1 text-sm transition-all duration-300 ease-in-out disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {/* Decision */}
      {showDecisionModal && selectedLoan && (
        <LoanDecisionModal
          loan={selectedLoan}
          onClose={closeAll}
          onSubmit={handleDecision}
        />
      )}

      {/* Escalation */}
      {showEscalationModal && selectedLoan && (
        <EscalationModal
          loan={selectedLoan}
          onClose={closeAll}
          onSubmit={handleEscalation}
        />
      )}

      {/* Finalization */}
      {showFinalizationForm && selectedLoan && (
        <LoanFinalizationForm
          loan={selectedLoan}
          onClose={closeAll}
          onSubmit={handleFinalize}
        />
      )}

      {showViewModal && selectedLoan && (
        <LoanViewModal
          loan={selectedLoan}
          onClose={closeAll}
          onSaved={() => fetchLoans()}
          context="dashboard"
        />
      )}
    </div>
  );
};

export default LoanManagerDashboard;
