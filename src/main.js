const { app, BrowserWindow, ipcMain, screen, dialog, Tray, Menu, nativeImage, Notification, powerMonitor, globalShortcut, shell, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, execFile } = require('child_process');
const { SK80 } = require('./sk80');

// Keep the data folder %APPDATA%\sk80-studio even though the product name is "SK80 Studio"
app.setPath('userData', path.join(app.getPath('appData'), 'sk80-studio'));
app.setAppUserModelId('io.github.kinglucas962.sk80studio');

const kb = new SK80();
let win, tray, quitting = false;
let trayState = { enabled: false, profiles: [], active: null };
const startHidden = process.argv.includes('--hidden');
const storeFile = () => path.join(app.getPath('userData'), 'sk80-studio.json');

function loadStore() {
  try { return JSON.parse(fs.readFileSync(storeFile(), 'utf8')); } catch (_) { return {}; }
}
function saveStore(s) {
  fs.mkdirSync(path.dirname(storeFile()), { recursive: true });
  fs.writeFileSync(storeFile(), JSON.stringify(s, null, 1));
}

// only one copy of the app: a second launch just shows the first window
if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => showWindow());

function showWindow() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show(); win.focus();
}

function createWindow() {
  // Open on the secondary display when SK80_DISPLAY2=1 (used while testing)
  let bounds = { width: 1280, height: 820 };
  if (process.env.SK80_DISPLAY2) {
    const d = screen.getAllDisplays().find((x) => x.bounds.x < 0) || screen.getPrimaryDisplay();
    bounds.x = d.bounds.x + Math.round((d.bounds.width - bounds.width) / 2);
    bounds.y = d.bounds.y + Math.round((d.bounds.height - bounds.height) / 2);
  }
  win = new BrowserWindow({
    ...bounds,
    minWidth: 1080, minHeight: 720,
    backgroundColor: '#0d0f12',
    title: 'SK80 Studio',
    autoHideMenuBar: true,
    show: !startHidden,
    icon: path.join(__dirname, 'renderer', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, backgroundThrottling: false },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  // while testing, renderer errors go to stdout (re\electron.out.txt)
  if (process.env.SK80_DISPLAY2) win.webContents.on('console-message', (_e, level, msg, line, src) => { if (level >= 2) try { fs.appendFileSync(path.join(__dirname, '..', 're', 'renderer.log'), `[${level}] ${msg} (${path.basename(src || '')}:${line})\n`); } catch (_) {} });
  // with the tray on, closing the window only hides it (so automatic profiles keep working)
  win.on('close', (e) => {
    if (!quitting && trayState.enabled) { e.preventDefault(); win.hide(); }
  });
}

// ---------- tray ----------
function buildTray() {
  if (!trayState.enabled) { if (tray) { tray.destroy(); tray = null; } return; }
  if (!tray) {
    tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'renderer', 'tray.png'))); // tray@2x.png is picked up on high-DPI
    tray.setToolTip('SK80 Studio');
    tray.on('click', showWindow);
  }
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Abrir SK80 Studio', click: showWindow },
    ...(update.state === 'ready' ? [{ label: `Reiniciar e atualizar (${update.version})`, click: installUpdate }] : []),
    { type: 'separator' },
    ...trayState.profiles.map((p) => ({
      label: p.name, type: 'radio', checked: p.id === trayState.active,
      click: () => win && win.webContents.send('tray-profile', p.id),
    })),
    { type: 'separator' },
    { label: 'Sair', click: () => { quitting = true; app.quit(); } },
  ]));
}

