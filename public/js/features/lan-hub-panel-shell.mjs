/**
 * Guardia LAN hub shell UI (status line + sala rooms). Extracted from lan-sync.mjs.
 */

/**
 * @param {HTMLElement} root
 * @param {{
 *   connected: boolean,
 *   isElectronDesktop: boolean,
 *   statusLine?: string,
 *   statusHint?: string,
 *   onBecomeHost?: () => void,
 *   showBecomeHost?: boolean,
 *   showInvitePaste?: boolean,
 * }} opts
 */
export function appendLanHubStatusCard(root, opts) {
  const statusCard = document.createElement('div');
  statusCard.className = 'lan-connect-card lan-hub-status-card';
  const connected = !!opts.connected;
  const line =
    String(opts.statusLine || '').trim() ||
    (connected
      ? 'Conectado a la red del hospital'
      : 'Sin red \u2014 buscando anfitri\u00f3n en la Wi\u2011Fi del hospital\u2026');
  statusCard.innerHTML =
    '<div class="lan-hub-status-line">' +
    (connected
      ? '<span class="lan-hub-status-dot lan-hub-status-dot--online"></span> '
      : '<span class="lan-hub-status-dot lan-hub-status-dot--offline"></span> ') +
    line +
    '</div>';
  const hint = String(opts.statusHint || '').trim();
  if (hint) {
    const hintEl = document.createElement('p');
    hintEl.className = 'lan-connect-card-hint';
    hintEl.style.marginTop = '6px';
    hintEl.textContent = hint;
    statusCard.appendChild(hintEl);
  }
  if (!connected && opts.isElectronDesktop && opts.showBecomeHost !== false) {
    const becomeHostBtn = document.createElement('button');
    becomeHostBtn.type = 'button';
    becomeHostBtn.className = 'btn-lan-primary';
    becomeHostBtn.style.marginTop = '8px';
    becomeHostBtn.style.width = '100%';
    becomeHostBtn.textContent = 'Convertirse en host';
    becomeHostBtn.onclick = function () {
      if (typeof opts.onBecomeHost === 'function') opts.onBecomeHost();
    };
    statusCard.appendChild(becomeHostBtn);
  }
  if (opts.showInvitePaste) {
    const inviteHint = document.createElement('p');
    inviteHint.className = 'lan-connect-card-hint lan-hub-invite-paste-hint';
    inviteHint.style.marginTop = '10px';
    inviteHint.innerHTML =
      'Pega aquí el enlace <strong>Otra Mac del equipo</strong> del anfitrión (<code>http://…/join/req_…</code>).';
    statusCard.appendChild(inviteHint);
    const inputInvite = document.createElement('textarea');
    inputInvite.className = 'profile-input';
    inputInvite.id = 'lan-input-invite-link';
    inputInvite.rows = 2;
    inputInvite.autocomplete = 'off';
    inputInvite.placeholder = 'http://10.x.x.x:3738/join/req_…';
    inputInvite.style.marginTop = '6px';
    statusCard.appendChild(inputInvite);
    const row = document.createElement('div');
    row.className = 'lan-connect-actions-row';
    row.style.marginTop = '8px';
    const btnJoin = document.createElement('button');
    btnJoin.type = 'button';
    btnJoin.className = 'btn-lan-primary';
    btnJoin.style.flex = '1';
    btnJoin.textContent = 'Unirse con enlace';
    btnJoin.setAttribute('data-lan-action', 'join-invite');
    row.appendChild(btnJoin);
    statusCard.appendChild(row);
  }
  root.appendChild(statusCard);
}

/**
 * @param {HTMLElement} root
 * @param {{
 *   visibleSalaDefs: { id: string, label: string, key: string }[],
 *   activeRoomId: string,
 * }} opts
 */
export function appendLanHubRoomsCard(root, opts) {
  const roomsCard = document.createElement('div');
  roomsCard.className = 'lan-connect-card lan-rooms-panel';
  roomsCard.innerHTML = '<div class="lan-connect-card-title">Salas de guardia</div>';

  const defs = opts.visibleSalaDefs || [];
  if (defs.length) {
    const list = document.createElement('ul');
    list.style.listStyle = 'none';
    list.style.padding = '0';
    list.style.margin = '0';
    defs.forEach(function (d) {
      const li = document.createElement('li');
      li.style.display = 'flex';
      li.style.gap = '8px';
      li.style.alignItems = 'center';
      li.style.marginBottom = '8px';

      const name = document.createElement('span');
      name.style.flex = '1';
      name.style.fontSize = '13px';
      name.textContent = d.label;

      const joinBtn = document.createElement('button');
      joinBtn.type = 'button';
      joinBtn.className = 'btn-lan-secondary';
      joinBtn.style.flex = '0 0 auto';
      const inRoom = opts.activeRoomId === d.id;
      joinBtn.textContent = inRoom ? 'En sala' : 'Unirse';
      joinBtn.disabled = inRoom;
      joinBtn.setAttribute('data-lan-action', 'join-room');
      joinBtn.setAttribute('data-room-id', d.id);
      joinBtn.setAttribute('data-room-label', d.label);

      li.appendChild(name);
      li.appendChild(joinBtn);
      list.appendChild(li);
    });
    roomsCard.appendChild(list);
  }
  root.appendChild(roomsCard);
}
