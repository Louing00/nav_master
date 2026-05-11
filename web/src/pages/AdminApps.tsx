import { Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { createApp, deleteApp, fetchAdminApps, fetchCategories, updateApp } from '../api/admin';
import { getErrorMessage } from '../api/client';
import { confirmDelete } from '../components/ConfirmDialog';
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
};

export default function AdminApps() {
  const [apps, setApps] = useState<NavApp[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [editing, setEditing] = useState<NavApp | null>(null);
  const [form, setForm] = useState(blank);
  const [keyword, setKeyword] = useState('');
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

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
    return q ? apps.filter((app) => [app.name, app.description, ...app.tags].join(' ').toLowerCase().includes(q)) : apps;
  }, [apps, keyword]);

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
    const payload = {
      ...form,
      categoryId: form.categoryId ? Number(form.categoryId) : undefined,
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      sortOrder: Number(form.sortOrder || 0),
    };

    try {
      if (editing) {
        await updateApp(editing.id, payload);
      } else {
        await createApp(payload);
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
              onClick={startCreate}
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-md bg-mint px-3 py-2 text-sm font-semibold text-white hover:bg-ink"
            >
              <Plus size={16} />
              新增应用
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3">名称</th>
                <th className="px-5 py-3">地址</th>
                <th className="px-5 py-3">状态</th>
                <th className="px-5 py-3">排序</th>
                <th className="px-5 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((app) => (
                <tr key={app.id} className="border-t border-black/10 dark:border-white/10">
                  <td className="px-5 py-4 font-medium">{app.icon} {app.name}</td>
                  <td className="max-w-xs truncate px-5 py-4 text-slate-500">{app.url}</td>
                  <td className="px-5 py-4">{app.visible ? '显示' : '隐藏'}</td>
                  <td className="px-5 py-4">{app.sortOrder}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button className="focus-ring rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => startEdit(app)} title="编辑">
                        <Pencil size={16} />
                      </button>
                      <button className="focus-ring rounded-md p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40" onClick={() => remove(app.id)} title="删除">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
          <form onSubmit={submit} className="surface max-h-[calc(100vh-3rem)] w-full max-w-2xl overflow-y-auto rounded-lg p-5">
            <div className="flex items-center justify-between gap-4 border-b border-black/10 pb-4 dark:border-white/10">
              <h2 className="text-xl font-semibold">{editing ? '编辑应用' : '新增应用'}</h2>
              <button
                type="button"
                onClick={closeModal}
                className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-ink dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                title="关闭"
              >
                <X size={18} />
              </button>
            </div>

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
                <span className="admin-label">排序</span>
                <input className="admin-input mt-1" type="number" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })} />
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
              </div>
              {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-200 sm:col-span-2">{error}</p>}
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-black/10 pt-4 dark:border-white/10">
              <button type="button" className="focus-ring rounded-md px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" onClick={closeModal}>
                取消
              </button>
              <button className="focus-ring inline-flex items-center gap-2 rounded-md bg-mint px-4 py-2 text-sm font-semibold text-white hover:bg-ink" type="submit">
                <Save size={16} />
                保存
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
