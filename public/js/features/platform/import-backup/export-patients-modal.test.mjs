import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clinicalSessionContext } from '../../../clinical-access-runtime.mjs';
import { canExportIcRegistryCsv } from './export-patients-modal.mjs';

test('canExportIcRegistryCsv is Admin-only', () => {
  clinicalSessionContext.user = { rank: 'Team' };
  assert.equal(canExportIcRegistryCsv(), false);

  clinicalSessionContext.user = { rank: 'Admin' };
  assert.equal(canExportIcRegistryCsv(), true);

  clinicalSessionContext.user = { rank: 'Team', is_program_admin: 1 };
  assert.equal(canExportIcRegistryCsv(), true);

  clinicalSessionContext.user = null;
  assert.equal(canExportIcRegistryCsv(), false);
});
