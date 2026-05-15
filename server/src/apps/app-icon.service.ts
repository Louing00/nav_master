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

function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 3500) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal, redirect: 'follow' }).finally(() => clearTimeout(timeout));
}

function readAttribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*(["'])(.*?)\\1`, 'i')) || tag.match(new RegExp(`\\s${name}\\s*=\\s*([^\\s>]+)`, 'i'));
  return match?.[2] || match?.[1] || '';
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

  private async collectCandidates(url: string) {
    const originCandidates = this.commonCandidates(url);
    const linkedCandidates = await this.linkedCandidates(url);
    return unique([...linkedCandidates, ...originCandidates]);
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
