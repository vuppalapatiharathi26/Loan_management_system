import '@testing-library/jest-dom';
import type { Assertion, AsymmetricMatchersContaining } from 'vitest';
import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';

declare global {
  namespace Vi {
    interface Matchers<R>
      extends TestingLibraryMatchers<
        typeof expect.stringContaining,
        R
      > {}
  }
}
