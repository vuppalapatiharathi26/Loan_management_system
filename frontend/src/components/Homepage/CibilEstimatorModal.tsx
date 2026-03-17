import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PublicCibilService } from "../../services/publicCibil.service";
import type { HomepageCibilEstimateResponse } from "../../services/publicCibil.service";

type Props = {
  open: boolean;
  onClose: () => void;
};

type EmploymentType = "government" | "private" | "startup" | "freelancer" | "selfEmployed";
type ResidenceType = "owned" | "rented" | "parents";

const phoneRe = /^[6-9]\d{9}$/;
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const toYears = (dob: string) => {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return 0;
  const today = new Date();
  let years = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) years--;
  return years;
};

const bandMeta: Record<
  HomepageCibilEstimateResponse["band"],
  { badge: string; message: string }
> = {
  Excellent: {
    badge: "bg-green-100 text-green-800 border border-green-200",
    message: "You are likely pre-approved for premium loan offers.",
  },
  Good: {
    badge: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    message: "You have strong approval chances.",
  },
  Fair: {
    badge: "bg-amber-100 text-amber-800 border border-amber-200",
    message: "You may qualify with moderate interest rates.",
  },
  Weak: {
    badge: "bg-orange-100 text-orange-800 border border-orange-200",
    message: "Improve utilization and repayment behavior.",
  },
  "High Risk": {
    badge: "bg-red-100 text-red-800 border border-red-200",
    message: "Focus on repayment discipline to improve eligibility.",
  },
};

