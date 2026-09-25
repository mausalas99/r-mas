import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchLabRepoStudies, checkLabRepoHasStudies } from './lab-repo-fetch.mjs';

const validPayload = {
  registro: '9000015-1',
  desde: new Date('2026-06-27T00:00:00'),
  hasta: new Date('2026-06-27T23:59:59'),
};

test('fetchLabRepoStudies rejects with a clear error when no portal URL is set anywhere', async () => {
  delete process.env.RPLUS_LAB_PORTAL_URL;
  await assert.rejects(
    () => fetchLabRepoStudies(validPayload),
    /lab-repo-missing-portal-url/
  );
});

test('checkLabRepoHasStudies rejects with a clear error when no portal URL is set anywhere', async () => {
  delete process.env.RPLUS_LAB_PORTAL_URL;
  await assert.rejects(
    () => checkLabRepoHasStudies({ registro: '9000015-1' }),
    /lab-repo-missing-portal-url/
  );
});
