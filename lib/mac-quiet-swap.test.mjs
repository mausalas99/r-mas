import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  TARGET_TEAM_ID,
  TARGET_APP_ID,
  parseTeamIdentifier,
  parseIdentifier,
  appBundlePathFromExecPath,
  downloadUrlForArch,
  checkActivation,
  runQuietSwap,
} from './mac-quiet-swap.mjs';

const OLD_APP_ID = 'com.hospitaluniversitario.rplusclinical';

// Real-shaped `codesign -dv --verbose=4` stderr excerpts.
const OLD_CERT_STDERR = `Executable=/Applications/R+.app/Contents/MacOS/R+
Identifier=${OLD_APP_ID}
Format=app bundle with Mach-O thin (arm64)
CodeDirectory v=20500 size=1234 flags=0x10000(runtime) hashes=30+7 location=embedded
Signature size=4567
Authority=Apple Development: djsalas99@gmail.com (ABCDE12345)
Authority=Apple Worldwide Developer Relations Certification Authority
Authority=Apple Root CA
Team identifier=ABCDE12345
TeamIdentifier=ABCDE12345
Runtime Version=13.0.0
Sealed Resources version=2 rules=13 files=842
`;

const NEW_CERT_STDERR = OLD_CERT_STDERR
  .replace(/ABCDE12345/g, TARGET_TEAM_ID)
  .replace('Apple Development:', 'Developer ID Application:')
  .replace(OLD_APP_ID, TARGET_APP_ID);

// 8.1.4/8.1.5: current team, but still the OLD bundle id.
const CURRENT_TEAM_OLD_APP_ID_STDERR = OLD_CERT_STDERR.replace(/ABCDE12345/g, TARGET_TEAM_ID);

const UNSIGNED_STDERR = `Executable=/Applications/R+.app/Contents/MacOS/R+
Identifier=${OLD_APP_ID}
Format=app bundle with Mach-O thin (arm64)
TeamIdentifier=not set
`;

function fakeExecFile(script) {
  // script: (file, args) => {stdout, stderr} | throws
  return async (file, args) => script(file, args);
}

describe('parseTeamIdentifier', () => {
  it('reads the TeamIdentifier= line from real-shaped codesign stderr', () => {
    assert.equal(parseTeamIdentifier(OLD_CERT_STDERR), 'ABCDE12345');
    assert.equal(parseTeamIdentifier(NEW_CERT_STDERR), TARGET_TEAM_ID);
  });

  it('treats "not set" (unsigned) as no team', () => {
    assert.equal(parseTeamIdentifier(UNSIGNED_STDERR), null);
  });

  it('treats missing output as no team', () => {
    assert.equal(parseTeamIdentifier(''), null);
    assert.equal(parseTeamIdentifier(undefined), null);
  });
});

describe('parseIdentifier', () => {
  it('reads the Identifier= line from real-shaped codesign stderr', () => {
    assert.equal(parseIdentifier(OLD_CERT_STDERR), OLD_APP_ID);
    assert.equal(parseIdentifier(NEW_CERT_STDERR), TARGET_APP_ID);
  });

  it('treats missing output as no identifier', () => {
    assert.equal(parseIdentifier(''), null);
    assert.equal(parseIdentifier(undefined), null);
  });
});

describe('appBundlePathFromExecPath', () => {
  it('walks up three dirs from the executable to the .app bundle', () => {
    assert.equal(
      appBundlePathFromExecPath('/Applications/R+.app/Contents/MacOS/R+'),
      '/Applications/R+.app'
    );
  });
});

describe('downloadUrlForArch', () => {
  it('picks the arm64 autoupdate zip', () => {
    assert.equal(
      downloadUrlForArch('arm64'),
      'https://github.com/mausalas99/r-mas/releases/download/v8.2.7/R+-8.2.7-autoupdate-mac-arm64.zip'
    );
  });

  it('picks the x64 autoupdate zip for any non-arm64 arch', () => {
    assert.equal(
      downloadUrlForArch('x64'),
      'https://github.com/mausalas99/r-mas/releases/download/v8.2.7/R+-8.2.7-autoupdate-mac-x64.zip'
    );
  });
});

