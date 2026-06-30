import { ArrowUp, Save, X } from 'lucide-react';
import { DragEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminModal from '../components/AdminModal';
import CategorySection from '../components/CategorySection';
import EmptyState from '../components/EmptyState';
import { logout } from '../api/auth';
import { createApp, fetchAdminApps, fetchCategories as fetchAdminCategories } from '../api/admin';
import { getErrorMessage } from '../api/client';
import { checkPublicCategoryHealth, fetchPublicApps, fetchPublicConfig, reorderPublicCategoryApps } from '../api/public';
import Toast, { useToast } from '../components/Toast';
import AppEditorFields from '../features/apps/AppEditorFields';
import { buildAppPayload } from '../features/apps/appEditor';
import { useAppEditor } from '../features/apps/useAppEditor';
import HomeHeader from '../features/home/HomeHeader';
import { useDeferredMetadataRefresh } from '../hooks/useDeferredMetadataRefresh';
import { getAppDisplayDescription, getAppDisplayName } from '../lib/appName';
import type { NavApp, NavCategory } from '../types/app';
import type { AdminCategory } from '../types/category';
import type { SiteSettings } from '../types/setting';

const COLLAPSED_CATEGORIES_KEY = 'atlasgate.home.collapsedCategories';

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

function findFirstHealthIssue(apps: NavApp[]) {
  return apps.find((app) => app.healthStatus === 'unhealthy') || apps.find((app) => app.healthStatus === 'restricted');
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function openApp(app: NavApp) {
  if (app.openInNewTab) {
    const opened = window.open(app.url, '_blank', 'noopener,noreferrer');
    if (opened) {
      opened.opener = null;
    }
    return;
  }

  window.location.assign(app.url);
}

function HomeLoadingSkeleton() {
  return (
    <main className="home-page" aria-label="首页加载中">
      <div className="px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8">
        <div className="home-surface mx-auto flex w-[calc(100vw-2rem)] max-w-7xl flex-col gap-5 rounded-2xl p-4 sm:w-full sm:rounded-3xl sm:p-5">
          <div className="flex animate-pulse items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-slate-200 dark:bg-slate-700" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-6 w-48 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-4 w-64 max-w-full rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
          <div className="grid animate-pulse gap-3 lg:grid-cols-[minmax(0,1fr)_330px]">
            <div className="h-14 rounded-2xl bg-slate-200 dark:bg-slate-700" />
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-14 rounded-xl bg-slate-200 dark:bg-slate-700 sm:rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="py-4 sm:py-5">
        {[0, 1].map((section) => (
          <section
            key={section}
            className="mx-auto w-[calc(100vw-2rem)] max-w-7xl py-3 sm:w-[calc(100vw-3rem)] sm:py-4 lg:w-[calc(100vw-4rem)]"
          >
            <div className="home-surface grid animate-pulse gap-4 rounded-2xl p-4 sm:rounded-3xl sm:p-5 lg:grid-cols-[220px_1fr]">
              <div className="space-y-3">
                <div className="h-12 w-12 rounded-2xl bg-slate-200 dark:bg-slate-700" />
                <div className="h-6 w-32 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="h-4 w-44 rounded bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-36 rounded-2xl bg-slate-200 dark:bg-slate-700" />
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

function HomeLoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <main className="home-page flex min-h-screen items-center justify-center px-4">
      <div className="home-surface w-full max-w-xl rounded-2xl p-5 text-center sm:rounded-3xl sm:p-6">
        <EmptyState title="首页加载失败" description={message || '暂时无法获取站点配置和入口列表。'} />
        <button
          type="button"
          onClick={onRetry}
          className="home-primary focus-ring mt-5 inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-semibold transition"
        >
          重新加载
        </button>
      </div>
    </main>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SiteSettings>({});
  const [categories, setCategories] = useState<NavCategory[]>([]);
  const [homeLoading, setHomeLoading] = useState(true);
  const [homeLoadError, setHomeLoadError] = useState('');
  const [keyword, setKeyword] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const focusResetTimerRef = useRef<number | null>(null);
  const [dark, setDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>(readCollapsedCategories);
  const [checkingCategoryIds, setCheckingCategoryIds] = useState<Set<number>>(new Set());
  const [adminCategories, setAdminCategories] = useState<AdminCategory[]>([]);
  const [adminApps, setAdminApps] = useState<NavApp[]>([]);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddError, setQuickAddError] = useState('');
  const [quickAddSaving, setQuickAddSaving] = useState(false);
  const [draggingApp, setDraggingApp] = useState<DragState | null>(null);
  const [dragOverApp, setDragOverApp] = useState<DragState | null>(null);
  const [sortingCategoryIds, setSortingCategoryIds] = useState<Set<number>>(new Set());
  const [activeShortcutCategoryId, setActiveShortcutCategoryId] = useState<number | null>(null);
  const [activeQuickOpenIndex, setActiveQuickOpenIndex] = useState(0);
  const [focusedIssueAppId, setFocusedIssueAppId] = useState<number | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const { toast, showToast, clearToast } = useToast();
  const appEditor = useAppEditor(quickAddOpen);

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
    return () => {
      if (focusResetTimerRef.current) {
        window.clearTimeout(focusResetTimerRef.current);
      }
    };
  }, []);

  const loadHome = useCallback(async () => {
    setHomeLoading(true);
    setHomeLoadError('');

    try {
      const [config, apps] = await Promise.all([fetchPublicConfig(), fetchPublicApps()]);
      setSettings(config);
      setCategories(apps);
    } catch (err) {
      setHomeLoadError(getErrorMessage(err));
    } finally {
      setHomeLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHome();
  }, [loadHome]);

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

  const searchHasKeyword = keyword.trim().length > 0;
  const quickOpenApps = useMemo(() => (searchHasKeyword ? filtered.flatMap((category) => category.apps) : []), [filtered, searchHasKeyword]);
  const activeQuickOpenApp =
    quickOpenApps.length > 0 ? quickOpenApps[Math.min(activeQuickOpenIndex, quickOpenApps.length - 1)] : null;
  const filteredCategoryIds = filtered.map((category) => String(category.id));
  const allFilteredCollapsed = filteredCategoryIds.length > 0 && filteredCategoryIds.every((id) => collapsedCategories[id]);
  const homeQuickSortEnabled = settings.home_quick_sort_enabled === 'true';
  const quickSortActive = homeQuickSortEnabled && keyword.trim().length === 0;
  const allApps = categories.flatMap((category) => category.apps);
  const totalAppCount = allApps.length;
  const healthyAppCount = allApps.filter((app) => app.healthStatus === 'healthy').length;
  const restrictedAppCount = allApps.filter((app) => app.healthStatus === 'restricted').length;
  const unhealthyAppCount = allApps.filter((app) => app.healthStatus === 'unhealthy').length;

  useEffect(() => {
    setActiveQuickOpenIndex(0);
  }, [keyword]);

  useEffect(() => {
    setActiveQuickOpenIndex((current) => (quickOpenApps.length === 0 ? 0 : Math.min(current, quickOpenApps.length - 1)));
  }, [quickOpenApps.length]);

  useEffect(() => {
    if (!searchHasKeyword || !activeQuickOpenApp) {
      return;
    }

    const activeCategory = filtered.find((category) => category.apps.some((app) => app.id === activeQuickOpenApp.id));
    if (activeCategory) {
      setActiveShortcutCategoryId(activeCategory.id);
      setCollapsedCategories((current) => {
        if (!current[String(activeCategory.id)]) {
          return current;
        }

        const next = { ...current };
        delete next[String(activeCategory.id)];
        return next;
      });
    }

    const timer = window.setTimeout(() => {
      document.getElementById(`app-${activeQuickOpenApp.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [activeQuickOpenApp, filtered, searchHasKeyword]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (quickAddOpen || event.isComposing) {
        return;
      }

      const searchFocused = document.activeElement === searchInputRef.current;
      const targetIsEditable = isEditableTarget(event.target);

      if (event.key === '/' && !targetIsEditable) {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (event.key === 'Escape' && searchFocused && keyword) {
        event.preventDefault();
        setKeyword('');
        return;
      }

      if (!searchHasKeyword || quickOpenApps.length === 0 || (!searchFocused && targetIsEditable)) {
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveQuickOpenIndex((current) => (current + 1) % quickOpenApps.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveQuickOpenIndex((current) => (current - 1 + quickOpenApps.length) % quickOpenApps.length);
      } else if (event.key === 'Enter' && searchFocused && activeQuickOpenApp) {
        event.preventDefault();
        openApp(activeQuickOpenApp);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeQuickOpenApp, keyword, quickAddOpen, quickOpenApps.length, searchHasKeyword]);

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

  function revealHealthIssue(app: NavApp, categoryId?: number) {
    if (categoryId !== undefined) {
      setCategoryCollapsed(categoryId, false);
      setActiveShortcutCategoryId(categoryId);
    }

    setFocusedIssueAppId(app.id);
    window.setTimeout(() => {
      document.getElementById(`app-${app.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);

    if (focusResetTimerRef.current) {
      window.clearTimeout(focusResetTimerRef.current);
    }
    focusResetTimerRef.current = window.setTimeout(() => {
      setFocusedIssueAppId((current) => (current === app.id ? null : current));
    }, 6000);
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
      const issueApp = findFirstHealthIssue(checkedApps);
      if (issueApp) {
        revealHealthIssue(issueApp, category.id);
      }
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

  useDeferredMetadataRefresh(allApps, refreshApps);

  async function startQuickAdd(category: NavCategory) {
    const categoryId = category.id === 0 ? undefined : category.id;
    appEditor.reset(categoryId);
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
    appEditor.reset();
    setQuickAddOpen(false);
    setQuickAddError('');
    setQuickAddSaving(false);
  }

  async function submitQuickAdd(event: FormEvent) {
    event.preventDefault();
    setQuickAddError('');
    setQuickAddSaving(true);

    const payload = buildAppPayload(appEditor.form, {
      apps: adminApps,
      autoDescription: appEditor.autoDescription,
    });

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
    const issueApp = findFirstHealthIssue(allApps);
    if (!issueApp) {
      return;
    }

    const category = categories.find((item) => item.apps.some((app) => app.id === issueApp.id));
    revealHealthIssue(issueApp, category?.id);
    showToast(issueApp.healthStatus === 'unhealthy' ? '已定位到异常入口' : '已定位到访问受限入口', issueApp.healthStatus === 'unhealthy' ? 'error' : 'info');
  }

  if (homeLoading) {
    return <HomeLoadingSkeleton />;
  }

  if (homeLoadError) {
    return <HomeLoadError message={homeLoadError} onRetry={() => void loadHome()} />;
  }

  return (
    <main className="home-page">
      <HomeHeader
        settings={settings}
        dark={dark}
        allFilteredCollapsed={allFilteredCollapsed}
        keyword={keyword}
        categories={filtered}
        activeCategoryId={activeShortcutCategoryId}
        counts={{
          total: totalAppCount,
          healthy: healthyAppCount,
          restricted: restrictedAppCount,
          unhealthy: unhealthyAppCount,
        }}
        searchInputRef={searchInputRef}
        onToggleDark={() => setDark((value) => !value)}
        onToggleAllCategories={toggleAllCategories}
        onKeywordChange={setKeyword}
        onCategorySelect={scrollToCategory}
        onFocusHealthIssue={focusHealthIssue}
        onLogout={handleLogout}
      />

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
              selectedAppId={searchHasKeyword ? (activeQuickOpenApp?.id ?? null) : null}
              highlightedAppId={focusedIssueAppId}
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

      <footer className="home-muted mx-auto max-w-7xl px-4 py-8 text-sm sm:px-6 lg:px-8">
        {settings.footer_text || 'Powered by AtlasGate'}
      </footer>
      <button
        type="button"
        onClick={scrollToTop}
        className={`home-floating-control focus-ring fixed bottom-20 right-5 z-40 inline-flex h-11 w-11 items-center justify-center rounded-lg transition hover:-translate-y-0.5 sm:bottom-6 ${
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
            panelClassName="home-modal-panel"
            footer={
              <>
                <button
                  type="button"
                  className="focus-ring inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  onClick={closeQuickAdd}
                >
                  <X size={16} />
                  取消
                </button>
                <button
                  className="home-primary focus-ring inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                  type="submit"
                  disabled={quickAddSaving}
                >
                  <Save size={16} />
                  {quickAddSaving ? '保存中' : '保存'}
                </button>
              </>
            }
          >
            <AppEditorFields
              form={appEditor.form}
              setForm={appEditor.setForm}
              categories={adminCategories}
              descriptionIsAuto={appEditor.descriptionIsAuto}
              onDescriptionChange={appEditor.changeDescription}
              preview={appEditor.preview}
              error={quickAddError}
              autoBadgeClassName="home-accent-badge rounded-full px-2 py-0.5 text-xs font-semibold"
            />
          </AdminModal>
        </form>
      )}
      <Toast toast={toast} onClose={clearToast} />
    </main>
  );
}