const CibilEstimatorModal = ({ open, onClose }: Props) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HomepageCibilEstimateResponse | null>(null);
  const [animatedScore, setAnimatedScore] = useState(300);
  const [showRegisterNudge, setShowRegisterNudge] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    dob: "",
    netIncome: "",
    employmentType: "private" as EmploymentType,
    experienceYears: "",
    totalEmi: "",
    missedEmiLast12Months: "",
    hasDefaulted: false,
    hasSettledAccount: false,
    creditUtilization: "",
    residenceType: "rented" as ResidenceType,
    addressYears: "",
  });

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setError(null);
    setResult(null);
    setAnimatedScore(300);
    setShowRegisterNudge(false);
  }, [open]);

  useEffect(() => {
    if (!result) return;
    const target = Math.max(300, Math.min(900, Number(result.score || 300)));
    const start = 300;
    const durationMs = 900;
    const startAt = performance.now();
    let raf = 0;

    const tick = (t: number) => {
      const p = Math.min(1, (t - startAt) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setAnimatedScore(Math.round(start + (target - start) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else {
        // After the reveal finishes, nudge user to register (skippable).
        window.setTimeout(() => setShowRegisterNudge(true), 350);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [result]);

  const validateStep1 = () => {
    if (!form.fullName.trim() || form.fullName.trim().length < 3) return "Enter full name (min 3 characters)";
    if (!phoneRe.test(form.phone.trim())) return "Enter valid 10-digit Indian phone number";
    if (!emailRe.test(form.email.trim())) return "Enter valid email address";
    if (!form.dob) return "DOB is required";
    if (toYears(form.dob) < 18) return "You must be 18+ years to check score";
    return null;
  };

  const validateStep2 = () => {
    const netIncome = Number(form.netIncome);
    if (!netIncome || netIncome <= 0) return "Net income must be > 0";
    const exp = Number(form.experienceYears);
    if (Number.isNaN(exp) || exp < 0) return "Experience years must be >= 0";
    const emi = Number(form.totalEmi);
    if (Number.isNaN(emi) || emi < 0) return "Total EMI must be >= 0";
    const missed = Number(form.missedEmiLast12Months);
    if (!Number.isFinite(missed) || missed < 0) return "Missed EMI count must be >= 0";
    const util = Number(form.creditUtilization);
    if (!Number.isFinite(util) || util < 0 || util > 100) return "Credit utilization must be 0-100";
    const addr = Number(form.addressYears);
    if (Number.isNaN(addr) || addr < 0) return "Address years must be >= 0";
    return null;
  };

  const cta = useMemo(() => {
    const score = result?.score ?? 0;
    if (score >= 720) return { label: "Apply for Instant Loan", to: "/register" };
    if (score >= 650) return { label: "View Loan Options", to: "/register" };
    return { label: "Get Score Improvement Tips", to: "/register" };
  }, [result]);

  const scoreAngle = useMemo(() => {
    // Map 300..900 -> -90..90 degrees
    const s = Math.max(300, Math.min(900, Number(animatedScore || 300)));
    const p = (s - 300) / 600;
    return -90 + p * 180;
  }, [animatedScore]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold text-gray-900">Check Your Estimated CIBIL Score</div>
            <div className="text-xs text-gray-500">No OTP required. Takes about 60 seconds.</div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded hover:bg-gray-50">
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className={`h-2 flex-1 rounded ${step >= 1 ? "bg-green-600" : "bg-gray-200"}`} />
            <div className={`h-2 flex-1 rounded ${step >= 2 ? "bg-green-600" : "bg-gray-200"}`} />
            <div className={`h-2 flex-1 rounded ${step >= 3 ? "bg-green-600" : "bg-gray-200"}`} />
          </div>

          {error && (
            <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    value={form.fullName}
                    onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    inputMode="numeric"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, phone: e.target.value.replace(/[^\d]/g, "").slice(0, 10) }))
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="10-digit number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={form.dob}
                    onChange={(e) => setForm((p) => ({ ...p, dob: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    const msg = validateStep1();
                    if (msg) {
                      setError(msg);
                      return;
                    }
                    setStep(2);
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Net Income (Monthly)</label>
                  <input
                    type="number"
                    min={1}
                    value={form.netIncome}
                    onChange={(e) => setForm((p) => ({ ...p, netIncome: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
                  <select
                    value={form.employmentType}
                    onChange={(e) => setForm((p) => ({ ...p, employmentType: toEmploymentType(e.target.value) }))}
                    className="w-full border rounded-lg px-3 py-2 bg-white"
                  >
                    <option value="government">Government</option>
                    <option value="private">Private</option>
                    <option value="startup">Startup</option>
                    <option value="freelancer">Freelancer</option>
                    <option value="selfEmployed">Self Employed</option>
                  </select>
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Experience (Years)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.experienceYears}
                    onChange={(e) => setForm((p) => ({ ...p, experienceYears: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total EMI (Monthly)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.totalEmi}
                    onChange={(e) => setForm((p) => ({ ...p, totalEmi: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Missed EMIs (Last 12 Months)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.missedEmiLast12Months}
                    onChange={(e) => setForm((p) => ({ ...p, missedEmiLast12Months: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Credit Utilization (%)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.creditUtilization}
                    onChange={(e) => setForm((p) => ({ ...p, creditUtilization: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Residence Type</label>
                  <select
                    value={form.residenceType}
                    onChange={(e) => setForm((p) => ({ ...p, residenceType: toResidenceType(e.target.value) }))}
                    className="w-full border rounded-lg px-3 py-2 bg-white"
                  >
                    <option value="owned">Owned</option>
                    <option value="rented">Rented</option>
                    <option value="parents">Parents</option>
                  </select>
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address Years</label>
                  <input
                    type="number"
                    min={0}
                    value={form.addressYears}
                    onChange={(e) => setForm((p) => ({ ...p, addressYears: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div className="md:col-span-1 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Flags</label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.hasDefaulted}
                      onChange={(e) => setForm((p) => ({ ...p, hasDefaulted: e.target.checked }))}
                    />
                    Has Defaulted
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.hasSettledAccount}
                      onChange={(e) => setForm((p) => ({ ...p, hasSettledAccount: e.target.checked }))}
                    />
                    Has Settled Account
                  </label>
                </div>
              </div>

              <div className="flex justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep(1);
                  }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setError(null);
                    const msg1 = validateStep1();
                    if (msg1) {
                      setError(msg1);
                      setStep(1);
                      return;
                    }
                    const msg2 = validateStep2();
                    if (msg2) {
                      setError(msg2);
                      return;
                    }

                    setLoading(true);
                    try {
                      const payload = {
                        fullName: form.fullName.trim(),
                        phone: form.phone.trim(),
                        email: form.email.trim(),
                        dob: form.dob,
                        netIncome: Number(form.netIncome),
                        employmentType: form.employmentType,
                        experienceYears: Number(form.experienceYears),
                        totalEmi: Number(form.totalEmi),
                        missedEmiLast12Months: Number(form.missedEmiLast12Months),
                        hasDefaulted: Boolean(form.hasDefaulted),
                        hasSettledAccount: Boolean(form.hasSettledAccount),
                        creditUtilization: Number(form.creditUtilization),
                        residenceType: form.residenceType,
                        addressYears: Number(form.addressYears),
                      };

                      const res = await PublicCibilService.estimate(payload);
                      setResult(res);
                      setStep(3);
                    } catch (e: unknown) {
                      const maybe = e as { response?: { data?: { detail?: string } } };
                      setError(maybe?.response?.data?.detail || "Failed to estimate score");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? "Checking..." : "Get My Score"}
                </button>
              </div>
            </div>
          )}

          {step === 3 && result && (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-green-50 to-white p-5">
                <div className="text-sm text-gray-600">Your Estimated Score</div>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                  <div>
                    <div className="text-5xl font-extrabold text-gray-900 tracking-tight">
                      {animatedScore}
                    </div>
                    <div className="mt-3 inline-flex items-center gap-2">
                      <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${bandMeta[result.band].badge}`}>
                        {result.band}
                      </span>
                      <span className="text-sm text-gray-700">{bandMeta[result.band].message}</span>
                    </div>
                  </div>

                  {/* Speedometer */}
                  <div className="flex justify-center">
                    <div className="relative w-[260px] h-[150px]">
                      <svg viewBox="0 0 260 150" className="w-full h-full">
                        {/* track */}
                        <path
                          d="M 20 130 A 110 110 0 0 1 240 130"
                          fill="none"
                          stroke="#E5E7EB"
                          strokeWidth="18"
                          strokeLinecap="round"
                        />
                        {/* segments */}
                        <path d="M 20 130 A 110 110 0 0 1 64 54" fill="none" stroke="#FCA5A5" strokeWidth="18" strokeLinecap="round" />
                        <path d="M 64 54 A 110 110 0 0 1 104 32" fill="none" stroke="#FDBA74" strokeWidth="18" strokeLinecap="round" />
                        <path d="M 104 32 A 110 110 0 0 1 156 32" fill="none" stroke="#FDE68A" strokeWidth="18" strokeLinecap="round" />
                        <path d="M 156 32 A 110 110 0 0 1 196 54" fill="none" stroke="#86EFAC" strokeWidth="18" strokeLinecap="round" />
                        <path d="M 196 54 A 110 110 0 0 1 240 130" fill="none" stroke="#34D399" strokeWidth="18" strokeLinecap="round" />
                      </svg>

                      {/* needle */}
                      <div
                        className="absolute left-1/2 bottom-[18px] origin-bottom transition-transform duration-700 ease-out"
                        style={{ transform: `translateX(-50%) rotate(${scoreAngle}deg)` }}
                      >
                        <div className="w-[3px] h-[92px] bg-gray-900 rounded-full shadow" />
                      </div>
                      <div className="absolute left-1/2 bottom-[12px] -translate-x-1/2 w-4 h-4 rounded-full bg-gray-900 shadow" />

                      {/* labels */}
                      <div className="absolute left-2 bottom-0 text-[11px] text-gray-600">300</div>
                      <div className="absolute right-2 bottom-0 text-[11px] text-gray-600">900</div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 inline-flex items-center gap-2">
                  {/* spacer: band moved above */}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <div className="text-sm font-semibold text-gray-900 mb-2">Breakdown</div>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-sm">
                  {[
                    ["Payment", result.breakdown.paymentPoints],
                    ["Util", result.breakdown.utilPoints],
                    ["Income", result.breakdown.incomePoints],
                    ["DTI", result.breakdown.dtiPoints],
                    ["Residence", result.breakdown.resPoints],
                  ].map(([k, v]) => (
                    <div key={String(k)} className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                      <div className="text-xs text-gray-500">{k}</div>
                      <div className="text-lg font-semibold text-gray-900">{Number(v)}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  This is an internally generated estimated credit score by Monify. It is not an official bureau score.
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  onClick={() => {
                    setStep(1);
                    setResult(null);
                    setError(null);
                    setShowRegisterNudge(false);
                  }}
                >
                  Check Again
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  onClick={() => {
                    onClose();
                    navigate(cta.to);
                  }}
                >
                  {cta.label}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Post-result registration nudge */}
      {step === 3 && result && showRegisterNudge && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-gray-900">Boost Your Approval Chances</div>
                <div className="text-xs text-gray-500">Create your Monify account to explore loans and apply instantly.</div>
              </div>
              <button
                type="button"
                className="p-2 rounded hover:bg-gray-50"
                onClick={() => {
                  setShowRegisterNudge(false);
                }}
                aria-label="Skip"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-sm text-gray-700">
                  Your estimated score is <span className="font-semibold text-gray-900">{result.score}</span>.
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  Register now to view personalized loan options, track status, and manage repayments securely.
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  onClick={() => {
                    setShowRegisterNudge(false);
                  }}
                >
                  Skip
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  onClick={() => {
                    setShowRegisterNudge(false);
                    onClose();
                    navigate("/register");
                  }}
                >
                  Register on Monify
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CibilEstimatorModal;

  const toEmploymentType = (value: string): EmploymentType => {
    const v = String(value);
    if (v === "government" || v === "private" || v === "startup" || v === "freelancer" || v === "selfEmployed") {
      return v;
    }
    return "private";
  };

  const toResidenceType = (value: string): ResidenceType => {
    const v = String(value);
    if (v === "owned" || v === "rented" || v === "parents") return v;
    return "rented";
  };
