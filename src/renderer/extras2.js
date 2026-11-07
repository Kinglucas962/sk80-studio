/* SK80 Studio 1.0.1 — automatic light (lock / idle / schedule), global profile hotkey, live layer
   (Caps Lock, message alert, Pomodoro), key tester, community gallery, GIF per profile, "what's new".
   Uses globals from app.js and extras.js. */
const CHANGES = {
  '1.4.1': [
    'Aviso de mensagem com uma cor para cada programa: clique na bolinha ao lado do nome (WhatsApp verde, Discord azul...). Com dois programas esperando, o teclado pisca uma cor de cada vez.',
    'Ao atualizar pulando versões, esta janela mostra tudo o que mudou desde a versão que você tinha.',
  ],
  '1.4.0': [
    'Luz por horário com nascer e pôr do sol: escolha a sua cidade em Ajustes. Um horário que começa no pôr do sol e diminui o brilho escurece aos poucos, durante uma hora.',
    'Efeito novo “Digitação” (Iluminação › Efeitos do app): quanto mais rápido você digita, mais quente e forte fica a cor. Nada do que você digita é guardado.',
    'Mais 8 jogos em Cor por tecla › Jogos: Roblox, GTA V, Apex Legends, Overwatch 2, Rocket League, Terraria, Valheim e Rust.',
    'Aviso de mensagem: o Discord é reconhecido em mais casos, e Ajustes mostra o texto que o app lê na barra de tarefas.',
  ],
  '1.3.0': [
    'Trocar de efeito sozinho (Iluminação): o teclado passa pelos efeitos que você marcar, de 1 minuto a 1 hora.',
    'Luz por jogo (Cor por tecla › Jogos): Minecraft, CS2, Valorant, Fortnite e League of Legends acendem só as teclas que o jogo usa. Dá para criar um perfil que entra sozinho quando o jogo abrir.',
  ],
  '1.2.1': [
    'As letras do teclado desenhado ficam legíveis em qualquer cor: brancas nas cores fortes, escuras nas claras, nos dois temas.',
  ],
  '1.2.0': [
    '13 efeitos novos na Iluminação, em “Efeitos do app”: Fogo, Aurora, Matrix, Estrelas, Batimento, Sirene, Oceano, Lava, Plasma, Cometa, Tempestade, Vagalumes e Confete. Eles funcionam com o app aberto.',
    'Os efeitos tocados pelo app (e os Efeitos próprios) ficaram bem mais lisos no teclado: cerca de 3 vezes mais quadros por segundo.',
    'A tela da Iluminação cabe inteira em tela cheia: o teclado desenhado não some mais quando você escolhe um efeito.',
    'Efeitos próprios: os modelos prontos saíram; ficou o botão “Novo efeito”.',
  ],
  '1.1.9': [
    'Degradê com mais direções: da direita para a esquerda, de baixo para cima, as quatro diagonais e das bordas para o centro.',
  ],
  '1.1.8': [
    'A prévia do Inclinado ficou igual ao teclado: várias faixas na diagonal, uma atrás da outra. A cópia para Efeitos próprios também.',
    'O destaque do menu não fica mais por cima do aviso de atualização: o botão “Reiniciar e atualizar” aparece certinho.',
  ],
  '1.1.7': [
    '“Copiar para Efeitos próprios” agora grava a volta inteira de efeitos que começam apagados, como o Inclinado. Se você copiou antes e ficou quase tudo apagado, copie de novo.',
  ],
  '1.1.6': [
    'Aviso de mensagem: escolha o programa numa lista dos programas abertos, sem precisar digitar o nome.',
    'A cor e o botão de ligar das luzes de aviso não ficam mais um em cima do outro.',
  ],
  '1.1.5': [
    'Aviso de mensagem agora funciona com o WhatsApp novo e com o Discord: o app lê o número que aparece no ícone da barra de tarefas.',
  ],
  '1.1.4': [
    'Em Iluminação, “Copiar para Efeitos próprios” transforma o efeito escolhido em quadros que você pode editar. Com Cor por tecla ativa, suas cores viram o primeiro quadro.',
    'Galeria: cada conta do GitHub pode mandar até 5 perfis.',
  ],
  '1.1.3': [
    'Efeitos próprios ganharam conta-gotas: clique numa tecla para pegar a cor dela.',
    'Atalho Alt + clique numa tecla pega a cor, em Efeitos próprios e em Cor por tecla.',
  ],
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
  cycle: { on: false, min: 5, modes: [100, 101, 102, 103, 106, 107, 108, 109, 111] }, // automatic effect change
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
  if (nightItem && nightItem.action === 'dim') return { bright: dimNow(nightItem) };
  return null;
}
// a range that starts at sunset dims slowly: one brightness step at a time over its first hour
const FADE_MIN = 60;
function dimNow(it) {
  if (it.from !== 'sunset') return it.bright;
  const now = new Date(), since = ((now.getHours() * 60 + now.getMinutes() - toMin(it.from)) % 1440 + 1440) % 1440;
  if (since >= FADE_MIN) return it.bright;
  const base = state.paintActive ? state.paintBright : state.light.brightness;
  return Math.round(base + (Math.min(base, it.bright) - base) * (since / FADE_MIN));
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
      await window.sk.lighting(fwLight(state.light, br ?? state.light.brightness));
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
// ---- sunrise / sunset (NOAA's simple formula, no internet; good to a few minutes) ----
// returns minutes after local midnight, or null where the sun doesn't rise or set that day
function sunMinutes(kind, date = new Date()) {
  const { lat, lon } = state.settings.sun || {};
  if (lat == null || lon == null) return null;
  const rad = Math.PI / 180;
  const day = Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 86400000);
  const g = (2 * Math.PI / 365) * (day - 1 + 0.5);
  const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const c = Math.cos(90.833 * rad) / (Math.cos(lat * rad) * Math.cos(decl)) - Math.tan(lat * rad) * Math.tan(decl);
  if (c < -1 || c > 1) return null;
  const ha = Math.acos(c) / rad;
  const utc = 720 - 4 * (lon + (kind === 'sunrise' ? ha : -ha)) - eq;
  return Math.round((((utc - date.getTimezoneOffset()) % 1440) + 1440) % 1440);
}
const SUN_NAME = { sunrise: 'nascer do sol', sunset: 'pôr do sol' };
const hhmm = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
const toMin = (v) => {
  if (SUN_NAME[v]) { const m = sunMinutes(v); return m == null ? (v === 'sunrise' ? 360 : 1080) : m; } // no city: 06:00 / 18:00
  const [h, m] = String(v || '0:0').split(':').map(Number); return h * 60 + (m || 0);
};
const timeText = (v) => (SUN_NAME[v] ? `${SUN_NAME[v]} (${hhmm(toMin(v))})` : v);
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
  if (key === nightKey) { if (hit && hit.action === 'dim') overrideChanged(); return; } // slow sunset dimming moves on its own
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
    // an app effect is the base picture: overlays (Caps Lock, message alert, volume...) go on top of it
    if (Live.layers.appfx) Live.layers.appfx(map, t);
    for (const [name, fn] of Object.entries(Live.layers)) if (name !== 'appfx') fn(map, t);
    const entries = Object.entries(map).map(([i, c]) => [+i, ...c.map((v) => Math.max(0, Math.min(255, Math.round(v))))]);
    try { await window.sk.previewColors(entries); if (syncErr) { syncErr = null; setSync(); } }
    catch (e) { syncErr = e.message; setSync(); await sleepMs(1000); }
    // app effects need smooth motion: next frame right away (one frame takes ~50 ms to send); the other
    // layers (Caps Lock, alerts, volume) barely move and keep the old pace
    await sleepMs(Live.layers.appfx || Live.layers.fx ? 5 : 95);
  }
  Live.running = false;
  sendLight(); // back to the saved lighting (or off)
}

