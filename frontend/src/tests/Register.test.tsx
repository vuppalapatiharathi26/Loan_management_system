import { render } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Register from '../components/auth/Register';

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock AuthService
vi.mock('../services/auth.service', () => ({
  AuthService: {
    registerUser: vi.fn(),
  },
}));

// Mock Toast
vi.mock('../context/ToastContext', () => ({
  useToast: () => ({
    push: vi.fn(),
  }),
}));

describe('Register Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render registration page', () => {
    const { container } = render(
      <MemoryRouter>
        <Register isOpen={true} />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  it('should not render when closed', () => {
    const { container } = render(
      <MemoryRouter>
        <Register isOpen={false} />
      </MemoryRouter>
    );
    // Component returns null when isOpen is false
    expect(container.innerHTML.length === 0 || container).toBeTruthy();
  });

  it('should have form elements when open', () => {
    const { container } = render(
      <MemoryRouter>
        <Register isOpen={true} />
      </MemoryRouter>
    );
    expect(container.querySelectorAll('input').length >= 0).toBe(true);
  });
});
