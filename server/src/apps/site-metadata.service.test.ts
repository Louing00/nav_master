import { afterEach, describe, expect, it, vi } from 'vitest';
import { SiteMetadataService } from './site-metadata.service';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('SiteMetadataService', () => {
  it('reads title, description and the declared icon from one page request', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url === 'https://example.com/') {
        return new Response(
          `
            <html>
              <head>
                <title>Example Console</title>
                <meta name="description" content="A private service console">
                <link rel="icon" type="image/svg+xml" href="/brand.svg">
              </head>
            </html>
          `,
          { status: 200, headers: { 'content-type': 'text/html' } },
        );
      }

      if (url === 'https://example.com/brand.svg' && init?.method === 'HEAD') {
        return new Response(null, { status: 200, headers: { 'content-type': 'image/svg+xml' } });
      }

      return new Response(null, { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new SiteMetadataService();
    await expect(service.resolveMetadata('https://example.com/')).resolves.toEqual({
      resolvedName: 'Example Console',
      resolvedDescription: 'A private service console',
      resolvedIconUrl: 'https://example.com/brand.svg',
    });
    expect(fetchMock.mock.calls.filter(([input]) => String(input) === 'https://example.com/')).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.com/brand.svg',
      expect.objectContaining({ method: 'HEAD' }),
    );
  });

  it('reuses the URL cache for repeated previews', async () => {
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      if (String(input) === 'https://example.com/') {
        return new Response('<title>Cached Example</title>', {
          status: 200,
          headers: { 'content-type': 'text/html' },
        });
      }
      return new Response(null, { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const service = new SiteMetadataService();
    const first = await service.resolvePageMetadata('https://example.com/');
    const second = await service.resolvePageMetadata('https://example.com/');

    expect(first).toEqual({ resolvedName: 'Cached Example', resolvedDescription: null });
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns empty metadata when the page cannot be read', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 403 })));

    const service = new SiteMetadataService();
    await expect(service.resolvePageMetadata('https://example.com/')).resolves.toEqual({
      resolvedName: null,
      resolvedDescription: null,
    });
  });

  it('finishes with empty metadata when the page request times out', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_input: string | URL | Request, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              const error = new Error('aborted');
              error.name = 'AbortError';
              reject(error);
            });
          }),
      ),
    );

    const service = new SiteMetadataService();
    const result = service.resolvePageMetadata('https://example.com/');
    await vi.advanceTimersByTimeAsync(4200);

    await expect(result).resolves.toEqual({
      resolvedName: null,
      resolvedDescription: null,
    });
  });
});
