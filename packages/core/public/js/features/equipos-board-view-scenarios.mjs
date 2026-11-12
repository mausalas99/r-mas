// Synthetic boards for the equipos board view test and its old-markup capture.
export const CLOUD = { url: 'https://equipos.example.test/m?a=1&b="2"' };

export const BOARDS = {
  full: {
    alerts: [
      { kind: 'malfunction', device_type: 'lumify' },
      { kind: 'missing', device_type: 'ekg' },
      { kind: 'malfunction', device_type: 'desconocido' },
    ],
    devices: [
      { device_type: 'lumify', status: 'in_use', holder_name: 'Dra. <Demo> & "Uno"', holder_rotation: "R1 O'B", waitlist: [{}, {}] },
      { device_type: 'ekg', status: 'available', waitlist: [] },
      { device_type: 'ultrasound', status: 'alert', holder_name: '', waitlist: [{}] },
      { device_type: 'raro<x>', status: 'otro', waitlist: undefined },
    ],
  },
  empty: { alerts: undefined, devices: undefined },
  noAlerts: { alerts: [], devices: [{ device_type: 'ekg', status: 'available' }] },
};

export const MESSAGES = [
  'Cargando cola de equipos…',
  'No se pudo conectar al servicio cloud. Revisa URL y clave admin en ⇄ → R+ Lista de espera.',
  'Error <raro> & "x"',
];
