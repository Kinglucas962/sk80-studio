const { app, BrowserWindow, ipcMain, screen, dialog, Tray, Menu, nativeImage, Notification, powerMonitor, globalShortcut, shell, net, session, desktopCapturer, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn, execFile } = require('child_process');
const { SK80 } = require('./sk80');

// Keep the data folder %APPDATA%\sk80-studio even though the product name is "SK80 Studio"
app.setPath('userData', process.env.SK80_USERDATA || path.join(app.getPath('appData'), 'sk80-studio'));
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
    backgroundColor: startTheme() === 'light' ? '#e8ebf0' : '#0e1014',
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
    ...(update.state === 'ready'
      ? [{ label: `Reiniciar e atualizar (${update.version})`, click: installUpdate }]
      : [{ label: 'Procurar atualização', enabled: !!updater, click: () => { showWindow(); if (win) win.webContents.send('update-check-manual'); } }]),
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
let fgProc = null, watchCfg = { fg: false, caps: false, vol: false, titles: [] }, watchKey = '';
const FG_SCRIPT = `
Add-Type @"
using System; using System.Runtime.InteropServices;
public static class FG {
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint p);
 [DllImport("user32.dll")] public static extern short GetKeyState(int k);
 [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
 [DllImport("user32.dll")] public static extern IntPtr FindWindow(string c, string n);
 [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint f);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
 [StructLayout(LayoutKind.Sequential)] public struct RECT { public int l, t, r, b; }
}
"@
# real pixels, so taskbar button positions (UI Automation) match the screen capture used for Discord's red badge
[void][FG]::SetProcessDPIAware()
$cfg = $env:SK80_WATCH | ConvertFrom-Json
if ($cfg.vol) { Add-Type -TypeDefinition $env:SK80_VOLCS }
$last = '?'; $lastCaps = -1; $lastVol = '?'; $titles = @{}; $badges = @{}; $script:raws = @{}; $tick = 0
function Out1($s) { [Console]::Out.WriteLine($s); [Console]::Out.Flush() }
while ($true) {
  $tick++
  if ($cfg.vol) {
    $v = [SkAudio]::Read()
    if ($v -ne $lastVol) { $lastVol = $v; Out1 ("vol" + [char]9 + $v) }
  }
  $slow = (-not $cfg.vol) -or ($tick % 3 -eq 0)
  if ($cfg.fg -and $slow) {
    $p = 0; [void][FG]::GetWindowThreadProcessId([FG]::GetForegroundWindow(), [ref]$p)
    $n = ''; try { $n = (Get-Process -Id $p -ErrorAction Stop).ProcessName } catch {}
    if ($n -ne $last) { $last = $n; Out1 ("fg" + [char]9 + $n) }
  }
  if ($cfg.caps) {
    $c = [int]([FG]::GetKeyState(0x14) -band 1)
    if ($c -ne $lastCaps) { $lastCaps = $c; Out1 ("caps" + [char]9 + $c) }
  }
  if ($slow) { foreach ($name in $cfg.titles) {
    # part of the name is enough: the new WhatsApp runs as "WhatsApp.Root"
    $t = (Get-Process -Name ('*' + $name + '*') -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle } | Select-Object -First 1).MainWindowTitle
    if ($null -eq $t) { $t = '' }
    if ($titles[$name] -ne $t) { $titles[$name] = $t; Out1 ("title" + [char]9 + $name + [char]9 + $t) }
  } }
  # taskbar buttons: some apps (Discord) put the unread count there, e.g. "Atenção solicitada, 1 notifications"
  if ($cfg.titles.Count -and ($tick % 4 -eq 0)) {
    $found = @{}; $rawNow = @{}
    try {
      if (-not $script:uia) { Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes; $script:uia = $true }
      $A = [System.Windows.Automation.AutomationElement]
      $bar = $A::RootElement.FindFirst([System.Windows.Automation.TreeScope]::Children, (New-Object System.Windows.Automation.PropertyCondition($A::ClassNameProperty, 'Shell_TrayWnd')))
      $btns = $bar.FindAll([System.Windows.Automation.TreeScope]::Descendants, (New-Object System.Windows.Automation.PropertyCondition($A::ClassNameProperty, 'Taskbar.TaskListButtonAutomationPeer')))
      foreach ($b in $btns) {
        $c = $b.Current; $help = [string]$c.HelpText
        foreach ($name in $cfg.titles) {
          if ($c.Name -notlike ('*' + $name + '*')) { continue }
          if ($help) { $rawNow[$name] = ($help -replace '[\\t\\r\\n]', ' ') }
          # Seen on Lucas's PC: Discord "No Notifications" / "0 notifications" / "Atenção solicitada, 1 notifications";
          # WhatsApp "Status 1 item" (a new status, NOT a message: 1.4.0 counted any number and blinked for it).
          # So a number counts only next to a message word; "no / nenhum / sem" means none; a message or
          # attention word without a number means 1.
          $n = 0
          $msgWord = 'notifica|notification|mensag|message|unread|n.o lid'
          if ($help -match ('(\\d+)\\s*(' + $msgWord + ')')) { $n = [int]$matches[1] }
          elseif ($help -match '^\\s*(no|nenhum|nenhuma|sem)\\b') { $n = 0 }
          elseif ($help -match ($msgWord + '|aten|attention')) { $n = 1 }
          # Discord with ONE unread message: the icon gets its red "1" but the text stays "No Notifications"
          # (seen on Lucas's PC, 2026-11-07; the text only updates from the 2nd message). So look at the icon:
          # red badge pixels together with Discord's blue-purple logo = at least 1. The taskbar is drawn with
          # PrintWindow, which works under a full-screen game (a screen capture showed Valorant there instead).
          if ($n -eq 0 -and $name -like '*discord*') {
            try {
              if (-not $script:gdi) { Add-Type -AssemblyName System.Drawing; $script:gdi = $true }
              $tb = [FG]::FindWindow('Shell_TrayWnd', $null); $tr = New-Object FG+RECT; [void][FG]::GetWindowRect($tb, [ref]$tr)
              $rc = $c.BoundingRectangle; $bx = [int]$rc.X - $tr.l; $by = [int]$rc.Y - $tr.t; $bw = [int]$rc.Width; $bh = [int]$rc.Height
              $tw = $tr.r - $tr.l; $th = $tr.b - $tr.t
              if ($bw -gt 8 -and $bh -gt 8 -and $bx -ge 0 -and $by -ge 0 -and $bx + $bw -le $tw -and $by + $bh -le $th) {
                $bmp = New-Object System.Drawing.Bitmap $tw, $th
                $gr = [System.Drawing.Graphics]::FromImage($bmp); $hdc = $gr.GetHdc(); [void][FG]::PrintWindow($tb, $hdc, 2); $gr.ReleaseHdc($hdc); $gr.Dispose()
                $red = 0; $logo = 0
                for ($yy = $by; $yy -lt $by + $bh; $yy += 2) { for ($xx = $bx; $xx -lt $bx + $bw; $xx += 2) { $px = $bmp.GetPixel($xx, $yy)
                  if ($px.R -gt 200 -and $px.G -lt 90 -and $px.B -lt 100) { $red++ }
                  elseif ($px.B -gt 200 -and $px.R -gt 60 -and $px.R -lt 130 -and $px.G -gt 70 -and $px.G -lt 130) { $logo++ } } }
                $bmp.Dispose()
                if ($red -ge 6 -and $logo -ge 15) { $n = 1 }
              }
            } catch {}
          }
          # the number bubble on the icon (WhatsApp) is a text inside the button, e.g. "3" or "99+"
          foreach ($k in $b.FindAll([System.Windows.Automation.TreeScope]::Descendants, (New-Object System.Windows.Automation.PropertyCondition($A::ControlTypeProperty, [System.Windows.Automation.ControlType]::Text)))) {
            if ($k.Current.Name -match '^\\s*(\\d+)\\+?\\s*$' -and [int]$matches[1] -gt $n) { $n = [int]$matches[1] }
          }
          if ($n -gt [int]$found[$name]) { $found[$name] = $n }
        }
      }
    } catch {}
    foreach ($name in $cfg.titles) {
      $n = [int]$found[$name]
      if ($badges[$name] -ne $n) { $badges[$name] = $n; Out1 ("badge" + [char]9 + $name + [char]9 + $n) }
      $r = [string]$rawNow[$name]
      if ($script:raws[$name] -ne $r) { $script:raws[$name] = $r; Out1 ("badgeraw" + [char]9 + $name + [char]9 + $r) }
    }
  }
  if ($cfg.vol) { Start-Sleep -Milliseconds 250 } else { Start-Sleep -Milliseconds 700 }
}`;
function setWatch(cfg) {
  watchCfg = { fg: !!cfg.fg, caps: !!cfg.caps, vol: !!cfg.vol, titles: (cfg.titles || []).filter(Boolean) };
  const key = JSON.stringify(watchCfg);
  const on = watchCfg.fg || watchCfg.caps || watchCfg.vol || watchCfg.titles.length;
  if (key === watchKey && (fgProc || !on)) return;
  watchKey = key;
  if (fgProc) { fgProc.kill(); fgProc = null; }
  if (!on) return;
  const p = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', FG_SCRIPT],
    { windowsHide: true, env: { ...process.env, SK80_WATCH: key, SK80_VOLCS: fs.readFileSync(path.join(__dirname, 'volume.cs'), 'utf8') } });
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
      else if (parts[0] === 'vol') { const [v, m] = (parts[1] || '').split(' '); if (v !== '') win.webContents.send('volume', +v, m === '1'); }
      else if (parts[0] === 'title') win.webContents.send('win-title', parts[1].toLowerCase(), parts.slice(2).join('\t'));
      else if (parts[0] === 'badge') win.webContents.send('win-badge', parts[1].toLowerCase(), +parts[2] || 0);
      else if (parts[0] === 'badgeraw') win.webContents.send('win-badge-raw', parts[1].toLowerCase(), parts.slice(2).join(' '));
    }
  });
  p.stderr.on('data', (d) => { if (process.env.SK80_DISPLAY2) try { fs.appendFileSync(path.join(__dirname, '..', 're', 'watch.err'), d); } catch (_) {} });
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
// ---- theme: the window frame follows the app theme ('auto' follows Windows) ----
function applyNativeTheme(pref) { nativeTheme.themeSource = pref === 'light' ? 'light' : pref === 'auto' ? 'system' : 'dark'; }
function startTheme() {
  const pref = (loadStore().settings || {}).theme || 'dark'; applyNativeTheme(pref);
  return pref === 'auto' ? (nativeTheme.shouldUseDarkColors ? 'dark' : 'light') : pref;
}
// ---- key presses in any program (typing-speed effect, typing statistics) ----
// uiohook-napi installs a low-level keyboard hook on its own thread. Only the key's name goes to the window
// (never text, never which program); held keys repeating count once. Runs only while a feature needs it.
let keyHook = null;
function setKeyWatch(on) {
  try {
    if (on && !keyHook) {
      const { uIOhook, UiohookKey } = require('uiohook-napi');
      const names = Object.fromEntries(Object.entries(UiohookKey).map(([n, c]) => [c, n]));
      const held = new Set();
      uIOhook.on('keydown', (e) => {
        if (held.has(e.keycode)) return; held.add(e.keycode);
        if (win && !win.isDestroyed() && names[e.keycode]) win.webContents.send('key-press', names[e.keycode]);
      });
      uIOhook.on('keyup', (e) => held.delete(e.keycode));
      uIOhook.start();
      keyHook = uIOhook;
    } else if (!on && keyHook) {
      keyHook.stop(); keyHook.removeAllListeners(); keyHook = null;
    }
    return { on: !!keyHook };
  } catch (e) { keyHook = null; return { on: false, error: e.message }; }
}
ipcMain.handle('keys:watch', wrap((on) => setKeyWatch(!!on)));
ipcMain.handle('theme:set',wrap((pref) => { if (['auto', 'dark', 'light'].includes(pref)) applyNativeTheme(pref); return true; }));
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
  if (!updater || update.state !== 'ready' || update.installing) return;
  update.installing = true;
  // show the "Atualizando…" screen for a moment so the app doesn't just vanish
  if (win) { showWindow(); win.webContents.send('update-installing', update.version); }
  setTimeout(() => {
    quitting = true; watchForeground(false);
    updater.quitAndInstall(true, true); // silent install, reopen the app afterwards
  }, 1800);
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

