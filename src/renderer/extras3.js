/* SK80 Studio 1.1 — undo/redo, volume bar, music-reactive light, custom effects (frame editor).
   Uses globals from app.js, extras.js (keyPos, toast, clone, uid, rgb2hex, hslHex) and extras2.js (liveSet, refreshWatch). */

// ====================== undo / redo ======================
// Every save (persist) compares paint, keys, macros and custom effects with the last state; changes become undo steps.
const Hist = { undo: [], redo: [], last: null };
const histSnap = () => JSON.stringify({ paint: state.paint, keymap: state.keymap, macros: state.macros, effects: state.effects });
window.SK_onPersist = () => {
  const now = histSnap();
  if (Hist.last === null) { Hist.last = now; return; }
  if (now === Hist.last) return;
  Hist.undo.push(Hist.last); if (Hist.undo.length > 80) Hist.undo.shift();
  Hist.redo = []; Hist.last = now; renderHistBtns();
};
function histReset() { Hist.undo = []; Hist.redo = []; Hist.last = histSnap(); renderHistBtns(); }
function renderHistBtns() {
  $('#undoBtn').disabled = !Hist.undo.length; $('#redoBtn').disabled = !Hist.redo.length;
}
function histApply(target, verb) {
  const cur = JSON.parse(histSnap()), s = JSON.parse(target);
  const changed = (k) => JSON.stringify(cur[k]) !== JSON.stringify(s[k]);
  const what = [changed('paint') && 'pintura', changed('keymap') && 'teclas', changed('macros') && 'macros', changed('effects') && 'efeitos'].filter(Boolean);
  state.paint = s.paint; state.keymap = s.keymap; state.macros = s.macros; state.effects = s.effects || [];
  if (state.macroSel >= state.macros.length) state.macroSel = Math.max(0, state.macros.length - 1);
  if (fx.sel >= state.effects.length) fx.sel = Math.max(0, state.effects.length - 1);
  Hist.last = target;
  renderBoard(); renderPicker(); renderMacros(); renderFx();
  if (what.includes('pintura') && state.paintActive) savePaint();
  if (what.includes('teclas')) { saveKeys.top(); saveKeys.fn(); }
  if (what.includes('macros')) saveMacros();
  persist(); renderHistBtns();
  toast(`${verb}: ${what.join(', ') || 'nada mudou'}`);
}
function undo() { if (!Hist.undo.length) return; Hist.redo.push(histSnap()); histApply(Hist.undo.pop(), 'Desfeito'); }
function redo() { if (!Hist.redo.length) return; Hist.undo.push(histSnap()); histApply(Hist.redo.pop(), 'Refeito'); }
function initHistory() {
  $('#undoBtn').onclick = undo; $('#redoBtn').onclick = redo;
  window.addEventListener('keydown', (e) => {
    if (!e.ctrlKey || e.altKey || e.defaultPrevented) return;
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || recording || capturingKey || hkCapture || state.view === 'tester') return;
    if (e.code === 'KeyZ' && !e.shiftKey) { e.preventDefault(); undo(); }
    else if (e.code === 'KeyY' || (e.code === 'KeyZ' && e.shiftKey)) { e.preventDefault(); redo(); }
  });
  histReset();
}

// ====================== volume bar on the number row ======================
const NUMROW = byLabel('1', '2', '3', '4', '5', '6', '7', '8', '9', '0');
let volLast = null, volHideT = null;
function onVolume(v, muted) {
  if (volLast === null) { volLast = `${v}/${muted}`; return; } // first reading after start: just remember it
  const key = `${v}/${muted}`; if (key === volLast) return;
  volLast = key;
  if (!state.settings.volBar.on) return;
  const n = muted ? 0 : Math.round(v / 10);
  liveSet('vol', (map) => {
    NUMROW.forEach((idx, i) => { map[idx] = muted ? (i === 9 ? [255, 30, 30] : [0, 0, 0]) : i < n ? hex2rgb(hslHex(120 - i * 12)) : [12, 12, 12]; });
  });
  clearTimeout(volHideT); volHideT = setTimeout(() => liveSet('vol', null), 2000);
}