describe('checkActivation', () => {
  it('is inert off darwin', async () => {
    const result = await checkActivation({ platform: 'win32', isPackaged: true, execPath: 'x', execFile: fakeExecFile(() => { throw new Error('should not run'); }) });
    assert.equal(result.active, false);
  });

  it('is inert when not packaged (dev run)', async () => {
    const result = await checkActivation({ platform: 'darwin', isPackaged: false, execPath: 'x', execFile: fakeExecFile(() => { throw new Error('should not run'); }) });
    assert.equal(result.active, false);
  });

  it('is inert when own team AND bundle id already match the target (8.2.7+ builds)', async () => {
    const result = await checkActivation({
      platform: 'darwin',
      isPackaged: true,
      execPath: '/Applications/R+.app/Contents/MacOS/R+',
      execFile: fakeExecFile(() => ({ stdout: '', stderr: NEW_CERT_STDERR })),
    });
    assert.equal(result.active, false);
    assert.equal(result.teamId, TARGET_TEAM_ID);
    assert.equal(result.bundleId, TARGET_APP_ID);
  });

  it('is active when own team differs from the target, regardless of bundle id (old-cert install)', async () => {
    const result = await checkActivation({
      platform: 'darwin',
      isPackaged: true,
      execPath: '/Applications/R+.app/Contents/MacOS/R+',
      execFile: fakeExecFile(() => ({ stdout: '', stderr: OLD_CERT_STDERR })),
    });
    assert.equal(result.active, true);
    assert.equal(result.teamId, 'ABCDE12345');
    assert.equal(result.bundleId, OLD_APP_ID);
    assert.equal(result.appPath, '/Applications/R+.app');
  });

  it('is active when team matches but bundle id is still old (8.1.4/8.1.5 install)', async () => {
    const result = await checkActivation({
      platform: 'darwin',
      isPackaged: true,
      execPath: '/Applications/R+.app/Contents/MacOS/R+',
      execFile: fakeExecFile(() => ({ stdout: '', stderr: CURRENT_TEAM_OLD_APP_ID_STDERR })),
    });
    assert.equal(result.active, true);
    assert.equal(result.teamId, TARGET_TEAM_ID);
    assert.equal(result.bundleId, OLD_APP_ID);
  });

  it('is inert when codesign errors out (unsigned or missing tool)', async () => {
    const result = await checkActivation({
      platform: 'darwin',
      isPackaged: true,
      execPath: '/Applications/R+.app/Contents/MacOS/R+',
      execFile: fakeExecFile(() => { const e = new Error('spawn failed'); e.stderr = ''; throw e; }),
    });
    assert.equal(result.active, false);
    assert.equal(result.teamId, null);
  });

  it('is inert when unsigned ("not set" team), regardless of bundle id', async () => {
    const result = await checkActivation({
      platform: 'darwin',
      isPackaged: true,
      execPath: '/Applications/R+.app/Contents/MacOS/R+',
      execFile: fakeExecFile(() => ({ stdout: '', stderr: UNSIGNED_STDERR })),
    });
    assert.equal(result.active, false);
    assert.equal(result.teamId, null);
  });
});

// ── runQuietSwap: fake fs/execFile/download/trash, no real disk or network ──

// Single shared `order` log across fs + execFile + trash, so tests can assert
// real call ordering (rename before copy, trash only after re-verify).
function makeFakeFs(order) {
  const calls = [];
  return {
    calls,
    mkdir: async (p) => { const c = ['mkdir', p]; calls.push(c); order.push(c); },
    rm: async (p) => { const c = ['rm', p]; calls.push(c); order.push(c); },
    rename: async (from, to) => { const c = ['rename', from, to]; calls.push(c); order.push(c); },
    readdir: async (p) => { const c = ['readdir', p]; calls.push(c); order.push(c); return ['R+.app']; },
  };
}

function makeHappyDeps({ fs, execFileImpl, order } = {}) {
  order = order || [];
  fs = fs || makeFakeFs(order);
  const trashCalls = [];
  const execCalls = [];
  const execFile = async (file, args) => {
    const c = [file, ...args];
    execCalls.push(c);
    order.push(c);
    if (execFileImpl) return execFileImpl(file, args, execCalls);
    // Default: every codesign -dv call reports the new cert; --verify passes.
    if (file === '/usr/bin/codesign' && args.includes('-dv')) {
      return { stdout: '', stderr: NEW_CERT_STDERR };
    }
    return { stdout: '', stderr: '' };
  };
  return {
    deps: {
      appPath: '/Applications/R+.app',
      arch: 'arm64',
      userDataDir: '/userdata',
      execFile,
      download: async () => {},
      fs,
      trash: async (p) => { const c = ['trash', p]; trashCalls.push(p); order.push(c); },
      log: () => {},
    },
    fs,
    execCalls,
    trashCalls,
    order,
  };
}

