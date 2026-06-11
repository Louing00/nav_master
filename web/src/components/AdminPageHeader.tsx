import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type Props = {
  title: string;
  description: string;
  icon: LucideIcon;
  actions?: ReactNode;
};

export default function AdminPageHeader({ title, description, icon: Icon, actions }: Props) {
  return (
    <header className="admin-page-header">
      <div className="flex min-w-0 items-center gap-3">
        <span className="admin-page-icon">
          <Icon size={20} strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-[var(--admin-text)]">{title}</h1>
          <p className="mt-1 text-sm text-[var(--admin-muted)]">{description}</p>
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
