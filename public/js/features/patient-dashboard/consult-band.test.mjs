import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getConsultInfo, setConsultInfo, renderConsultBandHtml } from './consult-band.mjs';

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

describe('renderConsultBandHtml', () => {
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