// App effects (Fogo, Aurora... ids 100+): the keyboard has no such mode, so the app streams every key
// while one is chosen and the per-key colours aren't in use. Checked often so profiles, backups, the
// schedule and anything else that changes state.light is picked up without hooking each one.
let appFxOn = false, appSim = null;
function appFxSync() {
  if (typeof sim === 'undefined' || !sim) return; // the drawn board isn't built yet
  const want = !state.paintActive && window.SK_isAppMode(state.light.mode);
  if (want === appFxOn) return;
  appFxOn = want;
  if (!want) { liveSet('appfx', null); return; }
  appSim = new window.LightSim(sim.keys);
  liveSet('appfx', (map, t) => {
    const l = state.light, o = lightOverride();
    const k = (o && o.bright != null ? o.bright : l.brightness) / 5;
    const c = appSim.frame(t, { mode: l.mode, rgb: hex2rgb(l.color), random: l.random, speed: l.speed, brightness: 5, direction: 0, rate: window.SK_typeRate ? window.SK_typeRate() : 0 });
    for (const key of LAYOUT) map[key.idx] = (c[key.idx] || [0, 0, 0]).map((v) => v * k);
  });
}
window.appFxSync = appFxSync;
window.SK_appSim = () => appSim; // real key presses go to it (extras3 typing)
setInterval(appFxSync, 500);