// ---------- system watcher: foreground program, Caps Lock, window titles (one hidden PowerShell) ----------
// Prints tab-separated lines:  fg <process>  |  caps <0|1>  |  title <process> <window title>
let fgProc = null, watchCfg = { fg: false, caps: false, titles: [] }, watchKey = '';
const FG_SCRIPT = `
Add-Type @"
using System; using System.Runtime.InteropServices;
public static class FG {
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint p);
 [DllImport("user32.dll")] public static extern short GetKeyState(int k);
}
"@
$cfg = $env:SK80_WATCH | ConvertFrom-Json
$last = '?'; $lastCaps = -1; $titles = @{}
function Out1($s) { [Console]::Out.WriteLine($s); [Console]::Out.Flush() }
while ($true) {
  if ($cfg.fg) {
    $p = 0; [void][FG]::GetWindowThreadProcessId([FG]::GetForegroundWindow(), [ref]$p)
    $n = ''; try { $n = (Get-Process -Id $p -ErrorAction Stop).ProcessName } catch {}
    if ($n -ne $last) { $last = $n; Out1 ("fg" + [char]9 + $n) }
  }
  if ($cfg.caps) {
    $c = [int]([FG]::GetKeyState(0x14) -band 1)
    if ($c -ne $lastCaps) { $lastCaps = $c; Out1 ("caps" + [char]9 + $c) }
  }
  foreach ($name in $cfg.titles) {
    $t = (Get-Process -Name $name -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle } | Select-Object -First 1).MainWindowTitle
    if ($null -eq $t) { $t = '' }
    if ($titles[$name] -ne $t) { $titles[$name] = $t; Out1 ("title" + [char]9 + $name + [char]9 + $t) }
  }
  Start-Sleep -Milliseconds 700
}`;
function setWatch(cfg) {
  watchCfg = { fg: !!cfg.fg, caps: !!cfg.caps, titles: (cfg.titles || []).filter(Boolean) };
  const key = JSON.stringify(watchCfg);
  const on = watchCfg.fg || watchCfg.caps || watchCfg.titles.length;
  if (key === watchKey && (fgProc || !on)) return;
  watchKey = key;
  if (fgProc) { fgProc.kill(); fgProc = null; }
  if (!on) return;
  const p = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', FG_SCRIPT],
    { windowsHide: true, env: { ...process.env, SK80_WATCH: key } });
  fgProc = p;
  let buf = '';
  p.stdout.on('data', (d) => {
    buf += d.toString('utf8');
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const parts = buf.slice(0, i).replace(/\r$/, '').split('\t'); buf = buf.slice(i + 1);
      if (!win) continue;
      if (parts[0] === 'fg') win.webContents.send('fg-app', (parts[1] || '').toLowerCase());
      else if (parts[0] === 'caps') win.webContents.send('caps', parts[1] === '1');
      else if (parts[0] === 'title') win.webContents.send('win-title', parts[1].toLowerCase(), parts.slice(2).join('\t'));
    }
  });
  p.on('exit', () => { if (fgProc === p) { fgProc = null; watchKey = ''; } });
}
const watchForeground = (on) => setWatch({ ...watchCfg, fg: on }); // kept for older callers

// ---------- lock / idle ----------
let idleTimer = null, lastAway = null;
function startPowerWatch() {
  const send = (away, why) => { if (away !== lastAway) { lastAway = away; if (win) win.webContents.send('away', away, why); } };
  powerMonitor.on('lock-screen', () => send(true, 'lock'));
  powerMonitor.on('unlock-screen', () => send(false, 'unlock'));
  powerMonitor.on('suspend', () => send(true, 'suspend'));
  powerMonitor.on('resume', () => send(false, 'resume'));
  idleTimer = setInterval(() => { if (win) win.webContents.send('idle', powerMonitor.getSystemIdleTime()); }, 10000);
}

// ---------- global hotkey ----------
let hotkey = null;
function setHotkey(accel) {
  if (hotkey) { try { globalShortcut.unregister(hotkey); } catch (_) {} hotkey = null; }
  if (!accel) return true;
  const ok = globalShortcut.register(accel, () => win && win.webContents.send('hotkey'));
  if (ok) hotkey = accel;
  return ok;
}
const wrap = (fn) => async (_e, ...args) => {
  try { return { ok: true, value: await fn(...args) }; } catch (e) { return { ok: false, error: e.message || String(e) }; }
};

