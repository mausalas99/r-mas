/** @param {string} slug */
export function salaFromSlug(slug) {
  const s = String(slug || '').trim().toLowerCase();
  if (s === 'sala-1' || s === '1') return 'Sala 1';
  if (s === 'sala-2' || s === '2') return 'Sala 2';
  if (s === 'sala-e' || s === 'e') return 'Sala E';
  return '';
}

/** @param {string} sala */
export function slugFromSala(sala) {
  const s = String(sala || '').trim();
  if (s === 'Sala 1') return 'sala-1';
  if (s === 'Sala 2') return 'sala-2';
  if (s === 'Sala E') return 'sala-e';
  return '';
}
