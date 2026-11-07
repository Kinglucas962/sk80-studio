/* SK80 Studio — profiles, paint templates/gradients, macro library + import/export, Pomodoro, settings.
   Uses the globals defined in app.js (state, device, persist, LAYOUT, ...). */
const uid = () => Math.random().toString(36).slice(2, 10);
const clone = (o) => JSON.parse(JSON.stringify(o));
const rgb2hex = (c) => '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const hslHex = (h) => { const f = (n) => { const k = (n + h / 30) % 12; return 0.5 - 0.5 * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; return rgb2hex([f(0) * 255, f(8) * 255, f(4) * 255]); };
const byLabel = (...labels) => labels.flatMap((l) => LAYOUT.filter((k) => k.label === l).map((k) => k.idx));
// key centre, 0..1 over the drawn keyboard (same frame as the lighting preview)
const keyPos = Object.fromEntries(LAYOUT.map((k) => [k.idx, { x: (k.x + k.w / 2 - 72) / (728 - 72), y: (k.y + 14 - 22) / (280 - 22) }]));

function toast(text) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = text; t.classList.add('show');
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 2600);
}

// ====================== profiles ======================
const prof = (id) => state.profiles.find((p) => p.id === id);
const snapshot = () => clone({ light: state.light, paint: state.paint, paintBright: state.paintBright, paintActive: state.paintActive, keymap: state.keymap, macros: state.macros });
const storeActive = () => { const p = prof(state.activeProfile); if (p) p.data = snapshot(); };
let editId = null;

function ensureProfiles() {
  if (!state.profiles.length) {
    const p = { id: uid(), name: 'Padrão', apps: [], data: snapshot() };
    state.profiles.push(p); state.activeProfile = state.baseProfile = p.id; persist();
  }
  if (!prof(state.activeProfile)) state.activeProfile = state.profiles[0].id;
  if (!prof(state.baseProfile)) state.baseProfile = state.activeProfile;
  if (!prof(editId)) editId = state.activeProfile;
}

function applyData(d) {
  Object.assign(state.light, d.light || {});
  state.paint = d.paint || {}; state.paintBright = d.paintBright ?? 5; state.paintActive = !!d.paintActive;
  state.keymap = { top: {}, fn: {}, ...(d.keymap || {}) };
  state.macros = d.macros || []; state.macroSel = 0; state.selKey = null;
  syncLight(); lightWheel.set(state.light.color);
  $('#paintBright').value = state.paintBright; $('#paintBrightOut').textContent = state.paintBright;
  renderBoard(); renderPicker(); renderMacros();
}

function pushToKeyboard() {
  sendLight(); // lighting (respects lights-off / night dimming)
  return device(async () => {
    await window.sk.macros(state.macros.map((m) => ({ events: m.events, play: m.play })));
    await window.sk.keymap(keymapPayload('top'), 'top');
    await window.sk.keymap(keymapPayload('fn'), 'fn');
  });
}

let switchChain = Promise.resolve();
function switchProfile(id, manual) {
  switchChain = switchChain.then(async () => {
    const p = prof(id); if (!p) return;
    if (manual) state.baseProfile = id;
    if (id === state.activeProfile) { persist(); renderProfiles(); return; }
    storeActive();
    state.activeProfile = id;
    applyData(clone(p.data));
    persist(); renderProfiles(); updateTray();
    toast(`Perfil “${p.name}” ${manual ? 'ativado' : 'ativado sozinho'}`);
    await pushToKeyboard();
    if (manual) await sendProfileGif(p).catch(() => {});
  });
  return switchChain;
}

function profSummary(p) {
  const d = p.id === state.activeProfile ? snapshot() : p.data;
  const mode = d.paintActive ? 'Cor por tecla' : ((window.SK_MODES.find(([id]) => id === d.light.mode) || [0, '?'])[1]);
  const keys = Object.keys(d.keymap.top || {}).length + Object.keys(d.keymap.fn || {}).length;
  return `${mode} · ${keys} tecla(s) trocada(s) · ${d.macros.length} macro(s)`;
}

