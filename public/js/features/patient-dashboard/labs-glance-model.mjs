/**
 * Pure model: labs-of-day glance (alteraciones-only bento chips per envío).
 */
import { groupLabHistoryByDay } from '../../lab-history-format.mjs';
import { splitResLabsByTipo } from '../../cultivo-block-core.mjs';
import { normalizeHoraLabHistory } from '../../tend-core.mjs';

function dayKeysMatch(left, right) {
  if (left === right) return true;
  if (!left || !right) return false;
  const norm = (key) =>
    String(key)
      .split('-')
      .map((part) => String(parseInt(part, 10)))
      .join('-');
  return norm(left) === norm(right);
}

function pickDayGroup(groups, todayKey) {
  if (!groups.length) return null;
  const match = groups.find((group) => dayKeysMatch(group.dayKey, todayKey));
  return match || groups[0];
}

function sectionLabelFromRow(row) {
  const line = String(row == null ? '' : row)
    .split('\n')[0]
    .trim();
  const tabIdx = line.indexOf('\t');
  if (tabIdx >= 0) return line.slice(0, tabIdx).trim().replace(/:$/, '');
  return line.split(/\s+/)[0].replace(/:$/, '');
}

function bodyTokensFromRow(row) {
  const line = String(row == null ? '' : row)
    .split('\n')[0]
    .trim()
    .replace('\t', ' ');
  const tokens = line.split(/\s+/).filter(Boolean);
  return tokens.slice(1);
}

function alteredChipsFromTokens(tokens) {
  const chips = [];
  let i = 0;
  while (i < tokens.length) {
    const tok = tokens[i];
    if (!tok || tok === '-') {
      i += 1;
      continue;
    }
    const next = tokens[i + 1];
    if (next !== undefined && next.endsWith('*')) {
      chips.push({ raw: next, label: tok, value: next });
      i += 2;
      continue;
    }
    if (tok.endsWith('*')) {
      const label = tok.replace(/\*$/, '');
      chips.push({ raw: tok, label, value: tok });
      i += 1;
      continue;
    }
    if (next !== undefined && !Number.isNaN(parseFloat(String(next).replace('*', '')))) {
      i += 2;
    } else {
      i += 1;
    }
  }
  return chips;
}

function countLabSections(labRows) {
  const seen = new Set();
  labRows.forEach((row) => {
    const label = sectionLabelFromRow(row);
    if (label) seen.add(label.toUpperCase());
  });
  return seen.size;
}

function buildGroupsFromLabRows(labRows) {
  const groups = [];
  labRows.forEach((row) => {
    const tipo = sectionLabelFromRow(row);
    const chips = alteredChipsFromTokens(bodyTokensFromRow(row));
    if (!chips.length) return;
    groups.push({ tipo, chips });
  });
  return groups;
}

function buildEnvioFromSet(set) {
  const split = splitResLabsByTipo(set.resLabs || []);
  const labRows = split.labs.filter((row) => String(row == null ? '' : row).trim());
  if (!labRows.length) return null;
  return {
    id: set.id,
    hora: normalizeHoraLabHistory(set.hora),
    wide: countLabSections(labRows) >= 3,
    groups: buildGroupsFromLabRows(labRows),
  };
}

/**
 * @param {{ todayKey: string, orderedSets: unknown[] }} params
 * @returns {{ envios: Array<{ id: string, hora: string, wide: boolean, groups: Array<{ tipo: string, chips: Array<{ raw: string, label: string, value: string }> }> }> }}
 */
export function buildLabsGlanceForDay({ todayKey, orderedSets }) {
  const dayGroups = groupLabHistoryByDay(orderedSets);
  const dayGroup = pickDayGroup(dayGroups, todayKey);
  if (!dayGroup) return { envios: [] };
  return {
    envios: dayGroup.sets.map(buildEnvioFromSet).filter(Boolean),
  };
}
