// Womier SK80 protocol (reverse-engineered from the official driver's HID traffic).
// Config interface: 05AC:024F, interface 3, usage page 0xFF13 — 64-byte feature reports (report id 0).
// Screen interface: interface 2, usage page 0xFF68 — 4096-byte output reports (report id 0).
const HID = require('node-hid');

const VID = 0x05ac, PID = 0x024f;

const CMD = {
  BEGIN: 0x18,
  END: 0x02,
  APPLY_LIGHT: 0xf0,
  KEYMAP: 0x11,        // top layer key functions, 4 bytes per key slot
  LIGHT_MODE: 0x13,    // lighting effect
  MACROS: 0x15,        // macro memory
  SETTINGS: 0x17,
  PREVIEW_COLORS: 0x20, // live per-key colours (not saved)
  CUSTOM_COLORS: 0x23,  // saved per-key colours for the custom mode
  FN_KEYMAP: 0x27,      // Fn layer key functions
  SCREEN: 0x72,         // TFT animation upload
  READ_COLORS: 0xf5,
};

const MODES = [
  'LED Off', 'Static', 'SingleOn', 'SingleOff', 'Glittering', 'Falling', 'Colourful', 'Breath',
  'Spectrum', 'Outward', 'Scrolling', 'Rolling', 'Rotating', 'Explode', 'Launch', 'Ripples',
  'Flowing', 'Pulsating', 'Tilt', 'Shuttle',
];
const MODE_CUSTOM = 0x80;

