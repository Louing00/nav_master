import { LayoutGrid, LogOut, Menu, Moon, Search, Shield, Sun, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import homeConsoleIllustration from '../../assets/illustrations/home-console.svg';
import BrandMark from '../../components/BrandMark';
import CategoryIcon from '../../components/CategoryIcon';
import type { NavCategory } from '../../types/app';
import type { SiteSettings } from '../../types/setting';

type Props = {
  settings: SiteSettings;
  dark: boolean;
  allFilteredCollapsed: boolean;
  keyword: string;
  categories: NavCategory[];
  activeCategoryId: number | null;
  counts: {
    total: number;
    healthy: number;
    restricted: number;
    unhealthy: number;
  };
  onToggleDark: () => void;
  onToggleAllCategories: () => void;
  onKeywordChange: (keyword: string) => void;
  onCategorySelect: (categoryId: number) => void;
  onFocusHealthIssue: () => void;
  onLogout: () => void | Promise<void>;
};

export default function HomeHeader({
  settings,
  dark,
  allFilteredCollapsed,
  keyword,
  categories,
  activeCategoryId,
  counts,
  onToggleDark,
  onToggleAllCategories,
  onKeywordChange,
  onCategorySelect,
  onFocusHealthIssue,
  onLogout,
}: Props) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const attentionCount = counts.restricted + counts.unhealthy;

  function toggleAllAndCloseMenu() {
    onToggleAllCategories();
    setMobileMenuOpen(false);
  }

  return (
    <header className="px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8">
      <div className="home-surface relative mx-auto flex w-[calc(100vw-2rem)] max-w-7xl flex-col gap-5 overflow-hidden rounded-2xl p-4 sm:w-full sm:gap-6 sm:rounded-3xl sm:p-5">
        <img
          src={homeConsoleIllustration}
          alt=""
          className="pointer-events-none absolute right-52 top-0 hidden h-28 w-52 select-none object-contain opacity-45 xl:block dark:opacity-25"
          aria-hidden="true"
        />
        <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
            <BrandMark logo={settings.logo} className="h-11 w-11 sm:h-12 sm:w-12" iconSize={22} />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-semibold sm:text-3xl">
                {settings.site_title || 'AtlasGate 星渡枢航'}
              </h1>
              <p className="home-muted mt-1 truncate text-sm font-medium sm:line-clamp-none sm:whitespace-normal">
                {settings.site_subtitle || '个人系统、内网服务与运维入口的统一星图'}
              </p>
            </div>
          </div>
          <div className="hidden gap-2 sm:flex">
            <button
              type="button"
              onClick={onToggleAllCategories}
              className={`home-control focus-ring inline-flex h-11 w-11 items-center justify-center rounded-xl transition ${
                allFilteredCollapsed ? 'home-control-active' : ''
              }`}
              title={allFilteredCollapsed ? '展开全部分类' : '紧凑显示全部分类'}
              data-tooltip={allFilteredCollapsed ? '展开全部分类' : '紧凑显示全部分类'}
              aria-pressed={allFilteredCollapsed}
            >
              <LayoutGrid size={18} />
            </button>
            <Link
              to="/admin"
              className="home-control focus-ring inline-flex h-11 w-11 items-center justify-center rounded-xl transition"
              title="后台管理"
              data-tooltip="后台管理"
            >
              <Shield size={18} />
            </Link>
            <button
              type="button"
              onClick={onToggleDark}
              className="home-control focus-ring inline-flex h-11 w-11 items-center justify-center rounded-xl transition"
              title="切换主题"
              data-tooltip="切换主题"
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="home-control home-control-danger focus-ring inline-flex h-11 w-11 items-center justify-center rounded-xl transition"
              title="退出登录"
              data-tooltip="退出登录"
            >
              <LogOut size={18} />
            </button>
          </div>
          <div className="relative flex w-full min-w-0 shrink-0 justify-start gap-2 sm:hidden">
            <button
              type="button"
              onClick={onToggleDark}
              className="home-control focus-ring inline-flex h-11 w-11 items-center justify-center rounded-xl transition"
              title="切换主题"
              data-tooltip="切换主题"
            >
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((value) => !value)}
              className="home-control focus-ring inline-flex h-11 w-11 items-center justify-center rounded-xl transition"
              title={mobileMenuOpen ? '收起菜单' : '更多操作'}
              data-tooltip={mobileMenuOpen ? '收起菜单' : '更多操作'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            {mobileMenuOpen ? (
              <div className="home-menu absolute right-0 top-12 z-20 w-52 overflow-hidden rounded-lg p-1.5 text-sm">
                <button
                  type="button"
                  onClick={toggleAllAndCloseMenu}
                  className="home-menu-item focus-ring flex w-full items-center gap-3 rounded-md px-3 py-2 text-left"
                >
                  <LayoutGrid size={17} />
                  {allFilteredCollapsed ? '展开全部分类' : '紧凑显示全部分类'}
                </button>
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="home-menu-item focus-ring flex items-center gap-3 rounded-md px-3 py-2"
                >
                  <Shield size={17} />
                  后台管理
                </Link>
                <button
                  type="button"
                  onClick={onLogout}
                  className="home-menu-item home-menu-danger focus-ring flex w-full items-center gap-3 rounded-md px-3 py-2 text-left"
                >
                  <LogOut size={17} />
                  退出登录
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="relative z-10 grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_330px]">
          <label className="home-field flex min-h-14 min-w-0 items-center gap-3 rounded-2xl px-4 transition">
            <Search size={22} className="home-muted shrink-0" />
            <input
              value={keyword}
              onChange={(event) => onKeywordChange(event.target.value)}
              placeholder="搜索系统、描述或标签"
              className="min-w-0 flex-1 bg-transparent text-base font-medium outline-none placeholder:text-slate-400"
            />
          </label>
          <div className="grid min-w-0 grid-cols-3 gap-2">
            <div className="home-stat min-w-0 rounded-xl px-2 py-2.5 text-center sm:rounded-2xl sm:px-3 sm:py-3">
              <div className="text-lg font-bold leading-none sm:text-2xl">{counts.total}</div>
              <div className="home-muted mt-1 text-[11px] font-semibold sm:text-xs">入口</div>
            </div>
            <div className="home-stat min-w-0 rounded-xl px-2 py-2.5 text-center sm:rounded-2xl sm:px-3 sm:py-3">
              <div className="text-lg font-bold leading-none text-emerald-700 dark:text-emerald-300 sm:text-2xl">
                {counts.healthy}
              </div>
              <div className="home-muted mt-1 text-[11px] font-semibold sm:text-xs">正常</div>
            </div>
            <button
              type="button"
              onClick={onFocusHealthIssue}
              disabled={attentionCount === 0}
              className="home-stat home-stat-attention focus-ring min-w-0 rounded-xl px-2 py-2.5 text-center transition disabled:cursor-default sm:rounded-2xl sm:px-3 sm:py-3"
              title={`异常 ${counts.unhealthy} 个，访问受限 ${counts.restricted} 个`}
              data-tooltip={`异常 ${counts.unhealthy} 个，访问受限 ${counts.restricted} 个`}
            >
              <div
                className={`text-lg font-bold leading-none sm:text-2xl ${
                  counts.unhealthy > 0
                    ? 'text-red-600 dark:text-red-300'
                    : counts.restricted > 0
                      ? 'text-amber-700 dark:text-amber-300'
                      : 'home-muted'
                }`}
              >
                {attentionCount}
              </div>
              <div className="home-muted mt-1 text-[11px] font-semibold sm:text-xs">需关注</div>
            </button>
          </div>
        </div>
        {categories.length > 0 ? (
          <nav
            aria-label="分类快捷定位"
            className="relative z-10 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0"
          >
            <div className="flex min-w-max gap-2 sm:min-w-0 sm:flex-wrap">
              {categories.map((category) => {
                const active = activeCategoryId === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => onCategorySelect(category.id)}
                    className={`home-shortcut focus-ring inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-semibold transition ${
                      active ? 'home-shortcut-active' : ''
                    }`}
                    title={`定位到${category.name}`}
                    data-tooltip={`定位到${category.name}`}
                    aria-current={active ? 'true' : undefined}
                  >
                    <CategoryIcon icon={category.icon} name={category.name} size={15} />
                    <span className="max-w-28 truncate sm:max-w-40">{category.name}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-xs ${
                        active ? 'bg-black/5' : 'bg-slate-900/5 dark:bg-white/10'
                      }`}
                    >
                      {category.apps.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
