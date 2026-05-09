import { client } from './client';
import type { AppDetail, NavCategory } from '../types/app';
import type { SiteSettings } from '../types/setting';

export async function fetchPublicConfig() {
  const { data } = await client.get<SiteSettings>('/public/config');
  return data;
}

export async function fetchPublicApps() {
  const { data } = await client.get<NavCategory[]>('/public/apps');
  return data;
}

export async function fetchAppDetail(id: string | number) {
  const { data } = await client.get<AppDetail>(`/public/apps/${id}`);
  return data;
}
