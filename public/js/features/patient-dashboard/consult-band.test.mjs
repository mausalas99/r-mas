import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getConsultInfo,
  setConsultInfo,
  renderConsultBandHtml,
  buildHfFollowUpBandModel,
  renderHfFollowUpBandHtml,
  setConsultaFaseSeguimiento,
  wireHfFollowUpBand,
} from './consult-band.mjs';

describe('getConsultInfo', () => {
  it('returns empty strings when the patient has no consultInfo', () => {
    assert.deepEqual(getConsultInfo({}), { requestingService: '', reason: '', followUpStatus: '' });
    assert.deepEqual(getConsultInfo(null), { requestingService: '', reason: '', followUpStatus: '' });
  });

  it('reads existing consultInfo, coercing to strings', () => {
    var patient = { consultInfo: { requestingService: 'Cardiología', reason: 'Arritmia', followUpStatus: 'en_curso' } };
    assert.deepEqual(getConsultInfo(patient), {
      requestingService: 'Cardiología',
      reason: 'Arritmia',
      followUpStatus: 'en_curso',
    });
  });
});

describe('setConsultInfo', () => {
  it('merges a partial patch into the existing value', () => {
    var patient = { consultInfo: { requestingService: 'Cardiología', reason: '', followUpStatus: '' } };
    var next = setConsultInfo(patient, { reason: 'Revalorar arritmia', followUpStatus: 'pendiente' });
    assert.deepEqual(next, {
      requestingService: 'Cardiología',
      reason: 'Revalorar arritmia',
      followUpStatus: 'pendiente',
    });
    assert.deepEqual(patient.consultInfo, next);
  });

  it('returns null and does nothing for a missing patient', () => {
    assert.equal(setConsultInfo(null, { reason: 'x' }), null);
  });

  it('initializes consultInfo from scratch', () => {
    var patient = {};
    setConsultInfo(patient, { requestingService: 'Medicina Interna' });
    assert.equal(patient.consultInfo.requestingService, 'Medicina Interna');
    assert.equal(patient.consultInfo.reason, '');
  });
});

describe('renderConsultBandHtml (legacy, kept for backward compat, no longer mounted)', () => {
  it('renders the three fields with Spanish labels', () => {
    var html = renderConsultBandHtml({
      requestingService: 'Medicina Interna',
      reason: 'Revalorar arritmia',
      followUpStatus: 'en_curso',
    });
    assert.match(html, /Servicio solicitante/);
    assert.match(html, /Medicina Interna/);
    assert.match(html, /Motivo de consulta/);
    assert.match(html, /Revalorar arritmia/);
    assert.match(html, /Seguimiento/);
    assert.match(html, /En curso/);
  });

  it('falls back to a "Sin dato" / "Sin definir" empty state', () => {
    var html = renderConsultBandHtml({ requestingService: '', reason: '', followUpStatus: '' });
    assert.match(html, /Sin dato/);
    assert.match(html, /Sin definir/);
  });

  it('escapes HTML in free-text fields', () => {
    var html = renderConsultBandHtml({
      requestingService: '<img src=x onerror=alert(1)>',
      reason: '',
      followUpStatus: '',
    });
    assert.doesNotMatch(html, /<img/);
  });
});

describe('buildHfFollowUpBandModel', () => {
  it('returns empty-ish defaults for a patient with no cardio data', () => {
    var model = buildHfFollowUpBandModel({});
    assert.deepEqual(model, {
      faseSeguimiento: '',
      fenotipo: '',
      etiologia: '',
      ultimoInternamientoFecha: '',
      ultimoInternamientoCausa: '',
      ultimaConsultaFecha: '',
    });
  });

  it('reads fenotipo/etiología from top-level cardio and the rest from the latest consulta entry', () => {
    var patient = {
      cardio: {
        fenotipo: 'HFpEF',
        etiologia: 'Hipertensiva',
        consultas: [
          { date: '2026-06-01', faseSeguimiento: 'IC avanzada' },
          {
            date: '2026-08-01',
            faseSeguimiento: 'Optimización/estable',
            ultimoInternamientoFecha: '2026-07-10',
            ultimoInternamientoCausa: 'Descompensación congestiva',
          },
        ],
      },
    };
    var model = buildHfFollowUpBandModel(patient);
    assert.equal(model.fenotipo, 'HFpEF');
    assert.equal(model.etiologia, 'Hipertensiva');
    assert.equal(model.faseSeguimiento, 'Optimización/estable');
    assert.equal(model.ultimoInternamientoFecha, '2026-07-10');
    assert.equal(model.ultimoInternamientoCausa, 'Descompensación congestiva');
    assert.equal(model.ultimaConsultaFecha, '2026-08-01');
  });
});

