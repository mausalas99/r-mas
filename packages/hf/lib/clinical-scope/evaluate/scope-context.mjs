import { makeAllowDeny } from './shared.mjs';

/** @param {string|Date|undefined|null} ctxNow */
export function resolveScopeNow(ctxNow) {
  if (ctxNow == null) return new Date();
  if (ctxNow instanceof Date) return ctxNow;
  return new Date(String(ctxNow));
}

/**
 * @param {object|null|undefined} currentUser
 * @param {object|null|undefined} targetPatient
 * @param {object|null|undefined} context
 */
export function buildScopeContext(currentUser, targetPatient, context) {
  const ctx = context && typeof context === 'object' ? context : {};
  const assignments = Array.isArray(ctx.assignments) ? ctx.assignments : [];
  const cycle = ctx.cycle ?? null;
  const now = resolveScopeNow(ctx.now);
  const rank = String(currentUser?.rank || '');
  const patientId = String(targetPatient?.id || '');
  const { allow, deny } = makeAllowDeny(currentUser, targetPatient, now);

  return {
    rank,
    now,
    allow,
    deny,
    scopeCtx: {
      currentUser,
      targetPatient,
      rank,
      patientId,
      assignments,
      cycle,
      now,
      allow,
      deny,
    },
  };
}
