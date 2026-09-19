export { SCHEMA_VERSION, readSchemaVersion, tableExists } from './schema-primitives.mjs';
export {
  applyMigrations,
  migrateToV15LanHostTables,
  migrateToV16UserLastActivity,
  migrateToV17UserActivityBackfill,
} from './schema-migrate-v15-v17.mjs';
export { migrateToV21ClinicalSalaCheck } from './schema-migrate-v21-clinical-sala-check.mjs';
export { migrateToV22UserActivityLog } from './schema-migrate-v22-user-activity-log.mjs';
export { migrateToV23ClinicalChangeLog } from './schema-migrate-v23-clinical-change-log.mjs';
export { migrateToV24RankTeam } from './schema-migrate-v24-rank-team.mjs';
export { migrateToV25SingleSala } from './schema-migrate-v25-single-sala.mjs';
export { migrateToV26CardioImages } from './schema-migrate-v26-cardio-images.mjs';
export { migrateToV27ActiveGuardiasIndex } from './schema-migrate-v27-active-guardias-index.mjs';
