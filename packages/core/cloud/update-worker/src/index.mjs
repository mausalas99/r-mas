import {
  resolveYmlFeed,
  resolveJsonFeed,
  resolveReleaseTextAsset,
  resolveReleaseBinaryAsset,
  probeHealth,
} from './feed.mjs';

const YML_FILES = new Set(['latest-mac.yml', 'latest.yml']);
const JSON_FILES = new Set(['min-version.json', 'stable-versions.json']);
// Module feed routes (docs/superpowers/plans/2026-09-21-live-module-updates.md):
// same host as the full-app update feed, but a distinct filename set the
// full-app update code never touches — separate from that feed by
// construction (Jev 0.68 chose a decoupled feed after a past incident where
// pointing HF/Neumo at IM's feed made them poll IM's releases by mistake).
const MODULE_TEXT_FILES = new Map([
  ['module-manifest.json', 'application/json'],
  ['module-signature.txt', 'text/plain; charset=utf-8'],
]);
const MODULE_BINARY_FILES = new Map([['module-bundle.zip', 'application/zip']]);
const CACHE_CONTROL = 's-maxage=60';

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const TELEMETRY_RESULTS = new Set(['success', 'fail']);
const TELEMETRY_PLATFORMS = new Set(['darwin', 'win32', 'linux', 'web', 'unknown']);
const TELEMETRY_VERSION_RE = /^[\w.-]{1,32}$/;

/**
 * Anonymous update telemetry: exactly { version, result, platform }, nothing
 * else stored — no IP, no headers, no ids. The app posts with no-cors, so the
 * body arrives as text/plain and the response is never read.
 * @param {Request} request
 * @param {{ UPDATE_EVENTS?: { writeDataPoint(p: object): void } }} env
 */
async function handleTelemetry(request, env) {
  const text = await request.text();
  if (text.length > 512) return new Response(null, { status: 413 });
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  const { version, result, platform } = body || {};
  if (
    !TELEMETRY_RESULTS.has(result) ||
    !TELEMETRY_PLATFORMS.has(platform) ||
    typeof version !== 'string' ||
    !TELEMETRY_VERSION_RE.test(version)
  ) {
    return new Response(null, { status: 400 });
  }
  env?.UPDATE_EVENTS?.writeDataPoint({ blobs: [version, result, platform], indexes: [version] });
  return new Response(null, { status: 204 });
}

/**
 * @param {Request} request
 * @param {object} [env]
 */
export async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/+/, '');

  if (path === 'telemetry' && request.method === 'POST') {
    return handleTelemetry(request, env);
  }

  if (path === 'health') {
    return jsonResponse(await probeHealth(fetch));
  }

  if (YML_FILES.has(path)) {
    const result = await resolveYmlFeed(fetch, path);
    if (!result) {
      return new Response('update feed unavailable: GitHub and GitLab both failed', { status: 502 });
    }
    return new Response(result.body, {
      status: 200,
      headers: { 'Content-Type': 'text/yaml; charset=utf-8', 'Cache-Control': CACHE_CONTROL },
    });
  }

  if (JSON_FILES.has(path)) {
    const result = await resolveJsonFeed(fetch, path);
    if (!result) {
      return new Response('feed unavailable: GitHub and GitLab both failed', { status: 502 });
    }
    return new Response(result.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': CACHE_CONTROL,
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  if (MODULE_TEXT_FILES.has(path)) {
    const result = await resolveReleaseTextAsset(fetch, path);
    if (!result) {
      return new Response('module feed unavailable: GitHub and GitLab both failed', { status: 502 });
    }
    return new Response(result.body, {
      status: 200,
      headers: { 'Content-Type': MODULE_TEXT_FILES.get(path), 'Cache-Control': CACHE_CONTROL },
    });
  }

  if (MODULE_BINARY_FILES.has(path)) {
    const result = await resolveReleaseBinaryAsset(fetch, path);
    if (!result) {
      return new Response('module feed unavailable: GitHub and GitLab both failed', { status: 502 });
    }
    return new Response(result.body, {
      status: 200,
      headers: { 'Content-Type': MODULE_BINARY_FILES.get(path), 'Cache-Control': CACHE_CONTROL },
    });
  }

  return new Response('not found', { status: 404 });
}

export default {
  /** @param {Request} request @param {object} env */
  async fetch(request, env) {
    return handleRequest(request, env);
  },
};
