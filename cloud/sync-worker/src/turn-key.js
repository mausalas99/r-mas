export const TURN_KEY_TIMEZONE = 'America/Mexico_City';

/**
 * Calendar turn key (YYYY-MM-DD) in Mexico City local date.
 * @param {Date} [now]
 * @returns {string}
 */
export function defaultTurnKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TURN_KEY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  /** @type {Record<string, string>} */
  const map = {};
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }
  return `${map.year}-${map.month}-${map.day}`;
}
