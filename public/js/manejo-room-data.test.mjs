import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mergeManejoRoomData,
  mergeManejoFromSources,
  collectManejoRoomPayload,
  isLanManejoRoomSyncEnabled,
} from './manejo-room-data.mjs';

test('mergeManejoRoomData LWW custom protocol by updatedAt', () => {
  const a = {
    customProtocols: [{ id: 'p1', title: 'Old', updatedAt: '2026-05-26T08:00:00.000Z' }],
    overrides: {},
    favorites: [],
    recent: [],
    updatedAt: '2026-05-26T08:00:00.000Z',
  };
  const b = {
    customProtocols: [{ id: 'p1', title: 'New', updatedAt: '2026-05-26T10:00:00.000Z' }],
    overrides: {},
    favorites: [],
    recent: [],
    updatedAt: '2026-05-26T10:00:00.000Z',
  };
  const m = mergeManejoRoomData(a, b);
  assert.equal(m.customProtocols[0].title, 'New');
});

test('manejo oculto en producto no participa en sync LAN', () => {
  assert.equal(isLanManejoRoomSyncEnabled(), false);
  assert.equal(collectManejoRoomPayload(), null);
  assert.equal(
    mergeManejoFromSources([
      { manejo: { favorites: ['a'], customProtocols: [], overrides: {}, recent: [], updatedAt: '1' } },
      { manejo: { favorites: ['b'], customProtocols: [], overrides: {}, recent: [], updatedAt: '2' } },
    ]),
    null
  );
});

test('mergeManejoFromSources unions favorites when sync habilitado', () => {
  // mergeManejoRoomData sigue disponible para datos legacy en repo; sync LAN está apagado en producto.
  const m = mergeManejoRoomData(
    { favorites: ['a'], customProtocols: [], overrides: {}, recent: [], updatedAt: '1' },
    { favorites: ['b'], customProtocols: [], overrides: {}, recent: [], updatedAt: '2' }
  );
  assert.deepEqual(m.favorites, ['b', 'a']);
});