const SCREEN_W = 160, SCREEN_H = 96, FRAME_BYTES = SCREEN_W * SCREEN_H * 2, SCREEN_PAGE = 4096;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class SK80 {
  constructor() { this.cfg = null; this.scr = null; this.busy = Promise.resolve(); }

  static find() {
    const list = HID.devices(VID, PID);
    return {
      cfg: list.find((d) => d.interface === 3 && d.usagePage === 0xff13),
      scr: list.find((d) => d.interface === 2 && d.usagePage === 0xff68),
    };
  }

  connected() { return !!SK80.find().cfg; }

  open() {
    if (this.cfg) return;
    const f = SK80.find();
    if (!f.cfg) throw new Error('Teclado SK80 não encontrado');
    this.cfg = new HID.HID(f.cfg.path);
  }

  close() {
    try { this.cfg && this.cfg.close(); } catch (_) {}
    try { this.scr && this.scr.close(); } catch (_) {}
    this.cfg = this.scr = null;
  }

  // serialize all device access
  run(fn) {
    const p = this.busy.then(async () => {
      try { this.open(); return await fn(); } catch (e) { this.close(); throw e; }
    });
    this.busy = p.catch(() => {});
    return p;
  }

  send(bytes64) {
    const buf = Buffer.alloc(65);
    Buffer.from(bytes64).copy(buf, 1, 0, 64);
    this.cfg.sendFeatureReport([...buf]);
  }
  get() { return Buffer.from(this.cfg.getFeatureReport(0, 65)); }

  async command(cmd, arg = 0, count = 0) {
    const h = Buffer.alloc(64);
    h[0] = 0x04; h[1] = cmd; h[2] = arg; h[8] = count;
    this.send(h);
    await sleep(8);
    return this.get();
  }

  // header + N data packets (each 64 bytes). Last packet of a block ends with AA 55.
  async writeBlock(cmd, blob, arg = 0) {
    const n = Math.ceil(blob.length / 64);
    await this.command(CMD.BEGIN);
    await this.command(cmd, arg, n);
    for (let i = 0; i < n; i++) {
      const p = Buffer.alloc(64);
      blob.copy(p, 0, i * 64, i * 64 + 64);
      this.send(p);
      await sleep(4);
    }
    await this.command(CMD.END);
  }

  static block(packets) {
    const b = Buffer.alloc(packets * 64);
    b[b.length - 2] = 0xaa; b[b.length - 1] = 0x55;
    return b;
  }

  // ---------- lighting ----------
  // mode 0..19 or 0x80 (custom per-key). brightness 0..5, speed 0..5, direction 0..3
  setLighting({ mode, r = 255, g = 255, b = 255, random = false, brightness = 5, speed = 3, direction = 0 }) {
    return this.run(async () => {
      const p = SK80.block(1);
      // LED Off: the official driver sends mode 0 with every field zeroed (brightness 0).
      // Sending mode 0 with brightness > 0 makes the keyboard show the per-key colours instead.
      if (mode !== 0) {
        p[0] = mode; p[1] = r; p[2] = g; p[3] = b;
        p[8] = random ? 1 : 0; p[9] = brightness; p[10] = speed; p[11] = direction;
      }
      await this.writeBlock(CMD.LIGHT_MODE, p);
      await this.command(CMD.APPLY_LIGHT);
    });
  }

  // colors: { [lightIndex]: [r,g,b] } — saved to the custom mode and activated
  setCustomColors(colors, { brightness = 5 } = {}) {
    return this.run(async () => {
      const blob = SK80.block(9);
      for (let i = 0; i < 144; i++) {
        if (i * 4 + 3 >= blob.length - 2) break;
        const c = colors[i];
        if (!c) continue;
        blob[i * 4] = i; blob[i * 4 + 1] = c[0]; blob[i * 4 + 2] = c[1]; blob[i * 4 + 3] = c[2];
      }
      await this.writeBlock(CMD.CUSTOM_COLORS, blob);
      const p = SK80.block(1);
      p[0] = MODE_CUSTOM; p[1] = 255; p[8] = 1; p[9] = brightness; p[10] = 5;
      await this.writeBlock(CMD.LIGHT_MODE, p);
      await this.command(CMD.APPLY_LIGHT);
    });
  }

  // live preview, not saved. entries: [[lightIndex,r,g,b], ...]
  previewColors(entries) {
    return this.run(async () => {
      const blob = Buffer.alloc(8 * 64);
      entries.slice(0, 128).forEach((e, k) => {
        const off = Math.floor(k / 16) * 64 + (k % 16) * 4;
        blob[off] = e[0]; blob[off + 1] = e[1]; blob[off + 2] = e[2]; blob[off + 3] = e[3];
      });
      // same sequence as the official driver: header (+ack), 8 packets ~4 ms apart, then END (+ack)
      await this.command(CMD.PREVIEW_COLORS, 0, 8);
      for (let i = 0; i < 8; i++) { this.send(blob.subarray(i * 64, i * 64 + 64)); await sleep(4); }
      await this.command(CMD.END);
    });
  }

  // ---------- key mapping ----------
  // map: { [keyIndex]: {type, a, b, c} } ; type 0 = default, 2 = keyboard(a=modifiers, b=usage),
  // 3 = consumer (16-bit usage little-endian in a,b), 6 = macro (a = macro number)
  setKeymap(map, layer = 'top') {
    return this.run(async () => {
      const blob = SK80.block(9);
      for (const [k, v0] of Object.entries(map)) {
        const i = Number(k) * 4;
        if (i + 3 >= blob.length - 2) continue;
        const v = v0.type === 6 && v0.play ? { ...v0, ...SK80.macroPlay(v0.play).slot } : v0;
        blob[i] = v.type; blob[i + 1] = v.a || 0; blob[i + 2] = v.b || 0; blob[i + 3] = v.c || 0;
      }
      await this.writeBlock(layer === 'fn' ? CMD.FN_KEYMAP : CMD.KEYMAP, blob);
    });
  }

  // ---------- macros ----------
  // How a play mode is stored — verified on the keyboard: it lives in the key slot, not the macro record.
  // slot b: 0 = play once, 1 = repeat c times, 2 = loop until the key is pressed again.
  // (b = 3 loops forever with no way to stop it, so it is never used.)
  static macroPlay(play) {
    const mode = play && play.mode;
    if (mode === 'times') return { header: [0, 0], slot: { b: 1, c: Math.max(1, Math.min(255, play.times | 0 || 1)) } };
    if (mode === 'toggle') return { header: [0, 0], slot: { b: 2, c: 0 } };
    return { header: [0, 0], slot: { b: 0, c: 0 } };
  }

  // macros: [{events:[{kind:'down'|'up', usage} | {kind:'delay', ms}], play}] (plain arrays also accepted)
  static encodeMacros(macros) {
    macros = macros.map((m) => (Array.isArray(m) ? { events: m } : m));
    const table = 400; // offset table (driver stored the first macro at 0x190)
    const events = [];
    const offsets = [];
    let pos = table;
    for (const mac of macros) {
      const m = mac.events;
      offsets.push(pos);
      const body = Buffer.alloc(8 + m.length * 4);
      body.writeUInt16LE(m.length, 0);
      if (mac.play) { const h = SK80.macroPlay(mac.play).header; body[2] = h[0]; body[3] = h[1]; }
      m.forEach((e, j) => {
        let v;
        if (e.kind === 'delay') v = (0x5 << 28) | (Math.min(e.ms, 0xffffff) & 0xffffff);
        else v = ((e.kind === 'down' ? 0xb : 0x3) << 28) | ((e.usage & 0xff) << 16);
        body.writeUInt32LE(v >>> 0, 8 + j * 4);
      });
      events.push(body);
      pos += body.length;
    }
    const total = pos + 2;
    const packets = Math.max(9, Math.ceil(total / 64));
    const blob = SK80.block(packets);
    offsets.forEach((o, i) => blob.writeUInt16LE(o, i * 4));
    let p = table;
    for (const b of events) { b.copy(blob, p); p += b.length; }
    return blob;
  }

  setMacros(macros) {
    return this.run(async () => {
      await this.command(0x19);
      await this.writeBlock(CMD.MACROS, SK80.encodeMacros(macros));
    });
  }

  // ---------- screen ----------
  // frames: array of Buffer (RGB565 LE, 160x96), delays in units of 10 ms
  uploadScreen(frames, delays) {
    return this.run(async () => {
      const f = SK80.find();
      if (!f.scr) throw new Error('Interface da tela não encontrada');
      const head = Buffer.alloc(256, 0xff);
      head[0] = frames.length;
      delays.forEach((d, i) => { head[1 + i] = Math.max(1, Math.min(255, d)); });
      const data = Buffer.concat([head, ...frames]);
      const pages = Math.ceil(data.length / SCREEN_PAGE);
      await this.command(CMD.BEGIN);
      const h = Buffer.alloc(64);
      h[0] = 0x04; h[1] = CMD.SCREEN; h[2] = 0x02; h[7] = (pages >> 8) & 0xff; h[8] = pages & 0xff;
      this.send(h); await sleep(8); this.get();
      const scr = new HID.HID(f.scr.path);
      try {
        for (let i = 0; i < pages; i++) {
          const page = Buffer.alloc(SCREEN_PAGE + 1);
          data.copy(page, 1, i * SCREEN_PAGE, i * SCREEN_PAGE + SCREEN_PAGE);
          const t0 = Date.now();
          scr.write([...page]);
          if (this.onProgress) this.onProgress(i + 1, pages);
          // the keyboard writes each page to flash; the official driver paces ~130 ms per page
          await sleep(Math.max(0, 135 - (Date.now() - t0)));
        }
      } finally { scr.close(); }
      await sleep(150);
      await this.command(CMD.END);
      await sleep(300);
      // same settings packet the official driver sends after an upload (switches the TFT to the animation)
      const s = SK80.block(1);
      s[6] = 0x02; s[8] = 0x01;
      await this.command(CMD.BEGIN);
      await this.command(CMD.SETTINGS, 1, 1);
      this.send(s); await sleep(8); this.get();
      await this.command(CMD.END);
    });
  }
}

module.exports = { SK80, MODES, MODE_CUSTOM, SCREEN_W, SCREEN_H, FRAME_BYTES };
