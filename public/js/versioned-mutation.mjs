export function createMutationBuilder(entityType, entityId) {
  let base = null;
  const working = {};
  const changedKeys = new Set();

  return {
    captureBase(snapshot) {
      base = structuredClone(snapshot);
      Object.assign(working, structuredClone(snapshot));
      return this;
    },
    set(key, value) {
      changedKeys.add(key);
      working[key] = value;
      return this;
    },
    build(extra = {}) {
      return {
        entityType,
        entityId,
        expectedVersion: Number(base?.version ?? 0),
        baseData: base,
        changedKeys: [...changedKeys],
        data: { ...working },
        ...extra,
      };
    },
  };
}

export function wrapLiveSyncPatch(roomId, clientId, mutation) {
  return { type: 'livesync:patch', roomId, clientId, mutation };
}
