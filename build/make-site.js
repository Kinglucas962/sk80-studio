// Builds the download page (docs/index.html, served by GitHub Pages) from build/site.html + the real key layout.
// Run: node build/make-site.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = { window: {} }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'src/renderer/data.js'), 'utf8'), ctx);
const layout = ctx.window.SK_LAYOUT.map((k) => [k.label, k.x, k.y, k.w]);
const html = fs.readFileSync(path.join(__dirname, 'site.html'), 'utf8').replace('__LAYOUT__', JSON.stringify(layout));
fs.writeFileSync(path.join(root, 'docs/index.html'), html);
fs.copyFileSync(path.join(root, 'src/renderer/icon.png'), path.join(root, 'docs/icon.png'));
fs.writeFileSync(path.join(root, 'docs/.nojekyll'), '');
console.log('docs/index.html ok');
