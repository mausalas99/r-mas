/**
 * Pure model: labs-of-day glance (alteraciones-only bento chips per envío).
 * Same-minute clones / complementary panels collapse; different hours stay split.
 */
import { dayKeyFromLabSet } from '../../lab-history-format.mjs';
import { splitResLabsByTipo } from '../../cultivo-block-core.mjs';
import { normalizeHoraLabHistory } from '../../tend-core.mjs';
import { dedupeConsolidatedLabRows } from '../../lab-bulk-paste.mjs';

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

function setsForDayKey(orderedSets, todayKey) {
  const out = [];
  (orderedSets || []).forEach((set) => {
    if (!set || !set.resLabs || !set.resLabs.length) return;
    if (dayKeysMatch(dayKeyFromLabSet(set), todayKey)) out.push(set);
  });
  return out;
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

function isNumericChipLabel(label) {
  return /^[\d.,]+$/.test(String(label || '').replace(/\*$/, ''));
}

/**
 * Glance chip copy: analyte + value (`Cr 1.4*`), never a bare number.
 * @param {{ label?: string, value?: string, raw?: string }} chip
 */
export function formatAlteredChip(chip) {
  const value = String((chip && (chip.value || chip.raw)) || '').trim();
  const label = String((chip && chip.label) || '').trim();
  if (!label || isNumericChipLabel(label)) return value;
  if (!value) return label;
  if (value === label || value.startsWith(label)) return value;
  return label + ' ' + value;
}

/**
 * One pass over a row's tokens: altered chips (label + value with `*`) plus a
 * count of in-range numeric values and a label→value map for trend lookups.
 */
function tokenStatsFromTokens(tokens) {
  const chips = [];
  const valuesByLabel = Object.create(null);
  let normalCount = 0;
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
      valuesByLabel[tok.toUpperCase()] = next.replace(/\*$/, '');
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
      valuesByLabel[tok.toUpperCase()] = next;
      normalCount += 1;
      i += 2;
    } else {
      i += 1;
    }
  }
  return { chips, normalCount, valuesByLabel };
}

function alteredChipsFromTokens(tokens) {
  return tokenStatsFromTokens(tokens).chips;
}

function countLabSections(labRows) {
  const seen = new Set();
  labRows.forEach((row) => {
    const label = sectionLabelFromRow(row);
    if (label) seen.add(label.toUpperCase());
  });
  return seen.size;
}

/**
 * Groups altered chips per lab section (unchanged shape) plus the in-range
 * value count and a tipo|label → value map, used to render the "en rango"
 * one-liner and the fuera-de-rango trend column.
 */
function buildGroupsFromLabRows(labRows) {
  const groups = [];
  let normalCount = 0;
  const valuesByKey = Object.create(null);
  labRows.forEach((row) => {
    const tipo = sectionLabelFromRow(row);
    const stats = tokenStatsFromTokens(bodyTokensFromRow(row));
    normalCount += stats.normalCount;
    Object.keys(stats.valuesByLabel).forEach((label) => {
      valuesByKey[tipo.toUpperCase() + '|' + label] = stats.valuesByLabel[label];
    });
    if (!stats.chips.length) return;
    groups.push({ tipo, chips: stats.chips });
  });
  return { groups, normalCount, valuesByKey };
}

function labRowsFromResLabs(resLabs) {
  const split = splitResLabsByTipo(resLabs || []);
  return split.labs.filter((row) => String(row == null ? '' : row).trim());
}

function horaKey(set) {
  const h = normalizeHoraLabHistory(set && set.hora);
  return h ? String(h).trim().slice(0, 5) : '';
}

function mergeClusterResLabs(sets) {
  let merged = [];
  (sets || []).forEach((set) => {
    const rows = (set && set.resLabs) || [];
    if (!rows.length) return;
    if (merged.length) merged.push('');
    merged = merged.concat(rows);
  });
  return dedupeConsolidatedLabRows(merged, 'labs');
}

function clusterSetsByHora(sets) {
  const byHora = Object.create(null);
  const order = [];
  (sets || []).forEach((set) => {
    const key = horaKey(set) || '\0' + String(set && set.id != null ? set.id : order.length);
    if (!byHora[key]) {
      byHora[key] = [];
      order.push(key);
    }
    byHora[key].push(set);
  });
  return order.map((key) => {
    const cluster = byHora[key];
    return {
      hora: key.charAt(0) === '\0' ? '' : key,
      sets: cluster,
      resLabs: mergeClusterResLabs(cluster),
    };
  });
}

function buildEnvioFromCluster(cluster) {
  const keeper = (cluster.sets && cluster.sets[0]) || {};
  const labRows = labRowsFromResLabs(cluster.resLabs);
  if (!labRows.length) return null;
  const built = buildGroupsFromLabRows(labRows);
  return {
    id: keeper.id,
    hora: cluster.hora || horaKey(keeper),
    wide: countLabSections(labRows) >= 3,
    groups: built.groups,
    normalCount: built.normalCount,
    valuesByKey: built.valuesByKey,
  };
}

function chronoSortKey(hora, idx) {
  return (hora || '99:99') + '_' + String(idx).padStart(6, '0');
}

/**
 * Fills in `chip.delta` / `chip.trend` ('up'|'down'|'flat') for altered chips
 * by comparing against the most recent earlier envío of the same day with a
 * value for that tipo+label, walked in chronological (not array) order.
 */
function attachTrend(candidates) {
  const indexed = candidates.map((c, i) => ({ c, i }));
  indexed.sort((a, b) => {
    const ka = chronoSortKey(a.c.hora, a.i);
    const kb = chronoSortKey(b.c.hora, b.i);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  const running = Object.create(null);
  indexed.forEach(({ c }) => {
    c.groups.forEach((g) => {
      const tipoKey = String(g.tipo || '').toUpperCase();
      g.chips.forEach((chip) => {
        const key = tipoKey + '|' + String(chip.label || '').toUpperCase();
        const prevRaw = running[key];
        if (prevRaw === undefined) return;
        const prevNum = parseFloat(prevRaw);
        const curNum = parseFloat(String(chip.value).replace('*', ''));
        if (Number.isNaN(prevNum) || Number.isNaN(curNum)) return;
        const diff = Math.round((curNum - prevNum) * 100) / 100;
        chip.trend = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
        chip.delta = (diff > 0 ? '+' : diff < 0 ? '-' : '') + Math.abs(diff);
      });
    });
    Object.keys(c.valuesByKey).forEach((key) => {
      running[key] = c.valuesByKey[key];
    });
  });
}

/**
 * @param {{ todayKey: string, orderedSets: unknown[] }} params
 * @returns {{
 *   envios: Array<{ id: string, hora: string, wide: boolean, groups: Array<{ tipo: string, chips: Array<{ raw: string, label: string, value: string, delta?: string, trend?: string }> }> }>,
 *   enRangoCount: number,
 * }}
 */
export function buildLabsGlanceForDay({ todayKey, orderedSets } = {}) {
  const daySets = setsForDayKey(orderedSets, todayKey);
  if (!daySets.length) return { envios: [], enRangoCount: 0 };
  const candidates = clusterSetsByHora(daySets).map(buildEnvioFromCluster).filter(Boolean);
  attachTrend(candidates);
  const enRangoCount = candidates.reduce((sum, c) => sum + c.normalCount, 0);
  const envios = candidates
    .filter((c) => c.groups.length > 0)
    .map((c) => ({ id: c.id, hora: c.hora, wide: c.wide, groups: c.groups }));
  return { envios, enRangoCount };
}
