import { buildSomeGroupExportModel } from './labs-some-table.mjs';

function isAdmissionTitle(title) {
  return /al\s+ingreso/i.test(String(title || ''));
}

function mapFlag(row) {
  if (!row.abnormal) return '';
  const f = String(row.flag || '').trim();
  if (/^(\*|A|B|CB|CA)$/i.test(f)) return 'high';
  return 'abnormal';
}

export function groupToSesionTable(group, meta) {
  const model = buildSomeGroupExportModel(group);
  const rows = (model.rows || []).map((r) => {
    const resultCell = r.cells?.[0] || {};
    const rangeCell = r.cells?.[1] || {};
    return {
      variable: r.label || '',
      result: resultCell.text || '',
      range: rangeCell.text || '',
      flag: mapFlag({ abnormal: resultCell.abnormal, flag: resultCell.flag }),
    };
  });
  return {
    tabTitle: meta.tabTitle,
    isAdmission: !!meta.isAdmission,
    columns: ['variable', 'result', 'range', 'flag'],
    rows,
  };
}

export function listSelectableTables(parsed) {
  const items = [];
  if (!parsed?.departments?.length) return items;
  parsed.departments.forEach((dept, deptIndex) => {
    const deptLabel = dept.label || dept.key || 'Departamento';
    (dept.groups || []).forEach((group, groupIndex) => {
      if (!group.rows?.length) return;
      const groupTitle = group.title ? String(group.title).trim() : '';
      const tabTitle = groupTitle ? `${deptLabel} — ${groupTitle}` : deptLabel;
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

export function buildSesionPayload(selectedIds, parsed, patientLabel) {
  const idSet = new Set(selectedIds || []);
  const tables = listSelectableTables(parsed)
    .filter((item) => idSet.has(item.id))
    .map((item) => {
      const dept = parsed.departments[item.deptIndex];
      const group = dept?.groups?.[item.groupIndex];
      if (!group) return null;
      return groupToSesionTable(group, {
        tabTitle: item.tabTitle,
        isAdmission: item.isAdmission,
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
    patientLabel: patientLabel || '',
    tables,
  };
}

export function defaultSelectedIds(items) {
  const admission = items.filter((i) => i.isAdmission).map((i) => i.id);
  if (admission.length) return admission;
  return items.slice(0, 1).map((i) => i.id);
}