describe('runQuietSwap — happy path', () => {
  it('renames the running app aside before copying in the staged one, and trashes it only after re-verify', async () => {
    const { deps, trashCalls, order } = makeHappyDeps();
    await runQuietSwap(deps);

    const renameAwayIdx = order.findIndex((c) => c[0] === 'rename');
    const dittoCopyIdx = order.findIndex((c) => c[0] === '/usr/bin/ditto' && c[1] === '/userdata/quiet-swap/unpacked/R+.app');
    const trashIdx = order.findIndex((c) => c[0] === 'trash');
    const reverifyIdx = order.findIndex(
      (c, i) => i > dittoCopyIdx && c[0] === '/usr/bin/codesign' && c.includes('--verify')
    );

    assert.ok(renameAwayIdx >= 0, 'expected a fs.rename call');
    assert.ok(dittoCopyIdx >= 0, 'expected a ditto copy-in call');
    assert.ok(trashIdx >= 0, 'expected a trash call');
    assert.ok(renameAwayIdx < dittoCopyIdx, 'rename-away must happen before the ditto copy-in');
    assert.ok(reverifyIdx > dittoCopyIdx, 'the installed copy must be re-verified after the ditto copy-in');
    assert.ok(trashIdx > reverifyIdx, 'trash must happen only after the re-verify');

    assert.equal(trashCalls.length, 1);
    assert.equal(trashCalls[0], '/Applications/R+.app.pre-swap');

    // staging dir cleaned at the end
    const rmStaging = deps.fs.calls.filter((c) => c[0] === 'rm' && c[1] === '/userdata/quiet-swap');
    assert.ok(rmStaging.length >= 1);
  });
});

describe('runQuietSwap — verify failure after rename', () => {
  it('renames the old app back into place and never trashes it', async () => {
    let verifyCalls = 0;
    const { deps, trashCalls } = makeHappyDeps({
      execFileImpl: (file, args) => {
        if (file === '/usr/bin/ditto') return { stdout: '', stderr: '' };
        if (file === '/usr/bin/codesign' && args.includes('--verify')) {
          verifyCalls += 1;
          // First --verify is the staged-app check (before the rename/copy) — passes.
          // Second is the re-verify of the *installed* copy, after ditto-copy-in — fails.
          if (verifyCalls === 2) throw new Error('codesign: invalid signature');
          return { stdout: '', stderr: '' };
        }
        if (file === '/usr/bin/codesign' && args.includes('-dv')) {
          return { stdout: '', stderr: NEW_CERT_STDERR };
        }
        return { stdout: '', stderr: '' };
      },
    });

    await runQuietSwap(deps);

    assert.equal(trashCalls.length, 0, 'must never trash the old app on failure');
    const renameCalls = deps.fs.calls.filter((c) => c[0] === 'rename');
    // rename away, then rename back — same two paths, reversed.
    assert.equal(renameCalls.length, 2);
    assert.deepEqual(renameCalls[0], ['rename', '/Applications/R+.app', '/Applications/R+.app.pre-swap']);
    assert.deepEqual(renameCalls[1], ['rename', '/Applications/R+.app.pre-swap', '/Applications/R+.app']);
  });
});

describe('runQuietSwap — Identifier (bundle id) mismatch after rename', () => {
  it('aborts and renames the old app back into place, never trashing it', async () => {
    let dvCalls = 0;
    const { deps, trashCalls } = makeHappyDeps({
      execFileImpl: (file, args) => {
        if (file === '/usr/bin/codesign' && args.includes('-dv')) {
          dvCalls += 1;
          // First -dv is the staged-app check (before rename/copy) — target bundle id, passes.
          // Second is the re-check of the *installed* copy, after ditto-copy-in — still the
          // OLD bundle id (e.g. a corrupt/mismatched download), so it must abort + roll back.
          return { stdout: '', stderr: dvCalls === 2 ? CURRENT_TEAM_OLD_APP_ID_STDERR : NEW_CERT_STDERR };
        }
        return { stdout: '', stderr: '' };
      },
    });

    await runQuietSwap(deps);

    assert.equal(trashCalls.length, 0, 'must never trash the old app on failure');
    const renameCalls = deps.fs.calls.filter((c) => c[0] === 'rename');
    assert.equal(renameCalls.length, 2);
    assert.deepEqual(renameCalls[0], ['rename', '/Applications/R+.app', '/Applications/R+.app.pre-swap']);
    assert.deepEqual(renameCalls[1], ['rename', '/Applications/R+.app.pre-swap', '/Applications/R+.app']);
  });
});

describe('runQuietSwap — never throws', () => {
  it('swallows a download failure and still cleans the staging dir', async () => {
    const fs = makeFakeFs();
    const deps = {
      appPath: '/Applications/R+.app',
      arch: 'x64',
      userDataDir: '/userdata',
      execFile: async () => ({ stdout: '', stderr: '' }),
      download: async () => { throw new Error('network down'); },
      fs,
      trash: async () => { throw new Error('should not be called'); },
      log: () => {},
    };
    await assert.doesNotReject(runQuietSwap(deps));
    const rmStaging = fs.calls.filter((c) => c[0] === 'rm' && c[1] === '/userdata/quiet-swap');
    assert.ok(rmStaging.length >= 1);
  });
});
