/* SK80 Studio — renderer */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const LAYOUT = window.SK_LAYOUT;
const byIdx = Object.fromEntries(LAYOUT.map((k) => [k.idx, k]));
// 33 frames = 248 pages, the most verified so far. The old driver says the keyboard takes up to 255 frames,
// but uploads above 255 pages use a guessed header byte, so they are only allowed in "modo teste" (Ajustes).
const SAFE_FRAMES = 33, DRIVER_MAX_FRAMES = 255;
const maxFrames = () => (state.settings.testFrames ? DRIVER_MAX_FRAMES : SAFE_FRAMES);
const MACRO_MEM = 4096; // rough budget shown in the UI; the real limit is unknown

const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const state = {
  view: 'light',
  light: { mode: 1, color: '#ff2a2a', random: false, brightness: 5, speed: 3, direction: 0 },
  paint: {}, paintBright: 5, tool: 'brush', brush: '#00e5ff',
  keymap: { top: {}, fn: {} },
  layer: 'top', selKey: null,
  macros: [], macroSel: 0,
  paintActive: false,                 // true when the keyboard is showing the per-key colours
  profiles: [], activeProfile: null, baseProfile: null,
  settings: { tray: false, testFrames: false },
};

// ---------- sync indicator + device writes ----------
let pending = 0, syncErr = null;
function setSync() {
  const el = $('#sync');
  el.className = 'sync ' + (syncErr ? 'err' : pending ? 'busy' : 'ok');
  $('#syncText').textContent = syncErr ? 'Erro: ' + syncErr : pending ? 'Salvando no teclado…' : 'Tudo salvo no teclado';
}
async function device(fn) {
  pending++; setSync();
  try { await fn(); syncErr = null; return true; } catch (e) { syncErr = e.message; return false; } finally { pending--; setSync(); }
}
const persist = debounce(() => window.sk.setStore({
  light: state.light, paint: state.paint, paintBright: state.paintBright, brush: state.brush,
  keymap: state.keymap, macros: state.macros, paintActive: state.paintActive,
  profiles: state.profiles, activeProfile: state.activeProfile, baseProfile: state.baseProfile, settings: state.settings,
}), 300);

function setAccent(hex) {
  const c = hex2rgb(hex);
  const lum = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  document.documentElement.style.setProperty('--accent', hex);
  document.documentElement.style.setProperty('--accent-ink', lum > 150 ? '#111' : '#fff');
}

// ---------- keyboard drawing ----------
const SCALE = 1.06, OX = 72, OY = 22, PAD = 22;
let sim;
function buildBoard() {
  const b = $('#board');
  const W = 728 - OX, H = 280 - OY;
  for (const k of LAYOUT) {
    const el = document.createElement('div');
    el.className = 'key'; el.dataset.idx = k.idx;
    Object.assign(el.style, { left: PAD + (k.x - OX) * SCALE + 'px', top: PAD + (k.y - OY) * SCALE + 'px', width: k.w * SCALE + 'px', height: k.h * SCALE + 'px' });
    b.appendChild(el);
  }
  // physical rows: Esc row 0 … space row 5 (the arrow cluster sits a little lower but belongs to rows 4/5)
  const rowOf = (y) => [29, 79, 120, 159, 200, 241].reduce((best, ry, i, a) => (Math.abs(y - ry) < Math.abs(y - a[best]) ? i : best), 0);
  sim = new window.LightSim(LAYOUT.map((k) => ({ idx: k.idx, cx: (k.x + k.w / 2 - OX) / W, cy: (k.y + 14 - OY) / H, row: rowOf(k.y) })));
  const tft = $('#tft');
  Object.assign(tft.style, { left: PAD + (652 - OX) * SCALE + 'px', top: PAD + (24 - OY) * SCALE + 'px', width: 76 * SCALE + 'px', height: 46 * SCALE + 'px' });
  b.style.width = PAD * 2 + W * SCALE + 'px';
  b.style.height = PAD * 2 + H * SCALE + 'px';

  // paint: click paints one key; click-and-drag keeps painting every key the mouse passes over
  let dragTool = null, dragDone = new Set();
  window.addEventListener('mouseup', () => { dragTool = null; dragDone.clear(); });
  b.addEventListener('mouseover', (e) => {
    if (!dragTool || state.view !== 'paint') return;
    const el = e.target.closest('.key'); if (!el) return;
    const idx = +el.dataset.idx;
    if (dragDone.has(idx)) return;
    dragDone.add(idx); paintKey(idx, dragTool);
  });
  b.addEventListener('mousedown', (e) => {
    const el = e.target.closest('.key'); if (!el) return;
    const idx = +el.dataset.idx;
    if (state.view === 'paint') {
      const tool = e.button === 2 ? 'erase' : state.tool;
      if (tool !== 'pick') { dragTool = tool; dragDone = new Set([idx]); }
      e.preventDefault();
      paintKey(idx, tool);
    }
    else if (state.view === 'keys') selectKey(idx);
    else if (state.view === 'light') sim.press(idx, performance.now() / 1000);
  });
  b.addEventListener('mouseover', (e) => {
    const el = e.target.closest('.key');
    if (el && state.view === 'light') sim.press(+el.dataset.idx, performance.now() / 1000);
  });
  b.addEventListener('contextmenu', (e) => e.preventDefault());
}

