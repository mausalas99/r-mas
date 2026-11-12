import test from 'node:test';
import { loadJsx } from '../preact-view-test-helpers.mjs';
import { sameHtml } from '../preact-html-compare.mjs';
import { clinicalUserActivityHistoryEntries } from '../../../../lib/clinical-user-activity.mjs';
import * as S from './panel-overlays-scenarios.mjs';
import OLD from './cloud-sync-overlays-view.old.json' with { type: 'json' };

const view = await loadJsx(import.meta.url, `import { AdminPromptModal, CloudNubeFixModal, EquiposHistoryModal, NubePopover } from './cloud-sync-overlays-view.jsx';
  import { RoomOptions } from './panel-admin-view.jsx';
  import { SalaOptions } from './panel-admin-equipos-view.jsx';
  import { formatCloudDiagWhen } from './cloud-sync-diagnostics-human-format.mjs';
  import { cloudHeaderStateWords, cloudHeaderSyncModifier } from './cloud-sync-header-chrome.mjs';
  import { formatTurnMonth } from './panel-conexion-html.mjs';
  import { formatCloudRoomLabel } from './room-label.mjs';
  export { formatCloudDiagWhen, cloudHeaderStateWords, cloudHeaderSyncModifier, formatTurnMonth, formatCloudRoomLabel };
  export const prompt = (p) => renderToString(<AdminPromptModal {...p} />);
  export const fix = (guide) => renderToString(<CloudNubeFixModal guide={guide} />);
  export const history = (opts) => renderToString(<EquiposHistoryModal opts={opts} />);
  export const popover = (v) => renderToString(<NubePopover v={v} />);
  export const rooms = (list) => renderToString(<RoomOptions rooms={list} />);
  export const salas = (list) => renderToString(<SalaOptions salas={list} />);`);

// Preact writes an empty value as a bare attribute; HTML parses both the same.
const bare = (s) => s.replace(/<option value>/g, '<option value="">');

test('prompt modal equals the old markup', () => {
  for (const [k, p] of Object.entries(S.PROMPTS)) sameHtml(view.prompt(p), OLD.prompt[k].replace(' />', '/>'), k);
});

test('fix modal equals the old markup', () => {
  for (const [k, g] of Object.entries(S.FIX_GUIDES)) sameHtml(view.fix(g), OLD.fix[k], k);
});

test('activity history modal equals the old markup', () => {
  for (const [k, c] of Object.entries(S.HISTORY_CASES)) sameHtml(view.history({ ...c, activity: clinicalUserActivityHistoryEntries(c.history, 999) }), OLD.history[k], k);
});

test('nube popover equals the old markup', () => {
  for (const [k, p] of Object.entries(S.POPOVERS)) {
    sameHtml(view.popover({ ...p, now: S.NOW, stateWords: view.cloudHeaderStateWords, modifier: view.cloudHeaderSyncModifier, formatMonth: view.formatTurnMonth, formatWhen: view.formatCloudDiagWhen }), OLD.popover[k], k);
  }
});

test('room and sala option lists equal the old option strings', () => {
  const rooms = (list) => list.map((r) => ({ value: String(r.id), label: view.formatCloudRoomLabel(r) }));
  sameHtml(bare(view.rooms(rooms(S.ROOMS))), OLD.rooms, 'rooms');
  sameHtml(bare(view.rooms([])), OLD.roomsEmpty, 'roomsEmpty');
  sameHtml(bare(view.salas(S.SALAS)), OLD.salas, 'salas');
  sameHtml(bare(view.salas([])), OLD.salasEmpty, 'salasEmpty');
});