// ====================== music-reactive light ======================
let music = null; // { stream, ctx, an, data, peak, bands, level }
const MUSIC_COLS = 16;
function bandLevels() {
  const m = music; m.an.getByteFrequencyData(m.data);
  const n = m.data.length, out = [];
  for (let c = 0; c < MUSIC_COLS; c++) { // log-spaced bands, ~40 Hz .. ~12 kHz
    const a = Math.floor(2 * Math.pow(n / 3, c / MUSIC_COLS)), b = Math.max(a + 1, Math.floor(2 * Math.pow(n / 3, (c + 1) / MUSIC_COLS)));
    let s = 0; for (let i = a; i < b && i < n; i++) s += m.data[i]; out.push(s / (b - a) / 255);
  }
  const loud = Math.max(...out);
  m.peak = Math.max(m.peak * 0.995, loud, 0.15);
  const sens = state.settings.music.sens;
  m.bands = out.map((v) => Math.min(1, (v / m.peak) * sens));
  m.level = Math.min(1, ((out[0] + out[1] + out[2]) / 3 / m.peak) * sens);
}
function musicColor(i, k) { // i: 0..1 position for rainbow
  const s = state.settings.music;
  const c = s.rainbow ? hex2rgb(hslHex((i * 300 + performance.now() / 40) % 360)) : hex2rgb(s.color);
  return c.map((v) => v * k);
}
function musicLayer(map) {
  if (!music) return;
  bandLevels();
  const mode = state.settings.music.mode;
  for (const key of LAYOUT) {
    const p = keyPos[key.idx];
    if (mode === 'bars') {
      const col = Math.min(MUSIC_COLS - 1, Math.floor(p.x * MUSIC_COLS)), h = music.bands[col];
      map[key.idx] = 1 - p.y <= h + 0.05 ? musicColor(p.x, 1) : [0, 0, 0];
    } else if (mode === 'pulse') {
      map[key.idx] = musicColor(p.x, 0.08 + 0.92 * music.level);
    } else { // wave: rings from the centre with the bass
      const d = Math.hypot(p.x - 0.5, (p.y - 0.5) * 0.5) * 1.6;
      map[key.idx] = d <= music.level ? musicColor(d, 1 - d * 0.5) : [0, 0, 0];
    }
  }
}
function drawMeter() {
  if (!music) return;
  const cv = $('#musicMeter'), ctx = cv.getContext('2d'), w = cv.width, h = cv.height;
  ctx.clearRect(0, 0, w, h);
  if (music.bands) music.bands.forEach((v, i) => {
    const bw = w / MUSIC_COLS;
    ctx.fillStyle = state.settings.music.rainbow ? hslHex(i * 300 / MUSIC_COLS) : state.settings.music.color;
    ctx.fillRect(i * bw + 2, h - v * h, bw - 4, v * h);
  });
  requestAnimationFrame(drawMeter);
}
async function musicStart() {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    stream.getVideoTracks().forEach((t) => t.stop()); // only the sound is used
    if (!stream.getAudioTracks().length) throw new Error('o Windows não entregou o som');
    const ctx = new AudioContext(), an = ctx.createAnalyser();
    an.fftSize = 1024; an.smoothingTimeConstant = 0.7;
    ctx.createMediaStreamSource(stream).connect(an);
    music = { stream, ctx, an, data: new Uint8Array(an.frequencyBinCount), peak: 0.15, bands: null, level: 0 };
    liveSet('music', musicLayer);
    renderMusic(); drawMeter();
  } catch (e) { toast('Não consegui ouvir o som do PC: ' + e.message); music = null; renderMusic(); }
}
function musicStop() {
  if (!music) return;
  music.stream.getTracks().forEach((t) => t.stop()); music.ctx.close();
  music = null; liveSet('music', null); renderMusic();
}
function renderMusic() {
  const s = state.settings.music, on = !!music;
  $('#musicToggle').textContent = on ? 'Parar' : 'Ligar a música no teclado';
  $('#musicToggle').classList.toggle('primary', !on);
  $('#musicState').textContent = on ? 'Ouvindo o som do PC. Toque uma música!' : 'Desligado.';
  $$('#musicMode button').forEach((b) => b.classList.toggle('on', b.dataset.v === s.mode));
  $('#musicRainbow').checked = s.rainbow; $('#musicColor').value = s.color; $('#musicColor').disabled = s.rainbow;
  $('#musicSens').value = s.sens; $('#musicSensOut').textContent = s.sens.toFixed(1) + '×';
  if (!on) { const cv = $('#musicMeter'); cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); }
}
function initMusic() {
  $('#musicToggle').onclick = () => (music ? musicStop() : musicStart());
  $$('#musicMode button').forEach((b) => (b.onclick = () => { state.settings.music.mode = b.dataset.v; persist(); renderMusic(); }));
  $('#musicRainbow').onchange = (e) => { state.settings.music.rainbow = e.target.checked; persist(); renderMusic(); };
  $('#musicColor').oninput = (e) => { state.settings.music.color = e.target.value; persist(); };
  $('#musicSens').oninput = (e) => { state.settings.music.sens = +e.target.value; $('#musicSensOut').textContent = (+e.target.value).toFixed(1) + '×'; persist(); };
  renderMusic();
}