describe('renderHfFollowUpBandHtml', () => {
  it('renders the fase select, chips, dates and the "Abrir consulta de hoy" button', () => {
    var html = renderHfFollowUpBandHtml({
      faseSeguimiento: 'Optimización/estable',
      fenotipo: 'HFrEF',
      etiologia: 'Isquémica',
      ultimoInternamientoFecha: '2026-07-10',
      ultimoInternamientoCausa: 'Descompensación congestiva',
      ultimaConsultaFecha: '2026-08-01',
    });
    assert.match(html, /Fase de seguimiento/);
    assert.match(html, /data-hf-fase-select/);
    assert.match(html, /Optimización\/estable/);
    assert.match(html, /HFrEF/);
    assert.match(html, /Isquémica/);
    assert.match(html, /2026-07-10/);
    assert.match(html, /Descompensación congestiva/);
    assert.match(html, /2026-08-01/);
    assert.match(html, /Abrir consulta de hoy/);
    assert.doesNotMatch(html, /Servicio solicitante/);
    assert.doesNotMatch(html, /Motivo de consulta/);
  });

  it('falls back to "Sin dato" empty states when nothing is on file', () => {
    var html = renderHfFollowUpBandHtml({});
    assert.match(html, /Sin dato/);
  });

  it('keeps a legacy faseSeguimiento value that is not in the current enum, tagged as previous', () => {
    var html = renderHfFollowUpBandHtml({ faseSeguimiento: 'Valor legado' });
    assert.match(html, /Valor legado \(valor previo\)/);
  });

  it('escapes HTML in the internamiento cause', () => {
    var html = renderHfFollowUpBandHtml({
      ultimoInternamientoFecha: '2026-07-10',
      ultimoInternamientoCausa: '<img src=x onerror=alert(1)>',
    });
    assert.doesNotMatch(html, /<img/);
  });
});

describe('setConsultaFaseSeguimiento', () => {
  it('creates a today-dated draft consulta entry when none exists', () => {
    var patient = { cardio: { consultas: [] } };
    setConsultaFaseSeguimiento(patient, 'Titulación de TMO');
    assert.equal(patient.cardio.consultas.length, 1);
    assert.equal(patient.cardio.consultas[0].faseSeguimiento, 'Titulación de TMO');
  });

  it('updates the latest entry in place when it is already dated today', () => {
    var today = new Date().toISOString().slice(0, 10);
    var patient = { cardio: { consultas: [{ date: today, faseSeguimiento: 'IC avanzada' }] } };
    setConsultaFaseSeguimiento(patient, 'Optimización/estable');
    assert.equal(patient.cardio.consultas.length, 1);
    assert.equal(patient.cardio.consultas[0].faseSeguimiento, 'Optimización/estable');
  });

  it('does nothing for a missing patient', () => {
    assert.equal(setConsultaFaseSeguimiento(null, 'x'), null);
  });
});

describe('wireHfFollowUpBand', () => {
  it('wires the fase select change and the "Abrir consulta de hoy" click', () => {
    if (typeof document === 'undefined') return;
    var patient = { cardio: { fenotipo: '', etiologia: '', consultas: [] } };
    var host = document.createElement('div');
    host.innerHTML = renderHfFollowUpBandHtml(buildHfFollowUpBandModel(patient));
    var changed = false;
    var opened = false;
    wireHfFollowUpBand(host, patient, {
      onChange: () => (changed = true),
      onOpenConsultaHoy: () => (opened = true),
    });
    var select = host.querySelector('[data-hf-fase-select]');
    select.value = 'IC avanzada';
    select.dispatchEvent(new Event('change'));
    host.querySelector('[data-hf-open-consulta-ic]').click();
    assert.equal(changed, true);
    assert.equal(opened, true);
    assert.equal(patient.cardio.consultas[0].faseSeguimiento, 'IC avanzada');
  });
});

describe('backward compat: old consultInfo storage still works alongside the new band', () => {
  it('getConsultInfo/setConsultInfo keep operating on patient.consultInfo, unaffected by cardio data', () => {
    var patient = { cardio: { fenotipo: 'HFrEF', consultas: [] } };
    setConsultInfo(patient, { requestingService: 'Medicina Interna', reason: 'Historial', followUpStatus: 'resuelta' });
    assert.deepEqual(getConsultInfo(patient), {
      requestingService: 'Medicina Interna',
      reason: 'Historial',
      followUpStatus: 'resuelta',
    });
    // Old storage is untouched by, and does not interfere with, the new band's model.
    var model = buildHfFollowUpBandModel(patient);
    assert.equal(model.fenotipo, 'HFrEF');
  });
});
