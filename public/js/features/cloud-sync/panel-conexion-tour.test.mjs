import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));

describe('panel-conexion-tour', () => {
  const src = readFileSync(join(dir, 'panel-conexion-tour.mjs'), 'utf8');

  it('maps mobile tour steps to the mobile subview', () => {
    assert.match(src, /gv7_mobile_link: 'mobile'/);
    assert.match(src, /livesync_mobile: 'mobile'/);
  });

  it('maps rotation tour steps to the equipo subview', () => {
    assert.match(src, /gv7_lan_rotacion: 'equipo'/);
  });

  it('resets retired or missing subviews and on modal close', () => {
    assert.match(src, /resetConexionPanelOnClose/);
    assert.match(src, /afterConnectionPanelOpened/);
    assert.match(src, /!hasView/);
  });
});
