import {
  isGuardiaMode
} from "/mobile/js/chunks/chunk-4FTQ7XEU.js";

// public/js/features/clinical-context-bar.mjs
function clinicalContextBarEl() {
  return document.getElementById("clinical-context-bar");
}
function syncClinicalContextBarVisibility() {
  const bar = clinicalContextBarEl();
  if (!bar) return;
  const rotation = document.getElementById("clinical-rotation-section");
  const filtersMount = document.getElementById("clinical-census-filters-mount");
  const hasRotation = rotation && !rotation.hidden && !isGuardiaMode();
  const hasFilters = filtersMount && !filtersMount.hidden && !!document.getElementById("clinical-census-filters");
  bar.hidden = !(hasRotation || hasFilters);
}

export {
  syncClinicalContextBarVisibility
};
//# sourceMappingURL=/js/chunks/chunk-LBCUQ32L.js.map
