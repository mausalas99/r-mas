/**
 * Phase 3 of docs/superpowers/plans/2026-09-21-live-module-updates.md:
 * compat-range check gating activation. A manifest with a version this core
 * build can't parse, or that falls outside [minCoreVersion, maxCoreVersion],
 * is refused — never trusted by default.
 */
import { parseSemverCore, compareSemverCore } from './update-downgrade.mjs';

/**
 * @param {string} coreVersion
 * @param {{minCoreVersion?: string, maxCoreVersion?: string}} manifest
 * @returns {boolean}
 */
export function isCoreVersionCompatible(coreVersion, manifest) {
  const core = parseSemverCore(coreVersion);
  const min = parseSemverCore(manifest && manifest.minCoreVersion);
  const max = parseSemverCore(manifest && manifest.maxCoreVersion);
  if (!core || !min || !max) return false;
  return compareSemverCore(coreVersion, manifest.minCoreVersion) >= 0
    && compareSemverCore(coreVersion, manifest.maxCoreVersion) <= 0;
}
