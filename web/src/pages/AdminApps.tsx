import { ChevronDown, ChevronRight, GripVertical, Pencil, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { checkAllAppHealth, checkAppHealth, createApp, deleteApp, fetchAdminApps, fetchCategories, updateApp } from '../api/admin';
import { getErrorMessage } from '../api/client';
import AdminModal from '../components/AdminModal';
import { confirmDelete } from '../components/ConfirmDialog';
import HealthBadge from '../components/HealthBadge';
import Toast, { useToast } from '../components/Toast';
import type { NavApp } from '../types/app';
import type { AdminCategory } from '../types/category';

const blank = {
  name: '',
  url: '',
  description: '',
  icon: '⌁',
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

function mergeCheckedApps(apps: NavApp[], checkedApps: NavApp[]) {
  const appMap = new Map(checkedApps.map((app) => [app.id, app]));
  return apps.map((app) => (appMap.has(app.id) ? { ...app, ...appMap.get(app.id)! } : app));
}

function formatHealthSummary(checkedApps: NavApp[]) {
  if (checkedApps.length === 0) {
    return '没有启用健康检查的应用';
  }

  const healthy = checkedApps.filter((app) => app.healthStatus === 'healthy').length;
  const unhealthy = checkedApps.filter((app) => app.healthStatus === 'unhealthy').length;
  return `检查完成：正常 ${healthy} 个，异常 ${unhealthy} 个`;
}

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
  const [checkingAllHealth, setCheckingAllHealth] = useState(false);
  const { toast, showToast, clearToast } = useToast();

  async function load() {
    const [appRows, categoryRows] = await Promise.all([fetchAdminApps(), fetchCategories()]);
    setApps(appRows);
    setCategories(categoryRows);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    const rows = q ? apps.filter((app) => [app.name, app.description, ...app.tags].join(' ').toLowerCase().includes(q)) : apps;
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
        icon: '·',
        description: '尚未归类的应用',
        apps: uncategorized,
      });
    }

    return categoryGroups;
  }, [categories, filtered]);

  const canDragSort = keyword.trim().length === 0;

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
    setEditing(null);
    setForm(blank);
    setError('');
    setModalOpen(true);
  }

  function startEdit(app: NavApp) {
    setEditing(app);
    setForm({
      name: app.name,
      url: app.url,
      description: app.description || '',
      icon: app.icon || '',
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
      showToast(checked.healthStatus === 'healthy' ? '健康检查正常' : '健康检查异常', checked.healthStatus === 'healthy' ? 'success' : 'error');
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

  async function runAllHealthChecks() {
    if (checkingAllHealth || checkingAppIds.size > 0) {
      return;
    }

    const enabledAppIds = apps.filter((app) => app.healthEnabled !== false).map((app) => app.id);
    setActionError('');
    setCheckingAllHealth(true);
    setCheckingAppIds(new Set(enabledAppIds));

    try {
      const checkedApps = await checkAllAppHealth();
      setApps((current) => mergeCheckedApps(current, checkedApps));
      const hasUnhealthy = checkedApps.some((app) => app.healthStatus === 'unhealthy');
      showToast(formatHealthSummary(checkedApps), hasUnhealthy ? 'error' : 'success');
    } catch (err) {
      const message = getErrorMessage(err);
      setActionError(message);
      showToast(message, 'error');
    } finally {
      setCheckingAllHealth(false);
      setCheckingAppIds(new Set());
    }
  }

  return (
    <div className="grid gap-6">
      <section className="surface overflow-hidden rounded-lg">
        <div className="flex flex-col gap-3 border-b border-black/10 p-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">应用列表</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">管理当前用户的导航入口</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input className="admin-input sm:w-64" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索应用" />
            <button
              type="button"
              onClick={runAllHealthChecks}
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-mint hover:text-mint disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:text-slate-300"
              title={checkingAllHealth ? '正在批量检查' : '批量检查'}
              data-tooltip={checkingAllHealth ? '正在批量检查' : '批量检查'}
              disabled={checkingAllHealth || checkingAppIds.size > 0}
            >
              <RefreshCw size={16} className={checkingAllHealth ? 'animate-spin' : ''} />
              批量检查
            </button>
            <button
              type="button"
              onClick={startCreate}
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-md bg-mint px-3 py-2 text-sm font-semibold text-white hover:bg-ink"
            >
              <Plus size={16} />
              新增应用
            </button>
          </div>
        </div>
        {actionError && <p className="mx-5 mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-200">{actionError}</p>}
        {!canDragSort && <p className="mx-5 mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">清空搜索后可拖拽排序。</p>}
        <div className="grid gap-5 p-5">
          {groupedApps.map((group) => {
            const collapsed = collapsedGroupKeys.has(groupKey(group));

            return (
              <section key={group.id ?? 'uncategorized'} className="overflow-hidden rounded-lg border border-black/10 bg-white/70 dark:border-white/10 dark:bg-slate-950/40">
                <div className="flex items-center justify-between gap-4 border-b border-black/10 px-4 py-3 dark:border-white/10">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg text-mint">{group.icon || '·'}</span>
                      <h2 className="font-semibold">{group.name}</h2>
                      <button
                        type="button"
                        onClick={() => toggleGroup(group)}
                        className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-mint dark:text-slate-400 dark:hover:bg-slate-900"
                        title={collapsed ? '展开分类' : '折叠分类'}
                        data-tooltip={collapsed ? '展开分类' : '折叠分类'}
                        aria-expanded={!collapsed}
                      >
                        {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                    {group.description && !collapsed && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{group.description}</p>}
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{group.apps.length} 个应用</span>
                </div>

                {!collapsed && (
                  <>
                    <div className="grid gap-3 p-3 md:hidden">
                      {group.apps.map((app) => (
                        <article key={app.id} className="rounded-lg border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-900/70">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="truncate font-semibold">
                                {app.icon} {app.name}
                              </h3>
                              <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{app.url}</p>
                            </div>
                            <HealthBadge app={app} />
                          </div>
                          {app.tags.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {app.tags.slice(0, 3).map((tag) => (
                                <span key={tag} className="rounded-full bg-ember/10 px-2.5 py-1 text-xs font-medium text-ember dark:bg-ember/20">
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
                                className="focus-ring rounded-md p-2 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800"
                                onClick={() => runHealthCheck(app)}
                                title={app.healthEnabled === false ? '已关闭健康检查' : '立即检查'}
                                data-tooltip={app.healthEnabled === false ? '已关闭健康检查' : '立即检查'}
                                disabled={app.healthEnabled === false || checkingAllHealth || checkingAppIds.has(app.id)}
                              >
                                <RefreshCw size={16} className={checkingAppIds.has(app.id) ? 'animate-spin' : ''} />
                              </button>
                              <button className="focus-ring rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => startEdit(app)} title="编辑" data-tooltip="编辑">
                                <Pencil size={16} />
                              </button>
                              <button className="focus-ring rounded-md p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40" onClick={() => remove(app.id)} title="删除" data-tooltip="删除">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full min-w-[860px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400">
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
                              className={`border-t border-black/10 transition dark:border-white/10 ${
                                draggingAppId === app.id ? 'bg-mint/10 opacity-70' : 'bg-transparent'
                              } ${canDragSort ? 'cursor-move hover:bg-slate-50 dark:hover:bg-slate-900/80' : ''}`}
                            >
                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 ${
                                  canDragSort ? 'cursor-grab hover:bg-slate-100 hover:text-mint active:cursor-grabbing dark:hover:bg-slate-800' : 'opacity-40'
                                }`}
                                title={canDragSort ? '拖拽排序' : '清空搜索后可排序'}
                                data-tooltip={canDragSort ? '拖拽排序' : '清空搜索后可排序'}
                              >
                                <GripVertical size={17} />
                              </span>
                            </td>
                            <td className="px-4 py-4 font-medium">{app.icon} {app.name}</td>
                            <td className="max-w-xs truncate px-4 py-4 text-slate-500">{app.url}</td>
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
                                  className="focus-ring rounded-md p-2 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-slate-800"
                                  onClick={() => runHealthCheck(app)}
                                  title={app.healthEnabled === false ? '已关闭健康检查' : '立即检查'}
                                  data-tooltip={app.healthEnabled === false ? '已关闭健康检查' : '立即检查'}
                                  disabled={app.healthEnabled === false || checkingAllHealth || checkingAppIds.has(app.id)}
                                >
                                  <RefreshCw size={16} className={checkingAppIds.has(app.id) ? 'animate-spin' : ''} />
                                </button>
                                <button className="focus-ring rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => startEdit(app)} title="编辑" data-tooltip="编辑">
                                  <Pencil size={16} />
                                </button>
                                <button className="focus-ring rounded-md p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40" onClick={() => remove(app.id)} title="删除" data-tooltip="删除">
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
            <div className="rounded-lg border border-dashed border-black/15 px-6 py-10 text-center text-sm text-slate-500 dark:border-white/15 dark:text-slate-400">
              暂无应用
            </div>
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
                <button type="button" className="focus-ring rounded-md px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" onClick={closeModal}>
                  取消
                </button>
                <button className="focus-ring inline-flex items-center gap-2 rounded-md bg-mint px-4 py-2 text-sm font-semibold text-white hover:bg-ink" type="submit">
                  <Save size={16} />
                  保存
                </button>
              </>
            }
          >
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-1">
                <span className="admin-label">系统名称</span>
                <input className="admin-input mt-1" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoFocus />
              </label>
              <label className="sm:col-span-1">
                <span className="admin-label">访问地址</span>
                <input className="admin-input mt-1" required value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} />
              </label>
              <label className="sm:col-span-2">
                <span className="admin-label">描述</span>
                <textarea className="admin-input mt-1 min-h-20" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              </label>
              <label>
                <span className="admin-label">图标</span>
                <input className="admin-input mt-1" value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })} />
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
