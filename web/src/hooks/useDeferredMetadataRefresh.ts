import { useEffect, useRef } from 'react';
import { appNeedsResolvedMetadata } from '../lib/appName';
import type { NavApp } from '../types/app';

export function useDeferredMetadataRefresh(apps: NavApp[], refresh: () => void | Promise<void>) {
  const attempts = useRef<Set<string>>(new Set());
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    const hasFreshPendingApp = apps.some((app) => {
      if (!appNeedsResolvedMetadata(app)) {
        return false;
      }

      const key = `${app.id}:${app.url}:${app.name || ''}:${app.description || ''}`;
      if (attempts.current.has(key)) {
        return false;
      }
      attempts.current.add(key);
      return true;
    });
    if (!hasFreshPendingApp) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      void refreshRef.current();
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [apps]);
}
