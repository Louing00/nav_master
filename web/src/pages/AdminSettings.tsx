import { Save } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { fetchSettings, updateSettings } from '../api/admin';
import type { SiteSettings } from '../types/setting';

export default function AdminSettings() {
  const [settings, setSettings] = useState<SiteSettings>({});
  const [saved, setSaved] = useState(false);

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
          <span className="admin-label">Logo</span>
          <input className="admin-input mt-1" value={settings.logo || ''} onChange={(event) => setSettings({ ...settings, logo: event.target.value })} />
        </label>
        <label>
          <span className="admin-label">页脚文本</span>
          <input className="admin-input mt-1" value={settings.footer_text || ''} onChange={(event) => setSettings({ ...settings, footer_text: event.target.value })} />
        </label>
        {saved && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">已保存</p>}
      </div>
    </form>
  );
}
