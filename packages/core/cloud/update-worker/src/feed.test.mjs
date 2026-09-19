import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveYmlFeed, resolveJsonFeed, probeHealth } from './feed.mjs';
import { githubLatestYmlUrl, gitlabReleaseAssetUrl, githubRawUrl, gitlabRawUrl } from './origins.mjs';

const SAMPLE_YML = [
  'version: 8.1.4',
  'files:',
  '  - url: R+-8.1.4-autoupdate-mac-arm64.zip',
  '    sha512: abc',
  '    size: 123',
  '  - url: R+-8.1.4-autoupdate-mac-x64.zip',
  '    sha512: def',
  '    size: 456',
  'path: R+-8.1.4-autoupdate-mac-x64.zip',
  'sha512: def',
  'releaseDate: "2026-08-15T00:00:00.000Z"',
].join('\n');

function fetchOk(body) {
  return async () => ({ ok: true, status: 200, text: async () => body });
}

function fetchFail() {
  return async () => ({ ok: false, status: 404, text: async () => 'not found' });
}

/** Routes distinct responses to distinct URLs; unmatched URLs fail. */
function fetchByUrl(map) {
  return async (url) => {
    if (Object.prototype.hasOwnProperty.call(map, url)) {
      return { ok: true, status: 200, text: async () => map[url] };
    }
    return { ok: false, status: 404, text: async () => 'not found' };
  };
}

describe('resolveYmlFeed', () => {
  it('GitHub 200 -> rewrites url fields to absolute GitHub release URLs', async () => {
    const fetchFn = fetchByUrl({ [githubLatestYmlUrl('latest-mac.yml')]: SAMPLE_YML });
    const result = await resolveYmlFeed(fetchFn, 'latest-mac.yml');
    assert.equal(result.origin, 'github');
    assert.match(
      result.body,
      /url: https:\/\/github\.com\/mausalas99\/r-mas\/releases\/download\/v8\.1\.4\/R\+-8\.1\.4-autoupdate-mac-arm64\.zip/
    );
    assert.match(
      result.body,
      /url: https:\/\/github\.com\/mausalas99\/r-mas\/releases\/download\/v8\.1\.4\/R\+-8\.1\.4-autoupdate-mac-x64\.zip/
    );
  });

  it('GitHub 404 + GitLab 200 -> rewrites url fields to absolute GitLab URLs', async () => {
    const fetchFn = fetchByUrl({ [gitlabReleaseAssetUrl('latest-mac.yml')]: SAMPLE_YML });
    const result = await resolveYmlFeed(fetchFn, 'latest-mac.yml');
    assert.equal(result.origin, 'gitlab');
    assert.match(
      result.body,
      /url: https:\/\/gitlab\.com\/rmas-group1\/rmas\/-\/releases\/permalink\/latest\/downloads\/R\+-8\.1\.4-autoupdate-mac-arm64\.zip/
    );
  });

  it('both fail -> null', async () => {
    const result = await resolveYmlFeed(fetchFail(), 'latest-mac.yml');
    assert.equal(result, null);
  });
});

describe('resolveJsonFeed', () => {
  it('GitHub 200 -> proxies body untouched', async () => {
    const fetchFn = fetchByUrl({ [githubRawUrl('min-version.json')]: '{"minVersion":"8.0.0"}' });
    const result = await resolveJsonFeed(fetchFn, 'min-version.json');
    assert.equal(result.origin, 'github');
    assert.equal(result.body, '{"minVersion":"8.0.0"}');
  });

  it('GitHub 404 + GitLab 200 -> proxies GitLab body', async () => {
    const fetchFn = fetchByUrl({ [gitlabRawUrl('min-version.json')]: '{"minVersion":"8.0.0"}' });
    const result = await resolveJsonFeed(fetchFn, 'min-version.json');
    assert.equal(result.origin, 'gitlab');
    assert.equal(result.body, '{"minVersion":"8.0.0"}');
  });

  it('both fail -> null', async () => {
    const result = await resolveJsonFeed(fetchFail(), 'min-version.json');
    assert.equal(result, null);
  });
});

describe('probeHealth', () => {
  it('reports ok/fail per origin and prefers github when both are up', async () => {
    const fetchFn = fetchOk(SAMPLE_YML);
    const health = await probeHealth(fetchFn);
    assert.deepEqual(health, { github: 'ok', gitlab: 'ok', using: 'github' });
  });

  it('falls back to gitlab when github is down', async () => {
    const fetchFn = fetchByUrl({ [gitlabReleaseAssetUrl('latest-mac.yml')]: SAMPLE_YML });
    const health = await probeHealth(fetchFn);
    assert.deepEqual(health, { github: 'fail', gitlab: 'ok', using: 'gitlab' });
  });

  it('using is none when both are down', async () => {
    const health = await probeHealth(fetchFail());
    assert.deepEqual(health, { github: 'fail', gitlab: 'fail', using: 'none' });
  });
});
