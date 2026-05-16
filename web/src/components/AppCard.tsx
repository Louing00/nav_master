import { ExternalLink } from 'lucide-react';
import AppIcon from './AppIcon';
import HealthBadge from './HealthBadge';
import type { NavApp } from '../types/app';

type Props = {
  app: NavApp;
  compact?: boolean;
  sortMode?: boolean;
};

export default function AppCard({ app, compact = false, sortMode = false }: Props) {
  const sortClassName = sortMode ? 'cursor-grab active:cursor-grabbing' : '';

  if (compact) {
    return (
      <a
        href={app.url}
        target={app.openInNewTab ? '_blank' : '_self'}
        rel="noreferrer"
        className={`surface focus-ring group flex min-h-14 items-center gap-3 overflow-hidden rounded-lg px-3 py-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-mint/30 hover:bg-white hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] dark:hover:bg-slate-900 ${sortClassName}`}
        title="打开系统"
      >
        <AppIcon app={app} compact />
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-ink dark:text-white sm:text-base">{app.name}</h3>
        <HealthBadge app={app} compact />
      </a>
    );
  }

  return (
    <article className={`surface group h-full overflow-hidden rounded-lg shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-mint/30 hover:bg-white hover:shadow-[0_12px_36px_rgba(15,23,42,0.08)] dark:hover:bg-slate-900/90 ${sortClassName}`}>
      <a
        href={app.url}
        target={app.openInNewTab ? '_blank' : '_self'}
        rel="noreferrer"
        className="focus-ring flex h-full min-w-0 flex-col rounded-lg p-3.5 sm:p-5"
      >
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <AppIcon app={app} />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h3 className="truncate text-base font-semibold text-ink dark:text-white sm:text-lg">{app.name}</h3>
              <HealthBadge app={app} quiet />
            </div>
            <p className="mt-1 line-clamp-1 max-w-full text-sm leading-6 text-slate-600 [overflow-wrap:anywhere] dark:text-slate-300 sm:mt-2 sm:line-clamp-2">
              {app.description}
            </p>
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-3 sm:pt-5">
          <div className="flex min-w-0 flex-wrap gap-1.5 overflow-hidden sm:gap-2">
            {app.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="max-w-full truncate rounded-full bg-ember/10 px-2.5 py-1 text-xs font-semibold text-ember dark:bg-ember/15 dark:text-orange-200"
              >
                {tag}
              </span>
            ))}
          </div>
          <span
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white/70 text-slate-600 transition group-hover:border-mint/40 group-hover:text-mint sm:opacity-70 sm:group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300"
            data-tooltip="打开系统"
          >
            <ExternalLink size={18} />
          </span>
        </div>
      </a>
    </article>
  );
}
