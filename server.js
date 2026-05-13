const express = require('express');
const path    = require('path');
const fs      = require('fs');
const os      = require('os');
const { spawn } = require('child_process');

const appExpress = express();
appExpress.use(express.json({ limit: '2mb' }));
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

const PORT = process.env.PORT || 3738;
const server = appExpress.listen(PORT, () => {
  console.log(`R+ → http://localhost:${PORT}`);
});

module.exports = new Promise((resolve, reject) => {
  server.once('listening', () => resolve(server));
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      reject(new Error(
        `El puerto ${PORT} ya está en uso. Cierra otra instancia de R+ o el proceso que use ese puerto y vuelve a abrir la aplicación.`
      ));
    } else {
      reject(err);
    }
  });
});
