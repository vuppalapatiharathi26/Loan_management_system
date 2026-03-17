// ============================================

// USE AUTH HOOK

// ============================================

import { useEffect, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { AuthService } from '../services/auth.service';
 
// ============================================

// Types

// ============================================

interface UseAuthReturn {

  isAuthenticated: boolean;

  role: string | null;

  userId: string | null;

  logout: () => void;

  navigateToDashboard: () => void;

}
 
// ============================================

// Hook

// ============================================

export const useAuth = (): UseAuthReturn => {

  const navigate = useNavigate();

  const [isAuthenticated, setIsAuthenticated] = useState(AuthService.isAuthenticated());

  const [role, setRole] = useState(AuthService.getRole());

  const [userId, setUserId] = useState(AuthService.getUserId());
 
  useEffect(() => {

    // Update auth state

    setIsAuthenticated(AuthService.isAuthenticated());

    setRole(AuthService.getRole());

    setUserId(AuthService.getUserId());

  }, []);
 
  const logout = () => {

    AuthService.logout();

    setIsAuthenticated(false);

    setRole(null);

    setUserId(null);

    navigate('/login');

  };
 
  const navigateToDashboard = () => {

    const currentRole = AuthService.getRole();

    switch (currentRole) {

      case 'USER':

        navigate('/user/dashboard');

        break;

      case 'BANK_MANAGER':

        navigate('/bank-manager/dashboard');

        break;

      case 'LOAN_MANAGER':

        navigate('/loan-manager/dashboard');

        break;

      case 'ADMIN':

        navigate('/admin/dashboard');

        break;

      default:

        navigate('/login');

    }

  };
 
  return {

    isAuthenticated,

    role,

    userId,

    logout,

    navigateToDashboard,

  };

};
 