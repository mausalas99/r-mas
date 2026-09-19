import { GUARDIA_SCOPE_EVALUATORS } from './guardia-scope.mjs';
import { evaluateTeamScope } from './team-scope.mjs';
import {
  SCOPE_PREAMBLE_EVALUATORS,
  evaluateScopeInterconsultas,
} from './preamble.mjs';
import { attachJoinedTeamScope, buildScopeContext } from './scope-context.mjs';

/**
 * @param {object|null|undefined} currentUser
 * @param {object|null|undefined} targetPatient
 * @param {object|null|undefined} activeGuardia
 * @param {object|null|undefined} context
 */
export function runEvaluateClinicalScope(currentUser, targetPatient, activeGuardia, context) {
  const built = buildScopeContext(currentUser, targetPatient, activeGuardia, context);
  const { scopeCtx, guardiaMode } = built;

  for (const evaluate of SCOPE_PREAMBLE_EVALUATORS) {
    const result = evaluate(scopeCtx);
    if (result != null) return result;
  }

  attachJoinedTeamScope(built, built.userId);

  const interconsultasResult = evaluateScopeInterconsultas(scopeCtx);
  if (interconsultasResult != null) return interconsultasResult;

  if (guardiaMode) {
    for (const evaluate of GUARDIA_SCOPE_EVALUATORS) {
      const result = evaluate(scopeCtx);
      if (result != null) return result;
    }
  }

  return evaluateTeamScope(scopeCtx);
}

/**
 * Pure domain evaluator (no TEMP_DISABLE — keep kill switch in renderer façade).
 * @param {object|null|undefined} currentUser
 * @param {object|null|undefined} targetPatient
 * @param {object|null|undefined} [activeGuardia]
 * @param {object|null|undefined} [context]
 */
export function evaluateClinicalScope(currentUser, targetPatient, activeGuardia = null, context = null) {
  return runEvaluateClinicalScope(currentUser, targetPatient, activeGuardia, context);
}
