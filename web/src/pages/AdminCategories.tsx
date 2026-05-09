import { Pencil, Plus, Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { createCategory, deleteCategory, fetchCategories, updateCategory } from '../api/admin';
import { confirmDelete } from '../components/ConfirmDialog';
import type { AdminCategory } from '../types/category';

const blank = { name: '', description: '', icon: '◇', sortOrder: 0, visible: true };

export default function AdminCategories() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [form, setForm] = useState(blank);

  async function load() {
    setCategories(await fetchCategories());
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (editing) {
      await updateCategory(editing.id, form);
    } else {
      await createCategory(form);
    }
    setEditing(null);
    setForm(blank);
    await load();
  }

  function startEdit(category: AdminCategory) {
    setEditing(category);
    setForm({
      name: category.name,
      description: category.description || '',
      icon: category.icon || '',
      sortOrder: category.sortOrder,
      visible: category.visible,
    });
  }

  async function remove(id: number) {
    if (!confirmDelete('确认删除分类吗？分类下的应用会变为未分类。')) {
      return;
    }
    await deleteCategory(id);
    await load();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <form onSubmit={submit} className="surface rounded-lg p-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">{editing ? '编辑分类' : '新增分类'}</h1>
          <button className="focus-ring inline-flex items-center gap-2 rounded-md bg-mint px-3 py-2 text-sm font-semibold text-white" type="submit">
            <Plus size={16} />
            保存
          </button>
        </div>
        <div className="mt-5 grid gap-4">
          <label>
            <span className="admin-label">名称</span>
            <input className="admin-input mt-1" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label>
            <span className="admin-label">描述</span>
            <textarea className="admin-input mt-1 min-h-20" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className="admin-label">图标</span>
              <input className="admin-input mt-1" value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })} />
            </label>
            <label>
              <span className="admin-label">排序</span>
              <input className="admin-input mt-1" type="number" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })} />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.visible} onChange={(event) => setForm({ ...form, visible: event.target.checked })} />
            前台显示
          </label>
          {editing && (
            <button type="button" className="text-left text-sm text-slate-500 hover:text-mint" onClick={() => { setEditing(null); setForm(blank); }}>
              取消编辑
            </button>
          )}
        </div>
      </form>

      <section className="surface overflow-hidden rounded-lg">
        <div className="border-b border-black/10 p-5 dark:border-white/10">
          <h2 className="text-xl font-semibold">分类列表</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400">
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
                <tr key={category.id} className="border-t border-black/10 dark:border-white/10">
                  <td className="px-5 py-4 font-medium">{category.icon} {category.name}</td>
                  <td className="px-5 py-4">{category._count?.apps || 0}</td>
                  <td className="px-5 py-4">{category.visible ? '显示' : '隐藏'}</td>
                  <td className="px-5 py-4">{category.sortOrder}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button className="focus-ring rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => startEdit(category)} title="编辑">
                        <Pencil size={16} />
                      </button>
                      <button className="focus-ring rounded-md p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40" onClick={() => remove(category.id)} title="删除">
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
    </div>
  );
}
