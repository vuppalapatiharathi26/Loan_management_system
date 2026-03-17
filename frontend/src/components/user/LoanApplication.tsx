import { useState, useEffect } from "react";
import ApplyLoanForm from "../../components/user/loan/ApplyLoanForm";
import type { User } from "../../types/user";
import { UserService } from "../../services/user.service";
import { RepaymentService } from "../../services/repayment.service";
import type { RepaymentSummary, RepaymentRow } from "../../services/repayment.service";
import { useToast } from "../../context/ToastContext";
import PinPromptModal from "../../components/user/PinPromptModal";
import { LoanDetailsService } from "../../services/loanDetails.service";
import type { LoanDetailsResponse } from "../../services/loanDetails.service";
import Tooltip from "../common/Tooltip";
import StripePaymentModal from "./StripePaymentModal";

type LoanRow = {
  loan_id: string;
  loan_type?: string;
  loan_amount?: number;
  tenure_months?: number;
  status?: string;
  system_decision?: string;
  interest_rate?: number | null;
  emi_preview?: number | null;
  active_loan_id?: string | null;
  disbursed?: boolean;
  disbursed_at?: string | null;
  applied_at?: string;
};

interface LoanApplicationProps {
  user: User;
}

type LoanProgressStep = {
  key: string;
  label: string;
};

const LOAN_PROGRESS_STEPS: LoanProgressStep[] = [
  { key: "PENDING", label: "Pending" },
  { key: "REVIEWED", label: "Reviewed" },
  { key: "DECISION", label: "Approved / Rejected" },
  { key: "ESCALATED", label: "Escalated" },
  { key: "FINALIZED", label: "Finalized" },
];

const normalize = (value?: string) => String(value || "").toUpperCase().trim();

const getLoanProgressStepIndex = (status?: string, systemDecision?: string) => {
  const s = normalize(status);
  const d = normalize(systemDecision);

  if (s === "FINALIZED" || s === "CLOSED") return 4;
  if (s === "ESCALATED") return 3;
  if (["APPROVED", "REJECTED", "AUTO_REJECTED"].includes(s)) return 2;
  if (["MANUAL_REVIEW", "UNDER_REVIEW"].includes(s)) return 1;
  if (s === "PENDING") {
    if (d === "MANUAL_REVIEW") return 1;
    if (d === "AUTO_APPROVED" || d === "AUTO_REJECTED") return 2;
    return 0;
  }
  return 0;
};

