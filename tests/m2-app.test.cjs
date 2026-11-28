/* 离线行为回归：node --test tests/m2-app.test.cjs。不能替代 WKWebView 真机验收。 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');

function runtime(href = 'tauri://localhost/', saved = new Map()) {
  const events = new EventEmitter();
  const location = new URL(href);
  location.replace = value => { location.href = value; };
  location.reload = () => { location.reloads = (location.reloads || 0) + 1; };
  const context = vm.createContext({
    URL, URLSearchParams, location, console, setTimeout, clearTimeout,
    performance: { now: () => 1000 }, document: {},
    history: { replaceState: (_, title, value) => { location.href = new URL(value, location.href).href; } },
    localStorage: {
      getItem: key => saved.get(key) || null,
      setItem: (key, value) => saved.set(key, value),
      removeItem: key => saved.delete(key)
    },
    window: {
      matchMedia: () => ({ matches: false }),
      addEventListener: (name, fn) => events.on(name, fn),
      removeEventListener: (name, fn) => events.off(name, fn)
    },
    Phaser: { AUTO: 0, Scale: {}, Game: class {}, Geom: { Rectangle: { Contains() {} } } }
  });
  const load = name => vm.runInContext(fs.readFileSync(path.join(root, 'src', name), 'utf8'), context);
  load('config.js');
  const Island = context.window.Island;
  Island.renderScale = 1;
  Island.LEVELS = [{ id: 'one' }, { id: 'two' }, { id: 'three' }, { id: 'four' }];
  load('store.js');
  Island.sfx = { setMuted() {}, unlock() {}, play() {}, hover() {} };
  return { context, Island, load, events, location, saved };
}

function key(events, values) {
  const e = { key: '', code: '', repeat: false, preventDefault() { this.prevented = true; }, ...values };
  events.emit('keydown', e);
  return e;
}

test('两个关卡与静音写入后重新载入仍在；Cmd+R 不清进度，Shift+R 才清除', () => {
  const first = runtime();
  first.Island.store.clearLevel('one', 3, 0, 0);
  first.Island.store.clearLevel('two', 2, 1, 0);
  first.Island.store.setMuted(true);
  const second = runtime(undefined, first.saved);
  second.load('main.js');
  assert.equal(second.Island.store.totalStars(), 5);
  assert.equal(second.Island.store.isUnlocked(2), true);
  assert.equal(second.Island.store.muted(), true);
  assert.equal(key(second.events, { key: 'r', code: 'KeyR', metaKey: true }).prevented, undefined);
  assert.equal(runtime(undefined, first.saved).Island.store.totalStars(), 5);
  key(second.events, { key: 'R', code: 'KeyR', shiftKey: true });
  assert.equal(second.location.reloads, 1);
  assert.equal(runtime(undefined, first.saved).Island.store.totalStars(), 0);
  assert.deepEqual([...first.saved.keys()], ['island2:v1']);
});

test('Option 产生特殊字符仍能切换开关，刷新保留；关掉后不伪造通关记录', () => {
  for (const [code, char, param, value] of [
    ['KeyU', '¨', 'unlock', 'all'], ['KeyC', 'Ç', 'calm', '1'], ['KeyD', 'Î', 'debug', '1']
  ]) {
    for (const href of ['tauri://localhost/', 'file:///game/index.html']) {
      const r = runtime(href);
      r.load('main.js');
      key(r.events, { key: char, code, shiftKey: true, altKey: true });
      assert.equal(r.location.searchParams.get(param), value);
      const again = runtime(r.location.href, r.saved);
      assert.equal(again.Island.session.unlockAll, param === 'unlock');
      assert.equal(again.Island.MOTION.calm, param === 'calm');
      assert.equal(again.Island.DEBUG, param === 'debug');
      assert.equal(again.Island.store.totalStars(), 0);
      key(r.events, { key: char, code, shiftKey: true, altKey: true, repeat: true });
      assert.equal(r.location.searchParams.get(param), value);
      key(r.events, { key: char, code, shiftKey: true, altKey: true });
      assert.equal(r.location.searchParams.has(param), false);
      assert.equal(r.saved.size, 0);
    }
  }
});

test('原有网址参数继续生效；reset 用完从网址移除，后续重载不反复清档', () => {
  const r = runtime('tauri://localhost/?reset=1&unlock=all&calm=1&debug=1');
  assert.equal(r.location.searchParams.has('reset'), false);
  assert.equal(r.Island.session.unlockAll, true);
  assert.equal(r.Island.MOTION.calm, true);
  assert.equal(r.Island.DEBUG, true);
  r.Island.store.clearLevel('one', 3);
  assert.equal(runtime(r.location.href, r.saved).Island.store.totalStars(), 3);
});

test('等待三种本地字体后只启动一次；字体失败也能进入游戏', async () => {
  for (const reject of [false, true]) {
    const r = runtime();
    let starts = 0;
    const requests = [];
    r.context.Phaser.Game = class { constructor() { starts++; } };
    r.context.document.fonts = { load: (font, sample) => {
      requests.push([font, sample]);
      return reject ? Promise.reject(new Error('font')) : Promise.resolve([]);
    } };
    r.load('main.js');
    assert.equal(starts, 0);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(starts, 1);
    assert.equal(requests.length, 3);
    assert.ok(requests.every(([, sample]) => /[\u4e00-\u9fff]/.test(sample)));
  }
});

test('音频上下文只在手势时创建；恢复失败后，下次手势可再恢复 interrupted 状态', async () => {
  const r = runtime();
  let creates = 0;
  let resumes = 0;
  let audio;
  r.context.window.AudioContext = class {
    constructor() { creates++; audio = this; this.state = 'suspended'; }
    createGain() { return { gain: {}, connect() {} }; }
    createDynamicsCompressor() {
      return { threshold: {}, knee: {}, ratio: {}, attack: {}, release: {}, connect() {} };
    }
    resume() { resumes++; return Promise.reject(new Error('blocked')); }
  };
  r.load('sfx.js');
  r.load('main.js');
  assert.equal(creates, 0);
  r.events.emit('pointerdown');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(creates, 1);
  assert.equal(resumes, 1);
  audio.state = 'interrupted';
  key(r.events, { key: 'a' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(resumes, 2);
  assert.equal(creates, 1);
});

test('拖拽只跟随原指针；移出松手或失焦会复位，销毁后移除监听', () => {
  const r = runtime();
  r.load('drag.js');
  r.Island.state = 'PLAY';
  r.Island.hit.rect = () => ({});
  const obj = Object.assign(new EventEmitter(), {
    x: 100, y: 200, scaleX: 1, scaleY: 1, input: {},
    setInteractive() {}, setScale() {},
    setPosition(x, y) { this.x = x; this.y = y; }, setDepth(d) { this.depth = d; }
  });
  const scene = {
    input: Object.assign(new EventEmitter(), { setDefaultCursor() {} }),
    events: new EventEmitter()
  };
  let drops = 0;
  const drag = r.Island.drag.make(scene, obj, { onDrop() { drops++; } });
  const p = { id: 1, worldX: 100, worldY: 200 };
  for (const cancel of ['outside', 'blur']) {
    obj.emit('pointerdown', p);
    scene.input.emit('pointermove', { id: 2, worldX: 400, worldY: 400 });
    assert.equal(drag.dragging, false);
    scene.input.emit('pointermove', { ...p, worldX: 300 });
    assert.equal(drag.dragging, true);
    scene.input.emit('pointerup', { id: 2 });
    assert.equal(drag.down, true);
    if (cancel === 'outside') scene.input.emit('pointerupoutside', p);
    else r.events.emit('blur');
    assert.equal(drag.down, false);
    assert.equal(r.Island.drag.busy, false);
    assert.equal(obj.x, 100);
    assert.equal(obj.y, 200);
    assert.equal(drops, 0);
  }
  obj.emit('destroy');
  assert.equal(scene.input.listenerCount('pointerupoutside'), 0);
  assert.equal(r.events.listenerCount('blur'), 0);
  assert.equal(r.Island.drag.live.length, 0);
});

test('同步可从任意目录运行，清理旧产物，所有入口资源与根目录一致', () => {
  const sync = () => execFileSync(process.execPath, [path.join(root, 'app/scripts/sync-www.mjs')], { cwd: root });
  sync();
  const www = path.join(root, 'app/www');
  fs.writeFileSync(path.join(www, 'stale.txt'), 'stale');
  sync();
  assert.equal(fs.existsSync(path.join(www, 'stale.txt')), false);
  const html = fs.readFileSync(path.join(www, 'index.html'), 'utf8');
  for (const match of html.matchAll(/(?:src="|url\(")([^"\)]+)/g)) {
    assert.deepEqual(fs.readFileSync(path.join(www, match[1])), fs.readFileSync(path.join(root, match[1])));
  }
  for (const excluded of ['.git', '.codex-work', 'app', 'tests', 'core.js', 'core.css', 'assets/ui-v1/props']) {
    assert.equal(fs.existsSync(path.join(www, excluded)), false, excluded);
  }
  assert.ok(fs.existsSync(path.join(www, 'assets/ui-v1/fonts/OFL-ZCOOLKuaiLe.txt')));
});
