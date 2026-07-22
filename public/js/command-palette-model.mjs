/**
 * ⌘K palette items: sections (current mode), app tabs, patients,
 * section×patient combos, and shift actions (export, queues, jump).
 * A launcher over existing stores/functions — no new data layer.
 */
import { getConsolidatedTabs } from './expediente-tabs.mjs';
import { groupSections, GROUP_LABELS, SECTION_LABELS } from './expediente-group-row.mjs';
import { rankItems } from './fuzzy-match.mjs';

export var APP_TAB_ITEMS = [
  { kind: 'app-tab', tab: 'lab', label: 'Laboratorio', hint: '' },
  { kind: 'app-tab', tab: 'med', label: 'Manejo', hint: '' },
  { kind: 'app-tab', tab: 'agenda', label: 'Agenda', hint: '' },
];

/** Shift remote-control actions — executed via window handlers / lazy loads. */
export var ACTION_ITEMS = [
  {
    kind: 'action',
    actionId: 'procesar-some',
    label: 'Procesar SOME',
    hint: 'Acción',
    keywords: 'procesar some labs pegar portapapeles paste inteligente',
  },
  {
    kind: 'action',
    actionId: 'lab-repo-batch',
    label: 'Actualizar labs de mi equipo',
    hint: 'Acción',
    keywords: 'labs laboratorio repositorio batch actualizar equipo',
  },
  {
    kind: 'action',
    actionId: 'doc-queue',
    label: 'Falta documentar',
    hint: 'Acción',
    keywords: 'cola documentacion docs falta pendientes nota labs',
  },
  {
    kind: 'action',
    actionId: 'entrega-prep',
    label: 'Preparar entrega',
    hint: 'Acción',
    keywords: 'entrega checklist handoff hc ea pendientes cultivos preparar',
  },
  {
    kind: 'action',
    actionId: 'open-lab',
    label: 'Abrir laboratorio',
    hint: 'Acción',
    keywords: 'labs laboratorio some abrir',
  },
  {
    kind: 'action',
    actionId: 'open-eventualidades',
    label: 'Abrir eventualidades',
    hint: 'Acción',
    keywords: 'eventualidades nota sala abrir',
  },
  {
    kind: 'action',
    actionId: 'open-ea',
    label: 'Abrir estado actual',
    hint: 'Acción',
    keywords: 'ea estado actual monitoreo abrir',
  },
  {
    kind: 'action',
    actionId: 'export-note',
    label: 'Exportar nota',
    hint: 'Acción',
    keywords: 'exportar nota salida rapida docx quick',
  },
  {
    kind: 'action',
    actionId: 'new-pendiente',
    label: 'Nuevo pendiente',
    hint: 'Acción',
    keywords: 'pendiente todo agregar nuevo',
  },
  {
    kind: 'action',
    actionId: 'copy-labs',
    label: 'Copiar labs SOAP',
    hint: 'Acción',
    keywords: 'copiar labs soap portapapeles',
  },
  {
    kind: 'action',
    actionId: 'open-pase',
    label: 'Abrir pase',
    hint: 'Acción',
    keywords: 'pase ronda board abrir',
  },
];

export function sectionEntries(settings) {
  var out = [];
  getConsolidatedTabs(settings || {}).forEach(function (group) {
    if (group === 'paciente') {
      out.push({
        section: 'todo',
        label: GROUP_LABELS.paciente,
        groupLabel: GROUP_LABELS.paciente,
      });
      return;
    }
    groupSections(group, settings).forEach(function (section) {
      out.push({
        section: section,
        label: SECTION_LABELS[section] || section,
        groupLabel: GROUP_LABELS[group] || group,
      });
    });
  });
  return out;
}

export function paletteItemText(it) {
  var label = String((it && it.label) || '');
  var keywords = String((it && it.keywords) || '').trim();
  return keywords ? label + ' ' + keywords : label;
}

export function buildPaletteItems(settings, patientsList) {
  var items = [];
  ACTION_ITEMS.forEach(function (it) {
    items.push({
      kind: 'action',
      actionId: it.actionId,
      label: it.label,
      hint: it.hint || 'Acción',
      keywords: it.keywords || '',
    });
  });
  var secs = sectionEntries(settings);
  secs.forEach(function (se) {
    items.push({ kind: 'section', section: se.section, label: se.label, hint: se.groupLabel });
  });
  APP_TAB_ITEMS.forEach(function (it) {
    items.push({ kind: 'app-tab', tab: it.tab, label: it.label, hint: '' });
  });
  (patientsList || []).forEach(function (p) {
    var name = String((p && p.nombre) || '').trim();
    if (!name) return;
    var cuarto = String((p && p.cuarto) || '').trim();
    var pinned = !!(p && p.pinned);
    items.push({
      kind: 'patient',
      patientId: p.id,
      label: name,
      hint: pinned ? (cuarto ? cuarto + ' · fijado' : 'Fijado') : cuarto,
      pinned: pinned,
    });
    secs.forEach(function (se) {
      items.push({
        kind: 'patient-section',
        patientId: p.id,
        section: se.section,
        label: se.label + ' — ' + name,
        hint: cuarto,
      });
    });
  });
  return items;
}

function emptyPaletteRanking(items, max) {
  var actions = [];
  var pinned = [];
  var patients = [];
  var sections = [];
  (items || []).forEach(function (it) {
    if (it.kind === 'action') actions.push(it);
    else if (it.kind === 'patient' && it.pinned) pinned.push(it);
    else if (it.kind === 'patient') patients.push(it);
    else if (it.kind === 'section') sections.push(it);
  });
  return actions.concat(pinned, patients, sections).slice(0, max);
}

export function rankPalette(query, items, limit) {
  var max = limit || 12;
  var q = String(query || '').trim();
  if (!q) return emptyPaletteRanking(items, max);
  return rankItems(q, items, paletteItemText)
    .slice(0, max)
    .map(function (r) {
      return r.item;
    });
}