function renderProfiles() {
  ensureProfiles();
  const sel = $('#profSel');
  sel.innerHTML = state.profiles.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
  sel.value = state.activeProfile;
  const list = $('#pList'); list.innerHTML = '';
  for (const p of state.profiles) {
    const d = document.createElement('div');
    d.className = 'pitem' + (p.id === editId ? ' on' : '');
    d.innerHTML = `<div class="grow"><b></b><small>${esc(profSummary(p))}</small>${(p.apps || []).length ? `<small class="apps">⚡ ${esc(p.apps.join(', '))}</small>` : ''}</div>${p.id === state.activeProfile ? '<span class="badge">ativo</span>' : ''}`;
    $('b', d).textContent = p.name;
    d.onclick = () => { editId = p.id; renderProfiles(); };
    d.ondblclick = () => switchProfile(p.id, true);
    list.appendChild(d);
  }
  const p = prof(editId);
  if (document.activeElement !== $('#pName')) $('#pName').value = p.name;
  const active = p.id === state.activeProfile;
  $('#pActivate').disabled = active; $('#pActivate').textContent = active ? 'Em uso' : 'Usar este perfil';
  $('#pSummary').textContent = profSummary(p) + (active ? ' · o que você muda nas outras abas fica salvo neste perfil.' : '');
  $('#pDelete').disabled = state.profiles.length < 2;
  const apps = $('#pApps'); apps.innerHTML = '';
  if (!(p.apps || []).length) apps.innerHTML = '<span class="hint inline">Nenhum programa: este perfil só muda quando você escolher.</span>';
  for (const a of p.apps || []) {
    const c = document.createElement('button'); c.className = 'chip app';
    c.innerHTML = `${esc(a)} <i>✕</i>`; c.title = 'Remover';
    c.onclick = () => { p.apps = p.apps.filter((x) => x !== a); profilesChanged(); };
    apps.appendChild(c);
  }
}
function profilesChanged() { persist(); renderProfiles(); updateTray(); updateWatch(); }

function addApp(name) {
  name = String(name || '').trim().toLowerCase().replace(/\.exe$/, '');
  if (!name) return;
  if (name === 'electron') { toast('Esse é o próprio SK80 Studio'); return; }
  const p = prof(editId); p.apps = p.apps || [];
  for (const o of state.profiles) if (o !== p && (o.apps || []).includes(name)) { o.apps = o.apps.filter((x) => x !== name); toast(`“${name}” saiu do perfil “${o.name}”`); }
  if (!p.apps.includes(name)) p.apps.push(name);
  profilesChanged();
}
async function refreshAppList() {
  const sel = $('#pAppPick');
  sel.innerHTML = '<option value="">Carregando…</option>';
  const list = await window.sk.appList().catch(() => []);
  const seen = new Set();
  sel.innerHTML = '<option value="">Escolher um programa aberto…</option>' + list
    .filter((a) => a.name !== 'electron' && !seen.has(a.name) && seen.add(a.name))
    .map((a) => `<option value="${esc(a.name)}">${esc(a.name)} — ${esc(a.title.slice(0, 50))}</option>`).join('');
}

