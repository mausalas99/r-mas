import {
  RESULTADOS_SECTIONS,
  getClinicoSections,
  getConsolidatedTabs,
  getSalidaSections,
  resolveConsolidatedTarget
} from "/mobile/js/chunks/chunk-34AJGDKI.js";
import {
  diagnosticosTextForCenso,
  patients
} from "/mobile/js/chunks/chunk-CLJUGM4X.js";

// public/js/expediente-group-row.mjs
var GROUP_LABELS = {
  paciente: "Paciente",
  clinico: "Cl\xEDnico",
  resultados: "Resultados",
  salida: "Salida"
};
var SECTION_LABELS = {
  datos: "Datos",
  todo: "Pendientes",
  notas: "Nota de evoluci\xF3n",
  indica: "Indicaciones",
  historia: "Historia Cl\xEDnica",
  estadoActual: "Estado actual",
  eventualidades: "Eventualidades",
  vpo: "VPO",
  tend: "Tendencias",
  cult: "Cultivos",
  listado: "Listado",
  recetaHu: "Receta HU"
};
function groupSections(group, settings) {
  if (group === "paciente") return [];
  if (group === "clinico") return getClinicoSections(settings || {});
  if (group === "resultados") return RESULTADOS_SECTIONS.slice();
  if (group === "salida") return getSalidaSections(settings || {});
  return [];
}
function buildGroupRowModel(activeGranular, settings) {
  var st = settings || {};
  var granular = activeGranular || "todo";
  var target = resolveConsolidatedTarget(granular, st);
  return getConsolidatedTabs(st).map(function(group) {
    var activeGroup = group === target.tab;
    var sections = groupSections(group, st);
    return {
      id: group,
      label: GROUP_LABELS[group] || group,
      active: activeGroup,
      leaf: sections.length === 0,
      sections: sections.map(function(section) {
        return {
          id: section,
          label: SECTION_LABELS[section] || section,
          active: activeGroup && target.section === section
        };
      })
    };
  });
}

// public/js/features/header-context.mjs
function buildHeaderPath(appTab, inner, settings) {
  if (appTab === "lab") return "Laboratorio";
  if (appTab === "med") return "Manejo";
  if (appTab === "agenda") return "Agenda";
  if (appTab === "guardia") return "Guardia";
  if (appTab === "pase") return "Pase";
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
  var p = id == null ? null : patients.find(function(x) {
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
  GROUP_LABELS,
  SECTION_LABELS,
  groupSections,
  buildGroupRowModel,
  buildHeaderPath,
  buildHeaderPatientLine,
  syncHeaderContext
};
//# sourceMappingURL=/js/chunks/chunk-BNYDNQ6F.js.map
