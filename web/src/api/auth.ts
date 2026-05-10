import { client } from './client';

export async function login(username: string, password: string) {
  const { data } = await client.post('/auth/login', { username, password });
  return data;
}

export async function register(username: string, password: string) {
  const { data } = await client.post('/auth/register', { username, password });
  return data;
}

export async function logout() {
  const { data } = await client.post('/auth/logout');
  return data;
}

export async function me() {
  const { data } = await client.get('/auth/me');
  return data;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const { data } = await client.post('/auth/change-password', { currentPassword, newPassword });
  return data;
}
