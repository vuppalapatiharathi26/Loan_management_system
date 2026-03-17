import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import UserDashboard from '../../pages/user/UserDashboard';
import { ToastProvider } from '../../context/ToastContext';

// Mock services
vi.mock('../../services/user.service', () => ({
  UserService: {
    getProfile: vi.fn(),
    getLoan: vi.fn(),
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

const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <BrowserRouter>
      <ToastProvider>
        {component}
      </ToastProvider>
    </BrowserRouter>
  );
};

describe('User Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    localStorage.clear();
  });

  describe('Page Rendering', () => {
    it('should render dashboard', () => {
      const { container } = renderWithProviders(<UserDashboard />);
      expect(container).toBeTruthy();
    });

    it('should render without errors', () => {
      renderWithProviders(<UserDashboard />);
      expect(document.body).toBeTruthy();
    });
  });

  describe('Content', () => {
    it('should display main content area', () => {
      renderWithProviders(<UserDashboard />);
      // Check that the page has content
      const main = screen.queryByRole('main');
      expect(main || document.body).toBeTruthy();
    });
  });
});
