interface EmiCalculationLoaderProps {
  isLoading: boolean;
  message?: string;
}

/**
 * EmiCalculationLoader Component
 * 
 * Shows animated loading state while calculating EMI
 * - Animated dots effect
 * - Smooth fade transitions
 * - Disabled calculate button state
 * 
 * @example
 * <EmiCalculationLoader 
 *   isLoading={calculating}
 *   message="Calculating optimal repayment plan..."
 * />
 */
const EmiCalculationLoader = ({
  isLoading,
  message = "Calculating optimal repayment plan...",
}: EmiCalculationLoaderProps) => {
  if (!isLoading) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center py-8 animate-fade-in">
      {/* Loading Text with Animated Dots */}
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium text-gray-700">{message}</p>
        <div className="flex gap-1">
          <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
          <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
          <span className="inline-block w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
        </div>
      </div>

      {/* Animated Progress Line */}
      <div className="mt-4 w-32 h-1 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-green-400 to-blue-500 rounded-full animate-pulse" />
      </div>
    </div>
  );
};

export default EmiCalculationLoader;
