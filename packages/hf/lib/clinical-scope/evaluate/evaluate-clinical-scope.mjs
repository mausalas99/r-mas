import { evaluateScopeIdentity, evaluateScopeIncomingPreview } from './preamble.mjs';
import { buildScopeContext } from './scope-context.mjs';

/**
 * @param {object|null|undefined} currentUser
 * @param {object|null|undefined} targetPatient
 * @param {object|null|undefined} context
 */
export function runEvaluateClinicalScope(currentUser, targetPatient, context) {
  const { scopeCtx, rank } = buildScopeContext(currentUser, targetPatient, context);

  const identityResult = evaluateScopeIdentity(scopeCtx);
  if (identityResult != null) return identityResult;

  const isAdmin =
    rank === 'Admin' ||
    currentUser?.is_program_admin === 1 ||
    currentUser?.is_program_admin === true;

  // Admin bypasses the incoming-preview restriction entirely — full read/write always.
  if (isAdmin) {
    return scopeCtx.allow('Admin: acceso completo');
  }

  const previewResult = evaluateScopeIncomingPreview(scopeCtx);
  if (previewResult != null) return previewResult;

  return scopeCtx.allow('Team: lectura y escritura completas');
}

/**
 * Pure domain evaluator (no TEMP_DISABLE — keep kill switch in renderer façade).
 * `activeGuardia` is accepted for call-site compatibility but no longer used —
 * there is no handoff/coverage concept left to gate on.
 * @param {object|null|undefined} currentUser
 * @param {object|null|undefined} targetPatient
 * @param {object|null|undefined} [activeGuardia]
 * @param {object|null|undefined} [context]
 */
export function evaluateClinicalScope(currentUser, targetPatient, activeGuardia = null, context = null) {
  return runEvaluateClinicalScope(currentUser, targetPatient, context);
}
