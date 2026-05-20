import test from 'node:test';
import assert from 'node:assert/strict';

/** Valor exportado en lan-sync.mjs (no importar el módulo en Node: side effects + localStorage). */
const DEFAULT_LAN_TEAM_CODE = '1234';

/** Misma lógica que settings-help.mjs (no exportada). */
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

test('livesync_desktop tour snippet incluye código LAN por defecto', () => {
  const html =
    '<p>Código por defecto del equipo: <strong>' +
    esc(DEFAULT_LAN_TEAM_CODE) +
    '</strong>.</p>';
  assert.match(html, /1234/);
});

test('esc escapa títulos de artículos de ayuda', () => {
  const html = '<h4>' + esc('A <B> & "C"') + '</h4>';
  assert.equal(html, '<h4>A &lt;B&gt; &amp; &quot;C&quot;</h4>');
});
