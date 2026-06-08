'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { subnetPrefixFromIpv4 } = require('./lan-candidate-url.js');

const VERSION = 1;
const MAX_URLS = 20;
const MAX_PREFIXES = 12;
const MAX_HINT_URLS = 8;
const DEFAULT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_PORT = 3738;

function tsNow() {
  return Date.now();
}

function emptyRegistry() {
  return { version: VERSION, updatedAt: tsNow(), hostUrls: [], prefixes: [] };
}

function normalizeHostUrl(raw) {
  const s = String(raw || '').trim().replace(/\/+$/, '');
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  return `http://${s}`;
}

function hostIpv4FromBase(base) {
  try {
    const u = new URL(normalizeHostUrl(base));
    return String(u.hostname || '');
  } catch (_e) {
    return '';
  }
}

function prefixFromUrl(url) {
  return subnetPrefixFromIpv4(hostIpv4FromBase(url));
}

function atomicWriteJson(filePath, data) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data), 'utf8');
  fs.renameSync(tmp, filePath);
}

/**
 * @param {{ filePath?: string }} opts
 */
function createWardHostRegistry(opts = {}) {
  const filePath = opts.filePath ? String(opts.filePath) : '';

  function load() {
    if (!filePath || !fs.existsSync(filePath)) return emptyRegistry();
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (!parsed || parsed.version !== VERSION) return emptyRegistry();
      return {
        version: VERSION,
        updatedAt: Number(parsed.updatedAt) || tsNow(),
        hostUrls: Array.isArray(parsed.hostUrls) ? parsed.hostUrls : [],
        prefixes: Array.isArray(parsed.prefixes)
          ? parsed.prefixes.map((p) => String(p || '').trim()).filter(Boolean)
          : [],
      };
    } catch (e) {
      console.error('[ward-host-registry] load failed:', e && e.message ? e.message : e);
      return emptyRegistry();
    }
  }

  function save(reg) {
    const payload = {
      version: VERSION,
      updatedAt: tsNow(),
      hostUrls: Array.isArray(reg.hostUrls) ? reg.hostUrls.slice(0, MAX_URLS) : [],
      prefixes: Array.isArray(reg.prefixes) ? reg.prefixes.slice(0, MAX_PREFIXES) : [],
    };
    if (filePath) {
      try {
        atomicWriteJson(filePath, payload);
      } catch (e) {
        console.error('[ward-host-registry] save failed:', e && e.message ? e.message : e);
      }
    }
    return payload;
  }

  function recordPrefix(prefix, regIn) {
    const p = String(prefix || '').trim();
    if (!/^\d+\.\d+\.\d+$/.test(p)) return regIn || load();
    const reg = regIn || load();
    const idx = reg.prefixes.indexOf(p);
    if (idx >= 0) reg.prefixes.splice(idx, 1);
    reg.prefixes.unshift(p);
    reg.prefixes = reg.prefixes.slice(0, MAX_PREFIXES);
    return regIn ? reg : save(reg);
  }

  function recordUrl(url, meta = {}) {
    const normalized = normalizeHostUrl(url);
    if (!normalized) return load();
    const reg = load();
    const prefix = prefixFromUrl(normalized);
    const source =
      meta.source === 'manual' || meta.source === 'client' || meta.source === 'host'
        ? meta.source
        : 'host';
    const ts = tsNow();
    const idx = reg.hostUrls.findIndex((e) => normalizeHostUrl(e.url) === normalized);
    const entry = {
      url: normalized,
      prefix,
      lastSeenAt: ts,
      lastOkAt: ts,
      source,
    };
    if (idx >= 0) {
      const prev = reg.hostUrls[idx];
      entry.source = meta.source || prev.source || source;
      reg.hostUrls.splice(idx, 1);
    }
    reg.hostUrls.unshift(entry);
    if (prefix) recordPrefix(prefix, reg);
    reg.hostUrls = reg.hostUrls.slice(0, MAX_URLS);
    return save(reg);
  }

  function merge(other) {
    if (!other || typeof other !== 'object') return load();
    if (Array.isArray(other.hostUrls)) {
      for (const item of other.hostUrls) {
        const url = typeof item === 'string' ? item : item && item.url;
        if (!url) continue;
        const src = typeof item === 'object' && item.source === 'host' ? 'host' : 'client';
        recordUrl(url, { source: src });
      }
    }
    if (Array.isArray(other.prefixes)) {
      for (const p of other.prefixes) recordPrefix(p);
    }
    return load();
  }

  function prune(maxAgeMs = DEFAULT_MAX_AGE_MS) {
    const cutoff = tsNow() - maxAgeMs;
    const reg = load();
    reg.hostUrls = reg.hostUrls.filter(
      (e) => Number(e.lastOkAt || e.lastSeenAt || 0) >= cutoff
    );
    return save(reg);
  }

  function clear() {
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error('[ward-host-registry] clear failed:', e && e.message ? e.message : e);
      }
    }
    return emptyRegistry();
  }

  /** @param {number} [maxAgeMs] */
  function getHintsForExchange(maxAgeMs = DEFAULT_MAX_AGE_MS) {
    const cutoff = tsNow() - maxAgeMs;
    const reg = load();
    const seen = new Set();
    const hostUrls = [];
    const sorted = [...reg.hostUrls].sort(
      (a, b) =>
        Number(b.lastOkAt || b.lastSeenAt || 0) - Number(a.lastOkAt || a.lastSeenAt || 0)
    );
    for (const row of sorted) {
      const url = normalizeHostUrl(row.url);
      if (!url || seen.has(url)) continue;
      if (Number(row.lastOkAt || row.lastSeenAt || 0) < cutoff) continue;
      seen.add(url);
      hostUrls.push({
        url,
        prefix: String(row.prefix || prefixFromUrl(url)),
        source: row.source === 'client' ? 'client' : 'host',
      });
      if (hostUrls.length >= MAX_HINT_URLS) break;
    }
    return {
      hostUrls,
      prefixes: reg.prefixes.slice(0, MAX_PREFIXES),
    };
  }

  function seedFromCandidateBaseUrl(candidateBaseUrl) {
    const { listPrivateIpv4SubnetPrefixes } = require('./lan-candidate-url.js');
    const url = normalizeHostUrl(candidateBaseUrl);
    if (url) recordUrl(url, { source: 'host' });
    for (const p of listPrivateIpv4SubnetPrefixes()) recordPrefix(p);
    return load();
  }

  return {
    load,
    save,
    recordUrl,
    recordPrefix,
    merge,
    prune,
    clear,
    getHintsForExchange,
    seedFromCandidateBaseUrl,
    normalizeHostUrl,
    DEFAULT_PORT,
  };
}

module.exports = { createWardHostRegistry, normalizeHostUrl: normalizeHostUrl };
