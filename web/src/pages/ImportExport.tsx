import { Download, Upload } from 'lucide-react';
import { ChangeEvent, useState } from 'react';
import { exportData, importData } from '../api/admin';
import { getErrorMessage } from '../api/client';

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
    <section className="surface max-w-3xl rounded-lg p-5">
      <h1 className="text-xl font-semibold">导入导出</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <button onClick={handleExport} className="focus-ring flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 font-semibold text-white hover:bg-mint dark:bg-white dark:text-ink">
          <Download size={18} />
          导出 JSON
        </button>
        <label className="focus-ring flex cursor-pointer items-center justify-center gap-2 rounded-md bg-mint px-4 py-3 font-semibold text-white hover:bg-ink">
          <Upload size={18} />
          导入 JSON
          <input type="file" accept="application/json" className="hidden" onChange={handleImport} />
        </label>
      </div>
      <div className="mt-5 flex gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="radio" checked={mode === 'merge'} onChange={() => setMode('merge')} />
          追加/更新
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" checked={mode === 'replace'} onChange={() => setMode('replace')} />
          覆盖导入
        </label>
      </div>
      {message && <p className="mt-4 rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">{message}</p>}
    </section>
  );
}
