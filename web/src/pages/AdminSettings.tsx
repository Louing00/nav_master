import { Activity, GripVertical, Image, Save } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { fetchSettings, updateSettings } from '../api/admin';
import type { SiteSettings } from '../types/setting';

export default function AdminSettings() {
  const [settings, setSettings] = useState<SiteSettings>({});
  const [saved, setSaved] = useState(false);
  const autoHealthEnabled = settings.health_auto_check_enabled !== 'false';
  const homeQuickSortEnabled = settings.home_quick_sort_enabled === 'true';
  const iconAutoResolveOnChangeEnabled =
    settings.icon_auto_resolve_on_change !== undefined
      ? settings.icon_auto_resolve_on_change !== 'false'
      : settings.icon_resolve_mode !== 'server_only';

  useEffect(() => {
    fetchSettings().then(setSettings);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSettings(await updateSettings(settings));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <form onSubmit={submit} className="surface max-w-3xl rounded-lg p-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">站点设置</h1>
        <button className="focus-ring inline-flex items-center gap-2 rounded-md bg-mint px-3 py-2 text-sm font-semibold text-white" type="submit">
          <Save size={16} />
          保存
        </button>
      </div>
      <div className="mt-5 grid gap-4">
        <label>
          <span className="admin-label">站点标题</span>
          <input className="admin-input mt-1" value={settings.site_title || ''} onChange={(event) => setSettings({ ...settings, site_title: event.target.value })} />
        </label>
        <label>
          <span className="admin-label">副标题</span>
          <input className="admin-input mt-1" value={settings.site_subtitle || ''} onChange={(event) => setSettings({ ...settings, site_subtitle: event.target.value })} />
        </label>
        <label>
          <span className="admin-label">品牌缩写</span>
          <input
            className="admin-input mt-1"
            value={settings.logo || ''}
            onChange={(event) => setSettings({ ...settings, logo: event.target.value })}
            maxLength={2}
            placeholder="最多 2 个字母、数字或汉字"
          />
        </label>
        <label>
          <span className="admin-label">页脚文本</span>
          <input className="admin-input mt-1" value={settings.footer_text || ''} onChange={(event) => setSettings({ ...settings, footer_text: event.target.value })} />
        </label>
        <div className="rounded-lg border border-black/10 bg-[#f6f3ec]/70 p-4 dark:border-white/10 dark:bg-slate-950/50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mint/10 text-mint dark:bg-mint/20">
                <Image size={19} strokeWidth={1.8} />
              </span>
              <div>
                <h2 className="font-semibold">新增时自动获取图标</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">开启后，仅在新增应用或修改 URL 时尝试获取一次图标；首页刷新不会自动改图标。</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                setSettings({
                  ...settings,
                  icon_auto_resolve_on_change: iconAutoResolveOnChangeEnabled ? 'false' : 'true',
                })
              }
              className={`focus-ring inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition ${
                iconAutoResolveOnChangeEnabled ? 'bg-mint' : 'bg-slate-300 dark:bg-slate-700'
              }`}
              title={iconAutoResolveOnChangeEnabled ? '关闭新增时自动获取图标' : '开启新增时自动获取图标'}
              data-tooltip={iconAutoResolveOnChangeEnabled ? '关闭新增时自动获取图标' : '开启新增时自动获取图标'}
              aria-pressed={iconAutoResolveOnChangeEnabled}
            >
              <span className="sr-only">{iconAutoResolveOnChangeEnabled ? '已开启' : '已关闭'}</span>
              <span className={`h-6 w-6 rounded-full bg-white shadow transition ${iconAutoResolveOnChangeEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
        <div className="rounded-lg border border-black/10 bg-[#f6f3ec]/70 p-4 dark:border-white/10 dark:bg-slate-950/50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mint/10 text-mint dark:bg-mint/20">
                <GripVertical size={19} strokeWidth={1.8} />
              </span>
              <div>
                <h2 className="font-semibold">首页快捷排序</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">开启后可在首页同一分类内拖动卡片调整入口顺序。</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, home_quick_sort_enabled: homeQuickSortEnabled ? 'false' : 'true' })}
              className={`focus-ring inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition ${
                homeQuickSortEnabled ? 'bg-mint' : 'bg-slate-300 dark:bg-slate-700'
              }`}
              title={homeQuickSortEnabled ? '关闭首页快捷排序' : '开启首页快捷排序'}
              data-tooltip={homeQuickSortEnabled ? '关闭首页快捷排序' : '开启首页快捷排序'}
              aria-pressed={homeQuickSortEnabled}
            >
              <span className="sr-only">{homeQuickSortEnabled ? '已开启' : '已关闭'}</span>
              <span className={`h-6 w-6 rounded-full bg-white shadow transition ${homeQuickSortEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
        <div className="rounded-lg border border-black/10 bg-[#f6f3ec]/70 p-4 dark:border-white/10 dark:bg-slate-950/50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-mint/10 text-mint dark:bg-mint/20">
                <Activity size={19} strokeWidth={1.8} />
              </span>
              <div>
                <h2 className="font-semibold">自动健康检查</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">后台按设置间隔检查已启用健康检查的应用。</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, health_auto_check_enabled: autoHealthEnabled ? 'false' : 'true' })}
              className={`focus-ring inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition ${
                autoHealthEnabled ? 'bg-mint' : 'bg-slate-300 dark:bg-slate-700'
              }`}
              title={autoHealthEnabled ? '关闭自动检查' : '开启自动检查'}
              data-tooltip={autoHealthEnabled ? '关闭自动检查' : '开启自动检查'}
              aria-pressed={autoHealthEnabled}
            >
              <span className="sr-only">{autoHealthEnabled ? '已开启' : '已关闭'}</span>
              <span className={`h-6 w-6 rounded-full bg-white shadow transition ${autoHealthEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          <label className="mt-4 block">
            <span className="admin-label">检查间隔（分钟）</span>
            <input
              className="admin-input mt-1 sm:max-w-xs"
              type="number"
              min={1}
              max={1440}
              step={1}
              disabled={!autoHealthEnabled}
              value={settings.health_auto_check_interval_minutes || '30'}
              onChange={(event) => setSettings({ ...settings, health_auto_check_interval_minutes: event.target.value })}
            />
          </label>
          {settings.health_auto_check_last_at && (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              最近自动检查：{new Date(settings.health_auto_check_last_at).toLocaleString()}
            </p>
          )}
        </div>
        {saved && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">已保存</p>}
      </div>
    </form>
  );
}
