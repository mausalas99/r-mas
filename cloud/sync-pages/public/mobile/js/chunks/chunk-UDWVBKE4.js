// public/js/ui-physics.mjs
function projectMomentum(initialVelocityPxPerSec, decelerationRate) {
  var d = decelerationRate == null ? 0.998 : decelerationRate;
  if (!Number.isFinite(initialVelocityPxPerSec) || d >= 1 || d <= 0) return 0;
  return initialVelocityPxPerSec / 1e3 * d / (1 - d);
}
function rubberband(overshoot, dimension, constant) {
  var c = constant == null ? 0.55 : constant;
  if (!overshoot || !(dimension > 0)) return 0;
  return overshoot * dimension * c / (dimension + c * Math.abs(overshoot));
}

export {
  projectMomentum,
  rubberband
};
//# sourceMappingURL=/js/chunks/chunk-UDWVBKE4.js.map
