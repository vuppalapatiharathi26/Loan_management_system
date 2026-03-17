import { describe, it, expect, beforeEach, vi } from 'vitest';

/* ============================================
   Mock api.client PROPERLY (hoist-safe)
============================================ */

vi.mock('../../services/api.client', () => {
  return {
    default: {
      post: vi.fn(),
    },
    TokenManager: {
      setToken: vi.fn(),
      getToken: vi.fn(),
      removeToken: vi.fn(),
      getUserRole: vi.fn(),
      getUserId: vi.fn(),
      isTokenExpired: vi.fn(),
    },
  };
});

/* ============================================
   Import AFTER mock
============================================ */

import { AuthService } from '../../services/auth.service';
import apiClient, { TokenManager } from '../../services/api.client';

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // REGISTER
  // ============================================

  it('should register user successfully', async () => {
    (apiClient.post as any).mockResolvedValue({});

    await AuthService.registerUser({
      first_name: 'John',
      last_name: 'Doe',
      phone: '9876543210',
      password: 'password123',
      aadhaar: '123412341234',
    });

    expect(apiClient.post).toHaveBeenCalledWith(
      '/auth/user/register',
      expect.objectContaining({
        first_name: 'John',
      })
    );
  });

  // ============================================
  // USER LOGIN
  // ============================================

  it('should login user and store token', async () => {
    (apiClient.post as any).mockResolvedValue({
      data: { access_token: 'test-token' },
    });

    const token = await AuthService.loginUser('123412341234', 'password');

    expect(token).toBe('test-token');
    expect(TokenManager.setToken).toHaveBeenCalledWith('test-token');
  });

  it('should throw error on login failure', async () => {
    (apiClient.post as any).mockRejectedValue(new Error('Invalid'));

    await expect(
      AuthService.loginUser('1234', 'wrong')
    ).rejects.toThrow();
  });

  // ============================================
  // ADMIN LOGIN
  // ============================================

  it('should login admin and store token', async () => {
    (apiClient.post as any).mockResolvedValue({
      data: { access_token: 'admin-token' },
    });

    const token = await AuthService.loginAdmin('admin', 'password');

    expect(token).toBe('admin-token');
    expect(TokenManager.setToken).toHaveBeenCalledWith('admin-token');
  });

  // ============================================
  // MANAGER LOGIN
  // ============================================

  it('should login manager and store token', async () => {
    (apiClient.post as any).mockResolvedValue({
      data: { access_token: 'manager-token' },
    });

    const token = await AuthService.loginManager('manager1', 'password');

    expect(token).toBe('manager-token');
    expect(TokenManager.setToken).toHaveBeenCalledWith('manager-token');
  });

  // ============================================
  // AUTH STATE
  // ============================================

  it('should return true when authenticated', () => {
    (TokenManager.getToken as any).mockReturnValue('token');
    (TokenManager.isTokenExpired as any).mockReturnValue(false);

    expect(AuthService.isAuthenticated()).toBe(true);
  });

  it('should return false when token missing', () => {
    (TokenManager.getToken as any).mockReturnValue(null);

    expect(AuthService.isAuthenticated()).toBe(false);
  });

  it('should logout properly', () => {
    AuthService.logout();

    expect(TokenManager.removeToken).toHaveBeenCalled();
  });

  it('should return user role', () => {
    (TokenManager.getUserRole as any).mockReturnValue('ADMIN');

    expect(AuthService.getRole()).toBe('ADMIN');
  });

  it('should return user id', () => {
    (TokenManager.getUserId as any).mockReturnValue('123');

    expect(AuthService.getUserId()).toBe('123');
  });
});
