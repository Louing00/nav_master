import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { basename, dirname, extname, isAbsolute, join, resolve, sep } from 'path';

const PUBLIC_ICON_PREFIX = '/api/public/app-icons/';
const MAX_ICON_BYTES = 1024 * 1024;
const ICON_FETCH_TIMEOUT_MS = 5000;
const ALLOWED_EXTENSIONS = ['.svg', '.png', '.ico', '.jpg', '.jpeg', '.webp', '.gif'];
const BROWSER_LIKE_HEADERS: Record<string, string> = {
  Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
};

export type CachedIconFile = {
  path: string;
  contentType: string;
};

function databaseDirectory() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl?.startsWith('file:')) {
    return null;
  }

  const databasePath = databaseUrl.slice('file:'.length);
  if (!databasePath) {
    return null;
  }

  return dirname(isAbsolute(databasePath) ? databasePath : resolve(process.cwd(), databasePath));
}

function resolveIconCacheDir() {
  const configured = process.env.ICON_CACHE_DIR?.trim();
  if (configured) {
    return resolve(configured);
  }

  return join(databaseDirectory() || join(process.cwd(), 'data'), 'app-icons');
}

function fetchWithTimeout(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ICON_FETCH_TIMEOUT_MS);
  return fetch(url, {
    method: 'GET',
    headers: BROWSER_LIKE_HEADERS,
    redirect: 'follow',
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));
}

function hashSourceUrl(url: string) {
  return createHash('sha256').update(url).digest('hex').slice(0, 32);
}

function extensionFromContentType(contentType: string) {
  const normalized = contentType.toLowerCase().split(';')[0].trim();
  if (normalized === 'image/svg+xml') return '.svg';
  if (normalized === 'image/png') return '.png';
  if (normalized === 'image/x-icon' || normalized === 'image/vnd.microsoft.icon') return '.ico';
  if (normalized === 'image/jpeg') return '.jpg';
  if (normalized === 'image/webp') return '.webp';
  if (normalized === 'image/gif') return '.gif';
  return '';
}

function extensionFromUrl(url: string) {
  try {
    const extension = extname(new URL(url).pathname).toLowerCase();
    return ALLOWED_EXTENSIONS.includes(extension) ? extension : '';
  } catch {
    return '';
  }
}

function contentTypeFromExtension(extension: string) {
  switch (extension.toLowerCase()) {
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.ico':
      return 'image/x-icon';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    default:
      return 'application/octet-stream';
  }
}

function looksLikeImage(contentType: string) {
  const normalized = contentType.toLowerCase();
  return !normalized || normalized.startsWith('image/') || normalized.includes('icon') || normalized.includes('octet-stream');
}

@Injectable()
export class IconCacheService {
  private readonly cacheDir = resolveIconCacheDir();

  isLocalIconUrl(value?: string | null) {
    return Boolean(value?.trim().startsWith(PUBLIC_ICON_PREFIX));
  }

  isRemoteIconUrl(value?: string | null) {
    try {
      const url = new URL(value?.trim() || '');
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  async cacheRemoteIcon(sourceUrl?: string | null) {
    const normalizedUrl = sourceUrl?.trim();
    if (!normalizedUrl || !this.isRemoteIconUrl(normalizedUrl)) {
      return null;
    }

    const existing = await this.findExistingCachedIcon(normalizedUrl);
    if (existing) {
      return this.toPublicUrl(existing);
    }

    try {
      const response = await fetchWithTimeout(normalizedUrl);
      if (!response.ok) {
        return null;
      }

      const contentType = response.headers.get('content-type') || '';
      if (!looksLikeImage(contentType)) {
        return null;
      }

      const contentLength = Number(response.headers.get('content-length') || 0);
      if (contentLength > MAX_ICON_BYTES) {
        return null;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      if (buffer.length === 0 || buffer.length > MAX_ICON_BYTES) {
        return null;
      }

      const extension = extensionFromContentType(contentType) || extensionFromUrl(normalizedUrl) || '.ico';
      const filename = `${hashSourceUrl(normalizedUrl)}${extension}`;
      const targetPath = join(this.cacheDir, filename);
      const tempPath = join(this.cacheDir, `${filename}.${process.pid}.${randomUUID()}.tmp`);

      await fs.mkdir(this.cacheDir, { recursive: true });
      await fs.writeFile(tempPath, buffer);
      await fs.rename(tempPath, targetPath).catch(async (error: NodeJS.ErrnoException) => {
        await fs.unlink(tempPath).catch(() => undefined);
        if (error.code !== 'EEXIST') {
          throw error;
        }
      });

      return this.toPublicUrl(filename);
    } catch {
      return null;
    }
  }

  async getCachedIcon(file: string): Promise<CachedIconFile | null> {
    if (!/^[a-f0-9]{32}\.(svg|png|ico|jpg|jpeg|webp|gif)$/i.test(file)) {
      return null;
    }

    const root = resolve(this.cacheDir);
    const path = resolve(root, basename(file));
    if (path !== root && !path.startsWith(`${root}${sep}`)) {
      return null;
    }

    try {
      const stats = await fs.stat(path);
      if (!stats.isFile()) {
        return null;
      }
    } catch {
      return null;
    }

    return {
      path,
      contentType: contentTypeFromExtension(extname(path)),
    };
  }

  private async findExistingCachedIcon(sourceUrl: string) {
    const stem = hashSourceUrl(sourceUrl);
    for (const extension of ALLOWED_EXTENSIONS) {
      const filename = `${stem}${extension}`;
      try {
        const stats = await fs.stat(join(this.cacheDir, filename));
        if (stats.isFile()) {
          return filename;
        }
      } catch {
        // Try the next extension.
      }
    }
    return null;
  }

  private toPublicUrl(filename: string) {
    return `${PUBLIC_ICON_PREFIX}${filename}`;
  }
}
