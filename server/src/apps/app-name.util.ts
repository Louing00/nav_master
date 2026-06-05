const NAME_RESOLVE_RETRY_MS = 10 * 60 * 1000;
const nameResolveAttempts = new Map<string, number>();

export function normalizeManualName(name?: string | null) {
  return name?.trim().slice(0, 80) || '';
}

function normalizeComparableName(value: string) {
  return value.trim().toLowerCase().replace(/\/+$/, '');
}

export function fallbackAppNameCandidates(url: string) {
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

export function isFallbackAppName(name: string | null | undefined, url: string) {
  const normalized = normalizeComparableName(normalizeManualName(name));
  if (!normalized) {
    return false;
  }
  return fallbackAppNameCandidates(url).some((candidate) => normalizeComparableName(candidate) === normalized);
}

export function hasManualAppName(name: string | null | undefined, url: string) {
  const normalized = normalizeManualName(name);
  return Boolean(normalized && !isFallbackAppName(normalized, url));
}

export function shouldRetryAppNameResolve(userId: number, id: number, url: string) {
  const key = `${userId}:${id}:${url}`;
  const now = Date.now();
  const last = nameResolveAttempts.get(key) || 0;
  if (now - last < NAME_RESOLVE_RETRY_MS) {
    return false;
  }
  nameResolveAttempts.set(key, now);
  return true;
}
