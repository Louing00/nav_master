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

function isFallbackName(name: string, url: string) {
  const normalized = name.trim().toLowerCase().replace(/\/+$/, '');
  return fallbackNameCandidates(url).some((candidate) => candidate.trim().toLowerCase().replace(/\/+$/, '') === normalized);
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
