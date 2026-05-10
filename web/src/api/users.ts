import { client } from './client';

export type AdminUser = {
  id: number;
  username: string;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  appCount: number;
  categoryCount: number;
};

export async function fetchUsers() {
  const { data } = await client.get<AdminUser[]>('/admin/users');
  return data;
}

export async function createUser(payload: { username: string; password: string; isAdmin?: boolean }) {
  const { data } = await client.post<AdminUser>('/admin/users', payload);
  return data;
}

export async function updateUser(id: number, payload: { password?: string; isAdmin?: boolean }) {
  const { data } = await client.put<AdminUser>(`/admin/users/${id}`, payload);
  return data;
}

export async function deleteUser(id: number) {
  const { data } = await client.delete(`/admin/users/${id}`);
  return data;
}
