import { useState, useEffect } from "react";
import type { User } from "../../../types/user";
import noDataImg from "../../../assets/no-data.png";
import Pagination from "../../common/Pagination";

interface Props {
  users: User[];
  onView: (user: User) => void;
  onRequestDeletion: (user: User) => void;
  requestedDeletionUsers: string[];
}

const UserTable = ({
  users,
  onView,
  onRequestDeletion,
  requestedDeletionUsers,
}: Props) => {
  const ITEMS_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);

  const [filters, setFilters] = useState({
    name: "",
    userId: "",
    loanStatus: "",
    accountStatus: "",
    minLoan: "",
    maxLoan: "",
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const handleFilterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  const filteredUsers = users.filter((user) => {
    const min = filters.minLoan ? Number(filters.minLoan) : 0;
    const max = filters.maxLoan ? Number(filters.maxLoan) : Infinity;

    return (
      (user.name ?? "")
        .toLowerCase()
        .includes(filters.name.toLowerCase()) &&
      (user.userId ?? "")
        .toLowerCase()
        .includes(filters.userId.toLowerCase()) &&
      (user.loanAmount ?? 0) >= min &&
      (user.loanAmount ?? 0) <= max &&
      (filters.loanStatus === "" ||
        user.loanStatus === filters.loanStatus) &&
      (filters.accountStatus === "" ||
        user.accountStatus === filters.accountStatus)
    );
  });

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="w-full overflow-x-auto bg-white rounded-xl shadow-sm border">
      <table className="min-w-[900px] w-full border rounded">
        <thead className="bg-green-100">
          <tr className="text-sm uppercase tracking-wide text-gray-700">

            {/* NAME */}
            <th className="px-6 py-4 text-center">
              <div className="flex flex-col items-center gap-2">
                <span>Name</span>
                <input
                  type="text"
                  name="name"
                  placeholder="Search"
                  value={filters.name}
                  onChange={handleFilterChange}
                  className="border rounded px-3 py-1 text-xs w-40"
                />
              </div>
            </th>

            {/* USER ID */}
            <th className="px-6 py-4 text-center">
              <div className="flex flex-col items-center gap-2">
                <span>User ID</span>
                <input
                  type="text"
                  name="userId"
                  placeholder="Search"
                  value={filters.userId}
                  onChange={handleFilterChange}
                  className="border rounded px-3 py-1 text-xs w-44"
                />
              </div>
            </th>

            {/* LOAN AMOUNT */}
            <th className="px-6 py-4 text-center">
              <div className="flex flex-col items-center gap-2">
                <span>Loan Amount</span>
                <div className="flex gap-2">
                  <input
                    type="number"
                    name="minLoan"
                    placeholder="Min"
                    value={filters.minLoan}
                    onChange={handleFilterChange}
                    className="border rounded px-2 py-1 text-xs w-20"
                  />
                  <input
                    type="number"
                    name="maxLoan"
                    placeholder="Max"
                    value={filters.maxLoan}
                    onChange={handleFilterChange}
                    className="border rounded px-2 py-1 text-xs w-20"
                  />
                </div>
              </div>
            </th>

            {/* LOAN STATUS */}
            <th className="px-6 py-4 text-center">
              <div className="flex flex-col items-center gap-2">
                <span>Loan Status</span>
                <select
                  name="loanStatus"
                  value={filters.loanStatus}
                  onChange={handleFilterChange}
                  className="border rounded px-2 py-1 text-xs"
                >
                  <option value="">All</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PENDING">Pending</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="NO_LOAN">No Loan</option>
                  <option value="ESCALATED">Escalated</option>
                </select>
              </div>
            </th>

            {/* ACCOUNT STATUS */}
            <th className="px-6 py-4 text-center">
              <div className="flex flex-col items-center gap-2">
                <span>Account</span>
                <select
                  name="accountStatus"
                  value={filters.accountStatus}
                  onChange={handleFilterChange}
                  className="border rounded px-2 py-1 text-xs"
                >
                  <option value="">All</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PENDING">Pending</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="DELETED">Deleted</option>
                </select>
              </div>
            </th>

            {/* ACTION */}
            <th className="px-6 py-4 text-center">
              Action
            </th>
          </tr>
        </thead>

        <tbody className="divide-y">
          {filteredUsers.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-12 text-center">
                <div className="flex flex-col items-center gap-3">
                  <img
                    src={noDataImg}
                    alt="No data"
                    className="w-40 opacity-80"
                  />
                  <p className="text-gray-500 font-medium">
                    No data found
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            paginatedUsers.map((u) => {
              const isDeletionRequested =
                requestedDeletionUsers.includes(u.userId);

              return (
                <tr key={u.userId} className="text-center hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-gray-700">{u.name}</td>
                  <td className="px-6 py-4 text-gray-500">{u.userId}</td>
                  <td className="px-6 py-4 font-semibold">
                    ₹{(u.loanAmount ?? 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge value={u.loanStatus} />
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge value={u.accountStatus} />
                  </td>
                  <td className="px-6 py-4 flex justify-center gap-3">
                    <button
                      className="text-blue-600 hover:underline"
                      onClick={() => onView(u)}
                    >
                      View
                    </button>

                    {u.accountStatus === "APPROVED" && (
                      <button
                        disabled={isDeletionRequested}
                        className={`font-medium ${
                          isDeletionRequested
                            ? "text-gray-400 cursor-not-allowed"
                            : "text-red-600 hover:underline"
                        }`}
                        onClick={() => {
                          if (!isDeletionRequested) {
                            onRequestDeletion(u);
                          }
                        }}
                      >
                        {isDeletionRequested
                          ? "Deletion Requested"
                          : "Request Deletion"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      <div className="flex justify-center py-4">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};

const StatusBadge = ({ value }: { value?: string }) => {
  const v = value ?? "UNKNOWN";

  const color =
    v === "APPROVED" || v === "ACTIVE"
      ? "bg-green-100 text-green-700"
      : v === "PENDING"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-red-100 text-red-700";

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${color}`}>
      {v}
    </span>
  );
};

export default UserTable;
