import {
  assembleSoapLines,
  buildHiTempClause,
  buildNmClause,
  patientHasInsulinRescatesInReceta,
  resolveKcalDisplay,
  resolveSoporteClause,
  resolveVentilatorioLabContext
} from "/mobile/js/chunks/chunk-6J2G5HNR.js";
import {
  getLabHistory
} from "/mobile/js/chunks/chunk-2LHILGVA.js";
import {
  detectInsulinPumpAlgorithmFromRecetaBlock
} from "/mobile/js/chunks/chunk-ZSD6QMCL.js";

// public/js/features/estado-actual-text-inputs.mjs
function snapshotVitals(snapshot) {
  return snapshot && typeof snapshot === "object" && snapshot.vitals && typeof snapshot.vitals === "object" ? snapshot.vitals : {};
}
function snapshotIo(snapshot) {
  return snapshot && typeof snapshot === "object" && snapshot.io && typeof snapshot.io === "object" ? snapshot.io : {};
}
function snapshotAlteredAt(snapshot) {
  return snapshot && typeof snapshot === "object" && snapshot.alteredAt && typeof snapshot.alteredAt === "object" ? snapshot.alteredAt : {};
}
function snapshotGlu(snapshot) {
  return snapshot && typeof snapshot === "object" && Array.isArray(snapshot.glucometrias) ? snapshot.glucometrias : [];
}
function snapshotBomba(snapshot) {
  return snapshot && typeof snapshot === "object" && Array.isArray(snapshot.bombaInsulina) ? snapshot.bombaInsulina : [];
}
function snapshotTempPeakAt(snapshot) {
  return snapshot && typeof snapshot === "object" && snapshot.tempPeakAt && typeof snapshot.tempPeakAt === "object" ? (
    /** @type {{ recordedAt?: string, time?: string }} */
    snapshot.tempPeakAt
  ) : null;
}
function normalizeEaTextInputs(estadoClinico, snapshot, balances) {
  const ec = estadoClinico && typeof estadoClinico === "object" ? (
    /** @type {Record<string, unknown>} */
    estadoClinico
  ) : {};
  const v = snapshotVitals(snapshot);
  const snapIo = snapshotIo(snapshot);
  const btTurno = balances && typeof balances === "object" ? (
    /** @type {{ balanceTurno?: unknown }} */
    balances.balanceTurno
  ) : void 0;
  const snapAlt = snapshotAlteredAt(snapshot);
  const tempPeakAt = snapshotTempPeakAt(snapshot);
  const glSrc = snapshotGlu(snapshot);
  const bombaSrc = snapshotBomba(snapshot);
  return { ec, v, snapIo, btTurno, snapAlt, tempPeakAt, glSrc, bombaSrc };
}

// public/js/features/estado-actual-text.mjs
function buildEstadoActualText(estadoClinico, snapshot, balances, options) {
  options = options || {};
  var ctx = normalizeEaTextInputs(estadoClinico, snapshot, balances);
  var labCtx = options.patientId ? resolveVentilatorioLabContext(options.patientId, getLabHistory()) : null;
  var soporte = resolveSoporteClause(ctx.ec, {
    fr: ctx.v.fr,
    sat: ctx.v.sat,
    pesoKg: options.patientPeso,
    lab: labCtx
  });
  var hiTemp = buildHiTempClause(ctx.v, ctx.snapAlt, ctx.tempPeakAt, options.now);
  var kcalDisplay = resolveKcalDisplay(ctx.ec, options);
  var rescatesInSome = options.rescatesInSome != null ? !!options.rescatesInSome : patientHasInsulinRescatesInReceta(options.recetaBlock || null);
  var bombaAlgoritmo = options.bombaAlgoritmo != null ? options.bombaAlgoritmo : snapshot && typeof snapshot === "object" && /** @type {any} */
  snapshot.bombaInsulinaAlgoritmo != null ? (
    /** @type {any} */
    snapshot.bombaInsulinaAlgoritmo
  ) : detectInsulinPumpAlgorithmFromRecetaBlock(options.recetaBlock || null);
  var nmClause = buildNmClause(ctx.ec, kcalDisplay, ctx.snapIo, ctx.btTurno, ctx.glSrc, ctx.bombaSrc, {
    rescatesInSome,
    bombaAlgoritmo
  });
  return assembleSoapLines(ctx.ec, ctx.v, soporte, hiTemp, nmClause).join("\n\n");
}

export {
  buildEstadoActualText
};
//# sourceMappingURL=/js/chunks/chunk-OAMXGLI7.js.map
