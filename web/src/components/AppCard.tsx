import { ExternalLink } from 'lucide-react';
import AppIcon from './AppIcon';
import HealthBadge from './HealthBadge';
import type { NavApp } from '../types/app';
import { getAppDisplayDescription, getAppDisplayName } from '../lib/appName';

type Props = {
  app: NavApp;
  compact?: boolean;
  sortMode?: boolean;
};

export default function AppCard({ app, compact = false, sortMode = false }: Props) {
  const sortClassName = sortMode ? 'cursor-grab active:cursor-grabbing' : '';
  const displayName = getAppDisplayName(app);
  const displayDescription = getAppDisplayDescription(app);

  if (compact) {
    return (
      <a
        href={app.url}
        target={app.openInNewTab ? '_blank' : '_self'}
        rel="noreferrer"
        className={`home-card focus-ring group flex min-h-14 items-center gap-3 overflow-hidden rounded-xl px-3 py-2.5 transition hover:-translate-y-0.5 ${sortClassName}`}
        title={displayDescription || '打开系统'}
        data-tooltip={displayDescription || undefined}
        data-tooltip-variant={displayDescription ? 'description' : undefined}
      >
        <AppIcon app={app} compact />
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold sm:text-base">{displayName}</h3>
        <HealthBadge app={app} compact />
      </a>
    );
  }

  return (
    <article className={`home-card group h-full min-h-36 overflow-hidden rounded-2xl transition hover:-translate-y-0.5 ${sortClassName}`}>
      <a
        href={app.url}
        target={app.openInNewTab ? '_blank' : '_self'}
        rel="noreferrer"
        className="focus-ring flex h-full min-w-0 flex-col rounded-2xl p-3.5 sm:p-4"
        data-tooltip={displayDescription || undefined}
        data-tooltip-variant={displayDescription ? 'description' : undefined}
      >
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <AppIcon app={app} />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h3 className="truncate text-base font-semibold sm:text-lg">{displayName}</h3>
              <HealthBadge app={app} quiet />
            </div>
            <p className="home-muted mt-1 line-clamp-1 max-w-full text-sm font-medium leading-6 [overflow-wrap:anywhere] sm:mt-2 sm:line-clamp-2">
              {displayDescription}
            </p>
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div className="flex min-w-0 flex-wrap gap-1.5 overflow-hidden sm:gap-2">
            {app.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="home-tag max-w-full truncate rounded-full px-2.5 py-1 text-xs font-semibold"
              >
                {tag}
              </span>
            ))}
          </div>
          <span
            className="home-open-action inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition"
            data-tooltip="打开系统"
          >
            <ExternalLink size={18} />
          </span>
        </div>
      </a>
    </article>
  );
}
