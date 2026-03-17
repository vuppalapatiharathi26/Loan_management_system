import { useState } from "react";
import type { User } from "../../../types/user";
import { UserService } from "../../../services/user.service";
import { UploadService } from "../../../services/upload.service";
import { LoanPreviewService } from "../../../services/loanPreview.service";
import type { LoanPreviewResponse } from "../../../services/loanPreview.service";
import ButtonLoader from "../../loaders/ButtonLoader";
import EmiCalculationLoader from "../../loaders/EmiCalculationLoader";

interface Props {
  user: User;
  disabled?: boolean;
  onApplied?: () => Promise<void> | void;
}

const getErrorMessage = (error: unknown, fallback: string) => {
  const maybe = error as { response?: { data?: { detail?: string } } };
  return maybe?.response?.data?.detail || fallback;
};

const unformatNumber = (value: string) => value.replace(/,/g, "");
const formatNumber = (value: string) => {
  if (!value) return "";
  return Number(value).toLocaleString("en-IN");
};

const ApplyLoanForm = ({ user, disabled = false, onApplied }: Props) => {
  const [loanAmount, setLoanAmount] = useState("");
  const [tenure, setTenure] = useState<number>(12);
  const [reason, setReason] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [monthlyIncomeLocked, setMonthlyIncomeLocked] = useState(false);
  const [occupation] = useState(user.occupation || "");
  const [pendingEmis, setPendingEmis] = useState("0");
  const [previousLoans, setPreviousLoans] = useState("0");
  const [incomeSlipUrl, setIncomeSlipUrl] = useState("");
  const [incomeSlipFile, setIncomeSlipFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingSlip, setDeletingSlip] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadInfo, setUploadInfo] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const [serverPreview, setServerPreview] = useState<LoanPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);
  const [acceptedInstructions, setAcceptedInstructions] = useState(false);

  const validate = () => {
    if (!acceptedInstructions) return "Please accept the loan application declaration";
    if (!loanAmount) return "Loan amount is required";
    const loanAmountNum = Number(unformatNumber(loanAmount));
    if (!Number.isFinite(loanAmountNum) || loanAmountNum < 1 || loanAmountNum > 5_000_000) {
      return "Loan amount must be between 1 and 50,00,000";
    }
    if (!monthlyIncomeLocked || !monthlyIncome) {
      return "Gross salary could not be extracted from payslip. Please upload another payslip PDF."
    }
    const monthlyIncomeNum = Number(monthlyIncome);
    if (!Number.isFinite(monthlyIncomeNum) || monthlyIncomeNum < 1 || monthlyIncomeNum > 1_000_000) {
      return "Monthly income must be between 1 and 10,00,000";
    }
    if (!occupation.trim()) return "Occupation is required";
    if (occupation.trim().length < 1 || occupation.trim().length > 25) {
      return "Occupation must be between 1 and 25 characters";
    }
    const pendingEmisNum = Number(pendingEmis);
    if (!Number.isInteger(pendingEmisNum) || pendingEmisNum < 0) {
      return "Pending EMIs must be a whole number (0 or more)";
    }
    const previousLoansNum = Number(previousLoans);
    if (!Number.isInteger(previousLoansNum) || previousLoansNum < 0) {
      return "Previous loans must be a whole number (0 or more)";
    }
    if (!incomeSlipUrl.trim()) return "Income slip URL is required";
    return null;
  };

  const previewPayload = {
    loan_amount: Number(unformatNumber(loanAmount)),
    tenure_months: tenure,
    monthly_income: Number(monthlyIncome),
    occupation: occupation.trim(),
    income_slip_url: incomeSlipUrl.trim(),
    pending_emis: Number(pendingEmis),
    previous_loans: Number(previousLoans),
  };

  return (
    <div className="max-w-3xl space-y-4">
      <div className="border rounded-lg p-4 bg-emerald-50 border-emerald-200">
        <h4 className="font-semibold text-emerald-900">General Loan Application Instructions</h4>
        <label className="mt-3 flex items-start gap-2 text-sm text-emerald-900">
          <input
            type="checkbox"
            checked={acceptedInstructions}
            onChange={(e) => setAcceptedInstructions(e.target.checked)}
            disabled={disabled}
            className="mt-1"
          />
          <span>I confirm that the information provided is true and correct.</span>
        </label>
        <ul className="mt-3 list-disc pl-5 text-sm text-emerald-900 space-y-1">
          <li>Applicant must be 18+ years old.</li>
          <li>PAN and Aadhaar must be valid.</li>
          <li>Monthly income proof must be uploaded.</li>
          <li>Loan amount must be within eligible range.</li>
          <li>One active loan at a time.</li>
          <li>Fake documents will lead to rejection.</li>
          <li>Bank reserves the right to reject the application.</li>
          <li>Delay in payment leads to fine.</li>
          <li>The loan manager will review and decide the loan process.</li>
        </ul>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Loan Amount</label>
        <input
          type="text"
          inputMode="numeric"
          value={loanAmount}
          onChange={(e) => {
            const raw = unformatNumber(e.target.value);
            if (/^\d*$/.test(raw)) {
              const noLeadingZero = raw.replace(/^0+(?!$)/, "");
              setLoanAmount(formatNumber(noLeadingZero));
            }
          }}
          placeholder="Enter loan amount"
          className="w-full border rounded px-3 py-2"
          disabled={disabled}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Reason for Loan</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full border rounded px-3 py-2"
          rows={3}
          disabled={disabled}
        />
        <div className="text-xs text-gray-500 mt-1">Required only when submitting the loan application.</div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Monthly Income</label>
        <input
          type="number"
          min={1}
          max={1000000}
          value={monthlyIncome}
          readOnly
          className="w-full border rounded px-3 py-2"
          placeholder="Auto-filled from uploaded payslip (Gross Salary)"
          disabled={disabled || !monthlyIncomeLocked}
        />
        <div className="text-xs text-gray-500 mt-1">
          Monthly income is auto-filled from gross salary in the uploaded payslip and cannot be edited manually.
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Occupation</label>
        <input
          type="text"
          value={occupation}
          className="w-full border rounded px-3 py-2"
          placeholder="Fetched from your KYC profile"
          minLength={1}
          maxLength={25}
          readOnly
          disabled={disabled}
        />
        <div className="mt-1 text-xs text-gray-500">
          Occupation is fixed from your KYC profile and cannot be edited here.
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Pending EMIs</label>
        <input
          type="number"
          min={0}
          step={1}
          value={pendingEmis}
          onChange={(e) => setPendingEmis(e.target.value)}
          className="w-full border rounded px-3 py-2"
          placeholder="Enter current pending EMI count"
          disabled={disabled}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Previous Loans</label>
        <input
          type="number"
          min={0}
          step={1}
          value={previousLoans}
          onChange={(e) => setPreviousLoans(e.target.value)}
          className="w-full border rounded px-3 py-2"
          placeholder="Enter previously closed loan count"
          disabled={disabled}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Income Slip URL</label>
        <input
          type="url"
          value={incomeSlipUrl}
          onChange={(e) => setIncomeSlipUrl(e.target.value)}
          className="w-full border rounded px-3 py-2"
          placeholder="https://example.com/payslip.pdf"
          disabled={disabled}
        />
        <div className="mt-2 space-y-2">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              setUploadError(null);
              const f = e.target.files?.[0] || null;
              setIncomeSlipFile(f);
            }}
            disabled={disabled || uploading || deletingSlip}
            className="block w-full text-sm"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={async () => {
              if (!incomeSlipFile) {
                setUploadError("Please choose a PDF file first");
                return;
              }
              setUploadError(null);
              setUploadInfo(null);
              setUploading(true);
              setMonthlyIncomeLocked(false);
              setMonthlyIncome("");
              try {
                const res = await UploadService.uploadIncomeSlip(incomeSlipFile);
                setIncomeSlipUrl(res.url);
                if (
                  res.extraction_status === "FOUND" &&
                  typeof res.extracted_monthly_income === "number" &&
                  Number.isFinite(res.extracted_monthly_income)
                ) {
                  setMonthlyIncome(String(Math.round(res.extracted_monthly_income)));
                  setMonthlyIncomeLocked(true);
                } else {
                  setMonthlyIncomeLocked(false);
                  setUploadError(
                    res.extraction_message ||
                      "Could not extract gross salary from this document. Please upload another payslip PDF."
                  );
                }
                if (res.extraction_message) {
                  setUploadInfo(res.extraction_message);
                }
              } catch (e: unknown) {
                setUploadError(getErrorMessage(e, "Upload failed"));
              } finally {
                setUploading(false);
              }
              }}
              disabled={disabled || uploading || deletingSlip || !incomeSlipFile}
              className="px-4 py-2 border rounded disabled:opacity-50 h-11"
            >
              {uploading ? "Uploading..." : "Upload PDF"}
            </button>
            {incomeSlipUrl && (
              <>
              <button
                type="button"
                onClick={async () => {
                  try {
                    setUploadError(null);
                    const blob = await UploadService.fetchIncomeSlipBlobByUrl(incomeSlipUrl);
                    const url = URL.createObjectURL(blob);
                    window.open(url, "_blank", "noopener,noreferrer");
                    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
                  } catch (e: unknown) {
                    setUploadError(getErrorMessage(e, "Failed to open uploaded payslip"));
                  }
                }}
                className="px-4 py-2 border rounded h-11"
                disabled={disabled || uploading || deletingSlip}
              >
                View Uploaded PDF
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    setUploadError(null);
                    setUploadInfo(null);
                    setDeletingSlip(true);
                    const parsed = new URL(incomeSlipUrl);
                    const fileName = parsed.pathname.split("/").pop() || "";
                    if (!fileName) {
                      setUploadError("Unable to determine uploaded file name for deletion.");
                      return;
                    }
                    await UploadService.deleteIncomeSlip(fileName);
                    setIncomeSlipUrl("");
                    setIncomeSlipFile(null);
                    setMonthlyIncome("");
                    setMonthlyIncomeLocked(false);
                    setUploadInfo("Uploaded payslip removed successfully. Please upload again.");
                  } catch (e: unknown) {
                    setUploadError(getErrorMessage(e, "Failed to delete uploaded payslip"));
                  } finally {
                    setDeletingSlip(false);
                  }
                }}
                className="px-4 py-2 border border-red-300 text-red-700 rounded disabled:opacity-50 h-11"
                disabled={disabled || uploading || deletingSlip}
              >
                {deletingSlip ? "Deleting..." : "Delete Uploaded PDF"}
              </button>
              </>
            )}
            {incomeSlipUrl ? (
              <span className="text-xs text-green-700">Uploaded and linked</span>
            ) : (
              <span className="text-xs text-gray-500">Upload your local PDF to auto-fill the URL</span>
            )}
          </div>
        </div>
        {uploadError && <div className="text-sm text-red-600 mt-1">{uploadError}</div>}
        {uploadInfo && <div className="text-sm text-blue-700 mt-1">{uploadInfo}</div>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Tenure (Months)</label>
        <select
          value={tenure}
          onChange={(e) => setTenure(Number(e.target.value))}
          className="w-full border rounded px-3 py-2"
          disabled={disabled}
        >
          {[6, 12, 18, 24, 36].map((m) => (
            <option key={m} value={m}>
              {m} Months
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={async () => {
          setServerPreview(null);
          setPreviewError(null);
          const validationError = validate();
          if (validationError) {
            setPreviewError(validationError);
            return;
          }

          setPreviewLoading(true);
          try {
            const res = await LoanPreviewService.preview(previewPayload);
            setServerPreview(res);
            setShowPreview(true);
          } catch (e: unknown) {
            setPreviewError(getErrorMessage(e, "Preview EMI failed"));
          } finally {
            setPreviewLoading(false);
          }
        }}
        disabled={disabled || previewLoading || uploading}
        className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
      >
        {previewLoading ? "Previewing..." : "Preview EMI"}
      </button>

      {/* EMI Calculation Loader */}
      <EmiCalculationLoader 
        isLoading={previewLoading}
        message="Calculating your EMI and eligibility..."
      />

      {previewError && <div className="text-sm text-red-600 mt-2">{previewError}</div>}

      {showPreview && serverPreview && (
        <div className="p-4 border rounded bg-blue-50 space-y-2">
          <p><strong>Loan Amount:</strong> Rs. {Number(unformatNumber(loanAmount)).toLocaleString("en-IN")}</p>
          <p><strong>Tenure:</strong> {tenure} months</p>
          <p><strong>Pending EMIs:</strong> {Number(pendingEmis)}</p>
          <p><strong>Previous Loans:</strong> {Number(previousLoans)}</p>
          <p><strong>CIBIL Score:</strong> {serverPreview.cibil_score}</p>
          <p><strong>System Decision:</strong> {serverPreview.system_decision}</p>
          <p><strong>Interest Rate:</strong> {serverPreview.interest_rate}%</p>
          <p><strong>Eligible Range:</strong> Rs. {Number(serverPreview.eligible_min_amount).toLocaleString("en-IN")} to Rs. {Number(serverPreview.eligible_max_amount).toLocaleString("en-IN")}</p>
          <p className="text-lg font-bold">
            Monthly EMI: Rs. {Number(serverPreview.emi).toLocaleString("en-IN")}
          </p>
          <p>
            <strong>Total Payable:</strong> Rs. {(Number(serverPreview.emi) * tenure).toLocaleString("en-IN")}
          </p>

          {applyError && <div className="text-sm text-red-600">{applyError}</div>}
          {applySuccess && <div className="text-sm text-green-700">{applySuccess}</div>}

          <div className="mt-3">
            <ButtonLoader
              type="button"
              onClick={async () => {
                setApplyError(null);
                setApplySuccess(null);
                if (!acceptedInstructions) {
                  setApplyError("Please accept the loan application declaration");
                  return;
                }
                if (!reason.trim() || reason.trim().length < 10) {
                  setApplyError("Reason must be at least 10 characters");
                  return;
                }
                setApplyLoading(true);
                try {
                  const idempotency = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                  await UserService.applyForLoan(
                    {
                      loan_type: "PERSONAL",
                      loan_amount: previewPayload.loan_amount,
                      tenure_months: previewPayload.tenure_months,
                      reason: reason.trim(),
                      income_slip_url: previewPayload.income_slip_url,
                      monthly_income: previewPayload.monthly_income,
                      occupation: previewPayload.occupation,
                      pending_emis: previewPayload.pending_emis,
                      previous_loans: previewPayload.previous_loans,
                    },
                    idempotency
                  );
                  setApplySuccess("Loan application submitted");
                  if (onApplied) {
                    await onApplied();
                  }
                } catch (e: unknown) {
                  setApplyError(getErrorMessage(e, "Loan apply failed"));
                } finally {
                  setApplyLoading(false);
                }
              }}
              isLoading={applyLoading}
              loadingText="Submitting..."
              variant="primary"
              disabled={disabled || applyLoading}
              className="w-full py-2 text-sm"
            >
              Submit Loan Application
            </ButtonLoader>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplyLoanForm;