// ---- daily backup: userData/backups/sk80-YYYY-MM-DD.json (store + GIF index); GIF files go to a shared pool ----
const BACKUP_KEEP = 14;
const backupDir = () => path.join(app.getPath('userData'), 'backups');
const poolDir = () => path.join(backupDir(), 'gifs');
const dayStamp = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function listBackups() {
  try {
    return fs.readdirSync(backupDir()).filter((f) => /^sk80-.+\.json$/.test(f)).sort().reverse().map((f) => {
      const full = path.join(backupDir(), f), st = fs.statSync(full);
      let profiles = 0, gifs = 0;
      try { const b = JSON.parse(fs.readFileSync(full, 'utf8')); profiles = (b.store.profiles || []).length; gifs = (b.gifs || []).length; } catch (_) {}
      return { file: f, name: f.slice(5, -5), time: st.mtimeMs, size: st.size, profiles, gifs };
    });
  } catch (_) { return []; }
}
function makeBackup(name) {
  const store = loadStore();
  if (!Object.keys(store).length) return null; // nothing saved yet
  const gifs = readGifs();
  fs.mkdirSync(poolDir(), { recursive: true });
  for (const g of gifs) { // files are named by content hash, so each one is copied only once
    const dst = path.join(poolDir(), g.file);
    if (!fs.existsSync(dst)) { try { fs.copyFileSync(path.join(gifDir(), g.file), dst); } catch (_) {} }
  }
  const file = `sk80-${name}.json`;
  fs.writeFileSync(path.join(backupDir(), file), JSON.stringify({ app: 'sk80-studio', version: app.getVersion(), made: Date.now(), store, gifs }));
  pruneBackups();
  return file;
}
function pruneBackups() {
  const all = listBackups(), daily = all.filter((b) => /^\d{4}-\d\d-\d\d$/.test(b.name)), extra = all.filter((b) => !daily.includes(b));
  // keeps the newest 14 daily copies and the newest 5 "before restore" copies
  for (const b of [...daily.slice(BACKUP_KEEP), ...extra.slice(5)]) { try { fs.unlinkSync(path.join(backupDir(), b.file)); } catch (_) {} }
  const used = new Set();
  for (const b of listBackups()) { try { for (const g of JSON.parse(fs.readFileSync(path.join(backupDir(), b.file), 'utf8')).gifs || []) used.add(g.file); } catch (_) {} }
  try { for (const f of fs.readdirSync(poolDir())) if (!used.has(f)) fs.unlinkSync(path.join(poolDir(), f)); } catch (_) {}
}
function dailyBackup() {
  try {
    if (loadStore().settings?.backup === false) return;
    const name = dayStamp();
    if (!fs.existsSync(path.join(backupDir(), `sk80-${name}.json`))) makeBackup(name);
  } catch (e) { console.error('backup', e); }
}
function startBackups() { setTimeout(dailyBackup, 20000); setInterval(dailyBackup, 60 * 60 * 1000); }
ipcMain.handle('backup:list', wrap(() => ({ list: listBackups(), dir: backupDir() })));
ipcMain.handle('backup:now', wrap(() => {
  const now = new Date(), name = `${dayStamp(now)}`;
  const f = makeBackup(name); if (!f) throw new Error('Ainda não há nada salvo para copiar.'); return f;
}));
ipcMain.handle('backup:restore', wrap((file) => {
  if (!/^sk80-[\w-]+\.json$/.test(file)) throw new Error('Backup inválido');
  const b = JSON.parse(fs.readFileSync(path.join(backupDir(), file), 'utf8'));
  if (!b || b.app !== 'sk80-studio' || !b.store) throw new Error('Esse arquivo não é um backup do SK80 Studio.');
  const d = new Date();
  makeBackup(`antes-de-restaurar-${dayStamp(d)}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`);
  saveStore(b.store);
  const gifs = (b.gifs || []).filter((g) => {
    const dst = path.join(gifDir(), g.file);
    if (fs.existsSync(dst)) return true;
    try { fs.mkdirSync(gifDir(), { recursive: true }); fs.copyFileSync(path.join(poolDir(), g.file), dst); return true; } catch (_) { return false; }
  });
  writeGifs(gifs);
  return true;
}));
ipcMain.handle('backup:folder', wrap(() => { fs.mkdirSync(backupDir(), { recursive: true }); shell.openPath(backupDir()); return true; }));

ipcMain.handle('screen', wrap((frames, delays) => {
  kb.onProgress = (i, n) => win && win.webContents.send('screen-progress', i, n);
  return kb.uploadScreen(frames.map((f) => Buffer.from(f)), delays);
}));

// "Luz que reage à música": the window asks for display media; we answer with the system sound (loopback).
// The screen video track it comes with is stopped right away by the renderer.
function allowSystemAudio() {
  session.defaultSession.setDisplayMediaRequestHandler((_req, cb) => {
    desktopCapturer.getSources({ types: ['screen'] }).then((s) => cb({ video: s[0], audio: 'loopback' })).catch(() => cb({}));
  });
}
app.whenReady().then(() => { allowSystemAudio(); createWindow(); initUpdater(); startPowerWatch(); startBackups(); });
app.on('before-quit', () => { quitting = true; setWatch({}); setKeyWatch(false); globalShortcut.unregisterAll(); });
app.on('window-all-closed', () => { kb.close(); app.quit(); });
