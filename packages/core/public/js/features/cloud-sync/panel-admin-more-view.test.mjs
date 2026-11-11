process.env.TZ = 'UTC'; // times are local; the fixtures were captured in UTC
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from '../preact-view-test-helpers.mjs';
import { adminShellModel } from './panel-admin-html.mjs';
import { EQUIPOS_CHIPS, equiposListModel } from './panel-admin-equipos-html.mjs';
import { sessionRows } from '../equipos-history.mjs';
import * as S from './panel-admin-more-scenarios.mjs';
import OLD from './panel-admin-more-view.old.json' with { type: 'json' };

const view = await loadJsx(import.meta.url, `import { AdminShell, AdminPeligro, AdminMutacionesShell, AdminSolicitudesShell, AdminError } from './panel-admin-view.jsx';
  import { EquiposShell, EquiposList } from './panel-admin-equipos-view.jsx';
  import { HistoryPanel } from '../equipos-history-view.jsx';
  export const shell = (m) => renderToString(<AdminShell model={m} />);
  export const peligro = () => renderToString(<AdminPeligro />);
  export const mutaciones = () => renderToString(<AdminMutacionesShell />);
  export const solicitudes = () => renderToString(<AdminSolicitudesShell />);
  export const error = (m) => renderToString(<AdminError message={m} />);
  export const equiposShell = (c) => renderToString(<EquiposShell chips={c} />);
  export const equiposList = (g) => renderToString(<EquiposList groups={g} />);
  export const history = (r) => renderToString(<HistoryPanel rows={r} />);`);

// Same normalising as panel-admin-view.test.mjs: Preact's void tags, empty attributes, unescaped '>'.
const norm = (s) => s.replace(/ ?\/>/g, '>').replace(/ (data-[\w-]+)=""/g, ' $1').replace(/&gt;/g, '>')
  .replace(/<option value([ >])/g, '<option value=""$1').replace(/<\/(rect|path|circle)>/g, '').replace(/(style="[^"]*);"/g, '$1"').replace(/ (hidden|disabled|selected)=""/g, ' $1');
// On a mismatch, show where the two strings first differ.
function same(name, got, want = OLD[name]) {
  const a = norm(got);
  const b = norm(want);
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  assert.equal(a, b, name + ' differs at ' + i + ':\n new: ' + a.slice(Math.max(0, i - 60), i + 80) + '\n old: ' + b.slice(Math.max(0, i - 60), i + 80));
}

test('Admin frame, Peligro, Registro and Solicitudes shells equal the old builders', () => {
  same('shell_bootstrap', view.shell(adminShellModel(true)));
  same('shell_nobootstrap', view.shell(adminShellModel(false)));
  same('peligro', view.peligro());
  same('mutaciones_shell', view.mutaciones());
  same('solicitudes_shell', view.solicitudes());
});

test('Error line escapes the message like the old builder', () => {
  same('error', view.error(S.ERROR_MESSAGE));
});

test('Usuarios (equipos) frame and list equal the old builders', () => {
  same('equipos_shell', view.equiposShell(EQUIPOS_CHIPS));
  same('equipos_list', view.equiposList(equiposListModel(S.EQUIPOS_ROWS, S.TEAMS, S.NOW)));
  same('equipos_one', view.equiposList(equiposListModel([S.EQUIPOS_ROWS[0]], [], S.NOW)));
  same('equipos_empty', view.equiposList(equiposListModel([], S.TEAMS, S.NOW)));
});

test('Equipos history panel equals the old builder', () => {
  const head = '<div class="equipos-history-head"><h3 class="equipos-history-title">Historial de uso</h3>'
    + '<button type="button" class="wb-btn wb-btn-secondary equipos-history-close" data-eq-history-close>Cerrar</button></div>';
  same('history', view.history(sessionRows(S.SESSIONS)), head + OLD.history_table);
  same('history_empty', view.history(sessionRows([])), head + OLD.history_empty);
});
