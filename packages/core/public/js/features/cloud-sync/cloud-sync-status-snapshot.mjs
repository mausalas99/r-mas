/** Resolve live Conexión chip status from runtime + outbox (avoids stale "Nube al día"). */

import { getSharedNubeOutbox, getSharedNubeRuntime } from './panel-conexion-runtime.mjs';

/** @param {{ runtime?: any, outbox?: any } | undefined} sources */
function chipSources(sources) {
  if (sources) return sources;
  return { runtime: getSharedNubeRuntime(), outbox: getSharedNubeOutbox() };
}

/**
 * The runtime only re-reads the outbox on its own cycles, so rows that land
 * outside one — above all the SQLCipher rows `createSqlcipherOutbox().hydrate()`
 * restores after boot — leave it sitting at 'idle' with work still queued. The
 * chip asks the outbox itself so that stall can never read as "Nube al día".
 *
 * @param {{ runtime?: any, outbox?: any }} [sources] Defaults to the shared
 *   runtime/outbox the panel runs on; passed in by tests.
 * @returns {{ status: string, detail: string, transport: 'ws' | 'poll' | 'offline' }}
 */
export function resolveCloudConexionChipStatus(sources) {
  const { runtime, outbox } = chipSources(sources);
  let status = String(runtime?.getStatus?.() || 'idle');
  const detail = String(runtime?.getDetail?.() || '');
  const transport = runtime?.getTransportState?.() || 'poll';
  const pending = outbox?.list?.().length || 0;
  if (pending > 0 && status === 'idle') status = 'pending';
  return { status, detail, transport };
}
