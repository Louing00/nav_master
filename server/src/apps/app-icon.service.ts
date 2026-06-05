import { Injectable } from '@nestjs/common';

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

const BROWSER_LIKE_HEADERS: Record<string, string> = {
  Accept: '*/*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
};

function mergeBrowserHeaders(headers?: HeadersInit) {
  const merged = new Headers(BROWSER_LIKE_HEADERS);
  if (headers) {
    new Headers(headers).forEach((value, key) => merged.set(key, value));
  }
  return merged;
}

function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 3500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, headers: mergeBrowserHeaders(init.headers), signal: controller.signal, redirect: 'follow' }).finally(() => clearTimeout(timeout));
}

function readAttribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*(["'])(.*?)\\1`, 'i')) || tag.match(new RegExp(`\\s${name}\\s*=\\s*([^\\s>]+)`, 'i'));
  return match?.[2] || match?.[1] || '';
}

function decodeHtmlEntities(value: string) {
  const named: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
  };

  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, code: string) => {
    const lower = code.toLowerCase();
    if (lower[0] === '#') {
      const isHex = lower[1] === 'x';
      const point = Number.parseInt(lower.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      return Number.isFinite(point) ? String.fromCodePoint(point) : entity;
    }
    return named[lower] || entity;
  });
}

function normalizePageName(value: string) {
  return decodeHtmlEntities(value.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function extractPageName(html: string) {
  const title = normalizePageName(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
  if (title) {
    return title;
  }

  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
  const priorities = ['application-name', 'og:site_name', 'og:title', 'twitter:title'];
  const candidates = metaTags
    .map((tag, index) => ({
      content: readAttribute(tag, 'content'),
      index,
      key: (readAttribute(tag, 'name') || readAttribute(tag, 'property')).toLowerCase(),
    }))
    .filter((item) => item.content && priorities.includes(item.key))
    .sort((a, b) => priorities.indexOf(a.key) - priorities.indexOf(b.key) || a.index - b.index);

  for (const candidate of candidates) {
    const name = normalizePageName(candidate.content);
    if (name) {
      return name;
    }
  }

  return null;
}

function extractLinkedIcons(html: string, baseUrl: string) {
  const tags = html.match(/<link\b[^>]*>/gi) || [];
  return tags
    .map((tag, index) => {
      const rel = readAttribute(tag, 'rel');
      const href = readAttribute(tag, 'href');
      const type = readAttribute(tag, 'type');
      return { rel, href, type, index };
    })
    .filter((item) => item.href && /(^|\s)(shortcut\s+icon|icon|apple-touch-icon|mask-icon)(\s|$)/i.test(item.rel))
    .sort((a, b) => scoreLinkedIcon(a) - scoreLinkedIcon(b) || a.index - b.index)
    .map((item) => {
      try {
        return new URL(item.href, baseUrl).href;
      } catch {
        return '';
      }
    })
    .filter(Boolean);
}

function scoreLinkedIcon(item: { rel: string; href: string; type: string }) {
  const rel = item.rel.toLowerCase();
  const href = item.href.toLowerCase();
  const type = item.type.toLowerCase();
  let score = 0;

  if (rel.includes('apple-touch-icon')) {
    score += 40;
  } else if (rel.includes('mask-icon')) {
    score += 50;
  } else if (rel.includes('shortcut icon')) {
    score += 5;
  } else if (/(^|\s)icon(\s|$)/.test(rel)) {
    score += 0;
  }

  if (href.endsWith('.svg') || type.includes('svg')) {
    score -= 3;
  } else if (href.includes('favicon')) {
    score -= 2;
  }

  return score;
}

function unique(values: string[]) {
  return [...new Set(values)];
}

@Injectable()
export class AppIconService {
  async resolve(url: string): Promise<string | null> {
    const candidates = await this.collectCandidates(url);
    for (const candidate of candidates) {
      if (await this.isUsableIcon(candidate)) {
        return candidate;
      }
    }
    return null;
  }

  async resolveName(url: string): Promise<string | null> {
    try {
      const response = await fetchWithTimeout(url, { method: 'GET' }, 4500);
      if (!response.ok) {
        return null;
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType && !contentType.includes('html') && !contentType.includes('text/plain')) {
        return null;
      }

      const html = await response.text();
      return extractPageName(html.slice(0, 250_000));
    } catch {
      return null;
    }
  }

  getBrowserCandidates(url: string) {
    return unique([...this.knownCandidates(url), ...this.commonCandidates(url)]);
  }

  isBrowserCandidate(url: string, candidate: string) {
    return this.getBrowserCandidates(url).includes(candidate);
  }

  private async collectCandidates(url: string) {
    const browserCandidates = this.getBrowserCandidates(url);
    const linkedCandidates = await this.linkedCandidates(url);
    return unique([...linkedCandidates, ...browserCandidates]);
  }

  private knownCandidates(url: string) {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return KNOWN_ICON_CANDIDATES[hostname] || [];
    } catch {
      return [];
    }
  }

  private commonCandidates(url: string) {
    try {
      const origin = new URL(url).origin;
      return ICON_PATHS.map((path) => new URL(path, origin).href);
    } catch {
      return [];
    }
  }

  private async linkedCandidates(url: string) {
    try {
      const response = await fetchWithTimeout(url, { method: 'GET' }, 4500);
      if (!response.ok) {
        return [];
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType && !contentType.includes('html') && !contentType.includes('text/plain')) {
        return [];
      }

      const html = await response.text();
      return extractLinkedIcons(html.slice(0, 250_000), response.url || url);
    } catch {
      return [];
    }
  }

  private async isUsableIcon(url: string) {
    try {
      const head = await fetchWithTimeout(url, { method: 'HEAD' }, 2500);
      if (this.isUsableResponse(head)) {
        return true;
      }
      if (head.status !== 405 && head.status !== 403) {
        return false;
      }
    } catch {
      // Some sites block HEAD but still serve the image for GET.
    }

    try {
      const response = await fetchWithTimeout(url, { method: 'GET' }, 3000);
      return this.isUsableResponse(response);
    } catch {
      return false;
    }
  }

  private isUsableResponse(response: Response) {
    if (!response.ok) {
      return false;
    }
    const contentType = response.headers.get('content-type') || '';
    return !contentType || contentType.startsWith('image/') || contentType.includes('icon') || contentType.includes('octet-stream');
  }
}
