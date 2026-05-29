// Modo de trabajo del usuario y migración de settings v3.0.

/** Ejemplo genérico en placeholders de UI (no asumir un servicio hospitalario concreto). */
export const UI_EXAMPLE_SERVICIO = 'CIRUGÍA GENERAL';

export function isModeSala(settings) {
  if (!settings) return true;
  return (settings.appMode || 'sala') === 'sala';
}

export function getDefaultServicio(settings) {
  if (!settings) return '';
  return String(settings.defaultServicio || '').trim();
}

/**
 * Migración suave a 3.0.0. Idempotente.
 * Muta el settings recibido y retorna true si aplicó la migración, false si ya estaba migrado.
 */
export function migrateToV3(settings) {
  if (!settings || settings._v3MigrationDone) return false;
  if (settings.appMode == null) settings.appMode = 'sala';
  if (settings.defaultServicio == null) settings.defaultServicio = '';
  settings._v3MigrationDone = true;
  return true;
}
