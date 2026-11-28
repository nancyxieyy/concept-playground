const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { runtime, visible, texts, root } = require('./helpers/polish-runtime.cjs');

test('胶囊文字至少 20px，标签不旋转，长标签仍有一致内边距', () => {
  const { I, scene } = runtime(); const s = scene();
  for (const kind of ['peach', 'mint', 'cool', 'dim', 'cream', 'file']) {
    const tag = I.ui.tag(s, 0, 0, '我的作品', kind);
    const label = tag.list.find(o => o.type === 'text');
    assert.ok(parseFloat(label.style.fontSize) >= 20);
    assert.equal(tag.angle, 0); assert.equal(label.angle, 0);
    assert.equal(tag.width - label.width, 36);
    tag.setKind('mint', '机器人出门 · 过关');
    assert.equal(tag.width - label.width, 36);
    const surface = tag.list[0].commands.filter(c => c[0] === 'fillRoundedRect')[2];
    assert.equal(surface[5], tag.height / 2);
  }
  const forced = I.ui.label(s, 0, 0, '测试', { font: 8 });
  assert.equal(forced.style.fontSize, '20px');
});

test('面包屑等高、等字号、保持水平，分隔符不压文字', () => {
  const { I, scene } = runtime(); const s = scene();
  const bar = I.ui.breadcrumb(s, 360, 156, ['桌面', '我的作品', '画画']);
  for (let current = 0; current < 3; current++) {
    bar.setIndex(current);
    bar.cells.forEach((c, i) => {
      assert.equal(c.height, 46); assert.equal(c.angle, 0);
      assert.equal(c.list.find(o => o.type === 'text').style.fontSize, '24px');
      if (i) {
        const sep = bar.list.filter(o => o.text === '›')[i - 1];
        assert.equal(sep.style.color, '#8C6950');
        assert.equal(sep.style.fontFamily, 'Arial, sans-serif');
        assert.equal(sep.y, c.y); assert.equal(sep.originY, 0.5);
        assert.equal(sep.x - sep.width / 2 - (bar.cells[i - 1].x + bar.cells[i - 1].width / 2), 12);
        assert.equal(c.x - c.width / 2 - (sep.x + sep.width / 2), 12);
      }
    });
  }
  assert.equal(texts(s).filter(o => o.text === '›').length, 2);
});

test('进度珠等距、数字居中；未开始、当前、完成各有自己的颜色与圈线', () => {
  const { I, scene } = runtime(); const s = scene();
  for (const n of [2, 3]) {
    const track = I.ui.beadTrack(s, n);
    const dots = track.list.slice(1, n + 1);
    const count = track.list.at(-1);
    for (let index = 0; index <= n; index++) {
      track.setIndex(index);
      assert.equal(count.y, 0); assert.equal(count.originY, 0.5);
      assert.ok(Math.abs(track.width - count.x - count.width - 18) < 0.001);
      assert.equal(dots[0].x - 18, 18);
      dots.forEach((d, i) => {
        assert.equal(d.y, 0); if (i) assert.equal(d.x - dots[i - 1].x, 42);
        const ring = d.commands.find(c => c[0] === 'lineStyle');
        if (i < index) assert.deepEqual(ring, ['lineStyle', 3, 0xFFFFFF, 1]);
        else if (i === index) assert.deepEqual(ring, ['lineStyle', 4, 0x6FB7D6, 1]);
        else assert.equal(ring, undefined);
      });
    }
  }
});

test('星豆胶囊和结算奖励共用排版，图标、数字、星豆文字不会叠在一起', () => {
  const { I, scene } = runtime(); const s = scene();
  for (const withLabel of [false, true]) {
    const pill = I.ui.beanPill(s, 0, 0, { label: withLabel });
    for (const count of [0, 12, 999, '+3']) {
      pill.alignRight(1096);
      pill.setCount(count);
      assert.ok(Math.abs(pill.x + pill.width / 2 - 1096) < 0.001);
      const [face, icon, label] = pill.list;
      assert.ok(label.x - (icon.x + icon.displayWidth / 2) >= 10);
      assert.ok(pill.width / 2 - label.x - label.width >= 20 - 0.001);
      assert.equal(label.y, icon.y);
      assert.equal(pill.height, withLabel ? 52 : 64);
      assert.ok(face.commands.some(c => c[0] === 'fillStyle' && c[1] === 0xD9A93E));
    }
  }
});

