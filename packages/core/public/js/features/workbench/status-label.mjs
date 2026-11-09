/**
 * Workbench kit — status labels.
 * README: VENCIDO (alert-deep) / EN CURSO (warn) / ABIERTO (ink-2) / LISTO (ok),
 * 600 weight, 10.5px, mono, uppercase.
 */

const STATUS_META = {
  vencido: { text: 'VENCIDO', className: 'wb-status--vencido' },
  en_curso: { text: 'EN CURSO', className: 'wb-status--en-curso' },
  abierto: { text: 'ABIERTO', className: 'wb-status--abierto' },
  listo: { text: 'LISTO', className: 'wb-status--listo' },
};

/** @param {'vencido'|'en_curso'|'abierto'|'listo'} status */
export function statusLabelMeta(status) {
  const meta = STATUS_META[status];
  if (!meta) throw new Error(`wb-status-label: unknown status "${status}"`);
  return meta;
}
