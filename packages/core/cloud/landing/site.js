/* global navigator, document, fetch */
// Download buttons: pick the installer for the visitor's computer.
// Until GitHub answers (or if it can't), every button opens the releases page.
(function () {
  var BASE = 'https://github.com/mausalas99/r-mas/releases';
  var ua = navigator.userAgent || '';
  var plat = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
  // iPadOS reports "MacIntel"; touch points tell it apart from a real Mac.
  var os = /iPhone|iPad|Android/i.test(ua) || (/Mac/i.test(plat) && navigator.maxTouchPoints > 1) ? 'mobile'
    : /Mac/i.test(plat + ua) ? 'mac' : /Win/i.test(plat + ua) ? 'win' : 'other';

  function each(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }

  function apply(ver, winUrl) {
    var dl = ver && BASE + '/download/v' + ver + '/R%2B-' + ver + '-';
    // Windows asset name changed in 8.4.9 («Instalar-R+-…»); use whatever the release has.
    var winDl = winUrl || (ver && dl + 'Windows.exe');
    var T = {
      mac: { title: 'Descargar para macOS', sub: 'Apple Silicon · .dmg · ' + ver, href: dl + 'Mac-Apple-Silicon.dmg', alt: '¿Mac con Intel?', altHref: dl + 'Mac-Intel.dmg', two: 'Descargar para Windows', twoHref: winDl },
      win: { title: 'Descargar para Windows', sub: '64 bits · .exe · ' + ver, href: winDl, two: 'Descargar para macOS', twoHref: dl + 'Mac-Apple-Silicon.dmg' },
      other: { title: 'Ver descargas', sub: 'Disponible para macOS y Windows', href: BASE + '/latest' },
      mobile: { title: 'Ver descargas', sub: 'App de escritorio. Descárgala en tu Mac o PC.', href: BASE + '/latest' }
    };
    T.other = ver ? T.mac : T.other; // desktop Linux etc.: offer both installers
    var d = ver ? T[os] : (os === 'mobile' ? T.mobile : T.other);
    each('[data-dl]', function (a) { a.href = d.href; });
    each('[data-dl-title] span', function (s) { s.textContent = d.title; });
    each('[data-dl-sub]', function (s) { s.textContent = d.sub; });
    each('[data-dl2]', function (a) { a.hidden = !d.two; if (d.two) { a.href = d.twoHref; a.lastElementChild.textContent = d.two; } });
    each('[data-dl-alt]', function (a) { a.hidden = !d.alt; if (d.alt) { a.textContent = d.alt; a.href = d.altHref; } });
    if (ver) {
      each('[data-notes]', function (a) { a.href = BASE + '/tag/v' + ver; });
      each('[data-ver]', function (s) { s.textContent = 'Versión ' + ver; });
    }
  }

  apply(null);
  fetch('https://api.github.com/repos/mausalas99/r-mas/releases/latest')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) {
      var m = j && /^v?(\d+\.\d+\.\d+)$/.exec(j.tag_name || '');
      var ok = m && (j.assets || []).some(function (a) { return a.name === 'R+-' + m[1] + '-Mac-Apple-Silicon.dmg'; });
      var win = ok && j.assets.filter(function (a) { return /-Windows\.exe$/.test(a.name); })[0];
      if (ok) apply(m[1], win && win.browser_download_url);
    })
    .catch(function () {});
})();
