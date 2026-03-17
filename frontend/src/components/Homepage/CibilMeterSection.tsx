import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PublicCibilService } from "../../services/publicCibil.service";
import type { HomepageCibilEstimateResponse } from "../../services/publicCibil.service";

type EmploymentType = "government" | "private" | "startup" | "freelancer" | "selfEmployed";
type ResidenceType = "owned" | "rented" | "parents";

const MIN_SCORE = 300;
const MAX_SCORE = 900;
const phoneRe = /^[6-9]\d{9}$/;
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clampScore = (score: number) => Math.min(MAX_SCORE, Math.max(MIN_SCORE, score));
const scoreToNeedleAngle = (score: number) => ((clampScore(score) - MIN_SCORE) / (MAX_SCORE - MIN_SCORE)) * 180 - 90;
const scoreToArcAngle = (score: number) => -180 + ((clampScore(score) - MIN_SCORE) / (MAX_SCORE - MIN_SCORE)) * 180;

const toPolar = (cx: number, cy: number, radius: number, angle: number) => {
  const rad = (angle * Math.PI) / 180;
  return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
};

const buildArcPath = (cx: number, cy: number, radius: number, startAngle: number, endAngle: number) => {
  const start = toPolar(cx, cy, radius, startAngle);
  const end = toPolar(cx, cy, radius, endAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
};

const CibilMeterSection = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HomepageCibilEstimateResponse | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [netIncome, setNetIncome] = useState("");
  const [employmentType, setEmploymentType] = useState<EmploymentType>("private");
  const [experienceYears, setExperienceYears] = useState("1");
  const [totalEmi, setTotalEmi] = useState("0");
  const [missedEmi, setMissedEmi] = useState("0");
  const [hasDefaulted, setHasDefaulted] = useState(false);
  const [hasSettledAccount, setHasSettledAccount] = useState(false);
  const [creditUtilization, setCreditUtilization] = useState("30");
  const [residenceType, setResidenceType] = useState<ResidenceType>("rented");
  const [addressYears, setAddressYears] = useState("1");

  const shownScore = result?.score ?? 650;
  const needleAngle = useMemo(() => scoreToNeedleAngle(shownScore), [shownScore]);

  const segments = useMemo(
    () => [
      { start: 300, end: 550, color: "#ea580c" },
      { start: 550, end: 650, color: "#f59e0b" },
      { start: 650, end: 750, color: "#facc15" },
      { start: 750, end: 800, color: "#84cc16" },
      { start: 800, end: 900, color: "#16a34a" },
    ],
    []
  );

  return (
    <section className="py-20 px-6 md:px-10">
      <div className="max-w-6xl mx-auto rounded-3xl bg-gradient-to-br from-blue-100 via-cyan-50 to-emerald-100 border border-blue-200/70 shadow-xl p-6 md:p-10">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Public CIBIL Check</h2>
            <p className="mt-3 text-gray-700">Check your final estimated CIBIL score and view the meter before registering.</p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name"
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
              <input
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
                placeholder="Phone (10 digits)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 md:col-span-2"
              />
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
              <input
                type="number"
                min={1}
                value={netIncome}
                onChange={(e) => setNetIncome(e.target.value)}
                placeholder="Net income"
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="government">Government</option>
                <option value="private">Private</option>
                <option value="startup">Startup</option>
                <option value="freelancer">Freelancer</option>
                <option value="selfEmployed">Self Employed</option>
              </select>
              <input
                type="number"
                min={0}
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                placeholder="Experience years"
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
              <input
                type="number"
                min={0}
                value={totalEmi}
                onChange={(e) => setTotalEmi(e.target.value)}
                placeholder="Total EMI"
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
              <input
                type="number"
                min={0}
                value={missedEmi}
                onChange={(e) => setMissedEmi(e.target.value)}
                placeholder="Missed EMIs (12 months)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
              <input
                type="number"
                min={0}
                max={100}
                value={creditUtilization}
                onChange={(e) => setCreditUtilization(e.target.value)}
                placeholder="Credit utilization %"
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
              <select
                value={residenceType}
                onChange={(e) => setResidenceType(e.target.value as ResidenceType)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="owned">Owned</option>
                <option value="rented">Rented</option>
                <option value="parents">Parents</option>
              </select>
              <input
                type="number"
                min={0}
                value={addressYears}
                onChange={(e) => setAddressYears(e.target.value)}
                placeholder="Address years"
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-700">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={hasDefaulted} onChange={(e) => setHasDefaulted(e.target.checked)} />
                Has defaulted
              </label>
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={hasSettledAccount} onChange={(e) => setHasSettledAccount(e.target.checked)} />
                Has settled account
              </label>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                setError(null);
                if (fullName.trim().length < 3) return setError("Enter valid full name (min 3 chars).");
                if (!phoneRe.test(phone.trim())) return setError("Enter valid 10-digit Indian phone.");
                if (!emailRe.test(email.trim())) return setError("Enter valid email.");
                if (!dob) return setError("DOB is required.");

                const incomeNum = Number(netIncome);
                const expNum = Number(experienceYears);
                const emiNum = Number(totalEmi);
                const missedNum = Number(missedEmi);
                const utilNum = Number(creditUtilization);
                const addrNum = Number(addressYears);

                if (!Number.isFinite(incomeNum) || incomeNum <= 0) return setError("Net income must be > 0.");
                if (!Number.isFinite(expNum) || expNum < 0) return setError("Experience years must be >= 0.");
                if (!Number.isFinite(emiNum) || emiNum < 0) return setError("Total EMI must be >= 0.");
                if (!Number.isFinite(missedNum) || missedNum < 0) return setError("Missed EMIs must be >= 0.");
                if (!Number.isFinite(utilNum) || utilNum < 0 || utilNum > 100) return setError("Credit utilization must be 0-100.");
                if (!Number.isFinite(addrNum) || addrNum < 0) return setError("Address years must be >= 0.");

                setLoading(true);
                try {
                  const data = await PublicCibilService.estimate({
                    fullName: fullName.trim(),
                    phone: phone.trim(),
                    email: email.trim(),
                    dob,
                    netIncome: incomeNum,
                    employmentType,
                    experienceYears: expNum,
                    totalEmi: emiNum,
                    missedEmiLast12Months: missedNum,
                    hasDefaulted,
                    hasSettledAccount,
                    creditUtilization: utilNum,
                    residenceType,
                    addressYears: addrNum,
                  });
                  setResult(data);
                } catch (e: unknown) {
                  const maybe = e as { response?: { data?: { detail?: string } } };
                  setError(maybe?.response?.data?.detail || "Unable to calculate CIBIL score.");
                } finally {
                  setLoading(false);
                }
              }}
              className="mt-5 px-5 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-60"
            >
              {loading ? "Checking..." : "Check CIBIL Score"}
            </button>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            {result && (
              <div className="mt-4 rounded-xl bg-white/80 border border-white px-4 py-3 text-gray-800">
                <p className="font-semibold">Band: {result.band}</p>
                <p className="text-sm">Final estimated score: {result.score}</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => navigate("/register")}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
                  >
                    Register and Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-100 rounded-3xl p-6 md:p-8 border border-blue-100 shadow-md">
            <h3 className="text-4xl text-center font-semibold text-gray-900">Your CIBIL Score</h3>
            <svg viewBox="0 0 240 140" className="w-full max-w-md mx-auto mt-4">
              {segments.map((segment) => (
                <path
                  key={`${segment.start}-${segment.end}`}
                  d={buildArcPath(120, 110, 80, scoreToArcAngle(segment.start), scoreToArcAngle(segment.end))}
                  fill="none"
                  stroke={segment.color}
                  strokeWidth={10}
                  strokeLinecap="round"
                />
              ))}

              <line
                x1={120}
                y1={110}
                x2={120}
                y2={58}
                stroke="#2f3237"
                strokeWidth={4}
                strokeLinecap="round"
                transform={`rotate(${needleAngle} 120 110)`}
              />
              <circle cx={120} cy={110} r={6} fill="#2f3237" />
            </svg>
            <div className="mx-auto -mt-2 w-20 h-10 bg-gray-300 rounded-t-full" />
            <div className="text-center mt-2">
              <div className="text-6xl font-bold text-gray-900">{shownScore}</div>
              <div className="flex justify-between text-gray-500 mt-1 px-5">
                <span>300</span>
                <span>900</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CibilMeterSection;
