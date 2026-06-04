import type { NavApp } from '../types/app';

export function getAppDisplayName(app: Pick<NavApp, 'name' | 'resolvedName' | 'url'>) {
  const manualName = app.name?.trim();
  if (manualName) {
    return manualName;
  }

  const resolvedName = app.resolvedName?.trim();
  if (resolvedName) {
    return resolvedName;
  }

  try {
    return new URL(app.url).hostname.replace(/^www\./, '');
  } catch {
    return '未命名入口';
  }
}