function exportProfile(p) {
  const data = p.id === state.activeProfile ? snapshot() : p.data;
  const text = JSON.stringify({ app: 'sk80-studio', kind: 'profile', version: 1, name: p.name, apps: p.apps || [], data }, null, 1);
  return window.sk.saveFile(p.name.replace(/[\\/:*?"<>|]/g, '_') + '.sk80perfil', text, 'sk80perfil').then((f) => f && toast('Perfil exportado'));
}
async function importProfile() {
  const text = await window.sk.openFile('sk80perfil').catch((e) => { toast('Não consegui abrir: ' + e.message); return null; });
  if (!text) return;
  let o; try { o = JSON.parse(text); } catch (_) { toast('Esse arquivo não é um perfil do SK80 Studio'); return; }
  if (o.kind !== 'profile' || !o.data || !o.data.light) { toast('Esse arquivo não é um perfil do SK80 Studio'); return; }
  const taken = new Set(state.profiles.flatMap((x) => x.apps || []));
  const p = { id: uid(), name: o.name || 'Importado', apps: (o.apps || []).filter((a) => !taken.has(a)), data: o.data };
  state.profiles.push(p); editId = p.id; profilesChanged();
  toast(`Perfil “${p.name}” importado. Clique em “Usar este perfil” para mandar ao teclado.`);
}

// automatic switching by foreground program
let fgTimer = null;
function updateWatch() { refreshWatch(); }
function onForeground(name) {
  clearTimeout(fgTimer);
  fgTimer = setTimeout(() => {
    if (!name || name === 'electron') return; // our own window: keep whatever is active
    const hit = state.profiles.find((p) => (p.apps || []).includes(name));
    const target = hit ? hit.id : (nightProfileId || state.baseProfile);
    if (target && target !== state.activeProfile) switchProfile(target, false);
  }, 1200);
}
function updateTray() {
  window.sk.setTray({ enabled: !!state.settings.tray, profiles: state.profiles.map((p) => ({ id: p.id, name: p.name })), active: state.activeProfile }).catch(() => {});
}

function initProfiles() {
  ensureProfiles();
  $('#profSel').onchange = (e) => switchProfile(e.target.value, true);
  $('#pNew').onclick = () => {
    storeActive();
    const p = { id: uid(), name: 'Perfil ' + (state.profiles.length + 1), apps: [], data: snapshot() };
    state.profiles.push(p); state.activeProfile = state.baseProfile = editId = p.id;
    profilesChanged(); $('#pName').focus(); $('#pName').select();
    toast('Perfil criado com as configurações atuais. O que você mudar agora fica nele.');
  };
  $('#pDup').onclick = () => {
    const s = prof(editId); const d = s.id === state.activeProfile ? snapshot() : clone(s.data);
    const p = { id: uid(), name: s.name + ' (cópia)', apps: [], data: d };
    state.profiles.push(p); editId = p.id; profilesChanged();
  };
  $('#pName').oninput = (e) => { prof(editId).name = e.target.value || 'Sem nome'; profilesChanged(); };
  $('#pActivate').onclick = () => switchProfile(editId, true);
  $('#pDelete').onclick = async () => {
    const p = prof(editId); if (state.profiles.length < 2 || !confirm(`Excluir o perfil “${p.name}”?`)) return;
    const wasActive = p.id === state.activeProfile;
    state.profiles = state.profiles.filter((x) => x !== p);
    editId = state.profiles[0].id;
    if (state.baseProfile === p.id) state.baseProfile = state.profiles[0].id;
    if (wasActive) { state.activeProfile = null; await switchProfile(state.profiles[0].id, true); }
    profilesChanged();
  };
  $('#pExport').onclick = () => exportProfile(prof(editId));
  $('#pImport').onclick = importProfile;
  $('#pAppRefresh').onclick = refreshAppList;
  $('#pAppPick').onchange = (e) => { addApp(e.target.value); e.target.value = ''; };
  $('#pAppAdd').onclick = () => { addApp($('#pAppName').value); $('#pAppName').value = ''; };
  $('#pAppName').onkeydown = (e) => { if (e.key === 'Enter') $('#pAppAdd').click(); };
  onView.profiles = () => { editId = editId || state.activeProfile; renderProfiles(); refreshAppList(); };
  window.sk.onForeground(onForeground);
  window.sk.onTrayProfile((id) => switchProfile(id, true));
  renderProfiles(); updateTray(); updateWatch();
}

// ====================== paint: templates + gradient ======================
const TEMPLATES = [
  ['WASD', byLabel('W', 'A', 'S', 'D')],
  ['Jogo (FPS)', [...byLabel('W', 'A', 'S', 'D', 'Q', 'E', 'R', 'F', 'G', '1', '2', '3', '4', '5', 'Tab', 'Esc'), 73, 91, 94]],
  ['Setas', byLabel('↑', '↓', '←', '→')],
  ['F1–F12', byLabel('F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12')],
  ['Números', byLabel('~', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=')],
  ['Letras', byLabel(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''))],
  ['Modificadores', byLabel('Shift', 'Ctrl', 'Alt', 'Win', 'Fn', 'Caps', 'Tab')],
  ['Navegação', byLabel('Ins', 'Del', 'PgUp', 'PgDn', '↑', '↓', '←', '→')],
  ['Esc + Enter + Backspace', byLabel('Esc', 'Enter', 'Backspace')],
];
const GRADS = [
  ['Pôr do sol', '#ff8a00', '#c2005f'], ['Oceano', '#00e5ff', '#1a3cff'], ['Neon', '#ff00d4', '#3d00ff'],
  ['Fogo', '#ffd000', '#ff1a00'], ['Floresta', '#c4ff3a', '#00804a'], ['Gelo', '#ffffff', '#0090ff'], ['Arco-íris', null, null],
];
let gradRainbow = false;
const paintChanged = () => { renderBoard(); persist(); savePaint(); };

function gradBar() {
  $('#gradBar').style.background = gradRainbow
    ? 'linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f)'
    : `linear-gradient(90deg, ${$('#gradA').value}, ${$('#gradB').value})`;
}
function applyGradient() {
  const dir = $('#gradDir .on').dataset.v, where = $('#gradWhere .on').dataset.v;
  const keys = LAYOUT.filter((k) => where === 'all' || state.paint[k.idx]).map((k) => k.idx);
  if (!keys.length) { toast('Nenhuma tecla pintada ainda'); return; }
  const raw = (i) => { const p = keyPos[i]; return dir === 'h' ? p.x : dir === 'v' ? p.y : dir === 'd' ? p.x + p.y * 0.6 : Math.hypot(p.x - 0.5, (p.y - 0.5) * 0.45); };
  const vals = keys.map(raw), lo = Math.min(...vals), hi = Math.max(...vals);
  const A = hex2rgb($('#gradA').value), B = hex2rgb($('#gradB').value);
  keys.forEach((i, n) => {
    const t = hi > lo ? (vals[n] - lo) / (hi - lo) : 0;
    state.paint[i] = gradRainbow ? hslHex(t * 300) : rgb2hex(A.map((a, c) => a + (B[c] - a) * t));
  });
  paintChanged();
}
function initPaintExtras() {
  const tl = $('#tplList');
  for (const [name, idxs] of TEMPLATES) {
    const b = document.createElement('button'); b.className = 'chip'; b.textContent = name;
    b.onclick = () => { if ($('#tplOnly').checked) state.paint = {}; for (const i of idxs) state.paint[i] = state.brush; paintChanged(); };
    b.onmouseenter = () => idxs.forEach((i) => $(`.key[data-idx="${i}"]`).classList.add('tplhi'));
    b.onmouseleave = () => $$('.key.tplhi').forEach((k) => k.classList.remove('tplhi'));
    tl.appendChild(b);
  }
  const gp = $('#gradPresets');
  for (const [name, a, b] of GRADS) {
    const c = document.createElement('button'); c.className = 'chip grad-chip';
    c.innerHTML = `<i style="background:${a ? `linear-gradient(90deg,${a},${b})` : 'linear-gradient(90deg,#f00,#ff0,#0f0,#0ff,#00f,#f0f)'}"></i>${name}`;
    c.onclick = () => { gradRainbow = !a; if (a) { $('#gradA').value = a; $('#gradB').value = b; } gradBar(); };
    gp.appendChild(c);
  }
  $('#gradA').oninput = $('#gradB').oninput = () => { gradRainbow = false; gradBar(); };
  for (const id of ['#gradDir', '#gradWhere']) $$(id + ' button').forEach((b) => (b.onclick = () => $$(id + ' button').forEach((x) => x.classList.toggle('on', x === b))));
  $('#gradApply').onclick = applyGradient;
  gradBar();
}

// ====================== macros: library + import/export ======================
const U = (code) => window.SK_CODES[code][0];
const D = (ms) => ({ kind: 'delay', ms });
function combo(...codes) {
  const ev = [];
  codes.forEach((c, i) => { if (i) ev.push(D(10)); ev.push({ kind: 'down', usage: U(c) }); });
  ev.push(D(30));
  [...codes].reverse().forEach((c, i) => { if (i) ev.push(D(10)); ev.push({ kind: 'up', usage: U(c) }); });
  return ev;
}
const seq = (...parts) => parts.flatMap((p, i) => (i ? [D(40), ...p] : p));
const MACRO_LIB = [
  ['Windows', [
    ['Bloquear o PC', 'Win + L', () => combo('MetaLeft', 'KeyL')],
    ['Mostrar a área de trabalho', 'Win + D', () => combo('MetaLeft', 'KeyD')],
    ['Abrir o Explorador', 'Win + E', () => combo('MetaLeft', 'KeyE')],
    ['Print de um pedaço da tela', 'Win + Shift + S', () => combo('MetaLeft', 'ShiftLeft', 'KeyS')],
    ['Gerenciador de Tarefas', 'Ctrl + Shift + Esc', () => combo('ControlLeft', 'ShiftLeft', 'Escape')],
    ['Configurações', 'Win + I', () => combo('MetaLeft', 'KeyI')],
    ['Emojis', 'Win + .', () => combo('MetaLeft', 'Period')],
    ['Histórico de copiados', 'Win + V', () => combo('MetaLeft', 'KeyV')],
    ['Fechar a janela', 'Alt + F4', () => combo('AltLeft', 'F4')],
  ]],
  ['Edição', [
    ['Copiar', 'Ctrl + C', () => combo('ControlLeft', 'KeyC')],
    ['Colar', 'Ctrl + V', () => combo('ControlLeft', 'KeyV')],
    ['Recortar', 'Ctrl + X', () => combo('ControlLeft', 'KeyX')],
    ['Desfazer', 'Ctrl + Z', () => combo('ControlLeft', 'KeyZ')],
    ['Refazer', 'Ctrl + Y', () => combo('ControlLeft', 'KeyY')],
    ['Salvar', 'Ctrl + S', () => combo('ControlLeft', 'KeyS')],
    ['Colar sem formatação', 'Ctrl + Shift + V', () => combo('ControlLeft', 'ShiftLeft', 'KeyV')],
    ['Selecionar tudo e copiar', 'Ctrl + A, Ctrl + C', () => seq(combo('ControlLeft', 'KeyA'), combo('ControlLeft', 'KeyC'))],
  ]],
  ['Navegador', [
    ['Nova aba', 'Ctrl + T', () => combo('ControlLeft', 'KeyT')],
    ['Reabrir aba fechada', 'Ctrl + Shift + T', () => combo('ControlLeft', 'ShiftLeft', 'KeyT')],
    ['Fechar aba', 'Ctrl + W', () => combo('ControlLeft', 'KeyW')],
    ['Janela anônima', 'Ctrl + Shift + N', () => combo('ControlLeft', 'ShiftLeft', 'KeyN')],
    ['Recarregar sem cache', 'Ctrl + Shift + R', () => combo('ControlLeft', 'ShiftLeft', 'KeyR')],
  ]],
  ['Jogos', [
    ['“gg” no chat', 'Enter, gg, Enter', () => seq(combo('Enter'), textToEvents('gg'), combo('Enter'))],
    ['“glhf” no chat', 'Enter, glhf, Enter', () => seq(combo('Enter'), textToEvents('glhf'), combo('Enter'))],
    ['Pulo agachado', 'Espaço + Ctrl segurado', () => [{ kind: 'down', usage: U('Space') }, D(60), { kind: 'down', usage: U('ControlLeft') }, D(500), { kind: 'up', usage: U('ControlLeft') }, D(10), { kind: 'up', usage: U('Space') }]],
  ]],
];
function renderMacroLib() {
  const body = $('#libBody'); body.innerHTML = '';
  for (const [group, items] of MACRO_LIB) {
    body.appendChild(Object.assign(document.createElement('div'), { className: 'group-t', textContent: group }));
    const g = document.createElement('div'); g.className = 'chips media';
    for (const [name, keys, make] of items) {
      const c = document.createElement('button'); c.className = 'chip big lib-item';
      c.innerHTML = `<span><b></b><small>${esc(keys)}</small></span>`; $('b', c).textContent = name;
      c.onclick = () => {
        stopRec();
        state.macros.push({ name, events: make(), play: { mode: 'once', times: 3 } });
        state.macroSel = state.macros.length - 1; macrosChanged();
        $('#libModal').classList.remove('show'); toast(`“${name}” adicionada. Escolha a tecla que dispara.`);
      };
      g.appendChild(c);
    }
    body.appendChild(g);
  }
}
function initMacroExtras() {
  $('#mLib').onclick = () => { renderMacroLib(); $('#libModal').classList.add('show'); };
  $('#libClose').onclick = () => $('#libModal').classList.remove('show');
  $('#libModal').onclick = (e) => { if (e.target.id === 'libModal') $('#libModal').classList.remove('show'); };
  $('#mExport').onclick = async () => {
    if (!state.macros.length) { toast('Nenhuma macro para exportar'); return; }
    const text = JSON.stringify({ app: 'sk80-studio', kind: 'macros', version: 1, macros: state.macros.map((m) => ({ name: m.name, events: m.events, play: m.play })) }, null, 1);
    const f = await window.sk.saveFile('macros.sk80macros', text, 'sk80macros'); if (f) toast(`${state.macros.length} macro(s) exportada(s)`);
  };
  $('#mImport').onclick = async () => {
    const text = await window.sk.openFile('sk80macros').catch(() => null); if (!text) return;
    let o; try { o = JSON.parse(text); } catch (_) { toast('Esse arquivo não é de macros do SK80 Studio'); return; }
    const list = (o.kind === 'macros' && o.macros) || (o.kind === 'profile' && o.data && o.data.macros);
    if (!Array.isArray(list)) { toast('Esse arquivo não é de macros do SK80 Studio'); return; }
    const ok = list.filter((m) => m && Array.isArray(m.events));
    ok.forEach((m) => state.macros.push({ name: m.name || 'Importada', events: m.events, play: m.play || { mode: 'once', times: 3 } }));
    state.macroSel = state.macros.length - 1; macrosChanged();
    toast(`${ok.length} macro(s) importada(s). Escolha as teclas que disparam.`);
  };
}

// ====================== Pomodoro (a layer of the live colours in extras2.js) ======================
const FROW = byLabel('F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12');
let pomo = null; // {phase, end, total, timer, lit, rgb}
const fmt = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));
function pomoSet(lit, rgb) { if (pomo) { pomo.lit = lit; pomo.rgb = rgb; } }
function pomoPhase(phase) {
  const min = phase === 'work' ? +$('#pomoWork').value || 25 : +$('#pomoBreak').value || 5;
  pomo = { ...pomo, phase, total: min * 60000, end: Date.now() + min * 60000, lit: -1 };
  $('#pomoPhase').textContent = phase === 'work' ? 'Foco' : 'Pausa';
  $('#pomoPhase').className = 'pomo-phase ' + phase;
}
async function pomoTick() {
  if (!pomo || pomo.flashing) return;
  const left = pomo.end - Date.now();
  $('#pomoTime').textContent = fmt(left);
  if (left <= 0) {
    pomo.flashing = true;
    for (let i = 0; i < 3 && pomo; i++) { // blink the F row to mark the change
      pomoSet(12, [255, 255, 255]); await sleepMs(400);
      if (!pomo) return;
      pomoSet(0, [0, 0, 0]); await sleepMs(400);
    }
    if (!pomo) return;
    pomo.flashing = false;
    pomoPhase(pomo.phase === 'work' ? 'break' : 'work');
    return pomoTick();
  }
  const lit = Math.ceil((12 * left) / pomo.total);
  if (lit !== pomo.lit) pomoSet(lit, pomo.phase === 'work' ? [255, 30, 30] : [30, 255, 90]);
}
function pomoStop() {
  if (!pomo) return;
  clearInterval(pomo.timer); pomo = null;
  $('#pomoPhase').textContent = 'Parado'; $('#pomoPhase').className = 'pomo-phase';
  $('#pomoTime').textContent = fmt((+$('#pomoWork').value || 25) * 60000);
  liveSet('pomo', null); // the live loop puts the saved lighting back when nothing else is on
}
function initPomodoro() {
  $('#pomoStart').onclick = () => {
    if (pomo) pomoStop();
    pomo = {}; pomoPhase('work'); pomoTick();
    pomo.timer = setInterval(pomoTick, 1000);
    liveSet('pomo', (map) => { if (pomo) FROW.forEach((idx, f) => { map[idx] = f < pomo.lit ? pomo.rgb : [0, 0, 0]; }); });
  };
  $('#pomoStop').onclick = pomoStop;
  $('#pomoWork').onchange = () => { if (!pomo) $('#pomoTime').textContent = fmt((+$('#pomoWork').value || 25) * 60000); };
}
// ====================== settings ======================
async function initSettings() {
  $('#setTray').checked = !!state.settings.tray;
  $('#setTray').onchange = (e) => { state.settings.tray = e.target.checked; persist(); updateTray(); };
  $('#setTest').checked = !!state.settings.testFrames;
  $('#setTest').onchange = (e) => {
    if (e.target.checked && !confirm('Ligar o modo teste da telinha?\n\nGIFs com mais de 33 quadros nunca foram testados neste teclado. Se travar, é só desconectar e conectar o cabo.')) { e.target.checked = false; return; }
    state.settings.testFrames = e.target.checked; persist();
    if (scrAll.length) { scrInfo(); playPreview(); }
  };
  $('#setAuto').checked = await window.sk.getAutostart().catch(() => false);
  $('#setAuto').onchange = async (e) => {
    await window.sk.setAutostart(e.target.checked).catch((x) => toast('Não consegui: ' + x.message));
    if (e.target.checked && !state.settings.tray) { state.settings.tray = true; $('#setTray').checked = true; persist(); updateTray(); }
  };
  initPomodoro();
  initUpdates();
}

// ====================== version + automatic updates ======================
// The sidebar card appears while an update downloads or is ready; a manual check also shows "procurando" / "em dia".
let updManual = false, updHideT = null, lastUpd = null;
function showUpdate(u) {
  lastUpd = u;
  const t = {
    dev: 'Rodando pelo código-fonte: a atualização automática só funciona no app instalado.',
    idle: '', checking: 'Procurando atualização…', latest: 'Você está na versão mais nova.',
    downloading: `Baixando a versão ${u.version || ''}… ${u.percent || 0}%`,
    ready: `Versão ${u.version} baixada. Ela entra quando você reiniciar o app.`,
    error: 'Não deu para procurar atualização agora' + (u.error ? ` (${u.error})` : '') + '. Confira a internet.',
  }[u.state] || '';
  $('#updText').textContent = t;
  $('#updInstall').style.display = u.state === 'ready' ? '' : 'none';
  $('#updCheck').disabled = u.state === 'dev' || u.state === 'checking' || u.state === 'downloading';

  // sidebar card
  const card = $('#updCard'), show = (title, sub, kind, pct) => {
    clearTimeout(updHideT);
    card.hidden = false; card.dataset.kind = kind;
    $('#updCardTitle').textContent = title; $('#updCardSub').textContent = sub;
    $('#updCardBar').style.width = (pct ?? 0) + '%';
    $('#updCardBtn').hidden = kind !== 'ready';
  };
  const hideLater = (ms) => { clearTimeout(updHideT); updHideT = setTimeout(() => { card.hidden = true; }, ms); };
  if (u.state === 'downloading') show(`Baixando a versão ${u.version || 'nova'}`, `${u.percent || 0}% · pode continuar usando`, 'down', u.percent || 0);
  else if (u.state === 'ready') { show(`Versão ${u.version} pronta`, 'Entra quando você reiniciar o app.', 'ready', 100); if (!showUpdate.toasted) { showUpdate.toasted = true; toast(`Atualização ${u.version} pronta`); } }
  else if (updManual && u.state === 'checking') show('Procurando atualização…', 'Só um instante.', 'check', 0);
  else if (updManual && u.state === 'latest') { show('Tudo em dia', 'Você já tem a versão mais nova.', 'ok', 100); updManual = false; hideLater(3500); }
  else if (updManual && u.state === 'error') { show('Sem conexão com o GitHub', 'Confira a internet e tente de novo.', 'err', 0); updManual = false; hideLater(5000); }
  else if (!updManual) card.hidden = true;
}
function checkNow() {
  if (lastUpd && lastUpd.state === 'dev') { toast('A atualização automática só funciona no app instalado.'); return; }
  if (lastUpd && (lastUpd.state === 'downloading' || lastUpd.state === 'ready')) return;
  updManual = true; showUpdate({ ...(lastUpd || {}), state: 'checking' });
  window.sk.checkUpdate();
}
async function initUpdates() {
  const info = await window.sk.appInfo().catch(() => null);
  if (info) { $('#appVer').textContent = 'Versão ' + info.version; $('#railVerText').textContent = 'Versão ' + info.version; showUpdate(info.update); }
  window.sk.onUpdate(showUpdate);
  window.sk.onUpdateCheckManual(checkNow);
  window.sk.onUpdateInstalling((v) => {
    $('#updOverTitle').textContent = v ? `Atualizando para a versão ${v}…` : 'Atualizando…';
    $('#updOver').classList.add('show');
  });
  $('#updCheck').onclick = checkNow;
  $('#railVer').onclick = checkNow;
  $('#updInstall').onclick = () => window.sk.installUpdate();
  $('#updCardBtn').onclick = () => window.sk.installUpdate();
}
window.SK_EXTRAS = [initProfiles, initPaintExtras, initMacroExtras, initSettings];
