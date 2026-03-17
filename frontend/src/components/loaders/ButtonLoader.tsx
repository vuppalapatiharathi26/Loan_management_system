import { Loader2 } from "lucide-react";

interface ButtonLoaderProps {
  isLoading: boolean;
  loadingText?: string;
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  variant?: "primary" | "secondary" | "danger";
  type?: "button" | "submit" | "reset";
}

/**
 * ButtonLoader Component
 * 
 * Reusable button component with integrated loading state
 * - Shows spinner when loading
 * - Disables button during request
 * - Prevents double submission
 * 
 * @example
 * <ButtonLoader 
 *   isLoading={loading}
 *   loadingText="Signing in..."
 *   onClick={handleLogin}
 *   className="w-full"
 * >
 *   Login
 * </ButtonLoader>
 */
const ButtonLoader = ({
  isLoading,
  loadingText = "Loading...",
  children,
  disabled = false,
  onClick,
  className = "",
  variant = "primary",
  type = "button",
}: ButtonLoaderProps) => {
  const baseStyles =
    "flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 whitespace-nowrap";

  const variantStyles: Record<string, string> = {
    primary: "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 disabled:from-green-400 disabled:to-emerald-400 shadow-md hover:shadow-lg",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:bg-gray-100 shadow-md hover:shadow-lg",
    danger: "bg-gradient-to-r from-red-600 to-pink-600 text-white hover:from-red-700 hover:to-pink-700 disabled:from-red-400 disabled:to-pink-400 shadow-md hover:shadow-lg",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isLoading || disabled}
      className={`${baseStyles} ${variantStyles[variant]} ${className} ${
        isLoading ? "cursor-wait" : "cursor-pointer"
      }`}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin flex-shrink-0" />
          <span className="font-medium">{loadingText}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default ButtonLoader;
