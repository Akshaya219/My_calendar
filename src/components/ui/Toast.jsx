import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ToastContext = createContext(null);

// ── Individual Toast ─────────────────────────────────────────────────────────
function ToastItem({ id, message, type, onDismiss }) {
  // Auto-dismiss after 3 s
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), 3000);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  const isError = type === 'error';

  return (
    <div
      role="alert"
      className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white w-full ${
        isError ? 'bg-red-500' : 'bg-[#111827]'
      }`}
    >
      {/* Icon */}
      {isError ? (
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      ) : (
        <svg className="w-4 h-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}

      <span className="flex-1 leading-snug">{message}</span>

      {/* Manual dismiss */}
      <button
        onClick={() => onDismiss(id)}
        aria-label="Dismiss"
        className="text-white/50 hover:text-white transition-colors cursor-pointer shrink-0"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ── Provider ─────────────────────────────────────────────────────────────────
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success') => {
    const id = String(Date.now() + Math.random());
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/*
        Desktop: fixed bottom-4 right-4, width 320px, left-aligned stack
        Mobile : above bottom nav (bottom-20), horizontally centered
      */}
      <div
        aria-live="polite"
        className="
          fixed z-[100] flex flex-col gap-2 pointer-events-none
          bottom-20 left-4 right-4 items-center
          md:bottom-4 md:right-4 md:left-auto md:items-stretch md:w-80
        "
      >
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto w-full">
            <ToastItem {...t} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
