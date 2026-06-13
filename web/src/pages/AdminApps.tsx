import { LayoutGrid, Plus, RefreshCw, Save, Search, X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createApp, deleteApp, fetchAdminApps, fetchCategories, updateApp } from '../api/admin';
import { getErrorMessage } from '../api/client';
import AdminModal from '../components/AdminModal';
import AdminPageHeader from '../components/AdminPageHeader';
import { confirmDelete } from '../components/ConfirmDialog';
import Toast, { useToast } from '../components/Toast';
import AdminAppGroups, { type AppGroup } from '../features/apps/AdminAppGroups';
import AppEditorFields from '../features/apps/AppEditorFields';
import { buildAppPayload } from '../features/apps/appEditor';
import { useAppEditor } from '../features/apps/useAppEditor';
import { useAdminAppStatusActions } from '../features/apps/useAdminAppStatusActions';
import { useDeferredMetadataRefresh } from '../hooks/useDeferredMetadataRefresh';
import { getAppDisplayDescription, getAppDisplayName } from '../lib/appName';
import type { NavApp } from '../types/app';
import type { AdminCategory } from '../types/category';

export default function AdminApps() {
  const [apps, setApps] = useState<NavApp[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [editing, setEditing] = useState<NavApp | null>(null);
  const [keyword, setKeyword] = useState('');
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [draggingAppId, setDraggingAppId] = useState<number | null>(null);
  const [collapsedGroupKeys, setCollapsedGroupKeys] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState('');
  const { toast, showToast, clearToast } = useToast();
  const appEditor = useAppEditor(modalOpen);
  const statusActions = useAdminAppStatusActions({
    apps,
    setApps,
    setActionError,
    showToast,
  });

  async function load() {
    const [appRows, categoryRows] = await Promise.all([fetchAdminApps(), fetchCategories()]);
    setApps(appRows);
    setCategories(categoryRows);
  }

  useEffect(() => {
    load();
  }, []);

  useDeferredMetadataRefresh(apps, load);

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

  function startCreate() {
    appEditor.reset();
    setEditing(null);
    setError('');
    setModalOpen(true);
  }

  function startEdit(app: NavApp) {
    appEditor.edit(app);
    setEditing(app);
    setError('');
    setModalOpen(true);
  }

  function closeModal() {
    appEditor.reset();
    setEditing(null);
    setError('');
    setModalOpen(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    const payload = buildAppPayload(appEditor.form, {
      apps,
      editing,
      autoDescription: appEditor.autoDescription,
    });

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
              onClick={statusActions.runAllHealthChecks}
              className="admin-secondary-button"
              title={statusActions.checkingAllHealth && statusActions.healthCheckProgress ? `正在检查 ${statusActions.healthCheckProgress.checked}/${statusActions.healthCheckProgress.total}` : '批量检查'}
              data-tooltip={statusActions.checkingAllHealth && statusActions.healthCheckProgress ? `正在检查 ${statusActions.healthCheckProgress.checked}/${statusActions.healthCheckProgress.total}` : '批量检查'}
              disabled={statusActions.checkingAllHealth || statusActions.checkingAppIds.size > 0}
            >
              <RefreshCw size={16} className={statusActions.checkingAllHealth ? 'animate-spin' : ''} />
              {statusActions.checkingAllHealth && statusActions.healthCheckProgress ? `检查中 ${statusActions.healthCheckProgress.checked}/${statusActions.healthCheckProgress.total}` : '批量检查'}
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
        <AdminAppGroups
          groups={groupedApps}
          keyword={keyword}
          collapsedGroupKeys={collapsedGroupKeys}
          canDragSort={canDragSort}
          draggingAppId={draggingAppId}
          checkingAllHealth={statusActions.checkingAllHealth}
          checkingAppIds={statusActions.checkingAppIds}
          refreshingIconIds={statusActions.refreshingIconIds}
          onToggleGroup={toggleGroup}
          onToggleVisible={toggleVisible}
          onRefreshIcon={statusActions.runIconRefresh}
          onHealthCheck={statusActions.runHealthCheck}
          onEdit={startEdit}
          onRemove={remove}
          onReorder={reorderApp}
          onDraggingAppChange={setDraggingAppId}
        />
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
            <AppEditorFields
              form={appEditor.form}
              setForm={appEditor.setForm}
              categories={categories}
              descriptionIsAuto={appEditor.descriptionIsAuto}
              onDescriptionChange={appEditor.changeDescription}
              preview={appEditor.preview}
              error={error}
            />
          </AdminModal>
        </form>
      )}
      <Toast toast={toast} onClose={clearToast} />
    </div>
  );
}
