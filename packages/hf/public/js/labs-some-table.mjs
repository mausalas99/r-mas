/**
 * Parser y exportación de tablas SOME por tipo de estudio (departamento + subgrupo).
 * Complementa procesarLabs: conserva filas tabulares del reporte original.
 */
import { looksLikeSomeLabReport } from './labs-report-refs.mjs';
import { parseSomeReportTables } from './labs-some-table-parse.mjs';

export { SOME_DEPARTMENTS, formatSomeResultado } from './labs-some-table-helpers.mjs';
export { parseSomeReportTables };
export {
  buildSomeGroupExportModel,
  buildSomeGroupTsv,
  buildSomeDeptTsv,
  buildSomeDeptExportModel,
} from './labs-some-table-export.mjs';
export {
  renderSomeTableGroupHtml,
  renderSomeReportTablesHtml,
  coalesceGroupsForModal,
} from './labs-some-table-render.mjs';
export {
  exportSomeGroupCopy,
  exportSomeDeptCopy,
  wireSomeTableExportButtons,
} from './labs-some-table-wire.mjs';

function uniqueSourceTexts(sources) {
  const unique = [];
  (Array.isArray(sources) ? sources : [sources]).forEach((s) => {
    const t = String(s || '').trim();
    if (t && unique.indexOf(t) < 0) unique.push(t);
  });
  return unique;
}

function parsedIfDepartments(parsed) {
  if (parsed && parsed.departments && parsed.departments.length) return parsed;
  return null;
}

/** First SOME source that yields departments; then a join of all SOME texts. */
export function parseSomeTablesFromSources(sources) {
  const unique = uniqueSourceTexts(sources);
  let i;
  for (i = 0; i < unique.length; i++) {
    if (!looksLikeSomeLabReport(unique[i])) continue;
    const hit = parsedIfDepartments(parseSomeReportTables(unique[i]));
    if (hit) return hit;
  }
  const someOnly = unique.filter(looksLikeSomeLabReport);
  if (someOnly.length < 2) return null;
  return parsedIfDepartments(parseSomeReportTables(someOnly.join('\n\n---\n\n')));
}
