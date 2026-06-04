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
 * }} opts
 */
export function appendLanHubStatusCard(root, opts) {
  const statusCard = document.createElement('div');
  statusCard.className = 'lan-connect-card lan-hub-status-card';
  const connected = !!opts.connected;
  const defaultLine = connected
    ? 'Conectado a la red del hospital'
    : 'Sin red \u2014 buscando\u2026';
  const line = String(opts.statusLine || defaultLine).trim() || defaultLine;
  statusCard.innerHTML =
    '<div class="lan-hub-status-line">' +
    (connected
      ? '<span class="lan-hub-status-dot lan-hub-status-dot--online"></span> '
      : '<span class="lan-hub-status-dot lan-hub-status-dot--offline"></span> ') +
    line +
    '</div>';
  if (opts.statusHint) {
    const hint = document.createElement('p');
    hint.className = 'lan-connect-card-hint';
    hint.style.marginTop = '6px';
    hint.textContent = String(opts.statusHint);
    statusCard.appendChild(hint);
  }
  if (!connected && opts.isElectronDesktop) {
    const becomeHostBtn = document.createElement('button');
    becomeHostBtn.type = 'button';
    becomeHostBtn.className = 'btn-lan-primary';
    becomeHostBtn.style.marginTop = '8px';
    becomeHostBtn.style.width = '100%';
    becomeHostBtn.textContent = 'Activar servidor en esta Mac';
    becomeHostBtn.onclick = function () {
      if (typeof opts.onBecomeHost === 'function') opts.onBecomeHost();
    };
    statusCard.appendChild(becomeHostBtn);
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
