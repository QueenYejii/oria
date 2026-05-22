import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";

type ToastTone = "success" | "error" | "info";

type Toast = {
  id: string;
  tone: ToastTone;
  title: string;
  message?: string;
};

type ToastInput = Omit<Toast, "id">;

type ToastContextValue = {
  notify: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function createToastId() {
  return `toast_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (toast: ToastInput) => {
      const id = createToastId();
      setToasts((current) => [{ ...toast, id }, ...current].slice(0, 4));
      window.setTimeout(() => dismiss(id), toast.tone === "error" ? 6200 : 4200);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = toast.tone === "success" ? CheckCircle2 : toast.tone === "error" ? XCircle : Info;

          return (
            <article key={toast.id} className={`toast ${toast.tone}`}>
              <Icon size={18} aria-hidden="true" />
              <div>
                <strong>{toast.title}</strong>
                {toast.message && <p>{toast.message}</p>}
              </div>
              <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification">
                <X size={16} aria-hidden="true" />
              </button>
            </article>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToasts() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToasts must be used inside ToastProvider.");
  }

  return context;
}
