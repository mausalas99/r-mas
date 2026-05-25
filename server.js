const express = require('express');
const http    = require('node:http');
const path    = require('path');
const fs      = require('fs');
const os      = require('os');
const { spawn, execSync } = require('child_process');
const { fillRecetaHuPdf } = require('./generate-receta-hu.js');
const { createHostStore } = require('./lan-squad/host-store.js');
const { createLanRouter } = require('./lan-squad/host-router.js');
const { attachWsHub } = require('./lan-squad/ws-hub.js');

const appExpress = express();
appExpress.use(express.json({ limit: '2mb' }));

const LAN_HTTP_PORT = 3738;

/** Permite fetch/WebSocket desde el mismo host (p. ej. iPad en http://192.168.x.x:3738). */
function isAllowedLanCorsOrigin(originUrl, requestHost) {
  if (!originUrl || !requestHost) return false;
  const oh = String(originUrl.host || '').toLowerCase();
  const rh = String(requestHost || '').toLowerCase();
  if (oh === rh) return true;
  if (oh === `localhost:${LAN_HTTP_PORT}` || oh === `127.0.0.1:${LAN_HTTP_PORT}`) return true;
  return false;
}

appExpress.use((req, res, next) => {
  const rawOrigin = req.headers.origin;
  if (rawOrigin) {
    try {
      const originUrl = new URL(rawOrigin);
      if (isAllowedLanCorsOrigin(originUrl, req.headers.host)) {
        res.setHeader('Access-Control-Allow-Origin', rawOrigin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,PATCH,DELETE,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Lan-Team-Code');
      }
    } catch (_e) {
      // Ignore malformed Origin headers and continue normal handling.
    }
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

appExpress.get('/join', (req, res) => {
  const qs = new URLSearchParams(req.query).toString();
  res.redirect(302, '/mobile/' + (qs ? `?${qs}` : ''));
});
appExpress.get('/health', (_req, res) => {
  try {
    res.json({ ok: true, app: 'r-plus' });
  } catch (e) {
    try { res.status(500).json({ ok: false, error: (e && e.message) || 'health failed' }); }
    catch (_inner) { /* response already broken; nothing else to do */ }
  }
});
appExpress.use(express.static(path.join(__dirname, 'public')));

const DOWNLOADS = path.join(os.homedir(), 'Downloads');

function resolvePython() {
  if (process.platform === 'win32') {
    // En Windows, extraResources se coloca en process.resourcesPath (fuera del ASAR)
    // Intentar múltiples ubicaciones:
    // 1. process.resourcesPath (instalado)
    // 2. __dirname (dev)
    // 3. path.dirname(process.execPath) + '/resources' (instalado alternativo)
    const bases = [
      process.resourcesPath,
      __dirname,
      path.join(path.dirname(process.execPath || ''), 'resources')
    ].filter(Boolean);
    console.log('[resolvePython] Windows - process.execPath:', process.execPath);
    console.log('[resolvePython] Windows - process.resourcesPath:', process.resourcesPath);
    console.log('[resolvePython] Windows - __dirname:', __dirname);
    console.log('[resolvePython] Windows - buscando en:', bases);
    for (const base of bases) {
      const bundled = path.join(base, 'python-runtime', 'win-x64', 'python.exe');
      console.log('[resolvePython] Intentando:', bundled);
      try {
        if (fs.statSync(bundled).isFile()) {
          console.log('[resolvePython] ✓ Encontrado:', bundled);
          return bundled;
        }
      } catch (err) {
        console.log('[resolvePython] ✗ No encontrado:', bundled, '(', err.code, ')');
      }
    }
    console.log('[resolvePython] ⚠️ Python embebido no encontrado en ninguna ubicación');
    console.log('[resolvePython] ⚠️ Usando fallback "python" (requiere Python en PATH del sistema)');
    return 'python';
  }
  if (process.platform === 'darwin') {
    const arch = process.arch === 'arm64' ? 'mac-arm64' : 'mac-x64';
    for (const base of [process.resourcesPath, __dirname].filter(Boolean)) {
      const binDir = path.join(base, 'python-runtime', arch, 'bin');
      for (const name of ['python3', 'python3.12', 'python3.13']) {
        const bundled = path.join(binDir, name);
        try { if (fs.statSync(bundled).isFile()) return bundled; } catch { /* not found */ }
      }
    }
  }
  // Sin runtime embebido: en Apple Silicon, /usr/local suele ser Homebrew x86_64 (Rosetta)
  // y dispara el aviso de macOS; preferir /opt/homebrew (arm64).
  const systemPaths =
    process.platform === 'darwin' && process.arch === 'arm64'
      ? [
          '/opt/homebrew/bin/python3',
          '/usr/bin/python3',
          '/usr/local/bin/python3',
        ]
      : [
          '/usr/local/bin/python3',
          '/opt/homebrew/bin/python3',
          '/usr/bin/python3',
        ];
  return systemPaths.find(p => {
    try { return fs.statSync(p).isFile(); } catch { return false; }
  }) || 'python3';
}
const PYTHON = resolvePython();

function safeName(str) {
  return (str || '').replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9]/g, '_');
}

const SCRIPTS_DIR = __dirname.includes('app.asar')
  ? __dirname.replace('app.asar', 'app.asar.unpacked')
  : __dirname;

function runPython(script, payload) {
  return new Promise((resolve, reject) => {
    const py = spawn(PYTHON, [path.join(SCRIPTS_DIR, script)]);
    const chunks = [];
    let err = '';
    py.on('error', reject);
    py.stdout.on('data', c => chunks.push(c));
    py.stderr.on('data', c => { err += c.toString(); });
    py.on('close', code => {
      if (code !== 0) reject(new Error(err || `Error Python (code ${code})`));
      else resolve(Buffer.concat(chunks));
    });
    py.stdin.on('error', () => {}); // suppress EPIPE; process error/close handles it
    py.stdin.write(payload);
    py.stdin.end();
  });
}

appExpress.post('/generate', async (req, res) => {
  const { patient, note, outputDir } = req.body;
  if (!patient || !note) return res.status(400).json({ error: 'Missing patient or note' });
  const dest = (outputDir || '').trim() || DOWNLOADS;
  if (!fs.existsSync(dest)) return res.status(400).json({ error: 'La carpeta seleccionada ya no existe. Cambia la ruta en Mi Perfil.' });
  try { fs.accessSync(dest, fs.constants.W_OK); } catch (_) {
    return res.status(400).json({ error: 'No se puede escribir en la carpeta seleccionada.' });
  }
  try {
    const buf = await runPython('generate_note.py', JSON.stringify({ patient, note }));
    const fileName = `Nota_Evolucion_${safeName(patient.nombre)}_${safeName(note.fecha||'')}.docx`;
    fs.writeFileSync(path.join(dest, fileName), buf);
    res.json({ ok: true, fileName });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

appExpress.post('/generate-indicaciones', async (req, res) => {
  const { patient, indicaciones, outputDir } = req.body;
  if (!patient || !indicaciones) return res.status(400).json({ error: 'Missing patient or indicaciones' });
  const dest = (outputDir || '').trim() || DOWNLOADS;
  if (!fs.existsSync(dest)) return res.status(400).json({ error: 'La carpeta seleccionada ya no existe. Cambia la ruta en Mi Perfil.' });
  try { fs.accessSync(dest, fs.constants.W_OK); } catch (_) {
    return res.status(400).json({ error: 'No se puede escribir en la carpeta seleccionada.' });
  }
  try {
    const buf = await runPython('generate_indicaciones.py', JSON.stringify({ patient, indicaciones }));
    const fileName = `Indicaciones_${safeName(patient.nombre)}_${safeName(indicaciones.fecha||'')}.docx`;
    fs.writeFileSync(path.join(dest, fileName), buf);
    res.json({ ok: true, fileName });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

appExpress.post('/generate-listado', async (req, res) => {
  const { patient, listado, medicos, outputDir } = req.body;
  if (!patient || !listado) return res.status(400).json({ error: 'Missing patient or listado' });
  const dest = (outputDir || '').trim() || DOWNLOADS;
  if (!fs.existsSync(dest)) return res.status(400).json({ error: 'La carpeta seleccionada ya no existe. Cambia la ruta en Mi Perfil.' });
  try { fs.accessSync(dest, fs.constants.W_OK); } catch (_) {
    return res.status(400).json({ error: 'No se puede escribir en la carpeta seleccionada.' });
  }
  try {
    const buf = await runPython('generate_listado.py', JSON.stringify({ patient, listado, medicos: medicos || {} }));
    const now = new Date();
    const stamp = [
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0'),
    ].join('-');
    const fileName = `Listado_Problemas_${safeName(patient.nombre)}_${safeName(listado.fecha||'')}_${stamp}.docx`;
    fs.writeFileSync(path.join(dest, fileName), buf);
    res.json({ ok: true, fileName });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

appExpress.post('/generate-receta-hu', async (req, res) => {
  const { patient, receta, doctorName, cedulaProfesional, outputDir } = req.body;
  if (!patient) return res.status(400).json({ error: 'Missing patient' });
  const dest = (outputDir || '').trim() || DOWNLOADS;
  if (!fs.existsSync(dest)) return res.status(400).json({ error: 'La carpeta seleccionada ya no existe. Cambia la ruta en Mi Perfil.' });
  try { fs.accessSync(dest, fs.constants.W_OK); } catch (_) {
    return res.status(400).json({ error: 'No se puede escribir en la carpeta seleccionada.' });
  }
  try {
    const payload = Object.assign({}, receta || {}, {
      patient,
      doctorName: doctorName || '',
      cedulaProfesional: cedulaProfesional || '',
    });
    const buf = await fillRecetaHuPdf(payload, SCRIPTS_DIR);
    const fileName = `Receta_HU_${safeName(patient.nombre)}_${safeName(receta && receta.fecha ? receta.fecha : '')}.pdf`;
    fs.writeFileSync(path.join(dest, fileName), buf);
    res.json({ ok: true, fileName });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// LAN squad (host): escucha en el puerto de abajo en todas las interfaces; los clientes
// usan http://<IP-de-esta-PC>:3738. Abre el puerto en el firewall del SO si no conecta.
// Código de equipo: variable R_PLUS_LAN_TEAM_CODE o primer línea de userData/lan-team-code.txt
// (tras cambiar el archivo, reinicia R+). Red local de confianza; sin TLS en LAN.
const PORT = 3738;

function portInUseProcessHint(port) {
  try {
    const out = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`, { encoding: 'utf8' }).trim();
    if (!out) return '';
    const pid = out.split('\n')[0];
    let detail = '';
    try {
      detail = execSync(`ps -p ${pid} -o comm=`, { encoding: 'utf8' }).trim();
    } catch (_e) {
      /* ignore */
    }
    return detail ? ` (PID ${pid}: ${detail})` : ` (PID ${pid})`;
  } catch (_e) {
    return '';
  }
}
const userData = process.env.R_PLUS_USER_DATA || require('node:os').tmpdir();
const lanStatePath = path.join(userData, 'lan-squad-host-state.json');
const { readEffectiveLanTeamCode, ensureLanTeamCodeFile, migratePlugAndPlayTeamCode } = require('./lan-squad/effective-team-code.js');
migratePlugAndPlayTeamCode({ userDataPath: userData });
ensureLanTeamCodeFile({ userDataPath: userData });
const { code: LAN_TEAM_CODE } = readEffectiveLanTeamCode({ userDataPath: userData });
// Existing host state is bound to one team code and throws on mismatches.
const lanStore = createHostStore({ filePath: lanStatePath, teamCodePlain: LAN_TEAM_CODE });
const httpServer = http.createServer(appExpress);
const { broadcast } = attachWsHub(httpServer, { getState: () => lanStore.getState() });
appExpress.use('/api/lan/v1', createLanRouter({ store: lanStore, broadcast }));

const server = httpServer.listen(PORT, () => {
  console.log(`R+ → http://localhost:${PORT}`);
});

module.exports = new Promise((resolve, reject) => {
  server.once('listening', () => resolve(server));
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      reject(new Error(
        `El puerto ${PORT} ya está en uso${portInUseProcessHint(PORT)}. ` +
          'Cierra la otra instancia de R+ (o el proceso que escucha en ese puerto) y vuelve a abrir la aplicación. ' +
          'En macOS/Linux: lsof -nP -iTCP:' + PORT + ' -sTCP:LISTEN'
      ));
    } else {
      reject(err);
    }
  });
});
