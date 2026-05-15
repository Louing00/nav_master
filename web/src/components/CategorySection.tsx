import { ChevronDown, ChevronRight, Plus, RefreshCw } from 'lucide-react';
import AppCard from './AppCard';
import type { NavCategory } from '../types/app';

type Props = {
  category: NavCategory;
  collapsed: boolean;
  checkingHealth?: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onHealthCheck: () => void;
  onAddApp: () => void;
};

export default function CategorySection({ category, collapsed, checkingHealth = false, onCollapsedChange, onHealthCheck, onAddApp }: Props) {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      <div className="mb-3 flex items-center justify-between gap-4 sm:mb-4">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xl text-mint">{category.icon || '·'}</span>
            <h2 className="min-w-0 truncate text-lg font-semibold text-ink dark:text-white sm:text-xl">{category.name}</h2>
            <button
              type="button"
              onClick={onHealthCheck}
              className="focus-ring inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-white/70 hover:text-mint disabled:cursor-not-allowed disabled:opacity-45 dark:text-slate-400 dark:hover:bg-slate-900"
              title={checkingHealth ? '正在检查本分类' : '检查本分类'}
              data-tooltip={checkingHealth ? '正在检查本分类' : '检查本分类'}
              disabled={checkingHealth || category.apps.length === 0}
            >
              <RefreshCw size={16} className={checkingHealth ? 'animate-spin' : ''} />
            </button>
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
        <button
          type="button"
          onClick={onAddApp}
          className="focus-ring inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white/45 px-2.5 text-sm font-semibold text-slate-600 transition hover:border-mint/40 hover:text-mint dark:border-slate-800 dark:bg-white/5 dark:text-slate-300"
          title="新增入口"
          data-tooltip="新增入口"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">新增入口</span>
        </button>
      </div>
      <div className={collapsed ? 'grid gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3'}>
        {category.apps.map((app) => (
          <AppCard key={app.id} app={app} compact={collapsed} />
        ))}
      </div>
    </section>
  );
}