ipcMain.handle('status', wrap(() => kb.connected()));
ipcMain.handle('store:get', wrap(() => loadStore()));
ipcMain.handle('store:set', wrap((patch) => { const s = { ...loadStore(), ...patch }; saveStore(s); return true; }));
ipcMain.handle('lighting', wrap((opts) => kb.setLighting(opts)));
ipcMain.handle('custom-colors', wrap((colors, opts) => kb.setCustomColors(colors, opts)));
ipcMain.handle('preview-colors', wrap((entries) => kb.previewColors(entries)));
ipcMain.handle('keymap', wrap((map, layer) => kb.setKeymap(map, layer)));
ipcMain.handle('macros', wrap((macros) => kb.setMacros(macros)));

// ---- files: export / import (profiles, macros) ----
ipcMain.handle('file:save', wrap(async (name, text, ext) => {
  const r = await dialog.showSaveDialog(win, { defaultPath: name, filters: [{ name: 'SK80 Studio', extensions: [ext] }] });
  if (r.canceled || !r.filePath) return null;
  fs.writeFileSync(r.filePath, text, 'utf8'); return r.filePath;
}));
ipcMain.handle('file:open', wrap(async (ext) => {
  const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'SK80 Studio', extensions: [ext, 'json'] }] });
  if (r.canceled || !r.filePaths[0]) return null;
  return fs.readFileSync(r.filePaths[0], 'utf8');
}));

