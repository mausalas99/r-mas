export { SCHEMA_VERSION, readSchemaVersion, tableExists } from './schema-primitives.mjs';
export {
  applyMigrations,
  migrateToV15LanHostTables,
  migrateToV16UserLastActivity,
  migrateToV17UserActivityBackfill,
} from './schema-migrate-v15-v17.mjs';
