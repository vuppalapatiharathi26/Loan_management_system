import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";

export interface GlobalLoaderContextType {
  isLoading: boolean;
  requestCount: number;
  incrementRequests: () => void;
  decrementRequests: () => void;
}

/**
 * Global Loader Context
 * 
 * Manages global loading state for HTTP requests
 * Handles multiple concurrent requests gracefully
 * 
 * Usage in component:
 * const { isLoading, incrementRequests, decrementRequests } = useGlobalLoader();
 */
export const GlobalLoaderContext = createContext<GlobalLoaderContextType | null>(null);

export const useGlobalLoader = () => {
  const context = useContext(GlobalLoaderContext);
  if (!context) {
    throw new Error("useGlobalLoader must be used within GlobalLoaderProvider");
  }
  return context;
};

interface GlobalLoaderProviderProps {
  children: ReactNode;
}

export const GlobalLoaderProvider = ({ children }: GlobalLoaderProviderProps) => {
  const [requestCount, setRequestCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const incrementRequests = useCallback(() => {
    setRequestCount((prev) => {
      const newCount = prev + 1;
      setIsLoading(newCount > 0);
      return newCount;
    });
  }, []);

  const decrementRequests = useCallback(() => {
    setRequestCount((prev) => {
      const newCount = Math.max(0, prev - 1);
      setIsLoading(newCount > 0);
      return newCount;
    });
  }, []);

  return (
    <GlobalLoaderContext.Provider
      value={{ isLoading, requestCount, incrementRequests, decrementRequests }}
    >
      {children}
    </GlobalLoaderContext.Provider>
  );
};

export default useGlobalLoader;
