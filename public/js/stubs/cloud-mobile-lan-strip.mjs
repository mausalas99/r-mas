/**
 * No-op replacements for retired LAN modules in the R+ Móvil Nube bundle.
 * Resolved by build-cloud-mobile.mjs esbuild plugin — not imported at runtime on desktop.
 */

export const LAN_RETIRE_FLAG = 'nube-config-retired-v805';

export function runLanConfigRetireIfNeeded() {
  return { didRun: false };
}

export async function detachLanLiveSyncForNube() {}

export function getRoomMembership() {
  return null;
}

export function setRoomMembership() {}

export function clearRoomMembership() {}

export function migrateLastRoomToMembership() {}

export function resolveMobilePairingRoomId() {
  return '';
}

export function appendMobileSharerParamsToJoinUrl(url) {
  return url;
}

export function mobileSharerDisplayLabel() {
  return '';
}

export function applyMobileSharerContextFromUrl() {
  return false;
}

export function hydrateMobileSharerSessionFromSettings() {}
