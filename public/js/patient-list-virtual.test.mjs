import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldVirtualizeActiveZone,
  PATIENT_ACTIVE_VIRTUAL_THRESHOLD,
  mountPatientActiveZoneVirtual,
  destroyPatientActiveZoneVirtual,
} from './patient-list-virtual.mjs';

describe('patient-list-virtual', () => {
  it('shouldVirtualizeActiveZone gates at threshold', () => {
    assert.equal(PATIENT_ACTIVE_VIRTUAL_THRESHOLD, 30);
    assert.equal(shouldVirtualizeActiveZone(30), false);
    assert.equal(shouldVirtualizeActiveZone(31), true);
  });

  it('mountPatientActiveZoneVirtual renders subset of cards', () => {
    if (typeof document === 'undefined') return;

    const list = document.createElement('div');
    list.id = 'patient-list';
    Object.defineProperty(list, 'clientHeight', { value: 400, configurable: true });
    Object.defineProperty(list, 'getBoundingClientRect', {
      value: () => ({ top: 0, bottom: 400, left: 0, right: 200, width: 200, height: 400 }),
      configurable: true,
    });

    const zone = document.createElement('div');
    zone.className = 'patient-sort-zone patient-sort-zone--virtual-active';
    zone.setAttribute('data-patient-zone', 'active');
    list.appendChild(zone);
    document.body.appendChild(list);

    Object.defineProperty(zone, 'getBoundingClientRect', {
      value: () => ({ top: 40, bottom: 360, left: 0, right: 200, width: 200, height: 320 }),
      configurable: true,
    });
    Object.defineProperty(zone, 'clientHeight', { value: 200, configurable: true });

    const items = Array.from({ length: 40 }, (_, i) => ({
      id: `p${i}`,
      nombre: `Patient ${i}`,
      cuarto: '1',
      cama: '1',
      servicio: 'S',
      pinned: false,
      archived: false,
    }));

    const renderCardHtml = (p) =>
      `<div class="patient-card" data-patient-id="${p.id}"><div class="p-name">${p.nombre}</div></div>`;

    const vs = mountPatientActiveZoneVirtual({
      zoneEl: zone,
      listEl: list,
      items,
      renderCardHtml,
      ctx: { activeId: 'p5', isRonda: false },
    });

    assert.ok(vs);
    assert.equal(zone.getAttribute('data-active-ids')?.split(',').length, 40);
    const cards = zone.querySelectorAll('.patient-card[data-patient-id]');
    assert.ok(cards.length > 0);
    assert.ok(cards.length < 40);
    assert.ok([...cards].some((el) => el.getAttribute('data-patient-id') === 'p0'));
    // Regression: must set an explicit `height`, not `max-height`. With only
    // max-height, a fresh empty zone has 0 content height on first mount, so
    // the virtual-scroll's first clientHeight read sees 0 and renders no cards.
    assert.ok(zone.style.height, 'zone should get an explicit height, not just max-height');
    assert.equal(zone.style.maxHeight, '');
    // Regression: flex-shrink must be pinned to 0. With shrink:1 (the CSS
    // default here) + min-height:0, the flex layout can shrink this box back
    // to 0 to fit its siblings even though an explicit height was just set.
    assert.equal(zone.style.flexShrink, '0');

    destroyPatientActiveZoneVirtual();
    list.remove();
  });
});
