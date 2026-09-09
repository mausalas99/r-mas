import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

describe('panel-admin-actions rotate code', () => {
  const src = readFileSync(new URL('./panel-admin-actions.mjs', import.meta.url), 'utf8');

  it('rotating the room code re-wraps the room DEK under the new code', () => {
    const start = src.indexOf('async function handleRotateCode');
    const end = src.indexOf('\nasync function ', start + 1);
    const body = src.slice(start, end > start ? end : undefined);
    const rotateAt = body.indexOf('adminRotateCode(roomId)');
    const rewrapAt = body.indexOf('rewrapRoomDekForNewCode(');
    assert.ok(rotateAt >= 0 && rewrapAt > rotateAt, 'rewrap must run after the code rotates server-side');
    assert.match(body, /rewrapRoomDekForNewCode\(deps\.getApi\(\), roomId, data\.code\)/);
  });
});

describe('panel-admin-actions archive-network-patient (Red tab)', () => {
  const src = readFileSync(new URL('./panel-admin-actions.mjs', import.meta.url), 'utf8');

  it('dispatchRoomAction routes the archive action to handleArchiveNetworkPatient with the toggled state', () => {
    const mapStart = src.indexOf('const ROOM_ACTIONS');
    const mapEnd = src.indexOf('};', mapStart);
    assert.match(src.slice(mapStart, mapEnd), /'archive-network-patient': archiveNetworkPatientAction/);
    const start = src.indexOf('function archiveNetworkPatientAction');
    const end = src.indexOf('\n\n', start + 1);
    const body = src.slice(start, end > start ? end : undefined);
    assert.match(body, /handleArchiveNetworkPatient\(deps, targetRoomId, patientId, !wasArchived\)/);
  });

  it('handleArchiveNetworkPatient delegates to the shared archiveOneNetworkPatient, then refreshes the Red tab', () => {
    const start = src.indexOf('async function handleArchiveNetworkPatient');
    const end = src.indexOf('\n/** @param {object} deps @param {string} roomId @param {string} patientId @param {string} registro */', start + 1);
    const body = src.slice(start, end > start ? end : undefined);
    assert.match(body, /archiveOneNetworkPatient\(deps\.getApi\(\), roomId, patientId, nextArchived\)/);
    assert.doesNotMatch(body, /joinRoomByCode/);
    assert.match(body, /loadAdminNetworkCensus\(deps\.root, deps\.outerDeps\)/);
  });

  it('archiveOneNetworkPatient re-pulls the room and merges archived into the existing fields before pushing', () => {
    const start = src.indexOf('async function archiveOneNetworkPatient');
    const end = src.indexOf('\n/**', start + 1);
    const body = src.slice(start, end > start ? end : undefined);
    assert.match(body, /pullNetworkPatientFields\(api, roomId, patientId\)/);
    assert.match(body, /path: `entries\/\$\{patientId\}\/fields`/);
    assert.match(body, /\.\.\.fields, archived: nextArchived/);
    assert.match(body, /api\.push\(roomId,/);
  });
});

describe('panel-admin-actions delete-network-patient (Red tab, room-scoped delete)', () => {
  const src = readFileSync(new URL('./panel-admin-actions.mjs', import.meta.url), 'utf8');

  it('dispatchRoomAction routes the delete action to handleDeleteNetworkPatient', () => {
    const mapStart = src.indexOf('const ROOM_ACTIONS');
    const mapEnd = src.indexOf('};', mapStart);
    assert.match(src.slice(mapStart, mapEnd), /'delete-network-patient': deleteNetworkPatientAction/);
    const start = src.indexOf('function deleteNetworkPatientAction');
    const end = src.indexOf('\n\n', start + 1);
    const body = src.slice(start, end > start ? end : undefined);
    assert.match(body, /handleDeleteNetworkPatient\(deps, targetRoomId, patientId, registro\)/);
  });

  it('handleDeleteNetworkPatient confirms, then delegates to the shared deleteOneNetworkPatient, then refreshes', () => {
    const start = src.indexOf('async function handleDeleteNetworkPatient');
    const end = src.indexOf('\n/**', start + 1);
    const body = src.slice(start, end > start ? end : undefined);
    assert.match(body, /confirmAction\(/);
    assert.match(body, /deleteOneNetworkPatient\(deps\.getApi\(\), roomId, patientId, registro\)/);
    assert.doesNotMatch(body, /joinRoomByCode/);
    assert.match(body, /loadAdminNetworkCensus\(deps\.root, deps\.outerDeps\)/);
  });

  it('deleteOneNetworkPatient pushes a tombstone op scoped to that one room', () => {
    const start = src.indexOf('async function deleteOneNetworkPatient');
    const end = src.indexOf('\n/**', start + 1);
    const body = src.slice(start, end > start ? end : undefined);
    assert.match(body, /buildCloudTombstoneOp\(patientId,/);
    assert.match(body, /api\.push\(roomId,/);
  });
});

describe('panel-admin-actions handleSwitchNetworkRoom scopes the pull to one patient', () => {
  const src = readFileSync(new URL('./panel-admin-actions.mjs', import.meta.url), 'utf8');

  it('scopes the pulled state to the opened patient before merging it in, instead of the whole room', () => {
    const start = src.indexOf('async function handleSwitchNetworkRoom');
    const end = src.indexOf('\n/**', start + 1);
    const body = src.slice(start, end > start ? end : undefined);
    assert.match(body, /scopeCloudStateToPatient\(data\.state, patientId\)/);
    assert.match(body, /applyCloudPullResult\(\{ needSnapshot: true, state: scoped \}\)/);
  });
});

describe('panel-admin-actions bulk archive/delete on the Red tab (multiselect)', () => {
  const src = readFileSync(new URL('./panel-admin-actions.mjs', import.meta.url), 'utf8');

  it('bulk-archive-network and bulk-delete-network are wired into dispatchSimpleAction', () => {
    const start = src.indexOf('function dispatchSimpleAction');
    const end = src.indexOf('\n/**', start + 1);
    const body = src.slice(start, end > start ? end : undefined);
    assert.match(body, /'bulk-archive-network': \(\) => void handleBulkArchiveNetwork\(deps\)/);
    assert.match(body, /'bulk-delete-network': \(\) => void handleBulkDeleteNetwork\(deps\)/);
  });

  it('handleBulkArchiveNetwork only archives selected patients that are not already archived', () => {
    const start = src.indexOf('async function handleBulkArchiveNetwork');
    const end = src.indexOf('\n/**', start + 1);
    const body = src.slice(start, end > start ? end : undefined);
    assert.match(body, /listSelectedNetworkPatients\(deps\.root\)/);
    assert.match(body, /filter\(\(p\) => !p\.archived && p\.roomId && p\.patientId\)/);
    assert.match(body, /confirmAction\(/);
    assert.match(body, /archiveOneNetworkPatient\(api, p\.roomId, p\.patientId, true\)/);
    assert.match(body, /loadAdminNetworkCensus\(deps\.root, deps\.outerDeps\)/);
  });

  it('handleBulkDeleteNetwork only deletes selected patients that are already archived, skipping the rest', () => {
    const start = src.indexOf('async function handleBulkDeleteNetwork');
    const end = src.indexOf('\n/**', start + 1);
    const body = src.slice(start, end > start ? end : undefined);
    assert.match(body, /filter\(\(p\) => p\.archived && p\.roomId && p\.patientId\)/);
    assert.match(body, /confirmAction\(/);
    assert.match(body, /deleteOneNetworkPatient\(api, p\.roomId, p\.patientId, p\.registro\)/);
    assert.match(body, /loadAdminNetworkCensus\(deps\.root, deps\.outerDeps\)/);
  });
});
