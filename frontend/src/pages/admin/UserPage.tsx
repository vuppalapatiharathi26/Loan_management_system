import { useState, useEffect } from "react";

import UserStatsCards from "../../components/admin/user/UserStatsCards";
import UserTable from "../../components/admin/user/UserTable";
import UserDetailsModal from "../../components/admin/user/UserDetailsModal";

import type { User } from "../../types/user";
import type { LoanApplicationDTO } from "../../types/loan";

import { AdminService } from "../../services/admin.service";

const UserPage = () => {
  // ==============================
  // Persistent deletion state
  // ==============================
  const [requestedDeletionUsers, setRequestedDeletionUsers] = useState<string[]>(() => {
    const stored = localStorage.getItem("deletionRequests");
    return stored ? JSON.parse(stored) : [];
  });

  const [deletionUser, setDeletionUser] = useState<User | null>(null);
  const [deletionReason, setDeletionReason] = useState("");

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // ==============================
  // Fetch Users + Loans
  // ==============================
  const fetchUsersWithLoans = async () => {
    try {
      const [usersRes, loansRes]: [any[], LoanApplicationDTO[]] =
        await Promise.all([
          AdminService.listUsers(),
          AdminService.listLoans(),
        ]);

      const loanMap = new Map<string, LoanApplicationDTO>(
        loansRes.map((loan) => [String(loan.user_id), loan])
      );

      const mergedUsers: User[] = usersRes.map((u) => {
        const loan = loanMap.get(String(u.user_id));

        return {
          userId: u.user_id,
          name: u.name,
          phone: u.phone,
          accountStatus: u.approval_status,
          kycStatus: u.kyc_status,
          createdAt: u.created_at,
          loanId: loan?.loan_id,
          loanAmount: loan?.loan_amount ?? 0,
          loanStatus: loan?.loan_status ?? "NO_LOAN",
          nocStatus: loan?.noc_status ?? null,
          nocReferenceNo: loan?.noc_reference_no ?? null,
          nocApprovedAt: loan?.noc_approved_at ?? null,
          nocGeneratedAt: loan?.noc_generated_at ?? null,
          nocApprovedByName: loan?.noc_approved_by_name ?? null,
        };
      });

      setUsers(mergedUsers);
    } catch (error) {
      console.error("Failed to fetch users or loans", error);
    }
  };

  useEffect(() => {
    fetchUsersWithLoans();
  }, []);

  // ==============================
  // Submit Deletion Request
  // ==============================
  const submitDeletionRequest = async () => {
    if (!deletionUser) return;

    if (deletionReason.trim().length < 10) {
      alert("Reason must be at least 10 characters");
      return;
    }

    try {
      await AdminService.requestUserDeletion(deletionUser.userId, {
        reason: deletionReason,
      });

      // ✅ Persist locally
      const updated = [...requestedDeletionUsers, deletionUser.userId];
      setRequestedDeletionUsers(updated);
      localStorage.setItem("deletionRequests", JSON.stringify(updated));

      setDeletionUser(null);
      setDeletionReason("");

      await fetchUsersWithLoans();
    } catch (error) {
      console.error("Deletion request failed", error);
    }
  };

  // ✅ Only approved loans + non-deleted accounts
  const approvedActiveLoans = users.filter(
    (u) =>
      u.loanStatus === "APPROVED" &&
      u.accountStatus !== "DELETED"
  );

  // ✅ Total loan amount (filtered)
  const totalLoanAmount = approvedActiveLoans.reduce(
    (sum, u) => sum + (u.loanAmount ?? 0),
    0
  );

  // ✅ Active users (approved account)
  const activeUsers = users.filter(
    (u) => u.accountStatus === "APPROVED"
  );


  // ==============================
  // UI
  // ==============================
  return (
    <div className="w-full max-w-none">
      <h2 className="text-xl font-semibold mb-4">Users</h2>

      <UserStatsCards
        total={users.length}
        active={activeUsers.length}
        approved={approvedActiveLoans.length}
        totalLoan={totalLoanAmount}
      />

      <UserTable
        users={users}
        onView={setSelectedUser}
        onRequestDeletion={setDeletionUser}
        requestedDeletionUsers={requestedDeletionUsers} // 🔥 pass this
      />

      {selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          isOpen
          onClose={() => setSelectedUser(null)}
        />
      )}

      {/* ==============================
         Deletion Modal
      ============================== */}
      {deletionUser && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white w-[400px] rounded-lg p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-3">
              Request Account Deletion
            </h3>

            <textarea
              value={deletionReason}
              onChange={(e) => setDeletionReason(e.target.value)}
              placeholder="Enter reason (minimum 10 characters)..."
              rows={4}
              className="w-full border rounded-md p-3 text-sm mb-4"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeletionUser(null);
                  setDeletionReason("");
                }}
                className="px-4 py-2 rounded border text-gray-600"
              >
                Cancel
              </button>

              <button
                onClick={submitDeletionRequest}
                className="px-4 py-2 rounded bg-red-600 text-white"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserPage;
