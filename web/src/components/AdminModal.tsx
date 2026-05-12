import { X } from 'lucide-react';
import type { ReactNode } from 'react';

type Props = {
  title: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
  maxWidth?: string;
};

export default function AdminModal({ title, children, footer, onClose, maxWidth = 'max-w-2xl' }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#172033]/45 px-4 py-6 backdrop-blur-sm dark:bg-slate-950/70">
      <div className={`max-h-[calc(100vh-3rem)] w-full ${maxWidth} overflow-y-auto rounded-lg border border-black/10 bg-[#f6f3ec] p-5 shadow-xl dark:border-white/10 dark:bg-slate-900`}>
        <div className="flex items-center justify-between gap-4 border-b border-black/10 pb-4 dark:border-white/10">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-ink dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            title="关闭"
            data-tooltip="关闭"
          >
            <X size={18} />
          </button>
        </div>
        {children}
        <div className="mt-6 flex justify-end gap-2 border-t border-black/10 pt-4 dark:border-white/10">{footer}</div>
      </div>
    </div>
  );
}
