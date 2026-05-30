/** Mobile /join/:ticketId — exchange ticket, persist Bearer, clean URL. */

const BEARER_KEY = 'rplus.lan.bearer';
const HOST_KEY = 'rplus.lan.hostUrl';

function ticketIdFromPath() {
  const m = String(location.pathname || '').match(/\/join\/(req_[a-f0-9]{12})\/?$/i);
  return m ? m[1] : '';
}

export async function runJoinTicketExchange(ticketId) {
  const res = await fetch('/api/lan/v1/auth/exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticket: ticketId }),
  });
  if (!res.ok) throw new Error('join_failed');
  const data = await res.json();
  if (data.token) localStorage.setItem(BEARER_KEY, data.token);
  if (data.hostUrl) localStorage.setItem(HOST_KEY, data.hostUrl);
  history.replaceState({}, '', '/mobile');
  location.replace('/mobile/?rpc-mobile=1');
}

const ticketId = ticketIdFromPath();
if (ticketId) {
  runJoinTicketExchange(ticketId).catch(() => {
    document.body.innerHTML =
      '<p style="font-family:system-ui,sans-serif;padding:1rem;">No pudimos unirte. Pide al anfitrión un enlace o PIN nuevo.</p>';
  });
}
