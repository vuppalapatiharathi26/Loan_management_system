import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../../pages/LoginPage';

// Mock auth service
vi.mock('../../services/auth.service', () => ({
  AuthService: {
    loginUser: vi.fn(),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('User Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    localStorage.clear();
  });

  const renderLogin = () =>
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

  // ---------------------------
  // Rendering Tests
  // ---------------------------

  describe('Form Rendering', () => {
    it('should render login page without crashing', () => {
      const { container } = renderLogin();
      expect(container).toBeTruthy();
    });

    it('should render login type buttons', () => {
      renderLogin();

      expect(
        screen.getByRole('button', { name: /user/i })
      ).toBeInTheDocument();

      expect(
        screen.getByRole('button', { name: /manager/i })
      ).toBeInTheDocument();

      expect(
        screen.getByRole('button', { name: /admin/i })
      ).toBeInTheDocument();
    });

    it('should render password input field', () => {
      renderLogin();

      // Try placeholder first (most common)
      const passwordInput =
        screen.queryByPlaceholderText(/password/i) ||
        screen.queryAllByDisplayValue('')[1] ||
        screen.getAllByRole('textbox')[1];

      expect(passwordInput).toBeInTheDocument();
    });

    it('should render submit button', () => {
      renderLogin();

      expect(
        screen.getByRole('button', { name: /login|submit/i })
      ).toBeInTheDocument();
    });
  });
});
