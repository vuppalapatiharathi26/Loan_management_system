/**
 * CircularLoader Component
 * 
 * Full-screen circular spinner with loading text
 * - Animated 360° rotation
 * - Semi-transparent backdrop
 * - Perfect for login, register, and payment screens
 * 
 * @example
 * <CircularLoader 
 *   isLoading={loading}
 *   text="Logging in..."
 * />
 */

interface CircularLoaderProps {
  isLoading: boolean;
  text?: string;
}

const CircularLoader = ({
  isLoading,
  text = "Loading...",
}: CircularLoaderProps) => {
  if (!isLoading) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-300" />

      {/* Loader Container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 max-w-sm">
          {/* Animated Spinner */}
          <div className="relative w-16 h-16">
            {/* Outer circle */}
            <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
            
            {/* Rotating circle */}
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-green-600 border-r-green-600 animate-spin" />
            
            {/* Inner glow */}
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-green-50 to-emerald-50" />
          </div>

          {/* Loading Text */}
          <div className="text-center">
            <p className="text-lg font-semibold text-gray-800">{text}</p>
            <p className="text-sm text-gray-500 mt-2">Please wait...</p>
          </div>

          {/* Animated Dots */}
          <div className="flex gap-1.5">
            <span className="inline-block w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: "0s" }} />
            <span className="inline-block w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
            <span className="inline-block w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
          </div>
        </div>
      </div>
    </>
  );
};

export default CircularLoader;
