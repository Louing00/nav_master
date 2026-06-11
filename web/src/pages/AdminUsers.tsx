import { Pencil, Plus, Save, Trash2, UserRound, X } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { createUser, deleteUser, fetchUsers, updateUser, type AdminUser } from '../api/users';
import { getErrorMessage } from '../api/client';
import AdminModal from '../components/AdminModal';
import { confirmDelete } from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import Toast, { useToast } from '../components/Toast';

const blank = { username: '', password: '', isAdmin: false };

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const { toast, showToast, clearToast } = useToast();

  async function load() {
    setUsers(await fetchUsers());
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(user: AdminUser) {
    setEditing(user);
    setForm({ username: user.username, password: '', isAdmin: user.isAdmin });
    setError('');
    setModalOpen(true);
  }

  function startCreate() {
    setEditing(null);
    setForm(blank);
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

    try {
      if (editing) {
        await updateUser(editing.id, {
          isAdmin: form.isAdmin,
          password: form.password || undefined,
        });
        showToast('用户已更新');
      } else {
        await createUser(form);
        showToast('用户已创建');
      }
      closeModal();
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function remove(user: AdminUser) {
    if (!confirmDelete(`确认删除用户 ${user.username} 吗？该用户的导航数据也会被删除。`)) {
      return;
    }

    try {
      await deleteUser(user.id);
      await load();
      showToast('用户已删除');
    } catch (err) {
      setError(getErrorMessage(err));
      showToast(getErrorMessage(err), 'error');
    }
  }

  return (
    <div className="grid gap-6">
      <section className="surface overflow-hidden rounded-lg">
        <div className="flex flex-col gap-3 border-b border-black/10 p-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">用户列表</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">管理员可统一维护账号和权限</p>
          </div>
          <button
            type="button"
            onClick={startCreate}
            className="focus-ring inline-flex items-center justify-center gap-2 rounded-md bg-mint px-3 py-2 text-sm font-semibold text-white hover:bg-ink"
          >
            <Plus size={16} />
            新增用户
          </button>
        </div>
        {error && !modalOpen && <p className="mx-5 mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-200">{error}</p>}
        {users.length === 0 ? (
          <div className="p-5">
            <EmptyState title="暂无用户" description="创建用户后，可为每个账号维护独立的导航空间。" />
          </div>
        ) : (
          <>
        <div className="grid gap-3 p-4 md:hidden">
          {users.map((user) => (
            <article key={user.id} className="rounded-lg border border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-900/70">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mint/10 text-mint dark:bg-mint/20">
                    <UserRound size={19} strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{user.username}</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{user.categoryCount} 分类 / {user.appCount} 应用</p>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${user.isAdmin ? 'bg-mint/10 text-mint' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}>
                  {user.isAdmin ? '管理员' : '普通用户'}
                </span>
              </div>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">创建于 {new Date(user.createdAt).toLocaleString()}</p>
              <div className="mt-4 flex justify-end gap-2">
                <button className="focus-ring rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => startEdit(user)} title="编辑" data-tooltip="编辑">
                  <Pencil size={16} />
                </button>
                <button className="focus-ring rounded-md p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40" onClick={() => remove(user)} title="删除" data-tooltip="删除">
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3">用户</th>
                <th className="px-5 py-3">权限</th>
                <th className="px-5 py-3">数据</th>
                <th className="px-5 py-3">创建时间</th>
                <th className="px-5 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-black/10 dark:border-white/10">
                  <td className="px-5 py-4 font-medium">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mint/10 text-mint dark:bg-mint/20">
                        <UserRound size={17} strokeWidth={1.8} />
                      </span>
                      {user.username}
                    </div>
                  </td>
                  <td className="px-5 py-4">{user.isAdmin ? '管理员' : '普通用户'}</td>
                  <td className="px-5 py-4 text-slate-500">{user.categoryCount} 分类 / {user.appCount} 应用</td>
                  <td className="px-5 py-4 text-slate-500">{new Date(user.createdAt).toLocaleString()}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button className="focus-ring rounded-md p-2 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => startEdit(user)} title="编辑" data-tooltip="编辑">
                        <Pencil size={16} />
                      </button>
                      <button className="focus-ring rounded-md p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40" onClick={() => remove(user)} title="删除" data-tooltip="删除">
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
            title={editing ? '编辑用户' : '新增用户'}
            onClose={closeModal}
            maxWidth="max-w-xl"
            footer={
              <>
                <button type="button" className="focus-ring inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" onClick={closeModal}>
                  <X size={16} />
                  取消
                </button>
                <button className="focus-ring inline-flex items-center gap-2 rounded-md bg-mint px-4 py-2 text-sm font-semibold text-white hover:bg-ink" type="submit">
                  <Save size={16} />
                  保存
                </button>
              </>
            }
          >
            <div className="mt-5 grid gap-4">
              <label>
                <span className="admin-label">用户名</span>
                <input
                  className="admin-input mt-1"
                  value={form.username}
                  onChange={(event) => setForm({ ...form, username: event.target.value })}
                  disabled={Boolean(editing)}
                  required
                  autoFocus
                />
              </label>
              <label>
                <span className="admin-label">{editing ? '重置密码' : '密码'}</span>
                <input
                  className="admin-input mt-1"
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  minLength={8}
                  required={!editing}
                  placeholder={editing ? '留空则不修改' : ''}
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isAdmin} onChange={(event) => setForm({ ...form, isAdmin: event.target.checked })} />
                管理员
              </label>
              {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-200">{error}</p>}
            </div>
          </AdminModal>
        </form>
      )}
      <Toast toast={toast} onClose={clearToast} />
    </div>
  );
}
