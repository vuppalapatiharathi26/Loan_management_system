import { useEffect, useMemo, useState } from "react";
import Pagination from "../common/Pagination";
import type { Transaction } from "../../types/transaction";
import noDataImg from "../../assets/no-data.png";

interface Props {
  userId: string;
  transactions: Transaction[];
  title?: string;
}

const TransactionHistory = ({
  userId,
  transactions,
  title = "Transaction History",
}: Props) => {
  const ITEMS_PER_PAGE = 3;
  const [currentPage, setCurrentPage] = useState(1);

  const userTransactions = useMemo(
    () => transactions.filter((txn) => txn.userId === userId),
    [userId, transactions]
  );

  const totalPages = Math.max(
    1,
    Math.ceil(userTransactions.length / ITEMS_PER_PAGE)
  );

  useEffect(() => {
    setCurrentPage((prev) =>
      prev > totalPages ? totalPages : prev < 1 ? 1 : prev
    );
  }, [userId, totalPages]);

  const paginatedTransactions = userTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const statusStyles: Record<string, string> = {
    PAID: "bg-cyan-100 text-cyan-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    FAILED: "bg-red-100 text-red-700",
  };

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold mb-3">{title}</h3>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-green-100">
            <tr>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Transaction ID</th>
              <th className="p-3 text-left">Type</th>
              <th className="p-3 text-left">Amount</th>
              <th className="p-3 text-left">Status</th>
            </tr>
          </thead>

          <tbody>
            {paginatedTransactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6">
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
              paginatedTransactions.map((txn) => (
                <tr key={`${txn.id}-${txn.userId}`} className="border-t">
                  <td className="p-3">{txn.date}</td>
                  <td className="p-3">{txn.id}</td>
                  <td className="p-3">{txn.type}</td>
                  <td className="p-3">
                    ₹{txn.amount.toLocaleString()}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${statusStyles[txn.status]}`}
                    >
                      {txn.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

export default TransactionHistory;
