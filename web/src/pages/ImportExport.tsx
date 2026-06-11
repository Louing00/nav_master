import { Download, FileJson2, Upload } from 'lucide-react';
import { ChangeEvent, useState } from 'react';
import { exportData, importData } from '../api/admin';
import { getErrorMessage } from '../api/client';
import AdminPageHeader from '../components/AdminPageHeader';

export default function ImportExport() {
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [message, setMessage] = useState('');

  async function handleExport() {
    const data = await exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `atlasgate-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      await importData(mode, JSON.parse(text));
      setMessage('导入完成');
    } catch (err) {
      setMessage(getErrorMessage(err));
    } finally {
      event.target.value = '';
    }
  }

  return (
    <section className="admin-panel max-w-4xl overflow-hidden rounded-lg">
      <AdminPageHeader icon={FileJson2} title="导入导出" description="备份导航数据，或从 JSON 文件恢复应用与分类" />
      <div className="grid gap-5 p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <button onClick={handleExport} className="admin-setting-card focus-ring flex items-center gap-4 text-left transition hover:border-[var(--admin-accent-border)]">
            <span className="admin-icon-tile"><Download size={19} strokeWidth={1.8} /></span>
            <span>
              <span className="block font-semibold text-[var(--admin-text)]">导出 JSON</span>
              <span className="mt-1 block text-sm font-normal text-[var(--admin-muted)]">下载当前账号的完整导航备份</span>
            </span>
          </button>
          <label className="admin-setting-card focus-ring flex cursor-pointer items-center gap-4 text-left transition hover:border-[var(--admin-accent-border)]">
            <span className="admin-icon-tile"><Upload size={19} strokeWidth={1.8} /></span>
            <span>
              <span className="block font-semibold text-[var(--admin-text)]">导入 JSON</span>
              <span className="mt-1 block text-sm font-normal text-[var(--admin-muted)]">选择 AtlasGate 导出的备份文件</span>
            </span>
            <input type="file" accept="application/json" className="hidden" onChange={handleImport} />
          </label>
        </div>
        <div>
          <p className="admin-label mb-2">导入方式</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className={`admin-choice ${mode === 'merge' ? 'border-[var(--admin-accent-border)] bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]' : ''}`}>
              <input type="radio" checked={mode === 'merge'} onChange={() => setMode('merge')} />
              <span><strong className="block font-semibold">追加或更新</strong><span className="text-xs opacity-80">保留现有数据，同名内容进行更新</span></span>
            </label>
            <label className={`admin-choice ${mode === 'replace' ? 'border-[var(--admin-accent-border)] bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]' : ''}`}>
              <input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} />
              <span><strong className="block font-semibold">覆盖导入</strong><span className="text-xs opacity-80">使用备份内容替换当前导航数据</span></span>
            </label>
          </div>
        </div>
        {message && <p className="rounded-md bg-[var(--admin-secondary)] px-3 py-2 text-sm text-[var(--admin-muted)]">{message}</p>}
      </div>
    </section>
  );
}
