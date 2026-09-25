/** Shared outbox change signal for Diagnóstico Nube live refresh. */
export const CLOUD_OUTBOX_CHANGED_EVENT = 'rpc-cloud-outbox-changed';

export function notifyCloudOutboxChanged() {
  if (typeof document === 'undefined') return;
  document.dispatchEvent(new CustomEvent(CLOUD_OUTBOX_CHANGED_EVENT));
}
