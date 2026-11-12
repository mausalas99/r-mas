import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadJsx } from './preact-view-test-helpers.mjs';
import { sameHtml } from './preact-html-compare.mjs';

const view = await loadJsx(import.meta.url, `import { LanProfileStage, ExistingLoginStage } from './clinical-onboarding-forms-view.jsx';
  export const lan = (p) => renderToString(<LanProfileStage {...p} />);
  export const login = (p) => renderToString(<ExistingLoginStage {...p} />);`);

// Markup the string builders made before the port (buildOnboardingStageHtml + buildLanProfileFormBody /
// buildExistingAccountLoginBodyHtml), captured for the inputs below.
const OLD = createRequire(import.meta.url)('./clinical-onboarding-forms-old-html.json');

// The old strings had layout whitespace, `/>` on void tags and a space before `>`; the same DOM either way.
const tidy = (s) => s.replace(/>\s*\n\s*/g, '>').replace(/\s*\n\s*</g, '<').replace(/\s*\n\s*/g, ' ').replace(/ {2,}/g, ' ').replace(/ ?\/>/g, '>').replace(/ >/g, '>');
const same = (a, b, name) => sameHtml(tidy(a), tidy(b), name);

const URL = 'https://nube.example.test';
const base = { rank: 'R1', username: '', name: '', sala: '', nubeShow: false, upgrade: false, cloudUrl: URL };
const LAN = {
  gateEmpty: { ...base, title: 'Confirma tu perfil', leadKind: 'gate' },
  gateUserSession: { ...base, title: 'Confirma tu perfil', leadKind: 'gate', username: 'dr_prueba', name: 'Dr. <Prueba> & "Co"', rank: 'R3', sala: 'Sala 1', nubeShow: true },
  upgradeSala: { ...base, title: 'Conectar Nube', leadKind: 'upgrade', name: 'R1 García', rank: 'R4', sala: 'Torre HU', nubeShow: true },
  defRotacion: { ...base, title: 'Configura tu rotación', leadKind: 'default', name: "O'Brien", sala: 'PostQx', nubeShow: true },
  defNoCloud: { ...base, title: 'Configura tu rotación', leadKind: 'default', name: 'N', rank: 'R2', sala: 'Medicina Interna' },
  defSala1: { ...base, title: 'Configura tu rotación', leadKind: 'default', name: 'Dr. P', rank: 'R2', sala: 'Sala 1', nubeShow: true },
};
const LOGIN = {
  empty: { username: '', sala: '', remember: false, cloudUrl: URL },
  filled: { username: 'dr_prueba', sala: 'Sala 1', remember: true, cloudUrl: URL },
  rotacion: { username: 'dr_prueba', sala: 'UCI', remember: false, cloudUrl: URL },
  session: { username: 'dr_sesion', sala: 'Torre HU', remember: true, cloudUrl: URL },
  escaped: { username: 'a"b', sala: 'Sala 2', remember: false, cloudUrl: URL },
};

// The capture ran with the app's default cloud URL; swap it in so the tests stay independent of it.
const defaultUrl = OLD.lan.defSala1.html.match(/URL: ([^<]+)<\/p>/)[1];
const oldHtml = (h) => h.split(defaultUrl).join(URL);

for (const [key, props] of Object.entries(LAN)) {
  test(`profile stage equals the old HTML: ${key}`, () => {
    same(view.lan(props), oldHtml(OLD.lan[key].html), key);
  });
}

for (const [key, props] of Object.entries(LOGIN)) {
  test(`existing-login stage equals the old HTML: ${key}`, () => {
    same(view.login(props), oldHtml(OLD.login[key].html), key);
  });
}

test('profile stage: Nube field hidden and not required outside Sala/Torre, rotation pills only for a rotation sala', () => {
  assert.match(view.lan(LAN.defNoCloud), /id="onboard-nube-field" hidden/);
  assert.doesNotMatch(view.lan(LAN.defNoCloud).match(/<input id="onboard-nube-password"[^>]*>/)[0], /required/);
  assert.match(view.lan(LAN.defSala1).match(/<input id="onboard-nube-password"[^>]*>/)[0], /required/);
  assert.match(view.lan(LAN.defNoCloud), /data-rotacion-pick hidden/);
  assert.doesNotMatch(view.lan(LAN.defRotacion), /data-rotacion-pick hidden/);
});

test('profile stage: upgrade pending swaps the Nube hint', () => {
  const html = view.lan({ ...LAN.upgradeSala, upgrade: true });
  assert.ok(html.includes('Tu rotación ahora es Sala/Torre: crea tu cuenta Nube con esta contraseña (misma @usuario).'));
  assert.ok(!html.includes('URL:'));
});

test('every id the handlers look up is present', () => {
  const lan = view.lan(LAN.defSala1);
  for (const id of ['clinical-onboard-username-form', 'onboard-username', 'onboard-clinical-name', 'onboard-rank', 'onboard-sala', 'onboard-nube-password', 'onboard-nube-status', 'onboard-error', 'clinical-onboard-switch-existing-btn', 'clinical-onboard-resume-btn', 'clinical-onboard-mode-back-btn']) {
    assert.ok(lan.includes(`id="${id}"`), id);
  }
  const login = view.login(LOGIN.filled);
  for (const id of ['clinical-onboard-existing-login-form', 'onboard-existing-username', 'onboard-existing-password', 'onboard-existing-remember', 'onboard-existing-sala', 'onboard-existing-status', 'onboard-existing-error', 'clinical-onboard-existing-back-btn']) {
    assert.ok(login.includes(`id="${id}"`), id);
  }
});
