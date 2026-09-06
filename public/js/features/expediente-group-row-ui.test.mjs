import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderExpedienteGroupRow } from './expediente-group-row-ui.mjs';

const GROUP_ROW_CSS = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../styles/group-row.css'
);

/** Removes every brace-matched `@media (hover: hover) { ... }` block from CSS text. */
function stripHoverHoverMediaBlocks(css) {
  const marker = '@media (hover: hover)';
  let out = '';
  let i = 0;
  while (i < css.length) {
    const start = css.indexOf(marker, i);
    if (start === -1) {
      out += css.slice(i);
      break;
    }
    out += css.slice(i, start);
    const openBrace = css.indexOf('{', start);
    let depth = 1;
    let j = openBrace + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth += 1;
      else if (css[j] === '}') depth -= 1;
      j += 1;
    }
    i = j;
  }
  return out;
}

test('group-row.css: no bare :hover outside @media (hover: hover) — WebKit collapses .exp-group-name on a tap-triggered phantom hover with no click to replace it', () => {
  const css = fs.readFileSync(GROUP_ROW_CSS, 'utf8');
  const withoutHoverMedia = stripHoverHoverMediaBlocks(css);
  assert.ok(
    !/\.exp-group-(pill|name|section)[^{},]*:hover/.test(withoutHoverMedia),
    'a bare :hover on .exp-group-pill/.exp-group-name/.exp-group-section outside @media (hover: hover) reintroduces the iPad tap-vanish bug'
  );
});

test('renderExpedienteGroupRow: a tap on a non-active group navigates directly (no hover on touch)', () => {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.add('rpc-mobile-web');
  document.body.innerHTML = '<div id="exp-group-row"></div>';
  var switched = [];
  var prevSwitchConsolidatedTab = window.switchConsolidatedTab;
  window.switchConsolidatedTab = function (id) {
    switched.push(id);
  };
  try {
    renderExpedienteGroupRow('resumen', { appMode: 'sala' });
    var clinicoName = document.querySelector('[data-group="clinico"] .exp-group-name');
    assert.ok(clinicoName, 'clinico pill should render');
    clinicoName.dispatchEvent(new window.PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true }));
    clinicoName.click();
    assert.deepEqual(switched, ['clinico'], 'a tap should navigate straight into the group, not just expand it');
  } finally {
    window.switchConsolidatedTab = prevSwitchConsolidatedTab;
    document.documentElement.classList.remove('rpc-mobile-web');
    document.body.innerHTML = '';
  }
});
