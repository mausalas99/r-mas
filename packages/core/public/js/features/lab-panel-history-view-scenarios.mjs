/** Synthetic inputs for the lab history view test (inputs only; the expected HTML lives in lab-panel-history-view.old.json). */

const day = (dayKey) => ({ dayKey });
const longDays = Array.from({ length: 45 }, (_, i) => day('2026-10-' + String(31 - (i % 31)).padStart(2, '0') + (i > 30 ? ' (' + i + ')' : '')));

export const DAY_OPTIONS = {
  empty: { days: [], selected: '' },
  one: { days: [day('11/11/2026')], selected: '11/11/2026' },
  three_second_selected: { days: [day('11/11/2026'), day('10/11/2026'), day('09/11/2026')], selected: '10/11/2026' },
  none_selected: { days: [day('11/11/2026'), day('10/11/2026')], selected: '' },
  anterior_and_blank_key: { days: [day('11/11/2026'), day('Anterior'), day('')], selected: 'Anterior' },
  special_chars: { days: [day('día <1> & "dos"'), day("tres 'x'")], selected: 'día <1> & "dos"' },
  long: { days: longDays, selected: longDays[20].dayKey },
};

export const MOBILE_HINTS = {
  plain: 'Sin estudios en los últimos 3 días. En escritorio se procesan labs y sincronizan aquí para referencia rápida.',
  no_patient: 'Selecciona un paciente en la columna izquierda para ver los estudios guardados.',
  special_chars: 'Mensaje <con> & "comillas"',
  empty: '',
};

const row = (patientId, id, kind, n) => ({
  patientId, id, kind, checked: true,
  summary: '1' + (n % 9) + '/11/2026 0' + (n % 9) + ':30 · Química sanguínea, BH · id ' + id,
});
const rows = (pid, kind, n, from = 0) => Array.from({ length: n }, (_, i) => row(pid, 'lab-' + pid + '-' + (from + i), kind, from + i));

export const DEDUPE = {
  one_exact: [{ patientId: 'p1', nombre: 'PACIENTE UNO', registro: '1001', rows: rows('p1', 'exact', 1) }],
  one_loose_no_registro: [{ patientId: 'p2', nombre: 'PACIENTE DOS', registro: '', rows: rows('p2', 'loose', 2) }],
  both_kinds: [{ patientId: 'p1', nombre: 'PACIENTE UNO', registro: '1001', rows: [...rows('p1', 'exact', 2), ...rows('p1', 'loose', 1, 5)] }],
  no_name: [{ patientId: 'p3', nombre: '', registro: '3003', rows: rows('p3', 'exact', 1) }],
  special_chars: [{ patientId: 'p"4"', nombre: 'PACIENTE <CUATRO> & "Prueba"', registro: '4<4>', rows: [{ patientId: 'p"4"', id: 'id<1>"x"', kind: 'exact', summary: 'resumen <b> & "x"' }] }],
  many_patients_long: [
    { patientId: 'p1', nombre: 'PACIENTE UNO', registro: '1001', rows: [...rows('p1', 'exact', 30), ...rows('p1', 'loose', 12, 30)] },
    { patientId: 'p2', nombre: 'PACIENTE DOS', registro: '', rows: rows('p2', 'loose', 3) },
    { patientId: 'p3', nombre: 'PACIENTE TRES', registro: '3003', rows: rows('p3', 'exact', 5) },
  ],
};
