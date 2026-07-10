import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { Check, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, durationMs?: number) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "success", durationMs: number = 4000) => {
      const id = `toast_${++counterRef.current}`;
      setToasts((prev) => [...prev, { id, message, type, duration: durationMs }]);
      setTimeout(() => removeToast(id), durationMs);
    },
    [removeToast]
  );

  const iconMap: Record<ToastType, React.ReactNode> = {
    success: <Check className="h-4 w-4" />,
    error: <AlertCircle className="h-4 w-4" />,
    info: <Info className="h-4 w-4" />,
  };

  const colorMap: Record<ToastType, string> = {
    success: "bg-[#FF2E63] text-white",
    error: "bg-rose-600 text-white",
    info: "bg-slate-800 text-white",
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none print:hidden max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`${colorMap[toast.type]} px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 font-extrabold text-xs animate-slide-in-right pointer-events-auto`}
          >
            <span className="shrink-0">{iconMap[toast.type]}</span>
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 p-0.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
