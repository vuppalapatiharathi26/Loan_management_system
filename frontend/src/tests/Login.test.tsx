import { render } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Login from '../components/auth/Login';

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../services/auth.service', () => ({
  AuthService: {
    loginUser: vi.fn(),
    loginAdmin: vi.fn(),
    loginManager: vi.fn(),
  },
}));

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render login page', () => {
    const { container } = render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });

  it('should render without crashing', () => {
    const { container } = render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
    expect(container.querySelectorAll('button').length).toBeGreaterThan(0);
  });

  it('should have input fields', () => {
    const { container } = render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );
    expect(container.querySelectorAll('input').length).toBeGreaterThan(0);
  });
});
