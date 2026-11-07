/* SK80 Studio — interface layer: light/dark theme, the gliding menu highlight, screen-change motion,
   and quick search (Ctrl + K). Uses globals from app.js (state, go, persist, $, $$) and extras (toast). */

// ====================== theme ======================
const THEME_ICON = {
  // shows what a click will switch TO
  light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>',
  dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"/></svg>',
};
const systemLight = matchMedia('(prefers-color-scheme: light)');
const themePref = () => (state.settings && state.settings.theme) || 'dark';
const resolveTheme = (pref) => (pref === 'auto' ? (systemLight.matches ? 'light' : 'dark') : pref);

function paintTheme(pref) {
  const t = resolveTheme(pref);
  document.documentElement.dataset.theme = t;
  $('#themeBtn').innerHTML = THEME_ICON[t === 'dark' ? 'light' : 'dark'];
  $('#themeBtn').title = t === 'dark' ? 'Usar o tema claro' : 'Usar o tema escuro';
  $('#themeBtn').setAttribute('aria-label', $('#themeBtn').title);
  $$('#themePick button').forEach((b) => { const on = b.dataset.theme === pref; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
}

// origin: the element the new theme grows out of (a circle reveal)
function setTheme(pref, origin) {
  const before = resolveTheme(themePref());
  state.settings.theme = pref; persist();
  try { localStorage.setItem('sk-theme', pref); } catch (_) {}
  if (window.sk.setTheme) window.sk.setTheme(pref).catch(() => {});
  if (resolveTheme(pref) === before || !document.startViewTransition || !origin) { paintTheme(pref); return; }
  const r = origin.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const vt = document.startViewTransition(() => paintTheme(pref));
  vt.ready.then(() => document.documentElement.animate(
    { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
    { duration: 650, easing: 'cubic-bezier(.2,.8,.2,1)', pseudoElement: '::view-transition-new(root)' },
  )).catch(() => {});
}

function initTheme() {
  if (!state.settings.theme) state.settings.theme = (() => { try { return localStorage.getItem('sk-theme'); } catch (_) { return null; } })() || 'dark';
  try { localStorage.setItem('sk-theme', state.settings.theme); } catch (_) {}
  paintTheme(state.settings.theme);
  if (window.sk.setTheme) window.sk.setTheme(state.settings.theme).catch(() => {});
  $('#themeBtn').onclick = (e) => setTheme(resolveTheme(themePref()) === 'dark' ? 'light' : 'dark', e.currentTarget);
  $$('#themePick button').forEach((b) => (b.onclick = () => setTheme(b.dataset.theme, b)));
  systemLight.addEventListener('change', () => { if (themePref() === 'auto') setTheme('auto', $('#themeBtn')); });
}

// ====================== menu highlight + screen motion ======================
const navOrder = () => $$('.nav').map((n) => n.dataset.view);
function movePill(instant) {
  const pill = $('#navPill'), nav = $('.nav.active');
  if (!pill || !nav) { if (pill) pill.style.opacity = 0; return; }
  if (instant) pill.style.transition = 'none';
  pill.style.opacity = 1;
  pill.style.height = nav.offsetHeight + 'px';
  pill.style.transform = `translateY(${nav.offsetTop}px)`;
  if (instant) { pill.offsetHeight; pill.style.transition = ''; }
}
function hookNavigation() {
  const original = go;
  go = function (v) { // eslint-disable-line no-global-assign
    const order = navOrder(), from = order.indexOf(state.view), to = order.indexOf(v);
    original(v);
    $$('.nav').forEach((n) => (n.dataset.view === v ? n.setAttribute('aria-current', 'page') : n.removeAttribute('aria-current')));
    const view = $('#view-' + v);
    if (view) { view.classList.toggle('from-up', from > to); }
    const t = $('#titles'); t.classList.remove('swap'); void t.offsetWidth; t.classList.add('swap');
    movePill();
  };
  $$('.nav').forEach((n) => (n.onclick = () => go(n.dataset.view)));
  // keep the highlight on the active item when anything in the sidebar moves: the window size, the update
  // card appearing or growing (it pushes Ajustes up), the version line changing
  const ro = new ResizeObserver(() => movePill(true));
  ro.observe($('.rail')); for (const el of $('.rail').children) ro.observe(el);
  new MutationObserver((list) => {
    // ignore the highlight moving itself and menu items turning active (go() animates that glide)
    if (list.every((m) => m.target.id === 'navPill' || (m.attributeName === 'class' && m.target.classList.contains('nav')))) return;
    requestAnimationFrame(() => movePill(true));
  }).observe($('.rail'), { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'class', 'style'] });
  movePill(true);
}

// ====================== quick search (Ctrl + K) ======================
const fold = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
let palItems = [], palShown = [], palSel = 0;

function buildPalette() {
  const items = [];
  for (const n of $$('.nav')) {
    const span = n.querySelector('span'), small = span.querySelector('small');
    const title = span.firstChild.textContent.trim();
    items.push({ icon: n.querySelector('i').textContent, title, sub: small ? small.textContent : '', run: () => go(n.dataset.view) });
  }
  // every setting row, so "backup" or "noite" lands right on it
  let group = '';
  for (const el of $$('#view-settings .settings > *')) {
    if (el.tagName === 'H2') { group = el.textContent; continue; }
    for (const row of el.querySelectorAll ? el.querySelectorAll('.srow') : []) {
      const b = row.querySelector('b'); if (!b) continue;
      const small = row.querySelector('small');
      items.push({ icon: '⚙', title: b.textContent, sub: 'Ajustes › ' + group + (small && small.textContent ? ' · ' + small.textContent : ''), run: () => showSetting(row) });
    }
  }
  items.push({ icon: '◑', title: 'Trocar tema claro / escuro', sub: 'Aparência', run: () => $('#themeBtn').click() });
  items.push({ icon: '↻', title: 'Procurar atualização', sub: 'Versão do app', run: () => $('#railVer').click() });
  items.push({ icon: '★', title: 'Novidades desta versão', sub: 'O que mudou', run: () => window.SK_whatsNew && window.SK_whatsNew(true) });
  return items;
}
function showSetting(row) {
  go('settings');
  // a closed sub-section (e.g. night schedule) opens with its switch; just scroll to the row
  setTimeout(() => {
    row.scrollIntoView({ block: 'center', behavior: 'smooth' });
    row.classList.remove('flash'); void row.offsetWidth; row.classList.add('flash');
    const ctl = row.querySelector('input, select, button'); if (ctl) ctl.focus({ preventScroll: true });
  }, 60);
}
function renderPalette() {
  const q = fold($('#palInput').value.trim()), words = q.split(/\s+/).filter(Boolean);
  palShown = palItems.filter((it) => { const hay = fold(it.title + ' ' + it.sub); return words.every((w) => hay.includes(w)); }).slice(0, 40);
  palSel = Math.min(palSel, Math.max(0, palShown.length - 1));
  const list = $('#palList'); list.innerHTML = '';
  if (!palShown.length) { list.innerHTML = '<div class="pal-empty">Nada com esse nome. Tente outra palavra, como “luz”, “GIF” ou “perfil”.</div>'; return; }
  palShown.forEach((it, i) => {
    const b = document.createElement('button');
    b.className = 'pal-item' + (i === palSel ? ' on' : ''); b.setAttribute('role', 'option'); b.setAttribute('aria-selected', i === palSel);
    b.innerHTML = '<i></i><span><b></b><small></small></span>';
    b.querySelector('i').textContent = it.icon; b.querySelector('b').textContent = it.title; b.querySelector('small').textContent = it.sub;
    b.onmousemove = () => { if (palSel !== i) { palSel = i; mark(); } };
    b.onclick = () => runPal(i);
    list.appendChild(b);
  });
}
function mark() { $$('#palList .pal-item').forEach((b, i) => { b.classList.toggle('on', i === palSel); b.setAttribute('aria-selected', i === palSel); }); const on = $('#palList .pal-item.on'); if (on) on.scrollIntoView({ block: 'nearest' }); }
function openPalette() {
  palItems = buildPalette(); palSel = 0;
  $('#palInput').value = ''; renderPalette();
  $('#pal').classList.add('show'); $('#palInput').focus();
}
function closePalette() { $('#pal').classList.remove('show'); }
function runPal(i) { const it = palShown[i]; closePalette(); if (it) it.run(); }

function initPalette() {
  $('#quickBtn').onclick = openPalette;
  $('#palInput').oninput = () => { palSel = 0; renderPalette(); };
  $('#pal').onclick = (e) => { if (e.target.id === 'pal') closePalette(); };
  addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#pal').classList.contains('show') ? closePalette() : openPalette(); return; }
    if (!$('#pal').classList.contains('show')) return;
    if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); palSel = Math.min(palShown.length - 1, palSel + 1); mark(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); palSel = Math.max(0, palSel - 1); mark(); }
    else if (e.key === 'Enter') { e.preventDefault(); runPal(palSel); }
  }, true);
}

window.SK_EXTRAS.push(() => { initTheme(); hookNavigation(); initPalette(); });
