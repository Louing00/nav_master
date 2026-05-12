import { LayoutGrid, LogOut, Moon, RefreshCw, Search, Shield, Sun } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CategorySection from '../components/CategorySection';
import EmptyState from '../components/EmptyState';
import { logout } from '../api/auth';
import { getErrorMessage } from '../api/client';
import { checkPublicAppsHealth, fetchPublicApps, fetchPublicConfig } from '../api/public';
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

function formatHealthSummary(checkedApps: NavApp[]) {
  if (checkedApps.length === 0) {
    return '没有启用健康检查的应用';
  }

  const healthy = checkedApps.filter((app) => app.healthStatus === 'healthy').length;
  const unhealthy = checkedApps.filter((app) => app.healthStatus === 'unhealthy').length;
  return `检查完成：正常 ${healthy} 个，异常 ${unhealthy} 个`;
}

export default function Home() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SiteSettings>({});
  const [categories, setCategories] = useState<NavCategory[]>([]);
  const [keyword, setKeyword] = useState('');
  const [dark, setDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>(readCollapsedCategories);
  const [checkingAllHealth, setCheckingAllHealth] = useState(false);
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
  const visibleAppCount = categories.reduce((count, category) => count + category.apps.length, 0);

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

  async function runAllHealthChecks() {
    if (checkingAllHealth) {
      return;
    }

    setCheckingAllHealth(true);
    try {
      const checkedApps = await checkPublicAppsHealth();
      setCategories((current) => mergeCheckedApps(current, checkedApps));
      const hasUnhealthy = checkedApps.some((app) => app.healthStatus === 'unhealthy');
      showToast(formatHealthSummary(checkedApps), hasUnhealthy ? 'error' : 'success');
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    } finally {
      setCheckingAllHealth(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f3ec] text-ink dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-black/10 bg-[#f6f3ec]/88 backdrop-blur dark:border-white/10 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center text-4xl text-ink dark:text-white">
                {settings.logo || '✦'}
              </div>
              <div>
                <h1 className="text-2xl font-semibold sm:text-3xl">{settings.site_title || 'AtlasGate 星渡枢航'}</h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {settings.site_subtitle || '个人系统、内网服务与运维入口的统一星图'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={runAllHealthChecks}
                className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-slate-600 transition hover:border-mint hover:text-mint disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:text-slate-300"
                title={checkingAllHealth ? '正在批量检查' : '批量检查'}
                data-tooltip={checkingAllHealth ? '正在批量检查' : '批量检查'}
                disabled={checkingAllHealth || visibleAppCount === 0}
              >
                <RefreshCw size={18} className={checkingAllHealth ? 'animate-spin' : ''} />
              </button>
              <button
                type="button"
                onClick={toggleAllCategories}
                className={`focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md transition ${
                  allFilteredCollapsed
                    ? 'bg-ink text-white hover:bg-mint dark:bg-white dark:text-ink'
                    : 'border border-slate-300 text-slate-600 hover:border-mint hover:text-mint dark:border-slate-700 dark:text-slate-300'
                }`}
                title={allFilteredCollapsed ? '展开全部分类' : '紧凑显示全部分类'}
                data-tooltip={allFilteredCollapsed ? '展开全部分类' : '紧凑显示全部分类'}
                aria-pressed={allFilteredCollapsed}
              >
                <LayoutGrid size={18} />
              </button>
              <Link
                to="/admin"
                className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:border-mint hover:text-mint dark:border-slate-700 dark:text-slate-300"
                title="后台管理"
                data-tooltip="后台管理"
              >
                <Shield size={18} />
              </Link>
              <button
                type="button"
                onClick={() => setDark((value) => !value)}
                className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md bg-mint text-white hover:bg-ink dark:bg-mint"
                title="切换主题"
                data-tooltip="切换主题"
              >
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:border-red-300 hover:text-red-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-red-400 dark:hover:text-red-300"
                title="退出登录"
                data-tooltip="退出登录"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>

          <label className="surface flex items-center gap-3 rounded-lg px-4 py-3">
            <Search size={20} className="text-slate-500" />
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
              onCollapsedChange={(collapsed) => setCategoryCollapsed(category.id, collapsed)}
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
