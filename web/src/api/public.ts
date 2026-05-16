import { client } from './client';
import type { NavApp, NavCategory } from '../types/app';
import type { SiteSettings } from '../types/setting';

export async function fetchPublicConfig() {
  const { data } = await client.get<SiteSettings>('/public/config');
  return data;
}

export async function fetchPublicApps() {
  const { data } = await client.get<NavCategory[]>('/public/apps');
  return data;
}

export async function checkPublicCategoryHealth(categoryId: number) {
  const { data } = await client.post<NavApp[]>(`/public/categories/${categoryId}/health-check`);
  return data;
}

export async function reorderPublicCategoryApps(categoryId: number, appIds: number[]) {
  const { data } = await client.post<{ success: boolean }>(`/public/categories/${categoryId}/reorder-apps`, { appIds });
  return data;
}

export async function cachePublicAppBrowserIcon(id: number, resolvedIconUrl: string) {
  const { data } = await client.post<{ success: boolean }>(`/public/apps/${id}/cache-browser-icon`, { resolvedIconUrl });
  return data;
}
