import { Pencil, Plus, Save, Trash2, UserRound, Users, X } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { createUser, deleteUser, fetchUsers, updateUser, type AdminUser } from '../api/users';
import { getErrorMessage } from '../api/client';
import AdminModal from '../components/AdminModal';
import AdminPageHeader from '../components/AdminPageHeader';
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
      <section className="admin-panel overflow-hidden rounded-lg">
        <AdminPageHeader
          icon={Users}
          title="用户管理"
          description={`维护账号权限与独立导航数据，共 ${users.length} 个用户`}
          actions={
            <button type="button" onClick={startCreate} className="admin-primary-button">
              <Plus size={16} />
              新增用户
            </button>
          }
        />
        {error && !modalOpen && <p className="mx-5 mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-200">{error}</p>}
        {users.length === 0 ? (
          <div className="p-5">
            <EmptyState title="暂无用户" description="创建用户后，可为每个账号维护独立的导航空间。" />
          </div>
        ) : (
          <>
        <div className="grid gap-3 p-4 md:hidden">
          {users.map((user) => (
            <article key={user.id} className="admin-mobile-card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="admin-icon-tile">
                    <UserRound size={19} strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold">{user.username}</h3>
                    <p className="mt-1 text-sm text-[var(--admin-muted)]">{user.categoryCount} 分类 / {user.appCount} 应用</p>
                  </div>
                </div>
                <span className={`shrink-0 px-2.5 py-1 text-xs font-medium ${user.isAdmin ? 'admin-status-accent' : 'admin-status-neutral'}`}>
                  {user.isAdmin ? '管理员' : '普通用户'}
                </span>
              </div>
              <p className="mt-3 text-xs text-[var(--admin-muted)]">创建于 {new Date(user.createdAt).toLocaleString()}</p>
              <div className="mt-4 flex justify-end gap-2">
                <button className="admin-icon-button" onClick={() => startEdit(user)} title="编辑" data-tooltip="编辑">
                  <Pencil size={16} />
                </button>
                <button className="admin-danger-button" onClick={() => remove(user)} title="删除" data-tooltip="删除">
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="admin-table min-w-[760px]">
            <thead>
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
                <tr key={user.id}>
                  <td className="px-5 py-4 font-medium">
                    <div className="flex items-center gap-3">
                      <span className="admin-icon-tile h-9 w-9">
                        <UserRound size={17} strokeWidth={1.8} />
                      </span>
                      {user.username}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2.5 py-1 text-xs font-medium ${user.isAdmin ? 'admin-status-accent' : 'admin-status-neutral'}`}>
                      {user.isAdmin ? '管理员' : '普通用户'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[var(--admin-muted)]">{user.categoryCount} 分类 / {user.appCount} 应用</td>
                  <td className="px-5 py-4 text-[var(--admin-muted)]">{new Date(user.createdAt).toLocaleString()}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button className="admin-icon-button" onClick={() => startEdit(user)} title="编辑" data-tooltip="编辑">
                        <Pencil size={16} />
                      </button>
                      <button className="admin-danger-button" onClick={() => remove(user)} title="删除" data-tooltip="删除">
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
