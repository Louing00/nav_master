import { Home, KeyRound, LayoutGrid, List, LogOut, Menu, Settings, UploadCloud, Users, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { logout, me } from '../api/auth';
import { fetchPublicConfig } from '../api/public';
import BrandMark from '../components/BrandMark';
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
    <main className="admin-page min-h-screen">
      <div className="grid min-h-screen lg:h-[100dvh] lg:min-h-0 lg:grid-cols-[264px_minmax(0,1fr)] lg:overflow-hidden">
        <aside className="admin-sidebar lg:flex lg:h-[100dvh] lg:flex-col lg:overflow-y-auto">
          <div className="flex items-center justify-between gap-3 px-2 py-2 lg:py-3">
            <div className="flex min-w-0 items-center gap-3">
              <BrandMark logo={settings.logo} className="h-10 w-10" iconSize={19} />
              <div className="min-w-0">
                <p className="truncate font-semibold text-[var(--admin-text)]">{settings.site_title || '星渡枢航'}</p>
                <p className="text-xs text-[var(--admin-muted)]">管理控制台</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((value) => !value)}
              className="admin-icon-button lg:hidden"
              title={mobileMenuOpen ? '收起菜单' : '展开菜单'}
              data-tooltip={mobileMenuOpen ? '收起菜单' : '展开菜单'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          <div className={`${mobileMenuOpen ? 'block' : 'hidden'} lg:flex lg:min-h-0 lg:flex-1 lg:flex-col`}>
            <nav className="mt-4 grid gap-1 lg:mt-7">
              <p className="admin-nav-label">工作区</p>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `admin-nav-link ${isActive ? 'admin-nav-link-active' : ''}`
                    }
                  >
                    <span className="admin-nav-icon"><Icon size={17} strokeWidth={1.8} /></span>
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
              {currentUser?.isAdmin && <p className="admin-nav-label mt-5">管理员</p>}
              {currentUser?.isAdmin && adminNavItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `admin-nav-link ${isActive ? 'admin-nav-link-active' : ''}`
                      }
                    >
                      <span className="admin-nav-icon"><Icon size={17} strokeWidth={1.8} /></span>
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
            </nav>
            <div className="mt-6 border-t border-[var(--admin-border)] pt-4 lg:mt-auto">
              <div className="mb-3 flex items-center gap-3 rounded-lg bg-[var(--admin-secondary)] px-3 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--admin-accent-soft)] text-sm font-semibold text-[var(--admin-accent)]">
                  {(currentUser?.username || 'A').slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--admin-text)]">{currentUser?.username || 'Admin'}</p>
                  <p className="text-xs text-[var(--admin-muted)]">{currentUser?.isAdmin ? '管理员' : '当前用户'}</p>
                </div>
              </div>
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className="admin-nav-link">
                <span className="admin-nav-icon"><Home size={17} strokeWidth={1.8} /></span>
                <span>返回主页</span>
              </Link>
              <button type="button" onClick={handleLogout} className="admin-nav-link admin-nav-danger mt-1 w-full">
                <span className="admin-nav-icon"><LogOut size={17} strokeWidth={1.8} /></span>
                <span>退出登录</span>
              </button>
            </div>
          </div>
        </aside>
        <section className="min-w-0 px-4 py-5 sm:px-6 sm:py-7 lg:h-[100dvh] lg:overflow-y-auto lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-[1440px]">
            <Outlet />
          </div>
        </section>
      </div>
    </main>
  );
}
