/* SK80 Studio 1.0.1 — automatic light (lock / idle / schedule), global profile hotkey, live layer
   (Caps Lock, message alert, Pomodoro), key tester, community gallery, GIF per profile, "what's new".
   Uses globals from app.js and extras.js. */
const CHANGES = {
  '1.1.2': [
    'Luz por horário: coloque quantos horários quiser, cada um com o que a luz faz (diminuir o brilho, apagar ou usar um perfil). Fica em Ajustes › Luz automática.',
    'Perfil exportado leva junto o GIF da telinha. Quem importa ou baixa da galeria escolhe aplicar com ou sem o GIF.',
    'Efeitos próprios: arraste os quadros para mudar a ordem.',
    'O ícone do botão de tema ficou centralizado.',
  ],
  '1.1.1': [
    'Visual novo, com tema claro: clique no sol/lua no topo ou escolha em Ajustes › Aparência (Automático segue o Windows).',
    'Buscar (Ctrl + K): digite “GIF”, “backup” ou “noite” e vá direto para a tela ou o ajuste.',
    'A cor do seu teclado agora ilumina o app: o brilho atrás do teclado desenhado e as marcações seguem a luz.',
    'Backup diário: uma vez por dia o app guarda uma cópia de tudo (perfis, cores, teclas, macros, efeitos e GIFs). Em Ajustes dá para ver as cópias e voltar para qualquer uma.',
    'As animações do app funcionam mesmo com as animações do Windows desligadas.',
    'O tempo de cada quadro em Efeitos próprios não sai mais para fora do quadro.',
  ],
  '1.1.0': [
    'Desfazer e refazer (Ctrl + Z / Ctrl + Y, ou os botões no topo) na pintura, teclas, macros e efeitos.',
    'Efeitos próprios: pinte quadros no teclado desenhado e toque a animação em loop.',
    'Música: o teclado dança com o som do PC, em barras, pulso ou onda.',
    'Barra de volume: ao mudar o volume, as teclas 1 a 0 mostram o nível.',
  ],
  '1.0.6': [
    'Atualização mais clara: um cartão no menu mostra o download e avisa quando está pronta.',
    'Clique na versão, no rodapé do menu, para procurar atualização na hora (também tem na bandeja).',
    'Tela de Atualizando ao reiniciar para atualizar, em vez do app sumir.',
    'Ícone da bandeja igual ao do app.',
  ],
  '1.0.5': ['A telinha do teclado desenhado já abre mostrando o último GIF que você mandou.'],
  '1.0.4': ['Os botões de ligar e desligar ficam fáceis de ver com qualquer cor de luz.'],
  '1.0.3': ['O aviso de mensagem pode piscar o teclado inteiro, não só uma tecla.'],
  '1.0.2': [
    'Menu lateral em grupos, com uma linha explicando cada parte.',
    'A Iluminação mostra o que o teclado está mostrando agora e explica cada efeito; os que reagem ao toque têm ✋.',
    'Ajustes reorganizados em lista, como nas Configurações do Windows.',
    'O Pomodoro ganhou uma aba própria.',
  ],
  '1.0.1': [
    'Apaga a luz quando o PC bloqueia ou fica parado, e volta quando você chega.',
    'Luz por horário: diminui, apaga ou troca de perfil à noite.',
    'Atalho global para trocar de perfil (padrão Ctrl + Alt + P).',
    'Caps Lock aceso numa cor e aviso de mensagem piscando uma tecla.',
    'Testador de teclas, para achar tecla falhando ou dando clique duplo.',
    'Galeria de perfis da comunidade e GIF da telinha por perfil.',
  ],
};
const DEFAULT_SETTINGS = {
  offOnLock: true, idleMin: 0,
  // light by schedule: any number of time ranges, each with its own action (older saves had one "night" range)
  schedule: { on: false, items: [{ id: 's1', from: '23:00', to: '07:00', action: 'dim', bright: 1, profile: null }] },
  hotkey: 'Control+Alt+P',
  caps: { on: false, color: '#00e5ff' },
  msg: { on: false, apps: ['whatsapp', 'discord', 'telegram'], key: 1, color: '#25d366' },
};
function settingsDefaults() {
  const old = state.settings.night;
  if (old && !state.settings.schedule) { // 1.1.1 and older: one night range becomes the first schedule item
    state.settings.schedule = { on: !!old.on, items: [{ id: 's1', from: old.from || '23:00', to: old.to || '07:00', action: old.action || 'dim', bright: old.bright ?? 1, profile: old.profile || null }] };
  }
  delete state.settings.night;
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
    if (state.settings[k] === undefined) state.settings[k] = clone(v);
    else if (v && typeof v === 'object' && !Array.isArray(v)) state.settings[k] = { ...clone(v), ...state.settings[k] };
  }
}

