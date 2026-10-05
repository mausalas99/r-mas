// Makes the .docx parity fixtures. Run with Electron's Node (the app's real engine):
//   ELECTRON_RUN_AS_NODE=1 <Electron binary> make-docx-fixtures.mjs
// Builds each document type with packages/core/lib/doc-generators from invented patients
// (no real data, ever). Per case it writes:
//   <case>.json          { kind, input, fileName, numberingInject? }  what Swift must be given
//   <case>.document.xml  word/document.xml of Node's .docx, whitespace-normalized
// Swift builds the same input and must give the same document.xml after the same normalization:
// line breaks between tags are dropped (see `normalize`). Refresh after any change to the
// generators or to the three template_*.docx files.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const lib = resolve(here, '../../../../../packages/core/lib');
const require = createRequire(join(lib, 'x.js'));
const JSZip = require('jszip');
const { generateNoteBuffer } = require('./doc-generators/note.js');
const { generateIndicacionesBuffer } = require('./doc-generators/indicaciones.js');
const { generateListadoBuffer } = require('./doc-generators/listado.js');
const svc = require('./doc-export-service.js');

const normalize = (xml) => xml.replace(/>\s*[\r\n]\s*</g, '><').trim();

const patientA = {
  nombre: 'paciente sintético ñandú álvarez', registro: '9900001-1', edad: 71, sexo: 'M',
  area: 'cirugía general', servicio: 'medicina interna', cuarto: '512', cama: '3',
};
const patientB = {
  nombre: 'paciente sintético dos', registro: '9900002-2', edad: '45', sexo: 'f',
  area: 'medicina interna', servicio: 'cirugía general', cuarto: '208', cama: 'A',
};

const cases = [
  {
    name: 'note-full', kind: 'note', patient: patientA,
    note: {
      fecha: '05/10/2026', hora: '08:30',
      interrogatorio: 'Paciente masculino de 71 años & con DM2 <controlada> y HTA. Costo $100, $& y $\' "comillas" 😀. Sin otros datos.',
      evolucion: 'n: alerta, orientado\n\nv: fr 18 rpm, sato2 96%\nhd: estable, ta 120/80\nhi: afebril\nnm: dieta blanda\nextra uno\nextra dos',
      estudios: '05.10.26\nGlu 110 Cr 0.8\nNa 140 K 4.1\n04.10.26\nHb 13 Hto 40\nGlu 120\nNa 138\nAlb 3.5\n  AST 20 ALT 18  \nlinea diez',
      diagnosticos: ['neumonía adquirida en la comunidad', 'control metabólico', 'hta', 'dm2'],
      ta: '120/80', fr: 18, fc: 80, temp: '36.5', peso: '70.5',
      tratamiento: ['ertapenem 1 g iv', 'omeprazol 40 mg', 'paracetamol 1 g', 'insulina', 'enoxaparina', 'dieta', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce'],
      medico: 'MI SINTÉTICO UNO, R1MI SINTÉTICO DOS', profesor: 'DR. SINTÉTICO TRES',
    },
  },
  {
    name: 'note-sparse', kind: 'note', patient: { nombre: 'x', edad: 0 },
    note: { fecha: '06/10/2026', hora: '', diagnosticos: 'uno', tratamiento: 'a\nb', evolucion: 'solo una' },
  },
  {
    name: 'indicaciones-full', kind: 'indicaciones', patient: patientB,
    indicaciones: {
      fecha: '05/10/2026', hora: '09:15', medicos: 'DR. UNO\n  DRA. DOS \n\nR1 TRES',
      descripcion: 'Indicaciones & cambios', dieta: 'Blanda\nSin sal', cuidados: 'Vigilar\n\n  Aseo',
      estudios: 'BH, QS', medicamentos: 'Paracetamol 1 g c/8 h\nOmeprazol 40 mg', interconsultas: '',
      otros: [
        { titulo: 'oxígeno', contenido: 'puntas nasales 2 L' },
        { titulo: '', contenido: 'ignorado' },
        { titulo: 'curaciones', contenido: '' },
      ],
    },
  },
  { name: 'indicaciones-sparse', kind: 'indicaciones', patient: {}, indicaciones: {} },
  {
    name: 'listado-full', kind: 'listado', patient: patientA,
    medicos: { profesor: 'DR. SINTÉTICO UNO', r4: 'R4 DOS', r2: 'R2 TRES', r1a: 'R1 CUATRO', r1b: 'R1 CINCO & SEIS' },
    listado: {
      activos: [
        {
          fecha: '2026-10-01',
          descripcion: 'Neumonía\na) Ertapenem 1 g IV c/24 h, día 3 de 7, con buena respuesta clínica y afebril desde hace 48 horas, sin datos de falla\nb) Control de glucosa\n\nc) Aparte tras blanco\nTítulo en negritas de una línea muy larga que debe partirse en varios renglones porque excede el máximo de ciento diez caracteres permitido',
        },
        { fecha: '01/10/2026', descripcion: 'a) uno\r\nb) dos\r\n' },
        { fecha: '', descripcion: 'Texto con emoji 😀 y $& símbolos < > " que sigue por bastante tiempo hasta pasar el límite de ciento diez caracteres' },
      ],
      inactivos: [
        { fecha: '2026-09-20', descripcion: 'a) Resuelto uno\nb) Resuelto dos\nA) tres' },
        { fecha: '', descripcion: '' },
      ],
    },
  },
  { name: 'listado-sparse', kind: 'listado', patient: {}, medicos: {}, listado: { activos: [], inactivos: [] } },
];

const outDir = here;
mkdirSync(outDir, { recursive: true });

for (const c of cases) {
  let buf;
  let exported;
  if (c.kind === 'note') {
    buf = await generateNoteBuffer({ patient: c.patient, note: c.note });
    exported = await svc.exportNoteDocx({ patient: c.patient, note: c.note });
  } else if (c.kind === 'indicaciones') {
    buf = await generateIndicacionesBuffer({ patient: c.patient, indicaciones: c.indicaciones });
    exported = await svc.exportIndicacionesDocx({ patient: c.patient, indicaciones: c.indicaciones });
  } else {
    buf = await generateListadoBuffer({ patient: c.patient, listado: c.listado, medicos: c.medicos });
    exported = await svc.exportListadoDocx({ patient: c.patient, listado: c.listado, medicos: c.medicos });
  }
  const zip = await JSZip.loadAsync(buf);
  const doc = await zip.file('word/document.xml').async('string');
  let numberingInject = null;
  if (c.kind === 'listado') {
    const num = await zip.file('word/numbering.xml').async('string');
    const i = num.indexOf('<w:num w:numId="9000">');
    if (i !== -1) numberingInject = num.slice(i);
  }
  const input = { patient: c.patient, [c.kind === 'listado' ? 'listado' : c.kind]: c[c.kind], ...(c.medicos ? { medicos: c.medicos } : {}) };
  // The Listado name ends in a clock stamp; Swift checks the part before it.
  const fileName = c.kind === 'listado' ? exported.fileName.replace(/_\d\d-\d\d-\d\d\.docx$/, '_STAMP.docx') : exported.fileName;
  writeFileSync(join(outDir, `${c.name}.json`), JSON.stringify({ kind: c.kind, input, fileName, numberingInject }, null, 1) + '\n');
  writeFileSync(join(outDir, `${c.name}.document.xml`), normalize(doc));
  console.log(c.name, doc.length, fileName, numberingInject ? 'numbering+' : '');
}
