import { ChevronDown, ChevronRight, Plus, RefreshCw } from 'lucide-react';
import type { DragEvent } from 'react';
import AppCard from './AppCard';
import type { NavCategory } from '../types/app';

type Props = {
  category: NavCategory;
  collapsed: boolean;
  checkingHealth?: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onHealthCheck: () => void;
  onAddApp: () => void;
  quickSortEnabled?: boolean;
  sortingAppId?: number | null;
  dragOverAppId?: number | null;
  sortSaving?: boolean;
  onAppDragStart?: (event: DragEvent<HTMLDivElement>, appId: number) => void;
  onAppDragOver?: (event: DragEvent<HTMLDivElement>, appId: number) => void;
  onAppDrop?: (event: DragEvent<HTMLDivElement>, appId: number) => void;
  onAppDragEnd?: () => void;
};

export default function CategorySection({
  category,
  collapsed,
  checkingHealth = false,
  onCollapsedChange,
  onHealthCheck,
  onAddApp,
  quickSortEnabled = false,
  sortingAppId,
  dragOverAppId,
  sortSaving = false,
  onAppDragStart,
  onAppDragOver,
  onAppDrop,
  onAppDragEnd,
}: Props) {
  return (
    <section
      id={`category-${category.id}`}
      className="mx-auto w-[calc(100vw-2rem)] max-w-7xl scroll-mt-5 py-3 sm:w-[calc(100vw-3rem)] sm:py-4 lg:w-[calc(100vw-4rem)]"
    >
      <div className="surface grid gap-4 rounded-2xl p-4 shadow-[0_8px_28px_rgba(15,23,42,0.05)] sm:rounded-3xl sm:p-5 lg:grid-cols-[220px_1fr]">
        <div className="flex min-w-0 items-start justify-between gap-4 lg:block">
          <div className="min-w-0">
            <span className="mb-3 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-mint/10 text-2xl text-mint dark:bg-mint/20">
              {category.icon || '·'}
            </span>
            <h2 className="min-w-0 truncate text-xl font-semibold text-ink dark:text-white">{category.name}</h2>
            <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-slate-600 dark:text-slate-400">
              {category.description || `${category.apps.length} 个入口，按当前排序展示`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 lg:mt-5">
            <button
              type="button"
              onClick={onHealthCheck}
              className="focus-ring inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white/45 text-slate-500 transition hover:border-mint/40 hover:text-mint disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-800 dark:bg-white/5 dark:text-slate-400"
              title={checkingHealth ? '正在检查本分类' : '检查本分类'}
              data-tooltip={checkingHealth ? '正在检查本分类' : '检查本分类'}
              disabled={checkingHealth || category.apps.length === 0}
            >
              <RefreshCw size={16} className={checkingHealth ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={() => onCollapsedChange(!collapsed)}
              className="focus-ring inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white/45 text-slate-500 transition hover:border-mint/40 hover:text-mint dark:border-slate-800 dark:bg-white/5 dark:text-slate-400"
              title={collapsed ? '展开分类' : '折叠分类'}
              data-tooltip={collapsed ? '展开分类' : '折叠分类'}
              aria-expanded={!collapsed}
            >
              {collapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
            </button>
            <button
              type="button"
              onClick={onAddApp}
              className="focus-ring inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white/45 px-2.5 text-sm font-semibold text-slate-600 transition hover:border-mint/40 hover:text-mint dark:border-slate-800 dark:bg-white/5 dark:text-slate-300"
              title="新增入口"
              data-tooltip="新增入口"
            >
              <Plus size={16} />
              <span className="hidden sm:inline lg:hidden xl:inline">新增</span>
            </button>
          </div>
        </div>
        <div className={collapsed ? 'grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4' : 'grid gap-3 md:grid-cols-2 xl:grid-cols-3'}>
          {category.apps.map((app) => (
            <div
              key={app.id}
              id={`app-${app.id}`}
              className={`relative h-full rounded-lg transition ${
                sortingAppId === app.id ? 'scale-[0.99] opacity-60' : ''
              } ${dragOverAppId === app.id ? 'ring-2 ring-mint/50 ring-offset-2 ring-offset-[#f6f3ec] dark:ring-offset-slate-950' : ''}`}
              draggable={quickSortEnabled && !sortSaving}
              onDragStart={(event) => onAppDragStart?.(event, app.id)}
              onDragEnter={(event) => onAppDragOver?.(event, app.id)}
              onDragOver={(event) => onAppDragOver?.(event, app.id)}
              onDrop={(event) => onAppDrop?.(event, app.id)}
              onDragEnd={onAppDragEnd}
              aria-grabbed={quickSortEnabled && sortingAppId === app.id}
            >
              <AppCard app={app} compact={collapsed} sortMode={quickSortEnabled} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
