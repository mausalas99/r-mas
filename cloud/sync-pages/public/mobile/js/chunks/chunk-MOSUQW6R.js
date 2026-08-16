import {
  isGuardiaMode
} from "/mobile/js/chunks/chunk-4SMSHN53.js";

// public/js/features/clinical-context-bar.mjs
function clinicalContextBarEl() {
  return document.getElementById("clinical-context-bar");
}
function syncClinicalContextBarVisibility() {
  const bar = clinicalContextBarEl();
  if (!bar) return;
  const rotation = document.getElementById("clinical-rotation-section");
  const hasRotation = rotation && !rotation.hidden && !isGuardiaMode();
  bar.hidden = !hasRotation;
}

export {
  syncClinicalContextBarVisibility
};
//# sourceMappingURL=/js/chunks/chunk-MOSUQW6R.js.map
