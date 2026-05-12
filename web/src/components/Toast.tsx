import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

export type ToastKind = 'success' | 'error' | 'info';

export type ToastMessage = {
  id: number;
  kind: ToastKind;
  message: string;
};

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const styles = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100',
  error: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-100',
  info: 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
};

export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);

  function showToast(message: string, kind: ToastKind = 'success') {
    setToast({ id: Date.now(), kind, message });
  }

  return {
    toast,
    showToast,
    clearToast: () => setToast(null),
  };
}

type ToastProps = {
  toast: ToastMessage | null;
  onClose: () => void;
};

export default function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(onClose, 2400);
    return () => window.clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) {
    return null;
  }

  const Icon = icons[toast.kind];

  return (
    <div className="fixed bottom-5 right-5 z-[60] max-w-[calc(100vw-2rem)]">
      <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg ${styles[toast.kind]}`}>
        <Icon size={18} className="shrink-0" />
        <span>{toast.message}</span>
        <button type="button" onClick={onClose} className="focus-ring -mr-1 inline-flex h-7 w-7 items-center justify-center rounded-md" title="关闭提示">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