function renderBoard() {
  for (const el of $$('.key')) {
    const idx = +el.dataset.idx, k = byIdx[idx];
    if (state.view === 'paint') {
      const c = state.paint[idx];
      el.style.setProperty('--glow', c || 'transparent'); el.style.setProperty('--ga', c ? .85 : 0); el.classList.toggle('light-ink', !!c && (() => { const q = hex2rgb(c); return 0.2126 * q[0] + 0.7152 * q[1] + 0.0722 * q[2] > 150; })()); el.style.setProperty('--halo', c ? c + '99' : 'transparent');
    } else if (state.view !== 'light') { el.classList.remove('light-ink'); el.style.setProperty('--ga', 0); el.style.setProperty('--halo', 'transparent'); }
    const m = state.keymap[state.layer][idx];
    const showMap = state.view === 'keys' && m && m.type !== 0;
    el.classList.toggle('mapped', !!showMap);
    el.classList.toggle('sel', state.view === 'keys' && state.selKey === idx);
    let label = esc(k.label);
    if (showMap) label = m.type === 3 && window.SK_ICONS[m.a | (m.b << 8)] ? window.SK_ICON(m.a | (m.b << 8), 15) : esc(m.label);
    el.innerHTML = `<span>${label}</span>${showMap ? '<i class="tag">●</i>' : ''}`;
  }
}

// lighting preview animation
function animate() {
  if (state.view === 'light') {
    const l = state.light;
    const colors = sim.frame(performance.now() / 1000, { mode: l.mode, rgb: hex2rgb(l.color), random: l.random, speed: l.speed, brightness: l.brightness, direction: l.direction });
    for (const el of $$('.key')) {
      const c = colors[+el.dataset.idx] || [0, 0, 0];
      const mx = Math.max(c[0], c[1], c[2]), a = mx / 255;
      if (a < 0.03) { el.style.setProperty('--ga', 0); el.style.setProperty('--halo', 'transparent'); continue; }
      const pure = `rgb(${(c[0] * 255 / mx) | 0},${(c[1] * 255 / mx) | 0},${(c[2] * 255 / mx) | 0})`;
      el.style.setProperty('--glow', pure);
      el.style.setProperty('--ga', (0.2 + 0.75 * a).toFixed(2));
      el.style.setProperty('--halo', `rgba(${(c[0] * 255 / mx) | 0},${(c[1] * 255 / mx) | 0},${(c[2] * 255 / mx) | 0},${(a * 0.7).toFixed(2)})`);
    }
  }
  requestAnimationFrame(animate);
}

// ---------- navigation ----------
const VIEWS = {
  light: ['Iluminação', 'Escolha o efeito e veja a prévia animada aqui em cima. Muda no teclado na hora.'],
  paint: ['Cor por tecla', 'Clique numa tecla, ou clique e arraste, para pintar. Vai direto para o teclado.'],
  keys: ['Teclas', 'Troque o que cada tecla faz. Salva sozinho.'],
  macros: ['Macros', 'Grave sequências de teclas e escolha como elas tocam.'],
  screen: ['Telinha', 'Mande GIFs e imagens para a tela do teclado. Tudo fica guardado.'],
  profiles: ['Perfis', 'Cada perfil guarda luz, cores, teclas e macros. Troque com um clique ou deixe trocar sozinho por programa.'],
  settings: ['Ajustes', 'Luz automática, atalhos, indicadores, Pomodoro e opções do aplicativo.'],
  tester: ['Testar teclas', 'Aperte cada tecla do teclado. As que funcionam ficam verdes; clique duplo fica vermelho.'],
};
const NO_BOARD = ['macros', 'screen', 'profiles', 'settings'];
const onView = {}; // view name -> callback when it opens (filled by extras.js)
function go(v) {
  stopRec();
  state.view = v;
  $$('.nav').forEach((n) => n.classList.toggle('active', n.dataset.view === v));
  $$('.view').forEach((n) => n.classList.toggle('active', n.id === 'view-' + v));
  $('#viewTitle').textContent = VIEWS[v][0]; $('#viewSub').textContent = VIEWS[v][1];
  $('#boardWrap').style.display = NO_BOARD.includes(v) ? 'none' : '';
  $('#board').classList.toggle('painting', v === 'paint');
  $('#board').classList.toggle('testing', v === 'tester');
  if (v === 'screen') renderLibrary();
  if (onView[v]) onView[v]();
  renderBoard();
}

// ---------- lighting ----------
let lightWheel;
const applyLight = debounce(() => {
  const l = state.light; const [r, g, b] = hex2rgb(l.color);
  state.paintActive = false;
  device(() => window.sk.lighting({ mode: l.mode, r, g, b, random: l.random, brightness: l.brightness, speed: l.speed, direction: l.direction }));
  persist();
}, 140);
function initLight() {
  const box = $('#modes');
  for (const [id, name] of window.SK_MODES) {
    const b = document.createElement('button'); b.className = 'mode'; b.textContent = name; b.dataset.id = id;
    b.onclick = () => { state.light.mode = id; syncLight(); applyLight(); };
    box.appendChild(b);
  }
  lightWheel = new window.ColorWheel($('#lightWheel'), { size: 150,
    value: state.light.color,
    onInput: (c) => { state.light.color = c; state.light.random = false; syncLight(); applyLight(); },
  });
  $('#lightRandom').onchange = (e) => { state.light.random = e.target.checked; syncLight(); applyLight(); };
  $('#lightBright').oninput = (e) => { state.light.brightness = +e.target.value; syncLight(); applyLight(); };
  $('#lightSpeed').oninput = (e) => { state.light.speed = +e.target.value; syncLight(); applyLight(); };
}
function renderDirs() {
  const l = state.light, dirs = window.SK_DIRS[l.mode];
  const box = $('#lightDir'); box.innerHTML = '';
  $('#dirRow').classList.toggle('disabled', !dirs);
  if (!dirs) { box.innerHTML = '<span class="hint inline">Este efeito não tem direção</span>'; return; }
  if (!dirs.some(([, v]) => v === l.direction)) l.direction = dirs[0][1];
  for (const [label, v] of dirs) {
    const b = document.createElement('button'); b.textContent = label; b.classList.toggle('on', v === l.direction);
    b.onclick = () => { state.light.direction = v; syncLight(); applyLight(); };
    box.appendChild(b);
  }
}
function syncLight() {
  const l = state.light;
  $$('.mode').forEach((m) => m.classList.toggle('on', +m.dataset.id === l.mode));
  $('#lightRandom').checked = l.random;
  $('#lightBright').value = l.brightness; $('#lightBrightOut').textContent = l.brightness;
  $('#lightSpeed').value = l.speed; $('#lightSpeedOut').textContent = l.speed;
  renderDirs();
  setAccent(l.random ? '#9b4dff' : l.color);
}

