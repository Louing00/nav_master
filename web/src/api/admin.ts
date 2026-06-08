import { client } from './client';
import type { NavApp } from '../types/app';
import type { AdminCategory } from '../types/category';
import type { SiteSettings } from '../types/setting';

export type AppPayload = Omit<
  NavApp,
  | 'id'
  | 'resolvedName'
  | 'nameResolvedAt'
  | 'resolvedDescription'
  | 'descriptionResolvedAt'
  | 'resolvedIconUrl'
  | 'iconResolvedAt'
  | 'healthStatus'
  | 'healthCheckedAt'
  | 'healthLatencyMs'
  | 'healthError'
>;
export type CategoryPayload = Omit<AdminCategory, 'id' | '_count'>;
export type AppMetadataPreview = {
  resolvedName: string | null;
  resolvedDescription: string | null;
  resolvedIconUrl: string | null;
};

export async function fetchAdminApps() {
  const { data } = await client.get<NavApp[]>('/admin/apps');
  return data;
}

export async function createApp(payload: Partial<AppPayload>) {
  const { data } = await client.post('/admin/apps', payload);
  return data;
}

export async function previewAppMetadata(url: string, signal?: AbortSignal) {
  const { data } = await client.post<AppMetadataPreview>('/admin/apps/preview', { url }, { signal });
  return data;
}

export async function updateApp(id: number, payload: Partial<AppPayload>) {
  const { data } = await client.put(`/admin/apps/${id}`, payload);
  return data;
}

export async function deleteApp(id: number) {
  const { data } = await client.delete(`/admin/apps/${id}`);
  return data;
}

export async function checkAppHealth(id: number) {
  const { data } = await client.post<NavApp>(`/admin/apps/${id}/health-check`);
  return data;
}

export async function refreshAppIcon(id: number) {
  const { data } = await client.post<NavApp>(`/admin/apps/${id}/refresh-icon`);
  return data;
}

export async function checkAllAppHealth() {
  const { data } = await client.post<NavApp[]>('/admin/apps/health-check');
  return data;
}

export async function fetchCategories() {
  const { data } = await client.get<AdminCategory[]>('/admin/categories');
  return data;
}

export async function createCategory(payload: Partial<CategoryPayload>) {
  const { data } = await client.post('/admin/categories', payload);
  return data;
}

export async function updateCategory(id: number, payload: Partial<CategoryPayload>) {
  const { data } = await client.put(`/admin/categories/${id}`, payload);
  return data;
}

export async function deleteCategory(id: number) {
  const { data } = await client.delete(`/admin/categories/${id}`);
  return data;
}

export async function fetchSettings() {
  const { data } = await client.get<SiteSettings>('/admin/settings');
  return data;
}

export async function updateSettings(payload: SiteSettings) {
  const { data } = await client.put<SiteSettings>('/admin/settings', payload);
  return data;
}

export async function exportData() {
  const { data } = await client.get('/admin/export');
  return data;
}

export async function importData(mode: 'merge' | 'replace', data: unknown) {
  const response = await client.post('/admin/import', { mode, data });
  return response.data;
}
