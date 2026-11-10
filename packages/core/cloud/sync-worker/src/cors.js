import { makeApplyCors } from '../../../lib/cloud-cors.mjs';

export { isAllowedOrigin, corsPreflight } from '../../../lib/cloud-cors.mjs';

export const applyCors = makeApplyCors('Content-Type, Authorization, X-Sync-Admin-Key, Accept');
