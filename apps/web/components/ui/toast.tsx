'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';

type ToastVariant = 'success' | 'error' | 'info';

type Toast = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  toast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-20 left-4 right-4 z-[60] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto w-full max-w-app rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg animate-in slide-in-from-bottom-2 ${
              t.variant === 'success'
                ? 'bg-green-600'
                : t.variant === 'error'
                  ? 'bg-red-500'
                  : 'bg-gray-800'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
