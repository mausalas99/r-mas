import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIndicacionesPreviewHtml, buildNotaPreviewHtml } from './doc-preview-html.mjs';
import { gradoToMedicosLines, applyMedicosFromGradoIfEmpty } from './profile-templates.mjs';

const patient = { nombre: 'Paciente Sintetico Uno', registro: '0000000-0', edad: 50, sexo: 'F', cuarto: '100', cama: '1', servicio: 'Medicina Interna' };

test('grado → un médico por línea', () => {
  assert.equal(gradoToMedicosLines('R3 ANA UNO R2 LUIS DOS R1 PEDRO TRES'), 'R3 ANA UNO\nR2 LUIS DOS\nR1 PEDRO TRES');
  const ind = { medicos: '' };
  assert.ok(applyMedicosFromGradoIfEmpty(ind, { grado: 'R2 ANA UNO R1 LUIS DOS' }));
  assert.equal(ind.medicos, 'R2 ANA UNO\nR1 LUIS DOS');
  assert.equal(applyMedicosFromGradoIfEmpty(ind, { grado: 'R9 X' }), false);
});

test('indicaciones: secciones, médicos y escape', () => {
  const html = buildIndicacionesPreviewHtml(patient, { fecha: '01/01/2026', hora: '08:00', medicos: 'R1 ANA UNO\nR2 LUIS DOS', dieta: 'Normal <b>', otros: [{ titulo: 'extra', contenido: 'x' }] });
  assert.match(html, /INDICACIONES MÉDICAS/);
  assert.match(html, /R1 ANA UNO<br>R2 LUIS DOS/);
  assert.match(html, /Normal &lt;b&gt;/);
  assert.match(html, /EXTRA/);
});

test('nota: campos básicos', () => {
  const html = buildNotaPreviewHtml(patient, { fecha: '01/01/2026', hora: '08:00', diagnosticos: ['hta'], ta: '120/80', tratamiento: ['reposo'] });
  assert.match(html, /HTA/);
  assert.match(html, /120\/80/);
  assert.match(html, /REPOSO/);
});
