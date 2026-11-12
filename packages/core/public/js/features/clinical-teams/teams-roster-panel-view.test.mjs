import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadJsx } from '../preact-view-test-helpers.mjs';
import { sameHtml as same } from '../preact-html-compare.mjs';

const view = await loadJsx(import.meta.url, `import { PickBanner, RotationAdminSection, ConfigSection, ProfileSection, PanelBody, PanelNotice } from './teams-roster-panel-view.jsx';
  export const banner = (p) => renderToString(<PickBanner {...p} />);
  export const rotation = (p) => renderToString(<RotationAdminSection {...p} />);
  export const config = (p) => renderToString(<ConfigSection {...p} />);
  export const profile = (p) => renderToString(<ProfileSection {...p} />);
  export const notice = (p) => renderToString(<PanelNotice {...p} />);
  export const body = (p) => renderToString(<PanelBody pickTeamLayout={p.pick} banner={<i>B</i>} mine={<b>M</b>} directory={<u>D</u>} rotation={p.rotation && <s>R</s>} config={p.config && <q>C</q>} />);`);

// Markup the string builders in teams-roster-panel(-build).mjs wrote before the port.
const OLD = createRequire(import.meta.url)('./teams-roster-panel-view-old-html.json');
// Preact closes void tags with `/>`; the old strings left a space before `>` or split tags over lines.
const flat = (s) => s.replace(/\/>/g, '>').replace(/ >/g, '>')
  .replace(/<([a-z0-9]+)(\s[^>]*)>/g, (_m, t, a) => `<${t}${a.replace(/\s+/g, ' ')}>`);
const sameHtml = (a, b, n) => same(flat(a), flat(b), n);

const profileProps = (c, ranks) => ({ legacyUsername: c.legacyUsername, displayHandle: c.displayHandle, directoryNote: !c.canViewDirectoryUsers,
  usernameForInput: c.usernameForInput, clinicalName: c.profileGatePending ? '' : OLD.user.clinical_name, rank: c.rank, ranks,
  programAdmin: c.programAdmin, sala: c.sala, salas: ['Sala <A>', 'Sala B', 'Sala C'] });

test('banner equals the old HTML for every combination', () => {
  for (const [key, html] of Object.entries(OLD.banner)) {
    const [elevated, rejoinPending, sala, directoryCount] = key.split('|');
    sameHtml(view.banner({ elevated: elevated === 'true', rejoinPending: rejoinPending === 'true', sala, directoryCount: Number(directoryCount) }), html, key);
  }
});

test('rotation section equals the old HTML', () => {
  sameHtml(view.rotation({ open: false }), OLD.rotation.r4, 'r4');
});

test('profile form equals the old HTML (plain, legacy, gate, admin)', async () => {
  // The old strings listed the salas from CLINICAL_SALAS; take that list from the fixture markup.
  const salas = [...OLD.profile.plain.matchAll(/<option value="([^"]*)" (?:selected)?>/g)].map((m) => m[1]).filter((v) => v && !/^R\d$/.test(v));
  const ranks = (c) => (c.rank === 'R4' || c.programAdmin ? ['R1', 'R2', 'R3', 'R4'] : ['R1', 'R2', 'R3']);
  for (const [k, c] of Object.entries(OLD.ctxs)) {
    const props = { ...profileProps(c, ranks(c)), salas: salas.map((s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>')) };
    sameHtml(view.profile(props), OLD.profile[k], k);
  }
});

test('config section frames the profile form like the old HTML', () => {
  const c = OLD.ctxs.plain;
  const salas = [...OLD.profile.plain.matchAll(/<option value="([^"]*)" (?:selected)?>/g)].map((m) => m[1]).filter((v) => v && !/^R\d$/.test(v)).map((s) => s.replace(/&lt;/g, '<'));
  const props = { ...profileProps(c, ['R1', 'R2', 'R3']), salas };
  sameHtml(view.config({ open: false, profile: props }), OLD.config.closed.replace('<p>PROFILE</p>', OLD.profile.plain), 'config');
  assert.match(view.config({ open: true, profile: props }), /<details[^>]* open/);
});

test('panel body keeps the fixed order and drops «Otras opciones» when empty', () => {
  const other = (inner) => `<section class="clinical-teams-other" aria-labelledby="clinical-teams-other-label"><h4 id="clinical-teams-other-label" class="clinical-teams-group-label">Otras opciones</h4><div class="clinical-teams-other-list">${inner}</div></section>`;
  sameHtml(view.body({ pick: true, rotation: true, config: true }), `<i>B</i><b>M</b><u>D</u>${other('<s>R</s><q>C</q>')}`, 'all');
  sameHtml(view.body({ pick: false, rotation: false, config: true }), `<b>M</b><u>D</u>${other('<q>C</q>')}`, 'no banner, config only');
  sameHtml(view.body({ pick: false }), '<b>M</b><u>D</u>', 'none');
});

test('notice', () => {
  sameHtml(view.notice({ message: 'Activa la sesión clínica para gestionar equipos.' }), '<p class="clinical-teams-lead">Activa la sesión clínica para gestionar equipos.</p>', 'notice');
});
