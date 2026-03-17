// ============================================

// PROTECTED ROUTE COMPONENT

// ============================================

import { Navigate, useLocation } from 'react-router-dom';

import { AuthService } from '../services/auth.service';
 
// ============================================

// Types

// ============================================

interface ProtectedRouteProps {

  children: React.ReactNode;

  allowedRoles?: string[];

}
 
// ============================================

// Protected Route Component

// ============================================

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {

  const location = useLocation();

  // Check authentication

  const isAuthenticated = AuthService.isAuthenticated();

  if (!isAuthenticated) {

    // Redirect to login, save attempted location

    return <Navigate to="/login" state={{ from: location }} replace />;

  }
 
  // Check role authorization

  if (allowedRoles) {

    const userRole = AuthService.getRole();

    if (!userRole || !allowedRoles.includes(userRole)) {

      // Unauthorized - redirect to appropriate dashboard

      return <Navigate to={getDashboardPath(userRole)} replace />;

    }

  }
 
  return <>{children}</>;

};
 
// ============================================

// Helper: Get Dashboard Path by Role

// ============================================

const getDashboardPath = (role: string | null): string => {

  switch (role) {

    case 'USER':

      return '/user/dashboard';

    case 'BANK_MANAGER':

      return '/bank-manager/dashboard';

    case 'LOAN_MANAGER':

      return '/loan-manager/dashboard';

    case 'ADMIN':

      return '/admin/dashboard';

    default:

      return '/login';

  }

};
 
export default ProtectedRoute;
 