// ====================== custom effects: frames painted on the drawn keyboard ======================
const fx = { sel: 0, frame: 0, tool: 'brush', color: '#00e5ff', playing: false, preview: false, previewT: null, pf: 0 };
const curFx = () => state.effects[fx.sel];
window.SK_fxTool = () => fx.tool;
window.SK_fxColors = () => { const e = curFx(); if (!e || !e.frames.length) return {}; return e.frames[fx.preview ? fx.pf % e.frames.length : fx.frame] || {}; };
window.SK_fxPaint = (idx, tool) => {
  const e = curFx(); if (!e) { toast('Crie um efeito primeiro'); return; }
  if (fx.preview) fxPreview(false);
  const f = e.frames[fx.frame];
  if (tool === 'erase') delete f[idx]; else f[idx] = fx.color;
  persist(); renderBoard(); renderFrames();
};
function fxTemplates() {
  const n = (k) => Array.from({ length: k }, () => ({}));
  return {
    blank: () => ({ ms: 300, frames: n(2) }),
    wave: () => { const fr = n(12); fr.forEach((f, i) => LAYOUT.forEach((k) => { f[k.idx] = hslHex((keyPos[k.idx].x * 360 + i * 30) % 360); })); return { ms: 120, frames: fr }; },
    blink: () => { const fr = n(2); LAYOUT.forEach((k) => { fr[0][k.idx] = fx.color; }); return { ms: 400, frames: fr }; },
    run: () => { const fr = n(14); fr.forEach((f, i) => LAYOUT.forEach((k) => { if (Math.abs(keyPos[k.idx].x - i / 13) < 0.09) f[k.idx] = fx.color; })); return { ms: 90, frames: fr }; },
    rows: () => { const fr = n(6); const rows = [29, 79, 120, 159, 200, 241]; fr.forEach((f, i) => LAYOUT.forEach((k) => { const r = rows.reduce((b, y, j) => (Math.abs(k.y - y) < Math.abs(k.y - rows[b]) ? j : b), 0); if (r === i) f[k.idx] = hslHex(i * 60); })); return { ms: 200, frames: fr }; },
  };
}
function fxNew(kind) {
  const t = fxTemplates()[kind]();
  const names = { blank: 'Meu efeito', wave: 'Onda arco-íris', blink: 'Piscar', run: 'Corrida', rows: 'Fileiras' };
  state.effects.push({ id: uid(), name: names[kind] + (state.effects.length ? ' ' + (state.effects.length + 1) : ''), ms: t.ms, frames: t.frames });
  fx.sel = state.effects.length - 1; fx.frame = 0; persist(); renderFx(); renderBoard();
}
function fxPlay(on) {
  fx.playing = on;
  liveSet('fx', on ? (map, t) => {
    const e = curFx(); if (!e || !e.frames.length) return;
    const f = e.frames[Math.floor((t * 1000) / e.ms) % e.frames.length];
    for (const k of LAYOUT) map[k.idx] = f[k.idx] ? hex2rgb(f[k.idx]) : [0, 0, 0];
  } : null);
  renderFx();
}
function fxPreview(on) {
  fx.preview = on; clearTimeout(fx.previewT);
  const step = () => { if (!fx.preview) return; fx.pf++; renderBoard(); const e = curFx(); fx.previewT = setTimeout(step, e ? e.ms : 300); };
  if (on) { fx.pf = 0; step(); } else renderBoard();
  $('#fxPreview').textContent = on ? 'Parar prévia' : 'Ver prévia';
}
function renderFrames() {
  const e = curFx(), box = $('#fxFrames'); box.innerHTML = '';
  if (!e) return;
  e.frames.forEach((f, i) => {
    const c = document.createElement('button'); c.className = 'fxframe' + (i === fx.frame ? ' on' : '');
    c.innerHTML = '<div class="gmini">' + LAYOUT.map((k) => `<i style="left:${((k.x - 72) / 6.6).toFixed(1)}%;top:${((k.y - 22) / 2.7).toFixed(1)}%;width:${(k.w / 6.6).toFixed(1)}%;background:${f[k.idx] || 'var(--mini-off)'}"></i>`).join('') + `</div><span>${i + 1}</span>`;
    c.onclick = () => { fx.frame = i; if (fx.preview) fxPreview(false); renderBoard(); renderFrames(); };
    box.appendChild(c);
  });
  $('#fxInfo').textContent = `${e.frames.length} quadro(s) · ${(e.frames.length * e.ms / 1000).toFixed(1)} s por volta`;
}
function renderFx() {
  const list = $('#fxList'); list.innerHTML = '';
  if (!state.effects.length) list.innerHTML = '<p class="hint">Nenhum efeito ainda. Comece de um modelo abaixo.</p>';
  state.effects.forEach((e, i) => {
    const d = document.createElement('div'); d.className = 'mitem' + (i === fx.sel ? ' on' : '');
    d.innerHTML = `<div><b></b><small>${e.frames.length} quadros</small></div>${fx.playing && i === fx.sel ? '<span class="badge">tocando</span>' : ''}`;
    $('b', d).textContent = e.name;
    d.onclick = () => { fx.sel = i; fx.frame = 0; renderFx(); renderBoard(); };
    list.appendChild(d);
  });
  const e = curFx();
  $('#fxEditor').classList.toggle('disabled', !e);
  if (!e) { $('#fxFrames').innerHTML = ''; $('#fxInfo').textContent = ''; return; }
  if (fx.frame >= e.frames.length) fx.frame = e.frames.length - 1;
  if (document.activeElement !== $('#fxName')) $('#fxName').value = e.name;
  $('#fxSpeed').value = e.ms; $('#fxSpeedOut').textContent = e.ms + ' ms';
  $('#fxColor').value = fx.color;
  $$('#fxTools button').forEach((b) => b.classList.toggle('on', b.dataset.v === fx.tool));
  $('#fxPlay').textContent = fx.playing ? 'Parar no teclado' : 'Tocar no teclado';
  $('#fxPlay').classList.toggle('primary', !fx.playing);
  renderFrames();
}
function initFx() {
  $$('#fxNewBtns button').forEach((b) => (b.onclick = () => fxNew(b.dataset.v)));
  $('#fxName').oninput = (e) => { curFx().name = e.target.value || 'Sem nome'; persist(); renderFx(); };
  $('#fxSpeed').oninput = (e) => { curFx().ms = +e.target.value; $('#fxSpeedOut').textContent = e.target.value + ' ms'; persist(); renderFrames(); };
  $('#fxColor').oninput = (e) => { fx.color = e.target.value; fx.tool = 'brush'; renderFx(); };
  $$('#fxTools button').forEach((b) => (b.onclick = () => { fx.tool = b.dataset.v; renderFx(); }));
  const ed = (fn) => () => { const e = curFx(); if (!e) return; fn(e); persist(); renderFx(); renderBoard(); };
  $('#fxAdd').onclick = ed((e) => { e.frames.splice(fx.frame + 1, 0, {}); fx.frame++; });
  $('#fxDupF').onclick = ed((e) => { e.frames.splice(fx.frame + 1, 0, clone(e.frames[fx.frame])); fx.frame++; });
  $('#fxDelF').onclick = ed((e) => { if (e.frames.length > 1) { e.frames.splice(fx.frame, 1); fx.frame = Math.max(0, fx.frame - 1); } });
  $('#fxLeft').onclick = ed((e) => { const i = fx.frame; if (i > 0) { [e.frames[i - 1], e.frames[i]] = [e.frames[i], e.frames[i - 1]]; fx.frame--; } });
  $('#fxRight').onclick = ed((e) => { const i = fx.frame; if (i < e.frames.length - 1) { [e.frames[i + 1], e.frames[i]] = [e.frames[i], e.frames[i + 1]]; fx.frame++; } });
  $('#fxFill').onclick = ed((e) => { const f = e.frames[fx.frame]; for (const k of LAYOUT) f[k.idx] = fx.color; });
  $('#fxClearF').onclick = ed((e) => { e.frames[fx.frame] = {}; });
  $('#fxDel').onclick = () => {
    const e = curFx(); if (!e || !confirm(`Excluir o efeito “${e.name}”?`)) return;
    if (fx.playing) fxPlay(false);
    state.effects.splice(fx.sel, 1); fx.sel = Math.max(0, fx.sel - 1); fx.frame = 0; persist(); renderFx(); renderBoard();
  };
  $('#fxPlay').onclick = () => fxPlay(!fx.playing);
  $('#fxPreview').onclick = () => fxPreview(!fx.preview);
  onView.effects = () => { renderFx(); renderBoard(); };
  const prev = onView.music; onView.music = () => { prev && prev(); renderMusic(); };
  renderFx();
}

