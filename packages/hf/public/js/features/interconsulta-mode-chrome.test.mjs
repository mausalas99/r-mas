import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  registerInterconsultaChromeRuntime,
  renderConsultBandForActivePatient,
  syncInterconsultaModeChrome,
} from './interconsulta-mode-chrome.mjs';
import { setPatients } from '../app-state.mjs';
import { setActivePatientAreaGetter } from './active-patient-area.mjs';
import { attachProfileSettingsGetter } from './profile-runtime.mjs';

describe('syncInterconsultaModeChrome + renderConsultBandForActivePatient', () => {
  beforeEach(() => {
    if (typeof document === 'undefined') return;
    document.body.innerHTML = '<div id="interconsulta-consult-band" hidden></div>';
  });

  it('leaves the band untouched when not in interconsulta mode', () => {
    if (typeof document === 'undefined') return;
    registerInterconsultaChromeRuntime({
      getActiveId: () => null,
    });
    // No settings registered => isModeSala defaults true => sala, not interconsulta.
    syncInterconsultaModeChrome();
    assert.equal(document.getElementById('interconsulta-consult-band').innerHTML, '');
  });

  it('a ward patient (área not "Consulta Externa") does not paint the band even when the app-wide toggle is on interconsulta', () => {
    if (typeof document === 'undefined') return;
    try {
      registerInterconsultaChromeRuntime({ getActiveId: () => '1' });
      attachProfileSettingsGetter(() => ({ appMode: 'interconsulta' }));
      setActivePatientAreaGetter(() => 'CARDIOLOGÍA');
      syncInterconsultaModeChrome();
      assert.equal(document.getElementById('interconsulta-consult-band').innerHTML, '');
    } finally {
      setActivePatientAreaGetter(() => '');
      attachProfileSettingsGetter(() => ({}));
    }
  });

  it('paints the consult band for the active patient once mounted', () => {
    if (typeof document === 'undefined') return;
    var bandMount = document.getElementById('interconsulta-consult-band');
    bandMount.hidden = false;
    registerInterconsultaChromeRuntime({
      getActiveId: () => '1',
    });
    renderConsultBandForActivePatient();
    // No matching patient in app-state -> empty band, but call must not throw.
    assert.equal(typeof bandMount.innerHTML, 'string');
  });

  it('renders the HF follow-up band (fase/internamiento/consulta — no fenotipo/etiología, already shown in Resumen) for a real patient', () => {
    if (typeof document === 'undefined') return;
    var bandMount = document.getElementById('interconsulta-consult-band');
    bandMount.hidden = false;
    setPatients([
      {
        id: '1',
        cardio: {
          fenotipo: 'HFrEF',
          etiologia: 'Isquémica',
          consultas: [
            {
              date: '2026-08-01',
              faseSeguimiento: 'Optimización/estable',
              ultimoInternamientoFecha: '2026-07-10',
              ultimoInternamientoCausa: 'Descompensación congestiva',
            },
          ],
        },
      },
    ]);
    registerInterconsultaChromeRuntime({
      getActiveId: () => '1',
    });
    renderConsultBandForActivePatient();
    var html = bandMount.innerHTML;
    assert.match(html, /Fase de seguimiento/);
    assert.match(html, /Optimización\/estable/);
    assert.match(html, /2026-07-10/);
    assert.match(html, /Descompensación congestiva/);
    assert.match(html, /2026-08-01/);
    assert.match(html, /Abrir consulta de hoy/);
    assert.doesNotMatch(html, /Servicio solicitante/);
    assert.doesNotMatch(html, /Motivo de consulta/);
    assert.doesNotMatch(html, /Fenotipo/);
    setPatients([]);
  });
});