test('任务牌和气泡不含文件后缀；物品小标签保留；新文案在字体子集中', () => {
  const { I, scene } = runtime(); const s = scene();
  const task = I.ui.taskPlate(s);
  I.LEVELS.forEach(cfg => {
    cfg.tasks.forEach(line => {
      assert.ok(Array.from(line).length <= 15);
      assert.doesNotMatch(line, /\.(png|mp3|txt|html)/i);
      task.setText(line);
      const text = task.list.find(o => o.type === 'text');
      assert.equal(text.text, line); assert.equal(text.x, 0); assert.equal(text.y, 0);
      assert.ok(task.x - task.width / 2 > 320 && task.x + task.width / 2 < 990);
    });
    for (const line of [...Object.values(cfg.hints), ...Object.values(cfg.bubbles), cfg.concept.line]) assert.doesNotMatch(line, /\.(png|mp3|txt|html)/i);
  });
  task.setText('找到小猫.png');
  assert.equal(task.list.find(o => o.type === 'text').text, '找到小猫');
  const bubble = I.ui.bubble(s, '打开故事.txt', true);
  assert.equal(bubble.list.find(o => o.type === 'text').text, '打开故事');
  const tag = I.ui.tag(s, 0, 0, '小猫.png', 'file');
  assert.equal(tag.list.find(o => o.type === 'text').text, '小猫.png');
  const subset = new Set(fs.readFileSync(path.join(root, 'assets/ui-v1/fonts/subset-chars.txt'), 'utf8'));
  const added = Array.from('把小猫的照片找出来›').filter(c => !subset.has(c));
  assert.deepEqual(added, []);
});

test('第 2 关三轮及内层：只出现一条路径，每个可见面板都有文件或文件夹', () => {
  for (const screen of [{ round: 1 }, { round: 2 }, { round: 3 }, { round: 3, view: 'works' }, { round: 3, view: 'draw' }]) {
    const { I, scene } = runtime(); const s = scene(screen);
    I.IMPL.files.create(s, I.LEVELS[1]);
    assert.equal(texts(s).filter(o => o.text === '桌面').length, 1);
    const panels = s.all.filter(o => o.key === 'ui-panel-9slice' && visible(o));
    assert.equal(panels.length, screen.round === 1 || screen.view ? 1 : 0);
    const names = texts(s).map(o => o.text);
    if (screen.round === 1) for (const name of ['小猫.png', '生日歌.mp3', '我的故事.txt', '接星星.html']) assert.ok(names.includes(name));
    if (screen.view === 'works') for (const name of ['画画', '我的故事.txt', '接星星.html']) assert.ok(names.includes(name));
    if (screen.view === 'draw') assert.ok(names.includes('小猫.png'));
    for (const label of texts(s)) assert.ok(parseFloat(label.style.fontSize) >= 20);
    if (!screen.view) I.IMPL.files._boxes.forEach(b => {
      assert.equal(b.tag.x, 0); assert.equal(b.y + b.tag.y, 666);
      assert.equal(b.tag.angle, 0);
      assert.ok(Math.abs(b.tag.y - 23 - b.list[1].displayHeight / 2 - 10) < 0.001);
      assert.ok(parseFloat(b.tag.list.find(o => o.type === 'text').style.fontSize) >= 22);
    });
    I.IMPL.files.destroy();
  }
});

test('正常第 2 关仍可排序、搬箱子、打开两层找到猫，结束时没有空面板', () => {
  const { I, scene } = runtime(''); const s = scene();
  I.IMPL.files.create(s, I.LEVELS[1]);
  for (let i = 0; i < 4; i++) s.coach.demo();
  assert.equal(s.taskText, I.LEVELS[1].tasks[1]);
  assert.equal(s.all.filter(o => o.key === 'ui-panel-9slice' && visible(o)).length, 0);
  s.coach.demo();
  assert.equal(s.taskText, I.LEVELS[1].tasks[2]);
  // 使用真实双击处理器，逐层进入。
  const works = I.IMPL.files._boxes[2];
  function dbl(o) { o.emit('pointerup', { worldX: o.x, worldY: o.y }); o.emit('pointerup', { worldX: o.x, worldY: o.y }); s.flush(); }
  dbl(works);
  const innerDraw = s.all.find(o => o.type === 'container' && o.parentContainer && o.list.some(v => v.key === 'prop-crate-peach'));
  assert.ok(visible(innerDraw)); dbl(innerDraw);
  const cat = s.all.find(o => o.type === 'container' && o.list.some(v => v.key === 'prop-file-cat') && !o.meta);
  assert.ok(visible(cat)); dbl(cat); assert.equal(s.won, true);
});

