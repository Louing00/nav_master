const ICON_PATHS = [
  '/favicon.ico',
  '/favicon.svg',
  '/favicon.png',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/assets/img/favicon.png',
  '/assets/favicon.png',
  '/assets/images/favicon.png',
  '/static/favicon.ico',
  '/static/favicon.png',
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

const KNOWN_ICON_CANDIDATES: Record<string, string[]> = {
  'chat.deepseek.com': ['https://fe-static.deepseek.com/chat/favicon.svg', 'https://cdn.deepseek.com/chat/icon.png'],
  'mail.google.com': ['https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico', 'https://mail.google.com/favicon.ico'],
};

const resolutionCache = new Map<string, Promise<string | null>>();

function unique(values: string[]) {
  return [...new Set(values)];
}

export function getBrowserIconCandidates(url: string) {
  try {
    const parsed = new URL(url);
    const knownCandidates = KNOWN_ICON_CANDIDATES[parsed.hostname.toLowerCase()] || [];
    const commonCandidates = ICON_PATHS.map((path) => new URL(path, parsed.origin).href);
    return unique([...knownCandidates, ...commonCandidates]);
  } catch {
    return [];
  }
}

function loadImage(url: string, timeoutMs = 2500) {
  return new Promise<string | null>((resolve) => {
    const image = new Image();
    let settled = false;

    const finish = (value: string | null) => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timeoutId);
      image.onload = null;
      image.onerror = null;
      resolve(value);
    };

    const timeoutId = window.setTimeout(() => finish(null), timeoutMs);

    image.decoding = 'async';
    image.referrerPolicy = 'no-referrer';
    image.onload = () => finish(url);
    image.onerror = () => finish(null);
    image.src = url;
  });
}

export function resolveBrowserIcon(url: string) {
  const normalized = url.trim();
  if (!normalized) {
    return Promise.resolve(null);
  }

  const cached = resolutionCache.get(normalized);
  if (cached) {
    return cached;
  }

  const task = (async () => {
    for (const candidate of getBrowserIconCandidates(normalized)) {
      const resolved = await loadImage(candidate);
      if (resolved) {
        return resolved;
      }
    }
    return null;
  })();

  resolutionCache.set(normalized, task);
  return task;
}
