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
  const groups = buildGroupsFromLabRows(labRows);
  if (!groups.length) return null;
  return {
    id: keeper.id,
    hora: cluster.hora || horaKey(keeper),
    wide: countLabSections(labRows) >= 3,
    groups,
  };
}

/**
 * @param {{ todayKey: string, orderedSets: unknown[] }} params
 * @returns {{ envios: Array<{ id: string, hora: string, wide: boolean, groups: Array<{ tipo: string, chips: Array<{ raw: string, label: string, value: string }> }> }> }}
 */
export function buildLabsGlanceForDay({ todayKey, orderedSets } = {}) {
  const daySets = setsForDayKey(orderedSets, todayKey);
  if (!daySets.length) return { envios: [] };
  return {
    envios: clusterSetsByHora(daySets).map(buildEnvioFromCluster).filter(Boolean),
  };
}
