import axios from 'axios';

export const client = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.startsWith('/admin/login')) {
      const next = `${window.location.pathname}${window.location.search}`;
      window.location.href = `/admin/login?next=${encodeURIComponent(next)}`;
    }
    return Promise.reject(error);
  },
);

export function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    return Array.isArray(message) ? message.join('；') : message || error.message;
  }
  return error instanceof Error ? error.message : '操作失败';
}
