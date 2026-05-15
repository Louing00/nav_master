import { useEffect, useMemo, useState } from 'react';
import type { NavApp } from '../types/app';

type Props = {
  app: Pick<NavApp, 'icon' | 'name' | 'resolvedIconUrl'>;
  compact?: boolean;
};

const DEFAULT_ICON = '⌁';

export default function AppIcon({ app, compact = false }: Props) {
  const [remoteIconFailed, setRemoteIconFailed] = useState(false);
  const rawIcon = app.icon?.trim();
  const textIcon = rawIcon && rawIcon !== DEFAULT_ICON ? rawIcon : '';
  const remoteIconUrl = useMemo(() => app.resolvedIconUrl?.trim() || '', [app.resolvedIconUrl]);
  const showRemoteIcon = Boolean(remoteIconUrl && !remoteIconFailed);

  useEffect(() => {
    setRemoteIconFailed(false);
  }, [remoteIconUrl]);

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-black/10 bg-white/85 text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:border-white/10 dark:bg-white/10 dark:text-slate-100 ${
        compact ? 'h-9 w-9 text-xl' : 'h-10 w-10 text-xl sm:h-12 sm:w-12 sm:text-2xl'
      }`}
      aria-hidden="true"
    >
      {showRemoteIcon ? (
        <img
          src={remoteIconUrl}
          alt=""
          className={compact ? 'h-5 w-5 object-contain' : 'h-6 w-6 object-contain sm:h-7 sm:w-7'}
          onError={() => setRemoteIconFailed(true)}
        />
      ) : (
        <span className="leading-none">{textIcon || DEFAULT_ICON}</span>
      )}
    </span>
  );
}
