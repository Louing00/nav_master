import { ArrowUp, LayoutGrid, LogOut, Menu, Moon, Save, Search, Shield, Sun, X } from 'lucide-react';
import { DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminModal from '../components/AdminModal';
import AppMetadataPreview from '../components/AppMetadataPreview';
import CategorySection from '../components/CategorySection';
import EmptyState from '../components/EmptyState';
import { logout } from '../api/auth';
import { createApp, fetchAdminApps, fetchCategories as fetchAdminCategories } from '../api/admin';
import { getErrorMessage } from '../api/client';
import { checkPublicCategoryHealth, fetchPublicApps, fetchPublicConfig, reorderPublicCategoryApps } from '../api/public';
import Toast, { useToast } from '../components/Toast';
import { useAppMetadataPreview } from '../hooks/useAppMetadataPreview';
import { appNeedsResolvedMetadata, getAppDisplayDescription, getAppDisplayName } from '../lib/appName';
import type { NavApp, NavCategory } from '../types/app';
import type { AdminCategory } from '../types/category';
import type { SiteSettings } from '../types/setting';

const COLLAPSED_CATEGORIES_KEY = 'atlasgate.home.collapsedCategories';
const quickAppBlank = {
  name: '',
  url: '',
  description: '',
  icon: '',
  iconUrl: '',
  categoryId: undefined as number | undefined,
  tags: '',
  sortOrder: 0,
  visible: true,
  openInNewTab: true,
  healthEnabled: true,
};

type DragState = {
  categoryId: number;
  appId: number;
};

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
  const restricted = checkedApps.filter((app) => app.healthStatus === 'restricted').length;
  const unhealthy = checkedApps.filter((app) => app.healthStatus === 'unhealthy').length;
  return `${categoryName} 检查完成：正常 ${healthy} 个，受限 ${restricted} 个，异常 ${unhealthy} 个`;
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
  const [adminCategories, setAdminCategories] = useState<AdminCategory[]>([]);
  const [adminApps, setAdminApps] = useState<NavApp[]>([]);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState(quickAppBlank);
  const [quickAddError, setQuickAddError] = useState('');
  const [quickAddSaving, setQuickAddSaving] = useState(false);
  const [draggingApp, setDraggingApp] = useState<DragState | null>(null);
  const [dragOverApp, setDragOverApp] = useState<DragState | null>(null);
  const [sortingCategoryIds, setSortingCategoryIds] = useState<Set<number>>(new Set());
  const [activeShortcutCategoryId, setActiveShortcutCategoryId] = useState<number | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const metadataRefreshAttempts = useRef<Set<string>>(new Set());
  const quickAddAutoDescription = useRef<string | null>(null);
  const { toast, showToast, clearToast } = useToast();
  const quickAddPreview = useAppMetadataPreview(quickAddForm.url, quickAddOpen);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  useEffect(() => {
    window.localStorage.setItem(COLLAPSED_CATEGORIES_KEY, JSON.stringify(collapsedCategories));
  }, [collapsedCategories]);

  useEffect(() => {
    function updateBackToTopVisibility() {
      setShowBackToTop(window.scrollY > 480);
    }

    updateBackToTopVisibility();
    window.addEventListener('scroll', updateBackToTopVisibility, { passive: true });
    return () => window.removeEventListener('scroll', updateBackToTopVisibility);
  }, []);

  useEffect(() => {
    Promise.all([fetchPublicConfig(), fetchPublicApps()]).then(([config, apps]) => {
      setSettings(config);
      setCategories(apps);
    });
  }, []);

  useEffect(() => {
    const resolvedDescription = quickAddPreview.data?.resolvedDescription;
    if (!resolvedDescription) {
      return;
    }

    setQuickAddForm((current) => {
      if (current.description.trim() && current.description !== quickAddAutoDescription.current) {
        return current;
      }
      quickAddAutoDescription.current = resolvedDescription;
      return { ...current, description: resolvedDescription };
    });
  }, [quickAddPreview.data?.resolvedDescription]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) {
      return categories;
    }

    return categories
      .map((category) => ({
        ...category,
        apps: category.apps.filter((app) =>
          [getAppDisplayName(app), getAppDisplayDescription(app), ...app.tags].join(' ').toLowerCase().includes(q),
        ),
      }))
      .filter((category) => category.apps.length > 0);
  }, [categories, keyword]);

  const filteredCategoryIds = filtered.map((category) => String(category.id));
  const allFilteredCollapsed = filteredCategoryIds.length > 0 && filteredCategoryIds.every((id) => collapsedCategories[id]);
  const homeQuickSortEnabled = settings.home_quick_sort_enabled === 'true';
  const quickSortActive = homeQuickSortEnabled && keyword.trim().length === 0;
  const allApps = categories.flatMap((category) => category.apps);
  const totalAppCount = allApps.length;
  const healthyAppCount = allApps.filter((app) => app.healthStatus === 'healthy').length;
  const restrictedAppCount = allApps.filter((app) => app.healthStatus === 'restricted').length;
  const unhealthyAppCount = allApps.filter((app) => app.healthStatus === 'unhealthy').length;
  const attentionAppCount = restrictedAppCount + unhealthyAppCount;
  const quickAddDescriptionIsAuto = Boolean(
    quickAddAutoDescription.current && quickAddForm.description === quickAddAutoDescription.current,
  );

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
      const hasRestricted = checkedApps.some((app) => app.healthStatus === 'restricted');
      showToast(formatHealthSummary(category.name, checkedApps), hasUnhealthy ? 'error' : hasRestricted ? 'info' : 'success');
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

  async function refreshApps() {
    setCategories(await fetchPublicApps());
  }

  useEffect(() => {
    const pendingApps = categories.flatMap((category) => category.apps).filter(appNeedsResolvedMetadata);
    const freshPendingApps = pendingApps.filter((app) => {
      const key = `${app.id}:${app.url}:${app.name || ''}:${app.description || ''}`;
      if (metadataRefreshAttempts.current.has(key)) {
        return false;
      }
      metadataRefreshAttempts.current.add(key);
      return true;
    });
    if (!freshPendingApps.length) {
      return;
    }

    const timer = window.setTimeout(() => {
      void refreshApps();
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [categories]);

  function nextSortOrder(categoryId?: number) {
    const groupApps = adminApps.filter((app) => (categoryId ? app.categoryId === categoryId : !app.categoryId));
    return groupApps.reduce((max, app) => Math.max(max, app.sortOrder || 0), 0) + 10;
  }

  async function startQuickAdd(category: NavCategory) {
    const categoryId = category.id === 0 ? undefined : category.id;
    quickAddAutoDescription.current = null;
    setQuickAddForm({ ...quickAppBlank, categoryId });
    setQuickAddError('');
    setQuickAddOpen(true);

    try {
      const [categoryRows, appRows] = await Promise.all([fetchAdminCategories(), fetchAdminApps()]);
      setAdminCategories(categoryRows);
      setAdminApps(appRows);
    } catch (err) {
      const message = getErrorMessage(err);
      setQuickAddError(message);
      showToast(message, 'error');
    }
  }

  function closeQuickAdd() {
    quickAddAutoDescription.current = null;
    setQuickAddOpen(false);
    setQuickAddError('');
    setQuickAddSaving(false);
    setQuickAddForm(quickAppBlank);
  }

  async function submitQuickAdd(event: FormEvent) {
    event.preventDefault();
    setQuickAddError('');
    setQuickAddSaving(true);

    const categoryId = quickAddForm.categoryId ? Number(quickAddForm.categoryId) : undefined;
    const payload = {
      ...quickAddForm,
      name: quickAddForm.name.trim(),
      description: quickAddDescriptionIsAuto ? '' : quickAddForm.description.trim(),
      iconUrl: quickAddForm.iconUrl.trim() || null,
      categoryId,
      tags: quickAddForm.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      sortOrder: nextSortOrder(categoryId),
    };

    try {
      await createApp(payload);
      showToast('入口已创建');
      closeQuickAdd();
      await refreshApps();
      window.setTimeout(() => void refreshApps(), 2200);
    } catch (err) {
      setQuickAddError(getErrorMessage(err));
    } finally {
      setQuickAddSaving(false);
    }
  }

  function handleAppDragStart(category: NavCategory, event: DragEvent<HTMLDivElement>, appId: number) {
    if (!quickSortActive || sortingCategoryIds.has(category.id)) {
      event.preventDefault();
      return;
    }

    setDraggingApp({ categoryId: category.id, appId });
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(appId));
  }

  function handleAppDragOver(category: NavCategory, event: DragEvent<HTMLDivElement>, appId: number) {
    if (!quickSortActive || !draggingApp || draggingApp.categoryId !== category.id || draggingApp.appId === appId) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverApp({ categoryId: category.id, appId });
  }

  async function handleAppDrop(category: NavCategory, event: DragEvent<HTMLDivElement>, targetAppId: number) {
    event.preventDefault();
    const sourceAppId = Number(event.dataTransfer.getData('text/plain') || draggingApp?.appId);
    setDraggingApp(null);
    setDragOverApp(null);

    if (!quickSortActive || sortingCategoryIds.has(category.id) || !sourceAppId || sourceAppId === targetAppId) {
      return;
    }

    const currentCategory = categories.find((item) => item.id === category.id);
    if (!currentCategory) {
      return;
    }

    const sourceIndex = currentCategory.apps.findIndex((app) => app.id === sourceAppId);
    const targetIndex = currentCategory.apps.findIndex((app) => app.id === targetAppId);
    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    const nextApps = [...currentCategory.apps];
    const [moved] = nextApps.splice(sourceIndex, 1);
    nextApps.splice(targetIndex, 0, moved);
    const nextAppIds = nextApps.map((app) => app.id);
    const previousCategories = categories;

    setCategories((current) => current.map((item) => (item.id === category.id ? { ...item, apps: nextApps } : item)));
    setSortingCategoryIds((current) => new Set(current).add(category.id));

    try {
      await reorderPublicCategoryApps(category.id, nextAppIds);
      showToast('首页排序已保存');
    } catch (err) {
      setCategories(previousCategories);
      showToast(getErrorMessage(err), 'error');
    } finally {
      setSortingCategoryIds((current) => {
        const next = new Set(current);
        next.delete(category.id);
        return next;
      });
    }
  }

  function handleAppDragEnd() {
    setDraggingApp(null);
    setDragOverApp(null);
  }

  function scrollToCategory(categoryId: number) {
    const target = document.getElementById(`category-${categoryId}`);
    if (!target) {
      return;
    }

    setActiveShortcutCategoryId(categoryId);
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function scrollToTop() {
    setActiveShortcutCategoryId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function focusHealthIssue() {
    const issueApp =
      allApps.find((app) => app.healthStatus === 'unhealthy') ||
      allApps.find((app) => app.healthStatus === 'restricted');
    if (!issueApp) {
      return;
    }

    const category = categories.find((item) => item.apps.some((app) => app.id === issueApp.id));
    if (category) {
      setCategoryCollapsed(category.id, false);
      setActiveShortcutCategoryId(category.id);
    }

    window.setTimeout(() => {
      document.getElementById(`app-${issueApp.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }

  return (
    <main className="min-h-screen bg-[#f6f3ec] text-ink dark:bg-slate-950 dark:text-slate-100">
      <header className="px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8">
        <div className="surface mx-auto flex w-[calc(100vw-2rem)] max-w-7xl flex-col gap-5 overflow-hidden rounded-2xl p-4 shadow-[0_12px_36px_rgba(15,23,42,0.06)] sm:w-full sm:gap-6 sm:rounded-3xl sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center text-3xl text-ink dark:text-white sm:h-12 sm:w-12 sm:text-4xl">
                {settings.logo || '✦'}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-xl font-semibold sm:text-3xl">{settings.site_title || 'AtlasGate 星渡枢航'}</h1>
                <p className="mt-1 truncate text-sm font-medium text-slate-600 dark:text-slate-400 sm:line-clamp-none sm:whitespace-normal">
                  {settings.site_subtitle || '个人系统、内网服务与运维入口的统一星图'}
                </p>
              </div>
            </div>
            <div className="hidden gap-2 sm:flex">
              <button
                type="button"
                onClick={toggleAllCategories}
                className={`focus-ring inline-flex h-11 w-11 items-center justify-center rounded-xl transition ${
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
                className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white/40 text-slate-600 hover:border-mint/40 hover:text-mint dark:border-slate-800 dark:bg-white/5 dark:text-slate-300"
                title="后台管理"
                data-tooltip="后台管理"
              >
                <Shield size={18} />
              </Link>
              <button
                type="button"
                onClick={() => setDark((value) => !value)}
                className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-xl bg-mint text-white shadow-sm hover:bg-ink dark:bg-mint"
                title="切换主题"
                data-tooltip="切换主题"
              >
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white/40 text-slate-600 hover:border-red-300 hover:text-red-600 dark:border-slate-800 dark:bg-white/5 dark:text-slate-300 dark:hover:border-red-400 dark:hover:text-red-300"
                title="退出登录"
                data-tooltip="退出登录"
              >
                <LogOut size={18} />
              </button>
            </div>
            <div className="relative flex w-full min-w-0 shrink-0 justify-start gap-2 sm:hidden">
              <button
                type="button"
                onClick={() => setDark((value) => !value)}
                className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-xl bg-mint text-white shadow-sm hover:bg-ink dark:bg-mint"
                title="切换主题"
                data-tooltip="切换主题"
              >
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button
                type="button"
                onClick={() => setMobileMenuOpen((value) => !value)}
                className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white/60 text-slate-600 shadow-sm hover:border-mint/40 hover:text-mint dark:border-slate-800 dark:bg-white/5 dark:text-slate-300"
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

          <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_330px]">
            <label className="flex min-h-14 min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] dark:border-slate-800 dark:bg-slate-950/60 dark:shadow-none">
              <Search size={22} className="shrink-0 text-slate-500" />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索系统、描述或标签"
                className="min-w-0 flex-1 bg-transparent text-base font-medium outline-none placeholder:text-slate-400"
              />
            </label>
            <div className="grid min-w-0 grid-cols-3 gap-2">
              <div className="min-w-0 rounded-xl bg-slate-50/80 px-2 py-2.5 text-center dark:bg-slate-950/60 sm:rounded-2xl sm:px-3 sm:py-3">
                <div className="text-lg font-bold leading-none text-ink dark:text-white sm:text-2xl">{totalAppCount}</div>
                <div className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 sm:text-xs">入口</div>
              </div>
              <div className="min-w-0 rounded-xl bg-slate-50/80 px-2 py-2.5 text-center dark:bg-slate-950/60 sm:rounded-2xl sm:px-3 sm:py-3">
                <div className="text-lg font-bold leading-none text-emerald-700 dark:text-emerald-300 sm:text-2xl">{healthyAppCount}</div>
                <div className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 sm:text-xs">正常</div>
              </div>
              <button
                type="button"
                onClick={focusHealthIssue}
                disabled={attentionAppCount === 0}
                className="focus-ring min-w-0 rounded-xl bg-slate-50/80 px-2 py-2.5 text-center transition enabled:hover:bg-amber-50 enabled:hover:ring-1 enabled:hover:ring-amber-200 disabled:cursor-default dark:bg-slate-950/60 dark:enabled:hover:bg-amber-950/30 dark:enabled:hover:ring-amber-900 sm:rounded-2xl sm:px-3 sm:py-3"
                title={`异常 ${unhealthyAppCount} 个，访问受限 ${restrictedAppCount} 个`}
                data-tooltip={`异常 ${unhealthyAppCount} 个，访问受限 ${restrictedAppCount} 个`}
              >
                <div
                  className={`text-lg font-bold leading-none sm:text-2xl ${
                    unhealthyAppCount > 0
                      ? 'text-red-600 dark:text-red-300'
                      : restrictedAppCount > 0
                        ? 'text-amber-700 dark:text-amber-300'
                        : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {attentionAppCount}
                </div>
                <div className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 sm:text-xs">需关注</div>
              </button>
            </div>
          </div>
          {filtered.length > 0 && (
            <nav aria-label="分类快捷定位" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
              <div className="flex min-w-max gap-2 sm:min-w-0 sm:flex-wrap">
                {filtered.map((category) => {
                  const active = activeShortcutCategoryId === category.id;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => scrollToCategory(category.id)}
                      className={`focus-ring inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-semibold transition ${
                        active
                          ? 'border-mint bg-mint text-white shadow-sm'
                          : 'border-slate-200 bg-white/45 text-slate-600 hover:border-mint/40 hover:text-mint dark:border-slate-800 dark:bg-white/5 dark:text-slate-300'
                      }`}
                      title={`定位到${category.name}`}
                      data-tooltip={`定位到${category.name}`}
                      aria-current={active ? 'true' : undefined}
                    >
                      <span className="text-base leading-none">{category.icon || '·'}</span>
                      <span className="max-w-28 truncate sm:max-w-40">{category.name}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-xs ${
                          active ? 'bg-white/20 text-white' : 'bg-slate-900/5 text-slate-500 dark:bg-white/10 dark:text-slate-400'
                        }`}
                      >
                        {category.apps.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </nav>
          )}
        </div>
      </header>

      <div className="py-4 sm:py-5">
        {filtered.length ? (
          filtered.map((category) => (
            <CategorySection
              key={category.id}
              category={category}
              collapsed={Boolean(collapsedCategories[String(category.id)])}
              checkingHealth={checkingCategoryIds.has(category.id)}
              onCollapsedChange={(collapsed) => setCategoryCollapsed(category.id, collapsed)}
              onHealthCheck={() => runCategoryHealthCheck(category)}
              onAddApp={() => startQuickAdd(category)}
              quickSortEnabled={quickSortActive}
              sortingAppId={draggingApp?.categoryId === category.id ? draggingApp.appId : null}
              dragOverAppId={dragOverApp?.categoryId === category.id ? dragOverApp.appId : null}
              sortSaving={sortingCategoryIds.has(category.id)}
              onAppDragStart={(event, appId) => handleAppDragStart(category, event, appId)}
              onAppDragOver={(event, appId) => handleAppDragOver(category, event, appId)}
              onAppDrop={(event, appId) => handleAppDrop(category, event, appId)}
              onAppDragEnd={handleAppDragEnd}
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
      <button
        type="button"
        onClick={scrollToTop}
        className={`focus-ring fixed bottom-20 right-5 z-40 inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white/90 text-slate-600 shadow-lg shadow-slate-900/10 backdrop-blur transition hover:-translate-y-0.5 hover:border-mint/40 hover:text-mint dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300 sm:bottom-6 ${
          showBackToTop ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
        }`}
        title="回到顶部"
        data-tooltip="回到顶部"
        aria-label="回到顶部"
        aria-hidden={!showBackToTop}
        tabIndex={showBackToTop ? 0 : -1}
      >
        <ArrowUp size={20} />
      </button>
      {quickAddOpen && (
        <form onSubmit={submitQuickAdd}>
          <AdminModal
            title="新增应用"
            onClose={closeQuickAdd}
            footer={
              <>
                <button
                  type="button"
                  className="focus-ring rounded-md px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  onClick={closeQuickAdd}
                >
                  取消
                </button>
                <button
                  className="focus-ring inline-flex items-center gap-2 rounded-md bg-mint px-4 py-2 text-sm font-semibold text-white hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
                  type="submit"
                  disabled={quickAddSaving}
                >
                  <Save size={16} />
                  {quickAddSaving ? '保存中' : '保存'}
                </button>
              </>
            }
          >
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="admin-label">访问地址</span>
                <input
                  className="admin-input mt-1"
                  required
                  value={quickAddForm.url}
                  onChange={(event) => setQuickAddForm({ ...quickAddForm, url: event.target.value })}
                  placeholder="https://example.com"
                  autoFocus
                />
              </label>
              <div className="sm:col-span-2">
                <AppMetadataPreview
                  url={quickAddForm.url}
                  name={quickAddForm.name}
                  icon={quickAddForm.icon}
                  iconUrl={quickAddForm.iconUrl}
                  metadata={quickAddPreview.data}
                  loading={quickAddPreview.loading}
                  error={quickAddPreview.error}
                  validUrl={quickAddPreview.validUrl}
                  onRetry={quickAddPreview.refresh}
                />
              </div>
              <label className="sm:col-span-2">
                <span className="admin-label">系统名称</span>
                <input
                  className="admin-input mt-1"
                  value={quickAddForm.name}
                  onChange={(event) => setQuickAddForm({ ...quickAddForm, name: event.target.value })}
                  placeholder="留空使用自动名称"
                />
              </label>
              <label className="sm:col-span-2">
                <span className="flex items-center gap-2">
                  <span className="admin-label">描述</span>
                  {quickAddDescriptionIsAuto ? (
                    <span className="rounded-full bg-mint/10 px-2 py-0.5 text-xs font-semibold text-mint dark:bg-mint/20">
                      自动简介
                    </span>
                  ) : null}
                </span>
                <textarea
                  className="admin-input mt-1 min-h-20"
                  value={quickAddForm.description}
                  onChange={(event) => {
                    quickAddAutoDescription.current = null;
                    setQuickAddForm({ ...quickAddForm, description: event.target.value });
                  }}
                  placeholder="留空自动读取站点简介"
                />
              </label>
              <label>
                <span className="admin-label">图标字符</span>
                <input className="admin-input mt-1" value={quickAddForm.icon} onChange={(event) => setQuickAddForm({ ...quickAddForm, icon: event.target.value })} />
              </label>
              <label>
                <span className="admin-label">图标 URL</span>
                <input
                  className="admin-input mt-1"
                  value={quickAddForm.iconUrl}
                  onChange={(event) => setQuickAddForm({ ...quickAddForm, iconUrl: event.target.value })}
                  placeholder="https://example.com/icon.png"
                />
              </label>
              <label>
                <span className="admin-label">分类</span>
                <select
                  className="admin-input mt-1"
                  value={quickAddForm.categoryId || ''}
                  onChange={(event) => setQuickAddForm({ ...quickAddForm, categoryId: event.target.value ? Number(event.target.value) : undefined })}
                >
                  <option value="">未分类</option>
                  {adminCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="admin-label">标签</span>
                <input className="admin-input mt-1" value={quickAddForm.tags} onChange={(event) => setQuickAddForm({ ...quickAddForm, tags: event.target.value })} placeholder="用英文逗号分隔" />
              </label>
              <div className="flex flex-wrap gap-4 text-sm sm:col-span-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={quickAddForm.visible} onChange={(event) => setQuickAddForm({ ...quickAddForm, visible: event.target.checked })} />
                  前台显示
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={quickAddForm.openInNewTab} onChange={(event) => setQuickAddForm({ ...quickAddForm, openInNewTab: event.target.checked })} />
                  新窗口打开
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={quickAddForm.healthEnabled} onChange={(event) => setQuickAddForm({ ...quickAddForm, healthEnabled: event.target.checked })} />
                  启用健康检查
                </label>
              </div>
              {quickAddError && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-200 sm:col-span-2">{quickAddError}</p>}
            </div>
          </AdminModal>
        </form>
      )}
      <Toast toast={toast} onClose={clearToast} />
    </main>
  );
}
