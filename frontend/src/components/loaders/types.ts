/**
 * Loader Components - Type Definitions
 * 
 * Centralized TypeScript interfaces and types for all loader components
 */

// ============================================
// BUTTON LOADER TYPES
// ============================================

export type ButtonVariant = "primary" | "secondary" | "danger";

export interface ButtonLoaderProps {
  isLoading: boolean;
  loadingText?: string;
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  variant?: ButtonVariant;
}

// ============================================
// LOAN PROCESSING LOADER TYPES
// ============================================

export interface LoanProcessingStep {
  id: number;
  label: string;
}

export interface LoanProcessingLoaderProps {
  currentStep: number;
  steps?: LoanProcessingStep[];
  isComplete?: boolean;
}

// ============================================
// PROGRESS BAR TYPES
// ============================================

export type ProgressBarColor = "green" | "blue" | "amber" | "red";
export type ProgressBarHeight = "sm" | "md" | "lg";

export interface ProgressBarProps {
  progress: number; // 0-100
  showLabel?: boolean;
  height?: ProgressBarHeight;
  color?: ProgressBarColor;
}

// ============================================
// EMI CALCULATION LOADER TYPES
// ============================================

export interface EmiCalculationLoaderProps {
  isLoading: boolean;
  message?: string;
}

// ============================================
// SKELETON CARD TYPES
// ============================================

export interface SkeletonCardProps {
  // No props - renders standard skeleton card
}

// ============================================
// SKELETON TABLE TYPES
// ============================================

export interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

// ============================================
// SKELETON CHART TYPES
// ============================================

export interface SkeletonChartProps {
  // No props - renders standard skeleton chart
}

// ============================================
// GLOBAL LOADER CONTEXT TYPES
// ============================================

export interface GlobalLoaderContextType {
  isLoading: boolean;
  requestCount: number;
  incrementRequests: () => void;
  decrementRequests: () => void;
}

export interface GlobalLoaderProviderProps {
  children: React.ReactNode;
}

// ============================================
// GLOBAL LOADER INTERCEPTOR TYPES
// ============================================

export interface GlobalLoaderInterceptorConfig {
  minVisibilityMs?: number; // Minimum time to show loader (default: 400)
  progressUpdateInterval?: number; // How often to update progress (default: 500)
}

// ============================================
// COMMON TYPES
// ============================================

export interface LoadingState {
  isLoading: boolean;
  error?: Error | null;
  data?: unknown;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface ProcessStep {
  id: number;
  label: string;
  completed: boolean;
  active: boolean;
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Hook that returns loading state
 */
export type UseLoadingReturn = [
  isLoading: boolean,
  setLoading: (loading: boolean) => void
];

/**
 * Async function wrapper that handles loading state
 */
export type WithLoading<T extends (...args: any[]) => Promise<any>> = (
  ...args: Parameters<T>
) => Promise<ReturnType<T>>;

// ============================================
// EXPORTED CONST TYPES
// ============================================

/**
 * Default EMI calculation steps
 */
export const DEFAULT_EMI_STEPS: LoanProcessingStep[] = [
  { id: 1, label: "Submitting Application" },
  { id: 2, label: "Verifying Eligibility" },
  { id: 3, label: "Calculating EMI" },
];

/**
 * Default button variants
 */
export const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-green-600 text-white hover:bg-green-700 disabled:bg-green-400",
  secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:bg-gray-100",
  danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-400",
};

/**
 * Progress bar colors
 */
export const PROGRESS_COLORS: Record<ProgressBarColor, string> = {
  green: "bg-green-600",
  blue: "bg-blue-600",
  amber: "bg-amber-600",
  red: "bg-red-600",
};

/**
 * Progress bar heights
 */
export const PROGRESS_HEIGHTS: Record<ProgressBarHeight, string> = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
};
