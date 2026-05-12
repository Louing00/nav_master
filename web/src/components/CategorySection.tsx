import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import AppCard from './AppCard';
import type { NavCategory } from '../types/app';

type Props = {
  category: NavCategory;
};

export default function CategorySection({ category }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-end justify-between gap-4">
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="focus-ring -ml-1 flex min-w-0 items-end gap-3 rounded-md px-1 py-1 text-left transition hover:text-mint"
          title={collapsed ? '展开分类' : '折叠分类'}
          aria-expanded={!collapsed}
        >
          <span className="pb-0.5 text-2xl text-mint">{category.icon || '·'}</span>
          <div className="flex items-center gap-3">
            {collapsed ? (
              <ChevronRight size={18} className="shrink-0 text-slate-500 dark:text-slate-400" />
            ) : (
              <ChevronDown size={18} className="shrink-0 text-slate-500 dark:text-slate-400" />
            )}
            <span className="min-w-0 truncate text-xl font-semibold text-ink dark:text-white">{category.name}</span>
          </div>
          {category.description && !collapsed && (
            <span className="ml-1 hidden max-w-xl truncate text-sm text-slate-600 dark:text-slate-400 md:inline">
              {category.description}
            </span>
          )}
        </button>
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
