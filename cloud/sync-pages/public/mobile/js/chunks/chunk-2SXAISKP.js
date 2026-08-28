import {
  GROUP_LABELS,
  SECTION_LABELS
} from "/mobile/js/chunks/chunk-DUGSQ4MG.js";
import {
  resolveConsolidatedTarget
} from "/mobile/js/chunks/chunk-DKVIOEBN.js";
import {
  getPatients
} from "/mobile/js/chunks/chunk-2LHILGVA.js";
import {
  diagnosticosTextForCenso
} from "/mobile/js/chunks/chunk-ZSD6QMCL.js";

// public/js/features/header-context.mjs
function densityPathOverride() {
  if (typeof document === "undefined" || !document.documentElement) return "";
  var cls = document.documentElement.classList;
  if (cls.contains("ui-density-guardia")) return "Guardia";
  return "";
}
function buildHeaderPath(appTab, inner, settings) {
  var densityPath = densityPathOverride();
  if (densityPath) return densityPath;
  if (appTab === "lab") return "Laboratorio";
  if (appTab === "med") return "Manejo";
  if (appTab === "agenda") return "Agenda";
  if (appTab === "guardia") return "Guardia";
  var granular = inner || "todo";
  var target = resolveConsolidatedTarget(granular, settings || {});
  var path = GROUP_LABELS[target.tab] || "Expediente";
  if (target.tab === "paciente") return path;
  var section = target.section;
  if (section && SECTION_LABELS[section]) path += " \u203A " + SECTION_LABELS[section];
  return path;
}
function sidebarShowsActivePatient() {
  if (typeof document === "undefined") return true;
  var root = document.documentElement;
  return !root.classList.contains("sidebar-auto-hide") || root.classList.contains("sidebar-reveal");
}
function buildHeaderPatientLine(p) {
  if (!p) return "";
  var parts = [String(p.nombre || "").trim() || "Paciente"];
  var cuarto = String(p.cuarto || "").trim();
  if (cuarto) parts.push(cuarto);
  var dx = "";
  try {
    dx = String(diagnosticosTextForCenso(p.diagnosticosList) || "").trim();
  } catch {
    dx = "";
  }
  if (dx) parts.push(dx.length > 48 ? dx.slice(0, 47) + "\u2026" : dx);
  return parts.join(" \xB7 ");
}
function syncHeaderContext(ctx) {
  var patientEl = document.getElementById("header-context-patient");
  var pathEl = document.getElementById("header-context-path");
  if (!patientEl || !pathEl || !ctx) return;
  var id = typeof ctx.getActiveId === "function" ? ctx.getActiveId() : null;
  var p = id == null ? null : getPatients().find(function(x) {
    return String(x.id) === String(id);
  }) || null;
  var showPatient = !!(p && !sidebarShowsActivePatient());
  patientEl.textContent = showPatient ? buildHeaderPatientLine(p) : "";
  patientEl.style.display = showPatient ? "" : "none";
  pathEl.textContent = buildHeaderPath(
    typeof ctx.getActiveAppTab === "function" ? ctx.getActiveAppTab() : "nota",
    typeof ctx.getActiveInner === "function" ? ctx.getActiveInner() : "todo",
    typeof ctx.getSettings === "function" ? ctx.getSettings() : {}
  );
}

export {
  buildHeaderPath,
  buildHeaderPatientLine,
  syncHeaderContext
};
//# sourceMappingURL=/js/chunks/chunk-2SXAISKP.js.map
