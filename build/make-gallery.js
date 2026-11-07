// Generates the starter community gallery (gallery/*.sk80perfil + gallery/index.json). Run: node build/make-gallery.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'src/renderer/data.js'), 'utf8'), ctx);
const LAYOUT = ctx.window.SK_LAYOUT;
const pos = (k) => ({ x: (k.x + k.w / 2 - 72) / 656, y: (k.y + 14 - 22) / 258 });
const hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lerp = (a, b, t) => hex(rgb(a).map((v, i) => v + (rgb(b)[i] - v) * t));
const idx = (...labels) => labels.flatMap((l) => LAYOUT.filter((k) => k.label === l).map((k) => k.idx));
const base = (light, extra = {}) => ({ light: { mode: 1, color: '#ffffff', random: false, brightness: 5, speed: 3, direction: 0, ...light }, paint: {}, paintBright: 5, paintActive: false, keymap: { top: {}, fn: {} }, macros: [], ...extra });

const sunset = {}; for (const k of LAYOUT) sunset[k.idx] = lerp('#ff8a00', '#c2005f', pos(k).x);
const fps = {}; for (const k of LAYOUT) fps[k.idx] = '#0c1a40';
for (const i of idx('W', 'A', 'S', 'D')) fps[i] = '#ff1a1a';
for (const i of idx('Q', 'E', 'R', 'F', 'G')) fps[i] = '#ff8a00';
for (const i of idx('1', '2', '3', '4', '5')) fps[i] = '#ffd000';
for (const i of [73, 91, 94, 37]) fps[i] = '#ffffff';

const profiles = [
  ['por-do-sol', 'Pôr do sol', 'Degradê laranja → magenta da esquerda para a direita.', base({}, { paint: sunset, paintActive: true })],
  ['gamer-fps', 'Gamer FPS', 'WASD vermelho, habilidades em laranja, armas em amarelo, resto azul-escuro.', base({}, { paint: fps, paintActive: true })],
  ['arco-iris-girando', 'Arco-íris girando', 'Efeito Girando com cores aleatórias, velocidade média.', base({ mode: 12, random: true, speed: 2 })],
  ['oceano-respirando', 'Oceano respirando', 'Respiração azul-água, calma.', base({ mode: 7, color: '#00c8ff', brightness: 4, speed: 2 })],
  ['escritorio', 'Escritório discreto', 'Branco quente e fraquinho, para trabalhar sem chamar atenção.', base({ mode: 1, color: '#ffd9a0', brightness: 2 })],
];
const dir = path.join(root, 'gallery'); fs.mkdirSync(dir, { recursive: true });
const index = profiles.map(([file, name, desc, data]) => {
  fs.writeFileSync(path.join(dir, file + '.sk80perfil'), JSON.stringify({ app: 'sk80-studio', kind: 'profile', version: 1, name, apps: [], data }, null, 1));
  return { file: file + '.sk80perfil', name, author: 'Kinglucas962', desc };
});
fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(index, null, 1));
console.log(index.length + ' perfis');
