/** Apple Designing Fluid Interfaces — px/s → projected delta px. */
export function projectMomentum(initialVelocityPxPerSec, decelerationRate) {
  var d = decelerationRate == null ? 0.998 : decelerationRate;
  if (!Number.isFinite(initialVelocityPxPerSec) || d >= 1 || d <= 0) return 0;
  return (initialVelocityPxPerSec / 1000) * d / (1 - d);
}

/** Progressive resistance past a bound. `overshoot` and `dimension` in px. */
export function rubberband(overshoot, dimension, constant) {
  var c = constant == null ? 0.55 : constant;
  if (!overshoot || !(dimension > 0)) return 0;
  return (overshoot * dimension * c) / (dimension + c * Math.abs(overshoot));
}
