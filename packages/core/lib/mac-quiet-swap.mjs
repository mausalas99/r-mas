/**
 * Mac "quiet swap": one-shot bridge to the current signing identity (Team
 * N78U9QC783) AND current bundle id (com.rmas.rplusclinical).
 *
 * Squirrel.Mac validates an update against the running app's designated
 * requirement, which pins both Team ID and bundle id — so two families of
 * install are stuck on the normal update feed: pre-8.1.6 old-cert installs,
 * and 8.1.4/8.1.5 installs (current team, but the OLD bundle id
 * `com.hospitaluniversitario.rplusclinical`). The 8.2.6 bridge build ships
 * with the OLD bundle id (so stuck installs' electron-updater still accepts
 * it as an update) and carries this module to silently install 8.2.7
 * (current team + current bundle id) in the background — no relaunch, no
 * user-facing UI, one attempt per launch. Inert once both team and bundle id
 * already match (unpackaged/dev too).
 *
 * Deps are injected so this file needs no Electron to test — main.js wires
 * real app/net/shell/fs at the call site.
 */
import path from 'node:path';

export const TARGET_TEAM_ID = 'N78U9QC783';
export const TARGET_APP_ID = 'com.rmas.rplusclinical';
export const SWAP_VERSION = '8.2.7';
const RELEASE_BASE_URL = `https://github.com/mausalas99/r-mas/releases/download/v${SWAP_VERSION}`;

export const CODESIGN_BIN = '/usr/bin/codesign';
export const DITTO_BIN = '/usr/bin/ditto';
export const SPCTL_BIN = '/usr/sbin/spctl';
export const XATTR_BIN = '/usr/bin/xattr';

/** @param {string} codesignOutput  stderr of `codesign -dv --verbose=4 <app>` */
export function parseTeamIdentifier(codesignOutput) {
  const match = /^TeamIdentifier=(.*)$/m.exec(String(codesignOutput || ''));
  if (!match) return null;
  const value = match[1].trim();
  return value && value !== 'not set' ? value : null;
}

/** @param {string} codesignOutput  stderr of `codesign -dv --verbose=4 <app>` */
export function parseIdentifier(codesignOutput) {
  const match = /^Identifier=(.*)$/m.exec(String(codesignOutput || ''));
  return match ? match[1].trim() || null : null;
}

/** .../X.app/Contents/MacOS/bin (process.execPath) → .../X.app */
export function appBundlePathFromExecPath(execPath) {
  return path.dirname(path.dirname(path.dirname(String(execPath || ''))));
}

export function macArtifactFileName(arch) {
  return `R+-${SWAP_VERSION}-autoupdate-mac-${arch === 'arm64' ? 'arm64' : 'x64'}.zip`;
}

export function downloadUrlForArch(arch) {
  return `${RELEASE_BASE_URL}/${macArtifactFileName(arch)}`;
}

/**
 * @param {{platform: string, isPackaged: boolean, execPath: string,
 *   execFile: (file: string, args: string[]) => Promise<{stdout: string, stderr: string}>}} deps
 * @returns {Promise<{active: boolean, teamId: string|null, bundleId: string|null, appPath: string|null}>}
 */
export async function checkActivation(deps) {
  if (deps.platform !== 'darwin' || !deps.isPackaged) {
    return { active: false, teamId: null, bundleId: null, appPath: null };
  }
  const appPath = appBundlePathFromExecPath(deps.execPath);
  let teamId = null;
  let bundleId = null;
  try {
    const { stderr } = await deps.execFile(CODESIGN_BIN, ['-dv', '--verbose=4', appPath]);
    teamId = parseTeamIdentifier(stderr);
    bundleId = parseIdentifier(stderr);
  } catch (err) {
    teamId = parseTeamIdentifier(err && err.stderr);
    bundleId = parseIdentifier(err && err.stderr);
  }
  // Active when signed and either the team or the bundle id is still stale —
  // covers old-cert installs AND 8.1.4/8.1.5 (current team, old bundle id).
  const active = Boolean(teamId) && (teamId !== TARGET_TEAM_ID || bundleId !== TARGET_APP_ID);
  return { active, teamId, bundleId, appPath };
}

