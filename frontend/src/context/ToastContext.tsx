import React, { createContext, useContext, useMemo, useState } from 'react';

type Toast = { id: string; type?: 'success'|'error'|'info'; message: string };

const ToastContext = createContext<{
  push: (t: Omit<Toast,'id'>) => void;
} | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = (t: Omit<Toast,'id'>) => {
    const id = String(Date.now()) + Math.random().toString(36).slice(2,6);
    const toast: Toast = { id, ...t };
    setToasts((s) => [...s, toast].slice(-3));
    setTimeout(() => {
      setToasts((s) => s.filter(x => x.id !== id));
    }, 4500);
  };

  const latest = useMemo(() => {
    if (toasts.length === 0) return null;
    return toasts[toasts.length - 1];
  }, [toasts]);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[min(560px,calc(100vw-2rem))] pointer-events-none">
        {latest && (
          <div className={`toast-island ${latest.type || "info"} pointer-events-auto`}>
            <div className={`toast-dot ${latest.type || "info"}`} />
            <div className="toast-text">{latest.message}</div>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
};
