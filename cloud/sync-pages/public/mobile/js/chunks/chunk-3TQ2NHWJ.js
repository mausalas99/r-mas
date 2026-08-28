import {
  RESULTADOS_SECTIONS,
  getClinicoSections,
  getConsolidatedTabs,
  getSalidaSections,
  resolveConsolidatedTarget
} from "/mobile/js/chunks/chunk-2MXQFCGD.js";

// public/js/expediente-group-row.mjs
var GROUP_LABELS = {
  paciente: "Resumen",
  clinico: "Cl\xEDnico",
  resultados: "Resultados",
  salida: "Salida"
};
var LAB_INNER_SECTIONS = ["labs", "tend", "cult"];
var SECTION_LABELS = {
  datos: "Datos",
  labs: "Labs",
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
  var granular = activeGranular || "resumen";
  var target = resolveConsolidatedTarget(granular, st);
  var groups = getConsolidatedTabs(st).map(function(group) {
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
  groups.push({
    id: "todo",
    label: SECTION_LABELS.todo,
    active: granular === "todo",
    leaf: true,
    granularTarget: "todo",
    sections: []
  });
  return groups;
}

export {
  GROUP_LABELS,
  LAB_INNER_SECTIONS,
  SECTION_LABELS,
  groupSections,
  buildGroupRowModel
};
//# sourceMappingURL=/js/chunks/chunk-3TQ2NHWJ.js.map
