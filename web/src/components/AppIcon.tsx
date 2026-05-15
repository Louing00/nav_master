import { useEffect, useMemo, useState } from 'react';
import type { NavApp } from '../types/app';

type Props = {
  app: Pick<NavApp, 'icon' | 'name' | 'url'>;
  compact?: boolean;
};

const DEFAULT_ICON = '⌁';
const ICON_PATHS = [
  '/favicon.ico',
  '/favicon.svg',
  '/favicon.png',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/apple-touch-icon.png',
  '/apple-touch-icon-precomposed.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/mstile-150x150.png',
  '/icon.svg',
  '/icon.png',
  '/logo.svg',
  '/logo.png',
];

function resolveIconCandidates(url: string) {
  try {
    const origin = new URL(url).origin;
    return ICON_PATHS.map((path) => new URL(path, origin).href);
  } catch {
    return [];
  }
}

export default function AppIcon({ app, compact = false }: Props) {
  const [iconCandidateIndex, setIconCandidateIndex] = useState(0);
  const rawIcon = app.icon?.trim();
  const textIcon = rawIcon && rawIcon !== DEFAULT_ICON ? rawIcon : '';
  const iconCandidates = useMemo(() => resolveIconCandidates(app.url), [app.url]);
  const iconCandidate = iconCandidates[iconCandidateIndex];
  const showRemoteIcon = !textIcon && Boolean(iconCandidate);

  useEffect(() => {
    setIconCandidateIndex(0);
  }, [app.url, textIcon]);

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-black/10 bg-white/85 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:border-white/10 dark:bg-white/10 dark:text-slate-100 ${
        compact ? 'h-9 w-9 text-xl' : 'h-10 w-10 text-xl sm:h-12 sm:w-12 sm:text-2xl'
      }`}
      aria-hidden="true"
    >
      {showRemoteIcon ? (
        <img
          src={iconCandidate}
          alt=""
          className={compact ? 'h-5 w-5 object-contain' : 'h-6 w-6 object-contain sm:h-7 sm:w-7'}
          onError={() => setIconCandidateIndex((index) => index + 1)}
        />
      ) : (
        <span className="leading-none">{textIcon || DEFAULT_ICON}</span>
      )}
    </span>
  );
}
