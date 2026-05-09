export function confirmDelete(message = '确认删除吗？此操作不可撤销。') {
  return window.confirm(message);
}
