import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { equipoEmbedHostHtml } from './panel-conexion-html.mjs';

const dir = dirname(fileURLToPath(import.meta.url));

describe('panel-equipo embed', () => {
  it('equipoEmbedHostHtml provides inline roster host', () => {
    const html = equipoEmbedHostHtml();
    assert.match(html, /data-cloud-equipo-host/);
    assert.match(html, /clinical-teams-panel-body--embed/);
    assert.doesNotMatch(html, /Equipo configurado/);
  });

  it('applyConexionView clears embed host when leaving equipo', () => {
    const src = readFileSync(join(dir, 'panel-conexion-views.mjs'), 'utf8');
    assert.match(src, /onEquipo/);
    assert.match(src, /setClinicalTeamsEmbedHost\(null\)/);
  });

  it('openMiRotacion routes through Conexión Equipo', () => {
    const src = readFileSync(join(dir, '../clinical-rotation-entry.mjs'), 'utf8');
    assert.match(src, /openConexionEquipoPanel/);
    assert.match(src, /rotationSection\.hidden = true/);
  });

  it('tour opens mobile subview for iPad module', () => {
    const tourSrc = readFileSync(join(dir, 'panel-conexion-tour.mjs'), 'utf8');
    assert.match(tourSrc, /gv7_mobile_link: 'mobile'/);
    const actionsSrc = readFileSync(
      join(dir, '../settings-help/tour-step-actions.mjs'),
      'utf8'
    );
    assert.match(actionsSrc, /prepareConexionPanelForTour/);
  });
});
