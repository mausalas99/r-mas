export const LAN_RETIRE_FLAG = 'nube-config-retired-v805';
const KEYS = [
  'rpc-lan-config',
  'lan-ui-role',
  'rpc-lan-pinned-host',
  'lan-guest-bearer',
];

export function runLanConfigRetireIfNeeded({ storage = localStorage, showToast, now = Date.now } = {}) {
  if (storage.getItem(LAN_RETIRE_FLAG)) return { didRun: false };
  KEYS.forEach((k) => storage.removeItem(k));
  storage.setItem(LAN_RETIRE_FLAG, String(now()));
  showToast?.('Conexión actualizada a solo Nube.');
  return { didRun: true };
}
