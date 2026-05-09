import { Lock } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import { login } from '../api/auth';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      await login(username, password);
      navigate(searchParams.get('next') || '/');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f3ec] px-4 dark:bg-slate-950">
      <form onSubmit={submit} className="surface w-full max-w-sm rounded-lg p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-ink text-white dark:bg-white dark:text-ink">
            <Lock size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-ink dark:text-white">后台登录</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">AtlasGate 星渡枢航</p>
          </div>
        </div>
        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="admin-label">用户名</span>
            <input className="admin-input mt-1" value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label className="block">
            <span className="admin-label">密码</span>
            <input
              className="admin-input mt-1"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoFocus
            />
          </label>
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-200">{error}</p>}
          <button className="focus-ring w-full rounded-md bg-mint px-4 py-2 font-semibold text-white hover:bg-ink" type="submit">
            登录
          </button>
        </div>
      </form>
    </main>
  );
}
