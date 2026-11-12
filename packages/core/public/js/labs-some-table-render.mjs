/** SOME table model: the rules (normalising, merging for the modal, labels, counts). labs-some-table-view.jsx draws it. */
import { formatSomeResultado } from './labs-some-table-helpers.mjs';
import { normalizeSomeGroup } from './labs-some-table-normalize.mjs';

/**
 * Modal: merge consecutive standard groups so one department → one thead
 * (avoids repeating Estudio/Resultado/Valor de Referencia).
 * Cito groups stay separate (2 columns).
 * @param {Array<object>} groups
 * @returns {Array<object>}
 */
export function coalesceGroupsForModal(groups) {
  var list = Array.isArray(groups) ? groups : [];
  var out = [];
  var bucket = null;
  list.forEach(function (group) {
    var g = normalizeSomeGroup(group || { rows: [] });
    if (!(g.rows && g.rows.length)) return;
    if (g.tableVariant === 'cito') {
      if (bucket) {
        out.push(bucket);
        bucket = null;
      }
      out.push(g);
      return;
    }
    if (!bucket) {
      bucket = {
        title: '',
        rows: g.rows.slice(),
        tableVariant: 'standard',
      };
      return;
    }
    bucket.rows = bucket.rows.concat(g.rows);
  });
  if (bucket) out.push(bucket);
  return out;
}

function someDeptRowCounts_(dept) {
  var total = 0;
  var abnormal = 0;
  (dept.groups || []).forEach(function (group) {
    (normalizeSomeGroup(group).rows || []).forEach(function (r) {
      total++;
      if (r.abnormal) abnormal++;
    });
  });
  return { total: total, abnormal: abnormal };
}


function someGroupModel_(group, dept, di, gi, options, modalLayout) {
  var g = normalizeSomeGroup(group);
  var rows = g.rows || [];
  if (!rows.length) return null;
  var isCito = g.tableVariant === 'cito';
  var exportLabel = (dept.label + (g.title ? ' — ' + g.title : '')).trim();
  if (isCito && g.fluidSource) exportLabel += ' — ' + g.fluidSource;
  return {
    tableId: 'some-' + di + '-' + gi,
    deptIndex: di,
    groupIndex: gi,
    isCito: isCito,
    title: g.title && !options.hideGroupTitles ? String(g.title) : '',
    fluidSource: isCito && g.fluidSource ? g.fluidSource : '',
    exportLabel: exportLabel,
    toolbar: !modalLayout,
    rows: rows.map(function (r) {
      return {
        abnormal: !!r.abnormal,
        flag: r.flag && r.flag !== '*' ? r.flag : '',
        estudio: r.estudio,
        unidades: r.unidades || '',
        ref: r.ref || '',
        display: formatSomeResultado(r),
      };
    }),
  };
}

/**
 * @param {{ departments?: Array<object> }} parsed
 * @param {{ hideGroupTitles?: boolean, modalLayout?: boolean }} [opts]
 * @returns {{ modal: boolean, tabs: Array<{ label: string, abnormal: number }>, depts: Array<object> } | null}
 */
export function buildSomeTablesModel(parsed, opts) {
  var options = opts || {};
  if (!parsed || !parsed.departments || !parsed.departments.length) return null;
  var modalLayout = !!options.modalLayout;
  return {
    modal: modalLayout,
    tabs: parsed.departments.map(function (dept) {
      return { label: dept.label, abnormal: someDeptRowCounts_(dept).abnormal };
    }),
    depts: parsed.departments.map(function (dept, di) {
      var groups = modalLayout ? coalesceGroupsForModal(dept.groups) : dept.groups;
      return {
        key: dept.key,
        label: dept.label,
        index: di,
        total: someDeptRowCounts_(dept).total,
        groups: groups
          .map(function (group, gi) {
            return someGroupModel_(group || { rows: [] }, dept, di, gi, options, modalLayout);
          })
          .filter(Boolean),
      };
    }),
  };
}
