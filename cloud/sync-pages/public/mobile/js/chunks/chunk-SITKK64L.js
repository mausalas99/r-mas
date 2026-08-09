// public/js/features/cloud-sync/clinical-ops-hydrate.mjs
async function hydrateClinicalTeamsAfterCloudPull() {
  try {
    const access = await import("/mobile/js/chunks/clinical-access-runtime-YYVZUHX5.js");
    if (typeof access.fetchClinicalScopeContextFromDb === "function") {
      await access.fetchClinicalScopeContextFromDb();
    }
    if (typeof access.fetchClinicalTeamsFromDb === "function") {
      await access.fetchClinicalTeamsFromDb();
    }
  } catch {
  }
  try {
    const { renderPatientList } = await import("/mobile/js/chunks/patients-B236M2LH.js");
    renderPatientList({ silent: true });
  } catch {
  }
  if (typeof document === "undefined") return;
  document.dispatchEvent(
    new CustomEvent("rpc-clinical-teams-changed", { detail: { source: "cloud-hydrate" } })
  );
}

export {
  hydrateClinicalTeamsAfterCloudPull
};
//# sourceMappingURL=/js/chunks/chunk-SITKK64L.js.map
