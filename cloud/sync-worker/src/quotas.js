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
  /** D1 hard-caps any single BLOB/row at 2,000,000 bytes. Since schema 010,
   * this guards ONE lab set's row (room_state_lab_sets), not a whole
   * patient's history — margin under the cap for JSON/AES-GCM overhead.
   * A single set is already ≤ labMutationMaxBytes (1MB), so this should
   * never fire in practice; it's a defense-in-depth platform ceiling, not
   * a business quota. See schema/010-shard-room-state-lab-sets.sql. */
  labShardMaxBytes: 1_900_000,
  /** Align with desktop chunkCloudOps (6 lab ops × few patients). */
  maxOpsPerMutation: 16,
  /** Reject monster HTTP bodies before decrypt/loadRoomState. Raised 8/2026
   * (was 220KB) — real lab batches were hitting up to ~1.3MB and getting
   * rejected as payload_too_large. */
  maxMutationBodyBytes: 2 * 1024 * 1024,
  /** Workers RPC (db.batch()) hard-caps a call's serialized arguments at
   * 32MiB. D1's binding sends BLOB params as a JSON digit-list over that
   * RPC, not raw bytes — ~7.14 bytes of serialized payload per raw
   * ciphertext byte for random AES-GCM output. So the real per-commit
   * budget is ~32MiB / 7.14, with margin for the other bound params. Guard
   * on this BEFORE calling db.batch(), or D1 throws an opaque RPC error
   * instead of a clear payload_too_large. */
  batchRawBytes: 4 * 1024 * 1024,
};
// labs uncapped by set count
