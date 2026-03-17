import apiClient from "./api.client";
import type { GlobalLoaderContextType } from "../stores/globalLoaderStore";

/**
 * Setup Axios Interceptors for Global Loader
 * 
 * Automatically triggers loading state on:
 * - Request start
 * - Request completion (success or error)
 * 
 * Call this in App.tsx on mount
 * 
 * @example
 * useEffect(() => {
 *   setupGlobalLoaderInterceptors(loaderContext);
 * }, []);
 */
export const setupGlobalLoaderInterceptors = (
  loaderContext: GlobalLoaderContextType | null
) => {
  if (!loaderContext) {
    console.warn("GlobalLoaderInterceptor: No loader context provided");
    return;
  }

  // Request interceptor - increment counter on start
  const requestInterceptor = apiClient.interceptors.request.use(
    (config) => {
      try {
        loaderContext.incrementRequests();
      } catch (error) {
        console.error("Error incrementing requests:", error);
      }
      return config;
    },
    (error) => {
      try {
        loaderContext.decrementRequests();
      } catch (decrementError) {
        console.error("Error decrementing requests on request error:", decrementError);
      }
      return Promise.reject(error);
    }
  );

  // Response interceptor - decrement counter on completion (NO DELAY)
  const responseInterceptor = apiClient.interceptors.response.use(
    (response) => {
      try {
        // Immediately decrement - no artificial delay
        loaderContext.decrementRequests();
      } catch (error) {
        console.error("Error decrementing requests on response:", error);
      }
      return response;
    },
    (error) => {
      try {
        // Immediately decrement on error - no artificial delay
        loaderContext.decrementRequests();
      } catch (decrementError) {
        console.error("Error decrementing requests on error response:", decrementError);
      }
      return Promise.reject(error);
    }
  );

  // Return function to eject interceptors if needed
  return () => {
    apiClient.interceptors.request.eject(requestInterceptor);
    apiClient.interceptors.response.eject(responseInterceptor);
  };
};

export default setupGlobalLoaderInterceptors;
