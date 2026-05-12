import { ChevronDown, ChevronRight } from 'lucide-react';
import AppCard from './AppCard';
import type { NavCategory } from '../types/app';

type Props = {
  category: NavCategory;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
};

export default function CategorySection({ category, collapsed, onCollapsedChange }: Props) {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-2xl text-mint">{category.icon || '·'}</span>
            <h2 className="min-w-0 truncate text-xl font-semibold text-ink dark:text-white">{category.name}</h2>
            <button
              type="button"
              onClick={() => onCollapsedChange(!collapsed)}
              className="focus-ring inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-white/70 hover:text-mint dark:text-slate-400 dark:hover:bg-slate-900"
              title={collapsed ? '展开分类' : '折叠分类'}
              data-tooltip={collapsed ? '展开分类' : '折叠分类'}
              aria-expanded={!collapsed}
            >
              {collapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
          {category.description && !collapsed && (
            <p className="mt-1 hidden max-w-xl truncate text-sm text-slate-600 dark:text-slate-400 md:block">
              {category.description}
            </p>
          )}
        </div>
        <span className="shrink-0 text-sm text-slate-500 dark:text-slate-400">{category.apps.length} 个入口</span>
      </div>
      <div className={collapsed ? 'grid gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3'}>
        {category.apps.map((app) => (
          <AppCard key={app.id} app={app} compact={collapsed} />
        ))}
      </div>
    </section>
  );
}
