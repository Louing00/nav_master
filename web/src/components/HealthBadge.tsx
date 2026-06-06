import type { NavApp } from '../types/app';

type Props = {
  app: Pick<NavApp, 'healthStatus' | 'healthCheckedAt' | 'healthLatencyMs' | 'healthError' | 'healthEnabled'>;
  compact?: boolean;
  quiet?: boolean;
};

const meta = {
  healthy: {
    label: '正常',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200',
    quietClassName: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  restricted: {
    label: '访问受限',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
    quietClassName: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900',
    dot: 'bg-amber-500',
  },
  unhealthy: {
    label: '异常',
    className: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200',
    quietClassName: 'bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-200 dark:ring-red-900',
    dot: 'bg-red-500',
  },
  unknown: {
    label: '未检查',
    className: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300',
    quietClassName: 'text-slate-500 dark:text-slate-400',
    dot: 'bg-slate-400',
  },
  disabled: {
    label: '不检查',
    className: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300',
    quietClassName: 'text-slate-500 dark:text-slate-400',
    dot: 'bg-slate-400',
  },
};

function formatTooltip(app: Props['app'], label: string) {
  const lines = [`健康状态：${label}`];
  if (app.healthCheckedAt) {
    lines.push(`检查时间：${new Date(app.healthCheckedAt).toLocaleString()}`);
  }
  if (app.healthLatencyMs !== undefined && app.healthLatencyMs !== null) {
    lines.push(`响应耗时：${app.healthLatencyMs}ms`);
  }
  if (app.healthError) {
    lines.push(`错误：${app.healthError}`);
  }
  return lines.join(' ｜ ');
}

export default function HealthBadge({ app, compact = false, quiet = false }: Props) {
  const rawStatus = app.healthEnabled === false ? 'disabled' : app.healthStatus || 'unknown';
  const status = rawStatus in meta ? rawStatus : 'unknown';
  const item = meta[status];
  const tooltip = formatTooltip(app, item.label);

  if (compact) {
    return (
      <span
        className={`inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${item.dot}`}
        title={tooltip}
        data-tooltip={tooltip}
      />
    );
  }

  if (quiet) {
    const needsEmphasis = status === 'unhealthy' || status === 'restricted';

    return (
      <span
        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full text-xs font-semibold ${
          needsEmphasis ? `px-2 py-0.5 ${item.quietClassName}` : item.quietClassName
        }`}
        title={tooltip}
        data-tooltip={tooltip}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${item.dot}`} />
        {item.label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${item.className}`}
      title={tooltip}
      data-tooltip={tooltip}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${item.dot}`} />
      {item.label}
    </span>
  );
}