// ---- programs with a window (to pick which ones switch a profile) ----
ipcMain.handle('apps:list', wrap(() => new Promise((resolve) => {
  execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
    "Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle } | Select-Object ProcessName, MainWindowTitle | ConvertTo-Json -Compress"],
  { windowsHide: true, timeout: 15000 }, (err, out) => {
    if (err) return resolve([]);
    try { const v = JSON.parse(out); resolve((Array.isArray(v) ? v : [v]).map((p) => ({ name: p.ProcessName.toLowerCase(), title: p.MainWindowTitle }))); } catch (_) { resolve([]); }
  });
})));
ipcMain.handle('fg:watch', wrap((on) => { watchForeground(!!on); return true; }));
ipcMain.handle('watch:set', wrap((cfg) => { setWatch(cfg); return true; }));
ipcMain.handle('hotkey:set', wrap((accel) => setHotkey(accel)));
ipcMain.handle('notify', wrap((title, body) => { if (Notification.isSupported()) new Notification({ title, body, silent: true }).show(); return true; }));
ipcMain.handle('open:url', wrap((url) => { if (/^https:\/\/github\.com\/Kinglucas962\//.test(url)) shell.openExternal(url); return true; }));
ipcMain.handle('win:visible', wrap(() => !!(win && win.isVisible() && !win.isMinimized())));
// ---- community gallery: files in the repo's gallery/ folder ----
const GALLERY = 'https://raw.githubusercontent.com/Kinglucas962/sk80-studio/main/gallery/';
ipcMain.handle('gallery:get', wrap(async (file) => {
  if (!/^[\w.-]+$/.test(file)) throw new Error('nome inválido');
  const r = await net.fetch(GALLERY + file + '?t=' + Date.now());
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.text();
}));
ipcMain.handle('tray:set', wrap((st) => { trayState = { ...trayState, ...st }; buildTray(); return true; }));
// installed app: the exe itself; dev run: electron.exe + project folder
const loginArgs = () => (app.isPackaged ? ['--hidden'] : [app.getAppPath(), '--hidden']);
ipcMain.handle('autostart:get', wrap(() => app.getLoginItemSettings({ path: process.execPath, args: loginArgs() }).openAtLogin));
ipcMain.handle('autostart:set', wrap((on) => {
  app.setLoginItemSettings({ openAtLogin: !!on, path: process.execPath, args: loginArgs() });
  return true;
}));

// ---------- automatic updates (GitHub Releases, installed app only) ----------
let update = { state: app.isPackaged ? 'idle' : 'dev', version: null, percent: 0, error: null };
let updater = null;
function setUpdate(patch) {
  update = { ...update, ...patch };
  if (win) win.webContents.send('update', update);
  buildTray();
}
function installUpdate() {
  if (!updater || update.state !== 'ready') return;
  quitting = true; watchForeground(false);
  updater.quitAndInstall(true, true); // silent install, reopen the app afterwards
}
function initUpdater() {
  if (!app.isPackaged) return;
  updater = require('electron-updater').autoUpdater;
  updater.autoDownload = true;
  updater.autoInstallOnAppQuit = true;
  updater.on('checking-for-update', () => setUpdate({ state: 'checking', error: null }));
  updater.on('update-available', (i) => setUpdate({ state: 'downloading', version: i.version, percent: 0 }));
  updater.on('update-not-available', () => setUpdate({ state: 'latest' }));
  updater.on('download-progress', (p) => setUpdate({ state: 'downloading', percent: Math.round(p.percent) }));
  updater.on('update-downloaded', (i) => {
    setUpdate({ state: 'ready', version: i.version });
    if (Notification.isSupported()) new Notification({ title: 'SK80 Studio', body: `Versão ${i.version} pronta. Ela entra quando você fechar o app, ou clique em “Reiniciar e atualizar” em Ajustes.` }).show();
  });
  updater.on('error', (e) => setUpdate({ state: 'error', error: String((e && e.message) || e).split('\n')[0] }));
  const check = () => updater.checkForUpdates().catch(() => {});
  setTimeout(check, 8000);
  setInterval(check, 4 * 60 * 60 * 1000);
}
ipcMain.handle('app:info', wrap(() => ({ version: app.getVersion(), update })));
ipcMain.handle('update:check', wrap(() => { if (updater) updater.checkForUpdates().catch(() => {}); return update; }));
ipcMain.handle('update:install', wrap(() => { installUpdate(); return true; }));

// ---- GIF library: every image sent to the screen is kept in userData/gifs ----
const gifDir = () => path.join(app.getPath('userData'), 'gifs');
const gifIndex = () => path.join(gifDir(), 'index.json');
function readGifs() { try { return JSON.parse(fs.readFileSync(gifIndex(), 'utf8')); } catch (_) { return []; } }
function writeGifs(list) { fs.mkdirSync(gifDir(), { recursive: true }); fs.writeFileSync(gifIndex(), JSON.stringify(list, null, 1)); }
ipcMain.handle('gif:list', wrap(() => readGifs()));
ipcMain.handle('gif:read', wrap((id) => {
  const g = readGifs().find((x) => x.id === id); if (!g) throw new Error('GIF não encontrado');
  return { meta: g, bytes: fs.readFileSync(path.join(gifDir(), g.file)) };
}));
ipcMain.handle('gif:save', wrap((meta, bytes) => {
  const crypto = require('crypto');
  const buf = Buffer.from(bytes);
  const hash = crypto.createHash('sha1').update(buf).digest('hex').slice(0, 16);
  const list = readGifs();
  let g = list.find((x) => x.hash === hash);
  if (!g) {
    const ext = (meta.type || 'image/gif').split('/')[1] || 'gif';
    g = { id: hash, hash, file: hash + '.' + ext, name: meta.name, type: meta.type, added: Date.now() };
    fs.mkdirSync(gifDir(), { recursive: true });
    fs.writeFileSync(path.join(gifDir(), g.file), buf);
    list.unshift(g);
  }
  Object.assign(g, { fit: meta.fit, speed: meta.speed, bg: meta.bg, crop: meta.crop, range: meta.range, lastSent: meta.sent ? Date.now() : g.lastSent });
  writeGifs(list);
  return g;
}));
ipcMain.handle('gif:rename', wrap((id, name) => { const l = readGifs(); const g = l.find((x) => x.id === id); if (g) g.name = name; writeGifs(l); return true; }));
ipcMain.handle('gif:delete', wrap((id) => {
  const l = readGifs(); const g = l.find((x) => x.id === id);
  if (g) { try { fs.unlinkSync(path.join(gifDir(), g.file)); } catch (_) {} }
  writeGifs(l.filter((x) => x.id !== id)); return true;
}));

ipcMain.handle('screen', wrap((frames, delays) => {
  kb.onProgress = (i, n) => win && win.webContents.send('screen-progress', i, n);
  return kb.uploadScreen(frames.map((f) => Buffer.from(f)), delays);
}));

app.whenReady().then(() => { createWindow(); initUpdater(); startPowerWatch(); });
app.on('before-quit', () => { quitting = true; setWatch({}); globalShortcut.unregisterAll(); });
app.on('window-all-closed', () => { kb.close(); app.quit(); });
