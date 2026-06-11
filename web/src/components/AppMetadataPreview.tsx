import { LoaderCircle, RefreshCw } from 'lucide-react';
import type { AppMetadataPreview as Metadata } from '../api/admin';
import { getAppDisplayName, isFallbackName } from '../lib/appName';
import AppIcon, { isUsableTextIcon } from './AppIcon';

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
  const manualIcon = Boolean(iconUrl.trim() || isUsableTextIcon(icon));

  return (
    <div
      className="flex min-w-0 items-center gap-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-secondary)] p-3"
      aria-live="polite"
    >
      <AppIcon app={app} />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate font-semibold text-[var(--admin-text)]">{getAppDisplayName(app)}</p>
          <span className="shrink-0 text-xs font-medium text-[var(--admin-faint)]">
            {manualName ? '手动名称' : metadata?.resolvedName ? '自动名称' : ''}
          </span>
        </div>
        <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-[var(--admin-muted)]">
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
                className="admin-icon-button h-6 w-6"
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
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--admin-muted)]">
            {metadata.resolvedDescription}
          </p>
        ) : null}
      </div>
    </div>
  );
}
