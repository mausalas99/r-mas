/** Retired LAN mutation registry — no-op for cloud-only builds. */
export function recordLanMutation() {}

export function flushLanMutationRegistry() {
  return Promise.resolve();
}
