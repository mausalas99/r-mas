import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pickDefaultDowngradeVersion,
  isBlockedByMinVersion,
  resolveDowngradeEntries,
  filterEntriesWithGitHubReleases,
  fetchStableVersionsCatalog,
} from './stable-downgrade-ui.mjs';
import { UPDATE_WORKER_URL } from '../../lib/update-feed.mjs';

test('pickDefaultDowngradeVersion elige recommended', () => {
  const v = pickDefaultDowngradeVersion([
    { version: '6.5.3', recommended: true },
    { version: '6.5.2' },
  ]);
  assert.equal(v, '6.5.3');
});

test('pickDefaultDowngradeVersion cae al primero', () => {
  assert.equal(
    pickDefaultDowngradeVersion([{ version: '6.5.2' }, { version: '6.5.1' }]),
    '6.5.2'
  );
});

test('isBlockedByMinVersion respeta minVersion remoto', () => {
  assert.equal(isBlockedByMinVersion('6.5.2', '6.5.3'), true);
  assert.equal(isBlockedByMinVersion('6.5.3', '6.5.3'), false);
  assert.equal(isBlockedByMinVersion('6.5.4', '6.5.3'), false);
});

test('resolveDowngradeEntries excluye versión actual', () => {
  const raw = {
    entries: [
      { version: '6.5.4', label: '6.5.4' },
      { version: '6.5.3', label: '6.5.3', recommended: true },
    ],
  };
  const { entries } = resolveDowngradeEntries(raw, '6.5.4', 'remote');
  assert.equal(entries.length, 1);
  assert.equal(entries[0].version, '6.5.3');
});

test('filterEntriesWithGitHubReleases oculta tags borrados en GitHub', () => {
  const entries = [
    { version: '6.5.3', label: '6.5.3' },
    { version: '6.5.0', label: '6.5.0', recommended: true },
    { version: '6.4.2', label: '6.4.2' },
  ];
  const out = filterEntriesWithGitHubReleases(entries, ['v6.5.0', 'v6.4.2', 'v6.3.6']);
  assert.deepEqual(
    out.map((e) => e.version),
    ['6.5.0', '6.4.2']
  );
});

test('fetchStableVersionsCatalog probes the update Worker before GitHub raw', async () => {
  const prevFetch = globalThis.fetch;
  const requested = [];
  globalThis.fetch = async (url) => {
    requested.push(url);
    return { ok: false };
  };
  try {
    await fetchStableVersionsCatalog();
    const workerIdx = requested.indexOf(`${UPDATE_WORKER_URL}stable-versions.json`);
    const githubRawIdx = requested.indexOf(
      'https://raw.githubusercontent.com/mausalas99/r-mas/main/stable-versions.json'
    );
    assert.ok(workerIdx >= 0, 'Worker catalog URL should be requested');
    assert.ok(githubRawIdx >= 0, 'GitHub raw catalog URL should be requested as fallback');
    assert.ok(workerIdx < githubRawIdx, 'Worker must be probed before GitHub raw');
  } finally {
    globalThis.fetch = prevFetch;
  }
});

test('fetchStableVersionsCatalog uses the Worker catalog when it answers', async () => {
  const prevFetch = globalThis.fetch;
  const prevWindow = globalThis.window;
  globalThis.window = { electronAPI: { getAppVersion: async () => '9.9.9' } };
  globalThis.fetch = async (url) => {
    if (url === `${UPDATE_WORKER_URL}stable-versions.json`) {
      return {
        ok: true,
        json: async () => ({
          entries: [{ version: '6.5.3', label: '6.5.3', recommended: true }],
        }),
      };
    }
    return { ok: false };
  };
  try {
    const result = await fetchStableVersionsCatalog();
    assert.equal(result.source, 'remote');
    assert.ok(result.entries.some((e) => e.version === '6.5.3'));
  } finally {
    globalThis.fetch = prevFetch;
    globalThis.window = prevWindow;
  }
});
