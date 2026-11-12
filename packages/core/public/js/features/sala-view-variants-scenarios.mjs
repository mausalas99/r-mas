/** Synthetic patients for the Sala cards / rail old-vs-new tests. No real data. */
const P = (o) => ({ cuarto: '', cama: '', servicio: 'MI', area: 'A', ...o });

export const SALA_ACTIVE_ID = 'p2';

export const SALA_SCENARIOS = {
  // active card, DNR tag, incomplete admission, vent tag, two interconsults, hostile names
  mixed: {
    archView: false,
    list: [
      P({ id: 'p1', nombre: 'PACIENTE DEMO UNO', cuarto: '432', cama: '3', negativa_maniobras_firmada: 1,
        diagnosticosList: ['NEUMONIA <GRAVE>', "O'BRIEN & HIJOS"], interconsultServiceIds: ['card', 'nef', 'nope'],
        monitoreo: { estadoClinico: { soporte: 'Ventilación mecánica' } } }),
      P({ id: 'p2', nombre: 'MARIA "DE LA CRUZ"', cuarto: '', cama: '', servicio: '', diagnosticosList: [''] }),
      P({ id: 'p3', nombre: '', cuarto: '12', cama: '4', diagnosticosList: ['IRA'], monitoreo: { estadoClinico: { soporte: 'Alto flujo' } } }),
    ],
    archived: [P({ id: 'a1', nombre: 'LUIS ARCHIVADO', cuarto: '7', cama: '2', archived: true, diagnosticosList: ['EPOC'] })],
  },
  empty: { archView: false, list: [], archived: [] },
  archivedView: {
    archView: true,
    list: [P({ id: 'p1', nombre: 'PACIENTE DEMO UNO', cuarto: '1', cama: '1', diagnosticosList: ['X'] })],
    archived: [
      P({ id: 'a1', nombre: 'LUIS ARCHIVADO', cuarto: '7', cama: '2', archived: true, diagnosticosList: ['EPOC'] }),
      P({ id: "a'2", nombre: '', cuarto: '', cama: '', archived: true, diagnosticosList: [''] }),
    ],
  },
  onlyArchived: { archView: false, list: [], archived: [P({ id: 'a1', nombre: 'SOLO ARCH', cuarto: '9', cama: '9', archived: true, diagnosticosList: ['Y'] })] },
};
