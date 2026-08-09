/** Resolve live Conexión chip status from runtime + outbox (avoids stale "Nube al día"). */

import { getSharedNubeOutbox, getSharedNubeRuntime } from './panel-conexion-runtime.mjs';

/**
 * @returns {{ status: string, detail: string, transport: 'ws' | 'poll' | 'offline' }}
 */
export function resolveCloudConexionChipStatus() {
  const runtime = getSharedNubeRuntime();
  let status = String(runtime?.getStatus?.() || 'idle');
  const detail = String(runtime?.getDetail?.() || '');
  const transport = runtime?.getTransportState?.() || 'poll';
  const pending = getSharedNubeOutbox()?.list?.().length || 0;
  if (pending > 0 && status === 'idle') status = 'pending';
  return { status, detail, transport };
}
