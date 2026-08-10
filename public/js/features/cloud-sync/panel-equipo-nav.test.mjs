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
    assert.match(tourSrc, /prepareConexionPanelForTour/);
  });

  it('Equipo modal CSS fills viewport; body is the scrollport', () => {
    const css = readFileSync(join(dir, '../../../styles/cloud-sync.css'), 'utf8');
    assert.match(css, /connection-dropdown-modal--equipo/);
    assert.match(css, /width:\s*min\(98vw,\s*1280px\)/);
    assert.match(css, /height:\s*min\(98dvh/);
    const bodyBlock = css.match(
      /\.connection-dropdown-modal--equipo\s+\.connection-dropdown-body\s*\{([^}]+)\}/
    );
    assert.ok(bodyBlock, 'equipo body scroll rule missing');
    assert.match(bodyBlock[1], /overflow-y:\s*auto/);
    const embedBlock = css.match(
      /\.cloud-sync-equipo-embed\s+\.clinical-teams-panel-body--embed\s*\{([^}]+)\}/
    );
    assert.ok(embedBlock, 'embed panel-body rule missing');
    assert.match(embedBlock[1], /overflow:\s*visible/);
  });
});
