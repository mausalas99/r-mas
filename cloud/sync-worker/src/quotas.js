export const QUOTAS = {
  maxLivePatients: 50,
  maxMembers: 20,
  maxTombstones: 100,
  tombstoneMaxAgeDays: 14,
  storageSoftBytes: 25 * 1024 * 1024,
  storageHardBytes: 50 * 1024 * 1024,
  maxRoomsCreatedPerUser: 10,
  noteMaxBytes: 256 * 1024,
  /** Raised 8/2026: real labSidecars batches were hitting ~350KB per op
   * (outbox diagnostics showed 220KB body cap rejecting pushes). Paid
   * Workers plan has no platform ceiling anywhere near this. */
  labMutationMaxBytes: 1024 * 1024,
  /** D1 hard-caps any single BLOB/row at 2,000,000 bytes. This is one
   * patient's whole lab history in one room (room_state_labs row) — margin
   * under that cap for JSON/AES-GCM overhead. Not a business quota, a
   * platform ceiling; see schema/008-shard-room-state-labs.sql. */
  labShardMaxBytes: 1_900_000,
  /** Align with desktop chunkCloudOps (6 lab ops × few patients). */
  maxOpsPerMutation: 16,
  /** Reject monster HTTP bodies before decrypt/loadRoomState. Raised 8/2026
   * (was 220KB) — real lab batches were hitting up to ~1.3MB and getting
   * rejected as payload_too_large. */
  maxMutationBodyBytes: 2 * 1024 * 1024,
};
// labs uncapped by set count
