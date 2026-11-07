/* On-screen approximation of each firmware lighting effect, for the preview keyboard. */
(function () {
  const hsl = (h, s, l) => {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    return [f(0) * 255, f(8) * 255, f(4) * 255];
  };
  const mix = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  // colour ramp through several stops, k 0..1
  const ramp = (stops, k) => { k = clamp(k) * (stops.length - 1); const i = Math.min(stops.length - 2, Math.floor(k)); return lerp(stops[i], stops[i + 1], k - i); };
  const FIRE = [[0, 0, 0], [120, 0, 0], [255, 40, 0], [255, 140, 0], [255, 230, 90]];
  const LAVA = [[60, 0, 0], [200, 10, 0], [255, 70, 0], [255, 170, 20]];
  const TYPE = [[0, 60, 255], [130, 0, 255], [255, 0, 110], [255, 110, 0], [255, 230, 160]];
  const SEA = [[0, 10, 60], [0, 60, 170], [0, 160, 230], [150, 240, 255]];

  // App effects (ids 100+): the keyboard has no such mode, the app streams them while it is open.
  // Same signature as the firmware sketches: returns [r,g,b] for one key at time t.
  function appEffect(sim, k, t, o, sp, col) {
    const { cx, cy, idx } = k, s = sim.seed[idx];
    switch (o.mode) {
      case 100: { // fire: hottest on the bottom row, flickering tongues going up
        const n = 0.5 + 0.25 * Math.sin(cx * 17 + t * sp * 5 + Math.sin(cx * 6 - t * sp * 2.3) * 2) + 0.25 * Math.sin(cx * 31 - t * sp * 7.1 + s * 6);
        return ramp(FIRE, cy * 1.25 - 0.45 + n * 0.55);
      }
      case 101: { // aurora: soft green to purple curtains drifting sideways
        const yc = 0.45 + 0.25 * Math.sin(cx * 4 + t * sp * 0.8) + 0.12 * Math.sin(cx * 9 - t * sp * 1.3);
        const v = clamp(1 - Math.abs(cy - yc) * 2.2) * (0.65 + 0.35 * Math.sin(cx * 7 - t * sp * 1.7));
        const hue = 130 + 150 * (0.5 + 0.5 * Math.sin(cx * 2.5 - t * sp * 0.45));
        return mix(hsl(hue, 100, 50), 0.06 + 0.94 * v);
      }
      case 102: { // matrix: green drops falling down the columns, bright head and fading tail
        const c = Math.floor(cx * 16), head = ((t * sp * 0.55 * (0.6 + 0.8 * hash(c)) + hash(c + 40)) % 1.7) - 0.3;
        const d = head - cy;
        if (d < 0 || d > 0.55) return [0, 6, 0];
        return d < 0.1 ? [170, 255, 170] : mix([0, 255, 60], 1 - d / 0.55);
      }
      case 103: { // stars: a dark blue sky with white stars slowly twinkling
        const v = Math.pow(Math.max(0, Math.sin(t * sp * 0.6 * (0.6 + s) + s * 50)), 12);
        return lerp([0, 2, 22], [235, 240, 255], v);
      }
      case 104: { // heartbeat: two beats, then a pause, spreading a little from the centre
        const d = Math.hypot(cx - 0.5, (cy - 0.5) * 0.45);
        const ph = ((t * sp * 0.55 - d * 0.25) % 1 + 1) % 1;
        const v = Math.exp(-(((ph - 0.08) / 0.045) ** 2)) + 0.65 * Math.exp(-(((ph - 0.27) / 0.06) ** 2));
        return col(t * 30, 0.05 + 0.95 * clamp(v));
      }
      case 105: { // siren: left half red, right half blue, each flashing twice in turn
        const step = Math.floor(t * sp * 5) % 8, left = cx < 0.5;
        const on = left ? step === 0 || step === 2 : step === 4 || step === 6;
        return on ? (left ? [255, 0, 0] : [0, 50, 255]) : [0, 0, 0];
      }
      case 106: { // ocean: blue waves rolling across with light foam on the crests
        const v = 0.5 + 0.5 * Math.sin(cx * 8 - t * sp * 2 + Math.sin(cy * 3 + t * sp) * 1.2);
        return ramp(SEA, v * v);
      }
      case 107: { // lava: slow red and orange blobs
        const n = Math.sin(cx * 6 + t * sp * 0.6) + Math.sin(cy * 5 - t * sp * 0.45 + cx * 3) + Math.sin((cx + cy) * 4 + t * sp * 0.8);
        return ramp(LAVA, Math.pow((n / 3 + 1) / 2, 1.4));
      }
      case 108: { // plasma: every colour flowing in soft blobs
        const n = Math.sin(cx * 7 + t * sp) + Math.sin(cy * 6 - t * sp * 0.7) + Math.sin(Math.hypot(cx - 0.5, cy - 0.5) * 12 - t * sp * 1.3);
        return hsl(((n * 70 + t * 40 * sp) % 360 + 360) % 360, 100, 50);
      }
      case 109: { // comet: one light runs through every row like a snake, with a tail
        const head = (t * sp * 0.22) % 1, d = ((head - sim.path[idx]) % 1 + 1) % 1;
        if (d > 0.09) return [0, 0, 0];
        return d < 0.012 ? [255, 255, 255] : col(t * 40, 1 - d / 0.09);
      }
      case 110: { // storm: dark sky, now and then a lightning flash somewhere on the board
        const e = Math.floor(t * sp * 0.7), f = t * sp * 0.7 - e;
        if (hash(e) > 0.65 || f > 0.3) return [3, 3, 14];
        const x0 = hash(e + 0.5), flick = f < 0.08 || (f > 0.14 && f < 0.24) ? 1 : 0.15;
        const v = clamp(1.3 - Math.abs(cx - x0) * 2.6) * flick;
        return lerp([3, 3, 14], [215, 225, 255], v);
      }
      case 111: { // fireflies: a few yellow-green lights wandering and glowing
        let v = 0;
        for (let i = 0; i < 6; i++) {
          const x = 0.5 + 0.48 * Math.sin(t * sp * 0.21 * (1 + hash(i)) + i * 2.1);
          const y = 0.5 + 0.48 * Math.sin(t * sp * 0.17 * (1 + hash(i + 9)) + i * 1.3);
          const glow = 0.4 + 0.6 * Math.max(0, Math.sin(t * sp * 1.1 + i * 4));
          v = Math.max(v, clamp(1 - Math.hypot(cx - x, (cy - y) * 0.45) * 9) * glow);
        }
        return lerp([0, 5, 0], [190, 255, 40], v);
      }
      case 113: { // typing speed: the faster you type, the hotter and brighter the board; each pressed key flashes
        const level = clamp((o.rate || 0) / 8); // 8 keys per second (~95 words per minute) = full
        let flash = 0;
        for (const p of sim.presses) if (p.idx === idx) flash = Math.max(flash, 1 - (t - p.t) / 0.45);
        const base = mix(ramp(TYPE, level), 0.18 + 0.82 * level);
        return lerp(base, [255, 255, 255], clamp(flash) * 0.85);
      }
      case 112: { // confetti: keys pop in random colours and fade out
        const r = t * sp * 0.5 + s * 7, e = Math.floor(r), ph = r - e;
        if (hash(e * 13 + idx) > 0.35) return [0, 0, 0];
        return mix(hsl(hash(e * 7 + idx) * 360, 100, 50), (1 - ph) ** 2);
      }
    }
    return [0, 0, 0];
  }

  class LightSim {
    constructor(keys) {
      // keys: [{idx, cx, cy, row}] with cx, cy normalised 0..1, row 0 (Esc row) .. 5 (space row)
      this.keys = keys;
      this.presses = []; // {idx, cx, cy, t}
      this.seed = Object.fromEntries(keys.map((k) => [k.idx, Math.random()]));
      this.lastAuto = 0;
      // comet path: row by row, alternating left→right and right→left (a snake through the board)
      const order = [...keys].sort((a, b) => a.row - b.row || (a.row % 2 ? b.cx - a.cx : a.cx - b.cx));
      this.path = Object.fromEntries(order.map((k, i) => [k.idx, i / order.length]));
    }
    press(idx, t) {
      const k = this.keys.find((x) => x.idx === idx); if (!k) return;
      this.presses.push({ idx, cx: k.cx, cy: k.cy, row: k.row, t, hue: Math.random() * 360 });
      if (this.presses.length > 40) this.presses.shift();
    }
    // returns {idx: [r,g,b]} (0..255) for time t (seconds)
    frame(t, o) {
      const sp = 0.35 + o.speed * 0.33;          // speed 0..5
      const dir = o.direction || 0;
      const base = o.rgb;
      const col = (hue, k = 1) => (o.random ? mix(hsl(hue % 360, 100, 50), k) : mix(base, k));
      const reactive = [2, 3, 13, 14, 15].includes(o.mode);
      if (reactive && t - this.lastAuto > 0.55 / sp) { // simulated typing
        this.lastAuto = t;
        this.press(this.keys[Math.floor(Math.random() * this.keys.length)].idx, t);
      }
      this.presses = this.presses.filter((p) => t - p.t < 2.5);
      const out = {};
      for (const k of this.keys) {
        const { cx, cy, idx } = k;
        const s = this.seed[idx];
        let c = [0, 0, 0];
        switch (o.mode) {
          case 0: break;
          case 1: c = col(cx * 300); break;
          case 2: { // light on press
            let v = 0, hue = 0;
            for (const p of this.presses) if (p.idx === idx) { const a = 1 - (t - p.t) / (1.4 / sp); if (a > v) { v = a; hue = p.hue; } }
            c = col(hue, clamp(v)); break;
          }
          case 3: { // off on press
            let v = 1;
            for (const p of this.presses) if (p.idx === idx) v = Math.min(v, clamp((t - p.t) / (1.4 / sp)));
            c = col(cx * 300, v); break;
          }
          case 4: { // glitter: slowed twice after comparing with the real keyboard (each key flashes every ~10 s)
            const v = Math.pow(Math.max(0, Math.sin(t * sp * 0.35 + s * 40)), 8); c = col(s * 360, v); break;
          }
          case 5: { // rain
            const col0 = Math.floor(cx * 16), ph = (t * sp * 0.7 + this.seed[idx % 7 + 1] * 0 + ((col0 * 0.37) % 1)) % 1;
            const v = clamp(1 - Math.abs(cy - ph) * 4); c = col(col0 * 22, v); break;
          }
          case 6: c = col(s * 360 + t * 40 * sp); break;
          case 7: { // breath: tuned against the real keyboard (one breath ≈ 4 s at max speed)
            const v = 0.08 + 0.92 * (0.5 - 0.5 * Math.cos(t * sp * 0.78)); c = col(t * 12, v); break;
          }
          case 8: // spectrum: slowed ~1.5x after comparing with the real keyboard
            c = o.random ? hsl((t * 40 * sp) % 360, 100, 50) : col(0, 0.6 + 0.4 * Math.sin(t * sp * 0.67)); break;
          case 9: { const d = Math.hypot(cx - 0.5, (cy - 0.5) * 0.45); const v = 0.5 + 0.5 * Math.sin(d * 25 - t * sp * 5); c = col(d * 500 - t * 80 * sp, o.random ? 1 : v); break; }
          case 10: { // scrolling: vertical only on the keyboard (even = down, odd = up); slowed ~1.5x after comparing
            const p = dir % 2 ? 1 - cy : cy;
            c = o.random ? hsl((p * 360 - t * 80 * sp) % 360 + 360, 100, 50) : col(0, 0.5 + 0.5 * Math.sin(p * 12 - t * sp * 3.3)); break;
          }
          case 11: { // rolling: diagonal from bottom-left to top-right on the keyboard (sentido 2 assumed opposite)
            const p = dir % 2 ? cy - cx : cx - cy;
            c = o.random ? hsl((p * 260 - t * 120 * sp) % 360 + 720, 100, 50) : col(0, 0.5 + 0.5 * Math.sin(p * 9 - t * sp * 5)); break;
          }
          case 12: { // rotating: counter-clockwise on the keyboard
            const a = Math.atan2((cy - 0.5) * 0.45, cx - 0.5) * 180 / Math.PI;
            c = o.random ? hsl((a + t * 120 * sp + 720) % 360, 100, 50) : col(0, 0.5 + 0.5 * Math.sin(a / 57.3 + t * sp * 3)); break;
          }
          case 13: { // explode: on the keyboard it lights the pressed key's row, spreading out from the key
            let v = 0, hue = 0;
            for (const p of this.presses) {
              if (p.row !== k.row) continue;
              const age = (t - p.t) * sp, r = age * 0.35;
              const w = (Math.abs(cx - p.cx) <= r + 0.03 ? 1 : 0) * clamp(1 - age * 0.45);
              if (w > v) { v = w; hue = p.hue; }
            }
            c = col(hue, v); break;
          }
          case 14: { // launch: two waves leave the pressed key, one left and one right, across the whole keyboard
            let v = 0, hue = 0;
            for (const p of this.presses) {
              const r = (t - p.t) * sp * 0.4;
              const w = clamp(1 - Math.abs(Math.abs(cx - p.cx) - r) * 12) * clamp(1.3 - r);
              if (w > v) { v = w; hue = p.hue; }
            }
            c = col(hue, v); break;
          }
          case 15: { // ripples: ring from the pressed key; slowed after comparing
            let v = 0, hue = 0;
            for (const p of this.presses) {
              const d = Math.hypot(cx - p.cx, (cy - p.cy) * 0.45), r = (t - p.t) * sp * 0.28;
              const w = clamp(1 - Math.abs(d - r) * 22) * clamp(1 - r * 1.1);
              if (w > v) { v = w; hue = p.hue; }
            }
            c = col(hue, v); break;
          }
          case 16: { // flowing: one whole row at a time, going down row by row (sentido 2 assumed upward)
            const row = dir % 2 ? 5 - k.row : k.row;
            const ph = (t * sp * 1.2) % 7.5 - 0.5;
            c = col(k.row * 60 + t * 20, clamp(1 - Math.abs(row - ph) * 0.9)); break;
          }
          case 17: { // pulsating (sketched from the real keyboard): a "whip" wave starts at the H key and travels to both sides;
            // its crest moves up and down between the rows as it travels outward.
            const HX = 0.4375, HY = 0.585;                       // H key centre
            const d = Math.abs(cx - HX);
            const crest = HY + 0.42 * Math.sin(d * 13 - t * sp * 3.4) * Math.min(1, 0.35 + d * 2.5);
            const v = clamp(1 - Math.abs(cy - crest) * 4.2);
            c = col(d * 420 - t * 60, v); break;
          }
          case 18: { // tilt: diagonal bands, one after another, from bottom-left (Ctrl) to top-right (screen);
            // sentido 2 goes from the screen to Ctrl (confirmed by Lucas). Several bands at once and faster than the
            // old single band (also from Lucas); the number of bands (3) and the speed are estimates to compare.
            const q0 = (cx - cy * 0.6 + 0.6) / 1.6, q = dir % 2 ? 1 - q0 : q0;
            const BANDS = 3, f = (((q - t * sp * 0.6) * BANDS) % 1 + 1) % 1;
            c = col(q * 300, clamp(1 - Math.abs(f - 0.5) * 4)); break;
          }
          case 19: { // shuttle (as seen on the real keyboard): each row has a band bouncing end to end at constant speed;
            // Esc row starts going right, the next row goes left, alternating, so neighbouring rows cross in the middle.
            const x = t * sp * 0.46, tri = 1 - Math.abs((x % 2) - 1);   // 0→1→0 bounce
            const pos = k.row % 2 ? 1 - tri : tri;
            c = col(k.row * 55 + cx * 120, 0.12 + 0.88 * clamp(1 - Math.abs(cx - pos) * 5.5)); break;
          }
          case 0x80: c = [0, 0, 0]; break;
          default: c = o.mode >= 100 && o.mode < 0x80 ? appEffect(this, k, t, o, sp, col) : col(0);
        }
        out[idx] = mix(c, 0.45 + 0.55 * o.brightness / 5);
      }
      return out;
    }
  }
  window.LightSim = LightSim;
  window.SK_isAppMode = (m) => m >= 100 && m < 0x80; // 0x80 is the keyboard's own per-key mode
})();
