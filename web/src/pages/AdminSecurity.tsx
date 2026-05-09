import { KeyRound, Save } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword } from '../api/auth';
import { getErrorMessage } from '../api/client';

export default function AdminSecurity() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致');
      return;
    }

    if (newPassword.length < 8) {
      setError('新密码至少需要 8 位');
      return;
    }

    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      navigate('/admin/login');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="surface max-w-xl rounded-lg p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-ink text-white dark:bg-white dark:text-ink">
          <KeyRound size={20} />
        </div>
        <div>
          <h1 className="text-xl font-semibold">账号安全</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">修改当前登录用户的密码</p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-6 grid gap-4">
        <label>
          <span className="admin-label">当前密码</span>
          <input
            className="admin-input mt-1"
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <label>
          <span className="admin-label">新密码</span>
          <input
            className="admin-input mt-1"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
          />
        </label>
        <label>
          <span className="admin-label">确认新密码</span>
          <input
            className="admin-input mt-1"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
          />
        </label>

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-200">{error}</p>}

        <button
          className="focus-ring inline-flex items-center justify-center gap-2 rounded-md bg-mint px-4 py-2 font-semibold text-white hover:bg-ink disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          disabled={saving}
        >
          <Save size={16} />
          {saving ? '保存中' : '修改密码'}
        </button>
      </form>
    </section>
  );
}
