import { ChevronDown, ChevronRight, GripVertical, Image, LayoutGrid, Pencil, Plus, RefreshCw, Save, Search, Trash2, X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { checkAppHealth, createApp, deleteApp, fetchAdminApps, fetchCategories, refreshAppIcon, updateApp } from '../api/admin';
import { getErrorMessage } from '../api/client';
import AdminModal from '../components/AdminModal';
import AdminPageHeader from '../components/AdminPageHeader';
import AppIcon from '../components/AppIcon';
import AppMetadataPreview from '../components/AppMetadataPreview';
import CategoryIcon from '../components/CategoryIcon';
import { confirmDelete } from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import HealthBadge from '../components/HealthBadge';
import Toast, { useToast } from '../components/Toast';
import { useAppMetadataPreview } from '../hooks/useAppMetadataPreview';
import { appNeedsResolvedMetadata, getAppDisplayDescription, getAppDisplayName } from '../lib/appName';
import type { NavApp } from '../types/app';
import type { AdminCategory } from '../types/category';

const blank = {
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

type AppGroup = {
  id: number | null;
  name: string;
  icon?: string | null;
  description?: string | null;
  apps: NavApp[];
};

export default function AdminApps() {
  const [apps, setApps] = useState<NavApp[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [editing, setEditing] = useState<NavApp | null>(null);
  const [form, setForm] = useState(blank);
  const [keyword, setKeyword] = useState('');
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [draggingAppId, setDraggingAppId] = useState<number | null>(null);
  const [collapsedGroupKeys, setCollapsedGroupKeys] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState('');
  const [checkingAppIds, setCheckingAppIds] = useState<Set<number>>(new Set());
  const [refreshingIconIds, setRefreshingIconIds] = useState<Set<number>>(new Set());
  const [checkingAllHealth, setCheckingAllHealth] = useState(false);
  const [healthCheckProgress, setHealthCheckProgress] = useState<{ checked: number; total: number } | null>(null);
  const metadataRefreshAttempts = useRef<Set<string>>(new Set());
  const autoDescription = useRef<string | null>(null);
  const { toast, showToast, clearToast } = useToast();
  const metadataPreview = useAppMetadataPreview(form.url, modalOpen);

  async function load() {
    const [appRows, categoryRows] = await Promise.all([fetchAdminApps(), fetchCategories()]);
    setApps(appRows);
    setCategories(categoryRows);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const resolvedDescription = metadataPreview.data?.resolvedDescription;
    if (!resolvedDescription) {
      return;
    }

    setForm((current) => {
      if (current.description.trim() && current.description !== autoDescription.current) {
        return current;
      }
      autoDescription.current = resolvedDescription;
      return { ...current, description: resolvedDescription };
    });
  }, [metadataPreview.data?.resolvedDescription]);

  useEffect(() => {
    const freshPendingApps = apps.filter(appNeedsResolvedMetadata).filter((app) => {
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
      void load();
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [apps]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    const rows = q
      ? apps.filter((app) => [getAppDisplayName(app), getAppDisplayDescription(app), ...app.tags].join(' ').toLowerCase().includes(q))
      : apps;
    return [...rows].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.id - b.id);
  }, [apps, keyword]);

  const groupedApps = useMemo<AppGroup[]>(() => {
    const categoryGroups: AppGroup[] = categories
      .map((category) => ({
        id: category.id,
        name: category.name,
        icon: category.icon,
        description: category.description,
        apps: filtered.filter((app) => app.categoryId === category.id),
      }))
      .filter((group) => group.apps.length > 0);

    const uncategorized = filtered.filter((app) => !app.categoryId);
    if (uncategorized.length) {
      categoryGroups.push({
        id: null,
        name: '未分类',
        icon: 'folder',
        description: '尚未归类的应用',
        apps: uncategorized,
      });
    }

    return categoryGroups;
  }, [categories, filtered]);

  const canDragSort = keyword.trim().length === 0;
  const descriptionIsAuto = Boolean(autoDescription.current && form.description === autoDescription.current);

  function groupKey(group: AppGroup) {
    return group.id === null ? 'uncategorized' : String(group.id);
  }

  function toggleGroup(group: AppGroup) {
    const key = groupKey(group);
    setCollapsedGroupKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function nextSortOrder(categoryId?: number) {
    const groupApps = apps.filter((app) => (categoryId ? app.categoryId === categoryId : !app.categoryId));
    return groupApps.reduce((max, app) => Math.max(max, app.sortOrder || 0), 0) + 10;
  }

  function startCreate() {
    autoDescription.current = null;
    setEditing(null);
    setForm(blank);
    setError('');
    setModalOpen(true);
  }

  function startEdit(app: NavApp) {
    autoDescription.current = app.description?.trim() ? null : app.resolvedDescription?.trim() || null;
    setEditing(app);
    setForm({
      name: app.name,
      url: app.url,
      description: getAppDisplayDescription(app),
      icon: app.icon || '',
      iconUrl: app.iconUrl || '',
      categoryId: app.categoryId || undefined,
      tags: app.tags.join(', '),
      sortOrder: app.sortOrder || 0,
      visible: app.visible ?? true,
      openInNewTab: app.openInNewTab,
      healthEnabled: app.healthEnabled ?? true,
    });
    setError('');
    setModalOpen(true);
  }

  function closeModal() {
    autoDescription.current = null;
    setEditing(null);
    setForm(blank);
    setError('');
    setModalOpen(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    const categoryId = form.categoryId ? Number(form.categoryId) : undefined;
    const categoryChanged = editing ? (editing.categoryId || undefined) !== categoryId : false;
    const payload = {
      ...form,
      name: form.name.trim(),
      description: descriptionIsAuto ? '' : form.description.trim(),
      iconUrl: form.iconUrl.trim() || null,
      categoryId,
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      sortOrder: editing && !categoryChanged ? Number(form.sortOrder || 0) : nextSortOrder(categoryId),
    };

    try {
      if (editing) {
        await updateApp(editing.id, payload);
        showToast('应用已更新');
      } else {
        await createApp(payload);
        showToast('应用已创建');
      }
      closeModal();
      await load();
      window.setTimeout(() => void load(), 2200);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function remove(id: number) {
    if (!confirmDelete()) {
      return;
    }
    await deleteApp(id);
    await load();
    showToast('应用已删除');
  }

  async function reorderApp(group: AppGroup, sourceAppId: number, targetAppId: number) {
    if (!canDragSort || sourceAppId === targetAppId) {
      return;
    }

    const sourceIndex = group.apps.findIndex((app) => app.id === sourceAppId);
    const targetIndex = group.apps.findIndex((app) => app.id === targetAppId);
    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    const nextGroupApps = [...group.apps];
    const [moved] = nextGroupApps.splice(sourceIndex, 1);
    nextGroupApps.splice(targetIndex, 0, moved);

    const nextApps = apps.map((app) => {
      const groupAppIndex = nextGroupApps.findIndex((item) => item.id === app.id);
      return groupAppIndex >= 0 ? { ...app, sortOrder: (groupAppIndex + 1) * 10 } : app;
    });

    setActionError('');
    setApps(nextApps);

    try {
      await Promise.all(
        nextGroupApps.map((app, index) =>
          updateApp(app.id, {
            sortOrder: (index + 1) * 10,
          }),
        ),
      );
      await load();
      showToast('排序已更新');
    } catch (err) {
      setActionError(getErrorMessage(err));
      await load();
    } finally {
      setDraggingAppId(null);
    }
  }

  async function toggleVisible(app: NavApp) {
    const nextVisible = !(app.visible ?? true);
    setActionError('');
    setApps((current) => current.map((item) => (item.id === app.id ? { ...item, visible: nextVisible } : item)));

    try {
      await updateApp(app.id, { visible: nextVisible });
      showToast(nextVisible ? '应用已显示' : '应用已隐藏');
    } catch (err) {
      setActionError(getErrorMessage(err));
      await load();
    }
  }

  async function runHealthCheck(app: NavApp) {
    if (app.healthEnabled === false || checkingAllHealth || checkingAppIds.has(app.id)) {
      return;
    }

    setActionError('');
    setCheckingAppIds((current) => new Set(current).add(app.id));
    try {
      const checked = await checkAppHealth(app.id);
      setApps((current) => current.map((item) => (item.id === app.id ? { ...item, ...checked } : item)));
      showToast(
        checked.healthStatus === 'healthy' ? '健康检查正常' : checked.healthStatus === 'restricted' ? '站点可访问，但当前检查受限' : '健康检查异常',
        checked.healthStatus === 'healthy' ? 'success' : checked.healthStatus === 'restricted' ? 'info' : 'error',
      );
    } catch (err) {
      const message = getErrorMessage(err);
      setActionError(message);
      showToast(message, 'error');
    } finally {
      setCheckingAppIds((current) => {
        const next = new Set(current);
        next.delete(app.id);
        return next;
      });
    }
  }

  async function runIconRefresh(app: NavApp) {
    if (refreshingIconIds.has(app.id)) {
      return;
    }

    setActionError('');
    setRefreshingIconIds((current) => new Set(current).add(app.id));
    try {
      const refreshed = await refreshAppIcon(app.id);
      setApps((current) => current.map((item) => (item.id === app.id ? { ...item, ...refreshed } : item)));
      showToast(refreshed.resolvedIconUrl ? '图标已更新' : '未找到在线图标，已保留当前设置');
    } catch (err) {
      const message = getErrorMessage(err);
      setActionError(message);
      showToast(message, 'error');
    } finally {
      setRefreshingIconIds((current) => {
        const next = new Set(current);
        next.delete(app.id);
        return next;
      });
    }
  }

  async function runAllHealthChecks() {
    if (checkingAllHealth || checkingAppIds.size > 0) {
      return;
    }

    const enabledApps = apps.filter((app) => app.healthEnabled !== false);
    if (enabledApps.length === 0) {
      showToast('没有启用健康检查的应用', 'info');
      return;
    }

    setActionError('');
    setCheckingAllHealth(true);
    setHealthCheckProgress({ checked: 0, total: enabledApps.length });

    let healthyCount = 0;
    let restrictedCount = 0;
    let unhealthyCount = 0;
    let requestFailedCount = 0;

    try {
      for (const app of enabledApps) {
        setCheckingAppIds((current) => new Set(current).add(app.id));

        try {
          const checked = await checkAppHealth(app.id);
          setApps((current) => current.map((item) => (item.id === app.id ? { ...item, ...checked } : item)));

          if (checked.healthStatus === 'healthy') {
            healthyCount += 1;
          } else if (checked.healthStatus === 'restricted') {
            restrictedCount += 1;
          } else {
            unhealthyCount += 1;
          }
        } catch {
          requestFailedCount += 1;
        } finally {
          setHealthCheckProgress((current) => (current ? { ...current, checked: current.checked + 1 } : current));
          setCheckingAppIds((current) => {
            const next = new Set(current);
            next.delete(app.id);
            return next;
          });
        }
      }

      const hasIssue = unhealthyCount > 0 || requestFailedCount > 0;
      const summary =
        requestFailedCount > 0
          ? `检查完成：正常 ${healthyCount} 个，受限 ${restrictedCount} 个，异常 ${unhealthyCount} 个，请求失败 ${requestFailedCount} 个`
          : `检查完成：正常 ${healthyCount} 个，受限 ${restrictedCount} 个，异常 ${unhealthyCount} 个`;
      showToast(
        healthyCount + restrictedCount + unhealthyCount > 0 ? summary : '健康检查全部失败',
        hasIssue ? 'error' : restrictedCount > 0 ? 'info' : 'success',
      );
    } finally {
      setCheckingAllHealth(false);
      setCheckingAppIds(new Set());
      setHealthCheckProgress(null);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="admin-panel overflow-hidden rounded-lg">
        <AdminPageHeader
          icon={LayoutGrid}
          title="应用管理"
          description={`集中维护导航入口、健康状态与展示顺序，共 ${apps.length} 个应用`}
          actions={
            <>
            <label className="relative block sm:w-64">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--admin-faint)]" />
              <input className="admin-input w-full pl-9" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索应用" />
            </label>
            <button
              type="button"
              onClick={runAllHealthChecks}
              className="admin-secondary-button"
              title={checkingAllHealth && healthCheckProgress ? `正在检查 ${healthCheckProgress.checked}/${healthCheckProgress.total}` : '批量检查'}
              data-tooltip={checkingAllHealth && healthCheckProgress ? `正在检查 ${healthCheckProgress.checked}/${healthCheckProgress.total}` : '批量检查'}
              disabled={checkingAllHealth || checkingAppIds.size > 0}
            >
              <RefreshCw size={16} className={checkingAllHealth ? 'animate-spin' : ''} />
              {checkingAllHealth && healthCheckProgress ? `检查中 ${healthCheckProgress.checked}/${healthCheckProgress.total}` : '批量检查'}
            </button>
            <button
              type="button"
              onClick={startCreate}
              className="admin-primary-button"
            >
              <Plus size={16} />
              新增应用
            </button>
            </>
          }
        />
        {actionError && <p className="mx-5 mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-200">{actionError}</p>}
        {!canDragSort && <p className="mx-5 mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">清空搜索后可拖拽排序。</p>}
        <div className="grid gap-5 p-5">
          {groupedApps.map((group) => {
            const collapsed = collapsedGroupKeys.has(groupKey(group));

            return (
              <section key={group.id ?? 'uncategorized'} className="admin-section">
                <div className="admin-section-header">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="admin-icon-tile h-9 w-9">
                        <CategoryIcon icon={group.icon} name={group.name} size={17} />
                      </span>
                      <h2 className="font-semibold text-[var(--admin-text)]">{group.name}</h2>
                      <button
                        type="button"
                        onClick={() => toggleGroup(group)}
                        className="admin-icon-button h-7 w-7"
                        title={collapsed ? '展开分类' : '折叠分类'}
                        data-tooltip={collapsed ? '展开分类' : '折叠分类'}
                        aria-expanded={!collapsed}
                      >
                        {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                    {group.description && !collapsed && <p className="mt-1 text-xs text-[var(--admin-muted)]">{group.description}</p>}
                  </div>
                  <span className="admin-status-neutral shrink-0 px-2.5 py-1 text-xs font-medium">{group.apps.length} 个应用</span>
                </div>

                {!collapsed && (
                  <>
                    <div className="grid gap-3 p-3 md:hidden">
                      {group.apps.map((app) => (
                        <article key={app.id} className="admin-mobile-card">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                              <AppIcon app={app} compact />
                              <div className="min-w-0">
                                <h3 className="truncate font-semibold">{getAppDisplayName(app)}</h3>
                                <p className="mt-1 truncate text-sm text-[var(--admin-muted)]">{app.url}</p>
                              </div>
                            </div>
                            <HealthBadge app={app} />
                          </div>
                          {app.tags.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {app.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="admin-status-neutral px-2.5 py-1 text-xs font-medium">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="mt-4 flex items-center justify-between gap-3">
                            <button
                              type="button"
                              onClick={() => toggleVisible(app)}
                              className={`focus-ring inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ${
                                app.visible ?? true ? 'bg-mint' : 'bg-slate-300 dark:bg-slate-700'
                              }`}
                              title={app.visible ?? true ? '点击隐藏' : '点击显示'}
                              data-tooltip={app.visible ?? true ? '点击隐藏' : '点击显示'}
                              aria-pressed={app.visible ?? true}
                            >
                              <span className="sr-only">{app.visible ?? true ? '显示' : '隐藏'}</span>
                              <span
                                className={`h-5 w-5 rounded-full bg-white shadow transition ${
                                  app.visible ?? true ? 'translate-x-5' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                className="admin-icon-button disabled:cursor-not-allowed disabled:opacity-40"
                                onClick={() => runIconRefresh(app)}
                                title="重新获取图标"
                                data-tooltip="重新获取图标"
                                disabled={refreshingIconIds.has(app.id)}
                              >
                                <Image size={16} className={refreshingIconIds.has(app.id) ? 'animate-pulse' : ''} />
                              </button>
                              <button
                                type="button"
                                className="admin-icon-button disabled:cursor-not-allowed disabled:opacity-40"
                                onClick={() => runHealthCheck(app)}
                                title={app.healthEnabled === false ? '已关闭健康检查' : '立即检查'}
                                data-tooltip={app.healthEnabled === false ? '已关闭健康检查' : '立即检查'}
                                disabled={app.healthEnabled === false || checkingAllHealth || checkingAppIds.has(app.id)}
                              >
                                <RefreshCw size={16} className={checkingAppIds.has(app.id) ? 'animate-spin' : ''} />
                              </button>
                              <button className="admin-icon-button" onClick={() => startEdit(app)} title="编辑" data-tooltip="编辑">
                                <Pencil size={16} />
                              </button>
                              <button className="admin-danger-button" onClick={() => remove(app.id)} title="删除" data-tooltip="删除">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                    <div className="hidden overflow-x-auto md:block">
                      <table className="admin-table min-w-[860px]">
                        <thead>
                          <tr>
                            <th className="w-12 px-4 py-3"></th>
                            <th className="px-4 py-3">名称</th>
                            <th className="px-4 py-3">地址</th>
                            <th className="px-4 py-3">健康</th>
                            <th className="px-4 py-3">状态</th>
                            <th className="px-4 py-3 text-right">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.apps.map((app) => (
                            <tr
                              key={app.id}
                              draggable={canDragSort}
                              onDragStart={(event) => {
                                if (!canDragSort) {
                                  event.preventDefault();
                                  return;
                                }
                                setDraggingAppId(app.id);
                                event.dataTransfer.effectAllowed = 'move';
                                event.dataTransfer.setData('text/plain', String(app.id));
                              }}
                              onDragOver={(event) => {
                                if (canDragSort && draggingAppId && draggingAppId !== app.id) {
                                  event.preventDefault();
                                  event.dataTransfer.dropEffect = 'move';
                                }
                              }}
                              onDrop={(event) => {
                                event.preventDefault();
                                const sourceId = Number(event.dataTransfer.getData('text/plain') || draggingAppId);
                                reorderApp(group, sourceId, app.id);
                              }}
                              onDragEnd={() => setDraggingAppId(null)}
                              className={`${draggingAppId === app.id ? 'bg-[var(--admin-accent-soft)] opacity-70' : 'bg-transparent'} ${
                                canDragSort ? 'cursor-move' : ''
                              }`}
                            >
                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 ${
                                  canDragSort ? 'cursor-grab hover:bg-[var(--admin-secondary)] hover:text-[var(--admin-accent)] active:cursor-grabbing' : 'opacity-40'
                                }`}
                                title={canDragSort ? '拖拽排序' : '清空搜索后可排序'}
                                data-tooltip={canDragSort ? '拖拽排序' : '清空搜索后可排序'}
                              >
                                <GripVertical size={17} />
                              </span>
                            </td>
                            <td className="px-4 py-4 font-medium">
                              <div className="flex items-center gap-3">
                                <AppIcon app={app} compact />
                                <span className="truncate">{getAppDisplayName(app)}</span>
                              </div>
                            </td>
                            <td className="max-w-xs truncate px-4 py-4 text-[var(--admin-muted)]">{app.url}</td>
                            <td className="px-4 py-4">
                              <HealthBadge app={app} />
                            </td>
                            <td className="px-4 py-4">
                              <button
                                type="button"
                                onClick={() => toggleVisible(app)}
                                className={`focus-ring inline-flex h-6 w-11 items-center rounded-full p-0.5 transition ${
                                  app.visible ?? true ? 'bg-mint' : 'bg-slate-300 dark:bg-slate-700'
                                }`}
                                title={app.visible ?? true ? '点击隐藏' : '点击显示'}
                                data-tooltip={app.visible ?? true ? '点击隐藏' : '点击显示'}
                                aria-pressed={app.visible ?? true}
                              >
                                <span className="sr-only">{app.visible ?? true ? '显示' : '隐藏'}</span>
                                <span
                                  className={`h-5 w-5 rounded-full bg-white shadow transition ${
                                    app.visible ?? true ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  className="admin-icon-button disabled:cursor-not-allowed disabled:opacity-40"
                                  onClick={() => runIconRefresh(app)}
                                  title="重新获取图标"
                                  data-tooltip="重新获取图标"
                                  disabled={refreshingIconIds.has(app.id)}
                                >
                                  <Image size={16} className={refreshingIconIds.has(app.id) ? 'animate-pulse' : ''} />
                                </button>
                                <button
                                  type="button"
                                  className="admin-icon-button disabled:cursor-not-allowed disabled:opacity-40"
                                  onClick={() => runHealthCheck(app)}
                                  title={app.healthEnabled === false ? '已关闭健康检查' : '立即检查'}
                                  data-tooltip={app.healthEnabled === false ? '已关闭健康检查' : '立即检查'}
                                  disabled={app.healthEnabled === false || checkingAllHealth || checkingAppIds.has(app.id)}
                                >
                                  <RefreshCw size={16} className={checkingAppIds.has(app.id) ? 'animate-spin' : ''} />
                                </button>
                                <button className="admin-icon-button" onClick={() => startEdit(app)} title="编辑" data-tooltip="编辑">
                                  <Pencil size={16} />
                                </button>
                                <button className="admin-danger-button" onClick={() => remove(app.id)} title="删除" data-tooltip="删除">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </>
                )}
              </section>
            );
          })}
          {groupedApps.length === 0 && (
            <EmptyState
              title={keyword.trim() ? '没有匹配的应用' : '暂无应用'}
              description={keyword.trim() ? '清空搜索或尝试其他关键词。' : '创建第一个应用入口，开始搭建导航页。'}
            />
          )}
        </div>
      </section>

      {modalOpen && (
        <form onSubmit={submit}>
          <AdminModal
            title={editing ? '编辑应用' : '新增应用'}
            onClose={closeModal}
            footer={
              <>
                <button type="button" className="admin-secondary-button" onClick={closeModal}>
                  <X size={16} />
                  取消
                </button>
                <button className="admin-primary-button" type="submit">
                  <Save size={16} />
                  保存
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
                  value={form.url}
                  onChange={(event) => setForm({ ...form, url: event.target.value })}
                  placeholder="https://example.com"
                  autoFocus
                />
              </label>
              <div className="sm:col-span-2">
                <AppMetadataPreview
                  url={form.url}
                  name={form.name}
                  icon={form.icon}
                  iconUrl={form.iconUrl}
                  metadata={metadataPreview.data}
                  loading={metadataPreview.loading}
                  error={metadataPreview.error}
                  validUrl={metadataPreview.validUrl}
                  onRetry={metadataPreview.refresh}
                />
              </div>
              <label className="sm:col-span-2">
                <span className="admin-label">系统名称</span>
                <input
                  className="admin-input mt-1"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="留空使用自动名称"
                />
              </label>
              <label className="sm:col-span-2">
                <span className="flex items-center gap-2">
                  <span className="admin-label">描述</span>
                  {descriptionIsAuto ? (
                    <span className="rounded-full bg-mint/10 px-2 py-0.5 text-xs font-semibold text-mint dark:bg-mint/20">
                      自动简介
                    </span>
                  ) : null}
                </span>
                <textarea
                  className="admin-input mt-1 min-h-20"
                  value={form.description}
                  onChange={(event) => {
                    autoDescription.current = null;
                    setForm({ ...form, description: event.target.value });
                  }}
                  placeholder="留空自动读取站点简介"
                />
              </label>
              <label>
                <span className="admin-label">图标字符（字母或数字）</span>
                <input className="admin-input mt-1" value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })} />
              </label>
              <label>
                <span className="admin-label">图标 URL</span>
                <input
                  className="admin-input mt-1"
                  value={form.iconUrl}
                  onChange={(event) => setForm({ ...form, iconUrl: event.target.value })}
                  placeholder="https://example.com/icon.png"
                />
              </label>
              <label>
                <span className="admin-label">分类</span>
                <select
                  className="admin-input mt-1"
                  value={form.categoryId || ''}
                  onChange={(event) => setForm({ ...form, categoryId: event.target.value ? Number(event.target.value) : undefined })}
                >
                  <option value="">未分类</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="admin-label">标签</span>
                <input className="admin-input mt-1" value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="用英文逗号分隔" />
              </label>
              <div className="flex flex-wrap gap-4 text-sm sm:col-span-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.visible} onChange={(event) => setForm({ ...form, visible: event.target.checked })} />
                  前台显示
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.openInNewTab} onChange={(event) => setForm({ ...form, openInNewTab: event.target.checked })} />
                  新窗口打开
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.healthEnabled} onChange={(event) => setForm({ ...form, healthEnabled: event.target.checked })} />
                  启用健康检查
                </label>
              </div>
              {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-200 sm:col-span-2">{error}</p>}
            </div>
          </AdminModal>
        </form>
      )}
      <Toast toast={toast} onClose={clearToast} />
    </div>
  );
}
