// 小型场景替身：执行真实 UI/关卡代码，记录文字、几何和可见性，不模拟像素渲染。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const root = path.resolve(__dirname, '../..');
const packSource = fs.readFileSync(path.join(root, 'src/pack.js'), 'utf8');
const pack = JSON.parse(packSource.slice(packSource.indexOf('Island.PACK = ') + 14).trim().replace(/;$/, ''));
function textureSize(key) {
  if (!pack[key]) return [100, 100];
  const bytes = Buffer.from(pack[key].split(',')[1], 'base64');
  if (bytes.readUInt32BE(0) === 0x89504e47) return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  return [100, 100];
}
function runtime(search = '?debug=1&qa=tour') {
  const saved = new Map();
  const context = vm.createContext({
    window: { matchMedia: () => ({ matches: false }), addEventListener() {} },
    location: new URL('file:///game/index.html' + search), URL, URLSearchParams, console,
    document: { title: '电脑小岛' },
    localStorage: { getItem: k => saved.get(k), setItem: (k, v) => saved.set(k, v), removeItem: k => saved.delete(k) },
    performance: { now: () => 1 }, requestAnimationFrame: f => f(),
    Phaser: { Scene: class {}, Geom: { Rectangle: class { static Contains() {} }, Circle: class { static Contains() {} } }, Math: { Clamp: (v, a, b) => Math.max(a, Math.min(b, v)) } }
  });
  const load = f => vm.runInContext(fs.readFileSync(path.join(root, 'src', f), 'utf8'), context);
  load('config.js'); load('store.js'); load('ui.js'); load('levels/levels.js');
  const I = context.window.Island;
  I.sfx = { play() {}, hover() {} };
  I.fx = { tween(scene, o, props, opt = {}) { Object.assign(o, props); if (opt.onComplete) opt.onComplete(); }, pop() {}, ring() {}, sparks() {}, stars() {} };
  I.drag = { make(scene, o, opt) { o.dragOptions = opt; }, park(o, x, y) { o.setPosition(x, y); } };
  I.state = 'PLAY';
  for (const f of ['l1_door', 'l2_files', 'l3_robot', 'l4_turtle']) load('levels/' + f + '.js');
  load('qa.js');
  function scene(qaScreen) {
    const s = { all: [], timers: [], events: new EventEmitter(), qaScreen, input: { enabled: true }, sys: { isActive: () => true }, textures: { exists: () => true } };
    class Obj extends EventEmitter {
      constructor(type, x = 0, y = 0) {
        super(); Object.assign(this, { scene: s, type, x, y, width: 0, height: 0, visible: true, alpha: 1, rotation: 0, angle: 0, scaleX: 1, scaleY: 1, originX: 0.5, originY: 0.5, list: [], commands: [] }); s.all.push(this);
      }
      setPosition(x, y) { Object.assign(this, { x, y }); return this; }
      setSize(width, height) { Object.assign(this, { width, height }); return this; }
      setDisplaySize(w, h) { this.scaleX = w / this.width; this.scaleY = h / this.height; return this; }
      get displayWidth() { return this.width * this.scaleX; }
      get displayHeight() { return this.height * this.scaleY; }
      setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; }
      setOrigin(x, y = x) { this.originX = x; this.originY = y; return this; }
      setTexture(key) { this.key = key; const [w, h] = textureSize(key); this.setSize(w, h); this.frame = { width: w, height: h }; return this; }
      setText(text) {
        this.text = text; const font = parseFloat(this.style.fontSize);
        // 保守的字宽，只用于内边距和相交检查，不能替代真实字体截图。
        this.width = Array.from(String(text)).reduce((n, c) => n + font * (c.charCodeAt(0) > 255 ? 1 : 0.6), 0);
        this.height = font * 1.2; return this;
      }
      setColor(color) { this.style.color = color; return this; }
      add(objects) { for (const o of Array.isArray(objects) ? objects : [objects]) { if (o.parentContainer) o.parentContainer.list = o.parentContainer.list.filter(v => v !== o); this.list.push(o); o.parentContainer = this; } return this; }
      addAt(o, index) { this.add(o); this.list.pop(); this.list.splice(index, 0, o); return this; }
      destroy() { this.emit('destroy'); this.scene = null; this.visible = false; if (this.parentContainer) this.parentContainer.list = this.parentContainer.list.filter(o => o !== this); this.list.slice().forEach(o => o.destroy()); }
      clear() { this.commands = []; return this; }
    }
    for (const method of ['fillStyle', 'fillRoundedRect', 'lineStyle', 'lineBetween', 'fillCircle', 'strokeCircle', 'strokeRoundedRect', 'beginPath', 'moveTo', 'lineTo', 'strokePath']) Obj.prototype[method] = function (...args) { this.commands.push([method, ...args]); return this; };
    for (const [method, prop] of [['setVisible', 'visible'], ['setAlpha', 'alpha'], ['setDepth', 'depth'], ['setAngle', 'angle'], ['setRotation', 'rotation'], ['setFlipX', 'flipX']]) Obj.prototype[method] = function (v) { this[prop] = v; return this; };
    for (const m of ['setShadow', 'setInteractive', 'disableInteractive', 'setTint', 'clearTint']) Obj.prototype[m] = function () { return this; };
    s.add = {
      container: (x, y) => new Obj('container', x, y),
      text: (x, y, text, style) => { const o = new Obj('text', x, y); o.style = style; return o.setText(text); },
      graphics: (cfg = {}) => new Obj('graphics', cfg.x || 0, cfg.y || 0),
      image: (x, y, key) => new Obj('image', x, y).setTexture(key),
      nineslice: (x, y, key, _, w, h) => { const o = new Obj('nineslice', x, y); o.key = key; return o.setSize(w, h); },
      rectangle: (x, y, w, h) => new Obj('rectangle', x, y).setSize(w, h),
      ellipse: (x, y, w, h) => new Obj('ellipse', x, y).setSize(w, h),
      circle: (x, y, r) => new Obj('circle', x, y).setSize(r * 2, r * 2)
    };
    s.time = { now: 1, delayedCall(delay, fn) { const t = { delay, fn, removed: false, remove() { this.removed = true; } }; s.timers.push(t); return t; } };
    s.flush = (limit = 1000) => { let steps = 0; while (s.timers.some(t => !t.removed && t.delay <= limit)) { if (++steps > 100) throw Error('timer loop'); const t = s.timers.find(t => !t.removed && t.delay <= limit); t.removed = true; t.fn(); } };
    s.tweens = { add(spec) { if (spec.onComplete) spec.onComplete(); }, killTweensOf() {} };
    s.hud = s.add.container(0, 0); s.flash = s.add.rectangle(0, 0, 1, 1);
    s.lucky = { setLook() {}, nod() {}, say() {}, confused() {}, root: s.add.container(0, 0) };
    s.coach = { touch() {}, streak: 0 };
    s.api = { setTask(text) { s.taskText = text; }, placeLucky() {}, setStep(opt) { Object.assign(s.coach, opt); }, intro() {}, playable: () => true, good() {}, miss() {}, say() {}, win() { s.won = true; } };
    return s;
  }
  return { I, context, load, scene, saved };
}
function visible(o) { return !!o.scene && o.visible && (!o.parentContainer || visible(o.parentContainer)); }
function texts(s) { return s.all.filter(o => o.type === 'text' && visible(o)); }
module.exports = { runtime, visible, texts, root };
