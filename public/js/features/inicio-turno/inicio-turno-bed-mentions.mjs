/**
 * Inicio de turno (screen 12a) — "Entrega de …" card mentions.
 * Extracts bed/room-like tokens (e.g. "219", "214-B") from a free-text
 * handoff paragraph so the panel can show "3 pacientes mencionados · 219, 214-B, 222"
 * without a resident having to tag them by hand.
 *
 * Heuristic: hospital bed numbers in this app are 3–4 digits, optionally with a
 * "-LETTER" wing suffix (see `cuarto`/`cama` patient fields). Clock times
 * (23:00, 04:20) never match because their hour/minute parts are only 2 digits,
 * and the colon guard below is a second line of defense for any edge case.
 */

const BED_TOKEN_RE = /\b(\d{3,4}(?:-[A-Za-z])?)\b/g;

/**
 * @param {string|null|undefined} text
 * @returns {string[]} bed labels, de-duplicated, in first-mention order
 */
export function extractMentionedBeds(text) {
  const s = String(text || '');
  if (!s.trim()) return [];

  const seen = new Set();
  const beds = [];
  let m;
  BED_TOKEN_RE.lastIndex = 0;
  while ((m = BED_TOKEN_RE.exec(s))) {
    const before = s[m.index - 1];
    const after = s[m.index + m[0].length];
    if (before === ':' || after === ':') continue; // defensive: never split a clock time
    const bed = m[1].toUpperCase();
    if (seen.has(bed)) continue;
    seen.add(bed);
    beds.push(bed);
  }
  return beds;
}

/**
 * @param {string|null|undefined} text
 * @returns {string} e.g. "3 pacientes mencionados · 219, 214-B, 222", or '' when none
 */
export function mentionedBedsSummaryLabel(text) {
  const beds = extractMentionedBeds(text);
  if (!beds.length) return '';
  const noun = beds.length === 1 ? 'paciente mencionado' : 'pacientes mencionados';
  return `${beds.length} ${noun} · ${beds.join(', ')}`;
}
