import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { connectedViewsHtml } from './panel-conexion-views.mjs';
import { setPatients } from '../../app-state.mjs';
import { clinicalSessionContext } from '../../clinical-session-context.mjs';
import {
  writeDeclinedRemoteDeletes,
  writeDeclinedRemoteDeleteActors,
} from './remote-patient-delete-confirm.mjs';

describe('connectedViewsHtml pending remote deletes', () => {
  /** @type {Storage} */
  let store;

  beforeEach(() => {
    const data = {};
    store = {
      getItem(k) {
        return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null;
      },
      setItem(k, v) {
        data[k] = String(v);
      },
      removeItem(k) {
        delete data[k];
      },
    };
    globalThis.localStorage = store;
  });

  afterEach(() => {
    delete globalThis.localStorage;
    setPatients([]);
    clinicalSessionContext.user = null;
  });

  const baseOpts = { cloudUser: null, roomHtml: '', equipoHtml: '', url: '' };

  it('omits the pending-deletes entry when nothing is pending', () => {
    const html = connectedViewsHtml(baseOpts);
    assert.doesNotMatch(html, /Eliminaciones pendientes/);
  });

  it('surfaces a nav row and view to an admin when a declined delete is still on this Mac', () => {
    clinicalSessionContext.user = { user_id: 'admin1', rank: 'Admin', is_program_admin: 1 };
    setPatients([{ id: 'p1', nombre: 'BENITEZ', registro: '111-1' }]);
    writeDeclinedRemoteDeletes({ p1: '2026-08-20T10:00:00Z' }, store);
    writeDeclinedRemoteDeleteActors({ p1: 'u1' }, store);

    const html = connectedViewsHtml(baseOpts);
    assert.match(html, /Eliminaciones pendientes/);
    assert.match(html, /data-cloud-view="pendientes"/);
    assert.match(html, /data-cloud-action="review-remote-delete"/);
    assert.match(html, /data-patient-id="p1"/);
  });

  it('hides the pending-deletes entry from a non-admin even when a delete is pending', () => {
    clinicalSessionContext.user = { user_id: 'nurse1', rank: 'R1', is_program_admin: 0 };
    setPatients([{ id: 'p1', nombre: 'BENITEZ', registro: '111-1' }]);
    writeDeclinedRemoteDeletes({ p1: '2026-08-20T10:00:00Z' }, store);
    writeDeclinedRemoteDeleteActors({ p1: 'u1' }, store);

    const html = connectedViewsHtml(baseOpts);
    assert.doesNotMatch(html, /Eliminaciones pendientes/);
    assert.doesNotMatch(html, /data-cloud-view="pendientes"/);
  });
});
