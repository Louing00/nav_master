import { Lock, LogIn, UserPlus } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import { login } from '../api/auth';
import authAccessIllustration from '../assets/illustrations/auth-access.svg';

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
    <main className="flex min-h-screen items-center justify-center bg-[#f3f6f8] px-4 py-8 dark:bg-slate-950">
      <section className="surface grid w-full max-w-4xl overflow-hidden rounded-xl md:grid-cols-[minmax(0,1fr)_minmax(340px,0.85fr)]">
        <div className="hidden items-center justify-center border-r border-black/10 bg-mint/5 p-8 dark:border-white/10 dark:bg-mint/10 md:flex">
          <div className="text-center">
            <img
              src={authAccessIllustration}
              alt=""
              className="mx-auto h-auto w-full max-w-sm object-contain"
              aria-hidden="true"
            />
            <p className="mt-3 text-sm font-semibold text-ink dark:text-white">安全进入你的私人导航空间</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">集中管理系统、服务和运维入口</p>
          </div>
        </div>
        <form onSubmit={submit} className="p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink text-white dark:bg-white dark:text-ink">
              <Lock size={20} strokeWidth={1.8} />
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
            <button className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-md bg-mint px-4 py-2 font-semibold text-white hover:bg-ink" type="submit">
              <LogIn size={17} />
              登录
            </button>
            <Link className="focus-ring flex items-center justify-center gap-2 rounded-md py-2 text-center text-sm text-slate-500 hover:text-mint dark:text-slate-400" to="/admin/register">
              <UserPlus size={16} />
              没有账号，注册一个
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}
