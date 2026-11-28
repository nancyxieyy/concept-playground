/* 离线几何回归；不替代 Chrome 中的截图和鼠标拖放验收。运行：node --test tests/m1-layout.test.cjs */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const root = path.resolve(__dirname, '..');

function load(dpr = 1) {
  const errors = [];
  const context = vm.createContext({
    window: { devicePixelRatio: dpr, matchMedia: () => ({ matches: false }) },
    location: { search: '' }, URLSearchParams,
    console: { error: message => errors.push(message) },
    Phaser: { Scene: class {}, Geom: { Rectangle: { Contains() {} } } }
  });
  for (const file of ['config.js', 'layout.js', 'fx.js', 'ui.js', 'levels/levels.js', 'scenes/MapScene.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, 'src', file), 'utf8'), context);
  }
  return { Island: context.window.Island, window: context.window, errors, context };
}

function close(actual, expected) { assert.ok(Math.abs(actual - expected) < 0.00001, `${actual} ≠ ${expected}`); }
function box(left, top, width, height) { return { left, top, width, height, right: left + width, bottom: top + height }; }

// 只模拟 Camera 的尺寸、缩放和 centerOn 数学，执行的布局/转场代码来自 src。
function camera(density) {
  return {
    width: 1280 * density, height: 800 * density, zoom: 1, scrollX: 0, scrollY: 0,
    setZoom(z) { this.zoom = z; },
    centerOn(x, y) { this.scrollX = x - this.width / 2; this.scrollY = y - this.height / 2; }
  };
}

const sizes = [[900, 900], [1200, 900], [1232, 800], [1280, 800], [1440, 810], [1440, 720], [1440, 780], [655, 410]];
for (const dpr of [1, 2, 3]) {
  test(`DPR=${dpr}：八种窗口的完整画布、镜头投影和 HUD 固定`, () => {
    const { Island, window } = load(dpr);
    const density = Math.min(dpr, 2);
    assert.equal(Island.renderScale, density);
    for (const [width, height] of sizes) {
      window.innerWidth = width; window.innerHeight = height;
      const fit = Math.min(width / 1280, height / 800);
      const rect = box((width - 1280 * fit) / 2, (height - 800 * fit) / 2, 1280 * fit, 800 * fit);
      const scene = {
        game: { canvas: { getBoundingClientRect: () => rect, parentElement: { getBoundingClientRect: () => box(0, 0, width, height) } } },
        cameras: { main: camera(density) },
        hud: { setScale(s) { this.scale = s; } },
        flash: { setScale(s) { this.scale = s; } }
      };
      const visible = Island.layout.visibleRect(scene);
      close(visible.left, 0); close(visible.top, 0);
      close(visible.right, 1280); close(visible.bottom, 800);
      close(visible.centerX, 640); close(visible.centerY, 400);
      Island.fx.placeCam(scene.cameras.main, 640, 400, 1);
      // 边角及原先会被裁掉的操作区，投影后仍在窗口内。
      for (const [x, y] of [[0, 0], [1280, 800], [56, 52], [1224, 52], [1030, 458], [120, 310], [1170, 620]]) {
        const screen = Island.fx.screenOf(scene, x, y);
        close(screen.x, x); close(screen.y, y);
        assert.ok(rect.left + screen.x * fit >= -0.001 && rect.left + screen.x * fit <= width + 0.001);
        assert.ok(rect.top + screen.y * fit >= -0.001 && rect.top + screen.y * fit <= height + 0.001);
      }
      // 包含进出关卡和宝箱镜头；HUD 不得跟随镜头放大或移出画布。
      for (const zoom of [1, 1.12, 1.45, 1.6]) {
        Island.fx.placeCam(scene.cameras.main, 1025, 249, zoom);
        Island.fx.pin(scene);
        for (const [x, y] of [[56, 52], [640, 78], [1224, 52], [1080, 730]]) {
          const screen = Island.fx.screenOf(scene, scene.hud.x + x * scene.hud.scale, scene.hud.y + y * scene.hud.scale);
          close(screen.x, x); close(screen.y, y);
        }
        const center = Island.fx.screenOf(scene, scene.flash.x, scene.flash.y);
        close(center.x, 640); close(center.y, 400);
      }
    }
  });
}

test('可见矩形按实际交集换算，能识别旧 ENVELOP 裁边', () => {
  const { Island, window } = load();
  window.innerWidth = 900; window.innerHeight = 900;
  const scene = { game: { canvas: {
    getBoundingClientRect: () => box(-270, 0, 1440, 900),
    parentElement: { getBoundingClientRect: () => box(0, 0, 900, 900) }
  } } };
  const r = Island.layout.visibleRect(scene);
  close(r.left, 240); close(r.right, 1040); close(r.centerX, 640);
});

test('resize 重新布局，退出场景后移除监听，多次进入不累积', () => {
  const { Island } = load();
  let current = { left: 0 };
  Island.layout.visibleRect = () => current;
  const scale = new EventEmitter();
  for (let i = 0; i < 8; i++) {
    const scene = { scale, events: new EventEmitter() };
    let calls = 0;
    Island.layout.watch(scene, function (r) { assert.equal(this, scene); assert.equal(r, current); calls++; });
    current = { left: i + 1 };
    scale.emit('resize');
    assert.equal(calls, 2);
    scene.events.emit('shutdown');
    assert.equal(scale.listenerCount('resize'), 0);
  }
});

test('DPR=2 转场只插值设计倍率，不重复放大密度', () => {
  const { Island } = load(2);
  const cam = camera(2);
  let tween;
  const scene = { cameras: { main: cam }, sys: { isActive: () => true }, tweens: { add: spec => { tween = spec; } } };
  Island.fx.placeCam(cam, 640, 400, 1);
  Island.fx.glide(scene, 1.6, 262, 496, 620);
  close(tween.targets.zoom, 1);
  tween.targets.zoom = 1.3;
  tween.onUpdate({ progress: 0.5 });
  close(cam.zoom, 2.6);
  tween.onComplete();
  close(cam.zoom, 3.2);
});

test('实际启动配置使用 FIT，DPR=2 画布为 2560×1600', () => {
  const { Island, context } = load(2);
  let config;
  context.Phaser.AUTO = 'auto';
  context.Phaser.Scale = { FIT: 'fit', CENTER_BOTH: 'center' };
  context.Phaser.Game = class { constructor(c) { config = c; } };
  context.window.addEventListener = () => {};
  context.document = {};
  Island.sfx = { setMuted() {} };
  Island.store = { muted: () => true };
  vm.runInContext(fs.readFileSync(path.join(root, 'src/main.js'), 'utf8'), context);
  assert.equal(config.width, 2560);
  assert.equal(config.height, 1600);
  assert.equal(config.scale.mode, 'fit');
  assert.equal(config.scale.autoCenter, 'center');
});

test('四个圆台逐一对位，标签间距及底色不随解锁状态改变', () => {
  const { Island } = load();
  function object(x, y) {
    const o = new EventEmitter();
    Object.assign(o, { x, y, scaleX: 1, scaleY: 1 });
    for (const name of ['setDepth', 'setAlpha', 'setOrigin', 'setShadow', 'setSize', 'setInteractive', 'setVisible', 'setColor', 'add']) o[name] = () => o;
    o.setDisplaySize = (w, h) => { o.displayWidth = w; o.displayHeight = h; return o; };
    o.setTexture = key => { o.texture = key; return o; };
    o.setKind = kind => { o.kind = kind; return o; };
    return o;
  }
  Island.hit.rect = () => ({});
  Island.ui.nametag = (scene, x, y) => object(x, y);
  const centers = [[262, 496], [500, 502], [754, 431], [995, 397]];
  for (const state of ['locked', 'playable', 'cleared']) {
    Island.store = { isUnlocked: () => state !== 'locked', isCleared: () => state === 'cleared', starsOf: () => 3 };
    const scene = {
      add: { container: object, image: object, text: object }, nodes: [],
      paintNode: Island.MapScene.prototype.paintNode
    };
    Island.MapScene.prototype.buildNodes.call(scene);
    scene.nodes.forEach((node, i) => {
      close(node.x, centers[i][0]); close(node.y, centers[i][1]);
      close(node.tag.x, node.x);
      const gap = node.tag.y - 23 - (node.y + node.face.y + node.face.displayHeight / 2);
      assert.ok(gap >= 8 && gap <= 12, `第 ${i + 1} 个标签间距为 ${gap}`);
      assert.equal(node.tag.kind, 'peach');
    });
  }
});

test('HUD 按钮重定位后，悬停、按下和移出恢复新位置', () => {
  const { Island } = load();
  Island.state = 'PLAY';
  Island.hit.rect = () => ({});
  Island.sfx = { hover() {}, play() {} };
  function object(x, y) {
    const o = new EventEmitter();
    return Object.assign(o, {
      x, y, add() {}, setPosition(x, y) { this.x = x; this.y = y; return this; },
      setSize(w, h) { this.width = w; this.height = h; }, setScale() {}, setInteractive() {},
      setDisplaySize() { return this; }
    });
  }
  const scene = { add: { container: object, image: object } };
  const button = Island.ui.round(scene, 56, 52, 'back', () => {}, { states: ['PLAY'] });
  button.setHomePosition(90, 80);
  button.emit('pointerover'); close(button.y, 76);
  button.emit('pointerout'); close(button.y, 80);
  button.emit('pointerdown'); close(button.y, 85);
  button.emit('pointerout'); close(button.y, 80);
});

test('四关原有文案检查通过，离线入口引用全部存在', () => {
  const { errors } = load();
  assert.deepEqual(errors, []);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const match of html.matchAll(/(?:src="|url\(")([^"\)]+)/g)) {
    assert.ok(!/^(https?:)?\/\//.test(match[1]), `入口含远程依赖：${match[1]}`);
    assert.ok(fs.existsSync(path.join(root, match[1])), `缺失资源：${match[1]}`);
  }
});
