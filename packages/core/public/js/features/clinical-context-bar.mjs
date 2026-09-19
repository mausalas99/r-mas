import { isGuardiaMode } from './chrome.mjs';

/** @returns {HTMLElement | null} */
export function clinicalContextBarEl() {
  return document.getElementById('clinical-context-bar');
}

/** Show the top clinical bar when Mi rotación is visible. */
export function syncClinicalContextBarVisibility() {
  const bar = clinicalContextBarEl();
  if (!bar) return;
  const rotation = document.getElementById('clinical-rotation-section');
  const hasRotation = rotation && !rotation.hidden && !isGuardiaMode();
  bar.hidden = !hasRotation;
}
