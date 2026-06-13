import { App } from '@prisma/client';

export type SerializedApp<T extends { tags: string | null }> = Omit<T, 'tags'> & { tags: string[] };

export type PublicApp = Pick<
  App,
  | 'id'
  | 'name'
  | 'resolvedName'
  | 'nameResolvedAt'
  | 'url'
  | 'description'
  | 'resolvedDescription'
  | 'descriptionResolvedAt'
  | 'icon'
  | 'iconUrl'
  | 'resolvedIconUrl'
  | 'iconResolvedAt'
  | 'openInNewTab'
  | 'healthStatus'
  | 'healthCheckedAt'
  | 'healthLatencyMs'
  | 'healthError'
  | 'healthEnabled'
> & { tags: string[] };

export function decodeAppTags(
  tags?: string | null,
  options: { allowLegacyCsv?: boolean } = {},
): string[] {
  if (!tags) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(tags);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return options.allowLegacyCsv
      ? tags
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
  }
}

export function encodeAppTags(tags: unknown): string {
  if (Array.isArray(tags)) {
    return JSON.stringify(tags.map(String));
  }

  if (typeof tags === 'string') {
    try {
      const parsed: unknown = JSON.parse(tags);
      if (Array.isArray(parsed)) {
        return JSON.stringify(parsed.map(String));
      }
    } catch {
      return JSON.stringify(
        tags
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      );
    }
  }

  return JSON.stringify([]);
}

export function serializeApp<T extends { tags: string | null }>(app: T): SerializedApp<T> {
  return {
    ...app,
    tags: decodeAppTags(app.tags),
  };
}

export function serializePublicApp(app: App): PublicApp {
  return {
    id: app.id,
    name: app.name,
    resolvedName: app.resolvedName,
    nameResolvedAt: app.nameResolvedAt,
    url: app.url,
    description: app.description,
    resolvedDescription: app.resolvedDescription,
    descriptionResolvedAt: app.descriptionResolvedAt,
    icon: app.icon,
    iconUrl: app.iconUrl,
    resolvedIconUrl: app.resolvedIconUrl,
    iconResolvedAt: app.iconResolvedAt,
    tags: decodeAppTags(app.tags),
    openInNewTab: app.openInNewTab,
    healthStatus: app.healthStatus,
    healthCheckedAt: app.healthCheckedAt,
    healthLatencyMs: app.healthLatencyMs,
    healthError: app.healthError,
    healthEnabled: app.healthEnabled,
  };
}
