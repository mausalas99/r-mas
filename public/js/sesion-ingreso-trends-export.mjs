import {
  classifyTendPanelFamily,
  columnSetsForFields,
  getSetTrendValueForSeries,
  buildTrendAxisMeta,
  sortLabHistoryChronological,
  tendEligibleSectionKey,
  dedupeTrendSetsForSeries,
  isPercentPanelFamily,
} from './tend-core.mjs';
import {
  DEFAULT_PANEL_LABELS,
  readGroupVisibleFields,
  readSeriesColor,
  defaultSeriesColor,
} from './tend-prefs.mjs';
import { formatTendSeriesLabel } from './tend-core.mjs';

const MIN_POINTS = 2;

let rt = {
  buildCatalog() {
    return [];
  },
  sectionLabel(sectionKey) {
    return sectionKey;
  },
  unitForField(fieldKey) {
    return '';
  },
  getPatientId() {
    return '';
  },
};

export function registerSesionIngresoTrendsRuntime(ctx) {
  if (!ctx || typeof ctx !== 'object') return;
  Object.assign(rt, ctx);
}

function panelTitle(familyKey) {
  return DEFAULT_PANEL_LABELS[familyKey] || familyKey;
}

function panelId(sectionKey, family) {
  return `${sectionKey}:${family}`;
}

function specHasTrendPoints(historyDesc, sectionKey, fieldKey) {
  const raw = (historyDesc || []).filter((s) => getSetTrendValueForSeries(s, sectionKey, fieldKey) != null);
  return dedupeTrendSetsForSeries(raw, sectionKey, fieldKey).length >= MIN_POINTS;
}

function seriesLabel(sectionKey, spec) {
  const unit = rt.unitForField(spec.fieldKey);
  return formatTendSeriesLabel(spec.cardTitle || spec.fieldKey, spec.fieldKey, unit).name;
}

function buildPanelChart(sectionKey, family, histAsc, histDesc, catalog, patientId) {
  const specs = catalog.filter((spec) => {
    if (spec.sectionKey !== sectionKey) return false;
    const unit = rt.unitForField(spec.fieldKey);
    return classifyTendPanelFamily(sectionKey, spec.fieldKey, unit) === family;
  });

  const items = specs
    .map((spec, index) => ({ spec, index }))
    .filter(({ spec }) => specHasTrendPoints(histDesc, sectionKey, spec.fieldKey));

  if (!items.length) return null;

  const fieldKeys = items.map(({ spec }) => spec.fieldKey);
  const colSets = columnSetsForFields(histAsc, sectionKey, fieldKeys);
  if (colSets.length < MIN_POINTS) return null;

  const axisMeta = buildTrendAxisMeta(colSets);
  const labels = axisMeta.labels || [];
  const savedVisible = readGroupVisibleFields(patientId, sectionKey);

  const series = items
    .map(({ spec, index }) => {
      const fk = spec.fieldKey;
      const values = axisMeta.points.map((p) => {
        const v = getSetTrendValueForSeries(p.set, sectionKey, fk);
        return v != null && Number.isFinite(v) ? v : null;
      });
      if (!values.some((v) => v != null)) return null;
      let visible = true;
      if (savedVisible && savedVisible.length) {
        visible = savedVisible.includes(fk);
      }
      return {
        fieldKey: fk,
        label: seriesLabel(sectionKey, spec),
        color: readSeriesColor(sectionKey, fk) || defaultSeriesColor(index),
        visible,
        unit: rt.unitForField(fk) || '',
        values,
      };
    })
    .filter(Boolean);

  if (!series.length) return null;

  return {
    id: panelId(sectionKey, family),
    family,
    title: panelTitle(family),
    labels,
    percentAxis: isPercentPanelFamily(family),
    series,
  };
}

export function listSelectablePanels(history, patientId) {
  const histAsc = sortLabHistoryChronological(history || []);
  const histDesc = histAsc.slice().reverse();
  const catalog = rt.buildCatalog(histAsc);
  const panels = [];
  const seenFamilies = new Set();

  for (const spec of catalog) {
    const sectionKey = spec.sectionKey;
    if (!tendEligibleSectionKey(sectionKey)) continue;
    const unit = rt.unitForField(spec.fieldKey);
    const family = classifyTendPanelFamily(sectionKey, spec.fieldKey, unit);
    const id = panelId(sectionKey, family);
    if (seenFamilies.has(id)) continue;
    seenFamilies.add(id);

    const chart = buildPanelChart(sectionKey, family, histAsc, histDesc, catalog, patientId);
    if (!chart) continue;

    panels.push({
      id,
      sectionKey,
      sectionLabel: rt.sectionLabel(sectionKey),
      title: chart.title,
      seriesCount: chart.series.length,
    });
  }

  return panels;
}

export function defaultSelectedPanelIds(panels) {
  return panels.map((p) => p.id);
}

export function buildLabTrendsPayload(history, patientLabel, { panelIds = null, patientId = '' } = {}) {
  const pid = patientId || rt.getPatientId();
  const histAsc = sortLabHistoryChronological(history || []);
  const histDesc = histAsc.slice().reverse();
  const catalog = rt.buildCatalog(histAsc);
  const idSet = panelIds ? new Set(panelIds) : null;

  const sectionMap = new Map();
  const seenPanels = new Set();

  for (const spec of catalog) {
    const sectionKey = spec.sectionKey;
    if (!tendEligibleSectionKey(sectionKey)) continue;
    const unit = rt.unitForField(spec.fieldKey);
    const family = classifyTendPanelFamily(sectionKey, spec.fieldKey, unit);
    const id = panelId(sectionKey, family);
    if (idSet && !idSet.has(id)) continue;
    if (seenPanels.has(id)) continue;
    seenPanels.add(id);

    const chart = buildPanelChart(sectionKey, family, histAsc, histDesc, catalog, pid);
    if (!chart) continue;

    if (!sectionMap.has(sectionKey)) {
      sectionMap.set(sectionKey, {
        sectionKey,
        sectionLabel: rt.sectionLabel(sectionKey),
        groups: [],
      });
    }
    sectionMap.get(sectionKey).groups.push(chart);
  }

  const trends = [...sectionMap.values()].filter((s) => s.groups.length > 0);

  return {
    version: 2,
    source: 'r-plus',
    kind: 'lab-trends',
    patientLabel: patientLabel || '',
    trends,
  };
}

/** @deprecated use listSelectablePanels */
export function listTrendSections(payload) {
  return (payload?.trends || []).map((section) => ({
    id: section.sectionKey,
    label: section.sectionLabel || section.sectionKey,
    groupCount: section.groups?.length ?? 0,
    seriesCount: (section.groups || []).reduce((n, g) => n + (g.series?.length ?? 0), 0),
  }));
}

export function defaultTrendSectionIds(sections) {
  return sections.map((s) => s.id);
}
