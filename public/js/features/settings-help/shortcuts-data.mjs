/** Structured keyboard shortcuts for the shortcuts modal (Spanish labels). */

/** Hold ⌘/Ctrl alone before opening cheat sheet from keyboard. */
export const SHORTCUTS_HOLD_MS = 2000;

export function modKeyLabel() {
  if (typeof navigator !== 'undefined' && navigator.platform && /Mac/i.test(navigator.platform)) {
    return '⌘';
  }
  return 'Ctrl';
}

/** @typedef {{ keys: string[], label: string, hint?: string }} ShortcutItem */
/** @typedef {{ title: string, items: ShortcutItem[] }} ShortcutGroup */

/** @type {ShortcutGroup[]} */
export const SHORTCUT_GROUPS = [
  {
    title: 'Pestañas principales',
    items: [
      { keys: ['⌘', '1'], label: 'Laboratorio' },
      { keys: ['⌘', '2'], label: 'Expediente', hint: 'Repite para ciclar subvistas' },
      { keys: ['⌘', '3'], label: 'Medicamentos', hint: 'Repite Manejo ↔ Perfil' },
      { keys: ['⌘', '4'], label: 'Agenda', hint: 'Repite semana actual' },
      { keys: ['⌘', '⇧', '3'], label: 'Manejo: Completa ↔ Nombre+Día' },
      { keys: ['⌘', '['], label: 'Agenda · semana anterior' },
      { keys: ['⌘', ']'], label: 'Agenda · semana siguiente' },
    ],
  },
  {
    title: 'Modos de trabajo',
    items: [
      { keys: ['⌘', 'G'], label: 'Guardia' },
      { keys: ['⌘', 'I'], label: 'Interconsulta' },
      { keys: ['⌘', 'P'], label: 'Pase' },
      { keys: ['⌘', 'S'], label: 'Sala' },
    ],
  },
  {
    title: 'Expediente y acciones',
    items: [
      { keys: ['⌘', 'E'], label: 'Estado actual' },
      { keys: ['⌘', 'T'], label: 'Tendencias / Cultivos' },
      { keys: ['⌘', 'D'], label: 'Datos del paciente' },
      { keys: ['⌘', 'M'], label: 'Medicamentos' },
      { keys: ['⌘', 'A'], label: 'Agenda' },
      { keys: ['⌘', 'N'], label: 'Nuevo paciente' },
      { keys: ['⌘', '⇧', 'S'], label: 'Guardar paciente activo' },
    ],
  },
  {
    title: 'Aplicación',
    items: [
      { keys: ['⌘', 'K'], label: 'Ir a sección, paciente o acción' },
      { keys: ['⌘', ','], label: 'Ajustes' },
      { keys: ['⌘', '⇧', 'P'], label: 'Mi Perfil' },
      { keys: ['⌘', '⇧', ','], label: 'Importar JSON · sobrescribir conflictos' },
      { keys: ['Esc'], label: 'Cerrar ventana o menú' },
    ],
  },
];
