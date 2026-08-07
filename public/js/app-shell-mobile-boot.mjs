/**
 * Mobile web boot — cloud-mobile only (ward LAN mobile retired in 8.0.5).
 */
import { initCloudMobileBoot } from './features/cloud-mobile/boot.mjs';

export function setMobileBootBanner(visible, text) {
  const el = document.getElementById('rpc-mobile-boot-banner');
  if (!el) return;
  if (text) el.textContent = text;
  el.classList.toggle('is-visible', !!visible);
}

export async function initMobileWebBoot() {
  await initCloudMobileBoot();
}
