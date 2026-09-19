import {
  dedupeTrendSetsForSeries,
  getSetTrendValueForSeries,
  sortLabHistoryChronological,
  parseFechaLabToMs,
  tendEligibleSectionKey,
} from './tend-core.mjs';
import { readGroupVisibleFields } from './tend-prefs.mjs';
import { toAscendingHistory } from './tend-group-chart-helpers.mjs';
import { buildTableTsv, copyTableModelAsPng, copyTableText } from './tend-export.mjs';
import { cancelOverlayClose } from './ui-motion.mjs';

export function eligibleSpecs(deps, sectionKey, historyDesc) {
  var catalog = deps.getCatalogSpecs(sectionKey, historyDesc) || [];
  return catalog.filter(function (sp) {
    var raw = historyDesc.filter(function (s) {
      return getSetTrendValueForSeries(s, sectionKey, sp.fieldKey) != null;
    });
    return dedupeTrendSetsForSeries(raw, sectionKey, sp.fieldKey).length >= 2;
  });
}

export function resolveVisibleFields(patientId, sectionKey, eligible) {
  var saved = readGroupVisibleFields(patientId, sectionKey);
  if (saved && saved.length) {
    var allowed = Object.create(null);
    eligible.forEach(function (sp) {
      allowed[sp.fieldKey] = true;
    });
    var filtered = saved.filter(function (fk) {
      return allowed[fk];
    });
    if (filtered.length) return filtered;
  }
  return eligible.map(function (sp) {
    return sp.fieldKey;
  });
}

/** Otras secciones de laboratorio presentes en la historia, distintas de la abierta. */
function otherSectionKeysInHistory(historyDesc, excludeSectionKey) {
  var seen = Object.create(null);
  var out = [];
  (historyDesc || []).forEach(function (set) {
    var pb = set && set.parsedBySection;
    if (!pb) return;
    Object.keys(pb).forEach(function (sk) {
      if (sk === excludeSectionKey || seen[sk] || !tendEligibleSectionKey(sk)) return;
      seen[sk] = true;
      out.push(sk);
    });
  });
  return out;
}

/** Analitos elegibles (≥2 tomas) de otras secciones, para agregar a la tabla combinada. */
export function crossSectionEligibleSpecs(deps, state) {
  var already = Object.create(null);
  (state.tableExtraSpecs || []).forEach(function (sp) {
    already[sp.sectionKey + '|' + sp.fieldKey] = true;
  });
  var out = [];
  otherSectionKeysInHistory(state.historyDescFull, state.sectionKey).forEach(function (otherKey) {
    eligibleSpecs(deps, otherKey, state.historyDescFull).forEach(function (sp) {
      if (already[otherKey + '|' + sp.fieldKey]) return;
      out.push(Object.assign({}, sp, { sectionKey: otherKey }));
    });
  });
  return out;
}

/** Resuelve pares {sectionKey, fieldKey} guardados a specs vivas del catálogo actual. */
export function resolveExtraSpecs(deps, historyDesc, savedPairs) {
  var out = [];
  (savedPairs || []).forEach(function (pair) {
    var catalog = deps.getCatalogSpecs(pair.sectionKey, historyDesc) || [];
    var found = catalog.filter(function (sp) {
      return sp.fieldKey === pair.fieldKey;
    })[0];
    if (found) out.push(Object.assign({}, found, { sectionKey: pair.sectionKey }));
  });
  return out;
}

function hasBhSectionData(historyDesc) {
  return historyDesc.some(function (s) {
    return s.parsedBySection && s.parsedBySection.BH && Object.keys(s.parsedBySection.BH).length;
  });
}

export function canOpenTendGroupModal(sectionKey, historyDesc, eligible) {
  if (historyDesc.length < 2) return false;
  if (sectionKey === 'BH') {
    return hasBhSectionData(historyDesc) || eligible.length > 0;
  }
  return eligible.length > 0;
}

/** @param {unknown[]} historyDesc @param {string} fromIso @param {string} toIso */
export function filterHistoryByDateRange(historyDesc, fromIso, toIso) {
  if (!fromIso && !toIso) return historyDesc;
  var fromMs = fromIso ? new Date(fromIso + 'T00:00:00').getTime() : -Infinity;
  var toMs = toIso ? new Date(toIso + 'T23:59:59').getTime() : Infinity;
  return (historyDesc || []).filter(function (s) {
    var ms = parseFechaLabToMs(s.fecha, s.hora);
    return typeof ms === 'number' && isFinite(ms) && ms >= fromMs && ms <= toMs;
  });
}

/** Re-derive state.historyDesc/historyAsc from the unfiltered history for the given date range. */
export function applyTendGroupDateRange(state, fromIso, toIso) {
  state.rangeFrom = fromIso || '';
  state.rangeTo = toIso || '';
  state.historyDesc = filterHistoryByDateRange(state.historyDescFull, state.rangeFrom, state.rangeTo);
  state.historyAsc = toAscendingHistory(state.historyDesc);
}

