/** Structured keyboard shortcuts for the shortcuts modal (Spanish labels). */

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
      { keys: ['⌘', '1'], label: 'Paciente', hint: 'Repite Resumen → Clínico → Salida' },
      { keys: ['⌘', '↩'], label: 'Volver a Resumen', hint: 'Desde cualquier sitio' },
      { keys: ['⌘', '2'], label: 'Laboratorio', hint: 'Repite Labs → Tendencias → Cultivos' },
      { keys: ['⌘', '3'], label: 'Manejo', hint: 'Repite Manejo ↔ Perfil' },
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
    title: 'Paciente y acciones',
    items: [
      { keys: ['↓'], label: 'Paciente siguiente', hint: 'No aplica al escribir' },
      { keys: ['↑'], label: 'Paciente anterior', hint: 'No aplica al escribir' },
      { keys: ['⌘', 'N'], label: 'Nuevo paciente' },
      { keys: ['⌘', 'E'], label: 'Estado actual' },
      { keys: ['⌘', 'T'], label: 'Tendencias / Cultivos' },
      { keys: ['⌘', 'D'], label: 'Datos del paciente' },
      { keys: ['⌘', 'M'], label: 'Manejo' },
      { keys: ['⌘', '⇧', 'S'], label: 'Guardar paciente activo' },
      { keys: ['⌘', '⇧', 'C'], label: 'Copiar labs del equipo', hint: 'Solo pacientes fijados' },
    ],
  },
  {
    title: 'Aplicación',
    items: [
      { keys: ['⌘', '/'], label: 'Mostrar esta hoja de atajos' },
      { keys: ['⌘', 'K'], label: 'Ir a sección, paciente o acción' },
      { keys: ['⌘', ','], label: 'Ajustes' },
      { keys: ['⌘', '⇧', 'P'], label: 'Mi Perfil' },
      { keys: ['⌘', '⇧', ','], label: 'Importar JSON · sobrescribir conflictos' },
      { keys: ['Esc'], label: 'Cerrar ventana o menú' },
    ],
  },
];