// ---------- per-key paint (click only, auto-save) ----------
const savePaint = debounce(() => {
  const colors = {}; for (const [i, c] of Object.entries(state.paint)) colors[i] = hex2rgb(c);
  state.paintActive = true;
  device(async () => { await window.sk.customColors(colors, { brightness: state.paintBright }); persist(); });
}, 250);
let paintWheel;
function paintKey(idx, tool) {
  if (tool === 'pick') {
    const c = state.paint[idx]; if (c) { state.brush = c; paintWheel.set(c); }
    setTool('brush'); return;
  }
  if (tool === 'erase') delete state.paint[idx]; else state.paint[idx] = state.brush;
  const el = $(`.key[data-idx="${idx}"]`); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  renderBoard(); persist(); savePaint();
}
function setTool(t) { state.tool = t; $$('.tool').forEach((b) => b.classList.toggle('on', b.dataset.tool === t)); $('#board').dataset.tool = t; }
function initPaint() {
  paintWheel = new window.ColorWheel($('#paintWheel'), { value: state.brush, onInput: (c) => { state.brush = c; if (state.tool !== 'brush') setTool('brush'); persist(); } });
  $$('.tool').forEach((b) => (b.onclick = () => setTool(b.dataset.tool)));
  $('#paintAll').onclick = () => { for (const k of LAYOUT) state.paint[k.idx] = state.brush; renderBoard(); persist(); savePaint(); };
  $('#paintClear').onclick = () => { state.paint = {}; renderBoard(); persist(); savePaint(); };
  $('#paintBright').value = state.paintBright; $('#paintBrightOut').textContent = state.paintBright;
  $('#paintBright').oninput = (e) => { state.paintBright = +e.target.value; $('#paintBrightOut').textContent = state.paintBright; persist(); savePaint(); };
  setTool('brush');
}

// ---------- key remap (auto-save) ----------
let pickTab = 'default';
const MOD_BITS = [[1, 'Ctrl'], [2, 'Shift'], [4, 'Alt'], [8, 'Win']];
function keymapPayload(layer) {
  const out = {};
  for (const [i, m] of Object.entries(state.keymap[layer])) {
    if (m.type === 6) { const mac = state.macros[m.a]; out[i] = { type: 6, a: m.a, play: (mac && mac.play) || { mode: 'once', times: 1 } }; continue; }
    out[i] = { type: m.type, a: m.a || 0, b: m.b || 0, c: m.c || 0 };
  }
  return out;
}
const saveKeys = {
  top: debounce(() => device(() => window.sk.keymap(keymapPayload('top'), 'top')), 250),
  fn: debounce(() => device(() => window.sk.keymap(keymapPayload('fn'), 'fn')), 250),
};
function selectKey(idx) {
  if (byIdx[idx].label === 'Fn') { syncErr = null; toastHint('A tecla Fn não pode ser trocada'); return; }
  state.selKey = idx;
  const m = state.keymap[state.layer][idx];
  pickTab = !m ? 'default' : ({ 0: 'default', 1: 'mouse', 2: m.b === 0 ? 'off' : 'key', 3: 'media', 6: 'macro' }[m.type] || 'default');
  renderPicker(); renderBoard();
}
function toastHint(t) { $('#keySel').textContent = t; }
function setMap(v, layer = state.layer, idx = state.selKey) {
  if (idx == null) return;
  if (v) state.keymap[layer][idx] = v; else delete state.keymap[layer][idx];
  persist(); saveKeys[layer](); renderPicker(); renderBoard();
}
function renderPicker() {
  const k = state.selKey != null ? byIdx[state.selKey] : null;
  const cur = k ? state.keymap[state.layer][k.idx] : null;
  $('#keySel').innerHTML = k ? `Tecla <b>${esc(k.label || 'Espaço')}</b> → ${cur ? `<b>${esc(cur.label)}</b>` : 'função padrão'}` : 'Escolha uma tecla no desenho acima.';
  $$('#pickTabs button').forEach((b) => b.classList.toggle('on', b.dataset.t === pickTab));
  const body = $('#pickBody'); body.innerHTML = '';
  const chip = (html, on, cb, cls = '') => { const c = document.createElement('button'); c.className = 'chip ' + cls + (on ? ' on' : ''); c.innerHTML = html; c.onclick = cb; return c; };
  if (!k) { body.innerHTML = '<p class="hint">Clique em qualquer tecla do teclado desenhado lá em cima.</p>'; return; }

  if (pickTab === 'default') {
    body.innerHTML = '<p class="hint">A tecla volta a fazer o que fazia de fábrica.</p>';
    body.appendChild(chip('Usar função padrão', !cur, () => setMap(null)));
  } else if (pickTab === 'off') {
    body.innerHTML = '<p class="hint">A tecla não faz nada quando apertada.</p>';
    body.appendChild(chip('Desativar esta tecla', cur && cur.type === 2 && cur.b === 0, () => setMap({ type: 2, a: 0, b: 0, label: '✕' })));
  } else if (pickTab === 'key') {
    const mods = document.createElement('div'); mods.className = 'mods';
    const curMods = cur && cur.type === 2 ? cur.a : 0;
    for (const [bit, name] of MOD_BITS) {
      const l = document.createElement('label');
      l.innerHTML = `<input type="checkbox" ${curMods & bit ? 'checked' : ''} data-bit="${bit}"> ${name}`;
      mods.appendChild(l);
    }
    body.appendChild(Object.assign(document.createElement('div'), { className: 'group-t', textContent: 'Segurar junto (atalho)' }));
    body.appendChild(mods);
    for (const [title, codes] of window.SK_KEY_GROUPS) {
      body.appendChild(Object.assign(document.createElement('div'), { className: 'group-t', textContent: title }));
      const g = document.createElement('div'); g.className = 'chips';
      for (const code of codes.split(' ')) {
        const [usage, label] = window.SK_CODES[code];
        g.appendChild(chip(esc(label), cur && cur.type === 2 && cur.b === usage, () => {
          const a = $$('input', mods).reduce((s, i) => s | (i.checked ? +i.dataset.bit : 0), 0);
          const pre = MOD_BITS.filter(([bit]) => a & bit).map(([, n]) => n + '+').join('');
          setMap({ type: 2, a, b: usage, label: pre + label });
        }));
      }
      body.appendChild(g);
    }
  } else if (pickTab === 'media') {
    const g = document.createElement('div'); g.className = 'chips media';
    for (const [u, name] of window.SK_MEDIA) {
      g.appendChild(chip(`${window.SK_ICON(u, 22)}<span>${name}</span>`, cur && cur.type === 3 && (cur.a | (cur.b << 8)) === u, () => setMap({ type: 3, a: u & 0xff, b: u >> 8, label: name }), 'big'));
    }
    body.appendChild(g);
  } else if (pickTab === 'mouse') {
    body.innerHTML = '<p class="hint">Experimental: o código do mouse foi deduzido, teste depois de escolher.</p>';
    const g = document.createElement('div'); g.className = 'chips media';
    for (const [bit, name] of window.SK_MOUSE) g.appendChild(chip(`${window.SK_ICON('mouse1', 22)}<span>${name}</span>`, cur && cur.type === 1 && cur.a === bit, () => setMap({ type: 1, a: bit, label: name }), 'big'));
    body.appendChild(g);
  } else if (pickTab === 'macro') {
    if (!state.macros.length) { body.innerHTML = '<p class="hint">Você ainda não tem macros. Crie uma na aba Macros.</p>'; return; }
    const g = document.createElement('div'); g.className = 'chips';
    state.macros.forEach((m, i) => g.appendChild(chip('⟳ ' + esc(m.name), cur && cur.type === 6 && cur.a === i, () => setMap({ type: 6, a: i, label: '⟳ ' + m.name }))));
    body.appendChild(g);
  }
}
function initKeys() {
  $$('#layerSeg button').forEach((b) => (b.onclick = () => {
    state.layer = b.dataset.v; $$('#layerSeg button').forEach((x) => x.classList.toggle('on', x === b));
    renderPicker(); renderBoard();
  }));
  $$('#pickTabs button').forEach((b) => (b.onclick = () => { pickTab = b.dataset.t; renderPicker(); }));
  $('#keysReset').onclick = () => { state.keymap[state.layer] = {}; persist(); saveKeys[state.layer](); renderPicker(); renderBoard(); };
  renderPicker();
}

