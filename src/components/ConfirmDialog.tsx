import React from "react";
import { AlertCircle } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

const variantStyles: Record<string, { icon: string; confirmBg: string }> = {
  danger: {
    icon: "bg-rose-50 text-rose-500 border-rose-200",
    confirmBg: "bg-rose-600 hover:bg-rose-700",
  },
  warning: {
    icon: "bg-amber-50 text-amber-500 border-amber-200",
    confirmBg: "bg-amber-600 hover:bg-amber-700",
  },
  info: {
    icon: "bg-sky-50 text-sky-500 border-sky-200",
    confirmBg: "bg-slate-900 hover:bg-slate-800",
  },
};

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;
  const styles = variantStyles[variant] || variantStyles.danger;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 print:hidden animate-fade-in">
      <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-md border border-slate-100 flex flex-col gap-4 animate-scale-in">
        <div className="flex items-start gap-3">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center border shrink-0 ${styles.icon}`}>
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">
              {title}
            </h3>
            <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="flex gap-2.5 pt-2 border-t border-slate-100">
          <button
            onClick={onCancel}
            className="flex-1 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-600 font-black tracking-wide text-[11px] uppercase py-2.5 transition-all cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-full text-white font-black tracking-wide text-[11px] uppercase py-2.5 transition-all cursor-pointer shadow-md ${styles.confirmBg}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
