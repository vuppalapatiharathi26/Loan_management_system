// ============================================
// APP.TSX - ROLE-BASED ROUTING (FINAL)
// ============================================
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { ToastProvider } from "./context/ToastContext";
import { GlobalLoaderProvider, useGlobalLoader } from "./stores/globalLoaderStore";
import { setupGlobalLoaderInterceptors } from "./services/globalLoaderInterceptor";
import ProtectedRoute from "./routes/ProtectedRoute";
import { AuthService } from "./services/auth.service";
import LoanManagerLayout from "./layouts/LoanManagerLayout";
import LoanManagerDashboard from "./pages/loanManager/LoanManagerDashboard";
import EscalatedLoans from "./pages/loanManager/EscalatedLoans";
import LoanHistory from "./pages/loanManager/LoanHistory";
import BankManagerDashboard from "./pages/bankManager/BankManagerDashboard";
import BankManagerLayout from "./layouts/BankManagerLayout";
import QueriesPage from "./pages/bankManager/QueriesPage";

// ============================================
// Pages
// ============================================

// Public
import Home from "./pages/Home";
import Hero from "./components/Homepage/Hero";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

// User
import UserDashboard from "./pages/user/UserDashboard";
import UserProfile from "./pages/user/UserProfile";
import UserLoanPage from "./pages/user/UserLoanPage";
import DigiPinSetup from "./pages/user/DigiPinSetup";

// Admin
import AdminLayout from "./layouts/AdminLayout";
import UserLayout from "./layouts/UserLayout";
import ManagerPage from "./pages/admin/ManagerPage";
import UserPage from "./pages/admin/UserPage";
import EscalatedLoansPage from "./pages/admin/AdminEscalatedLoanPage";

// ============================================
// Root Redirect (based on auth + role)
// ============================================
const RootRedirect = () => {
  const isAuthenticated = AuthService.isAuthenticated();

  if (!isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  const role = AuthService.getRole();

  switch (role) {
    case "USER":
      return <Navigate to="/user/dashboard" replace />;
    case "BANK_MANAGER":
      return <Navigate to="/bank-manager/dashboard" replace />;
    case "LOAN_MANAGER":
      return <Navigate to="/loan-manager/dashboard" replace />;
    case "ADMIN":
      return <Navigate to="/admin" replace />;
    default:
      return <Navigate to="/home" replace />;
  }
};

// ============================================
// Inner App Content (uses GlobalLoader context)
// ============================================
const AppContent = () => {
  const loaderContext = useGlobalLoader();

  useEffect(() => {
    // Setup interceptors and get cleanup function
    const cleanup = setupGlobalLoaderInterceptors(loaderContext);
    
    // Cleanup on unmount to prevent duplicate interceptors
    return () => {
      if (cleanup && typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [loaderContext]);

  return (
    <>
      <BrowserRouter>
        <Routes>
          {/* Root */}
          <Route path="/" element={<RootRedirect />} />

          {/* Public */}
          <Route path="/home" element={<Home />}>
            <Route index element={<Hero />} />
          </Route>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* USER */}
          <Route
            path="/user"
            element={
              <ProtectedRoute allowedRoles={["USER"]}>
                <UserLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<UserDashboard />} />
            <Route path="loans" element={<UserLoanPage />} />
            <Route path="profile" element={<UserProfile />} />
            <Route path="digi-pin-setup" element={<DigiPinSetup />} />
          </Route>

          {/* BANK MANAGER */}
          <Route
            path="/bank-manager"
            element={
              <ProtectedRoute allowedRoles={["BANK_MANAGER"]}>
                <BankManagerLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<BankManagerDashboard />} />
            <Route path="queries" element={<QueriesPage />} />
          </Route>

          {/* LOAN MANAGER */}
          <Route
            path="/loan-manager"
            element={
              <ProtectedRoute allowedRoles={["LOAN_MANAGER"]}>
                <LoanManagerLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<LoanManagerDashboard />} />
            <Route path="escalated" element={<EscalatedLoans />} />
            <Route path="history" element={<LoanHistory />} />
          </Route>

          {/* ADMIN */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="managers" replace />} />
            <Route path="managers" element={<ManagerPage />} />
            <Route path="users" element={<UserPage />} />
            <Route path="escalated-loans" element={<EscalatedLoansPage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

// ============================================
// App Component
// ============================================
function App() {
  return (
    <ErrorBoundary>
      <GlobalLoaderProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </GlobalLoaderProvider>
    </ErrorBoundary>
  );
}

export default App;
