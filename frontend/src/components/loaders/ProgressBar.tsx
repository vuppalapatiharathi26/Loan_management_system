interface ProgressBarProps {
  progress: number; // 0-100
  showLabel?: boolean;
  height?: "sm" | "md" | "lg";
  color?: "green" | "blue" | "amber" | "red";
}

/**
 * ProgressBar Component
 * 
 * Animated progress bar for file uploads and processing
 * - Smooth width transition
 * - Optional percentage label
 * - Multiple size and color variants
 * 
 * @example
 * <ProgressBar 
 *   progress={65}
 *   showLabel
 *   color="blue"
 * />
 */
const ProgressBar = ({
  progress,
  showLabel = false,
  height = "md",
  color = "blue",
}: ProgressBarProps) => {
  // Clamp progress between 0 and 100
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  const heightStyles = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3",
  };

  const colorStyles = {
    green: "bg-green-600",
    blue: "bg-blue-600",
    amber: "bg-amber-600",
    red: "bg-red-600",
  };

  return (
    <div className="w-full">
      {/* Progress Bar Container */}
      <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${heightStyles[height]}`}>
        {/* Progress Fill */}
        <div
          className={`h-full ${colorStyles[color]} transition-all duration-500 ease-out`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>

      {/* Optional Label */}
      {showLabel && (
        <div className="mt-2 text-right">
          <p className="text-sm font-medium text-gray-700">
            {clampedProgress}%
          </p>
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
