import React from "react";
import { Eye } from "lucide-react";
import type { LoanApplicationDTO } from "../../types/loan";

interface Props {
  loans: LoanApplicationDTO[];
  onView?: (loan: LoanApplicationDTO) => void;
  onApprove?: (loan: LoanApplicationDTO) => void;
  onReject?: (loan: LoanApplicationDTO) => void;
  onEscalate?: (loan: LoanApplicationDTO) => void;
  onFinalize?: (loan: LoanApplicationDTO) => void;
}

const LoanApplicationTable: React.FC<Props> = ({ loans, onView }) => {
  const hasPendingNocRequest = (loan: LoanApplicationDTO) =>
    loan.loan_status === "CLOSED" && ["REQUESTED", "PENDING"].includes(String(loan.noc_status || ""));

  const getStatusBadge = (status: LoanApplicationDTO["loan_status"]) => {
    if (status === "PENDING") return "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (status === "FINALIZED") return "bg-green-100 text-green-800 border-green-200";
    if (status === "CLOSED") return "bg-blue-100 text-blue-800 border-blue-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  const getDecisionBadge = (decision?: string) => {
    if (decision === "AUTO_APPROVED") return "bg-green-100 text-green-800 border-green-200";
    if (decision === "MANUAL_REVIEW") return "bg-orange-100 text-orange-800 border-orange-200";
    if (decision === "AUTO_REJECTED") return "bg-red-100 text-red-800 border-red-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  const statusLabel = (status: LoanApplicationDTO["loan_status"]) => {
    if (status === "PENDING") return "Pending";
    if (status === "FINALIZED") return "Finalized";
    if (status === "CLOSED") return "Closed";
    return status;
  };

  const decisionLabel = (decision?: string) => {
    if (decision === "AUTO_APPROVED") return "Auto Approved";
    if (decision === "MANUAL_REVIEW") return "Manual Review";
    if (decision === "AUTO_REJECTED") return "Auto Rejected";
    return decision ?? "-";
  };

  return (
    <div className="overflow-hidden rounded-lg border border-green-100 bg-white shadow-sm">
      <div className="max-h-[560px] overflow-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="sticky top-0 z-10 bg-green-100/95 backdrop-blur-sm">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-green-900">Loan ID</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-green-900">User Name</th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-green-900">Amount</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-green-900">Status</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-green-900">System Decision</th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-green-900">Created</th>
              <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-green-900">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loans.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                  No loan applications found.
                </td>
              </tr>
            ) : (
              loans.map((l, idx) => {
                const pendingNoc = hasPendingNocRequest(l);
                return (
                  <tr
                    key={l.loan_id}
                    className="loan-row-entrance border-b border-gray-100 transition-all duration-300 ease-in-out hover:bg-green-50/60"
                    style={{ animationDelay: `${idx * 55}ms` }}
                  >
                    <td className="px-5 py-3 text-sm font-medium text-gray-800">{l.loan_id}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        <span>{l.user_name ?? l.user_id}</span>
                        {pendingNoc && (
                          <span className="inline-flex rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                            NOC Requested
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-sm font-semibold text-gray-800">
                      {l.loan_amount}
                    </td>
                    <td className="px-5 py-3 text-sm">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadge(l.loan_status)}`}>
                        {statusLabel(l.loan_status)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getDecisionBadge(l.system_decision)}`}>
                        {decisionLabel(l.system_decision)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-600">{(l.applied_at ?? l.created_at) ?? "-"}</td>
                    <td className="px-5 py-3 text-center text-sm">
                      <button
                        className={`dashboard-ripple-btn loan-view-btn inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-0.5 ${
                          pendingNoc
                            ? "bg-amber-600 hover:bg-amber-700 hover:shadow-[0_0_0_4px_rgba(217,119,6,0.2)]"
                            : "bg-green-600 hover:bg-green-700 hover:shadow-[0_0_0_4px_rgba(34,197,94,0.2)]"
                        }`}
                        onClick={() => onView ? onView(l) : undefined}
                      >
                        <Eye size={14} />
                        {pendingNoc ? "View NOC Request" : "View"}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LoanApplicationTable;