const LoanProgressBar = ({
  status,
  systemDecision,
}: {
  status?: string;
  systemDecision?: string;
}) => {
  const currentIndex = getLoanProgressStepIndex(status, systemDecision);
  const normalizedStatus = normalize(status);

  return (
    <div className="min-w-[420px]">
      <div className="flex items-center">
        {LOAN_PROGRESS_STEPS.map((step, index) => {
          const done = index <= currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <div key={step.key} className="flex items-center flex-1">
              <div
                className={`h-7 w-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                  done
                    ? "bg-green-600 border-green-600 text-white"
                    : "bg-white border-gray-300 text-gray-500"
                } ${isCurrent ? "ring-2 ring-green-200" : ""}`}
                title={step.label}
              >
                {index + 1}
              </div>
              {index < LOAN_PROGRESS_STEPS.length - 1 && (
                <div
                  className={`h-1 flex-1 mx-1 rounded ${
                    index < currentIndex ? "bg-green-600" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 grid grid-cols-5 gap-1 text-[10px] text-gray-600">
        {LOAN_PROGRESS_STEPS.map((step) => (
          <div key={step.key} className="text-center leading-tight">
            {step.label}
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-gray-600">
        Current status: <span className="font-semibold">{normalizedStatus || "PENDING"}</span>
      </p>
    </div>
  );
};

const LoanApplication = ({ user }: LoanApplicationProps) => {
  const [showApplyLoan, setShowApplyLoan] = useState(false);
  const [showLoanStatus, setShowLoanStatus] = useState(false);
  const [showRepayments, setShowRepayments] = useState(false);
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [repaymentLoading, setRepaymentLoading] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinModalTitle, setPinModalTitle] = useState("Verify DigiPIN");
  const [pinModalConfirmLabel, setPinModalConfirmLabel] = useState("Confirm");
  const [pendingRepaymentAction, setPendingRepaymentAction] = useState<null | "EMI" | "INTEREST" | "FULL">(null);
  const [repayment, setRepayment] = useState<null | {
    loanApplicationId: string;
    activeLoanId: string;
    totalEmis: number;
    paidEmis: number;
    pendingEmis: number;
    outstandingAmount: number;
    interestDueNow: number;
    emis: Array<{
      id: string;
      emiNumber: number;
      dueDate: string;
      amount: number;
      status: "PAID" | "PENDING";
      paidAt?: string;
    }>;
  }>(null);
  const [processing, setProcessing] = useState(false);
  const [stripeInitializing, setStripeInitializing] = useState(false);
  const [stripeModalOpen, setStripeModalOpen] = useState(false);
  const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
  const [stripeTitle, setStripeTitle] = useState("Stripe Payment");
  const [paymentMethodOpen, setPaymentMethodOpen] = useState(false);
  const [pendingPaymentMethodAction, setPendingPaymentMethodAction] = useState<null | "EMI" | "INTEREST" | "FULL">(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [loanDetails, setLoanDetails] = useState<LoanDetailsResponse | null>(null);
  const [nocDownloading, setNocDownloading] = useState(false);
  const [nocRequesting, setNocRequesting] = useState(false);

  const toast = useToast();

  useEffect(() => {
    refreshLoans();
  }, []);

  const refreshLoans = async () => {
    const data = await UserService.getLoan();
    setLoans(Array.isArray(data) ? data : []);
  };

  const refreshRepayments = async (loanApplicationId: string) => {
    setRepaymentLoading(true);
    try {
      const res: RepaymentSummary = await RepaymentService.getSummary(loanApplicationId);
      setRepayment({
        loanApplicationId: res.loan_application_id,
        activeLoanId: res.active_loan_id,
        totalEmis: res.total_emis,
        paidEmis: res.paid_emis,
        pendingEmis: res.pending_emis,
        outstandingAmount: res.outstanding_amount,
        interestDueNow: res.interest_due_now,
        emis: (res.emis || []).map((e: RepaymentRow) => ({
          id: e._id,
          emiNumber: e.emi_number,
          dueDate: e.due_date,
          amount: e.emi_amount,
          status: e.status,
          paidAt: e.paid_at,
        })),
      });
    } catch (e: unknown) {
      const maybe = e as { response?: { data?: { detail?: string } } };
      toast.push({
        type: "error",
        message: maybe?.response?.data?.detail || "Failed to fetch repayment summary",
      });
      setRepayment(null);
    } finally {
      setRepaymentLoading(false);
    }
  };

  const handleRepaymentAction = async (pin: string) => {
    if (!repayment || !pendingRepaymentAction) return;

    setProcessing(true);
    try {
      const actionMap: Record<"EMI" | "INTEREST" | "FULL", () => Promise<void>> = {
        EMI: async () => {
          const nextEmi = repayment.emis.find((e) => e.status === "PENDING");
          if (!nextEmi) {
            toast.push({ type: "error", message: "No pending EMI found" });
            return;
          }
          await RepaymentService.payEmi(repayment.loanApplicationId, pin);
          toast.push({ type: "success", message: "EMI paid successfully" });
        },
        INTEREST: async () => {
          await RepaymentService.payInterestOnly(repayment.loanApplicationId, pin);
          toast.push({ type: "success", message: "Interest paid successfully" });
        },
        FULL: async () => {
          await RepaymentService.payFull(repayment.loanApplicationId, pin);
          toast.push({ type: "success", message: "Full amount paid successfully" });
        },
      };

      await actionMap[pendingRepaymentAction]();
      await refreshRepayments(repayment.loanApplicationId);
      setPinModalOpen(false);
      setPendingRepaymentAction(null);
    } catch (e: unknown) {
      const maybe = e as { response?: { data?: { detail?: string } } };
      toast.push({
        type: "error",
        message: maybe?.response?.data?.detail || "Payment failed",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleStripePayment = async (action: "EMI" | "INTEREST" | "FULL") => {
    if (!repayment) return;

    setStripeInitializing(true);
    try {
      if (action === "EMI") {
        const nextEmi = repayment.emis.find((e) => e.status === "PENDING");
        if (!nextEmi) {
          toast.push({ type: "error", message: "No pending EMI found" });
          return;
        }
        const res = await RepaymentService.createStripeIntentForEmi(nextEmi.id);
        setStripeClientSecret(res.client_secret);
        setStripeTitle("Pay EMI with Card");
        setStripeModalOpen(true);
        return;
      }

      if (action === "FULL") {
        const res = await RepaymentService.createStripeIntentForFull(repayment.loanApplicationId);
        setStripeClientSecret(res.client_secret);
        setStripeTitle("Pay Full Amount with Card");
        setStripeModalOpen(true);
        return;
      }

      const res = await RepaymentService.createStripeIntentForInterest(repayment.loanApplicationId);
      setStripeClientSecret(res.client_secret);
      setStripeTitle("Pay Interest with Card");
      setStripeModalOpen(true);
    } catch (e: unknown) {
      const maybe = e as { response?: { data?: { detail?: string } } };
      toast.push({
        type: "error",
        message: maybe?.response?.data?.detail || "Failed to initialize Stripe payment",
      });
    } finally {
      setStripeInitializing(false);
    }
  };

  const openPaymentMethod = (action: "EMI" | "INTEREST" | "FULL") => {
    setPendingPaymentMethodAction(action);
    setPaymentMethodOpen(true);
  };

  const canApplyLoan = user.kycStatus === "COMPLETED" && user.accountStatus === "APPROVED";
  const isMinorUser = Boolean(user.isMinor);
  const canApplyLoanFinal = canApplyLoan && !isMinorUser;
  const hasOpenLoan = loans.some(
    (l) => l.status && !["CLOSED", "REJECTED"].includes(String(l.status).toUpperCase())
  );
  const activeLoanApp = loans.find((l) =>
    ["APPROVED", "FINALIZED", "CLOSED", "PENDING", "MANUAL_REVIEW", "ESCALATED"].includes(
      String(l.status || "").toUpperCase()
    )
  );
  const hasRepayableLoan =
    Boolean(activeLoanApp?.loan_id) &&
    Boolean(activeLoanApp?.active_loan_id) &&
    Boolean(activeLoanApp?.disbursed) &&
    ["APPROVED", "FINALIZED", "CLOSED"].includes(String(activeLoanApp?.status || "").toUpperCase());
  const noLoansYet = loans.length === 0;
  const noLoansTooltip =
    "You have not applied for any loan yet. Click 'Apply for Loan' to apply for a loan.";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Tooltip
          content={
            hasOpenLoan
              ? "You already have a pending/active loan. Close it before applying again."
              : !canApplyLoanFinal
              ? isMinorUser
                ? "Loan application is not allowed for users under 18."
                : "Loan application is available only after bank approval."
              : "Click to apply for a new loan."
          }
        >
          <button
            onClick={() => {
              if (!canApplyLoanFinal) {
                toast.push({
                  type: "error",
                  message: isMinorUser
                    ? "Loan application is not allowed for users under 18."
                    : "Loan application is available only after bank approval.",
                });
                return;
              }
              if (hasOpenLoan) {
                toast.push({
                  type: "error",
                  message: "You already have a pending/active loan. Close it before applying again.",
                });
                return;
              }
              setShowApplyLoan((v) => !v);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50 hover:shadow-sm transition"
            disabled={hasOpenLoan || !canApplyLoanFinal}
          >
            {showApplyLoan ? "Close Apply Loan" : "Apply for Loan"}
          </button>
        </Tooltip>

        <Tooltip content={noLoansYet ? noLoansTooltip : "View your loan application history."}>
          <span className={noLoansYet ? "inline-flex opacity-70" : "inline-flex"}>
            <button
              onClick={async () => {
                await refreshLoans();
                setShowLoanStatus((v) => !v);
              }}
              className="px-4 py-2 border rounded hover:bg-gray-50 hover:shadow-sm transition disabled:cursor-not-allowed"
              disabled={noLoansYet}
            >
              {showLoanStatus ? "Hide Loan Applications" : "View Loan Applications"}
            </button>
          </span>
        </Tooltip>

        <Tooltip content={noLoansYet ? noLoansTooltip : "Show repayment options and EMI schedule."}>
          <span className={noLoansYet ? "inline-flex opacity-70" : "inline-flex"}>
            <button
              onClick={async () => {
                if (!activeLoanApp?.loan_id) {
                  toast.push({ type: "error", message: "No loan found for repayment" });
                  return;
                }
                if (!hasRepayableLoan) {
                  toast.push({
                    type: "info",
                    message: "Repayment options are available after loan is approved and disbursed.",
                  });
                  setShowRepayments(true);
                  setRepayment(null);
                  return;
                }

                const next = !showRepayments;
                setShowRepayments(next);
                if (next) {
                  await refreshRepayments(activeLoanApp.loan_id);
                }
              }}
              className="px-4 py-2 border rounded hover:bg-gray-50 hover:shadow-sm transition disabled:cursor-not-allowed"
              disabled={noLoansYet}
            >
              {showRepayments ? "Hide Repayments" : "Show Repayments"}
            </button>
          </span>
        </Tooltip>
      </div>

      {hasOpenLoan && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
          Existing loan found with non-closed status. You can apply for a new loan only after loan closure.
        </div>
      )}
      {!canApplyLoanFinal && (
        <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded p-3">
          {isMinorUser
            ? "Loan application is blocked because user is under 18."
            : "Complete KYC and wait for Bank Manager approval before applying for a loan."}
        </div>
      )}

      {showApplyLoan && (
        <ApplyLoanForm
          user={user}
          disabled={hasOpenLoan || !canApplyLoanFinal}
          onApplied={async () => {
            await refreshLoans();
            setShowLoanStatus(true);
          }}
        />
      )}

      {showLoanStatus && (
        <div className="border rounded p-4 bg-gray-50 space-y-3">
          <h3 className="font-semibold text-gray-900">Loan Applications</h3>
          {loans.length === 0 ? (
            <div className="text-sm text-gray-500">No loan applications found.</div>
          ) : (
            <div className="overflow-x-auto border rounded bg-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left">Loan ID</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-left">Amount</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Applied At</th>
                    <th className="px-3 py-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map((loan) => (
                    <tr key={loan.loan_id} className="border-t">
                      <td className="px-3 py-2">{loan.loan_id || "-"}</td>
                      <td className="px-3 py-2">{loan.loan_type || "-"}</td>
                      <td className="px-3 py-2">
                        {loan.loan_amount ? `Rs. ${Number(loan.loan_amount).toLocaleString("en-IN")}` : "-"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                            loan.status === "APPROVED"
                              ? "bg-green-100 text-green-800"
                              : loan.status === "REJECTED"
                              ? "bg-red-100 text-red-800"
                              : loan.status === "PENDING"
                              ? "bg-yellow-100 text-yellow-800"
                              : loan.status === "CLOSED"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {loan.status || "-"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {loan.applied_at ? new Date(loan.applied_at).toLocaleDateString("en-IN") : "-"}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="px-3 py-1.5 border rounded hover:bg-gray-50"
                          onClick={async () => {
                            if (!loan.loan_id) return;
                            setSelectedLoanId(loan.loan_id);
                            setDetailsError(null);
                            setLoanDetails(null);
                            setDetailsOpen(true);
                            setDetailsLoading(true);
                            try {
                              const d = await LoanDetailsService.getDetails(loan.loan_id);
                              setLoanDetails(d);
                            } catch (e: unknown) {
                              const maybe = e as { response?: { data?: { detail?: string } } };
                              setDetailsError(maybe?.response?.data?.detail || "Failed to load loan details");
                            } finally {
                              setDetailsLoading(false);
                            }
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showRepayments && (
        <div className="border rounded p-4 bg-gray-50 space-y-3">
          {!hasRepayableLoan ? (
            <div className="text-sm text-gray-700">
              Repayment panel will appear here after the loan is approved and disbursed to your bank account.
            </div>
          ) : repaymentLoading ? (
            <div className="text-sm text-gray-500">Loading repayment summary...</div>
          ) : repayment ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="bg-white border rounded p-3">
                  <div className="text-xs text-gray-500">Total EMIs</div>
                  <div className="text-lg font-semibold">{repayment.totalEmis}</div>
                </div>
                <div className="bg-white border rounded p-3">
                  <div className="text-xs text-gray-500">Paid EMIs</div>
                  <div className="text-lg font-semibold">{repayment.paidEmis}</div>
                </div>
                <div className="bg-white border rounded p-3">
                  <div className="text-xs text-gray-500">Pending EMIs</div>
                  <div className="text-lg font-semibold">{repayment.pendingEmis}</div>
                </div>
                <div className="bg-white border rounded p-3">
                  <div className="text-xs text-gray-500">Outstanding Amount</div>
                  <div className="text-lg font-semibold">
                    Rs. {Number(repayment.outstandingAmount).toLocaleString("en-IN")}
                  </div>
                </div>
                <div className="bg-white border rounded p-3">
                  <div className="text-xs text-gray-500">Interest Due Now</div>
                  <div className="text-lg font-semibold">
                    Rs. {Number(repayment.interestDueNow).toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={async () => {
                    if (!repayment.loanApplicationId) return;
                    openPaymentMethod("EMI");
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
                  disabled={processing || repayment.pendingEmis <= 0}
                >
                  Pay EMI
                </button>

                <button
                  onClick={async () => {
                    if (!repayment.loanApplicationId) return;
                    openPaymentMethod("INTEREST");
                  }}
                  className="px-4 py-2 border rounded disabled:opacity-50"
                  disabled={processing || repayment.pendingEmis <= 0}
                >
                  Pay Interest Only
                </button>

                <button
                  onClick={async () => {
                    if (!repayment.loanApplicationId) return;
                    openPaymentMethod("FULL");
                  }}
                  className="px-4 py-2 border border-red-300 text-red-700 rounded disabled:opacity-50"
                  disabled={processing || repayment.pendingEmis <= 0}
                >
                  Pay Full Amount
                </button>
              </div>

              <div className="overflow-x-auto border rounded bg-white">
                {repayment.emis.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500">No EMI schedule found.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left">EMI No</th>
                        <th className="px-3 py-2 text-left">Due Date</th>
                        <th className="px-3 py-2 text-left">Amount</th>
                        <th className="px-3 py-2 text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {repayment.emis.map((e) => (
                        <tr key={e.id} className="border-t">
                          <td className="px-3 py-2">{e.emiNumber}</td>
                          <td className="px-3 py-2">
                            {e.dueDate ? new Date(e.dueDate).toLocaleDateString("en-IN") : "-"}
                          </td>
                          <td className="px-3 py-2">Rs. {Number(e.amount).toLocaleString("en-IN")}</td>
                          <td className="px-3 py-2">{e.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {detailsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div>
                <div className="text-lg font-semibold text-gray-900">Loan Details</div>
                <div className="text-xs text-gray-500 break-all">{selectedLoanId || ""}</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDetailsOpen(false);
                  setSelectedLoanId(null);
                  setLoanDetails(null);
                  setDetailsError(null);
                }}
                className="px-3 py-1.5 border rounded hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="min-h-0 overflow-y-auto p-5 space-y-4">
              {detailsLoading ? (
                <div className="text-sm text-gray-600">Loading loan details...</div>
              ) : detailsError ? (
                <div className="text-sm text-red-600">{detailsError}</div>
              ) : loanDetails ? (
                <>
                  <div className="rounded border p-3 bg-gray-50">
                    <div className="text-xs text-gray-500 mb-2">Loan Process</div>
                    <LoanProgressBar
                      status={loanDetails.application_status || undefined}
                      systemDecision={loanDetails.system_decision || undefined}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded border p-3">
                      <div className="text-xs text-gray-500">Loan Amount</div>
                      <div className="text-lg font-semibold">
                        Rs. {Number(loanDetails.loan_amount || 0).toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div className="rounded border p-3">
                      <div className="text-xs text-gray-500">Tenure</div>
                      <div className="text-lg font-semibold">
                        {loanDetails.tenure_months ? `${loanDetails.tenure_months} months` : "-"}
                      </div>
                    </div>
                    <div className="rounded border p-3">
                      <div className="text-xs text-gray-500">Application Status</div>
                      <div className="text-lg font-semibold">{loanDetails.application_status || "-"}</div>
                    </div>
                    <div className="rounded border p-3">
                      <div className="text-xs text-gray-500">Active Loan Status</div>
                      <div className="text-lg font-semibold">{loanDetails.active_loan_status || "-"}</div>
                    </div>
                    <div className="rounded border p-3">
                      <div className="text-xs text-gray-500">Interest Rate</div>
                      <div className="text-lg font-semibold">
                        {typeof loanDetails.interest_rate === "number" ? `${loanDetails.interest_rate}%` : "-"}
                      </div>
                    </div>
                    <div className="rounded border p-3">
                      <div className="text-xs text-gray-500">EMI Amount</div>
                      <div className="text-lg font-semibold">
                        {typeof loanDetails.emi_amount === "number"
                          ? `Rs. ${Number(loanDetails.emi_amount).toLocaleString("en-IN")}`
                          : "-"}
                      </div>
                    </div>
                    <div className="rounded border p-3">
                      <div className="text-xs text-gray-500">EMI Remaining</div>
                      <div className="text-lg font-semibold">
                        {typeof loanDetails.repayments?.emi_remaining === "number"
                          ? loanDetails.repayments.emi_remaining
                          : "-"}
                      </div>
                    </div>
                    <div className="rounded border p-3">
                      <div className="text-xs text-gray-500">Outstanding Amount</div>
                      <div className="text-lg font-semibold">
                        {typeof loanDetails.repayments?.outstanding_amount === "number"
                          ? `Rs. ${Number(loanDetails.repayments.outstanding_amount).toLocaleString("en-IN")}`
                          : "-"}
                      </div>
                    </div>
                  </div>

                  <div className="rounded border p-3">
                    <div className="text-xs text-gray-500">Approved By</div>
                    <div className="text-sm text-gray-900 mt-1">
                      {loanDetails.approved_by?.name
                        ? `${loanDetails.approved_by.name}${loanDetails.approved_by.phone ? ` (${loanDetails.approved_by.phone})` : ""}`
                        : loanDetails.approved_by?.id
                        ? loanDetails.approved_by.id
                        : "-"}
                    </div>
                  </div>

                  <div className="rounded border p-3">
                    <div className="text-xs text-gray-500">Penalties</div>
                    <div className="text-sm text-gray-900 mt-1">
                      {loanDetails.penalties_total ? `Rs. ${Number(loanDetails.penalties_total).toLocaleString("en-IN")}` : "None"}
                    </div>
                  </div>

                  <div className="rounded border p-3">
                    <div className="text-xs text-gray-500">NOC Status</div>
                    {(() => {
                      const nocStatus = loanDetails.noc?.status || "NOT_REQUESTED";
                      const canRequestNoc = Boolean(
                        loanDetails.application_status === "CLOSED" &&
                        (loanDetails.noc?.can_request || ["NOT_REQUESTED", "REJECTED"].includes(nocStatus))
                      );
                      const canDownloadNoc = Boolean(loanDetails.noc?.can_download);

                      return (
                        <>
                    <div className="text-sm text-gray-900 mt-1">
                            {nocStatus}
                    </div>
                          <div className="text-xs text-gray-600 mt-1">
                            Requested At: {loanDetails.noc?.requested_at || "-"}
                          </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Reference: {loanDetails.noc?.reference_no || "-"}
                    </div>
                    <div className="text-xs text-gray-600">
                      Approved By: {loanDetails.noc?.approved_by?.name || "-"}
                    </div>
                          <div className="text-xs text-gray-600">
                            Rejected At: {loanDetails.noc?.rejected_at || "-"}
                          </div>
                          <div className="text-xs text-gray-600">
                            Rejection Reason: {loanDetails.noc?.rejection_reason || "-"}
                          </div>
                    <div className="text-xs text-gray-600">
                      Monify Stamp: Applied on generated NOC PDF
                    </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="px-3 py-1.5 border rounded bg-white hover:bg-gray-50 disabled:opacity-50"
                              disabled={!selectedLoanId || !canRequestNoc || nocRequesting || nocDownloading}
                              onClick={async () => {
                                if (!selectedLoanId) return;
                                try {
                                  setNocRequesting(true);
                                  await LoanDetailsService.requestNoc(selectedLoanId);
                                  const updated = await LoanDetailsService.getDetails(selectedLoanId);
                                  setLoanDetails(updated);
                                  await refreshLoans();
                                  toast.push({ type: "success", message: "NOC request raised successfully" });
                                } catch (e: unknown) {
                                  const maybe = e as { response?: { data?: { detail?: string } } };
                                  toast.push({
                                    type: "error",
                                    message: maybe?.response?.data?.detail || "Failed to raise NOC request",
                                  });
                                } finally {
                                  setNocRequesting(false);
                                }
                              }}
                            >
                              {nocRequesting ? "Requesting..." : "Request NOC"}
                            </button>
                      <button
                        type="button"
                        className="px-3 py-1.5 border rounded bg-white hover:bg-gray-50 disabled:opacity-50"
                              disabled={!canDownloadNoc || nocDownloading || nocRequesting}
                        onClick={async () => {
                          if (!selectedLoanId) return;
                          try {
                            setNocDownloading(true);
                            const blob = await LoanDetailsService.downloadNoc(selectedLoanId);
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `Monify_NOC_${selectedLoanId}.pdf`;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            URL.revokeObjectURL(url);
                            toast.push({ type: "success", message: "NOC downloaded successfully" });
                          } catch (e: unknown) {
                            const maybe = e as { response?: { data?: { detail?: string } } };
                            toast.push({
                              type: "error",
                              message: maybe?.response?.data?.detail || "Failed to download NOC",
                            });
                          } finally {
                            setNocDownloading(false);
                          }
                        }}
                      >
                        {nocDownloading ? "Downloading..." : "Download NOC"}
                      </button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-600">No details available.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {pinModalOpen && (
        <PinPromptModal
          title={pinModalTitle}
          confirmLabel={pinModalConfirmLabel}
          isOpen={pinModalOpen}
          onConfirm={handleRepaymentAction}
          onClose={() => {
            setPinModalOpen(false);
            setPendingRepaymentAction(null);
          }}
          loading={processing}
        />
      )}

      {paymentMethodOpen && pendingPaymentMethodAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-white shadow-lg border border-gray-200">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="text-lg font-semibold text-gray-900">Choose Payment Method</div>
              <button
                type="button"
                onClick={() => {
                  setPaymentMethodOpen(false);
                  setPendingPaymentMethodAction(null);
                }}
                className="px-3 py-1.5 border rounded hover:bg-gray-50"
              >
                Close
              </button>
            </div>
            <div className="p-5 space-y-3">
              <button
                onClick={() => {
                  setPaymentMethodOpen(false);
                  if (!pendingPaymentMethodAction) return;
                  setPendingRepaymentAction(pendingPaymentMethodAction);
                  if (pendingPaymentMethodAction === "EMI") {
                    setPinModalTitle("Pay EMI");
                    setPinModalConfirmLabel("Pay EMI");
                  } else if (pendingPaymentMethodAction === "INTEREST") {
                    setPinModalTitle("Pay Interest Only");
                    setPinModalConfirmLabel("Pay Interest");
                  } else {
                    setPinModalTitle("Pay Full Amount");
                    setPinModalConfirmLabel("Pay Full");
                  }
                  setPinModalOpen(true);
                }}
                className="w-full px-4 py-2 border rounded hover:bg-gray-50"
              >
                Pay with Wallet (DigiPIN)
              </button>
              <button
                onClick={() => {
                  setPaymentMethodOpen(false);
                  if (pendingPaymentMethodAction) {
                    handleStripePayment(pendingPaymentMethodAction);
                  }
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
                disabled={stripeInitializing}
              >
                Pay with Card (Stripe)
              </button>
            </div>
          </div>
        </div>
      )}

      {stripeModalOpen && (
        <StripePaymentModal
          isOpen={stripeModalOpen}
          clientSecret={stripeClientSecret}
          title={stripeTitle}
          onClose={() => {
            setStripeModalOpen(false);
            setStripeClientSecret(null);
          }}
          onSuccess={async (paymentIntentId) => {
            toast.push({
              type: "success",
              message: "Payment confirmed. Updating repayment status...",
            });
            try {
              await RepaymentService.verifyStripePaymentIntent(paymentIntentId);
            } catch (e: unknown) {
              const maybe = e as { response?: { data?: { detail?: string } } };
              toast.push({
                type: "error",
                message: maybe?.response?.data?.detail || "Failed to verify payment with server",
              });
            } finally {
              setStripeModalOpen(false);
              setStripeClientSecret(null);
              if (repayment?.loanApplicationId) {
                await refreshRepayments(repayment.loanApplicationId);
              }
            }
          }}
        />
      )}
    </div>
  );
};

export default LoanApplication;
