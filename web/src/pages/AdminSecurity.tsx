import { KeyRound, Save } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { changePassword } from '../api/auth';
import { getErrorMessage } from '../api/client';
import AdminPageHeader from '../components/AdminPageHeader';

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
    <section className="admin-panel max-w-2xl overflow-hidden rounded-lg">
      <AdminPageHeader icon={KeyRound} title="账号安全" description="更新当前账号密码，修改后需要重新登录" />
      <form onSubmit={submit} className="grid gap-4 p-5 sm:p-6">
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
          className="admin-primary-button mt-1 w-full sm:w-auto sm:justify-self-start"
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