// Caps Lock
const CAPS_IDX = 55;
function capsLayer(on) {
  liveSet('caps', on && state.settings.caps.on ? (map) => { map[CAPS_IDX] = hex2rgb(state.settings.caps.color); } : null);
}
let capsOn = false;

// message alert: unread counters from the window title ("(3) WhatsApp") or the taskbar button
// (Discord: "Atenção solicitada, 1 notifications"); the bigger of the two wins
const unread = {}, fromTitle = {}, fromBadge = {};
// colour per app (settings.msg.colors); known apps start with their brand-like colour, others with the old single colour
const MSG_DEFAULT_COLORS = { whatsapp: '#25d366', discord: '#3d5bff', telegram: '#22a6ee', instagram: '#ff2d8a', slack: '#ffb000', teams: '#6b5bff', messenger: '#0a84ff' };
const msgColor = (app) => (state.settings.msg.colors || {})[app] || MSG_DEFAULT_COLORS[app] || state.settings.msg.color;
function titleCount(t) { const m = String(t || '').match(/[(\[](\d+)[)\]]/); return m ? +m[1] : 0; }
function onBadge(name, n) { fromBadge[name] = n; onTitle(name, null); }
function onTitle(name, title) {
  if (title !== null) fromTitle[name] = titleCount(title);
  unread[name] = Math.max(fromTitle[name] || 0, fromBadge[name] || 0);
  const any = state.settings.msg.on && Object.values(unread).some((n) => n > 0);
  liveSet('msg', any ? (map, t) => {
    // each app blinks in its own colour; with several apps waiting, one colour per blink, taking turns
    const waiting = state.settings.msg.apps.filter((a) => unread[a] > 0);
    const app = waiting[Math.floor(t) % Math.max(1, waiting.length)];
    const c = (t % 1) < 0.5 ? hex2rgb(msgColor(app)) : [0, 0, 0];
    if (state.settings.msg.key === 'all') for (const k of LAYOUT) map[k.idx] = c; else map[state.settings.msg.key] = c;
  } : null);
  renderMsgStatus();
}
// what each app's taskbar button says (Discord: "No Notifications", "1 notifications"...), shown so a PC
// where the alert misbehaves can tell us its exact wording
const badgeRaw = {};
function renderMsgStatus() {
  const s = Object.entries(unread).filter(([, n]) => n > 0).map(([a, n]) => `${a}: ${n}`).join(' · ');
  const el = $('#msgStatus'); if (el) el.textContent = state.settings.msg.on ? (s ? 'Não lidas → ' + s : 'Nenhuma mensagem nova nesses programas agora.') : '';
  const raw = $('#msgRaw'); if (!raw) return;
  const r = Object.entries(badgeRaw).filter(([a, t]) => t && state.settings.msg.apps.includes(a)).map(([a, t]) => `${a}: “${t}”`).join(' · ');
  raw.textContent = state.settings.msg.on && r ? 'Texto na barra de tarefas → ' + r : '';
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
  const v = info.version, seen = state.settings.seenVersion;
  state.settings.seenVersion = v; persist();
  // every version newer than the last one this person saw, up to the installed one (0.5 → 1.4 shows them all).
  // No seenVersion but saved settings = came from a version older than this window: show everything.
  const cmp = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); return 0; };
  let list;
  if (force) list = [CHANGES[v] ? v : Object.keys(CHANGES)[0]];
  else {
    if (seen === v || (!seen && !window.SK_hadStore)) return;
    list = Object.keys(CHANGES).filter((k) => cmp(k, v) <= 0 && (!seen || cmp(k, seen) > 0)).sort((a, b) => cmp(b, a));
    if (!list.length) return;
  }
  $('#newsTitle').textContent = list.length === 1 ? `Novidades da versão ${list[0]}` : `O que mudou desde a versão ${seen || 'que você tinha'}`;
  $('#newsList').innerHTML = list.length === 1 ? CHANGES[list[0]].map((x) => `<li>${esc(x)}</li>`).join('')
    : list.map((k) => `<li class="news-ver">Versão ${esc(k)}<ul>${CHANGES[k].map((x) => `<li>${esc(x)}</li>`).join('')}</ul></li>`).join('');
  $('#newsList').classList.toggle('many', list.length > 1);
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
  else el.textContent = `Valendo agora: de ${timeText(hit.from)} até ${timeText(hit.to)}.`;
}
// Brazilian state capitals for sunrise/sunset (rounded coordinates: a few minutes of difference at most)
const SUN_CITIES = [
  ['Aracaju', -10.91, -37.07], ['Belém', -1.46, -48.5], ['Belo Horizonte', -19.92, -43.94], ['Boa Vista', 2.82, -60.67],
  ['Brasília', -15.79, -47.88], ['Campo Grande', -20.47, -54.62], ['Cuiabá', -15.6, -56.1], ['Curitiba', -25.43, -49.27],
  ['Florianópolis', -27.6, -48.55], ['Fortaleza', -3.73, -38.52], ['Goiânia', -16.68, -49.25], ['João Pessoa', -7.12, -34.86],
  ['Macapá', 0.03, -51.07], ['Maceió', -9.67, -35.74], ['Manaus', -3.12, -60.02], ['Natal', -5.79, -35.21],
  ['Palmas', -10.18, -48.33], ['Porto Alegre', -30.03, -51.23], ['Porto Velho', -8.76, -63.9], ['Recife', -8.05, -34.88],
  ['Rio Branco', -9.97, -67.81], ['Rio de Janeiro', -22.91, -43.17], ['Salvador', -12.97, -38.5], ['São Luís', -2.53, -44.3],
  ['São Paulo', -23.55, -46.63], ['Teresina', -5.09, -42.8], ['Vitória', -20.32, -40.34],
];
function renderSun() {
  const sun = state.settings.sun || {}, sel = $('#sunCity');
  sel.innerHTML = '<option value="">Escolher a cidade…</option>' + SUN_CITIES.map(([n]) => `<option${n === sun.city ? ' selected' : ''}>${n}</option>`).join('')
    + `<option value="*"${sun.city === '*' ? ' selected' : ''}>Outra (latitude e longitude)</option>`;
  $('#sunCoords').hidden = sun.city !== '*';
  if (sun.city === '*') { $('#sunLat').value = sun.lat ?? ''; $('#sunLon').value = sun.lon ?? ''; }
  const r = sunMinutes('sunrise'), s = sunMinutes('sunset');
  $('#sunToday').textContent = r == null || s == null ? 'Sem cidade: o app usa 06:00 e 18:00.' : `Hoje: nascer às ${hhmm(r)}, pôr às ${hhmm(s)}.`;
}
function initSun() {
  if (!state.settings.sun) state.settings.sun = { city: '', lat: null, lon: null };
  const sun = state.settings.sun, save = () => { persist(); renderSun(); renderSchedule(); scheduleRecheck(); };
  $('#sunCity').onchange = (e) => {
    const c = SUN_CITIES.find(([n]) => n === e.target.value);
    sun.city = e.target.value; if (c) { sun.lat = c[1]; sun.lon = c[2]; } else if (!sun.city) { sun.lat = sun.lon = null; }
    save();
  };
  const num = (v, lim) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) && Math.abs(n) <= lim ? n : null; };
  $('#sunLat').onchange = (e) => { sun.lat = num(e.target.value, 90); save(); };
  $('#sunLon').onchange = (e) => { sun.lon = num(e.target.value, 180); save(); };
  renderSun();
}
function renderSchedule() {
  const s = state.settings.schedule, list = $('#ntList'); list.innerHTML = '';
  const profOpts = (sel) => state.profiles.map((p) => `<option value="${p.id}"${p.id === sel ? ' selected' : ''}>${esc(p.name)}</option>`).join('');
  s.items.forEach((it, i) => {
    const row = document.createElement('div');
    row.className = 'srow sitem'; row.dataset.id = it.id;
    // each end is a clock time or the sun: "sunrise" / "sunset" are stored instead of HH:MM
    const when = (k, label) => `<select class="sm" data-k="${k}Kind" aria-label="${label}"><option value="time">hora</option><option value="sunrise">nascer do sol</option><option value="sunset">pôr do sol</option></select><input type="time" class="tm" data-k="${k}" aria-label="${label}">`;
    row.innerHTML = `<span class="inline-ctl sched-time">de ${when('from', 'Começa')} até ${when('to', 'Termina')}</span>
      <span class="inline-ctl sched-act"><select data-k="action" aria-label="O que fazer">${ACTIONS.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select>
      <select data-k="bright" class="sm" aria-label="Brilho" title="Brilho (0 é o mais fraco)">${[0, 1, 2, 3, 4].map((b) => `<option value="${b}">Brilho ${b}</option>`).join('')}</select>
      <select data-k="profile" aria-label="Perfil">${profOpts(it.profile)}</select></span>
      <button class="btn ghost small danger" data-k="del" title="Remover este horário" aria-label="Remover este horário">✕</button>`;
    const q = (k) => row.querySelector(`[data-k=${k}]`);
    for (const k of ['from', 'to']) {
      const sun = !!SUN_NAME[it[k]];
      q(k + 'Kind').value = sun ? it[k] : 'time';
      q(k).value = sun ? hhmm(toMin(it[k])) : it[k];
      q(k).disabled = sun; q(k).title = sun ? 'Calculado pela cidade (embaixo da lista)' : '';
      q(k + 'Kind').onchange = (e) => { it[k] = e.target.value === 'time' ? hhmm(toMin(it[k])) : e.target.value; renderSchedule(); schedSave(); };
    }
    q('action').value = it.action; q('bright').value = String(it.bright ?? 1);
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
  initSun();
  renderSchedule();
  setInterval(schedStatus, 30000);
  onView.settings = renderSchedule; // profile names may have changed
}
function initIndicators() {
  const s = state.settings;
  $('#capsOn').checked = s.caps.on; $('#capsColor').value = s.caps.color;
  $('#capsOn').onchange = (e) => { s.caps.on = e.target.checked; persist(); refreshWatch(); capsLayer(capsOn); };
  $('#capsColor').oninput = (e) => { s.caps.color = e.target.value; persist(); };
  $('#msgOn').checked = s.msg.on;
  $('#msgKey').innerHTML = '<option value="all">Teclado inteiro</option>' + LAYOUT.filter((k) => k.label !== 'Fn').map((k) => `<option value="${k.idx}">${esc(k.label || 'Espaço')}</option>`).join('');
  $('#msgKey').value = String(s.msg.key);
  const renderApps = () => {
    const box = $('#msgApps'); box.innerHTML = '';
    if (!s.msg.colors) s.msg.colors = {};
    for (const a of s.msg.apps) {
      const c = document.createElement('span'); c.className = 'chip app msgapp';
      c.innerHTML = `<input type="color" aria-label="Cor do aviso do ${esc(a)}" title="Cor do aviso do ${esc(a)}"><span>${esc(a)}</span><button class="msgdel" aria-label="Tirar ${esc(a)}" title="Tirar da lista">✕</button>`;
      const col = c.querySelector('input'); col.value = msgColor(a);
      col.oninput = (e) => { s.msg.colors[a] = e.target.value; persist(); };
      c.querySelector('.msgdel').onclick = () => { s.msg.apps = s.msg.apps.filter((x) => x !== a); delete s.msg.colors[a]; delete unread[a]; delete fromBadge[a]; persist(); renderApps(); refreshWatch(); onTitle(a, ''); };
      box.appendChild(c);
    }
  };
  renderApps();
  $('#msgOn').onchange = (e) => { s.msg.on = e.target.checked; persist(); refreshWatch(); if (!s.msg.on) { for (const k in unread) delete unread[k]; liveSet('msg', null); } renderMsgStatus(); };
  $('#msgKey').onchange = (e) => { s.msg.key = e.target.value === 'all' ? 'all' : +e.target.value; persist(); };
  const addMsgApp = (raw) => {
    // "WhatsApp.Root" -> "whatsapp": the short name also matches the taskbar button ("WhatsApp - 1 janela...")
    const v = String(raw || '').trim().toLowerCase().replace(/\.exe$/, '').split('.')[0]; if (!v) return;
    if (v === 'electron' || v === 'sk80 studio') { toast('Esse é o próprio SK80 Studio'); return; }
    if (s.msg.apps.includes(v)) { toast(`“${v}” já está na lista`); return; }
    s.msg.apps.push(v); persist(); renderApps(); refreshWatch(); toast(`“${v}” adicionado`);
  };
  $('#msgAdd').onclick = () => { addMsgApp($('#msgApp').value); $('#msgApp').value = ''; };
  $('#msgApp').onkeydown = (e) => { if (e.key === 'Enter') $('#msgAdd').click(); };
  // open programs (with a window), same list as in Perfis
  const fillMsgPick = async () => {
    const sel = $('#msgPick');
    sel.innerHTML = '<option value="">Carregando…</option>';
    const list = await window.sk.appList().catch(() => []);
    const seen = new Set();
    sel.innerHTML = '<option value="">Escolher um programa aberto…</option>' + list
      .filter((a) => a.name !== 'electron' && !seen.has(a.name) && seen.add(a.name))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((a) => `<option value="${esc(a.name)}">${esc(a.name.split('.')[0])} — ${esc((a.title || '').slice(0, 50))}</option>`).join('');
  };
  $('#msgPick').onchange = (e) => { if (e.target.value) addMsgApp(e.target.value); e.target.value = ''; };
  $('#msgPickRefresh').onclick = fillMsgPick;
  $('#msgOn').addEventListener('change', () => { if (s.msg.on) fillMsgPick(); });
  if (s.msg.on) fillMsgPick();
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
  if (window.sk.onBadge) window.sk.onBadge(onBadge);
  if (window.sk.onBadgeRaw) window.sk.onBadgeRaw((name, text) => { badgeRaw[name] = text; renderMsgStatus(); });
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
