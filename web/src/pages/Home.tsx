import { LogOut, Moon, Search, Shield, Sun } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CategorySection from '../components/CategorySection';
import EmptyState from '../components/EmptyState';
import { logout } from '../api/auth';
import { fetchPublicApps, fetchPublicConfig } from '../api/public';
import type { NavCategory } from '../types/app';
import type { SiteSettings } from '../types/setting';

export default function Home() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SiteSettings>({});
  const [categories, setCategories] = useState<NavCategory[]>([]);
  const [keyword, setKeyword] = useState('');
  const [dark, setDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  useEffect(() => {
    Promise.all([fetchPublicConfig(), fetchPublicApps()]).then(([config, apps]) => {
      setSettings(config);
      setCategories(apps);
    });
  }, []);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) {
      return categories;
    }

    return categories
      .map((category) => ({
        ...category,
        apps: category.apps.filter((app) =>
          [app.name, app.description || '', ...app.tags].join(' ').toLowerCase().includes(q),
        ),
      }))
      .filter((category) => category.apps.length > 0);
  }, [categories, keyword]);

  async function handleLogout() {
    await logout();
    navigate('/admin/login');
  }

  return (
    <main className="min-h-screen bg-[#f6f3ec] text-ink dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-black/10 bg-[#f6f3ec]/88 backdrop-blur dark:border-white/10 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center text-4xl text-ink dark:text-white">
                {settings.logo || '✦'}
              </div>
              <div>
                <h1 className="text-2xl font-semibold sm:text-3xl">{settings.site_title || 'AtlasGate 星渡枢航'}</h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {settings.site_subtitle || '个人系统、内网服务与运维入口的统一星图'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                to="/admin"
                className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:border-mint hover:text-mint dark:border-slate-700 dark:text-slate-300"
                title="后台管理"
              >
                <Shield size={18} />
              </Link>
              <button
                type="button"
                onClick={() => setDark((value) => !value)}
                className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md bg-mint text-white hover:bg-ink dark:bg-mint"
                title="切换主题"
              >
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:border-red-300 hover:text-red-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-red-400 dark:hover:text-red-300"
                title="退出登录"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>

          <label className="surface flex items-center gap-3 rounded-lg px-4 py-3">
            <Search size={20} className="text-slate-500" />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="搜索系统、描述或标签"
              className="w-full bg-transparent text-base outline-none placeholder:text-slate-400"
            />
          </label>
        </div>
      </header>

      <div className="py-4">
        {filtered.length ? (
          filtered.map((category) => <CategorySection key={category.id} category={category} />)
        ) : (
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <EmptyState title="没有匹配的系统" description="换一个关键词，或者到后台新增入口。" />
          </div>
        )}
      </div>

      <footer className="mx-auto max-w-7xl px-4 py-8 text-sm text-slate-500 sm:px-6 lg:px-8 dark:text-slate-400">
        {settings.footer_text || 'Powered by AtlasGate'}
      </footer>
    </main>
  );
}
