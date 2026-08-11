/** In-memory clinical blob adapter for tests / web doubles. */
export function createMemoryClinicalAdapter(seed = {}) {
  /** @type {Record<string, string>} */
  const blobs = { ...seed };
  return {
    loadPatients() {
      const raw = blobs.patients;
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },
    savePatients(patients) {
      blobs.patients = JSON.stringify(patients);
    },
    getBlobs() {
      return { ...blobs };
    },
  };
}
