import { useEffect, useState, useContext } from "react";
import { GlobalLoaderContext } from "../../stores/globalLoaderStore";

/**
 * GlobalTopLoader Component
 * 
 * Thin progress bar at top of screen
 * - Appears when any HTTP request starts
 * - Disappears when all requests complete
 * - Handles multiple concurrent requests
 * - Minimum visibility: 400ms
 * 
 * Place this in App.tsx or main layout
 * 
 * @example
 * <GlobalTopLoader />
 */
const GlobalTopLoader = () => {
  const loaderContext = useContext(GlobalLoaderContext);
  const isLoading = loaderContext?.isLoading ?? false;
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  // Handle visibility with minimum duration
  useEffect(() => {
    if (isLoading) {
      setVisible(true);
      setProgress(30);

      // Simulate progress increment while loading
      const interval = setInterval(() => {
        setProgress((prev) => {
          const increment = Math.random() * 30;
          return Math.min(prev + increment, 90);
        });
      }, 500);

      return () => clearInterval(interval);
    } else {
      // Complete progress and hide after minimum time
      setProgress(100);
      const timer = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (!visible) {
    return null;
  }

  return (
    <>
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-[9999] h-1 bg-gray-100">
        <div
          className="h-full bg-gradient-to-r from-green-500 to-blue-600 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Optional: Backdrop Blur (subtle) */}
      {isLoading && (
        <div className="fixed inset-0 z-[9998] pointer-events-none backdrop-blur-[0.5px]" />
      )}
    </>
  );
};

export default GlobalTopLoader;
