import { X } from 'lucide-react';
import type { ReactNode } from 'react';

type Props = {
  title: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
  maxWidth?: string;
  panelClassName?: string;
};

export default function AdminModal({
  title,
  children,
  footer,
  onClose,
  maxWidth = 'max-w-2xl',
  panelClassName = '',
}: Props) {
  return (
    <div className="admin-modal-backdrop fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div className={`admin-modal-panel max-h-[calc(100dvh-3rem)] w-full ${maxWidth} overflow-y-auto ${panelClassName}`}>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[var(--admin-border)] bg-[var(--admin-surface)] px-5 py-4 sm:px-6">
          <h2 className="text-lg font-semibold text-[var(--admin-text)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="admin-icon-button"
            title="关闭"
            data-tooltip="关闭"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 pb-1 sm:px-6">{children}</div>
        <div className="sticky bottom-0 z-10 mt-6 flex justify-end gap-2 border-t border-[var(--admin-border)] bg-[var(--admin-secondary)] px-5 py-4 sm:px-6">{footer}</div>
      </div>
    </div>
  );
}