// ---------- macros ----------
const saveMacros = debounce(() => device(async () => {
  await window.sk.macros(state.macros.map((m) => ({ events: m.events, play: m.play })));
  await window.sk.keymap(keymapPayload('top'), 'top');
  await window.sk.keymap(keymapPayload('fn'), 'fn');
}), 700);
function macrosChanged(render = true) { persist(); saveMacros(); if (render) renderMacros(); }

let recording = false, lastT = 0, held = new Set();
const evLabel = (u) => window.SK_USAGE_LABEL[u] || '0x' + u.toString(16);
const curMacro = () => state.macros[state.macroSel];
function keyOfMacro(i) {
  for (const layer of ['top', 'fn']) for (const [k, m] of Object.entries(state.keymap[layer])) if (m.type === 6 && m.a === i) return { layer, idx: +k };
  return null;
}
function renderMacros() {
  const list = $('#mlist'); list.innerHTML = '';
  if (!state.macros.length) list.innerHTML = '<p class="hint">Nenhuma macro ainda.</p>';
  state.macros.forEach((m, i) => {
    const k = keyOfMacro(i);
    const d = document.createElement('div'); d.className = 'mitem' + (i === state.macroSel ? ' on' : '');
    d.innerHTML = `<div><b></b><small>${m.events.filter((e) => e.kind === 'down').length} teclas</small></div>${k ? `<span class="badge">${k.layer === 'fn' ? 'Fn+' : ''}${esc(byIdx[k.idx].label || 'Espaço')}</span>` : ''}`;
    $('b', d).textContent = m.name;
    d.onclick = () => { stopRec(); state.macroSel = i; renderMacros(); };
    list.appendChild(d);
  });
  const m = curMacro();
  $('#mEditor').classList.toggle('disabled', !m);
  const bytes = 400 + state.macros.reduce((s, x) => s + 8 + x.events.length * 4, 0);
  $('#mSize').textContent = `Memória: ${bytes} bytes`;
  $('#memFill').style.width = Math.min(100, (100 * bytes) / MACRO_MEM) + '%';
  if (!m) { $('#mEvents').innerHTML = '<div class="empty">Crie uma macro em “+ Nova”.</div>'; return; }

  if (document.activeElement !== $('#mName')) $('#mName').value = m.name;
  m.play = m.play || { mode: 'once', times: 3 };
  $$('#mPlay button').forEach((b) => b.classList.toggle('on', b.dataset.v === m.play.mode));
  if (m.play.mode === 'hold') m.play.mode = 'once';
  $('#mTimesWrap').style.display = m.play.mode === 'times' ? '' : 'none';
  $('#mPlayHint').textContent = { once: 'Um toque na tecla = a macro roda uma vez.', times: 'Um toque na tecla = a macro roda o número de vezes escolhido.', toggle: 'Um toque liga a repetição sem parar; outro toque na mesma tecla desliga.' }[m.play.mode];
  $('#mTimes').value = m.play.times || 3;
  const k = keyOfMacro(state.macroSel);
  $('#mKey').value = k && k.layer === 'top' ? String(k.idx) : '';

  const box = $('#mEvents'); box.innerHTML = '';
  if (!m.events.length) box.innerHTML = '<div class="empty">Clique em <b>Gravar</b> e aperte as teclas, ou use + Tecla / + Texto.</div>';
  m.events.forEach((e, j) => {
    const d = document.createElement('div'); d.className = 'tl ' + e.kind;
    if (e.kind === 'delay') d.innerHTML = `<i>⏱</i><span>Pausa de</span><input type="number" min="1" max="60000" value="${e.ms}"><span>ms</span>`;
    else d.innerHTML = `<i>${e.kind === 'down' ? '↓' : '↑'}</i><span>${e.kind === 'down' ? 'Aperta' : 'Solta'}</span><kbd>${esc(evLabel(e.usage))}</kbd>`;
    d.insertAdjacentHTML('beforeend', '<div class="grow"></div><button data-a="up" title="Subir">▲</button><button data-a="down" title="Descer">▼</button><button data-a="del" title="Remover">✕</button>');
    if (e.kind === 'delay') $('input', d).onchange = (x) => { e.ms = Math.max(1, Math.min(60000, +x.target.value || 1)); macrosChanged(false); renderDur(); };
    $$('button', d).forEach((b) => (b.onclick = () => {
      const a = b.dataset.a;
      if (a === 'del') m.events.splice(j, 1);
      else { const t = a === 'up' ? j - 1 : j + 1; if (t < 0 || t >= m.events.length) return; [m.events[j], m.events[t]] = [m.events[t], m.events[j]]; }
      macrosChanged();
    }));
    box.appendChild(d);
  });
  if (recording) box.scrollTop = box.scrollHeight;
  renderDur();
}
function renderDur() {
  const m = curMacro(); if (!m) return;
  const ms = m.events.reduce((s, e) => s + (e.kind === 'delay' ? e.ms : 0), 0);
  $('#mDur').textContent = `${m.events.length} eventos · duração ${(ms / 1000).toFixed(2)} s`;
}
function stopRec() {
  if (!recording) return;
  recording = false; $('#mRec').classList.remove('on'); $('#mRecText').textContent = 'Gravar';
  const m = curMacro();
  if (m) { for (const u of held) m.events.push({ kind: 'delay', ms: 10 }, { kind: 'up', usage: u }); held.clear(); macrosChanged(); }
}
const delayMode = () => $('#mDelayMode .on').dataset.v;
function pushEvent(m, ev) {
  if (m.events.length) {
    const now = performance.now();
    const ms = delayMode() === 'real' ? Math.max(1, Math.round(now - lastT)) : Math.max(1, +$('#mFixed').value || 20);
    m.events.push({ kind: 'delay', ms });
  }
  lastT = performance.now();
  m.events.push(ev);
}
let capturingKey = false;
function onKey(e, kind) {
  if (capturingKey) {
    e.preventDefault(); e.stopPropagation();
    if (kind !== 'down') return;
    capturingKey = false; $('#keyModal').classList.remove('show');
    if (e.code === 'Escape') return;
    const c = window.SK_CODES[e.code]; if (!c) return;
    const m = curMacro(); if (m.events.length) m.events.push({ kind: 'delay', ms: 20 });
    m.events.push({ kind: 'down', usage: c[0] }, { kind: 'delay', ms: 20 }, { kind: 'up', usage: c[0] });
    macrosChanged(); return;
  }
  if (!recording) return;
  e.preventDefault(); e.stopPropagation();
  const c = window.SK_CODES[e.code]; if (!c || e.repeat) return;
  if (kind === 'down') held.add(c[0]); else { if (!held.has(c[0])) return; held.delete(c[0]); }
  pushEvent(curMacro(), { kind, usage: c[0] });
  renderMacros(); persist();
}
function textToEvents(text) {
  const out = [];
  const shiftMap = { '!': 'Digit1', '@': 'Digit2', '#': 'Digit3', '$': 'Digit4', '%': 'Digit5', '^': 'Digit6', '&': 'Digit7', '*': 'Digit8', '(': 'Digit9', ')': 'Digit0', '_': 'Minus', '+': 'Equal', '{': 'BracketLeft', '}': 'BracketRight', '|': 'Backslash', ':': 'Semicolon', '"': 'Quote', '<': 'Comma', '>': 'Period', '?': 'Slash', '~': 'Backquote' };
  const plain = { ' ': 'Space', '-': 'Minus', '=': 'Equal', '[': 'BracketLeft', ']': 'BracketRight', '\\': 'Backslash', ';': 'Semicolon', "'": 'Quote', ',': 'Comma', '.': 'Period', '/': 'Slash', '`': 'Backquote', '\n': 'Enter' };
  const tap = (code, shift) => {
    const u = window.SK_CODES[code][0];
    if (out.length) out.push({ kind: 'delay', ms: 10 });
    if (shift) out.push({ kind: 'down', usage: 0xe1 }, { kind: 'delay', ms: 5 });
    out.push({ kind: 'down', usage: u }, { kind: 'delay', ms: 10 }, { kind: 'up', usage: u });
    if (shift) out.push({ kind: 'delay', ms: 5 }, { kind: 'up', usage: 0xe1 });
  };
  for (const ch of text) {
    if (/[a-z]/.test(ch)) tap('Key' + ch.toUpperCase(), false);
    else if (/[A-Z]/.test(ch)) tap('Key' + ch, true);
    else if (/[0-9]/.test(ch)) tap('Digit' + ch, false);
    else if (plain[ch]) tap(plain[ch], false);
    else if (shiftMap[ch]) tap(shiftMap[ch], true);
  }
  return out;
}
function initMacros() {
  const sel = $('#mKey');
  sel.innerHTML = '<option value="">— nenhuma —</option>' + LAYOUT.filter((k) => k.label !== 'Fn').map((k) => `<option value="${k.idx}">${esc(k.label || 'Espaço')}</option>`).join('');
  sel.onchange = () => {
    const i = state.macroSel, old = keyOfMacro(i);
    if (old) delete state.keymap[old.layer][old.idx];
    if (sel.value) state.keymap.top[sel.value] = { type: 6, a: i, label: '⟳ ' + curMacro().name };
    macrosChanged();
  };
  $('#mNew').onclick = () => { stopRec(); state.macros.push({ name: 'Macro ' + (state.macros.length + 1), events: [], play: { mode: 'once', times: 3 } }); state.macroSel = state.macros.length - 1; macrosChanged(); $('#mName').focus(); $('#mName').select(); };
  $('#mDup').onclick = () => { const m = curMacro(); state.macros.push(JSON.parse(JSON.stringify({ ...m, name: m.name + ' (cópia)' }))); state.macroSel = state.macros.length - 1; macrosChanged(); };
  $('#mName').oninput = (e) => {
    const m = curMacro(); m.name = e.target.value || 'Sem nome';
    for (const layer of ['top', 'fn']) for (const km of Object.values(state.keymap[layer])) if (km.type === 6 && km.a === state.macroSel) km.label = '⟳ ' + m.name;
    persist(); renderMacros();
  };
  $('#mDelete').onclick = () => {
    const i = state.macroSel; state.macros.splice(i, 1);
    for (const layer of ['top', 'fn']) for (const [k, m] of Object.entries(state.keymap[layer])) {
      if (m.type === 6 && m.a === i) delete state.keymap[layer][k]; else if (m.type === 6 && m.a > i) m.a--;
    }
    state.macroSel = Math.max(0, i - 1); macrosChanged();
  };
  $$('#mPlay button').forEach((b) => (b.onclick = () => { curMacro().play.mode = b.dataset.v; macrosChanged(); }));
  $('#mTimes').onchange = (e) => { curMacro().play.times = Math.max(1, Math.min(255, +e.target.value || 1)); macrosChanged(); };
  $$('#mDelayMode button').forEach((b) => (b.onclick = () => { $$('#mDelayMode button').forEach((x) => x.classList.toggle('on', x === b)); $('#mFixedWrap').style.display = b.dataset.v === 'fixed' ? '' : 'none'; }));
  $('#mFixedWrap').style.display = 'none';
  $('#mRec').onclick = () => {
    if (recording) return stopRec();
    recording = true; held.clear(); lastT = performance.now();
    $('#mRec').classList.add('on'); $('#mRecText').textContent = 'Parar gravação'; $('#mRec').blur();
  };
  window.addEventListener('keydown', (e) => onKey(e, 'down'), true);
  window.addEventListener('keyup', (e) => onKey(e, 'up'), true);
  $('#mAddKey').onclick = () => { stopRec(); capturingKey = true; $('#keyModal').classList.add('show'); };
  $('#keyModal').onclick = () => { capturingKey = false; $('#keyModal').classList.remove('show'); };
  $('#mAddText').onclick = () => { $('#mTextRow').classList.toggle('show'); $('#mText').focus(); };
  const addText = () => {
    const ev = textToEvents($('#mText').value); if (!ev.length) return;
    const m = curMacro(); if (m.events.length) m.events.push({ kind: 'delay', ms: 10 });
    m.events.push(...ev); $('#mText').value = ''; $('#mTextRow').classList.remove('show'); macrosChanged();
  };
  $('#mTextOk').onclick = addText;
  $('#mText').onkeydown = (e) => { if (e.key === 'Enter') addText(); };
  $('#mAddDelay').onclick = () => { curMacro().events.push({ kind: 'delay', ms: 100 }); macrosChanged(); };
  $('#mClear').onclick = () => { stopRec(); curMacro().events = []; macrosChanged(); };
  renderMacros();
}

