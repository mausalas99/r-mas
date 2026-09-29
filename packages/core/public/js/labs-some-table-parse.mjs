/** SOME report table parser entry. */
import { dispatchSomeParseLine, finalizeSomeDepartments } from './labs-some-table-parse-loop.mjs';
import {
  cleanEstudio,
  isMetadataLine,
  isDepartmentLine,
  departmentKey,
  isTableHeaderLine,
  normalizeDeptKey,
  isSectionDividerRow,
  isSectionDividerEstudio,
  skipSectionDividerBlock,
  isFlagToken,
  isCitoGroupTitle,
  CITO_GROUP_RE,
  isSkippedGroupTitle,
  isCommentNoiseEstudio,
  isLikelyGroupTitle,
  FLATTEN_DEPT_KEYS,
  isStudyRowHeader,
  isSerumQcAnalyte,
  stripCommentNoiseFromDepartment,
} from './labs-some-table-helpers.mjs';
import {
  parseBacteriologiaCultureGroup,
  readRowAt,
  isCultureSampleTitle,
} from './labs-some-table-row.mjs';
import {
  normalizeSomeGroup,
  flattenDeptGroups,
} from './labs-some-table-normalize.mjs';

var FOOTER_START_RE = /Responsable\s+Sanitario/i;

/**
 * The report's signature footer («… Responsable Sanitario», «Sistema SOME …», lab address,
 * accession, patient name) is not a study. Drop it up to the next department, table header
 * or «Expediente:» line, so its lines never become rows.
 */
function stripReportFooters_(lines) {
  var out = [];
  for (var i = 0; i < lines.length; i++) {
    if (!FOOTER_START_RE.test(lines[i])) {
      out.push(lines[i]);
      continue;
    }
    // «&» opens the footer one or two lines above the signature line.
    while (out.length && !cleanEstudio(out[out.length - 1])) out.pop();
    if (out.length && cleanEstudio(out[out.length - 1]) === '&') out.pop();
    var j = i + 1;
    while (j < lines.length) {
      var t = cleanEstudio(lines[j]);
      if (isDepartmentLine(t) || isTableHeaderLine(t) || /^Expediente\s*:/i.test(t)) break;
      j++;
    }
    i = j - 1;
  }
  return out;
}

export function parseSomeReportTables(textoBruto) {
  if (!textoBruto || typeof textoBruto !== 'string') {
    return { departments: [] };
  }

  var lines = stripReportFooters_(textoBruto.replace(/\r/g, '').split('\n'));
  var state = {
    departments: [],
    currentDept: null,
    currentGroup: null,
    skipSection: false,
  };

  function ensureDept(key) {
    if (state.currentDept && state.currentDept.key === key) return state.currentDept;
    state.currentDept = { key: key, label: key, groups: [] };
    state.departments.push(state.currentDept);
    state.currentGroup = null;
    return state.currentDept;
  }

  function ensureGroup(title) {
    if (!state.currentDept) return null;
    var t = title || '';
    if (state.currentGroup && state.currentGroup.title === t) return state.currentGroup;
    state.currentGroup = {
      title: t,
      rows: [],
      tableVariant: isCitoGroupTitle(t) ? 'cito' : 'standard',
      fluidSource: '',
    };
    state.currentDept.groups.push(state.currentGroup);
    return state.currentGroup;
  }

  var h = {
    cleanEstudio,
    isMetadataLine,
    isDepartmentLine,
    departmentKey,
    isTableHeaderLine,
    normalizeDeptKey,
    isCultureSampleTitle,
    parseBacteriologiaCultureGroup,
    isSectionDividerRow,
    isSectionDividerEstudio,
    skipSectionDividerBlock,
    isFlagToken,
    isCitoGroupTitle,
    CITO_GROUP_RE,
    isSkippedGroupTitle,
    isCommentNoiseEstudio,
    readRowAt,
    isLikelyGroupTitle,
    FLATTEN_DEPT_KEYS,
    isStudyRowHeader,
    isSerumQcAnalyte,
    ensureDept,
    ensureGroup,
    normalizeSomeGroup,
    flattenDeptGroups,
    stripCommentNoiseFromDepartment,
  };

  for (var i = 0; i < lines.length; i++) {
    var trimmed = cleanEstudio(lines[i]);
    if (!trimmed || isMetadataLine(trimmed)) continue;
    var nextI = dispatchSomeParseLine(state, lines, i, trimmed, h);
    if (nextI != null) i = nextI;
  }

  return { departments: finalizeSomeDepartments(state.departments, h) };
}
