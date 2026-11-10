import { makeApplyCors } from '../../../lib/cloud-cors.mjs';

export { isAllowedOrigin, corsPreflight } from '../../../lib/cloud-cors.mjs';

export const applyCors = makeApplyCors('Content-Type, X-Equipos-Token, X-Equipos-Admin-Key');
