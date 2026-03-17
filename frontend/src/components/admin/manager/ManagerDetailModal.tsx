import type { Manager } from "../../../types/manager";
import { AuditService } from "../../../services/audit.service";
import type { AuditLog } from "../../../services/audit.service";

import { useState, useEffect, useMemo } from "react";
import Pagination from "../../common/Pagination";

interface Props {
  manager: Manager;
  onClose: () => void;
  onEdit?: (manager: Manager) => void;
  onDelete?: (manager: Manager) => void;
}

const ManagerDetailsModal = ({ manager, onClose, onEdit, onDelete }: Props) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<"PERSONAL" | "ACTIVITY">("PERSONAL");
  const isLoanManager = manager.role === "LOAN_MANAGER";
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const limit = 10; // logs per page
  const currentPage = Math.floor(skip / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  const handlePageChange = (page: number) => {
    const newSkip = (page - 1) * limit;
    setSkip(newSkip);
  };

  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        const response = await AuditService.getManagerLogs(
          manager.manager_id,
          skip,
          limit
        );

        setLogs(response.logs);
        setTotal(response.total);
      } catch (error) {
        console.error("Audit fetch error:", error);
      }
    };

    fetchAuditLogs();
  }, [manager, skip]);

  useEffect(() => {
    setSkip(0);
  }, [manager]);


  // ====================================
  // Stats
  // ====================================
  const loanManagerStats = useMemo(
    () => ({
      pending: logs.filter(l => l.action.includes("PENDING")).length,
      approved: logs.filter(l => l.action.includes("APPROVE")).length,
      rejected: logs.filter(l => l.action.includes("REJECT")).length,
      closed: logs.filter(l => l.action.includes("FINALIZE")).length,
    }),
    [logs]
  );

  const bankManagerStats = useMemo(
    () => ({
      pending: logs.filter(l => l.action.includes("PENDING")).length,
      approved: logs.filter(l => l.action.includes("APPROVE")).length,
      rejected: logs.filter(l => l.action.includes("REJECT")).length,
      deleted: logs.filter(l => l.action.includes("DELETE")).length,
    }),
    [logs]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-2xl text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold mb-6">Manager Details</h2>

        {/* Tabs */}
        <div className="flex gap-4 border-b mb-6">
          <button
            onClick={() => setActiveTab("PERSONAL")}
            className={`pb-2 font-semibold ${
              activeTab === "PERSONAL"
                ? "border-b-2 border-green-600 text-green-600"
                : "text-gray-500"
            }`}
          >
            Personal Details
          </button>

          <button
            onClick={() => setActiveTab("ACTIVITY")}
            className={`pb-2 font-semibold ${
              activeTab === "ACTIVITY"
                ? "border-b-2 border-green-600 text-green-600"
                : "text-gray-500"
            }`}
          >
            Activity Details
          </button>
        </div>

        {/* PERSONAL DETAILS */}
        {activeTab === "PERSONAL" && (
          <div className="space-y-6">
            <div className="grid gap-4 bg-gray-50 p-4 rounded">
              <p><strong>Name:</strong> {manager.name}</p>
              <p><strong>Manager ID:</strong> {manager.manager_id}</p>
              <p><strong>Role:</strong> {manager.role}</p>
              <p><strong>Status:</strong> {manager.status}</p>
              <p><strong>Phone:</strong> {manager.phone}</p>
            </div>
            
            {/* Edit and Delete buttons at bottom */}
            <div className="flex gap-3 pt-4 border-t">
              {onEdit && (
                <button
                  onClick={() => onEdit(manager)}
                  className="flex-1 bg-blue-600 text-white font-semibold py-2 px-4 rounded hover:bg-blue-700 transition"
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(manager)}
                  className="flex-1 bg-red-600 text-white font-semibold py-2 px-4 rounded hover:bg-red-700 transition"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        )}

        {/* ACTIVITY DETAILS */}
        {activeTab === "ACTIVITY" && (
          <div className="mt-6 space-y-4">
            {isLoanManager ? (
              <>
                {/* Loan Manager Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <StatCard title="Pending" value={loanManagerStats.pending} />
                  <StatCard title="Approved" value={loanManagerStats.approved} />
                  <StatCard title="Rejected" value={loanManagerStats.rejected} />
                  <StatCard title="Closed" value={loanManagerStats.closed} />
                </div>

                <h3 className="text-lg font-semibold mb-2">
                  Loan Decisions
                </h3>

                {logs.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No loan activity recorded yet.
                  </p>
                ) : (
                  <table className="w-full border">
                    <thead className="bg-green-100">
                      <tr>
                        <th className="p-2 border">User</th>
                        <th className="p-2 border">Loan Amount</th>
                        <th className="p-2 border">Decision</th>
                        <th className="p-2 border">Reason</th>
                        <th className="p-2 border">Process</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log, index) => (
                        <tr key={index}>
                          <td className="p-2 border">{log.entity_id}</td>
                          <td className="p-2 border">{log.action}</td>
                          <td className="p-2 border">{log.remarks || "—"}</td>
                          <td className="p-2 border">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="p-2 border">{log.entity_type}</td>
                        </tr>
                      ))}
                    </tbody>
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                    />
                  </table>
                )}
              </>
            ) : (
              <>
                {/* Bank Manager Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <StatCard title="Pending" value={bankManagerStats.pending} />
                  <StatCard title="Approved" value={bankManagerStats.approved} />
                  <StatCard title="Rejected" value={bankManagerStats.rejected} />
                  <StatCard title="Deleted" value={bankManagerStats.deleted} />
                </div>

                <h3 className="text-lg font-semibold mb-2">
                  Account Decisions
                </h3>

                {logs.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No account activity recorded yet.
                  </p>
                ) : (
                  <table className="w-full border mt-6 space-y-4">
                    <thead className="bg-green-100">
                      <tr>
                        <th className="p-2 border">User</th>
                        <th className="p-2 border">Decision</th>
                        <th className="p-2 border">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log, index) => (
                        <tr key={index}>
                          <td className="p-2 border">{log.entity_id}</td>
                          <td className="p-2 border">{log.action}</td>
                          <td className="p-2 border">{log.remarks || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                    />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagerDetailsModal;

/* Reusable stat card */
const StatCard = ({ title, value }: { title: string; value: number }) => (
  <div className="bg-green-100 p-3 rounded text-center">
    <p className="text-sm">{title}</p>
    <p className="font-bold text-lg">{value}</p>
  </div>
);