// ---------- screen + library ----------
let scrAll = [], scrSource = null; // scrAll: every decoded frame; scrSource: {blob, name, type, id?}
let fit = 'cover', anim;
let crop = { zoom: 1, x: 0, y: 0 };      // "Ajuste livre": zoom over the cover size + pan in screen pixels
let range = [0, 0];                       // first/last frame used
const DECODE_MAX = 600;
const PAGE_MS = 135;
const pagesFor = (n) => Math.ceil((256 + n * 160 * 96 * 2) / 4096);

// frames that will actually be sent: the chosen range, thinned out to the frame limit (total time kept)
function scrFrames() {
  const sel = scrAll.slice(range[0], range[1] + 1);
  const max = maxFrames();
  if (sel.length <= max) return sel;
  const step = sel.length / max, total = sel.reduce((s, f) => s + f.ms, 0);
  return Array.from({ length: max }, (_, i) => sel[Math.floor(i * step)]).map((f) => ({ ...f, ms: total / max }));
}
function scrInfo() {
  if (!scrAll.length) return;
  const sel = range[1] - range[0] + 1, out = scrFrames().length, pages = pagesFor(out);
  const secs = Math.round((pages * PAGE_MS) / 1000);
  let t = `${sel} quadro(s) escolhido(s)`;
  if (out < sel) t += ` → reduzido para ${out}`;
  t += ` · envio leva uns ${secs < 60 ? secs + ' s' : Math.floor(secs / 60) + ' min ' + (secs % 60) + ' s'}`;
  if (out > SAFE_FRAMES) t += ' · modo teste';
  $('#scrInfo').textContent = t;
}
function renderRange() {
  const n = scrAll.length, box = $('#rangeRow');
  box.style.display = n > 1 ? '' : 'none';
  if (n <= 1) return;
  for (const [id, v] of [['#scrFrom', range[0]], ['#scrTo', range[1]]]) { const el = $(id); el.max = n; el.value = v + 1; }
  $('#scrFromOut').textContent = range[0] + 1; $('#scrToOut').textContent = range[1] + 1;
  scrInfo();
}
async function loadImage(blob, name, opts = {}) {
  scrAll = [];
  const type = blob.type || 'image/gif';
  let cut = false;
  if (type === 'image/gif' && 'ImageDecoder' in window) {
    const dec = new ImageDecoder({ data: await blob.arrayBuffer(), type });
    await dec.tracks.ready;
    const n = dec.tracks.selectedTrack.frameCount;
    cut = n > DECODE_MAX;
    for (let i = 0; i < Math.min(n, DECODE_MAX); i++) {
      const { image } = await dec.decode({ frameIndex: i });
      scrAll.push({ bitmap: await createImageBitmap(image), ms: Math.max(20, (image.duration || 100000) / 1000) });
      image.close();
    }
  } else scrAll.push({ bitmap: await createImageBitmap(blob), ms: 1000 });
  range = opts.range && opts.range[1] < scrAll.length ? [...opts.range] : [0, scrAll.length - 1];
  crop = opts.crop ? { ...opts.crop } : { zoom: 1, x: 0, y: 0 };
  scrSource = { blob, name, type, id: opts.id };
  setFit(opts.fit || fit);
  if (opts.speed) { $('#scrSpeed').value = opts.speed; $('#scrSpeedOut').textContent = opts.speed + '×'; }
  if (opts.bg) $('#scrBg').value = opts.bg;
  $('#scrTitle').textContent = name + (cut ? ` (só os primeiros ${DECODE_MAX} quadros)` : '');
  $('#scrSend').disabled = false;
  renderRange(); scrInfo();
  playPreview(); renderLibrary();
}
function setFit(v) {
  fit = v; $$('#fitSeg button').forEach((x) => x.classList.toggle('on', x.dataset.v === v));
  $('#cropRow').style.display = v === 'free' ? '' : 'none';
  $('#cropZoom').value = crop.zoom; $('#cropZoomOut').textContent = crop.zoom.toFixed(1) + '×';
  $('#scrPreview').classList.toggle('pan', v === 'free');
}
function drawFrame(ctx, bmp) {
  ctx.fillStyle = $('#scrBg').value; ctx.fillRect(0, 0, 160, 96);
  const w = bmp.width, h = bmp.height;
  let dw = 160, dh = 96, ox = 0, oy = 0;
  if (fit !== 'stretch') {
    const s = fit === 'contain' ? Math.min(160 / w, 96 / h) : Math.max(160 / w, 96 / h) * (fit === 'free' ? crop.zoom : 1);
    dw = w * s; dh = h * s;
  }
  if (fit === 'free') { ox = crop.x; oy = crop.y; }
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bmp, (160 - dw) / 2 + ox, (96 - dh) / 2 + oy, dw, dh);
}
function playPreview() {
  clearTimeout(anim);
  const ctxs = [$('#scrPreview').getContext('2d'), $('#tftCanvas').getContext('2d')];
  const frames = scrFrames();
  let i = 0;
  const step = () => {
    if (!frames.length) return;
    const f = frames[i % frames.length];
    ctxs.forEach((c) => drawFrame(c, f.bitmap));
    i++; anim = setTimeout(step, f.ms / +$('#scrSpeed').value);
  };
  step();
}
function toRGB565(ctx) {
  const d = ctx.getImageData(0, 0, 160, 96).data;
  const out = new Uint8Array(160 * 96 * 2);
  for (let p = 0, o = 0; p < d.length; p += 4, o += 2) {
    const v = ((d[p] >> 3) << 11) | ((d[p + 1] >> 2) << 5) | (d[p + 2] >> 3);
    out[o] = v & 0xff; out[o + 1] = v >> 8;
  }
  return out;
}
let sending = false;
async function sendScreen() {
  const list = scrFrames();
  if (sending || !list.length) return;
  if (list.length > SAFE_FRAMES && !confirm(`Modo teste: ${list.length} quadros (${pagesFor(list.length)} páginas).\n\nIsso passa do que já foi testado (${SAFE_FRAMES} quadros). Se a telinha travar ou o teclado parar de digitar, desconecte e conecte o cabo de novo.\n\nEnviar mesmo assim?`)) return;
  sending = true;
  const c = document.createElement('canvas'); c.width = 160; c.height = 96; const ctx = c.getContext('2d', { willReadFrequently: true });
  const frames = [], delays = [], speed = +$('#scrSpeed').value;
  for (const f of list) { drawFrame(ctx, f.bitmap); frames.push(toRGB565(ctx)); delays.push(Math.round(f.ms / speed / 2)); }
  $('#scrSend').disabled = true; $('#scrSend').textContent = 'Enviando… não desconecte o teclado';
  const ok = await device(() => window.sk.screen(frames, delays));
  if (ok && scrSource) {
    const g = await window.sk.gifSave({ name: scrSource.name, type: scrSource.type, fit, speed: +$('#scrSpeed').value, bg: $('#scrBg').value, crop, range, sent: true }, new Uint8Array(await scrSource.blob.arrayBuffer()));
    scrSource.id = g.id; activeId = g.id;
    state.settings.lastGif = g.id; persist(); // what the screen is showing now (used by "GIF por perfil")
  }
  $('#scrSend').disabled = false; $('#scrSend').textContent = 'Enviar para a telinha';
  setTimeout(() => ($('#scrProg div').style.width = '0'), 1200);
  sending = false;
  renderLibrary();
}
let activeId = null;
const thumbs = {};
async function renderLibrary() {
  const list = await window.sk.gifList().catch(() => []);
  $('#libCount').textContent = list.length ? `${list.length} salvo(s)` : '';
  const grid = $('#libGrid'); grid.innerHTML = '';
  if (!list.length) { grid.innerHTML = '<p class="hint">Os GIFs que você enviar aparecem aqui.</p>'; return; }
  for (const g of list) {
    if (!thumbs[g.id]) {
      const { bytes } = await window.sk.gifRead(g.id);
      thumbs[g.id] = URL.createObjectURL(new Blob([bytes], { type: g.type || 'image/gif' }));
    }
    const d = document.createElement('div');
    d.className = 'gcard' + (scrSource && scrSource.id === g.id ? ' on' : '') + (activeId === g.id ? ' live' : '');
    d.innerHTML = `<div class="gimg" style="--fit:${g.fit === 'contain' ? 'contain' : g.fit === 'stretch' ? 'fill' : 'cover'};background:${g.bg || '#000'}"><img src="${thumbs[g.id]}"></div>
      <div class="gmeta"><b></b>${activeId === g.id ? '<small class="live">na telinha</small>' : ''}</div>
      <div class="gact"><button class="btn small primary" data-a="send">Enviar</button><button class="btn small ghost" data-a="ren">Renomear</button><button class="btn small ghost danger" data-a="del">✕</button></div>`;
    $('b', d).textContent = g.name;
    const load = async () => { const { bytes } = await window.sk.gifRead(g.id); await loadImage(new Blob([bytes], { type: g.type }), g.name, { id: g.id, fit: g.fit, speed: g.speed, bg: g.bg, crop: g.crop, range: g.range }); };
    $('.gimg', d).onclick = load;
    $('[data-a=send]', d).onclick = async () => { await load(); sendScreen(); };
    $('[data-a=ren]', d).onclick = async () => {
      const b = $('b', d); b.contentEditable = 'true'; b.focus(); document.getSelection().selectAllChildren(b);
      b.onblur = async () => { b.contentEditable = 'false'; await window.sk.gifRename(g.id, b.textContent.trim() || g.name); };
      b.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); b.blur(); } };
    };
    $('[data-a=del]', d).onclick = async () => {
      if (!confirm(`Apagar "${g.name}" da biblioteca?`)) return;
      await window.sk.gifDelete(g.id); URL.revokeObjectURL(thumbs[g.id]); delete thumbs[g.id]; renderLibrary();
    };
    grid.appendChild(d);
  }
}
function initScreen() {
  const drop = $('#drop');
  const open = (f) => f && loadImage(f, f.name.replace(/\.[^.]+$/, '')).catch((x) => { syncErr = 'não consegui abrir o arquivo: ' + x.message; setSync(); });
  drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); open(e.dataTransfer.files[0]); };
  $('#scrFile').onchange = (e) => open(e.target.files[0]);
  $$('#fitSeg button').forEach((b) => (b.onclick = () => { setFit(b.dataset.v); playPreview(); }));
  // free framing: drag the picture in the big preview, wheel or slider to zoom
  const pv = $('#scrPreview');
  let dragFrom = null;
  pv.addEventListener('mousedown', (e) => {
    if (!scrAll.length) return;
    if (fit !== 'free') setFit('free');
    dragFrom = { x: e.clientX, y: e.clientY, cx: crop.x, cy: crop.y }; e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragFrom) return;
    const k = 160 / pv.clientWidth;
    crop.x = dragFrom.cx + (e.clientX - dragFrom.x) * k; crop.y = dragFrom.cy + (e.clientY - dragFrom.y) * k;
    playPreview();
  });
  window.addEventListener('mouseup', () => { dragFrom = null; });
  const setZoom = (z) => { crop.zoom = Math.max(0.3, Math.min(5, z)); $('#cropZoom').value = crop.zoom; $('#cropZoomOut').textContent = crop.zoom.toFixed(1) + '×'; playPreview(); };
  pv.addEventListener('wheel', (e) => { if (!scrAll.length) return; e.preventDefault(); if (fit !== 'free') setFit('free'); setZoom(crop.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)); }, { passive: false });
  $('#cropZoom').oninput = (e) => setZoom(+e.target.value);
  $('#cropReset').onclick = () => { crop = { zoom: 1, x: 0, y: 0 }; setZoom(1); };
  const onRange = () => {
    let a = +$('#scrFrom').value - 1, b = +$('#scrTo').value - 1;
    if (a > b) { if (document.activeElement === $('#scrFrom')) b = a; else a = b; }
    range = [a, b]; renderRange(); playPreview();
  };
  $('#scrFrom').oninput = onRange; $('#scrTo').oninput = onRange;
  $('#scrSpeed').oninput = (e) => { $('#scrSpeedOut').textContent = e.target.value + '×'; };
  $('#scrBg').oninput = () => playPreview();
  window.sk.onScreenProgress((i, n) => { $('#scrProg div').style.width = (100 * i / n) + '%'; });
  $('#scrSend').onclick = sendScreen;
}

