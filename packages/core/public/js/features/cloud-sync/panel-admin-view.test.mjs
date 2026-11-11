process.env.TZ = 'UTC'; // hour groups and times are local; the fixtures were captured in UTC
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadJsx } from '../preact-view-test-helpers.mjs';
import {
  mutationsModel, networkCensusModel, resumenExtrasModel, resumenModel, roomDetailModel, salasModel,
} from './panel-admin-html.mjs';
import * as S from './panel-admin-view-scenarios.mjs';

const view = await loadJsx(import.meta.url, `import { AdminResumen, AdminResumenExtras, AdminSalas, AdminRoomDetail, AdminRed, AdminMutations } from './panel-admin-view.jsx';
  export const resumen = (m) => renderToString(<AdminResumen model={m} />);
  export const extras = (m) => renderToString(<AdminResumenExtras model={m} />);
  export const salas = (m) => renderToString(<AdminSalas model={m} />);
  export const detail = (m) => renderToString(<AdminRoomDetail model={m} />);
  export const red = (m) => renderToString(<AdminRed model={m} />);
  export const mutations = (m) => renderToString(<AdminMutations model={m} />);`);

// Exact markup the old string builders in panel-admin-html.mjs made (synthetic data, fixed clock).
import OLD from './panel-admin-view.old.json' with { type: 'json' };

// Preact writes void tags as <x/>, empty attributes as name="" (but a bare value), a trailing ';' in style, and
// leaves '>' unescaped; HTML parses both the same.
const norm = (s) => s.replace(/ ?\/>/g, '>').replace(/ (data-[\w-]+)=""/g, ' $1').replace(/&gt;/g, '>')
  .replace(/<option value>/g, '<option value="">').replace(/(style="[^"]*);"/g, '$1"');
const same = (name, got) => assert.equal(norm(got), norm(OLD[name]));
const now = new Date(S.NOW);

test('Resumen equals the old builder', () => {
  same('resumen_full', view.resumen(resumenModel(S.RESUMEN.full, now)));
  same('resumen_bare', view.resumen(resumenModel(S.RESUMEN.bare, now)));
});

test('Resumen extras equal the old builder', () => {
  same('extras_full', view.extras(resumenExtrasModel(S.EXTRAS.full)));
  same('extras_single', view.extras(resumenExtrasModel(S.EXTRAS.single)));
  same('extras_none', view.extras(resumenExtrasModel(S.EXTRAS.none)));
});

test('Salas equals the old builder', () => {
  const host = OLD.salas_host;
  same('salas_full', view.salas(salasModel(S.SALAS.rooms, S.SALAS.mine)));
  same('salas_one_month', view.salas(salasModel(S.SALAS.oneMonth, '')));
  same('salas_empty', view.salas(salasModel([], '')));
  // With a room's detail open the host follows the cards.
  assert.equal(norm(view.salas(salasModel(S.SALAS.oneMonth, '', true))), norm(OLD.salas_one_month + host));
});

test('Room detail equals the old builder', () => {
  same('detail_full', view.detail(roomDetailModel(S.ROOM_DETAIL)));
  same('detail_none', view.detail(roomDetailModel(S.ROOM_DETAIL.none)));
});

test('Pacientes (Red) equals the old builder', () => {
  same('red_full', view.red(networkCensusModel(S.CENSUS, S.CENSUS_USERS, S.NOW)));
  same('red_one_unnamed', view.red(networkCensusModel(S.CENSUS_ONE_UNNAMED, [], S.NOW)));
  same('red_empty', view.red(networkCensusModel(S.CENSUS_EMPTY, [], S.NOW)));
});

test('Registro list equals the old builder', () => {
  same('mutations_full', view.mutations(mutationsModel(S.MUTATIONS, S.CENSUS_USERS, S.NOW)));
  same('mutations_one', view.mutations(mutationsModel(S.MUTATIONS_ONE, [], S.NOW)));
  same('mutations_none', view.mutations(mutationsModel([], [], S.NOW)));
});
