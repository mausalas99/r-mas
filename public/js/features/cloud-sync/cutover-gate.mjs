import { ensure79CutoverSnapshotAndWipe } from './cutover-wipe.mjs';
import { isCutoverDone, isCutoverPending, is79CutoverVersion } from './cutover-flags.mjs';
import { loadCutoverSnapshot } from './cutover-snapshot.mjs';

/**
 * After DB unlock: snapshot+wipe once. Migration UI lives in Configura tu rotación.
 * @returns {Promise<boolean>} always false (do not block onboarding overlay)
 */
export async function run79CutoverGate() {
  if (isCutoverDone()) return false;
  if (!is79CutoverVersion() && !isCutoverPending()) return false;

  await ensure79CutoverSnapshotAndWipe();
  // Ensure onboarding gate also fires for 7.9 (profile re-register).
  // clinicalLanProfileGateVersion bump is separate (7.9.0 in clinical-settings).
  void loadCutoverSnapshot();
  return false;
}
