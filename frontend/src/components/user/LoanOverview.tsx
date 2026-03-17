import type { User } from "../../types/user";

const formatMoney = (value?: number) =>
  (value ?? 0).toLocaleString();

/* ===================== TYPES ===================== */

type LoanSnapshot = {
  loanAmount: number;
  emiTotal: number;
  emiPaid: number;
  loanStatus: "APPROVED" | "REJECTED" | "PENDING" | "NO_LOAN";
};

interface Props {
  user: User;
  loan: LoanSnapshot;
  accountBalance: number;
  tenure: number;
  outstandingAmount: number;
  monthlyEmi: number;
}

/* ===================== COMPONENT ===================== */

const LoanOverview = ({
  user,
  loan,
  accountBalance,
  tenure,
  outstandingAmount,
  monthlyEmi,
}: Props) => {
  const {
    loanAmount,
    emiTotal,
    emiPaid,
    loanStatus,
  } = loan;

  const progress =
    emiTotal > 0
      ? Math.round((emiPaid / emiTotal) * 100)
      : 0;

  return (
    <div className="rounded-xl overflow-hidden shadow bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-green-400 text-white px-6 py-4 font-semibold text-lg">
        Loan Overview
      </div>

      {/* Top cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
        {/* User & Balance */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-100 text-blue-600 p-3 rounded-lg">
              📄
            </div>
            <div>
              <p className="text-sm text-gray-500">User ID</p>
              <p className="font-bold">{user.userId}</p>
            </div>
          </div>

          <hr className="my-3" />

          <p className="text-sm text-gray-500">Account Balance</p>
          <p className="text-green-600 font-bold text-lg">
            ₹{formatMoney(accountBalance)}
          </p>
        </div>

        {/* Loan Status */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-yellow-100 text-yellow-600 p-3 rounded-lg">
              ✔
            </div>
            <div>
              <p className="text-sm text-gray-500">Loan Status</p>
              <span className="inline-block bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm font-medium">
                {loanStatus}
              </span>
            </div>
          </div>

          <hr className="my-3" />

          <p className="text-sm text-gray-500">Tenure</p>
          <p className="font-bold">{tenure} Months</p>
        </div>

        {/* Loan Amount */}
        <div className="border rounded-lg p-4 bg-blue-50">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-600 text-white p-3 rounded-lg">
              ₹
            </div>
            <div>
              <p className="text-sm text-blue-700">Loan Amount</p>
              <p className="font-bold text-lg">
                ₹{formatMoney(loanAmount)}
              </p>
            </div>
          </div>

          <hr className="my-3 border-blue-200" />

          <p className="text-sm text-blue-700">Outstanding Amount</p>
          <p className="font-bold text-blue-900">
            ₹{formatMoney(outstandingAmount)}
          </p>
        </div>
      </div>

      {/* EMI Progress */}
      <div className="bg-green-50 px-6 py-5">
        <div className="flex justify-between items-center mb-2">
          <div>
            <p className="text-sm text-green-700">Monthly EMI</p>
            <p className="text-xl font-bold text-green-900">
             ₹{formatMoney(monthlyEmi)}
            </p>
          </div>

          <p className="text-sm font-medium text-green-800">
            Progress <span className="ml-2">{progress}% Paid</span>
          </p>
        </div>

        <div className="w-full bg-green-200 rounded-full h-3">
          <div
            className="bg-green-600 h-3 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default LoanOverview;
