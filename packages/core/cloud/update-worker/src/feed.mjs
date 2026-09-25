import {
  githubLatestYmlUrl,
  githubReleaseAssetUrl,
  githubRawUrl,
  gitlabReleaseAssetUrl,
  gitlabRawUrl,
} from './origins.mjs';
import { extractYmlVersion, rewriteYmlUrls } from './yml-rewrite.mjs';

/**
 * @param {typeof fetch} fetchFn
 * @param {string} url
 * @returns {Promise<Response|null>} response only if it came back ok, else null
 */
async function tryFetch(fetchFn, url) {
  try {
    const res = await fetchFn(url);
    if (res && res.ok) return res;
  } catch {
    /* network error — treat like a miss, try the next origin */
  }
  return null;
}

/**
 * GitHub first, GitLab fallback. Rewrites every `url:` field to an absolute
 * URL on whichever origin answered.
 * @param {typeof fetch} fetchFn
 * @param {string} filename "latest-mac.yml" | "latest.yml"
 * @returns {Promise<{origin: 'github'|'gitlab', body: string}|null>}
 */
export async function resolveYmlFeed(fetchFn, filename) {
  const ghRes = await tryFetch(fetchFn, githubLatestYmlUrl(filename));
  if (ghRes) {
    const text = await ghRes.text();
    const version = extractYmlVersion(text);
    const body = version ? rewriteYmlUrls(text, (f) => githubReleaseAssetUrl(version, f)) : text;
    return { origin: 'github', body };
  }

  const glRes = await tryFetch(fetchFn, gitlabReleaseAssetUrl(filename));
  if (glRes) {
    const text = await glRes.text();
    const body = rewriteYmlUrls(text, (f) => gitlabReleaseAssetUrl(f));
    return { origin: 'gitlab', body };
  }

  return null;
}

/**
 * GitHub first, GitLab fallback. No rewrite — body is proxied as-is.
 * @param {typeof fetch} fetchFn
 * @param {string} filename "min-version.json" | "stable-versions.json"
 * @returns {Promise<{origin: 'github'|'gitlab', body: string}|null>}
 */
export async function resolveJsonFeed(fetchFn, filename) {
  const ghRes = await tryFetch(fetchFn, githubRawUrl(filename));
  if (ghRes) return { origin: 'github', body: await ghRes.text() };

  const glRes = await tryFetch(fetchFn, gitlabRawUrl(filename));
  if (glRes) return { origin: 'gitlab', body: await glRes.text() };

  return null;
}

/**
 * Module feed (docs/superpowers/plans/2026-09-21-live-module-updates.md):
 * GitHub first, GitLab fallback, resolved off the LATEST RELEASE (same
 * origin builder as resolveYmlFeed, not the raw-main one resolveJsonFeed
 * uses) — module-manifest.json/module-signature.txt are release assets,
 * not files committed to main. No rewrite, text body proxied as-is.
 * @param {typeof fetch} fetchFn
 * @param {string} filename "module-manifest.json" | "module-signature.txt"
 * @returns {Promise<{origin: 'github'|'gitlab', body: string}|null>}
 */
export async function resolveReleaseTextAsset(fetchFn, filename) {
  const ghRes = await tryFetch(fetchFn, githubLatestYmlUrl(filename));
  if (ghRes) return { origin: 'github', body: await ghRes.text() };

  const glRes = await tryFetch(fetchFn, gitlabReleaseAssetUrl(filename));
  if (glRes) return { origin: 'gitlab', body: await glRes.text() };

  return null;
}

/**
 * Same origin resolution as resolveReleaseTextAsset, for the binary module
 * bundle zip — arrayBuffer, never text(), so the zip's bytes survive the
 * proxy untouched.
 * @param {typeof fetch} fetchFn
 * @param {string} filename "module-bundle.zip"
 * @returns {Promise<{origin: 'github'|'gitlab', body: ArrayBuffer}|null>}
 */
export async function resolveReleaseBinaryAsset(fetchFn, filename) {
  const ghRes = await tryFetch(fetchFn, githubLatestYmlUrl(filename));
  if (ghRes) return { origin: 'github', body: await ghRes.arrayBuffer() };

  const glRes = await tryFetch(fetchFn, gitlabReleaseAssetUrl(filename));
  if (glRes) return { origin: 'gitlab', body: await glRes.arrayBuffer() };

  return null;
}

/**
 * @param {typeof fetch} fetchFn
 * @returns {Promise<{github: 'ok'|'fail', gitlab: 'ok'|'fail', using: 'github'|'gitlab'|'none'}>}
 */
export async function probeHealth(fetchFn) {
  const gh = await tryFetch(fetchFn, githubLatestYmlUrl('latest-mac.yml'));
  const gl = await tryFetch(fetchFn, gitlabReleaseAssetUrl('latest-mac.yml'));
  return {
    github: gh ? 'ok' : 'fail',
    gitlab: gl ? 'ok' : 'fail',
    using: gh ? 'github' : gl ? 'gitlab' : 'none',
  };
}
