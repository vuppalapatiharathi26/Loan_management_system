/**
 * Loader Components Index
 * 
 * Central export point for all loader components
 * Makes imports cleaner and more maintainable
 */

// Button & Action Loaders
export { default as ButtonLoader } from "./ButtonLoader";
export type { default as ButtonLoaderProps } from "./ButtonLoader";

// Circular Loader
export { default as CircularLoader } from "./CircularLoader";

// Process Loaders
export { default as LoanProcessingLoader } from "./LoanProcessingLoader";
export { default as EmiCalculationLoader } from "./EmiCalculationLoader";
export { default as ProgressBar } from "./ProgressBar";

// Skeleton Loaders
export { default as SkeletonCard } from "./SkeletonCard";
export { default as SkeletonTable } from "./SkeletonTable";
export { default as SkeletonChart } from "./SkeletonChart";

// Global Loader
export { default as GlobalTopLoader } from "./GlobalTopLoader";
