export const QUOTAS = {
  maxLivePatients: 50,
  maxMembers: 20,
  maxTombstones: 100,
  tombstoneMaxAgeDays: 14,
  storageSoftBytes: 25 * 1024 * 1024,
  storageHardBytes: 50 * 1024 * 1024,
  maxRoomsCreatedPerUser: 10,
  noteMaxBytes: 256 * 1024,
  labMutationMaxBytes: 512 * 1024,
  /** Align with desktop chunkCloudOps (6 lab ops × few patients). */
  maxOpsPerMutation: 16,
  /** Reject monster HTTP bodies before decrypt/loadRoomState. */
  maxMutationBodyBytes: 220 * 1024,
};
// labs uncapped by set count
