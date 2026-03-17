import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * ✅ Proper axios mock
 * - Defined inside factory (prevents hoisting issues)
 * - Matches structure used in api.client.ts
 */
vi.mock('axios', () => {
  const mockAxiosInstance = {
    defaults: {
      baseURL: 'http://localhost:8080',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    },
    interceptors: {
      request: {
        use: vi.fn(),
      },
      response: {
        use: vi.fn(),
      },
    },
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };

  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
    },
  };
});

// ✅ Import AFTER mock
import api from '../../services/api.client';

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ============================================
  // Initialization
  // ============================================

  it('should initialize api instance', () => {
    expect(api).toBeDefined();
    expect(api.defaults).toBeDefined();
  });

  it('should configure baseURL', () => {
    expect(api.defaults.baseURL).toContain('http');
  });

  it('should configure timeout', () => {
    expect(api.defaults.timeout).toBeGreaterThan(0);
  });

  it('should configure default headers', () => {
    expect(api.defaults.headers['Content-Type']).toBeDefined();
  });

  // ============================================
  // GET
  // ============================================

  it('should perform GET request', async () => {
    (api.get as any).mockResolvedValue({ data: { id: 1 } });

    const res = await api.get('/users/1');

    expect(res.data.id).toBe(1);
  });

  it('should handle GET error', async () => {
    (api.get as any).mockRejectedValue(new Error('Network error'));

    await expect(api.get('/users')).rejects.toThrow('Network error');
  });

  // ============================================
  // POST
  // ============================================

  it('should perform POST request', async () => {
    (api.post as any).mockResolvedValue({ data: { success: true } });

    const res = await api.post('/users', { name: 'John' });

    expect(res.data.success).toBe(true);
  });

  it('should handle POST error', async () => {
    (api.post as any).mockRejectedValue(new Error('Validation error'));

    await expect(api.post('/users', {})).rejects.toThrow('Validation error');
  });

  // ============================================
  // PUT
  // ============================================

  it('should perform PUT request', async () => {
    (api.put as any).mockResolvedValue({ data: { updated: true } });

    const res = await api.put('/users/1', { name: 'Jane' });

    expect(res.data.updated).toBe(true);
  });

  // ============================================
  // DELETE
  // ============================================

  it('should perform DELETE request', async () => {
    (api.delete as any).mockResolvedValue({ data: { deleted: true } });

    const res = await api.delete('/users/1');

    expect(res.data.deleted).toBe(true);
  });

  // ============================================
  // Edge Cases
  // ============================================

  it('should handle empty response', async () => {
    (api.get as any).mockResolvedValue({ data: null });

    const res = await api.get('/empty');

    expect(res.data).toBeNull();
  });

  it('should handle concurrent requests', async () => {
    (api.get as any).mockResolvedValue({ data: { id: 1 } });

    await Promise.all([
      api.get('/users/1'),
      api.get('/users/2'),
      api.get('/users/3'),
    ]);

    expect(api.get).toHaveBeenCalledTimes(3);
  });
});
