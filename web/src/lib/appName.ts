import type { NavApp } from '../types/app';

function fallbackNameCandidates(url: string) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const hostWithoutWww = hostname.replace(/^www\./, '');
    const href = parsed.href.replace(/\/+$/, '');
    return [...new Set([hostname, hostWithoutWww, parsed.origin.toLowerCase(), href.toLowerCase()])];
  } catch {
    return [];
  }
}

export function isFallbackName(name: string, url: string) {
  const normalized = name.trim().toLowerCase().replace(/\/+$/, '');
  return fallbackNameCandidates(url).some((candidate) => candidate.trim().toLowerCase().replace(/\/+$/, '') === normalized);
}

export function appNeedsResolvedName(app: Pick<NavApp, 'id' | 'name' | 'resolvedName' | 'url'>) {
  const manualName = app.name?.trim();
  return !app.resolvedName?.trim() && (!manualName || isFallbackName(manualName, app.url));
}

export function appNeedsResolvedMetadata(
  app: Pick<NavApp, 'id' | 'name' | 'resolvedName' | 'url' | 'description' | 'resolvedDescription'>,
) {
  return appNeedsResolvedName(app) || (!app.description?.trim() && !app.resolvedDescription?.trim());
}

export function getAppDisplayName(app: Pick<NavApp, 'name' | 'resolvedName' | 'url'>) {
  const manualName = app.name?.trim();
  if (manualName && !isFallbackName(manualName, app.url)) {
    return manualName;
  }

  const resolvedName = app.resolvedName?.trim();
  if (resolvedName) {
    return resolvedName;
  }

  if (manualName) {
    return manualName;
  }

  try {
    return new URL(app.url).hostname.replace(/^www\./, '');
  } catch {
    return '未命名入口';
  }
}

export function getAppDisplayDescription(app: Pick<NavApp, 'description' | 'resolvedDescription'>) {
  return app.description?.trim() || app.resolvedDescription?.trim() || '';
}
