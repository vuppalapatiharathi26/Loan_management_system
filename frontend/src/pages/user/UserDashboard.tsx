
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ClipboardList,
  Copy,
  HandCoins,
  Loader2,
  RefreshCw,
  Wallet,
} from "lucide-react";
import type { User } from "../../types/user";
import type { Transaction } from "../../types/transaction";
import { UserService } from "../../services/user.service";
import { AccountService } from "../../services/account.service";
import { RepaymentService } from "../../services/repayment.service";
import { useToast } from "../../context/ToastContext";
import ContactBankManager from "../../components/user/ContactBankManager";
import ButtonLoader from "../../components/loaders/ButtonLoader";
import CircularLoader from "../../components/loaders/CircularLoader";
import { SkeletonCard, SkeletonTable } from "../../components/loaders";
import Pagination from "../../components/common/Pagination";

const getErrorMessage = (error: unknown, fallback: string) => {
  const maybe = error as { response?: { data?: { detail?: string } } };
  return maybe?.response?.data?.detail || fallback;
};

const UserDashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number>(0);
  const [animatedBalance, setAnimatedBalance] = useState(0);
  const [balanceVisible, setBalanceVisible] = useState(false);
  const [accountNumber, setAccountNumber] = useState<string>("");
  const [ifscCode, setIfscCode] = useState<string>("");
  const [showBalancePrompt, setShowBalancePrompt] = useState(false);
  const [balancePin, setBalancePin] = useState("");
  const [checkingBalance, setCheckingBalance] = useState(false);
  const [moneyAction, setMoneyAction] = useState<"DEPOSIT" | "WITHDRAW">("DEPOSIT");
  const [amount, setAmount] = useState("");
  const [digiPin, setDigiPin] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txPage, setTxPage] = useState(1);
  const [txPageSize, setTxPageSize] = useState(10);
  const [txTotal, setTxTotal] = useState(0);
  const [txTypeFilter, setTxTypeFilter] = useState<"ALL" | "CREDIT" | "DEBIT">("ALL");
  const [activeLoansCount, setActiveLoansCount] = useState(0);
  const [nextEmiDueDate, setNextEmiDueDate] = useState<Date | null>(null);
  const [emiProgress, setEmiProgress] = useState(0);
  const [loanAmount, setLoanAmount] = useState(0);
  const [loanTenure, setLoanTenure] = useState(0);
  const [remainingPrincipal, setRemainingPrincipal] = useState(0);
  const [copySuccess, setCopySuccess] = useState(false);
  const [amountError, setAmountError] = useState("");
  const [pinError, setPinError] = useState("");
  const [formShake, setFormShake] = useState(false);
  const [countdownTick, setCountdownTick] = useState(Date.now());
  const transactionsActionRef = useRef<HTMLElement | null>(null);
  const transactionHistoryRef = useRef<HTMLElement | null>(null);

  const getCurrentMonth = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  };

  const [txMonth, setTxMonth] = useState(() => getCurrentMonth());
  const [txDay, setTxDay] = useState("");

  const navigate = useNavigate();
  const toast = useToast();

  const scrollToSection = (node: HTMLElement | null) => {
    node?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const toLocalYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const getMonthRange = (ym: string) => {
    const [yStr, mStr] = String(ym || "").split("-");
    const y = Number(yStr);
    const m = Number(mStr);
    if (!y || !m || m < 1 || m > 12) {
      return { from: undefined as string | undefined, to: undefined as string | undefined };
    }
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0);
    return { from: toLocalYMD(start), to: toLocalYMD(end) };
  };

  const formatINR = (value: number) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

  const refreshTransactions = async (opts?: {
    page?: number;
    txType?: "ALL" | "CREDIT" | "DEBIT";
    month?: string;
    day?: string;
    pageSize?: number;
  }) => {
    const page = Math.max(1, opts?.page ?? txPage);
    const nextType = opts?.txType ?? txTypeFilter;
    const nextMonth = opts?.month ?? txMonth;
    const nextDay = ((opts?.day ?? txDay) || "").trim();
    const nextPageSize = opts?.pageSize ?? txPageSize;

    const range = getMonthRange(nextMonth);
    const day = nextDay;
    const dateFrom = day ? day : range.from;
    const dateTo = day ? day : range.to;

    setTxLoading(true);
    try {
      const res = await AccountService.getTransactionsPaged({
        page,
        pageSize: nextPageSize,
        txType: nextType,
        dateFrom,
        dateTo,
      });
      setTransactions(Array.isArray(res.transactions) ? res.transactions : []);
      setTxTotal(Number(res.total || 0));
      setTxPage(page);
    } catch (e: unknown) {
      setTransactions([]);
      setTxTotal(0);
      toast.push({ type: "error", message: getErrorMessage(e, "Failed to load transactions") });
    } finally {
      setTxLoading(false);
    }
  };

  const validateAmount = (value: string, action: "DEPOSIT" | "WITHDRAW") => {
    if (!value.trim()) return "Amount is required";
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return "Enter a valid amount";
    if (n < 1) return "Minimum amount is Rs. 1";
    if (n > 1_000_000) return "Maximum amount per transaction is Rs. 10,00,000";
    if (action === "WITHDRAW" && balanceVisible && n > balance) return "Insufficient balance for this withdrawal";
    return "";
  };

  const validatePin = (value: string) => {
    if (!value.trim()) return "DigiPIN is required";
    if (!/^\d{4,6}$/.test(value)) return "DigiPIN must be 4-6 digits";
    return "";
  };

  const triggerFormShake = () => {
    setFormShake(false);
    window.setTimeout(() => setFormShake(true), 10);
    window.setTimeout(() => setFormShake(false), 450);
  };

  const copyAccountNumber = async () => {
    if (!accountNumber) return;
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopySuccess(true);
      toast.push({ type: "success", message: "Account number copied" });
      window.setTimeout(() => setCopySuccess(false), 1300);
    } catch {
      toast.push({ type: "error", message: "Unable to copy account number" });
    }
  };

  const triggerTransactions = async () => {
    try {
      const txs = await AccountService.getTransactions(200);
      setAllTransactions(Array.isArray(txs) ? txs : []);
    } catch {
      setAllTransactions([]);
    }
  };

  const loadLoanSnapshot = async () => {
    try {
      const loans = await UserService.getLoan();
      const loanRows = Array.isArray(loans) ? loans : [];
      const activeLoans = loanRows.filter((loan: { status?: string }) =>
        !["CLOSED", "REJECTED"].includes(String(loan.status || "").toUpperCase())
      );
      setActiveLoansCount(activeLoans.length);

      const repayableLoan = loanRows.find(
        (loan: { loan_id?: string; active_loan_id?: string | null; disbursed?: boolean; status?: string }) =>
          Boolean(loan.loan_id) &&
          Boolean(loan.active_loan_id) &&
          Boolean(loan.disbursed) &&
          ["APPROVED", "FINALIZED", "CLOSED"].includes(String(loan.status || "").toUpperCase())
      );

      if (!repayableLoan?.loan_id) {
        setEmiProgress(0);
        setNextEmiDueDate(null);
        setLoanAmount(0);
        setLoanTenure(0);
        setRemainingPrincipal(0);
        return;
      }

      setLoanAmount(Number(repayableLoan.loan_amount || 0));
      setLoanTenure(Number(repayableLoan.tenure_months || 0));

      const summary = await RepaymentService.getSummary(repayableLoan.loan_id);
      const total = Number(summary?.total_emis || 0);
      const paid = Number(summary?.paid_emis || 0);
      setEmiProgress(total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0);
      setRemainingPrincipal(Number(summary?.outstanding_amount || 0));

      const nextPending = (summary?.emis || [])
        .filter((emi) => emi.status === "PENDING" && emi.due_date)
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];
      setNextEmiDueDate(nextPending?.due_date ? new Date(nextPending.due_date) : null);
    } catch {
      setActiveLoansCount(0);
      setEmiProgress(0);
      setNextEmiDueDate(null);
      setLoanAmount(0);
      setLoanTenure(0);
      setRemainingPrincipal(0);
    }
  };

  const sparklinePath = useMemo(() => {
    const pointsBase =
      allTransactions
        .slice(0, 16)
        .reverse()
        .map((tx) => Number(tx.balanceAfter || 0))
        .filter((v) => Number.isFinite(v) && v >= 0) || [];

    const points =
      pointsBase.length >= 2
        ? pointsBase
        : [0.72, 0.78, 0.74, 0.82, 0.9, 0.86, 0.95, 1].map((ratio) => Math.max(0, balance * ratio));

    const max = Math.max(...points, 1);
    const min = Math.min(...points, 0);
    const spread = max - min || 1;
    const width = 220;
    const height = 82;

    return points
      .map((v, idx) => {
        const x = (idx / (points.length - 1 || 1)) * width;
        const y = height - ((v - min) / spread) * (height - 8) - 4;
        return `${idx === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
  }, [allTransactions, balance]);

  const monthlyFlowSeries = useMemo(() => {
    const now = new Date();
    const buckets = new Map<string, { month: string; credit: number; debit: number }>();
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets.set(key, {
        month: d.toLocaleString("en-IN", { month: "short" }),
        credit: 0,
        debit: 0,
      });
    }

    allTransactions.forEach((tx) => {
      if (!tx.date) return;
      const d = new Date(tx.date);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const bucket = buckets.get(key);
      if (!bucket) return;
      if (tx.type === "CREDIT") bucket.credit += Number(tx.amount || 0);
      if (tx.type === "DEBIT") bucket.debit += Number(tx.amount || 0);
    });

    return Array.from(buckets.values());
  }, [allTransactions]);

  const lineChartData = useMemo(() => {
    const width = 460;
    const height = 170;
    const pad = 18;
    const maxVal = Math.max(1, ...monthlyFlowSeries.map((v) => Math.max(v.credit, v.debit)));

    const pointX = (idx: number) =>
      pad + (idx / Math.max(monthlyFlowSeries.length - 1, 1)) * (width - pad * 2);
    const pointY = (value: number) => height - pad - (value / maxVal) * (height - pad * 2);

    const creditPath = monthlyFlowSeries
      .map((p, idx) => `${idx === 0 ? "M" : "L"} ${pointX(idx)} ${pointY(p.credit)}`)
      .join(" ");
    const debitPath = monthlyFlowSeries
      .map((p, idx) => `${idx === 0 ? "M" : "L"} ${pointX(idx)} ${pointY(p.debit)}`)
      .join(" ");

    return { width, height, creditPath, debitPath, pointX };
  }, [monthlyFlowSeries]);

  const monthlyFlowSummary = useMemo(() => {
    const totalDeposit = monthlyFlowSeries.reduce((sum, row) => sum + row.credit, 0);
    const totalWithdraw = monthlyFlowSeries.reduce((sum, row) => sum + row.debit, 0);
    const netFlow = totalDeposit - totalWithdraw;
    const avgMonthlyVolume = (totalDeposit + totalWithdraw) / Math.max(1, monthlyFlowSeries.length);
    return { totalDeposit, totalWithdraw, netFlow, avgMonthlyVolume };
  }, [monthlyFlowSeries]);

  const emiCountdown = useMemo(() => {
    if (!nextEmiDueDate) return "No due EMI";
    const diff = nextEmiDueDate.getTime() - countdownTick;
    if (diff <= 0) return "Due today";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const mins = Math.floor((diff / (1000 * 60)) % 60);
    return `${days}d ${hours}h ${mins}m`;
  }, [countdownTick, nextEmiDueDate]);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);
        const profile = await UserService.getProfile();
        setUser(profile);

        if (profile.kycStatus !== "COMPLETED") {
          toast.push({
            type: "info",
            message: "Please complete KYC to continue.",
          });
          navigate("/user/profile", { replace: true });
          return;
        }

        if (profile.accountStatus !== "APPROVED") {
          toast.push({
            type: "info",
            message:
              profile.accountStatus === "PENDING"
                ? "KYC submitted. Waiting for Bank Manager approval."
                : profile.accountStatus === "REJECTED"
                ? "Your profile was rejected. Please update and submit again."
                : "Account not approved yet.",
          });
          navigate("/user/profile", { replace: true });
          return;
        }

        setBalance(0);
        setBalanceVisible(false);
        setAccountNumber("");
        setIfscCode("");

        if (profile.has_digi_pin === false) {
          try {
            const bd = await AccountService.getBankDetails();
            setAccountNumber(String(bd?.account_number || ""));
            setIfscCode(String(bd?.ifsc_code || ""));
          } catch {
            // optional
          }
          setTransactions([]);
          return;
        }

        try {
          try {
            const bd = await AccountService.getBankDetails();
            setAccountNumber(String(bd?.account_number || ""));
            setIfscCode(String(bd?.ifsc_code || ""));
          } catch {
            // optional
          }
          await Promise.all([
            refreshTransactions({ page: 1 }),
            triggerTransactions(),
            loadLoanSnapshot(),
          ]);
        } catch {
          setTransactions([]);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, toast]);

  useEffect(() => {
    if (!balanceVisible) {
      setAnimatedBalance(0);
      return;
    }

    const duration = 900;
    const start = performance.now();
    const from = animatedBalance;
    const to = balance;
    let raf = 0;

    const tick = (t: number) => {
      const progress = Math.min((t - start) / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      const next = from + (to - from) * eased;
      setAnimatedBalance(next);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balance, balanceVisible]);

  useEffect(() => {
    const interval = window.setInterval(() => setCountdownTick(Date.now()), 60000);
    return () => window.clearInterval(interval);
  }, []);

  const handleAmountAction = async () => {
    const amountValidation = validateAmount(amount, moneyAction);
    const pinValidation = validatePin(digiPin);
    const parsedAmount = Number(amount);

    setAmountError(amountValidation);
    setPinError(pinValidation);

    if (amountValidation || pinValidation) {
      triggerFormShake();
      return;
    }

    try {
      setProcessing(true);
      const res =
        moneyAction === "DEPOSIT"
          ? await AccountService.credit(parsedAmount, digiPin)
          : await AccountService.debit(parsedAmount, digiPin);

      setBalance(Number(res?.balance ?? balance));
      setAmount("");
      setDigiPin("");
      setAmountError("");
      setPinError("");
      if (showTransactions) {
        await refreshTransactions();
      }
      await triggerTransactions();

      toast.push({
        type: "success",
        message:
          moneyAction === "DEPOSIT"
            ? `Deposited ${formatINR(parsedAmount)} successfully`
            : `Withdrawn ${formatINR(parsedAmount)} successfully`,
      });
    } catch (e: unknown) {
      triggerFormShake();
      toast.push({
        type: "error",
        message: getErrorMessage(e, "Transaction failed"),
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckBalance = () => {
    setShowBalancePrompt(true);
  };

  const handleSecureBalanceCheck = async () => {
    if (!/^\d{4,6}$/.test(balancePin)) {
      toast.push({ type: "error", message: "Enter a valid 4-6 digit DigiPIN" });
      triggerFormShake();
      return;
    }

    try {
      setCheckingBalance(true);
      const res = await AccountService.getSecureBalance(balancePin);
      setBalance(Number(res?.balance ?? 0));
      setAccountNumber(String(res?.account_number || accountNumber || ""));
      setIfscCode(String(res?.ifsc_code || ifscCode || ""));
      setBalanceVisible(true);
      toast.push({ type: "success", message: `Balance fetched: ${formatINR(Number(res?.balance ?? 0))}` });
      setShowBalancePrompt(false);
      setBalancePin("");
    } catch (e: unknown) {
      toast.push({ type: "error", message: getErrorMessage(e, "Failed to fetch balance") });
    } finally {
      setCheckingBalance(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-12 bg-gradient-to-r from-gray-200 to-gray-100 rounded animate-pulse" />
        <SkeletonCard />
        <SkeletonCard />
        <div className="bg-white rounded shadow p-6 space-y-4 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4" />
          <div className="h-10 bg-gray-200 rounded" />
          <SkeletonTable rows={3} columns={4} />
        </div>
        <SkeletonCard />
      </div>
    );
  }

  if (!user) {
    return <div className="p-6 text-center text-red-500">Unable to load user details</div>;
  }

  const needsDigiPinSetup =
    user.kycStatus === "COMPLETED" &&
    user.accountStatus === "APPROVED" &&
    user.has_digi_pin === false;

  if (needsDigiPinSetup) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow p-6 space-y-3">
          <h1 className="text-2xl font-semibold text-gray-900">Welcome to MONIFY</h1>
          <p className="text-sm text-gray-700">
            Your account is approved. To start using banking transactions (deposit, withdraw, balance check, loan repayments),
            please set your DigiPIN now.
          </p>
          <div className="text-sm text-gray-700">
            <div>
              <span className="text-gray-500">Account:</span>{" "}
              <span className="font-medium">{accountNumber || "-"}</span>
            </div>
            <div>
              <span className="text-gray-500">IFSC:</span>{" "}
              <span className="font-medium">{ifscCode || "-"}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/user/digi-pin-setup")}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            Set DigiPIN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 user-dashboard-fade-in">
      <CircularLoader
        isLoading={processing}
        text={moneyAction === "DEPOSIT" ? "Processing deposit..." : "Processing withdrawal..."}
      />

      {user.accountStatus === "PENDING" && (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          KYC submitted. Waiting for Bank Manager approval.
        </div>
      )}
      {user.accountStatus === "REJECTED" && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Your profile/KYC was rejected by Bank Manager. Please edit details and resubmit KYC.
        </div>
      )}
      {user.accountStatus === "APPROVED" && (
        <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Account approved. You can now use all user features.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-2xl border border-white/40 bg-gradient-to-br from-green-900 via-green-800 to-emerald-700 p-6 text-white shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl user-dashboard-slide-up">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_48%)]" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-4">
                <p className="text-sm tracking-[0.08em] text-green-100">AVAILABLE BALANCE</p>
                <p className="text-4xl md:text-5xl font-extrabold leading-tight tabular-nums">
                  {balanceVisible ? formatINR(Math.round(animatedBalance)) : "Rs. XX,XX,XXX"}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <ButtonLoader
                    type="button"
                    onClick={handleCheckBalance}
                    isLoading={checkingBalance}
                    disabled={processing || checkingBalance}
                    variant="secondary"
                    className="rounded-lg border border-white/40 bg-white/15 px-3 py-2 text-sm text-white hover:bg-white/25"
                  >
                    Check Balance
                  </ButtonLoader>
                  <button
                    type="button"
                    onClick={handleCheckBalance}
                    disabled={processing || checkingBalance}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/40 bg-white/15 text-white transition hover:bg-white/25 disabled:opacity-50"
                    title="Refresh balance"
                    aria-label="Refresh balance"
                  >
                    <RefreshCw size={16} className={checkingBalance ? "animate-spin" : ""} />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-white/30 bg-white/10 p-3 backdrop-blur-sm">
                    <p className="text-green-100">Account Number</p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="font-semibold text-white">{accountNumber || "-"}</p>
                      <button
                        type="button"
                        onClick={copyAccountNumber}
                        className="rounded-md p-1.5 transition-all duration-300 hover:bg-white/20"
                        title="Copy account number"
                      >
                        {copySuccess ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/30 bg-white/10 p-3 backdrop-blur-sm">
                    <p className="text-green-100">IFSC</p>
                    <p className="mt-1 font-semibold text-white">{ifscCode || "-"}</p>
                  </div>
                </div>
              </div>

              <div className="min-w-[220px] rounded-2xl border border-white/30 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-wider text-green-100">Balance Trend</p>
                <svg viewBox="0 0 220 82" className="mt-2 h-24 w-full">
                  <defs>
                    <linearGradient id="balanceSparkline" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#dcfce7" />
                      <stop offset="100%" stopColor="#ffffff" />
                    </linearGradient>
                  </defs>
                  <path d={sparklinePath} fill="none" stroke="url(#balanceSparkline)" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            <div
              className={`relative transition-all duration-300 ease-in-out overflow-hidden ${showBalancePrompt ? "mt-4 max-h-28 opacity-100" : "max-h-0 opacity-0"}`}
            >
              <div className={`rounded-xl border border-white/30 bg-white/10 p-3 backdrop-blur-sm ${formShake ? "dashboard-shake" : ""}`}>
                <div className="flex flex-col md:flex-row gap-2">
                  <input
                    type="password"
                    value={balancePin}
                    onChange={(e) => setBalancePin(e.target.value)}
                    className="rounded-lg border border-white/40 bg-white/15 px-3 py-2 text-white placeholder:text-green-100 md:flex-1"
                    placeholder="Enter DigiPIN to view balance"
                    maxLength={6}
                    disabled={checkingBalance}
                  />
                  <div className="flex gap-2">
                    <ButtonLoader
                      type="button"
                      onClick={handleSecureBalanceCheck}
                      isLoading={checkingBalance}
                      disabled={checkingBalance}
                      variant="primary"
                      className="px-3 py-2 text-sm"
                    >
                      Verify
                    </ButtonLoader>
                    <button
                      type="button"
                      onClick={() => {
                        setShowBalancePrompt(false);
                        setBalancePin("");
                      }}
                      disabled={checkingBalance}
                      className="rounded-lg border border-white/40 bg-white/15 px-3 py-2 text-sm text-white transition-all duration-300 hover:bg-white/20 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </section>

          <section ref={transactionsActionRef} className={`rounded-2xl border border-green-100 bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl user-dashboard-slide-up ${formShake ? "dashboard-shake" : ""}`}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Account Transactions</h2>
              <div className="text-xs text-gray-500">Fast wallet operations</div>
            </div>

            <div className="mt-4 rounded-xl border border-green-100 bg-green-50/70 p-1">
              <div className="relative grid grid-cols-2 gap-1">
                <span className={`dashboard-tab-indicator ${moneyAction === "DEPOSIT" ? "translate-x-0" : "translate-x-full"}`} />
                <button
                  type="button"
                  onClick={() => setMoneyAction("DEPOSIT")}
                  className={`relative z-10 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-300 ${moneyAction === "DEPOSIT" ? "text-green-800" : "text-gray-600"}`}
                >
                  Deposit
                </button>
                <button
                  type="button"
                  onClick={() => setMoneyAction("WITHDRAW")}
                  className={`relative z-10 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-300 ${moneyAction === "WITHDRAW" ? "text-green-800" : "text-gray-600"}`}
                >
                  Withdraw
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="relative block">
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*\.?\d{0,2}$/.test(value)) {
                      setAmount(value);
                      setAmountError(validateAmount(value, moneyAction));
                    }
                  }}
                  autoComplete="off"
                  name="deposit_amount"
                  className={`peer w-full rounded-xl border bg-white px-3 pb-2 pt-5 text-gray-900 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-200 ${
                    amountError ? "border-red-400" : "border-gray-300"
                  }`}
                  placeholder=" "
                />
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 transition-all duration-300 peer-placeholder-shown:top-1/2 peer-focus:top-3 peer-focus:text-xs peer-focus:text-green-700 peer-[&:not(:placeholder-shown)]:top-3 peer-[&:not(:placeholder-shown)]:text-xs">
                  Enter amount
                </span>
                {amountError && <span className="mt-1 block text-xs text-red-600">{amountError}</span>}
                {!amountError && amount && (
                  <span className="mt-1 block text-xs text-green-700">
                    {moneyAction === "DEPOSIT" ? "You will deposit" : "You will withdraw"} {formatINR(Number(amount))}
                  </span>
                )}
              </label>

              <label className="relative block">
                <input
                  type="password"
                  value={digiPin}
                  onChange={(e) => {
                    setDigiPin(e.target.value);
                    setPinError(validatePin(e.target.value));
                  }}
                  autoComplete="new-password"
                  name="deposit_digipin"
                  className={`peer w-full rounded-xl border bg-white px-3 pb-2 pt-5 text-gray-900 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-200 ${
                    pinError ? "border-red-400" : "border-gray-300"
                  }`}
                  placeholder=" "
                  maxLength={6}
                />
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 transition-all duration-300 peer-placeholder-shown:top-1/2 peer-focus:top-3 peer-focus:text-xs peer-focus:text-green-700 peer-[&:not(:placeholder-shown)]:top-3 peer-[&:not(:placeholder-shown)]:text-xs">
                  Enter DigiPIN
                </span>
                {pinError && <span className="mt-1 block text-xs text-red-600">{pinError}</span>}
              </label>
            </div>

            <button
              type="button"
              onClick={handleAmountAction}
              disabled={processing}
              className="dashboard-ripple-btn mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-green-700 disabled:opacity-70"
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {moneyAction === "DEPOSIT" ? "Submit Deposit" : "Submit Withdraw"}
            </button>
          </section>

          <section ref={transactionHistoryRef} className="rounded-2xl border border-green-100 bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl user-dashboard-slide-up">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-gray-900">Transaction History</h2>
              <button
                type="button"
                onClick={async () => {
                  const next = !showTransactions;
                  setShowTransactions(next);
                  if (next) {
                    setTxPage(1);
                    await refreshTransactions({ page: 1 });
                  }
                }}
                className="rounded-lg border border-green-200 px-4 py-2 text-sm text-green-700 transition-all duration-300 hover:bg-green-50"
              >
                {showTransactions ? "Hide Transactions" : "View Transactions"}
              </button>
            </div>

            {showTransactions && (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Type</label>
                    <select
                      value={txTypeFilter}
                      onChange={async (e) => {
                        const v = e.target.value as "ALL" | "CREDIT" | "DEBIT";
                        setTxTypeFilter(v);
                        setTxPage(1);
                        await refreshTransactions({ page: 1, txType: v });
                      }}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                    >
                      <option value="ALL">All</option>
                      <option value="CREDIT">Credit</option>
                      <option value="DEBIT">Debit</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Month</label>
                    <input
                      type="month"
                      value={txMonth}
                      onChange={async (e) => {
                        const v = e.target.value;
                        setTxMonth(v);
                        setTxDay("");
                        setTxPage(1);
                        await refreshTransactions({ page: 1, month: v, day: "" });
                      }}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Day (Optional)</label>
                    <input
                      type="date"
                      value={txDay}
                      onChange={async (e) => {
                        const v = e.target.value;
                        setTxDay(v);
                        setTxPage(1);
                        await refreshTransactions({ page: 1, day: v });
                      }}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Rows</label>
                    <select
                      value={txPageSize}
                      onChange={async (e) => {
                        const v = Number(e.target.value);
                        setTxPageSize(v);
                        setTxPage(1);
                        await refreshTransactions({ page: 1, pageSize: v });
                      }}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                    >
                      {[10, 25, 50, 100].map((n) => (
                        <option key={n} value={n}>
                          {n} / page
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-gray-500">
                    {txTotal ? `Total: ${Number(txTotal).toLocaleString("en-IN")}` : "Total: 0"}
                  </div>
                  <button
                    type="button"
                    className="rounded-lg border px-3 py-2 text-sm transition-all duration-300 hover:bg-gray-50"
                    onClick={async () => {
                      const month = getCurrentMonth();
                      setTxTypeFilter("ALL");
                      setTxMonth(month);
                      setTxDay("");
                      setTxPageSize(10);
                      setTxPage(1);
                      await refreshTransactions({
                        page: 1,
                        txType: "ALL",
                        month,
                        day: "",
                        pageSize: 10,
                      });
                    }}
                    disabled={
                      txTypeFilter === "ALL" &&
                      txDay === "" &&
                      txMonth === getCurrentMonth() &&
                      txPageSize === 10
                    }
                  >
                    Clear Filters
                  </button>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  {txLoading ? (
                    <div className="p-4 text-sm text-gray-500">Loading transactions...</div>
                  ) : transactions.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500">No transactions found.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left">Date & Time</th>
                          <th className="px-3 py-2 text-left">Type</th>
                          <th className="px-3 py-2 text-left">Reference</th>
                          <th className="px-3 py-2 text-left">Amount</th>
                          <th className="px-3 py-2 text-left">Balance After</th>
                          <th className="px-3 py-2 text-left">Loan ID</th>
                          <th className="px-3 py-2 text-left">Loan Manager ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((tx) => (
                          <tr key={tx.id} className="border-t">
                            <td className="px-3 py-2">{tx.date ? new Date(tx.date).toLocaleString("en-IN") : "-"}</td>
                            <td className="px-3 py-2">{tx.type || "-"}</td>
                            <td className="px-3 py-2">{tx.reference || "-"}</td>
                            <td className="px-3 py-2">{typeof tx.amount === "number" ? formatINR(tx.amount) : "-"}</td>
                            <td className="px-3 py-2">{typeof tx.balanceAfter === "number" ? formatINR(tx.balanceAfter) : "-"}</td>
                            <td className="px-3 py-2">{tx.loanId || "-"}</td>
                            <td className="px-3 py-2">{tx.managerId || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="flex justify-center py-2">
                  <Pagination
                    currentPage={txPage}
                    totalPages={Math.max(1, Math.ceil((txTotal || 0) / txPageSize))}
                    onPageChange={async (p) => {
                      await refreshTransactions({ page: p });
                    }}
                  />
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-green-100 bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl user-dashboard-slide-up">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Monthly Flow (Deposit vs Withdraw)</h3>
              <span className="text-xs text-gray-500">Last 6 months</span>
            </div>
            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Total Deposits</p>
                <p className="mt-1 text-sm font-semibold text-green-700">{formatINR(monthlyFlowSummary.totalDeposit)}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Total Withdrawals</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{formatINR(monthlyFlowSummary.totalWithdraw)}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Net Cash Flow</p>
                <p className={`mt-1 text-sm font-semibold ${monthlyFlowSummary.netFlow >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {formatINR(monthlyFlowSummary.netFlow)}
                </p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Avg Monthly Volume</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{formatINR(monthlyFlowSummary.avgMonthlyVolume)}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <svg viewBox={`0 0 ${lineChartData.width} ${lineChartData.height}`} className="h-44 min-w-[460px] w-full">
                <defs>
                  <linearGradient id="creditLine" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#16a34a" />
                    <stop offset="100%" stopColor="#22c55e" />
                  </linearGradient>
                  <linearGradient id="debitLine" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#86efac" />
                    <stop offset="100%" stopColor="#15803d" />
                  </linearGradient>
                </defs>
                <line x1="18" y1={lineChartData.height - 18} x2={lineChartData.width - 18} y2={lineChartData.height - 18} stroke="#d1d5db" />
                <path d={lineChartData.creditPath} fill="none" stroke="url(#creditLine)" strokeWidth="3" strokeLinecap="round" />
                <path d={lineChartData.debitPath} fill="none" stroke="url(#debitLine)" strokeWidth="3" strokeDasharray="6 5" strokeLinecap="round" />
                {monthlyFlowSeries.map((p, idx) => (
                  <text
                    key={p.month}
                    x={lineChartData.pointX(idx)}
                    y={lineChartData.height - 4}
                    textAnchor="middle"
                    className="fill-gray-500 text-[10px]"
                  >
                    {p.month}
                  </text>
                ))}
              </svg>
            </div>
            <div className="mt-3 flex gap-4 text-xs">
              <span className="inline-flex items-center gap-2 text-green-700">
                <span className="h-2 w-6 rounded-full bg-green-600" />
                Deposit
              </span>
              <span className="inline-flex items-center gap-2 text-green-600">
                <span className="h-2 w-6 rounded-full border-2 border-green-700" />
                Withdraw
              </span>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-green-100 bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl user-dashboard-slide-up">
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                {
                  title: "Deposit",
                  icon: <ArrowDownLeft size={18} />,
                  onClick: () => {
                    setMoneyAction("DEPOSIT");
                    scrollToSection(transactionsActionRef.current);
                  },
                },
                {
                  title: "Withdraw",
                  icon: <ArrowUpRight size={18} />,
                  onClick: () => {
                    setMoneyAction("WITHDRAW");
                    scrollToSection(transactionsActionRef.current);
                  },
                },
                {
                  title: "Transactions",
                  icon: <ClipboardList size={18} />,
                  onClick: async () => {
                    setShowTransactions(true);
                    setTxPage(1);
                    await refreshTransactions({ page: 1 });
                    window.requestAnimationFrame(() => {
                      scrollToSection(transactionHistoryRef.current);
                    });
                  },
                },
                {
                  title: "Apply Loan",
                  icon: <Wallet size={18} />,
                  onClick: () => navigate("/user/loans"),
                },
                {
                  title: "Pay EMI",
                  icon: <HandCoins size={18} />,
                  onClick: () => {
                    if (activeLoansCount > 0) {
                      navigate("/user/loans");
                    }
                  },
                },
              ].map((action) => (
                <button
                  key={action.title}
                  type="button"
                  onClick={action.onClick}
                  disabled={action.title === "Pay EMI" && activeLoansCount === 0}
                  title={action.title === "Pay EMI" && activeLoansCount === 0 ? "No active loan available" : action.title}
                  className={`rounded-xl border border-green-100 bg-green-50 p-4 text-left text-gray-700 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-green-300 ${
                    action.title === "Pay EMI" ? "col-span-2" : ""
                  } ${action.title === "Pay EMI" && activeLoansCount === 0 ? "cursor-not-allowed opacity-50 hover:translate-y-0 hover:shadow-sm" : ""}`}
                >
                  <div className="inline-flex rounded-lg bg-white p-2 text-green-700">{action.icon}</div>
                  <p className="mt-2 text-sm font-semibold">{action.title}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-green-100 bg-white p-6 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl user-dashboard-slide-up">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Loan Overview</h3>
              <button
                type="button"
                onClick={() => navigate("/user/loans")}
                className="text-xs text-green-700 underline underline-offset-2"
              >
                Open loans
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-200 p-3">
                <p className="text-xs text-gray-500">Loan Amount</p>
                <p className="mt-1 text-lg font-bold text-gray-900">{formatINR(loanAmount)}</p>
              </div>
              <div className="rounded-xl border border-gray-200 p-3">
                <p className="text-xs text-gray-500">Tenure</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{loanTenure ? `${loanTenure} months` : "-"}</p>
              </div>
              <div className="rounded-xl border border-gray-200 p-3">
                <p className="text-xs text-gray-500">Remaining Principal</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{formatINR(remainingPrincipal)}</p>
              </div>
              <div className="rounded-xl border border-gray-200 p-3">
                <p className="text-xs text-gray-500">Next EMI Due</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{nextEmiDueDate ? nextEmiDueDate.toLocaleDateString("en-IN") : "-"}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-gray-200 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs text-gray-500">EMI Progress</p>
                <p className="text-xs font-semibold text-green-700">{emiProgress}%</p>
              </div>
              <div className="h-2 w-full rounded-full bg-green-100">
                <div
                  className="h-2 rounded-full bg-green-600 transition-all duration-700"
                  style={{ width: `${emiProgress}%` }}
                />
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3">
              <p className="text-xs text-green-700">Payment Countdown</p>
              <p className="mt-1 text-lg font-bold text-green-800">{emiCountdown}</p>
            </div>
          </section>
        </aside>
      </div>

      <ContactBankManager enabled={Boolean(user.approvedByManagerId)} />
    </div>
  );
};

export default UserDashboard;
