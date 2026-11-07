/* Color wheel picker: hue = angle, saturation = radius, plus a brightness slider, hex field, swatches. */
(function () {
  const PALETTE = ['#ff0000', '#ff6a00', '#ffd400', '#7dff00', '#00ff6a', '#00e5ff', '#0050ff', '#7a00ff', '#ff00d4', '#ffffff'];

  function hsv2rgb(h, s, v) {
    const f = (n) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
    return [f(5), f(3), f(1)].map((x) => Math.round(x * 255));
  }
  function rgb2hsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [(h * 60 + 360) % 360, mx ? d / mx : 0, mx];
  }
  const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
  const parse = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

  class ColorWheel {
    constructor(root, { value = '#ff0000', onInput = () => {}, onChange = () => {}, size = 188 } = {}) {
      this.onInput = onInput; this.onChange = onChange; this.size = size;
      root.classList.add('cw');
      root.innerHTML = `
        <div class="cw-main">
          <div class="cw-wheel" style="width:${size}px;height:${size}px">
            <canvas width="${size * 2}" height="${size * 2}"></canvas>
            <div class="cw-knob"></div>
          </div>
          <div class="cw-side">
            <div class="cw-preview"></div>
            <input class="cw-hex" spellcheck="false" maxlength="7">
            <label class="cw-v"><span>Intensidade</span><input type="range" min="0" max="100" value="100"></label>
          </div>
        </div>
        <div class="cw-sw"></div>
        <div class="cw-recent"></div>`;
      this.canvas = root.querySelector('canvas'); this.knob = root.querySelector('.cw-knob');
      this.prev = root.querySelector('.cw-preview'); this.hexIn = root.querySelector('.cw-hex');
      this.vIn = root.querySelector('.cw-v input'); this.recentEl = root.querySelector('.cw-recent');
      this.recent = [];
      try { this.recent = JSON.parse(localStorage.getItem('sk-recent') || '[]'); } catch (_) {}
      this.drawWheel();
      const sw = root.querySelector('.cw-sw');
      for (const c of PALETTE) {
        const b = document.createElement('button'); b.className = 'cw-chip'; b.style.background = c; b.title = c;
        b.onclick = () => { this.set(c); this.emit(true); };
        sw.appendChild(b);
      }
      let drag = false;
      const wheel = root.querySelector('.cw-wheel');
      const pick = (e) => {
        const r = wheel.getBoundingClientRect();
        const x = e.clientX - r.left - size / 2, y = e.clientY - r.top - size / 2;
        const rad = size / 2;
        this.h = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
        this.s = Math.min(1, Math.hypot(x, y) / rad);
        this.update(); this.emit(false);
      };
      wheel.addEventListener('pointerdown', (e) => { drag = true; wheel.setPointerCapture(e.pointerId); pick(e); });
      wheel.addEventListener('pointermove', (e) => drag && pick(e));
      wheel.addEventListener('pointerup', () => { if (drag) { drag = false; this.emit(true); } });
      this.vIn.oninput = () => { this.v = this.vIn.value / 100; this.update(); this.emit(false); };
      this.vIn.onchange = () => this.emit(true);
      this.hexIn.onchange = () => { if (/^#?[0-9a-f]{6}$/i.test(this.hexIn.value)) { this.set((this.hexIn.value[0] === '#' ? '' : '#') + this.hexIn.value); this.emit(true); } else this.update(); };
      this.set(value); this.renderRecent();
    }
    drawWheel() {
      const c = this.canvas, ctx = c.getContext('2d'), n = c.width, r = n / 2;
      const img = ctx.createImageData(n, n);
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
        const dx = x - r, dy = y - r, d = Math.hypot(dx, dy);
        const i = (y * n + x) * 4;
        if (d > r) continue;
        const [R, G, B] = hsv2rgb((Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360, Math.min(1, d / r), 1);
        img.data[i] = R; img.data[i + 1] = G; img.data[i + 2] = B; img.data[i + 3] = d > r - 1.5 ? 255 * (r - d) / 1.5 : 255;
      }
      ctx.putImageData(img, 0, 0);
    }
    set(h) { [this.h, this.s, this.v] = rgb2hsv(...parse(h)); if (this.v === 0) this.v = 0; this.update(); }
    get value() { return hex(hsv2rgb(this.h, this.s, this.v)); }
    update() {
      const r = this.size / 2, a = this.h * Math.PI / 180;
      this.knob.style.left = r + Math.cos(a) * this.s * r + 'px';
      this.knob.style.top = r + Math.sin(a) * this.s * r + 'px';
      this.knob.style.background = hex(hsv2rgb(this.h, this.s, 1));
      this.canvas.style.filter = `brightness(${0.25 + this.v * 0.75})`;
      this.prev.style.background = this.value; this.hexIn.value = this.value.toUpperCase();
      this.vIn.value = Math.round(this.v * 100);
      this.vIn.style.setProperty('--top', hex(hsv2rgb(this.h, this.s, 1)));
    }
    emit(done) {
      this.onInput(this.value);
      if (done) {
        this.recent = [this.value, ...this.recent.filter((x) => x !== this.value)].slice(0, 10);
        try { localStorage.setItem('sk-recent', JSON.stringify(this.recent)); } catch (_) {}
        this.renderRecent(); this.onChange(this.value);
      }
    }
    renderRecent() {
      this.recentEl.innerHTML = this.recent.length ? '<span>Recentes</span>' : '';
      for (const c of this.recent) {
        const b = document.createElement('button'); b.className = 'cw-chip small'; b.style.background = c; b.title = c;
        b.onclick = () => { this.set(c); this.emit(true); };
        this.recentEl.appendChild(b);
      }
    }
  }
  window.ColorWheel = ColorWheel;
})();
