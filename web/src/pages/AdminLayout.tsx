import { Home, KeyRound, LayoutGrid, List, LogOut, Menu, Settings, UploadCloud, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { logout, me } from '../api/auth';
import { fetchPublicConfig } from '../api/public';
import type { SiteSettings } from '../types/setting';

const navItems = [
  { to: '/admin/apps', label: '应用管理', icon: LayoutGrid },
  { to: '/admin/categories', label: '分类管理', icon: List },
  { to: '/admin/settings', label: '站点设置', icon: Settings },
  { to: '/admin/import-export', label: '导入导出', icon: UploadCloud },
  { to: '/admin/security', label: '账号安全', icon: KeyRound },
];

const adminNavItems = [
  { to: '/admin/users', label: '用户管理', icon: Users },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<{ username: string; isAdmin?: boolean } | null>(null);
  const [settings, setSettings] = useState<SiteSettings>({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    me().then(setCurrentUser).catch(() => navigate('/admin/login'));
    fetchPublicConfig().then(setSettings).catch(() => undefined);
  }, [navigate]);

  async function handleLogout() {
    await logout();
    navigate('/admin/login');
  }

  return (
    <main className="min-h-screen bg-[#f6f3ec] text-ink dark:bg-slate-950 dark:text-white">
      <div className="grid min-h-screen lg:grid-cols-[240px_1fr]">
        <aside className="border-b border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-900 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3 px-2 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center text-3xl text-ink dark:text-white">{settings.logo || '✦'}</div>
              <div className="min-w-0">
                <p className="truncate font-semibold">{settings.site_title || '星渡枢航'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{currentUser?.username || 'Admin'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((value) => !value)}
              className="focus-ring inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:border-mint hover:text-mint dark:border-slate-700 dark:text-slate-300 lg:hidden"
              title={mobileMenuOpen ? '收起菜单' : '展开菜单'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          <div className={`${mobileMenuOpen ? 'block' : 'hidden'} lg:block`}>
            <nav className="mt-4 grid gap-1 lg:mt-6">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `focus-ring flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                        isActive
                          ? 'bg-mint text-white'
                          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`
                    }
                  >
                    <Icon size={18} />
                    {item.label}
                  </NavLink>
                );
              })}
              {currentUser?.isAdmin &&
                adminNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `focus-ring flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                          isActive
                            ? 'bg-mint text-white'
                            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                        }`
                      }
                    >
                      <Icon size={18} />
                      {item.label}
                    </NavLink>
                  );
                })}
            </nav>
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="focus-ring mt-6 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Home size={18} />
              返回主页
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="focus-ring mt-2 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <LogOut size={18} />
              退出登录
            </button>
          </div>
        </aside>
        <section className="min-w-0 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </section>
      </div>
    </main>
  );
}
