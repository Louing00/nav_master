import { ArrowLeft, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchAppDetail } from '../api/public';
import type { AppDetail } from '../types/app';

export default function SystemDetail() {
  const { id } = useParams();
  const [app, setApp] = useState<AppDetail | null>(null);

  useEffect(() => {
    if (id) {
      fetchAppDetail(id).then(setApp);
    }
  }, [id]);

  if (!app) {
    return <div className="min-h-screen bg-[#f6f3ec] p-8 text-ink dark:bg-slate-950 dark:text-white">加载中...</div>;
  }

  return (
    <main className="min-h-screen bg-[#f6f3ec] text-ink dark:bg-slate-950 dark:text-white">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link to="/" className="focus-ring inline-flex items-center gap-2 rounded-md text-sm text-slate-600 hover:text-mint dark:text-slate-300">
          <ArrowLeft size={18} />
          返回导航
        </Link>

        <section className="mt-8 border-b border-black/10 pb-8 dark:border-white/10">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-mint/14 text-4xl text-mint">{app.icon || '⌁'}</div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{app.category?.name || '系统详情'}</p>
                  <h1 className="mt-1 text-3xl font-semibold">{app.name}</h1>
                </div>
              </div>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">{app.description}</p>
            </div>
            <a
              href={app.url}
              target={app.openInNewTab ? '_blank' : '_self'}
              rel="noreferrer"
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-mint dark:bg-white dark:text-ink"
            >
              <ExternalLink size={18} />
              打开系统
            </a>
          </div>
        </section>

        <section className="py-8">
          <h2 className="text-xl font-semibold">功能索引</h2>
          <div className="mt-4 grid gap-4">
            {app.features.map((feature) => (
              <a
                key={feature.id}
                href={`${app.url}#${feature.anchor}`}
                target={app.openInNewTab ? '_blank' : '_self'}
                rel="noreferrer"
                className="surface rounded-lg p-5 transition hover:-translate-y-0.5 hover:border-mint/40"
              >
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <ExternalLink size={18} className="shrink-0 text-mint" />
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{feature.description}</p>
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
