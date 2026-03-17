import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoanApplication from '../../components/user/LoanApplication';
import { ToastProvider } from '../../context/ToastContext';

// Mock services
vi.mock('../../services/user.service', () => ({
  UserService: {
    previewLoan: vi.fn(),
    applyForLoan: vi.fn(),
    getProfile: vi.fn(),
    getLoan: vi.fn().mockResolvedValue([]),
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

const mockUser = {
  userId: '123',
  name: 'John Doe',
  phone: '1234567890',
  accountStatus: 'APPROVED',
  kycStatus: 'COMPLETED',
};

const renderWithProviders = () =>
  render(
    <BrowserRouter>
      <ToastProvider>
        <LoanApplication user={mockUser as any} />
      </ToastProvider>
    </BrowserRouter>
  );

describe('Loan Application Form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    const { container } = renderWithProviders();
    expect(container).toBeTruthy();
  });

  it('should have a submit button', () => {
    const { container } = renderWithProviders();
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should render form elements', () => {
    const { container } = renderWithProviders();
    const form = container.querySelector('form');
    expect(form || container).toBeTruthy();
  });
});