// ====================== daily backup ======================
// main.js makes the copy; here: on/off, list, "back up now" and restore.
function bkWhen(b) {
  const m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(b.name);
  const t = new Date(b.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (!m) return `Antes de restaurar · ${new Date(b.time).toLocaleDateString('pt-BR')} ${t}`;
  const d = new Date(+m[1], m[2] - 1, +m[3]), today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.round((today - d) / 864e5);
  const label = days === 0 ? 'Hoje' : days === 1 ? 'Ontem' : d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });
  return `${label[0].toUpperCase()}${label.slice(1)} · ${t}`;
}
async function renderBackups() {
  const box = $('#bkList'); if (!box) return;
  let res; try { res = await window.sk.backupList(); } catch (e) { $('#bkStatus').textContent = 'Não consegui ler os backups: ' + e.message; return; }
  const list = res.list;
  $('#bkStatus').textContent = list.length ? `${list.length} cópia(s).` : (state.settings.backup === false ? 'Backup diário desligado.' : 'A primeira cópia é feita alguns segundos depois de abrir o app.');
  box.innerHTML = '';
  for (const b of list) {
    const row = document.createElement('div'); row.className = 'bkrow';
    const kb = Math.max(1, Math.round(b.size / 1024));
    row.innerHTML = `<div class="grow"><b></b><small></small></div><button class="btn ghost small">Restaurar</button>`;
    row.querySelector('b').textContent = bkWhen(b);
    row.querySelector('small').textContent = `${b.profiles || 1} perfil(is) · ${b.gifs} GIF(s) · ${kb} KB`;
    row.querySelector('button').onclick = () => restoreBackup(b);
    box.appendChild(row);
  }
}
async function restoreBackup(b) {
  if (!confirm(`Voltar para o backup de ${bkWhen(b)}?\n\nPerfis, cores, teclas, macros, efeitos e GIFs voltam a ser como estavam nesse dia, e tudo é mandado de novo para o teclado.\nAntes, o app guarda uma cópia de como está agora (aparece como "Antes de restaurar").`)) return;
  try {
    await window.sk.backupRestore(b.file);
    try { sessionStorage.setItem('sk-restored', bkWhen(b)); } catch (_) {}
    location.reload();
  } catch (e) { toast('Não consegui restaurar: ' + e.message); }
}
function initBackup() {
  $('#bkOn').checked = state.settings.backup !== false;
  $('#bkOn').onchange = (e) => { state.settings.backup = e.target.checked; persist(); renderBackups(); };
  $('#bkFolder').onclick = () => window.sk.backupFolder();
  $('#bkNow').onclick = async () => {
    persist(); await new Promise((r) => setTimeout(r, 500)); // let the last change reach the file first
    try { await window.sk.backupNow(); toast('Backup feito.'); } catch (e) { toast(e.message); }
    renderBackups();
  };
  const prev = onView.settings; onView.settings = () => { prev && prev(); renderBackups(); };
  let restored = null; try { restored = sessionStorage.getItem('sk-restored'); sessionStorage.removeItem('sk-restored'); } catch (_) {}
  if (restored) {
    toast('Backup restaurado (' + restored + '). Mandando para o teclado…');
    Promise.resolve(pushToKeyboard()).then(() => toast('Pronto: teclado igual ao backup.')).catch((e) => toast('Restaurado no app, mas o teclado não recebeu: ' + e.message));
  }
}

function initExtras3() {
  initBackup();
  if (!state.settings.volBar) state.settings.volBar = { on: true };
  if (!state.settings.music) state.settings.music = { mode: 'bars', rainbow: true, color: '#ff2a2a', sens: 1.2 };
  if (!Array.isArray(state.effects)) state.effects = [];
  initHistory(); initMusic(); initFx();
  $('#volOn').checked = state.settings.volBar.on;
  $('#volOn').onchange = (e) => { state.settings.volBar.on = e.target.checked; persist(); refreshWatch(); };
  window.sk.onVolume(onVolume);
  refreshWatch();
}
window.SK_EXTRAS.push(initExtras3);