export function prepareTendGroupOpen(deps, state, sectionKey) {
  var patientId = deps.getActiveId();
  if (!patientId || !sectionKey) return null;

  var historyDesc = sortLabHistoryChronological(deps.getHistory() || []);
  var eligible = eligibleSpecs(deps, sectionKey, historyDesc);
  if (!canOpenTendGroupModal(sectionKey, historyDesc, eligible)) return null;

  if (sectionKey === 'GASES') state.gasoExtendedFio2 = 0.21;
  state.sectionKey = sectionKey;
  state.patientId = patientId;
  state.historyDescFull = historyDesc;
  state.rangeFrom = '';
  state.rangeTo = '';
  state.historyDesc = historyDesc;
  state.historyAsc = toAscendingHistory(historyDesc);
  state.specsByField = Object.create(null);

  var specsForModal =
    sectionKey === 'BH' ? deps.getCatalogSpecs(sectionKey, historyDesc) || [] : eligible;
  specsForModal.forEach(function (sp) {
    state.specsByField[sp.fieldKey] = sp;
  });
  state.visibleFields = resolveVisibleFields(
    patientId,
    sectionKey,
    eligible.length ? eligible : specsForModal
  );

  return { sectionKey: sectionKey, specsForModal: specsForModal };
}

export function setTendGroupTab(state, name) {
  state.activeTab = name === 'table' ? 'table' : 'charts';
  var chartsPanel = document.getElementById('tend-group-panel-charts');
  var tablePanel = document.getElementById('tend-group-panel-table');
  var tabs = document.querySelectorAll('#tend-group-backdrop .tend-group-tab');
  tabs.forEach(function (btn) {
    var on = btn.getAttribute('data-tab') === state.activeTab;
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  if (chartsPanel) chartsPanel.hidden = state.activeTab !== 'charts';
  if (tablePanel) tablePanel.hidden = state.activeTab !== 'table';
  var track = document.getElementById('tend-group-tabs-track');
  if (track) track.setAttribute('data-active', state.activeTab);
}

export function showTendGroupBackdrop(deps, state, activeTab) {
  var titleEl = document.getElementById('tend-group-title');
  if (titleEl) {
    titleEl.textContent =
      (deps.getSectionLabel(state.sectionKey) || state.sectionKey) + ' — Gráfica del estudio';
  }
  var bd = document.getElementById('tend-group-backdrop');
  if (!bd) return null;
  cancelOverlayClose(bd);
  bd.style.display = 'flex';
  bd.setAttribute('aria-hidden', 'false');
  document.body.classList.add('tend-group-modal-open');
  return { backdrop: bd, activeTab: activeTab || 'charts' };
}

export function renderTendGroupPanels(sectionKey, renderCharts, renderTable) {
  try {
    renderCharts(sectionKey);
  } catch (e) {
    console.error('tend-group renderCharts', e);
    var panelErr = document.getElementById('tend-group-panel-charts');
    if (panelErr) {
      panelErr.innerHTML =
        '<p class="tend-empty">No se pudieron cargar las gráficas. Recarga la app e intenta de nuevo.</p>';
    }
  }
  try {
    renderTable(sectionKey);
  } catch (e) {
    console.error('tend-group renderTable', e);
  }
}

export function copyTendGroupTablePng(deps, state, opts) {
  if (!state.tableModel) {
    if (deps.showToast) deps.showToast('No hay tabla para copiar', 'error');
    return;
  }
  var visibleCols = state.tableModel.columns.filter(function (c) {
    return !c.hidden;
  });
  var visibleRows = state.tableModel.rows.filter(function (r) {
    return !r.hidden;
  });
  if (!visibleCols.length || !visibleRows.length) {
    if (deps.showToast) deps.showToast('Muestra al menos una fila y una columna', 'error');
    return;
  }
  var titleElId = (opts && opts.titleElId) || 'tend-group-title';
  var titleEl = document.getElementById(titleElId);
  var editedTitle = titleEl && titleEl.textContent.trim();
  var fallbackTitle =
    (opts && opts.fallbackTitle) ||
    (deps.getSectionLabel(state.sectionKey) || state.sectionKey || 'Tabla') + ' — Tendencias';
  var title = editedTitle || fallbackTitle;
  copyTableModelAsPng(state.tableModel, title, function (ok) {
    if (deps.showToast) {
      deps.showToast(ok ? 'Tabla copiada como imagen ✓' : 'No se pudo copiar la imagen', ok ? 'success' : 'error');
    }
  });
}

export function copyTendGroupTableText(deps, state) {
  if (!state.tableModel) return;
  copyTableText(buildTableTsv(state.tableModel), function (ok) {
    if (deps.showToast) {
      deps.showToast(ok ? 'Tabla copiada al portapapeles' : 'No se pudo copiar el texto', ok ? 'success' : 'error');
    }
  });
}
