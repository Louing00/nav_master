import { LayoutGrid, List, LogOut, Settings, UploadCloud } from 'lucide-react';
import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { logout, me } from '../api/auth';

const navItems = [
  { to: '/admin/apps', label: '应用管理', icon: LayoutGrid },
  { to: '/admin/categories', label: '分类管理', icon: List },
  { to: '/admin/settings', label: '站点设置', icon: Settings },
  { to: '/admin/import-export', label: '导入导出', icon: UploadCloud },
];

export default function AdminLayout() {
  const navigate = useNavigate();

  useEffect(() => {
    me().catch(() => navigate('/admin/login'));
  }, [navigate]);

  async function handleLogout() {
    await logout();
    navigate('/admin/login');
  }

  return (
    <main className="min-h-screen bg-[#f6f3ec] text-ink dark:bg-slate-950 dark:text-white">
      <div className="grid min-h-screen lg:grid-cols-[240px_1fr]">
        <aside className="border-b border-black/10 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-900 lg:border-b-0 lg:border-r">
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ink text-white dark:bg-white dark:text-ink">✦</div>
            <div>
              <p className="font-semibold">星渡枢航</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Admin</p>
            </div>
          </div>
          <nav className="mt-6 grid gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
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
          <button
            type="button"
            onClick={handleLogout}
            className="focus-ring mt-6 flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <LogOut size={18} />
            退出登录
          </button>
        </aside>
        <section className="min-w-0 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </section>
      </div>
    </main>
  );
}