async function verifyStagedApp(deps, stagedAppPath, log) {
  // Required: a broken signature or wrong team must abort the swap.
  await deps.execFile(CODESIGN_BIN, ['--verify', '--deep', '--strict', stagedAppPath]);
  const { stderr } = await deps.execFile(CODESIGN_BIN, ['-dv', '--verbose=4', stagedAppPath]);
  const teamId = parseTeamIdentifier(stderr);
  if (teamId !== TARGET_TEAM_ID) {
    throw new Error(`quiet-swap: staged app Team ID mismatch (${teamId || 'none'})`);
  }
  const bundleId = parseIdentifier(stderr);
  if (bundleId !== TARGET_APP_ID) {
    throw new Error(`quiet-swap: staged app bundle id mismatch (${bundleId || 'none'})`);
  }
  // Log-only from here — never gate the swap on these two.
  try {
    await deps.execFile(SPCTL_BIN, ['--assess', '--type', 'execute', stagedAppPath]);
  } catch (err) {
    log('[quiet-swap] spctl --assess (non-gating):', err && err.message);
  }
  try {
    await deps.execFile(XATTR_BIN, ['-cr', stagedAppPath]);
  } catch (err) {
    log('[quiet-swap] xattr -cr (non-gating):', err && err.message);
  }
}

async function swapIn(deps, stagedAppPath, log) {
  const currentAppPath = deps.appPath;
  const preSwapPath = `${currentAppPath}.pre-swap`;
  await deps.fs.rm(preSwapPath, { recursive: true, force: true });
  await deps.fs.rename(currentAppPath, preSwapPath);
  try {
    await deps.execFile(DITTO_BIN, [stagedAppPath, currentAppPath]);
    await deps.execFile(CODESIGN_BIN, ['--verify', '--deep', '--strict', currentAppPath]);
    const { stderr } = await deps.execFile(CODESIGN_BIN, ['-dv', '--verbose=4', currentAppPath]);
    const teamId = parseTeamIdentifier(stderr);
    if (teamId !== TARGET_TEAM_ID) {
      throw new Error(`quiet-swap: installed copy Team ID mismatch (${teamId || 'none'})`);
    }
    const bundleId = parseIdentifier(stderr);
    if (bundleId !== TARGET_APP_ID) {
      throw new Error(`quiet-swap: installed copy bundle id mismatch (${bundleId || 'none'})`);
    }
    await deps.trash(preSwapPath);
  } catch (err) {
    log('[quiet-swap] swap-in failed, restoring previous app:', err && err.message);
    await deps.fs.rm(currentAppPath, { recursive: true, force: true });
    await deps.fs.rename(preSwapPath, currentAppPath);
    throw err;
  }
}

/**
 * Full download → verify → swap. Call only after checkActivation() says active.
 * Every failure is caught and logged here — never throws.
 *
 * @param {{
 *   appPath: string, arch: string, userDataDir: string,
 *   execFile: (file: string, args: string[]) => Promise<{stdout: string, stderr: string}>,
 *   download: (url: string, destPath: string) => Promise<void>,
 *   fs: { mkdir: Function, rm: Function, rename: Function, readdir: Function },
 *   trash: (path: string) => Promise<void>,
 *   log?: (...args: any[]) => void,
 * }} deps
 */
export async function runQuietSwap(deps) {
  const log = deps.log || (() => {});
  const stagingDir = path.join(deps.userDataDir, 'quiet-swap');
  try {
    await deps.fs.rm(stagingDir, { recursive: true, force: true });
    await deps.fs.mkdir(stagingDir, { recursive: true });

    const zipPath = path.join(stagingDir, macArtifactFileName(deps.arch));
    await deps.download(downloadUrlForArch(deps.arch), zipPath);

    const unpackedDir = path.join(stagingDir, 'unpacked');
    await deps.fs.mkdir(unpackedDir, { recursive: true });
    await deps.execFile(DITTO_BIN, ['-x', '-k', zipPath, unpackedDir]);

    const entries = await deps.fs.readdir(unpackedDir);
    const appName = entries.find((name) => name.endsWith('.app'));
    if (!appName) throw new Error('quiet-swap: no .app found in downloaded zip');
    const stagedAppPath = path.join(unpackedDir, appName);

    await verifyStagedApp(deps, stagedAppPath, log);
    await swapIn(deps, stagedAppPath, log);
  } catch (err) {
    log('[quiet-swap] aborted:', err && err.message ? err.message : String(err));
  } finally {
    try {
      await deps.fs.rm(stagingDir, { recursive: true, force: true });
    } catch (_e) {
      /* best-effort cleanup */
    }
  }
}
