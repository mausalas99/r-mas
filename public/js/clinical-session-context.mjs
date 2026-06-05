/**
 * Shared clinical session bag — leaf module (no imports) to avoid ESM cycles
 * with LAN orchestrator / guardia-board / clinical-access-runtime.
 */

/** @type {{ user: object|null, guardias: object[], guardiasMap: Map<string, object>, teams: object[], scopeContext: object|null, guardiaMode: boolean, decryptedPrivateKeyPem: string|null, lastBlockHashByPatient: Map<string, string> }} */
export const clinicalSessionContext = {
  user: null,
  guardias: [],
  guardiasMap: new Map(),
  teams: [],
  scopeContext: null,
  guardiaMode: false,
  decryptedPrivateKeyPem: null,
  lastBlockHashByPatient: new Map(),
};
