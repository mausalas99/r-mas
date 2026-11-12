// Synthetic listado forms for the listado view test and its old-markup capture.
const prob = (id, fecha, descripcion) => ({ id, fecha, descripcion });

export const SCENARIOS = {
  full: {
    patient: { nombre: 'PACIENTE <DEMO> & "UNO"', registro: 'R-100', edad: '54', sexo: 'M', cuarto: '432', cama: '3' },
    lst: {
      fecha: '01/11/2026', hora: '08:30',
      activos: [prob('a1', '2026-11-01', 'Neumonía <grave> & "x"'), prob("a'2", '', "O'B\nsegunda línea"), prob('a3', '2026-10-30', '')],
      inactivos: [prob('i1', '2026-09-01', 'IRA resuelta')],
      medicos: { profesor: 'Dr. Demo', r4: '  ', r1a: 'R1 "A"' },
    },
    tpl: { profesor: 'Plantilla Prof', r4: 'Plantilla R4', r2: 'Plantilla R2', r1a: 'x', r1b: 'Plantilla R1b' },
    hideAiPrompt: false,
  },
  empty: {
    patient: { nombre: 'SOLO NOMBRE' },
    lst: { fecha: '', hora: '', activos: [], inactivos: [] },
    tpl: {},
    hideAiPrompt: true,
  },
  partialPatient: {
    patient: { nombre: 'OTRO', sexo: 'F', cama: '7' },
    lst: { fecha: '02/11/2026', hora: '23:59', activos: [], inactivos: [prob('i9', '2026-01-01', 'Antiguo')] },
    tpl: { r2: 'Solo R2' },
    hideAiPrompt: false,
  },
};
