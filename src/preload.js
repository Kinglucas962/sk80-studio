const { contextBridge, ipcRenderer } = require('electron');

const call = async (ch, ...a) => {
  const r = await ipcRenderer.invoke(ch, ...a);
  if (!r.ok) throw new Error(r.error);
  return r.value;
};

contextBridge.exposeInMainWorld('sk', {
  status: () => call('status'),
  getStore: () => call('store:get'),
  setStore: (patch) => call('store:set', patch),
  lighting: (o) => call('lighting', o),
  customColors: (c, o) => call('custom-colors', c, o),
  previewColors: (e) => call('preview-colors', e),
  keymap: (m, layer) => call('keymap', m, layer),
  macros: (m) => call('macros', m),
  screen: (frames, delays) => call('screen', frames, delays),
  gifList: () => call('gif:list'),
  gifRead: (id) => call('gif:read', id),
  gifSave: (meta, bytes) => call('gif:save', meta, bytes),
  gifRename: (id, name) => call('gif:rename', id, name),
  gifDelete: (id) => call('gif:delete', id),
  onScreenProgress: (cb) => ipcRenderer.on('screen-progress', (_e, i, n) => cb(i, n)),
  // files, programs, tray, autostart
  saveFile: (name, text, ext) => call('file:save', name, text, ext),
  openFile: (ext) => call('file:open', ext),
  appList: () => call('apps:list'),
  watchForeground: (on) => call('fg:watch', on),
  onForeground: (cb) => ipcRenderer.on('fg-app', (_e, name) => cb(name)),
  setTray: (st) => call('tray:set', st),
  onTrayProfile: (cb) => ipcRenderer.on('tray-profile', (_e, id) => cb(id)),
  setWatch: (cfg) => call('watch:set', cfg),
  onCaps: (cb) => ipcRenderer.on('caps', (_e, on) => cb(on)),
  onVolume: (cb) => ipcRenderer.on('volume', (_e, v, muted) => cb(v, muted)),
  onTitle: (cb) => ipcRenderer.on('win-title', (_e, name, title) => cb(name, title)),
  onBadge: (cb) => ipcRenderer.on('win-badge', (_e, name, n) => cb(name, n)),
  onAway: (cb) => ipcRenderer.on('away', (_e, away, why) => cb(away, why)),
  onIdle: (cb) => ipcRenderer.on('idle', (_e, sec) => cb(sec)),
  setHotkey: (accel) => call('hotkey:set', accel),
  onHotkey: (cb) => ipcRenderer.on('hotkey', () => cb()),
  notify: (title, body) => call('notify', title, body),
  openUrl: (url) => call('open:url', url),
  winVisible: () => call('win:visible'),
  galleryGet: (file) => call('gallery:get', file),
  appInfo: () => call('app:info'),
  setTheme: (pref) => call('theme:set', pref),
  backupList: () => call('backup:list'),
  backupNow: () => call('backup:now'),
  backupRestore: (file) => call('backup:restore', file),
  backupFolder: () => call('backup:folder'),
  checkUpdate: () => call('update:check'),
  installUpdate: () => call('update:install'),
  onUpdate: (cb) => ipcRenderer.on('update', (_e, u) => cb(u)),
  onUpdateInstalling: (cb) => ipcRenderer.on('update-installing', (_e, v) => cb(v)),
  onUpdateCheckManual: (cb) => ipcRenderer.on('update-check-manual', () => cb()),
  getAutostart: () => call('autostart:get'),
  setAutostart: (on) => call('autostart:set', on),
});
