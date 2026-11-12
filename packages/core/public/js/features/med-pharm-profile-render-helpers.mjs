import { rowSomePharmCategory } from '../med-pharm-some-catalog.mjs';
import { formatFreqShort, formatViaShort } from '../med-pharm-profile-core.mjs';
import { adherenceStatsForRowKeys } from '../med-pharm-view-window.mjs';
import {
  formatViaListAbbrev,
  medGroupListTooltip,
  isMedPharmGroupHidden,
} from './med-pharm-profile-state.mjs';
import {
  buildAdhTriggerModelForGroup,
  wireMedPharmAdhHoverPanels,
} from './med-pharm-profile-adh.mjs';
import {
  openMedPharmPasteModal,
  openMedPharmMedGroupModal,
} from './med-pharm-profile-modals.mjs';
import {
  clearMedPharmHost,
  drawMedPharmSummaryList,
  drawMedPharmEmptyColumns,
  drawMedPharmEmptyFilter,
} from './med-pharm-profile-view.jsx';

export function updateMedPharmLastPasteEl(lastPasteEl, month) {
  if (!lastPasteEl) return;
  var pasted = month && month.lastSomePasteAt;
  if (!pasted) {
    lastPasteEl.hidden = true;
    return;
  }
  var d = new Date(pasted);
  lastPasteEl.textContent =
    'Último pegado: ' +
    String(d.getDate()).padStart(2, '0') +
    '/' +
    String(d.getMonth() + 1).padStart(2, '0') +
    '/' +
    d.getFullYear();
  lastPasteEl.hidden = false;
}

export function renderMedPharmNoPatientState(hint, list) {
  if (hint) {
    hint.style.display = 'block';
    hint.textContent = 'Selecciona un paciente para ver el perfil farmacoterapéutico.';
  }
  clearMedPharmHost(list);
}

export function renderMedPharmEmptyColumns(list, window, card, listHead) {
  if (card) card.classList.remove('med-pharm-has-grid');
  if (listHead) listHead.style.display = '';
  list.className = 'med-pharm-list-body';
  drawMedPharmEmptyColumns(list, { label: window.label, onImport: openMedPharmPasteModal });
}

export function renderMedPharmEmptyFilter(list, hiddenCount, card, listHead, showHiddenMedRows) {
  if (card) card.classList.remove('med-pharm-has-grid');
  if (listHead) listHead.style.display = hiddenCount > 0 && showHiddenMedRows ? '' : 'none';
  list.className = 'med-pharm-list-body';
  drawMedPharmEmptyFilter(list, { hiddenCount: hiddenCount });
}

/** Plain model of one grouped med row (drawn by med-pharm-profile-view.jsx). */
function buildMedPharmSummaryRow(group, columns, profile, windowLabel) {
  var current = group.currentVariant;
  var stats = adherenceStatsForRowKeys(profile, group.rowKeys, columns);
  return {
    hidden: isMedPharmGroupHidden(group),
    hasMisses: stats.missed > 0,
    tooltip: medGroupListTooltip(group),
    name: group.med || '',
    regimens: group.variants.length > 1 ? group.variants.length : 0,
    cat: rowSomePharmCategory(current),
    adh: buildAdhTriggerModelForGroup(group, stats, columns, profile, windowLabel),
    freq: formatFreqShort(current.freq),
    via: formatViaListAbbrev(current.via),
    viaTitle: formatViaShort(current.via),
    medGroupKey: group.medGroupKey,
    rowKeys: group.rowKeys.join('\t'),
  };
}

export function buildMedPharmSummaryModel(groups, window, profile) {
  return groups.map(function (group) {
    return buildMedPharmSummaryRow(group, window.columns, profile, window.label);
  });
}

export function renderMedPharmSummaryList(listEl, groups, window, profile) {
  drawMedPharmSummaryList(listEl, {
    rows: buildMedPharmSummaryModel(groups, window, profile),
    onDays: openMedPharmMedGroupModal,
  });
  wireMedPharmAdhHoverPanels(listEl);
}
