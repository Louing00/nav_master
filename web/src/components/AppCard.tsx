import { ExternalLink } from 'lucide-react';
import type { NavApp } from '../types/app';

type Props = {
  app: NavApp;
};

export default function AppCard({ app }: Props) {
  return (
    <article className="surface group grid min-h-44 grid-rows-[1fr_auto] rounded-lg p-5 transition hover:-translate-y-1 hover:border-mint/40 hover:shadow-lg">
      <a
        href={app.url}
        target={app.openInNewTab ? '_blank' : '_self'}
        rel="noreferrer"
        className="focus-ring rounded-md"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-mint/12 text-2xl text-mint dark:bg-mint/20">
            {app.icon || '⌁'}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-ink dark:text-white">{app.name}</h3>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{app.description}</p>
          </div>
        </div>
      </a>

      <div className="mt-5 flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-wrap gap-2">
          {app.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-ember/10 px-2.5 py-1 text-xs font-medium text-ember dark:bg-ember/20">
              {tag}
            </span>
          ))}
        </div>
        <div className="flex shrink-0 gap-2">
          <a
            href={app.url}
            target={app.openInNewTab ? '_blank' : '_self'}
            rel="noreferrer"
            className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-md bg-ink text-white transition hover:bg-mint dark:bg-white dark:text-ink"
            title="打开系统"
          >
            <ExternalLink size={18} />
          </a>
        </div>
      </div>
    </article>
  );
}
