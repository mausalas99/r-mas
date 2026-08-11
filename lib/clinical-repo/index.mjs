import { runEventualidadesCommand } from './commands/eventualidades.mjs';

const EVENTUALIDAD_TYPES = new Set([
  'eventualidad.upsert',
  'eventualidad.delete',
  'eventualidades.labs.set',
  'eventualidades.labs.merge',
]);

/**
 * @param {import('better-sqlite3').Database} db
 * @param {{ type: string } & Record<string, unknown>} command
 * @param {{ actorId?: string, source?: string }} [meta]
 */
export function executeClinicalCommand(db, command, meta = {}) {
  const type = String(command?.type || '');
  if (!type) return { ok: false, error: 'unknown_command' };
  if (EVENTUALIDAD_TYPES.has(type)) {
    return runEventualidadesCommand(db, command, meta);
  }
  return { ok: false, error: 'unknown_command' };
}

export { runEventualidadesCommand };
