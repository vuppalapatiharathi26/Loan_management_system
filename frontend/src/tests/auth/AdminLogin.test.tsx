import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../../pages/LoginPage';
import { ToastProvider } from '../../context/ToastContext';

// Mock AuthService
vi.mock('../../services/auth.service', () => ({
  AuthService: {
    loginAdmin: vi.fn(),
    loginUser: vi.fn(),
    loginManager: vi.fn(),
  },
}));

// Mock navigation
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

const renderWithProviders = () =>
  render(
    <BrowserRouter>
      <ToastProvider>
        <LoginPage />
      </ToastProvider>
    </BrowserRouter>
  );

describe('Admin Login Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should render login page', () => {
    const { container } = renderWithProviders();
    expect(container).toBeTruthy();
  });

  it('should render without crashing', () => {
    const { container } = renderWithProviders();
    expect(container).toBeTruthy();
  });

  it('should have input fields', () => {
    const { container } = renderWithProviders();
    const inputs = container.querySelectorAll('input');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('should have buttons', () => {
    const { container } = renderWithProviders();
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });
});
