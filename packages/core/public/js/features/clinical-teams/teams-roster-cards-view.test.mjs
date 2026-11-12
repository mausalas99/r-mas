import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';
import { sameHtml as same } from '../preact-html-compare.mjs';

// Like loadJsx, but the panel (which only wires this view in) is left out of the bundle.
async function loadJsx(metaUrl, source) {
  const stub = { name: 'stub-panel', setup(b) {
    b.onResolve({ filter: /teams-roster-panel\.mjs$/ }, (a) => ({ path: a.path, namespace: 'stub' }));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const renderClinicalTeamsPanel = () => {}; export const tryReconcileTeamMemberships = () => {}; export const resolveDisplayLanHandle = () => {}; export const renderClinicalTeamsPanelInto = () => {};', loader: 'js' }));
  } };
  const built = await esbuild.build({
    stdin: { contents: `import { renderToString } from 'preact-render-to-string';\n${source}`, resolveDir: path.dirname(fileURLToPath(metaUrl)), loader: 'jsx' },
    bundle: true, write: false, format: 'esm', platform: 'node', jsx: 'automatic', jsxImportSource: 'preact', plugins: [stub], logLevel: 'error',
  });
  return import('data:text/javascript;base64,' + Buffer.from(built.outputFiles[0].text).toString('base64'));
}

