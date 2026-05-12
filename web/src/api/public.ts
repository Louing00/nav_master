import { client } from './client';
import type { NavCategory } from '../types/app';
import type { SiteSettings } from '../types/setting';

export async function fetchPublicConfig() {
  const { data } = await client.get<SiteSettings>('/public/config');
  return data;
}

export async function fetchPublicApps() {
  const { data } = await client.get<NavCategory[]>('/public/apps');
  return data;
}
