import type { Transaction } from "../../../types/transaction";
import type { User } from "../../../types/user";

// import { transactions } from "../../../mocks/transaction.mock";

interface Props {
  user: User;
  loan: {
    loanAmount: number;
    emiTotal: number;
    emiPaid: number;
  };
  transactions: Transaction[];
  onPayEmi: (emiTxnId: string) => void;
  onPayFine: (fineTxnId: string) => void;
}

const EmiSchedule = ({
  user,
  loan,
  transactions,
  onPayEmi,
  onPayFine,
}: Props) => {

  const safeTotalEmi = loan.emiTotal ?? 0;
  const safePaidEmi = loan.emiPaid ?? 0;
  const safeLoanAmount = loan.loanAmount ?? 0;

  const totalEmi = safeTotalEmi;
  const paidEmi = safePaidEmi;
  const pendingEmi = Math.max(0, safeTotalEmi - safePaidEmi);

  const emiAmount =
    safeTotalEmi > 0
      ? Math.round(safeLoanAmount / safeTotalEmi)
      : 0;

  // filter EMI transactions for this user
  const emiTransactions = transactions.filter(
    (t) => t.userId === user.userId && t.type === "EMI"
    );

    const nextEmi = emiTransactions.find(
    (t) => t.status === "PENDING"
    );


  const outstandingAmount = pendingEmi * emiAmount;

  const pendingFine = transactions.find(
    (t) =>
        t.userId === user.userId &&
        t.type === "FINE" &&
        t.status === "PENDING"
    );


  return (
    <div className="space-y-6">

      {/* 🔹 Loan Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard label="Total EMIs" value={totalEmi} />
        <SummaryCard label="Paid EMIs" value={paidEmi} />
        <SummaryCard label="Pending EMIs" value={pendingEmi} />
        <SummaryCard
          label="Outstanding Amount"
          value={`₹${outstandingAmount.toLocaleString()}`}
        />
      </div>

      {pendingFine && (
        <div className="p-4 border rounded-lg bg-red-50 flex justify-between items-center">
            <div>
            <p className="text-sm text-red-700 font-medium">
                Pending Penalty
            </p>
            <p className="font-semibold">
                ₹{(pendingFine?.amount ?? 0).toLocaleString()}
            </p>
            </div>

            <button
            onClick={() => onPayFine(pendingFine.id)}
            className="px-4 py-2 bg-red-600 text-white rounded"
            >
            Pay Fine
            </button>
        </div>
        )}


      {/* 🔹 EMI Table */}
      <div>
      <h2 className="pb-2"><strong>Payment Schedule</strong></h2>
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-green-100">
            <tr>
              <th className="p-3 text-left">EMI No</th>
              <th className="p-3 text-left">Due Date</th>
              <th className="p-3 text-left">Amount</th>
              <th className="p-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {emiTransactions.map((emi, index) => (
              <tr key={emi.id} className="border-t">
                <td className="p-3">{index + 1}</td>
                <td className="p-3">{emi.date}</td>
                <td className="p-3">
                  ₹{emi.amount.toLocaleString()}
                </td>
                <td className="p-3">
                  <StatusBadge value={emi.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>

      {/* 🔹 Pay Next EMI */}
      {nextEmi && (
        <div className="p-4 border rounded-lg bg-blue-50 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">
              Next EMI Due Date
            </p>
            <p className="font-semibold">{nextEmi.date}</p>

            <p className="text-sm text-gray-600 mt-1">
              EMI Amount
            </p>
            <p className="font-semibold">
              ₹{(nextEmi?.amount ?? 0).toLocaleString()}
            </p>
          </div>

          <button
            onClick={() => nextEmi && onPayEmi(nextEmi.id)}
            disabled={!nextEmi || !!pendingFine}
            className={`px-4 py-2 rounded text-white ${
                !nextEmi || pendingFine
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600"
            }`}
            >
            Pay Now
            </button>

            {pendingFine && (
                <p className="text-sm text-red-600 mt-2">
                    Please clear the pending penalty before paying the EMI.
                </p>
                )}
        </div>
      )}
    </div>
  );
};

export default EmiSchedule;

/* ---------- Helpers ---------- */

const SummaryCard = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <div className="p-4 bg-white border rounded-lg">
    <p className="text-sm text-gray-500">{label}</p>
    <p className="text-xl font-bold mt-1">{value}</p>
  </div>
);

const StatusBadge = ({ value }: { value: string }) => {
  const color =
    value === "PAID"
      ? "bg-green-100 text-green-700"
      : value === "PENDING"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-red-100 text-red-700";

  return (
    <span className={`px-2 py-1 rounded text-xs ${color}`}>
      {value}
    </span>
  );
};
