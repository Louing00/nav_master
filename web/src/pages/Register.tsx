import { UserPlus } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../api/auth';
import { getErrorMessage } from '../api/client';

export default function Register() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    try {
      await register(username, password);
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f3ec] px-4 dark:bg-slate-950">
      <form onSubmit={submit} className="surface w-full max-w-sm rounded-lg p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-ink text-white dark:bg-white dark:text-ink">
            <UserPlus size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-ink dark:text-white">注册账号</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">创建你的独立导航空间</p>
          </div>
        </div>
        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="admin-label">用户名</span>
            <input
              className="admin-input mt-1"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="3-32 位字母、数字或 _@.-"
              required
            />
          </label>
          <label className="block">
            <span className="admin-label">密码</span>
            <input
              className="admin-input mt-1"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
          </label>
          <label className="block">
            <span className="admin-label">确认密码</span>
            <input
              className="admin-input mt-1"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              required
            />
          </label>
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-200">{error}</p>}
          <button className="focus-ring w-full rounded-md bg-mint px-4 py-2 font-semibold text-white hover:bg-ink" type="submit">
            注册并进入
          </button>
          <Link className="block text-center text-sm text-slate-500 hover:text-mint dark:text-slate-400" to="/admin/login">
            已有账号，去登录
          </Link>
        </div>
      </form>
    </main>
  );
}
