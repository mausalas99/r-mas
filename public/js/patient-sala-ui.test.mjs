import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveRegistrationSalaDefault,
  buildPatientSalaFieldHtml,
} from './patient-sala-ui.mjs';

describe('patient-sala-ui', () => {
  it('resolveRegistrationSalaDefault prefers team sala over profile', () => {
    const teams = [{ team_id: 't-ic', sala: 'Unidad IC-Equipo', service: 'Unidad IC' }];
    assert.equal(
      resolveRegistrationSalaDefault({ sala: 'Otra' }, 't-ic', teams),
      'Unidad IC-Equipo'
    );
  });

  it('resolveRegistrationSalaDefault falls back to profile sala', () => {
    assert.equal(resolveRegistrationSalaDefault({ sala: 'Unidad IC' }, '', []), 'Unidad IC');
  });

  it('buildPatientSalaFieldHtml includes selected sala', () => {
    const html = buildPatientSalaFieldHtml({ sala: 'Unidad IC' });
    assert.match(html, /patient-sala-select/);
    assert.match(html, /value="Unidad IC" selected/);
  });
});