// ====================== light override: away (lock/idle) and night ======================
let away = false, nightItem = null, nightKey = null, nightProfileId = null; // nightItem = schedule range in effect now
function lightOverride() {
  if (away) return { off: true };
  if (nightItem && nightItem.action === 'off') return { off: true };
  if (nightItem && nightItem.action === 'dim') return { bright: nightItem.bright };
  return null;
}
const lightsOff = () => !!(lightOverride() || {}).off;
// send the saved lighting again, respecting the override (used after live layers stop, on wake, on schedule)
function sendLight() {
  const o = lightOverride();
  return device(async () => {
    if (o && o.off) { await window.sk.lighting({ mode: 0 }); return; }
    const br = o && o.bright != null ? o.bright : null;
    if (state.paintActive) {
      const colors = {}; for (const [i, c] of Object.entries(state.paint)) colors[i] = hex2rgb(c);
      await window.sk.customColors(colors, { brightness: br ?? state.paintBright });
    } else {
      const l = state.light, [r, g, b] = hex2rgb(l.color);
      await window.sk.lighting({ mode: l.mode, r, g, b, random: l.random, brightness: br ?? l.brightness, speed: l.speed, direction: l.direction });
    }
  });
}
let lastOverrideKey = 'null';
function overrideChanged() {
  const key = JSON.stringify(lightOverride());
  if (key === lastOverrideKey) return;
  lastOverrideKey = key;
  if (Live.running && !lightsOff()) return; // the live loop keeps painting; it restores when it stops
  sendLight(); liveKick();
}
function setAway(v, why) {
  if (v && why === 'lock' && !state.settings.offOnLock) return;
  if (v === away) return;
  away = v; overrideChanged();
}
function idleTick(sec) {
  const m = state.settings.idleMin;
  if (m > 0 && sec >= m * 60) setAway(true, 'idle');
  else if (away && sec < 15 && !locked) setAway(false, 'idle');
}
let locked = false;
const toMin = (hhmm) => { const [h, m] = String(hhmm || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
const inRange = (it, cur) => { const a = toMin(it.from), b = toMin(it.to); return a === b ? false : a < b ? cur >= a && cur < b : cur >= a || cur < b; };
// the first range (top of the list) that contains the current time wins
function scheduleNow() {
  const s = state.settings.schedule;
  if (!s || !s.on) return null;
  const now = new Date(), cur = now.getHours() * 60 + now.getMinutes();
  return s.items.find((it) => inRange(it, cur)) || null;
}
function nightTick() {
  const hit = scheduleNow();
  const key = hit ? JSON.stringify([hit.id, hit.action, hit.bright, hit.profile]) : null;
  if (key === nightKey) return;
  nightKey = key; nightItem = hit;
  if (hit && hit.action === 'profile' && hit.profile && prof(hit.profile)) {
    if (nightProfileId !== hit.profile) { nightProfileId = hit.profile; switchProfile(hit.profile, false); }
    lastOverrideKey = ''; overrideChanged(); return;
  }
  // a schedule profile was in use (range ended, was removed or changed to another action): back to the chosen one
  if (nightProfileId) { nightProfileId = null; switchProfile(state.baseProfile, false); }
  overrideChanged();
}
const scheduleRecheck = () => { nightKey = undefined; nightTick(); };

// ====================== live layer: re-sends colours every ~95 ms while any layer is on ======================
const Live = { layers: {}, running: false };
function liveSet(name, fn) { if (fn) Live.layers[name] = fn; else delete Live.layers[name]; liveKick(); }
const liveWanted = () => Object.keys(Live.layers).length > 0 && !lightsOff();
// base colours under the overlays: per-key paint, or the static colour; other effects send only the overlay keys
function liveBase() {
  const base = {};
  const o = lightOverride(), br = (o && o.bright != null ? o.bright : null);
  if (state.paintActive) {
    const k = (br ?? state.paintBright) / 5;
    for (const key of LAYOUT) { const c = state.paint[key.idx]; base[key.idx] = c ? hex2rgb(c).map((v) => v * k) : [0, 0, 0]; }
    return base;
  }
  const l = state.light;
  if (l.mode === 1 && !l.random) {
    const k = (br ?? l.brightness) / 5, c = hex2rgb(l.color).map((v) => v * k);
    for (const key of LAYOUT) base[key.idx] = c;
    return base;
  }
  if (l.mode === 0) { for (const key of LAYOUT) base[key.idx] = [0, 0, 0]; return base; }
  return null; // animated effect: only the overlay keys are sent (experimental)
}
async function liveKick() {
  if (Live.running || !liveWanted()) return;
  Live.running = true;
  while (liveWanted()) {
    const t = performance.now() / 1000;
    const map = liveBase() || {};
    for (const fn of Object.values(Live.layers)) fn(map, t);
    const entries = Object.entries(map).map(([i, c]) => [+i, ...c.map((v) => Math.max(0, Math.min(255, Math.round(v))))]);
    try { await window.sk.previewColors(entries); if (syncErr) { syncErr = null; setSync(); } }
    catch (e) { syncErr = e.message; setSync(); await sleepMs(1000); }
    await sleepMs(95);
  }
  Live.running = false;
  sendLight(); // back to the saved lighting (or off)
}

// Caps Lock
const CAPS_IDX = 55;
function capsLayer(on) {
  liveSet('caps', on && state.settings.caps.on ? (map) => { map[CAPS_IDX] = hex2rgb(state.settings.caps.color); } : null);
}
let capsOn = false;

// message alert: window titles with "(3)" style unread counters
const unread = {};
function titleCount(t) { const m = String(t || '').match(/[(\[](\d+)[)\]]/); return m ? +m[1] : 0; }
function onTitle(name, title) {
  unread[name] = titleCount(title);
  const any = state.settings.msg.on && Object.values(unread).some((n) => n > 0);
  liveSet('msg', any ? (map, t) => {
    const c = (t % 1) < 0.5 ? hex2rgb(state.settings.msg.color) : [0, 0, 0];
    if (state.settings.msg.key === 'all') for (const k of LAYOUT) map[k.idx] = c; else map[state.settings.msg.key] = c;
  } : null);
  const showMsg = () => $('#msgBox').classList.toggle('off', !s.msg.on);
  showMsg(); $('#msgOn').addEventListener('change', showMsg);
  renderMsgStatus();
}
function renderMsgStatus() {
  const s = Object.entries(unread).filter(([, n]) => n > 0).map(([a, n]) => `${a}: ${n}`).join(' · ');
  const el = $('#msgStatus'); if (el) el.textContent = state.settings.msg.on ? (s ? 'Não lidas → ' + s : 'Nenhuma mensagem nova nos títulos agora.') : '';
}

function refreshWatch() {
  window.sk.setWatch({
    fg: state.profiles.some((p) => (p.apps || []).length),
    caps: !!(state.settings.caps && state.settings.caps.on),
    vol: !!(state.settings.volBar && state.settings.volBar.on),
    titles: state.settings.msg && state.settings.msg.on ? state.settings.msg.apps : [],
  }).catch(() => {});
}

// ====================== global hotkey: next profile ======================
async function applyHotkey() {
  const ok = await window.sk.setHotkey(state.settings.hotkey || '').catch(() => false);
  $('#hkText').textContent = state.settings.hotkey ? state.settings.hotkey.replace('Control', 'Ctrl').replace(/\+/g, ' + ') : 'desligado';
  $('#hkStatus').textContent = !state.settings.hotkey ? 'Desligado. Clique em Mudar para escolher um atalho.' : ok ? 'Funciona em qualquer programa, até com o app na bandeja.' : 'Outro programa já usa esse atalho. Clique em Mudar e escolha outro.';
  $('#hkStatus').classList.toggle('bad', !!state.settings.hotkey && !ok);
}
async function nextProfile() {
  const i = state.profiles.findIndex((p) => p.id === state.activeProfile);
  const p = state.profiles[(i + 1) % state.profiles.length];
  await switchProfile(p.id, true);
  if (!(await window.sk.winVisible().catch(() => true))) window.sk.notify('SK80 Studio', `Perfil: ${p.name}`);
}
let hkCapture = false;
function hotkeyFromEvent(e) {
  const mods = [];
  if (e.ctrlKey) mods.push('Control'); if (e.altKey) mods.push('Alt'); if (e.shiftKey) mods.push('Shift'); if (e.metaKey) mods.push('Super');
  let k = null;
  if (/^Key[A-Z]$/.test(e.code)) k = e.code.slice(3);
  else if (/^Digit\d$/.test(e.code)) k = e.code.slice(5);
  else if (/^F\d{1,2}$/.test(e.code)) k = e.code;
  else if (/^Numpad\d$/.test(e.code)) k = 'num' + e.code.slice(6);
  else k = { Space: 'Space', Home: 'Home', End: 'End', PageUp: 'PageUp', PageDown: 'PageDown', Insert: 'Insert', Delete: 'Delete', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right' }[e.code] || null;
  if (!k) return null;
  if (!mods.length && !/^F\d/.test(k)) return null; // plain letters would block typing
  return [...mods, k].join('+');
}

// ====================== key tester ======================
const tester = { ok: new Set(), count: {}, lastUp: {}, warn: new Set(), down: new Set(), last: '' };
const usageToKeys = {}; for (const k of LAYOUT) (usageToKeys[k.usage] = usageToKeys[k.usage] || []).push(k.idx);
function testerKey(e, kind) {
  if (state.view !== 'tester') return;
  e.preventDefault(); e.stopPropagation();
  const c = window.SK_CODES[e.code];
  const idxs = c ? usageToKeys[c[0]] || [] : [];
  if (!idxs.length) { tester.last = `${e.code || e.key} (fora do desenho)`; renderTester(); return; }
  if (e.repeat) return;
  const now = performance.now();
  for (const i of idxs) {
    if (kind === 'down') {
      if (tester.lastUp[i] && now - tester.lastUp[i] < 35) tester.warn.add(i); // released and pressed again in <35 ms
      tester.down.add(i); tester.ok.add(i); tester.count[i] = (tester.count[i] || 0) + 1;
    } else { tester.down.delete(i); tester.lastUp[i] = now; }
  }
  tester.last = `${c[1]} ${kind === 'down' ? 'apertada' : 'solta'}`;
  renderTester();
}
function renderTester() {
  for (const el of $$('.key')) {
    const i = +el.dataset.idx, on = state.view === 'tester';
    el.classList.toggle('t-ok', on && tester.ok.has(i));
    el.classList.toggle('t-down', on && tester.down.has(i));
    el.classList.toggle('t-warn', on && tester.warn.has(i));
  }
  if (state.view !== 'tester') return;
  const testable = LAYOUT.filter((k) => k.label !== 'Fn');
  const missing = testable.filter((k) => !tester.ok.has(k.idx));
  $('#tCount').textContent = `${testable.length - missing.length} de ${testable.length}`;
  $('#tLast').textContent = tester.last || '—';
  $('#tMissing').textContent = missing.length ? missing.map((k) => k.label || 'Espaço').join('  ') : 'Todas funcionaram!';
  const w = [...tester.warn].map((i) => byIdx[i].label || 'Espaço');
  $('#tWarn').textContent = w.length ? 'Possível clique duplo: ' + w.join(', ') : 'Nenhum clique duplo detectado.';
  $('#tWarn').classList.toggle('bad', w.length > 0);
}

// ====================== community gallery ======================
let galleryList = null;
function miniPreview(d) {
  if (d.paintActive) {
    return '<div class="gmini">' + LAYOUT.map((k) => `<i style="left:${((k.x - 72) / 6.6).toFixed(1)}%;top:${((k.y - 22) / 2.7).toFixed(1)}%;width:${(k.w / 6.6).toFixed(1)}%;background:${d.paint[k.idx] || 'var(--mini-off)'}"></i>`).join('') + '</div>';
  }
  const mode = (window.SK_MODES.find(([id]) => id === d.light.mode) || [0, '?'])[1];
  const bg = d.light.random ? 'linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f)' : d.light.color;
  return `<div class="gmini fx" style="background:${bg}"><span>${esc(mode)}</span></div>`;
}
async function loadGallery() {
  const box = $('#galGrid');
  box.innerHTML = '<p class="hint">Carregando…</p>';
  try { galleryList = JSON.parse(await window.sk.galleryGet('index.json')); }
  catch (e) { box.innerHTML = `<p class="hint">Não consegui abrir a galeria (${esc(e.message)}). Confira a internet.</p>`; return; }
  box.innerHTML = '';
  for (const g of galleryList) {
    const c = document.createElement('div'); c.className = 'galcard';
    c.innerHTML = `<div class="gprev">…</div><b></b><small class="by"></small><p></p><button class="btn small primary">Baixar perfil</button>`;
    $('b', c).textContent = g.name; $('.by', c).textContent = 'por ' + (g.author || 'anônimo'); $('p', c).textContent = g.desc || '';
    window.sk.galleryGet(g.file).then((t) => { const o = JSON.parse(t); g.data = o; $('.gprev', c).innerHTML = miniPreview(o.data); }).catch(() => { $('.gprev', c).textContent = '?'; });
    $('button', c).onclick = async () => {
      const o = g.data || JSON.parse(await window.sk.galleryGet(g.file));
      if (o.kind !== 'profile' || !o.data) { toast('Perfil inválido'); return; }
      const p = { id: uid(), name: o.name || g.name, apps: [], data: o.data };
      const gif = await askProfileGif(o); if (gif === undefined) return;
      p.gif = gif;
      state.profiles.push(p); editId = p.id; profilesChanged();
      toast(`“${p.name}” baixado${gif ? ' com o GIF' : ''}. Clique em “Usar este perfil” para mandar ao teclado.`);
    };
    box.appendChild(c);
  }
}

// ====================== GIF inside a shared profile ======================
const toB64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const fromB64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
async function profileGifForExport(p) {
  let id = p.gif || (p.id === state.activeProfile ? state.settings.lastGif : null);
  if (!id && p.id === state.activeProfile) { // older saves don't know the last GIF: the most recently sent one
    const list = await window.sk.gifList().catch(() => []);
    const g = list.filter((x) => x.lastSent).sort((a, b) => b.lastSent - a.lastSent)[0];
    id = g && g.id;
  }
  if (!id) return null;
  const { meta, bytes } = await window.sk.gifRead(id);
  return { name: meta.name, type: meta.type, fit: meta.fit, speed: meta.speed, bg: meta.bg, crop: meta.crop, range: meta.range, data: toB64(new Uint8Array(bytes)) };
}
// Shared profile with a GIF: ask "with or without". Resolves to the library id (with), null (without
// or no GIF in the file) or undefined (closed: cancel).
function askProfileGif(o) {
  const g = o.gif;
  if (!g || !g.data) return Promise.resolve(null);
  let bytes; try { bytes = fromB64(g.data); } catch (_) { return Promise.resolve(null); }
  const url = URL.createObjectURL(new Blob([bytes], { type: g.type || 'image/gif' }));
  const m = $('#gifAsk');
  $('#gifAskName').textContent = o.name || 'Perfil';
  $('#gifAskImg').src = url; $('#gifAskImg').style.objectFit = g.fit === 'contain' ? 'contain' : g.fit === 'stretch' ? 'fill' : 'cover';
  $('#gifAskImg').parentElement.style.background = g.bg || '#000';
  $('#gifAskInfo').textContent = `“${g.name || 'GIF'}” · ${Math.max(1, Math.round(bytes.length / 1024))} KB`;
  m.classList.add('show');
  return new Promise((resolve) => {
    const done = async (v) => {
      m.classList.remove('show'); URL.revokeObjectURL(url);
      removeEventListener('keydown', onEsc, true);
      if (v !== 'with') return resolve(v === 'without' ? null : undefined);
      try {
        const saved = await window.sk.gifSave({ name: g.name || o.name || 'GIF', type: g.type || 'image/gif', fit: g.fit, speed: g.speed, bg: g.bg, crop: g.crop, range: g.range }, bytes);
        resolve(saved.id);
      } catch (e) { toast('Não consegui guardar o GIF: ' + e.message + '. O perfil entra sem ele.'); resolve(null); }
    };
    const onEsc = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done('cancel'); } };
    addEventListener('keydown', onEsc, true);
    $('#gifAskWith').onclick = () => done('with');
    $('#gifAskWithout').onclick = () => done('without');
    $('#gifAskCancel').onclick = () => done('cancel');
    m.onclick = (e) => { if (e.target === m) done('cancel'); };
    $('#gifAskWith').focus();
  });
}

// ====================== GIF per profile ======================
async function renderProfileGif() {
  const p = prof(editId); if (!p) return;
  const list = await window.sk.gifList().catch(() => []);
  const sel = $('#pGif');
  sel.innerHTML = '<option value="">Não mudar a telinha</option>' + list.map((g) => `<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('');
  sel.value = p.gif && list.some((g) => g.id === p.gif) ? p.gif : '';
}
async function sendProfileGif(p) {
  if (!p.gif || p.gif === state.settings.lastGif) return;
  const list = await window.sk.gifList().catch(() => []);
  const g = list.find((x) => x.id === p.gif); if (!g) return;
  toast(`Mandando “${g.name}” para a telinha…`);
  const { bytes } = await window.sk.gifRead(g.id);
  await loadImage(new Blob([bytes], { type: g.type }), g.name, { id: g.id, fit: g.fit, speed: g.speed, bg: g.bg, crop: g.crop, range: g.range });
  await sendScreen();
}

// show what the keyboard screen has on the drawn TFT when the app opens (the last GIF sent)
async function restoreTft() {
  const list = await window.sk.gifList().catch(() => []);
  if (!list.length || scrAll.length) return;
  const g = list.find((x) => x.id === state.settings.lastGif) || [...list].filter((x) => x.lastSent).sort((a, b) => b.lastSent - a.lastSent)[0];
  if (!g) return;
  try {
    const { bytes } = await window.sk.gifRead(g.id);
    await loadImage(new Blob([bytes], { type: g.type }), g.name, { id: g.id, fit: g.fit, speed: g.speed, bg: g.bg, crop: g.crop, range: g.range });
    activeId = g.id;
  } catch (_) { /* missing file: leave the screen black */ }
}

// ====================== what's new ======================
// force = opened by hand (quick search): show the notes of this version, or the newest ones
async function whatsNew(force) {
  const info = await window.sk.appInfo().catch(() => null); if (!info) return;
  let v = info.version; const seen = state.settings.seenVersion;
  state.settings.seenVersion = v; persist();
  if (force) { if (!CHANGES[v]) v = Object.keys(CHANGES)[0]; }
  else if (!seen || seen === v || !CHANGES[v]) return;
  $('#newsTitle').textContent = `Novidades da versão ${v}`;
  $('#newsList').innerHTML = CHANGES[v].map((x) => `<li>${esc(x)}</li>`).join('');
  $('#newsModal').classList.add('show');
}

// ====================== settings UI ======================
function initAutoLight() {
  const s = state.settings;
  $('#alLock').checked = s.offOnLock; $('#alLock').onchange = (e) => { s.offOnLock = e.target.checked; persist(); };
  $('#alIdle').value = String(s.idleMin); $('#alIdle').onchange = (e) => { s.idleMin = +e.target.value; persist(); if (!s.idleMin && away && !locked) setAway(false); };
  initSchedule();
}

// ---- light by schedule: list of ranges ----
const ACTIONS = [['dim', 'Diminuir o brilho'], ['off', 'Apagar a luz'], ['profile', 'Usar um perfil']];
function schedSave() { persist(); scheduleRecheck(); schedStatus(); }
function schedStatus() {
  const s = state.settings.schedule, el = $('#ntNow'); if (!el) return;
  $('#ntBox').classList.toggle('off', !s.on);
  const hit = scheduleNow();
  $$('#ntList .sitem').forEach((r) => r.classList.toggle('now', !!hit && r.dataset.id === hit.id));
  if (!s.items.length) el.textContent = 'Nenhum horário ainda.';
  else if (!hit) el.textContent = 'Agora nenhum horário está valendo: a luz é a normal.';
  else el.textContent = `Valendo agora: das ${hit.from} às ${hit.to}.`;
}
function renderSchedule() {
  const s = state.settings.schedule, list = $('#ntList'); list.innerHTML = '';
  const profOpts = (sel) => state.profiles.map((p) => `<option value="${p.id}"${p.id === sel ? ' selected' : ''}>${esc(p.name)}</option>`).join('');
  s.items.forEach((it, i) => {
    const row = document.createElement('div');
    row.className = 'srow sitem'; row.dataset.id = it.id;
    row.innerHTML = `<span class="inline-ctl sched-time">das <input type="time" class="tm" data-k="from" aria-label="Começa às"> às <input type="time" class="tm" data-k="to" aria-label="Termina às"></span>
      <span class="inline-ctl sched-act"><select data-k="action" aria-label="O que fazer">${ACTIONS.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select>
      <select data-k="bright" class="sm" aria-label="Brilho" title="Brilho (0 é o mais fraco)">${[0, 1, 2, 3, 4].map((b) => `<option value="${b}">Brilho ${b}</option>`).join('')}</select>
      <select data-k="profile" aria-label="Perfil">${profOpts(it.profile)}</select></span>
      <button class="btn ghost small danger" data-k="del" title="Remover este horário" aria-label="Remover este horário">✕</button>`;
    const q = (k) => row.querySelector(`[data-k=${k}]`);
    q('from').value = it.from; q('to').value = it.to; q('action').value = it.action; q('bright').value = String(it.bright ?? 1);
    const showAct = () => { q('bright').style.display = it.action === 'dim' ? '' : 'none'; q('profile').style.display = it.action === 'profile' ? '' : 'none'; };
    showAct();
    q('from').onchange = (e) => { it.from = e.target.value || it.from; schedSave(); };
    q('to').onchange = (e) => { it.to = e.target.value || it.to; schedSave(); };
    q('action').onchange = (e) => { it.action = e.target.value; if (it.action === 'profile' && !prof(it.profile)) it.profile = state.profiles[0].id; q('profile').innerHTML = profOpts(it.profile); showAct(); schedSave(); };
    q('bright').onchange = (e) => { it.bright = +e.target.value; schedSave(); };
    q('profile').onchange = (e) => { it.profile = e.target.value; schedSave(); };
    q('del').onclick = () => { s.items.splice(i, 1); renderSchedule(); schedSave(); };
    list.appendChild(row);
  });
  schedStatus();
}
function initSchedule() {
  const s = state.settings.schedule;
  $('#ntOn').checked = s.on;
  $('#ntOn').onchange = (e) => { s.on = e.target.checked; if (s.on && !s.items.length) s.items.push({ id: uid(), from: '23:00', to: '07:00', action: 'dim', bright: 1, profile: null }); renderSchedule(); schedSave(); };
  $('#ntAdd').onclick = () => {
    const last = s.items[s.items.length - 1];
    s.items.push({ id: uid(), from: last ? last.to : '08:00', to: last ? last.from : '18:00', action: 'profile', bright: 1, profile: state.profiles[0].id });
    renderSchedule(); schedSave();
    const rows = $$('#ntList .sitem'); const r = rows[rows.length - 1];
    if (r) { r.classList.add('flash'); r.querySelector('input').focus(); }
  };
  renderSchedule();
  setInterval(schedStatus, 30000);
  onView.settings = renderSchedule; // profile names may have changed
}
function initIndicators() {
  const s = state.settings;
  $('#capsOn').checked = s.caps.on; $('#capsColor').value = s.caps.color;
  $('#capsOn').onchange = (e) => { s.caps.on = e.target.checked; persist(); refreshWatch(); capsLayer(capsOn); };
  $('#capsColor').oninput = (e) => { s.caps.color = e.target.value; persist(); };
  $('#msgOn').checked = s.msg.on; $('#msgColor').value = s.msg.color;
  $('#msgKey').innerHTML = '<option value="all">Teclado inteiro</option>' + LAYOUT.filter((k) => k.label !== 'Fn').map((k) => `<option value="${k.idx}">${esc(k.label || 'Espaço')}</option>`).join('');
  $('#msgKey').value = String(s.msg.key);
  const renderApps = () => {
    const box = $('#msgApps'); box.innerHTML = '';
    for (const a of s.msg.apps) {
      const c = document.createElement('button'); c.className = 'chip app'; c.innerHTML = `${esc(a)} <i>✕</i>`;
      c.onclick = () => { s.msg.apps = s.msg.apps.filter((x) => x !== a); delete unread[a]; persist(); renderApps(); refreshWatch(); onTitle(a, ''); };
      box.appendChild(c);
    }
  };
  renderApps();
  $('#msgOn').onchange = (e) => { s.msg.on = e.target.checked; persist(); refreshWatch(); if (!s.msg.on) { for (const k in unread) delete unread[k]; liveSet('msg', null); } renderMsgStatus(); };
  $('#msgColor').oninput = (e) => { s.msg.color = e.target.value; persist(); };
  $('#msgKey').onchange = (e) => { s.msg.key = e.target.value === 'all' ? 'all' : +e.target.value; persist(); };
  $('#msgAdd').onclick = () => {
    const v = $('#msgApp').value.trim().toLowerCase().replace(/\.exe$/, ''); if (!v) return;
    if (!s.msg.apps.includes(v)) s.msg.apps.push(v);
    $('#msgApp').value = ''; persist(); renderApps(); refreshWatch();
  };
  const showMsg = () => $('#msgBox').classList.toggle('off', !s.msg.on);
  showMsg(); $('#msgOn').addEventListener('change', showMsg);
  renderMsgStatus();
}
function initHotkeyUI() {
  $('#hkRec').onclick = () => { hkCapture = true; $('#hkText').textContent = 'Aperte o atalho…'; $('#hkStatus').textContent = 'Segure Ctrl, Alt ou Shift e aperte uma letra. Esc cancela.'; $('#hkRec').blur(); };
  $('#hkOff').onclick = () => { state.settings.hotkey = ''; persist(); applyHotkey(); };
  window.addEventListener('keydown', (e) => {
    if (!hkCapture) return;
    e.preventDefault(); e.stopPropagation();
    if (e.code === 'Escape') { hkCapture = false; applyHotkey(); return; }
    const acc = hotkeyFromEvent(e); if (!acc) return; // wait for a full combination
    hkCapture = false; state.settings.hotkey = acc; persist(); applyHotkey();
  }, true);
  applyHotkey();
}

function initExtras2() {
  settingsDefaults();
  initAutoLight(); initIndicators(); initHotkeyUI();
  // lock / idle / schedule
  window.sk.onAway((v, why) => { if (why === 'lock' || why === 'unlock') locked = v; setAway(v, why); });
  window.sk.onIdle(idleTick);
  setInterval(nightTick, 30000); nightTick();
  // hotkey + live inputs
  window.sk.onHotkey(nextProfile);
  window.sk.onCaps((on) => { capsOn = on; capsLayer(on); });
  window.sk.onTitle(onTitle);
  refreshWatch();
  // key tester
  window.addEventListener('keydown', (e) => testerKey(e, 'down'), true);
  window.addEventListener('keyup', (e) => testerKey(e, 'up'), true);
  $('#tReset').onclick = () => { tester.ok.clear(); tester.warn.clear(); tester.down.clear(); tester.count = {}; tester.lastUp = {}; tester.last = ''; renderTester(); };
  const prevGo = onView.tester;
  onView.tester = () => { if (prevGo) prevGo(); renderTester(); };
  // gallery + GIF per profile
  $('#galLoad').onclick = loadGallery;
  $('#galSend').onclick = () => window.sk.openUrl('https://github.com/Kinglucas962/sk80-studio/issues/new?template=perfil.md&title=Perfil%20para%20a%20galeria%3A%20');
  const prevProf = onView.profiles;
  onView.profiles = () => { prevProf && prevProf(); renderProfileGif(); if (!galleryList) loadGallery(); };
  $('#pGif').onchange = (e) => { const p = prof(editId); p.gif = e.target.value || null; persist(); };
  // what's new
  $('#newsClose').onclick = () => $('#newsModal').classList.remove('show');
  whatsNew();
  restoreTft();
}
window.SK_EXTRAS.push(initExtras2);
window.SK_whatsNew = whatsNew;
