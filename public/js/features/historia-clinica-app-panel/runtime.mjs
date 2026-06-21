export function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function newRowId(prefix) {
  return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
}
