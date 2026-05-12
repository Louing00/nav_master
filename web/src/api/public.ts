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
