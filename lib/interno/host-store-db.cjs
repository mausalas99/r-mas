'use strict';

/**
 * Interno board store backed by SQLCipher clinical_blob (patients), not LAN host-store.
 * Shape matches what readInternoBoard expects: { getState(): { patients: object[] } }.
 */

/**
 * @param {() => import('better-sqlite3').Database | null} getDb
 * @returns {{ getState: () => { patients: object[] } }}
 */
function createInternoHostStoreFromDb(getDb) {
  return {
    getState() {
      const db = typeof getDb === 'function' ? getDb() : null;
      if (!db) return { patients: [] };
      try {
        const row = db
          .prepare(
            `SELECT json FROM clinical_blob WHERE namespace = 'desktop' AND blob_key = 'patients'`
          )
          .get();
        if (!row || row.json == null) return { patients: [] };
        const parsed = typeof row.json === 'string' ? JSON.parse(row.json) : row.json;
        return { patients: Array.isArray(parsed) ? parsed : [] };
      } catch {
        return { patients: [] };
      }
    },
  };
}

/**
 * Prefer DB census; fall back to legacy lanStore when DB has no patients yet.
 * @param {{ getState: () => { patients?: object[] } }} dbStore
 * @param {{ getState: () => { patients?: object[] } }} lanStore
 */
function createInternoStorePreferDb(dbStore, lanStore) {
  return {
    getState() {
      try {
        const fromDb = dbStore.getState();
        if (Array.isArray(fromDb.patients) && fromDb.patients.length > 0) return fromDb;
      } catch {
        /* fall through */
      }
      try {
        return lanStore.getState();
      } catch {
        return { patients: [] };
      }
    },
  };
}

module.exports = {
  createInternoHostStoreFromDb,
  createInternoStorePreferDb,
};
