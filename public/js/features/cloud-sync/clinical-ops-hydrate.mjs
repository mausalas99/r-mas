/**
 * Refresh local teams/session after Nube clinicalOps pull or merge.
 */
export async function hydrateClinicalTeamsAfterCloudPull() {
  try {
    const access = await import('../../clinical-access-runtime.mjs');
    // Assignments (patient → Leslie) live in scopeContext — teams list alone is not enough
    // for R1 sidebar / team mirror visibility.
    if (typeof access.fetchClinicalScopeContextFromDb === 'function') {
      await access.fetchClinicalScopeContextFromDb();
    }
    if (typeof access.fetchClinicalTeamsFromDb === 'function') {
      await access.fetchClinicalTeamsFromDb();
    }
  } catch {
    /* session optional during boot */
  }
  try {
    const { renderPatientList } = await import('../patients.mjs');
    renderPatientList({ silent: true });
  } catch {
    /* list optional */
  }
  if (typeof document === 'undefined') return;
  // Over 20 features listen for this; yield a frame first so the fan-out
  // doesn't chain onto whatever synchronous work just ran above.
  await new Promise(requestAnimationFrame);
  document.dispatchEvent(
    new CustomEvent('rpc-clinical-teams-changed', { detail: { source: 'cloud-hydrate' } })
  );
}
