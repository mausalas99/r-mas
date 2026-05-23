import { buildSomeGroupExportModel } from './labs-some-table.mjs';

function isAdmissionTitle(title) {
  return /al\s+ingreso/i.test(String(title || ''));
}

function parseNumericFromResult(text) {
  const s = String(text ?? '').trim().replace(/\*/g, '').replace(/^<\s*/, '');
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function parseRangeBounds(rangeText) {
  const match = String(rangeText ?? '').match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
  if (!match) return null;
  const min = parseFloat(match[1]);
  const max = parseFloat(match[2]);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return { min, max };
}

export function mapFlag(row) {
  if (!row.abnormal) return '';
  const resultNum = parseNumericFromResult(row.result);
  const bounds = parseRangeBounds(row.range);
  if (resultNum != null && bounds) {
    if (resultNum < bounds.min) return 'low';
    if (resultNum > bounds.max) return 'high';
  }
  const f = String(row.flag || '').trim();
  if (/^(\*|A|B|CB|CA)$/i.test(f)) return 'high';
  return 'abnormal';
}

export function formatTabTitleWithContext(tabTitle, reportDate) {
  const base = String(tabTitle || '').trim();
  if (!base) return base;
  const date = String(reportDate || '').trim();
  if (!date || date === 'Anterior') return base;
  const shortDate = date.length >= 5 && date.includes('/') ? date.slice(0, 5) : date;
  if (base.includes(shortDate) || base.includes(date)) return base;
  return `${shortDate} · ${base}`;
}

export function groupToSesionTable(group, meta) {
  const model = buildSomeGroupExportModel(group);
  const rows = (model.rows || []).map((r) => {
    const resultCell = r.cells?.[0] || {};
    const rangeCell = r.cells?.[1] || {};
    const rowMeta = {
      result: resultCell.text || '',
      range: rangeCell.text || '',
      abnormal: resultCell.abnormal,
      flag: resultCell.flag,
    };
    return {
      variable: r.label || '',
      result: rowMeta.result,
      range: rowMeta.range,
      flag: mapFlag(rowMeta),
    };
  });
  return {
    tabTitle: formatTabTitleWithContext(meta.tabTitle, meta.reportDate),
    isAdmission: !!meta.isAdmission,
    columns: ['variable', 'result', 'range', 'flag'],
    rows,
  };
}

export function listSelectableTables(parsed, { reportDate } = {}) {
  const items = [];
  if (!parsed?.departments?.length) return items;
  parsed.departments.forEach((dept, deptIndex) => {
    const deptLabel = dept.label || dept.key || 'Departamento';
    (dept.groups || []).forEach((group, groupIndex) => {
      if (!group.rows?.length) return;
      const groupTitle = group.title ? String(group.title).trim() : '';
      const baseTitle = groupTitle ? `${deptLabel} — ${groupTitle}` : deptLabel;
      const tabTitle = formatTabTitleWithContext(baseTitle, reportDate);
      const admission = isAdmissionTitle(groupTitle) || isAdmissionTitle(deptLabel);
      items.push({
        id: `${deptIndex}:${groupIndex}`,
        deptIndex,
        groupIndex,
        tabTitle,
        isAdmission: admission,
        rowCount: group.rows.length,
      });
    });
  });
  return items;
}

export function buildSesionPayload(selectedIds, parsed, patientLabel, options = {}) {
  const { reportDate = '' } = options;
  const idSet = new Set(selectedIds || []);
  const tables = listSelectableTables(parsed, { reportDate })
    .filter((item) => idSet.has(item.id))
    .map((item) => {
      const dept = parsed.departments[item.deptIndex];
      const group = dept?.groups?.[item.groupIndex];
      if (!group) return null;
      return groupToSesionTable(group, {
        tabTitle: item.tabTitle,
        isAdmission: item.isAdmission,
        reportDate,
      });
    })
    .filter(Boolean);

  tables.sort((a, b) => {
    if (a.isAdmission && !b.isAdmission) return -1;
    if (!a.isAdmission && b.isAdmission) return 1;
    return 0;
  });

  return {
    version: 1,
    source: 'r-plus',
    kind: 'lab-tables',
    patientLabel: patientLabel || '',
    tables,
  };
}

export function defaultSelectedIds(items) {
  const admission = items.filter((i) => i.isAdmission).map((i) => i.id);
  if (admission.length) return admission;
  return items.slice(0, 1).map((i) => i.id);
}