// Browser globals the session modules read.
const mem = {};
globalThis.localStorage = { getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
globalThis.sessionStorage = { getItem: (k) => mem[`s${k}`] ?? null, setItem: (k, v) => { mem[`s${k}`] = String(v); }, removeItem: (k) => { delete mem[`s${k}`]; } };
globalThis.window = {};

const m = await loadJsx(import.meta.url, `
  import { clinicalSessionContext } from '../../clinical-access-runtime.mjs';
  import * as settings from '../cloud-sync/settings.mjs';
  import * as cards from './teams-roster-team-cards.mjs';
  import * as dir from './teams-roster-directory.mjs';
  import { JoinedTeamCard, DirectoryTeamCard, DirectorySection, MemberHint } from './teams-roster-cards-view.jsx';
  export { clinicalSessionContext, settings };
  export const joined = (t, s, now) => renderToString(<JoinedTeamCard {...cards.joinedTeamCardProps(t, s, now)} />);
  export const dirCard = (t, o, now) => renderToString(<DirectoryTeamCard {...cards.directoryTeamCardProps(t, o, now)} />);
  export const section = async (o) => {
    const { props } = await dir.directorySectionProps({ userId: 'u-me', now: new Date(), trailingCard: () => <i>T</i>, ...o });
    return renderToString(<DirectorySection {...props} />);
  };
  export const hint = async (t) => { const p = await dir.resolveTeamMemberHintProps(t); return p ? renderToString(<MemberHint {...p} />) : ''; };
`);

// Markup the string builders wrote before the port.
const OLD = createRequire(import.meta.url)('./teams-roster-cards-view-old-html.json');
// Preact closes void tags with `/>`; the old strings did not, and left a space where an attribute was empty.
// Whitespace around a line break inside an element's text is not rendered.
const old = (s) => s.replace(/ >/g, '>').replace(/>\s*\n\s*/g, '>').replace(/\s*\n\s*</g, '<');
const eq = (a, b, n) => same(a.replace(/\/>/g, '>'), old(b), n);

const now = new Date();
const { team, staged, sibs, sibsDir } = OLD;
const admin = { user_id: 'u-me', username: 'dr_me', rank: 'R4', programAdmin: true, is_admin: true };
const plain = { user_id: 'u-2', username: 'r1_uno', rank: 'R1' };
const handoff = (on) => { m.clinicalSessionContext.scopeContext = on ? { cycle: { preview_start_at: '2020-01-01T00:00:00Z', effective_at: '2099-01-01T00:00:00Z' } } : { cycle: null }; };
const as = (u, on) => { m.clinicalSessionContext.user = u; handoff(on); };

test('Joined team card equals the old HTML', () => {
  as(admin, true);
  eq(m.joined(team, sibs, now), OLD.res.joinedAdminHandoff, 'admin handoff');
  eq(m.joined({ ...staged, members: [OLD.members[0]] }, sibs, now), OLD.res.joinedStagedAdmin, 'staged admin');
  eq(m.joined({ ...team, members: [] }, sibs, now), OLD.res.joinedEmpty, 'empty');
  as(plain, false);
  eq(m.joined({ ...team, members: OLD.members.slice(1), patientCount: 3 }, sibs, now), OLD.res.joinedPlain, 'plain');
  eq(m.joined({ ...team, service: 'UCI', members: OLD.members.slice(1), lanAssignmentCount: 2 }, sibs, now), OLD.res.joinedR1Svc, 'R1 other service');
});

test('Directory team card equals the old HTML', () => {
  as(admin, false);
  eq(m.dirCard({ ...team, joinEligible: true, joinWarning: 'Aviso <b>' }, { elevated: false, siblingTeams: sibs }, now),
    OLD.res.dirCards.join.replace('<button>j</button>', '<button type="button" class="wb-btn wb-btn-secondary clinical-teams-join-btn" data-team-id="abcd1234-ef56-7890-aaaa-bbbbccccdddd">Unirme</button>'), 'join');
  eq(m.dirCard(staged, { elevated: true, siblingTeams: sibs }, now), OLD.res.dirCards.staged, 'staged + manage');
  eq(m.dirCard({ ...team, members: [] }, {}, now), OLD.res.dirCards.none, 'none');
});

// join hint text differs from the old fixture (it was a stand-in string): check it by its own props
test('Directory card join hint comes from joinWarning / joinReason', () => {
  as(admin, false);
  assert.match(m.dirCard({ ...team, joinEligible: true, joinWarning: 'Ojo <x>' }, {}, now), /join-reason">Ojo &lt;x><\/p>/);
  assert.match(m.dirCard({ ...team, joinReason: 'Otra sala' }, {}, now), /join-reason">Otra sala<\/p>/);
  assert.doesNotMatch(m.dirCard({ ...team, joinReason: 'x' }, {}, now), /join-btn/);
});

test('Directory section equals the old HTML', async () => {
  m.clinicalSessionContext.scopeContext = { cycle: null };
  const api = (teams) => { globalThis.window.rplusDb = { dbClinicalTeamsListBySala: async () => ({ ok: true, teams }) }; };
  const o = (extra) => ({ browseSala: 'Sala 1', homeSala: 'Sala 1', ...extra });
  const S = OLD.section;
  const sala1 = (u) => { m.clinicalSessionContext.user = u; };
  sala1({ ...admin, sala: 'Sala 1' }); api(sibsDir);
  eq(await m.section(o({ elevated: true, mineCount: 1 })), S.elevated, 'elevated');
  eq(await m.section(o({ elevated: true, browseSala: '__all__' })), S.elevatedAll, 'elevated all');
  sala1({ ...plain, sala: 'Sala 1' });
  eq(await m.section(o({ elevated: false, mineCount: 1 })), S.plainMine, 'plain mine');
  eq(await m.section(o({ elevated: false, mineCount: 0 })), S.plainNoMine, 'plain no mine');
  api([sibsDir[3]]);
  eq(await m.section(o({ elevated: false })), S.emptyCloudNoToken, 'no cloud token');
  eq(await m.section(o({ elevated: false, browseSala: 'Casa <x>', homeSala: 'Casa <x>' })), S.emptyNonCloud, 'non-cloud');
  sala1({ ...admin, sala: 'Casa' });
  eq(await m.section(o({ elevated: true, browseSala: '__all__', homeSala: 'Casa' })), S.emptyElevatedAll, 'elevated all empty');
  eq(await m.section(o({ elevated: true, browseSala: 'Sala 2', homeSala: 'Casa' })), S.emptyElevatedOne, 'elevated one empty');
  sala1({ ...plain, sala: 'Sala 1' });
  m.settings.setCloudSyncToken('tok');
  eq(await m.section(o({ elevated: false })), S.emptyCloudToken, 'token, not connected');
  m.settings.setCloudSyncRoomId('room-1');
  eq(await m.section(o({ elevated: false })), S.emptyCloudActive, 'connected');
});

test('LAN member hint equals the old HTML; no props when not solo or no bridge', async () => {
  const solo = [{ members: [{}] }];
  m.settings.setCloudSyncRoomId('room-1');
  as(plain, false);
  eq(await m.hint(solo), OLD.section.hintPlain, 'plain');
  as(admin, false);
  eq(await m.hint(solo), OLD.section.hintDir, 'directory viewer');
  assert.equal(await m.hint([{ members: [{}, {}] }]), '');
  m.settings.setCloudSyncRoomId('');
  assert.equal(await m.hint(solo), '');
});

test('without the DB bridge the section has no props', async () => {
  globalThis.window.rplusDb = null;
  const dir = await loadJsx(import.meta.url, `import { directorySectionProps } from './teams-roster-directory.mjs'; export const p = (o) => directorySectionProps(o);`);
  assert.deepEqual(await dir.p({ userId: 'u', elevated: false, browseSala: 's', homeSala: 's' }), { props: null, count: 0 });
});
