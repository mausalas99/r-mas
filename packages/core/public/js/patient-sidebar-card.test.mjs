import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatPatientBedLabel,
  renderPatientSidebarBodyHtml,
  shortenPatientDisplayName,
} from './patient-sidebar-card.mjs';

describe('patient-sidebar-card', () => {
  it('formatPatientBedLabel joins cuarto and cama', () => {
    assert.equal(formatPatientBedLabel({ cuarto: '412', cama: '2' }), '412·2');
    assert.equal(formatPatientBedLabel({}), '');
  });

  it('shortenPatientDisplayName keeps only first and last token', () => {
    assert.equal(shortenPatientDisplayName('SINTETICO EJEMPLO CASOAZ'), 'SINTETICO CASOAZ');
    assert.equal(shortenPatientDisplayName('GENERICO CASOBL'), 'GENERICO CASOBL');
    assert.equal(shortenPatientDisplayName('JUAN'), 'JUAN');
    assert.equal(shortenPatientDisplayName(''), '');
    // Comma-separated "APELLIDOS, NOMBRE" records are already two logical parts.
    assert.equal(shortenPatientDisplayName('PEREZ TRISTAN, ANGELITA'), 'PEREZ TRISTAN, ANGELITA');
  });

  it('renderPatientSidebarBodyHtml shows a shortened name (full name in the tooltip) and Cto./Cama meta', () => {
    const html = renderPatientSidebarBodyHtml({
      nombre: 'SINTETICO EJEMPLO CASOAZ',
      cuarto: '412',
      cama: '2',
      registro: '12345',
      servicio: 'Medicina Interna',
    });
    assert.match(html, /SINTETICO CASOAZ/);
    assert.doesNotMatch(html, />SINTETICO EJEMPLO CASOAZ</);
    assert.match(html, /title="[^"]*SINTETICO EJEMPLO CASOAZ/);
    assert.match(html, /Cto\. 412/);
    assert.match(html, /Cama 2/);
    assert.match(html, /Medicina Interna/);
    assert.doesNotMatch(html, /Reg\./);
    assert.doesNotMatch(html, /patient-card-pin-badge/);
  });

  it('drops the Cto./Cama labels on mobile web, keeps the numbers', () => {
    globalThis.__RPC_MOBILE_WEB__ = true;
    try {
      const html = renderPatientSidebarBodyHtml({
        nombre: 'SINTETICO EJEMPLO CASOAZ',
        cuarto: '412',
        cama: '2',
      });
      assert.doesNotMatch(html, /Cto\./);
      assert.doesNotMatch(html, /Cama /);
      assert.match(html, /<span>412<\/span>/);
      assert.match(html, /<span>2<\/span>/);
    } finally {
      delete globalThis.__RPC_MOBILE_WEB__;
    }
  });

  it('hides servicio in modo sala', () => {
    const html = renderPatientSidebarBodyHtml(
      {
        nombre: 'PEREZ TRISTAN, ANGELITA',
        cuarto: '201',
        cama: '2',
        servicio: 'Medicina Interna',
      },
      { showServicio: false }
    );
    assert.match(html, /PEREZ TRISTAN, ANGELITA/);
    assert.match(html, /Cto\. 201/);
    assert.match(html, /Cama 2/);
    assert.doesNotMatch(html, /Medicina Interna/);
  });
});
