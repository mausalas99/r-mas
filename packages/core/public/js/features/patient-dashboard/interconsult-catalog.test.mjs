import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  INTERCONSULT_SERVICES,
  INTERCONSULT_CAT_HUE,
  REQUESTING_SERVICE_IDS,
  serviceById,
  toggleInterconsultId,
  hueForService,
  hueForRequestingService,
} from './interconsult-catalog.mjs';

describe('interconsult catalog', () => {
  it('never includes Sala as a consulting service', () => {
    const names = INTERCONSULT_SERVICES.map((s) => s.name.toLowerCase());
    const ids = INTERCONSULT_SERVICES.map((s) => s.id);
    assert.equal(names.some((n) => n === 'sala' || n.includes('sala 1')), false);
    assert.equal(ids.includes('sala'), false);
  });

  it('uses palette A hues by category only', () => {
    assert.deepEqual(INTERCONSULT_CAT_HUE, { med: 245, qx: 168, sop: 52 });
    const card = serviceById('card');
    assert.equal(card.cat, 'med');
    assert.equal(hueForService(card), 245);
    assert.equal(hueForService(serviceById('cxgen')), 168);
    assert.equal(hueForService(serviceById('uti')), 52);
  });

  it('requesting-service picker hues are distinct per service, not shared by category', () => {
    const hues = REQUESTING_SERVICE_IDS.map((id) => hueForRequestingService(serviceById(id)));
    assert.equal(new Set(hues).size, hues.length, 'each requesting service must have its own hue');
    // tyo and ncx and cxgen and gine are all cat "qx" — hueForService would collapse them to one hue.
    assert.notEqual(hueForRequestingService(serviceById('tyo')), hueForService(serviceById('tyo')));
  });

  it('toggles assigned ids without duplicates', () => {
    assert.deepEqual(toggleInterconsultId(['card'], 'nef'), ['card', 'nef']);
    assert.deepEqual(toggleInterconsultId(['card', 'nef'], 'card'), ['nef']);
    assert.deepEqual(toggleInterconsultId(['card'], 'nope'), ['card']);
  });
});