// ---------- connection ----------
async function pollConn() {
  let on = false; try { on = await window.sk.status(); } catch (_) {}
  $('#conn').classList.toggle('on', on);
  $('#connText').textContent = on ? 'Womier SK80 conectado' : 'Teclado não encontrado';
}

// ---------- boot ----------
(async function boot() {
  const store = await window.sk.getStore().catch(() => ({}));
  // extras.js loads after this file; wait for it before initialising
  if (document.readyState === 'loading') await new Promise((r) => document.addEventListener('DOMContentLoaded', r));
  if (store.light) Object.assign(state.light, store.light);
  state.paintActive = !!store.paintActive;
  if (state.light.mode === 0x80) { state.light.mode = 1; state.paintActive = true; } // older saves
  if (store.profiles) state.profiles = store.profiles;
  if (store.activeProfile) state.activeProfile = store.activeProfile;
  if (store.baseProfile) state.baseProfile = store.baseProfile;
  if (store.settings) Object.assign(state.settings, store.settings);
  if (store.paint) state.paint = store.paint;
  if (store.paintBright != null) state.paintBright = store.paintBright;
  if (store.brush) state.brush = store.brush;
  if (store.keymap) state.keymap = { top: {}, fn: {}, ...store.keymap };
  if (store.macros) state.macros = store.macros.map((m) => ({ play: { mode: 'once', times: 3 }, ...m }));
  buildBoard(); initLight(); initPaint(); initKeys(); initMacros(); initScreen();
  for (const f of window.SK_EXTRAS || []) f();
  $$('.nav').forEach((n) => (n.onclick = () => go(n.dataset.view)));
  syncLight(); go('light'); setSync();
  requestAnimationFrame(animate);
  pollConn(); setInterval(pollConn, 2500);
})();
