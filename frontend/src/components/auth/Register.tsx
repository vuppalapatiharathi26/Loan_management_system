// ============================================
// REGISTER COMPONENT - REDESIGNED
// ============================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthService } from "../../services/auth.service";
import { useToast } from "../../context/ToastContext";
import { aadhaarDigits, formatAadhaar, isValidAadhaarDigits } from "../../utils/aadhaar";
import { Eye, EyeOff, CheckCircle, Shield, Lock, ShieldCheck } from "lucide-react";
import CircularLoader from "../loaders/CircularLoader";

interface RegisterProps {
  isOpen?: boolean;
}

// ============================================
// Register Component
// ============================================

const Register = ({
  isOpen = true,
}: RegisterProps) => {
  const navigate = useNavigate();
  const toast = useToast();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const toTitleCase = (value: string) =>
    value
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  if (!isOpen) return null;

  // ====================================
  // Handle Submit
  // ====================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // ---------- Validation ----------
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    if (trimmedFirstName.length < 2 || trimmedFirstName.length > 20) {
      setError("First name must be between 2 and 20 characters");
      return;
    }
    if (trimmedLastName.length < 2 || trimmedLastName.length > 20) {
      setError("Last name must be between 2 and 20 characters");
      return;
    }
    if (!/^[A-Z][a-z]*(?: [A-Z][a-z]*)*$/.test(trimmedFirstName)) {
      setError("First name must contain letters only and each word must start with a capital letter");
      return;
    }
    if (!/^[A-Z][a-z]*(?: [A-Z][a-z]*)*$/.test(trimmedLastName)) {
      setError("Last name must contain letters only and each word must start with a capital letter");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!/^\d{10}$/.test(phone)) {
      setError("Phone number must be exactly 10 digits");
      return;
    }

    if (password.length < 6 || password.length > 13) {
      setError("Password must be between 6 and 13 characters");
      return;
    }

    if (!isValidAadhaarDigits(aadhaar)) {
      setError("Aadhaar number must be in XXXX XXXX XXXX format");
      return;
    }

    setIsLoading(true);

    try {
      const aadhaarRaw = aadhaarDigits(aadhaar);
      await AuthService.registerUser({
        first_name: toTitleCase(trimmedFirstName),
        last_name: toTitleCase(trimmedLastName),
        phone,
        aadhaar: aadhaarRaw,
        password,
      });
      localStorage.setItem("last_user_aadhaar", aadhaarRaw);
      toast.push({ type: 'success', message: 'Registration successful! Please login.' });
      navigate("/login");
    } catch (err: unknown) {
      console.error("Registration error:", err);
      const maybe = err as { response?: { data?: { detail?: string } } };
      setError(maybe?.response?.data?.detail || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  // ====================================
  // Render
  // ====================================

  return (
    <div className="min-h-screen flex items-center justify-center
bg-gradient-to-br from-sky-100 via-emerald-100 to-teal-200">
      {/* Circular Loader when registering */}
      <CircularLoader 
        isLoading={isLoading}
        text="Creating your account..."
      />

      {/* Animated background blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Back to Home Button */}
      <button
        onClick={() => navigate("/home")}
        className="absolute top-6 left-6 text-green-600 hover:text-green-700 font-semibold text-lg flex items-center gap-2 hover:underline transition-all duration-300"
      >
        ← Back to Home
      </button>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-lg">
        {/* White Card */}
        <div className="bg-[#fbfcf6] rounded-2xl shadow-2xl p-8 md:p-10">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img 
              src="/src/assets/monify-logo.png" 
              alt="MONIFY Logo" 
              className="h-12 w-auto drop-shadow-md"
            />
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
            User Registration
          </h2>
          <p className="text-center text-gray-500 text-sm mb-6">
            Create your account to get started with MONIFY
          </p>

          {/* Registration Form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
            autoComplete="off"
          >
            {/* First + Last Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="flex items-center gap-2 text-gray-700 font-semibold text-sm mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^A-Za-z ]/g, "");
                    setFirstName(toTitleCase(cleaned).slice(0, 20));
                  }}
                  placeholder="Enter first name"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-[#fcfbf6] text-sm"
                  minLength={2}
                  maxLength={20}
                  autoComplete="off"
                  required
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-gray-700 font-semibold text-sm mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => {
                    const cleaned = e.target.value.replace(/[^A-Za-z ]/g, "");
                    setLastName(toTitleCase(cleaned).slice(0, 20));
                  }}
                  placeholder="Enter last name"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-[#fcfbf6] text-sm"
                  minLength={2}
                  maxLength={20}
                  autoComplete="off"
                  required
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="flex items-center gap-2 text-gray-700 font-semibold text-sm mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="Enter your phone number"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-white text-sm"
                maxLength={10}
                pattern="\d{10}"
                inputMode="numeric"
                autoComplete="off"
                required
              />
            </div>

            {/* Aadhaar */}
            <div>
              <label className="flex items-center gap-2 text-gray-700 font-semibold text-sm mb-2">
                Aadhaar Number
              </label>
              <input
                type="text"
                value={aadhaar}
                onChange={(e) => setAadhaar(formatAadhaar(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-[#fcfbf6] text-sm"
                inputMode="numeric"
                maxLength={14}
                placeholder="XXXX XXXX XXXX"
                autoComplete="off"
                required
              />
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <Shield size={13} /> Your Aadhaar number remains private and secure.
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="flex items-center gap-2 text-gray-700 font-semibold text-sm mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  className="password-input appearance-none w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-[#fcfbf6] text-sm pr-12"
                  minLength={6}
                  maxLength={13}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-4 flex items-center text-gray-500 hover:text-gray-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="flex items-center gap-2 text-gray-700 font-semibold text-sm mb-2">
              Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="password-input appearance-none w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-[#fcfbf6] text-sm pr-12"
                  minLength={6}
                  maxLength={13}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-4 flex items-center text-gray-500 hover:text-gray-700"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium flex items-center gap-2">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-lg font-bold hover:bg-gray-300 transition-all duration-300 active:scale-95 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2.5 rounded-lg font-bold hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-400 transition-all duration-300 shadow-lg hover:shadow-xl text-sm"
              >
                Register
              </button>
            </div>
          </form>

          {/* Security Features */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Lock className="text-green-600" size={16} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-700">256-bit</p>
                  <p className="text-xs text-gray-500">Encryption</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="text-green-600" size={16} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-700">RBI</p>
                  <p className="text-xs text-gray-500">Compliant</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="text-green-600" size={16} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-700">ISO 27001</p>
                  <p className="text-xs text-gray-500">Certified</p>
                </div>
              </div>
            </div>
          </div>

          {/* Login Link */}
          <div className="mt-4 text-center">
            <p className="text-gray-600 text-xs">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-green-600 font-bold hover:text-green-700 hover:underline transition-colors duration-300"
              >
                Login
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
