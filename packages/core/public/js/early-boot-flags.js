/**
 * Extracted from index.src.html's inline <script> for CSP (script-src has no
 * 'unsafe-inline'). Plain script, not a module — must run synchronously,
 * before first paint, exactly where the inline block used to sit.
 */
(function () {
  // Preload-as-stylesheet swap: was <link ... media="print" onload="this.media='all'">.
  var preloadFonts = document.querySelector(
    'link[rel="stylesheet"][href*="fonts.googleapis.com"][media="print"]'
  );
  if (preloadFonts) {
    preloadFonts.addEventListener('load', function () {
      preloadFonts.media = 'all';
    });
  }
})();
(function () {
  try {
    var nav = String(navigator.userAgent || '');
    var qs = String(location.search || '');
    var isElectronShell =
      /\bElectron\//i.test(nav) || /(?:^|[?&])rpc-electron=1(?:&|$)/.test(qs);
    if (!window.electronAPI && !isElectronShell) window.__RPC_WEB_CLINICAL__ = true;
    if (isElectronShell) window.__RPC_ELECTRON_DESKTOP__ = true;
  } catch { /* ignore */ }
})();
(function () {
  function applyElectronChromeClasses() {
    try {
      var f = null;
      if (window.electronAPI && typeof window.electronAPI.getWindowChromeFlags === 'function') {
        f = window.electronAPI.getWindowChromeFlags();
      } else if (window.__RPC_ELECTRON_DESKTOP__) {
        var plat = String(navigator.platform || '');
        f = { macTitleBarInset: /Mac/i.test(plat), isWindows: /Win/i.test(plat) };
      }
      if (f && f.macTitleBarInset) document.documentElement.classList.add('electron-macos-inset-bar');
      if (f && f.isWindows) document.documentElement.classList.add('electron-windows');
    } catch { /* ignore */ }
  }
  applyElectronChromeClasses();
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', applyElectronChromeClasses);
  }
})();
(function () {
  try {
    var ls = localStorage;
    var p = new URLSearchParams(location.search || '');
    var pathMobile = /^\/mobile\/?$/i.test(location.pathname || '');
    var queryMobile = p.get('rpc-mobile') === '1';
    var sticky = ls.getItem('rpc-mobile-mode') === '1';
    var inviteToken = !!(p.get('token') || p.get('code'));
    var touchUa = /iPad|iPhone|iPod|Android|Mobile/i.test(navigator.userAgent || '');
    if (!queryMobile && !pathMobile && !sticky && !inviteToken && !touchUa) return;
    window.__RPC_MOBILE_WEB__ = true;
    document.documentElement.classList.add('rpc-mobile-web', 'ui-density-normal');
    ls.setItem('rpc-mobile-mode', '1');
    try { ls.setItem('rpc-sidebar-auto-hide', '0'); } catch { /* ignore */ }
    var token = String(p.get('token') || p.get('code') || '').trim();
    if (token) {
      var hostUrl = String(location.origin || '').replace(/\/+$/, '');
      var room = String(p.get('room') || '').trim();
      var sala = String(p.get('sala') || '').trim();
      if (/^sala-[12e]|torre-hu|area-a-pensionistas$/i.test(sala)) room = room || sala.toLowerCase();
      else if (sala === 'Sala 1') room = room || 'sala-1';
      else if (sala === 'Sala 2') room = room || 'sala-2';
      else if (sala === 'Sala E') room = room || 'sala-e';
      else if (sala === 'Torre HU') room = room || 'torre-hu';
      else if (sala === 'Área A/Pensionistas') room = room || 'area-a-pensionistas';
      var prev = {};
      try { prev = JSON.parse(ls.getItem('rpc-lan-config') || '{}') || {}; } catch { /* ignore */ }
      var cfg = { hostUrl: hostUrl || prev.hostUrl || '', teamCode: token };
      if (room) cfg.roomId = room;
      if (sala) cfg.sala = sala;
      var user = String(p.get('user') || '').trim();
      var name = String(p.get('name') || '').trim();
      var rank = String(p.get('rank') || '').trim();
      if (user || name || rank || sala) {
        cfg.sharer = { user: user, name: name, rank: rank, sala: sala || undefined };
      }
      if (cfg.hostUrl && cfg.teamCode) ls.setItem('rpc-lan-config', JSON.stringify(cfg));
    }
  } catch { /* ignore */ }
})();
(function () {
  try {
    var d = localStorage.getItem('rpc-ui-density');
    var isNormal = true;
    if (d === 'pase' || d === 'compact') isNormal = false;
    else if (d === 'normal' || d === 'comfortable') isNormal = true;
    document.documentElement.classList.toggle('ui-density-normal', isNormal);
  } catch { /* ignore */ }
})();
(function () {
  try {
    var ls = localStorage;
    var root = document.documentElement;
    var isDark = ls.getItem('theme') === 'dark';
    if (isDark) root.classList.add('dark');
    if (ls.getItem('rpc-high-contrast') === '1') root.classList.add('high-contrast');
    var motion = ls.getItem('rpc-motion-mode');
    if (motion === 'sobrio') root.classList.add('motion-sobrio');
    else if (motion === 'expresivo') root.classList.add('motion-expresivo');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? '#161922' : '#4a52e8');
  } catch { /* ignore */ }
})();
