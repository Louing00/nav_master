import { List, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { createCategory, deleteCategory, fetchCategories, updateCategory } from '../api/admin';
import { getErrorMessage } from '../api/client';
import AdminModal from '../components/AdminModal';
import AdminPageHeader from '../components/AdminPageHeader';
import CategoryIcon, { CATEGORY_ICON_OPTIONS, resolveCategoryIconKey } from '../components/CategoryIcon';
import { confirmDelete } from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import Toast, { useToast } from '../components/Toast';
import type { AdminCategory } from '../types/category';

const blank = { name: '', description: '', icon: 'folder', sortOrder: 0, visible: true };

export default function AdminCategories() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [form, setForm] = useState(blank);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const { toast, showToast, clearToast } = useToast();

  async function load() {
    setCategories(await fetchCategories());
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');

    try {
      if (editing) {
        await updateCategory(editing.id, form);
        showToast('分类已更新');
      } else {
        await createCategory(form);
        showToast('分类已创建');
      }
      closeModal();
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  function startCreate() {
    setEditing(null);
    setForm(blank);
    setError('');
    setModalOpen(true);
  }

  function startEdit(category: AdminCategory) {
    setEditing(category);
    setForm({
      name: category.name,
      description: category.description || '',
      icon: resolveCategoryIconKey(category.icon, category.name),
      sortOrder: category.sortOrder,
      visible: category.visible,
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

  async function remove(id: number) {
    if (!confirmDelete('确认删除分类吗？分类下的应用会变为未分类。')) {
      return;
    }
    try {
      await deleteCategory(id);
      await load();
      showToast('分类已删除');
    } catch (err) {
      showToast(getErrorMessage(err), 'error');
    }
  }

  return (
    <div className="grid gap-6">
      <section className="admin-panel overflow-hidden rounded-lg">
        <AdminPageHeader
          icon={List}
          title="分类管理"
          description={`组织首页分组与展示顺序，共 ${categories.length} 个分类`}
          actions={
            <button type="button" onClick={startCreate} className="admin-primary-button">
              <Plus size={16} />
              新增分类
            </button>
          }
        />
        {categories.length === 0 ? (
          <div className="p-5">
            <EmptyState title="暂无分类" description="创建第一个分类，用于组织你的应用入口。" />
          </div>
        ) : (
          <>
        <div className="grid gap-3 p-4 md:hidden">
          {categories.map((category) => (
            <article key={category.id} className="admin-mobile-card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="admin-icon-tile">
                    <CategoryIcon icon={category.icon} name={category.name} size={19} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{category.name}</h3>
                  {category.description && <p className="mt-1 line-clamp-2 text-sm text-[var(--admin-muted)]">{category.description}</p>}
                  </div>
                </div>
                <span className={`shrink-0 px-2.5 py-1 text-xs font-medium ${category.visible ? 'admin-status-accent' : 'admin-status-neutral'}`}>
                  {category.visible ? '显示' : '隐藏'}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-[var(--admin-muted)]">
                <span>{category._count?.apps || 0} 个应用</span>
                <span>排序 {category.sortOrder}</span>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button className="admin-icon-button" onClick={() => startEdit(category)} title="编辑" data-tooltip="编辑">
                  <Pencil size={16} />
                </button>
                <button className="admin-danger-button" onClick={() => remove(category.id)} title="删除" data-tooltip="删除">
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="admin-table min-w-[640px]">
            <thead>
              <tr>
                <th className="px-5 py-3">名称</th>
                <th className="px-5 py-3">应用数</th>
                <th className="px-5 py-3">状态</th>
                <th className="px-5 py-3">排序</th>
                <th className="px-5 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td className="px-5 py-4 font-medium">
                    <div className="flex items-center gap-3">
                      <span className="admin-icon-tile h-9 w-9">
                        <CategoryIcon icon={category.icon} name={category.name} size={17} />
                      </span>
                      {category.name}
                    </div>
                  </td>
                  <td className="px-5 py-4">{category._count?.apps || 0}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2.5 py-1 text-xs font-medium ${category.visible ? 'admin-status-accent' : 'admin-status-neutral'}`}>
                      {category.visible ? '显示' : '隐藏'}
                    </span>
                  </td>
                  <td className="px-5 py-4">{category.sortOrder}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button className="admin-icon-button" onClick={() => startEdit(category)} title="编辑" data-tooltip="编辑">
                        <Pencil size={16} />
                      </button>
                      <button className="admin-danger-button" onClick={() => remove(category.id)} title="删除" data-tooltip="删除">
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

      {modalOpen && (
        <form onSubmit={submit}>
          <AdminModal
            title={editing ? '编辑分类' : '新增分类'}
            onClose={closeModal}
            maxWidth="max-w-xl"
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
              <label>
                <span className="admin-label">名称</span>
                <input className="admin-input mt-1" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} autoFocus />
              </label>
              <label>
                <span className="admin-label">图标</span>
                <div className="mt-1 flex items-center gap-2">
                  <span className="admin-icon-tile">
                    <CategoryIcon icon={form.icon} name={form.name} size={19} />
                  </span>
                  <select className="admin-input" value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })}>
                    {CATEGORY_ICON_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
              <label className="sm:col-span-2">
                <span className="admin-label">描述</span>
                <textarea className="admin-input mt-1 min-h-20" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              </label>
              <label>
                <span className="admin-label">排序</span>
                <input className="admin-input mt-1" type="number" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })} />
              </label>
              <label className="flex items-center gap-2 pt-6 text-sm">
                <input type="checkbox" checked={form.visible} onChange={(event) => setForm({ ...form, visible: event.target.checked })} />
                前台显示
              </label>
              {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-200 sm:col-span-2">{error}</p>}
            </div>
          </AdminModal>
        </form>
      )}
      <Toast toast={toast} onClose={clearToast} />
    </div>
  );
}
