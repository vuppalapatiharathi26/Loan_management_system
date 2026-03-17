import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Mock AuthService before importing ProtectedRoute
vi.mock('../../services/auth.service', () => ({
  AuthService: {
    isAuthenticated: vi.fn(),
    getRole: vi.fn(),
  },
}));

import ProtectedRoute from '../../routes/ProtectedRoute';
import { AuthService } from '../../services/auth.service';

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children when authenticated and role is allowed', () => {
    (AuthService.isAuthenticated as any).mockReturnValue(true);
    (AuthService.getRole as any).mockReturnValue('ADMIN');

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Content')).toBeTruthy();
  });

  it('redirects to login when not authenticated', () => {
    (AuthService.isAuthenticated as any).mockReturnValue(false);
    (AuthService.getRole as any).mockReturnValue(null);

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    // When not authenticated, should redirect to login (Protected Content should not be visible)
    expect(screen.queryByText('Protected Content')).toBeNull();
    expect(screen.getByText('Login Page')).toBeTruthy();
  });

  it('redirects when role is not allowed', () => {
    (AuthService.isAuthenticated as any).mockReturnValue(true);
    (AuthService.getRole as any).mockReturnValue('USER');

    render(
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route
            path="/protected"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/user/dashboard" element={<div>User Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );

    // When role is not allowed, should redirect (Protected Content should not be visible)
    expect(screen.queryByText('Protected Content')).toBeNull();
    expect(screen.getByText('User Dashboard')).toBeTruthy();
  });

  it('renders when authenticated and allowedRoles is undefined', () => {
    (AuthService.isAuthenticated as any).mockReturnValue(true);

    render(
      <MemoryRouter initialEntries={['/open']}>
        <Routes>
          <Route
            path="/open"
            element={
              <ProtectedRoute>
                <div>Open Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Open Content')).toBeTruthy();
  });

  it('allows access when role is in allowedRoles array', () => {
    (AuthService.isAuthenticated as any).mockReturnValue(true);
    (AuthService.getRole as any).mockReturnValue('BANK_MANAGER');

    render(
      <MemoryRouter initialEntries={['/manager']}>
        <Routes>
          <Route
            path="/manager"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'BANK_MANAGER']}>
                <div>Manager Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Manager Content')).toBeTruthy();
  });
});
