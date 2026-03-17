// ============================================
// LOGIN COMPONENT - REDESIGNED
// ============================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthService } from "../../services/auth.service";
import { aadhaarDigits, formatAadhaar, isValidAadhaarDigits } from "../../utils/aadhaar";
import { Eye, EyeOff } from "lucide-react";
import CircularLoader from "../../components/loaders/CircularLoader";

// ============================================
// Types
// ============================================

type LoginType = "user" | "admin" | "manager";

interface LoginProps {
  isOpen?: boolean;
  setRole?: (role: string | null) => void;
}

// ============================================
// Login Component
// ============================================

const Login = ({
  isOpen = true,
  setRole = () => {},
}: LoginProps) => {
  const navigate = useNavigate();

  const [loginType, setLoginType] = useState<LoginType>("user");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  // ====================================
  // Handle Login
  // ====================================

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (loginType === "user") {
        if (!isValidAadhaarDigits(identifier)) {
          setError("Aadhaar number must be in XXXX XXXX XXXX format");
          setIsLoading(false);
          return;
        }
        const raw = aadhaarDigits(identifier);
        // Aadhaar + Password (JSON body)
        await AuthService.loginUser(raw, password);
        localStorage.setItem("last_user_aadhaar", raw);
      }

      if (loginType === "admin") {
        // OAuth2 form
        await AuthService.loginAdmin(identifier, password);
      }

      if (loginType === "manager") {
        // OAuth2 form
        await AuthService.loginManager(identifier, password);
      }

      const role = AuthService.getRole();
      setRole(role);
      navigateToDashboard(role);
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.response?.data?.detail || "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  // ====================================
  // Navigate to Dashboard
  // ====================================

  const navigateToDashboard = (role: string | null) => {
    switch (role) {
      case "USER":
        navigate("/user/dashboard");
        break;

      case "BANK_MANAGER":
        navigate("/bank-manager/dashboard");
        break;

      case "LOAN_MANAGER":
        navigate("/loan-manager/dashboard");
        break;

      case "ADMIN":
        navigate("/admin/dashboard");
        break;

      default:
        navigate("/");
    }
  };

  // ====================================
  // Render
  // ====================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-100 via-teal-100 to-green-100 relative flex flex-col items-center justify-center p-4">
      {/* Circular Loader when logging in */}
      <CircularLoader 
        isLoading={isLoading}
        text="Logging in..."
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
        <div className="bg-[#fcfbf6] rounded-2xl shadow-2xl p-8 md:p-10">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img 
              src="/src/assets/monify-logo.png" 
              alt="MONIFY Logo" 
              className="h-12 w-auto drop-shadow-md"
            />
          </div>

          {/* Tagline */}
          <h1 className="text-center text-gray-700 font-semibold text-base mb-6">
            Finance Made Simple. Growth Made Possible.
          </h1>

          {/* Login Type Selector */}
          <div className="flex gap-3 mb-6 bg-gray-100 p-1.5 rounded-lg">
            {[
              { type: "user" as LoginType, label: "User"},
              { type: "manager" as LoginType, label: "Manager"},
              { type: "admin" as LoginType, label: "Admin"},
            ].map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => {
                  setLoginType(item.type);
                  setIdentifier("");
                  setPassword("");
                  setError("");
                }}
                className={`flex-1 py-2 px-2 rounded-md font-semibold transition-all duration-300 text-xs md:text-sm ${
                  loginType === item.type
                    ? "bg-green-600 text-white shadow-md"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className="mr-1"></span>
                {item.label}
              </button>
            ))}
          </div>

          {/* Login Form */}
          <form
            onSubmit={handleLogin}
            className="space-y-5"
            autoComplete="off"
          >
            {/* Identifier Input */}
            <div>
              <label className="flex items-center gap-2 text-gray-700 font-semibold text-sm mb-3">
                {loginType === "user" && "Aadhaar Number"}
                {loginType === "admin" && "Username"}
                {loginType === "manager" && "Manager ID"}
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => {
                  if (loginType === "user") setIdentifier(formatAadhaar(e.target.value));
                  else setIdentifier(e.target.value);
                }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-[#fcfbf6] text-sm"
                placeholder={
                  loginType === "user"
                    ? "XXXX XXXX XXXX"
                    : loginType === "admin"
                    ? "Enter admin username"
                    : "Enter manager ID"
                }
                autoComplete="off"
                required
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="flex items-center gap-2 text-gray-700 font-semibold text-sm mb-3">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="password-input appearance-none w-full px-4 py-2.5 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 bg-gray-50 hover:bg-[#fcfbf6] text-sm"
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

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium flex items-center gap-2">
                ⚠️ {error}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 disabled:from-green-400 disabled:to-emerald-400 shadow-md hover:shadow-lg text-base"
            >
              Login
            </button>
          </form>

          {/* Register Link */}
          {loginType === "user" && (
            <div className="mt-6 text-center border-t pt-4">
              <p className="text-gray-600 text-sm mb-2">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/register")}
                  className="text-green-600 font-bold hover:text-green-700 hover:underline transition-colors duration-300"
                >
                  Register
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