test('四关每轮都能搭建并清理；程序格、卡片文字至少 20px，退出无引用错误', () => {
  const { I, scene } = runtime();
  I.LEVELS.forEach(cfg => cfg.tasks.forEach((task, i) => {
    const s = scene({ round: i + 1 });
    I.IMPL[cfg.id].create(s, cfg);
    assert.equal(s.taskText, task);
    texts(s).forEach(o => { assert.ok(parseFloat(o.style.fontSize) >= 20, o.text); assert.equal(o.angle, 0); });
    I.IMPL[cfg.id].destroy();
  }));
});

test('第四关重复卡：数值框与加减按钮、“次”字之间留有空隙', () => {
  const { I, scene } = runtime(); const s = scene({ round: 2, view: 'controls' });
  I.IMPL.turtle.create(s, I.LEVELS[3]);
  const well = s.all.find(o => o.key === 'ui-value-well' && o.y === 600);
  const buttons = s.all.filter(o => o.type === 'container' && o.y === 600 && ['plus', 'minus'].includes(o._key));
  const unit = texts(s).find(o => o.text === '次');
  assert.equal(buttons.length, 2);
  assert.ok(buttons[0].x + 32 < well.x - well.displayWidth / 2);
  assert.ok(well.x + well.displayWidth / 2 < buttons[1].x - 32);
  assert.ok(buttons[1].x + 32 < unit.x);
});

test('巡检双参数门控；仅 debug 或仅 qa 均不启动；存档不读写、不重置', () => {
  for (const search of ['', '?debug=1', '?qa=tour', '?debug=0&qa=tour']) {
    const { I } = runtime(search); assert.equal(I.QA_TOUR, false); assert.equal(I.qa, undefined);
  }
  const { I, saved, load } = runtime('?debug=1&qa=tour&reset=1');
  saved.set('island2:v1', '{"levels":{"door":{"cleared":true,"stars":2}}}');
  load('store.js');
  assert.equal(I.store.totalStars(), 0);
  const before = [...saved];
  I.store.clearLevel('files', 3); I.store.markIntro(); I.store.setMuted(true); I.store.reset();
  assert.deepEqual([...saved], before);
});

test('完整巡检序列：地图、每轮、内层和四张结算卡；每屏 2500ms，退出清定时器', () => {
  const { I, scene, context } = runtime();
  const seen = [];
  I.qa.screens.forEach((screen, i) => {
    const s = scene(screen);
    s.showCard = stars => { assert.equal(stars, 3); s.result = true; };
    s.scene = { start(name, data) { s.next = { name, data }; } };
    I.qa.ready(s);
    seen.push(context.document.title);
    assert.equal(context.document.title, 'qa:' + screen.name);
    assert.equal(s.input.enabled, false);
    assert.equal(s.coach.armed, false);
    assert.equal(s.timers[0].delay, 2500);
    if (screen.result) assert.ok(s.result);
    s.timers[0].fn();
    const next = I.qa.screens[(i + 1) % I.qa.screens.length];
    assert.equal(s.next.name, next.scene); assert.equal(s.next.data.qaScreen, next);
    s.events.emit('shutdown'); assert.equal(s.timers[0].removed, true);
  });
  assert.equal(seen[0], 'qa:map'); assert.ok(seen.includes('qa:files-r3'));
  assert.equal(seen.filter(n => /-result$/.test(n)).length, 4);
  I.LEVELS.forEach(cfg => cfg.tasks.forEach((_, i) => assert.ok(seen.includes('qa:' + cfg.id + '-r' + (i + 1)))));
});
