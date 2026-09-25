/** Equipos queue is Nube-only. API base is the page origin. */

export async function resolveEquiposApiBase() {
  const origin = typeof window !== 'undefined' ? window.location : null;
  if (!origin) return '';
  return `${origin.protocol}//${origin.host}`.replace(/\/+$/, '');
}
