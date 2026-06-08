import { LoaderCircle, RefreshCw } from 'lucide-react';
import type { AppMetadataPreview as Metadata } from '../api/admin';
import { getAppDisplayName, isFallbackName } from '../lib/appName';
import AppIcon from './AppIcon';

type Props = {
  url: string;
  name: string;
  icon: string;
  iconUrl: string;
  metadata: Metadata | null;
  loading: boolean;
  error: string;
  validUrl: boolean;
  onRetry: () => void;
};

export default function AppMetadataPreview({
  url,
  name,
  icon,
  iconUrl,
  metadata,
  loading,
  error,
  validUrl,
  onRetry,
}: Props) {
  if (!validUrl) {
    return null;
  }

  const app = {
    name,
    url,
    icon,
    iconUrl,
    resolvedName: metadata?.resolvedName,
    resolvedIconUrl: metadata?.resolvedIconUrl,
  };
  const manualName = Boolean(name.trim() && !isFallbackName(name, url));
  const manualIcon = Boolean(iconUrl.trim() || (icon.trim() && icon.trim() !== '⌁'));

  return (
    <div
      className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/50"
      aria-live="polite"
    >
      <AppIcon app={app} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate font-semibold text-ink dark:text-white">{getAppDisplayName(app)}</p>
          <span className="shrink-0 text-xs font-medium text-slate-400">
            {manualName ? '手动名称' : metadata?.resolvedName ? '自动名称' : ''}
          </span>
        </div>
        <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          {loading ? (
            <>
              <LoaderCircle size={13} className="animate-spin" />
              <span>正在读取站点信息</span>
            </>
          ) : error ? (
            <>
              <span className="truncate text-amber-700 dark:text-amber-300">未获取到站点信息</span>
              <button
                type="button"
                onClick={onRetry}
                className="focus-ring inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md hover:bg-slate-200 dark:hover:bg-slate-800"
                title="重新读取"
                data-tooltip="重新读取"
              >
                <RefreshCw size={13} />
              </button>
            </>
          ) : metadata ? (
            <span>
              {manualIcon ? '使用手动图标' : metadata.resolvedIconUrl ? '已获取在线图标' : '未找到在线图标'}
              {metadata.resolvedDescription ? ' · 已获取简介' : ''}
            </span>
          ) : (
            <span>等待读取站点信息</span>
          )}
        </div>
        {metadata?.resolvedDescription ? (
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {metadata.resolvedDescription}
          </p>
        ) : null}
      </div>
    </div>
  );
}
