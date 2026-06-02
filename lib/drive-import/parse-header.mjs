const PIPE_RE =
  /^(\d+-\d+)\s*\|\s*(.+?)\s*\|\s*(\d+)\s*AÑOS\s*\|\s*([\d-]+)\s*\|\s*(.+)$/i;

const FICHA_KV_RE = /^([A-ZÁÉÍÓÚÑ\s]+)\s*:\s*(.+)$/i;

/**
 * @param {string[] | string} firstLines
 * @returns {{ cama: string, nombre: string, edad: string, registro: string, resumenDx: string } | null}
 */
export function parsePipeHeader(firstLines) {
  const lines = Array.isArray(firstLines) ? firstLines : String(firstLines || '').split('\n');
  for (const raw of lines.slice(0, 8)) {
    const line = String(raw || '').trim();
    if (!line) continue;
    const m = PIPE_RE.exec(line);
    if (m) {
      return {
        cama: m[1].trim(),
        nombre: m[2].trim(),
        edad: m[3].trim(),
        registro: m[4].trim(),
        resumenDx: m[5].trim(),
      };
    }
  }
  return null;
}

/**
 * @param {string} block
 * @returns {{ identificacion: Record<string, string>, sexo: 'M' | 'F' | '' }}
 */
export function parseFichaIdentificacion(block) {
  /** @type {Record<string, string>} */
  const identificacion = {};
  let sexo = '';
  const lines = String(block || '').split('\n');
  const keyMap = {
    NOMBRE: 'nombre',
    EDAD: 'edad',
    SEXO: 'sexo',
    ORIGEN: 'lugarNacimiento',
    RESIDENCIA: 'residencia',
    OCUPACIÓN: 'ocupacionActual',
    OCUPACION: 'ocupacionActual',
    ESCOLARIDAD: 'escolaridad',
    'ESTADO CIVIL': 'estadoCivil',
    RELIGIÓN: 'religion',
    RELIGION: 'religion',
    RESPONSABLE: 'informante',
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const m = FICHA_KV_RE.exec(line);
    if (!m) continue;
    const label = m[1].trim().toUpperCase();
    const value = m[2].trim();
    const field = keyMap[label];
    if (field) {
      identificacion[field] = value;
      if (field === 'sexo') {
        if (/FEMENIN/i.test(value)) sexo = 'F';
        else if (/MASCULIN/i.test(value)) sexo = 'M';
      }
    }
  }

  if (identificacion.nombre && !identificacion.informante) {
    identificacion.informante = identificacion.nombre;
  }

  return { identificacion, sexo };
}

/**
 * @param {{ cama?: string, nombre?: string, edad?: string, registro?: string, resumenDx?: string } | null} pipe
 * @param {{ identificacion: Record<string, string>, sexo: string }} ficha
 * @returns {{ cama: string, nombre: string, edad: string, registro: string, resumenDx: string, sexo: string, identificacion: Record<string, string> }}
 */
export function mergeHeader(pipe, ficha) {
  const id = ficha.identificacion || {};
  const edadMatch = /(\d+)/.exec(String(id.edad || ''));
  return {
    cama: pipe?.cama || '',
    nombre: id.nombre || pipe?.nombre || '',
    edad: edadMatch ? edadMatch[1] : pipe?.edad || '',
    registro: pipe?.registro || '',
    resumenDx: pipe?.resumenDx || '',
    sexo: ficha.sexo || '',
    identificacion: Object.assign({}, id),
  };
}
