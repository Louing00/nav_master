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

const HTML_HEADERS = {
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.6',
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ITEMS = 200;
const METADATA_TOTAL_BUDGET_MS = 7000;
const PAGE_FETCH_MAX_MS = 4200;
const ICON_BATCH_SIZE = 4;

type PageInfo = {
  resolvedName: string | null;
  resolvedDescription: string | null;
  linkedIconUrls: string[];
};

export type ResolvedAppMetadata = {
  resolvedName: string | null;
  resolvedDescription: string | null;
  resolvedIconUrl: string | null;
};

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
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

function normalizePageText(value: string, maxLength: number) {
  return decodeHtmlEntities(value.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function normalizePageName(value: string) {
  return normalizePageText(value, 80);
}

function normalizePageDescription(value: string) {
  return normalizePageText(value, 300);
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

function extractPageDescription(html: string) {
  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
  const priorities = ['description', 'og:description', 'twitter:description'];
  const candidates = metaTags
    .map((tag, index) => ({
      content: readAttribute(tag, 'content'),
      index,
      key: (readAttribute(tag, 'name') || readAttribute(tag, 'property')).toLowerCase(),
    }))
    .filter((item) => item.content && priorities.includes(item.key))
    .sort((a, b) => priorities.indexOf(a.key) - priorities.indexOf(b.key) || a.index - b.index);

  for (const candidate of candidates) {
    const description = normalizePageDescription(candidate.content);
    if (description) {
      return description;
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

function normalizeUrlKey(value: string) {
  try {
    const url = new URL(value.trim());
    url.hash = '';
    return url.href;
  } catch {
    return value.trim();
  }
}

function remainingBudget(startedAt: number, totalBudgetMs: number) {
  return Math.max(0, totalBudgetMs - (Date.now() - startedAt));
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class AppIconService {
  private readonly pageCache = new Map<string, CacheEntry<PageInfo>>();
  private readonly pageInflight = new Map<string, Promise<PageInfo>>();
  private readonly metadataCache = new Map<string, CacheEntry<ResolvedAppMetadata>>();
  private readonly metadataInflight = new Map<string, Promise<ResolvedAppMetadata>>();

  async resolve(url: string, options: { force?: boolean } = {}): Promise<string | null> {
    return (await this.resolveMetadata(url, options)).resolvedIconUrl;
  }

  async resolveMetadata(url: string, options: { force?: boolean } = {}): Promise<ResolvedAppMetadata> {
    const key = normalizeUrlKey(url);
    if (!options.force) {
      const cached = this.readCache(this.metadataCache, key);
      if (cached) {
        return cached;
      }

      const inflight = this.metadataInflight.get(key);
      if (inflight) {
        return inflight;
      }
    }

    const promise = this.resolveMetadataFresh(url, options.force).then((value) => {
      this.writeCache(this.metadataCache, key, value);
      return value;
    });

    if (!options.force) {
      this.metadataInflight.set(key, promise);
      promise.then(
        () => {
          if (this.metadataInflight.get(key) === promise) {
            this.metadataInflight.delete(key);
          }
        },
        () => {
          if (this.metadataInflight.get(key) === promise) {
            this.metadataInflight.delete(key);
          }
        },
      );
    }

    return promise;
  }

  async resolvePageMetadata(url: string, options: { force?: boolean } = {}): Promise<{ resolvedName: string | null; resolvedDescription: string | null }> {
    const pageInfo = await this.resolvePageInfo(url, options);
    return {
      resolvedName: pageInfo.resolvedName,
      resolvedDescription: pageInfo.resolvedDescription,
    };
  }

  async resolveName(url: string): Promise<string | null> {
    return (await this.resolvePageMetadata(url)).resolvedName;
  }

  async resolveDescription(url: string): Promise<string | null> {
    return (await this.resolvePageMetadata(url)).resolvedDescription;
  }

  getBrowserCandidates(url: string) {
    return unique([...this.knownCandidates(url), ...this.commonCandidates(url)]);
  }

  isBrowserCandidate(url: string, candidate: string) {
    return this.getBrowserCandidates(url).includes(candidate);
  }

  private async resolveMetadataFresh(url: string, forcePage = false): Promise<ResolvedAppMetadata> {
    const startedAt = Date.now();
    const pageInfo = await this.resolvePageInfo(url, { force: forcePage, timeoutMs: Math.min(PAGE_FETCH_MAX_MS, METADATA_TOTAL_BUDGET_MS) });
    const candidates = unique([...pageInfo.linkedIconUrls, ...this.getBrowserCandidates(url)]);
    const resolvedIconUrl = await this.findFirstUsableIcon(candidates, remainingBudget(startedAt, METADATA_TOTAL_BUDGET_MS));

    return {
      resolvedName: pageInfo.resolvedName,
      resolvedDescription: pageInfo.resolvedDescription,
      resolvedIconUrl,
    };
  }

  private async resolvePageInfo(url: string, options: { force?: boolean; timeoutMs?: number } = {}): Promise<PageInfo> {
    const key = normalizeUrlKey(url);
    if (!options.force) {
      const cached = this.readCache(this.pageCache, key);
      if (cached) {
        return cached;
      }

      const inflight = this.pageInflight.get(key);
      if (inflight) {
        return inflight;
      }
    }

    const promise = this.fetchPageInfo(url, options.timeoutMs || PAGE_FETCH_MAX_MS).then((value) => {
      this.writeCache(this.pageCache, key, value);
      return value;
    });

    if (!options.force) {
      this.pageInflight.set(key, promise);
      promise.then(
        () => {
          if (this.pageInflight.get(key) === promise) {
            this.pageInflight.delete(key);
          }
        },
        () => {
          if (this.pageInflight.get(key) === promise) {
            this.pageInflight.delete(key);
          }
        },
      );
    }

    return promise;
  }

  private async fetchPageInfo(url: string, timeoutMs: number): Promise<PageInfo> {
    try {
      if (timeoutMs < 250) {
        return this.emptyPageInfo();
      }

      const response = await fetchWithTimeout(url, { method: 'GET', headers: HTML_HEADERS }, timeoutMs);
      if (!response.ok) {
        return this.emptyPageInfo();
      }

      const contentType = response.headers.get('content-type') || '';
      if (contentType && !contentType.includes('html') && !contentType.includes('text/plain')) {
        return this.emptyPageInfo();
      }

      const html = (await response.text()).slice(0, 250_000);
      return {
        resolvedName: extractPageName(html),
        resolvedDescription: extractPageDescription(html),
        linkedIconUrls: extractLinkedIcons(html, response.url || url),
      };
    } catch {
      return this.emptyPageInfo();
    }
  }

  private emptyPageInfo(): PageInfo {
    return {
      resolvedName: null,
      resolvedDescription: null,
      linkedIconUrls: [],
    };
  }

  private async findFirstUsableIcon(candidates: string[], budgetMs: number) {
    const startedAt = Date.now();
    for (let index = 0; index < candidates.length; index += ICON_BATCH_SIZE) {
      const remaining = remainingBudget(startedAt, budgetMs);
      if (remaining < 250) {
        return null;
      }

      const batch = candidates.slice(index, index + ICON_BATCH_SIZE);
      const checks = Promise.all(batch.map((candidate) => this.isUsableIcon(candidate, Math.min(remaining, 2200))));
      const results = await Promise.race([checks, delay(remaining).then(() => null)]);
      if (!results) {
        return null;
      }

      const foundIndex = results.findIndex(Boolean);
      if (foundIndex >= 0) {
        return batch[foundIndex];
      }
    }

    return null;
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

  private async isUsableIcon(url: string, timeoutMs = 2200) {
    if (timeoutMs < 250) {
      return false;
    }

    try {
      const head = await fetchWithTimeout(url, { method: 'HEAD' }, Math.min(timeoutMs, 1300));
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
      const response = await fetchWithTimeout(url, { method: 'GET' }, Math.min(timeoutMs, 1700));
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

  private readCache<T>(cache: Map<string, CacheEntry<T>>, key: string) {
    const cached = cache.get(key);
    if (!cached || cached.expiresAt < Date.now()) {
      cache.delete(key);
      return null;
    }

    cache.delete(key);
    cache.set(key, cached);
    return cached.value;
  }

  private writeCache<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T) {
    if (cache.has(key)) {
      cache.delete(key);
    }

    cache.set(key, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      value,
    });

    while (cache.size > CACHE_MAX_ITEMS) {
      const oldestKey = cache.keys().next().value;
      if (!oldestKey) {
        break;
      }
      cache.delete(oldestKey);
    }
  }
}
