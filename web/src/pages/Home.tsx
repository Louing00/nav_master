import { LayoutGrid, LogOut, Menu, Moon, Search, Shield, Sun, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CategorySection from '../components/CategorySection';
import EmptyState from '../components/EmptyState';
import { logout } from '../api/auth';
import { getErrorMessage } from '../api/client';
import { checkPublicCategoryHealth, fetchPublicApps, fetchPublicConfig } from '../api/public';
import Toast, { useToast } from '../components/Toast';
import type { NavApp, NavCategory } from '../types/app';
import type { SiteSettings } from '../types/setting';

const COLLAPSED_CATEGORIES_KEY = 'atlasgate.home.collapsedCategories';

function readCollapsedCategories() {
  try {
    const raw = window.localStorage.getItem(COLLAPSED_CATEGORIES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function mergeCheckedApps(categories: NavCategory[], checkedApps: NavApp[]) {
  const appMap = new Map(checkedApps.map((app) => [app.id, app]));
  return categories.map((category) => ({
    ...category,
    apps: category.apps.map((app) => (appMap.has(app.id) ? { ...app, ...appMap.get(app.id)! } : app)),
  }));
}

function formatHealthSummary(categoryName: string, checkedApps: NavApp[]) {
  if (checkedApps.length === 0) {
    return `${categoryName} 没有启用健康检查的应用`;
  }

  const healthy = checkedApps.filter((app) => app.healthStatus === 'healthy').length;
  const unhealthy = checkedApps.filter((app) => app.healthStatus === 'unhealthy').length;
  return `${categoryName} 检查完成：正常 ${healthy} 个，异常 ${unhealthy} 个`;
}

export default function Home() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SiteSettings>({});
  const [categories, setCategories] = useState<NavCategory[]>([]);
  const [keyword, setKeyword] = useState('');
  const [dark, setDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>(readCollapsedCategories);
  const [checkingCategoryIds, setCheckingCategoryIds] = useState<Set<number>>(new Set());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { toast, showToast, clearToast } = useToast();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  useEffect(() => {
    window.localStorage.setItem(COLLAPSED_CATEGORIES_KEY, JSON.stringify(collapsedCategories));
  }, [collapsedCategories]);

  useEffect(() => {
    Promise.all([fetchPublicConfig(), fetchPublicApps()]).then(([config, apps]) => {
      setSettings(config);
      setCategories(apps);
    });
  }, []);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) {
      return categories;
    }

    return categories
      .map((category) => ({
        ...category,
        apps: category.apps.filter((app) =>
          [app.name, app.description || '', ...app.tags].join(' ').toLowerCase().includes(q),
        ),
      }))
      .filter((category) => category.apps.length > 0);
  }, [categories, keyword]);

  const filteredCategoryIds = filtered.map((category) => String(category.id));
  const allFilteredCollapsed = filteredCategoryIds.length > 0 && filteredCategoryIds.every((id) => collapsedCategories[id]);

  async function handleLogout() {
    await logout();
    navigate('/admin/login');
  }

  function toggleAllCategories() {
    const nextCollapsed = !allFilteredCollapsed;
    setCollapsedCategories((current) => {
      const next = { ...current };
      filteredCategoryIds.forEach((id) => {
        if (nextCollapsed) {
          next[id] = true;
        } else {
          delete next[id];
        }
      });
      return next;
    });
  }

  function toggleAllAndCloseMenu() {
    toggleAllCategories();
    setMobileMenuOpen(false);
  }

  function setCategoryCollapsed(id: number, collapsed: boolean) {
    setCollapsedCategories((current) => {
      const next = { ...current };
      if (collapsed) {
        next[String(id)] = true;
      } else {
        delete next[String(id)];
      }
      return next;
    });
  }

  async function runCategoryHealthCheck(category: NavCategory) {
    if (checkingCategoryIds.has(category.id)) {
      return;
    }

    setCheckingCategoryIds((current) => new Set(current).add(category.id));
    try {
      const checkedApps = await checkPublicCategoryHealth(category.id);
      setCategories((current) => mergeCheckedApps(current, checkedApps));
      const hasUnhealthy = checkedApps.some((app) => app.healthStatus === 'unhealthy');
      showToast(formatHealthSummary(category.name, checkedApps), hasUnhealthy ? 'error' : 'success');
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setCheckingCategoryIds((current) => {
        const next = new Set(current);
        next.delete(category.id);
        return next;
      });
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f3ec] text-ink dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-black/10 bg-[#f6f3ec]/88 backdrop-blur dark:border-white/10 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:gap-6 sm:px-6 sm:py-6 lg:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center text-3xl text-ink dark:text-white sm:h-12 sm:w-12 sm:text-4xl">
                {settings.logo || '✦'}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold sm:text-3xl">{settings.site_title || 'AtlasGate 星渡枢航'}</h1>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400 sm:line-clamp-none">
                  {settings.site_subtitle || '个人系统、内网服务与运维入口的统一星图'}
                </p>
              </div>
            </div>
            <div className="hidden gap-2 sm:flex">
              <button
                type="button"
                onClick={toggleAllCategories}
                className={`focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md transition ${
                  allFilteredCollapsed
                    ? 'bg-ink text-white hover:bg-mint dark:bg-white dark:text-ink'
                    : 'border border-slate-200 bg-white/40 text-slate-600 hover:border-mint/40 hover:text-mint dark:border-slate-800 dark:bg-white/5 dark:text-slate-300'
                }`}
                title={allFilteredCollapsed ? '展开全部分类' : '紧凑显示全部分类'}
                data-tooltip={allFilteredCollapsed ? '展开全部分类' : '紧凑显示全部分类'}
                aria-pressed={allFilteredCollapsed}
              >
                <LayoutGrid size={18} />
              </button>
              <Link
                to="/admin"
                className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white/40 text-slate-600 hover:border-mint/40 hover:text-mint dark:border-slate-800 dark:bg-white/5 dark:text-slate-300"
                title="后台管理"
                data-tooltip="后台管理"
              >
                <Shield size={18} />
              </Link>
              <button
                type="button"
                onClick={() => setDark((value) => !value)}
                className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md bg-mint text-white shadow-sm hover:bg-ink dark:bg-mint"
                title="切换主题"
                data-tooltip="切换主题"
              >
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white/40 text-slate-600 hover:border-red-300 hover:text-red-600 dark:border-slate-800 dark:bg-white/5 dark:text-slate-300 dark:hover:border-red-400 dark:hover:text-red-300"
                title="退出登录"
                data-tooltip="退出登录"
              >
                <LogOut size={18} />
              </button>
            </div>
            <div className="relative flex shrink-0 gap-2 sm:hidden">
              <button
                type="button"
                onClick={() => setDark((value) => !value)}
                className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md bg-mint text-white shadow-sm hover:bg-ink dark:bg-mint"
                title="切换主题"
                data-tooltip="切换主题"
              >
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen((value) => !value)}
                className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white/60 text-slate-600 shadow-sm hover:border-mint/40 hover:text-mint dark:border-slate-800 dark:bg-white/5 dark:text-slate-300"
                title={mobileMenuOpen ? '收起菜单' : '更多操作'}
                data-tooltip={mobileMenuOpen ? '收起菜单' : '更多操作'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
              {mobileMenuOpen && (
                <div className="absolute right-0 top-12 z-20 w-52 overflow-hidden rounded-lg border border-black/10 bg-white/95 p-1.5 text-sm shadow-xl shadow-slate-900/10 backdrop-blur dark:border-white/10 dark:bg-slate-900/95">
                  <button
                    type="button"
                    onClick={toggleAllAndCloseMenu}
                    className="focus-ring flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <LayoutGrid size={17} />
                    {allFilteredCollapsed ? '展开全部分类' : '紧凑显示全部分类'}
                  </button>
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="focus-ring flex items-center gap-3 rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Shield size={17} />
                    后台管理
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="focus-ring flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-slate-700 hover:bg-red-50 hover:text-red-600 dark:text-slate-200 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                  >
                    <LogOut size={17} />
                    退出登录
                  </button>
                </div>
              )}
            </div>
          </div>

          <label className="surface flex items-center gap-3 rounded-lg px-3.5 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.05)] sm:px-4 sm:py-3">
            <Search size={20} className="shrink-0 text-slate-500" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索系统、描述或标签"
              className="w-full bg-transparent text-base outline-none placeholder:text-slate-400"
            />
          </label>
        </div>
      </header>

      <div className="py-4">
        {filtered.length ? (
          filtered.map((category) => (
            <CategorySection
              key={category.id}
              category={category}
              collapsed={Boolean(collapsedCategories[String(category.id)])}
              checkingHealth={checkingCategoryIds.has(category.id)}
              onCollapsedChange={(collapsed) => setCategoryCollapsed(category.id, collapsed)}
              onHealthCheck={() => runCategoryHealthCheck(category)}
            />
          ))
        ) : (
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <EmptyState title="没有匹配的系统" description="换一个关键词，或者到后台新增入口。" />
          </div>
        )}
      </div>

      <footer className="mx-auto max-w-7xl px-4 py-8 text-sm text-slate-500 sm:px-6 lg:px-8 dark:text-slate-400">
        {settings.footer_text || 'Powered by AtlasGate'}
      </footer>
      <Toast toast={toast} onClose={clearToast} />
    </main>
  );
}
