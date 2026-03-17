import { useEffect, useState } from "react";
import { AdminService } from "../../services/admin.service";
import type { LoanApplicationDTO } from "../../types/loan";
import type { AdminNotificationItem } from "../../services/admin.service";
import noDataImg from "../../assets/no-data.png";

const EscalatedLoansPage = () => {
  const [users, setUsers] = useState<{ userId: string; name: string }[]>([]);
  const [loans, setLoans] = useState<LoanApplicationDTO[]>([]);
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<LoanApplicationDTO | null>(null);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  // ============================
  // Fetch Users + Escalated Loans
  // ============================
  const fetchData = async () => {
    try {
      const [loansData, usersData] = await Promise.all([
        AdminService.getEscalatedLoans(),
        AdminService.listUsers(),
      ]);
      const notificationData = await AdminService.getNotifications({ unread_only: true, active_only: true, limit: 5 });

      setLoans(loansData);
      setNotifications(notificationData);

      const mappedUsers = usersData.map((u: any) => ({
        userId: u.user_id,
        name: u.name,
      }));

      setUsers(mappedUsers);
    } catch (error) {
      console.error("Failed to fetch escalated loans", error);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        await AdminService.markAllNotificationsRead();
      } catch {
        // Non-blocking: page data should still load even if mark-read fails.
      }
      await fetchData();
    };
    void init();
  }, []);

  // Create lookup map for user names
  const userMap = new Map(users.map((u) => [u.userId, u.name]));

  // ============================
  // Open Decision Modal
  // ============================
  const openDecisionModal = (loan: LoanApplicationDTO) => {
    setSelectedLoan(loan);
  };

  // ============================
  // Approve / Reject Decision
  // ============================
  const handleDecision = async (decision: "APPROVE" | "REJECT") => {
    if (!selectedLoan) return;

    if (reason.trim().length < 10) {
      alert("Reason must be at least 10 characters");
      return;
    }

    try {
      setLoading(true);

      await AdminService.decideEscalatedLoan(selectedLoan.loan_id, {
        decision,
        reason,
      });

      setSelectedLoan(null);
      setReason("");

      await fetchData(); // refresh data
    } catch (error) {
      console.error("Decision failed", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <h2 className="text-xl font-semibold mb-4">
        Escalated Loan Requests
      </h2>

      {notifications.length > 0 && (
        <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-3">
          <div className="mb-2 text-sm font-semibold text-amber-900">
            Escalation Notifications ({notifications.length})
          </div>
          <ul className="space-y-2 text-sm text-amber-900">
            {notifications.map((n) => (
              <li key={n.notification_id} className="rounded bg-white/70 px-2 py-1">
                {n.user_name ?? n.user_id ?? "User"} loan escalated
                {n.manager_name ? ` by ${n.manager_name}` : ""}
                {n.created_at ? ` (${new Date(n.created_at).toLocaleString()})` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <table className="w-full border rounded">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 border">User</th>
            <th className="p-2 border">Amount</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border">Action</th>
          </tr>
        </thead>

        <tbody>
          {loans.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-10 text-center">
                <div className="flex flex-col items-center gap-3">
                  <img
                    src={noDataImg}
                    alt="No escalations"
                    className="w-40 opacity-80"
                  />
                  <p className="text-gray-500 font-medium">
                    No escalated loans pending
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            loans.map((loan) => (
              <tr key={loan.loan_id} className="border-t text-center">
                <td>
                  {userMap.get(loan.user_id) ?? loan.user_id}
                </td>
                <td>
                  ₹{(loan.loan_amount ?? 0).toLocaleString()}
                </td>
                <td>{loan.loan_status}</td>
                <td>
                  <button
                    className="bg-blue-600 text-white px-4 py-1 rounded"
                    onClick={() => openDecisionModal(loan)}
                  >
                    Review
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* ============================
           Decision Modal
         ============================ */}
      {selectedLoan && (
  <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded w-[520px] max-h-[80vh] overflow-auto shadow-lg">
      <h3 className="font-semibold mb-3">Loan Review</h3>

      <div className="text-sm mb-4 space-y-2">
        <div><strong>User:</strong> {selectedLoan.user_name ?? selectedLoan.user_id}</div>
        <div><strong>Amount:</strong> ₹{(selectedLoan.loan_amount ?? 0).toLocaleString()}</div>
        <div><strong>Loan Type:</strong> {selectedLoan.loan_type ?? "-"}</div>
        <div><strong>Tenure (months):</strong> {selectedLoan.tenure_months ?? "-"}</div>
        <div><strong>Interest Rate:</strong> {selectedLoan.interest_rate ?? "-"}%</div>
        <div><strong>EMI (est):</strong> {selectedLoan.emi_preview ?? "-"}</div>
        <div><strong>CIBIL Score:</strong> {selectedLoan.cibil_score ?? "-"}</div>
        <div><strong>Applied At:</strong> {selectedLoan.applied_at ?? "-"}</div>
        <div><strong>Decision Reason:</strong> {selectedLoan.decision_reason ?? "-"}</div>
        <div><strong>Escalated At:</strong> {selectedLoan.escalated_at ?? "-"}</div>
        <div><strong>Active Loan ID:</strong> {selectedLoan.active_loan_id ?? "-"}</div>
        <div><strong>Status:</strong> {selectedLoan.loan_status ?? "-"}</div>
      </div>

      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Enter reason (minimum 10 characters)..."
        rows={4}
        className="w-full border p-2 rounded mb-4"
      />

      <div className="flex justify-end gap-3">
        <button
          onClick={() => setSelectedLoan(null)}
          className="px-3 py-1 border rounded"
        >
          Cancel
        </button>

        <button
          disabled={loading}
          onClick={() => handleDecision("APPROVE")}
          className="px-3 py-1 bg-green-600 text-white rounded"
        >
          Approve
        </button>

        <button
          disabled={loading}
          onClick={() => handleDecision("REJECT")}
          className="px-3 py-1 bg-red-600 text-white rounded"
        >
          Reject
        </button>
      </div>
    </div>
  </div>
      )}
    </div>
  );
};

export default EscalatedLoansPage;
