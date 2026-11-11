/* 第 12 关：AI 是看例子学会的（训练和测试）。
   把小猫小狗的卡片放进“猫”“狗”两个框里教 AI，再出一张考题看它怎么猜。
   这里的 AI 是一个真的小模型：先看哪几样最能分开猫和狗，再找最像的几张例子来投票。 */
(function () {
  'use strict';
  const FEATS = ['ear', 'col', 'size', 'tail', 'wh'];
  const FNAME = { ear: '耳朵', col: '颜色', size: '大小', tail: '尾巴', wh: '胡子' };
  // 说“因为它……”用的话，和说“一只……的都没有”用的话
  const SAY = {
    ear: { P: ['耳朵是尖的', '尖耳朵'], F: ['耳朵是垂下来的', '垂耳朵'] },
    col: { W: ['是白色的', '白色'], O: ['是橘色的', '橘色'], B: ['是黑色的', '黑色'], G: ['是灰色的', '灰色'] },
    size: { S: ['个子小小的', '小个子'], L: ['个子大大的', '大个子'] },
    tail: { T: ['尾巴细细长长', '细尾巴'], U: ['尾巴蓬蓬的', '蓬尾巴'] },
    wh: { L: ['胡子长长的', '长胡子'], S: ['胡子短短的', '短胡子'] },
  };
  const KIND = { cat: '猫', dog: '狗', fox: '狐狸' };
  const FUR = { W: '#f8f6ef', O: '#f29a3a', B: '#2b2b33', G: '#9aa3ad' };
  const MUZ = { W: '#ffffff', O: '#f8c890', B: '#5a5a66', G: '#c8cdd4' };
  const NAVY = '#1b2440';

  let uid = 0;
  // 'PWSTL' = 耳朵 颜色 大小 尾巴 胡子
  function mk(kind, code) {
    return { id: ++uid, kind, ear: code[0], col: code[1], size: code[2], tail: code[3], wh: code[4], tilt: (Math.random() - 0.5) * 0.12 };
  }
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const chance = (p, a, b) => (Math.random() < p ? a : b);
  function randCat() { return mk('cat', 'P' + pick('WOBG') + chance(0.8, 'S', 'L') + chance(0.85, 'T', 'U') + chance(0.85, 'L', 'S')); }
  function randDog() { return mk('dog', chance(0.7, 'F', 'P') + pick('WOBG') + chance(0.65, 'L', 'S') + chance(0.7, 'U', 'T') + chance(0.8, 'S', 'L')); }
  const sig = (c) => c.kind + FEATS.map((f) => c[f]).join('');

  const PRESETS = {
    three: { cats: ['POSTL', 'PGSTL'], dogs: ['FWLUS'] },
    white: { cats: ['PWSTL', 'PWSTL', 'PWSTL', 'PWSTL'], dogs: ['PBSTL', 'FGLUS', 'FOLUS', 'FBSUS'] },
    many: {
      cats: ['PWSTL', 'POSTL', 'PBSTL', 'PGSTL', 'POLTL', 'PGSTS', 'POSUL', 'PBLTL'],
      dogs: ['FWLUS', 'FOLUS', 'FBLUS', 'FGSUS', 'PBLUS', 'PGLUS', 'FWSTS', 'FOLTS'],
    },
  };

  // ---------- 小模型 ----------
  function train(cats, dogs) {
    if (!cats.length || !dogs.length) return null;
    const w = {};
    for (const f of FEATS) {
      const vals = new Set([...cats, ...dogs].map((c) => c[f]));
      let tv = 0;
      for (const v of vals) {
        const pc = cats.filter((c) => c[f] === v).length / cats.length;
        const pd = dogs.filter((c) => c[f] === v).length / dogs.length;
        tv += Math.abs(pc - pd);
      }
      w[f] = 0.15 + tv / 2; // 越能分开猫和狗的地方，看得越重
    }
    return { w, cats, dogs };
  }
  function dist(m, a, b) { let d = 0; for (const f of FEATS) if (a[f] !== b[f]) d += m.w[f]; return d; }
  function predict(m, test) {
    const all = m.cats.map((c) => ({ c, lab: 'cat' })).concat(m.dogs.map((c) => ({ c, lab: 'dog' })));
    all.forEach((e) => { e.d = dist(m, e.c, test); });
    all.sort((a, b) => a.d - b.d);
    const near = all.slice(0, Math.min(3, all.length));
    const sc = { cat: 0, dog: 0 };
    near.forEach((e) => { sc[e.lab] += 1 / (e.d + 0.25); });
    const lab = sc.cat >= sc.dog ? 'cat' : 'dog';
    const conf = Math.min(95, Math.round((sc[lab] / (sc.cat + sc.dog)) * 20) * 5); // 不说 100%：它从来不能完全确定
    // 说理由：在最像的那张例子里，找一样“最重要、又一样”的地方
    const nb = near.find((e) => e.lab === lab).c;
    let best = null;
    for (const f of FEATS) if (test[f] === nb[f] && (!best || m.w[f] > m.w[best])) best = f;
    let why = best ? '因为它' + SAY[best][test[best]][0] + '，和你给我看的' + KIND[lab] + '很像。' : '我也说不清，就是觉得有一点像' + KIND[lab] + '。';
    const other = lab === 'cat' ? m.dogs : m.cats;
    if (best && other.length >= 2 && !other.some((c) => c[best] === test[best])) {
      why += '你给我看的' + KIND[lab === 'cat' ? 'dog' : 'cat'] + '里，一只' + SAY[best][test[best]][1] + '的都没有。';
    }
    return { lab, conf, why };
  }

  // ---------- 画小动物 ----------
  function drawCreature(ctx, c, cx, cy, S) {
    const u = (S / 2) * (c.size === 'L' ? 1 : 0.8);
    const fur = FUR[c.col], muz = MUZ[c.col];
    const fox = c.kind === 'fox', dogLike = c.kind !== 'cat';
    ctx.save();
    ctx.translate(cx, cy + (c.size === 'L' ? 0 : S * 0.08));
    ctx.rotate(c.tilt || 0);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const lw = Math.max(1.2, u * 0.07);
    const P = (x, y) => [x * u, y * u];
    const fillStroke = (fill) => { ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = NAVY; ctx.lineWidth = lw; ctx.stroke(); };
    const ell = (x, y, rx, ry, rot) => { ctx.beginPath(); ctx.ellipse(x * u, y * u, rx * u, ry * u, rot || 0, 0, Math.PI * 2); };
    // 尾巴
    if (c.tail === 'T') {
      ctx.beginPath(); ctx.moveTo(...P(0.55, 0.25)); ctx.quadraticCurveTo(...P(1.0, 0.2), ...P(0.82, -0.32));
      ctx.strokeStyle = NAVY; ctx.lineWidth = u * 0.16; ctx.stroke();
      ctx.strokeStyle = fur; ctx.lineWidth = u * 0.09; ctx.stroke();
    } else {
      ell(0.72, 0.02, fox ? 0.22 : 0.17, fox ? 0.4 : 0.32, 0.5); fillStroke(fur);
      if (fox) { ell(0.85, -0.25, 0.12, 0.12, 0); fillStroke('#ffffff'); }
    }
    // 腿
    for (const lx of [-0.28, -0.08, 0.28, 0.46]) {
      ctx.beginPath(); ctx.rect(lx * u, 0.42 * u, 0.13 * u, 0.33 * u); fillStroke(fur);
    }
    // 身体
    ell(0.12, 0.3, 0.5, 0.3, 0); fillStroke(fur);
    if (fox) { ell(-0.2, 0.36, 0.15, 0.2, 0); ctx.fillStyle = '#ffffff'; ctx.fill(); }
    // 尖耳朵画在头后面
    if (c.ear === 'P') {
      for (const tri of [[[-0.66, -0.28], [-0.6, -0.74], [-0.38, -0.42]], [[-0.3, -0.44], [-0.1, -0.74], [-0.04, -0.3]]]) {
        ctx.beginPath(); ctx.moveTo(...P(...tri[0])); ctx.lineTo(...P(...tri[1])); ctx.lineTo(...P(...tri[2])); ctx.closePath(); fillStroke(fur);
      }
    }
    // 头
    ell(-0.35, -0.12, 0.33, 0.31, 0); fillStroke(fur);
    // 垂耳朵盖在头两边
    if (c.ear === 'F') {
      ell(-0.64, -0.06, 0.1, 0.24, 0.3); fillStroke(c.col === 'W' ? '#e6dccb' : fur);
      ell(-0.08, -0.06, 0.1, 0.24, -0.3); fillStroke(c.col === 'W' ? '#e6dccb' : fur);
    }
    // 眼睛
    for (const ex of [-0.48, -0.25]) {
      if (c.col === 'B') { ell(ex, -0.18, 0.085, 0.085, 0); ctx.fillStyle = '#ffffff'; ctx.fill(); }
      ell(ex, -0.18, 0.055, 0.06, 0); ctx.fillStyle = NAVY; ctx.fill();
      ell(ex - 0.015, -0.2, 0.018, 0.018, 0); ctx.fillStyle = '#ffffff'; ctx.fill();
    }
    // 嘴巴鼻子
    if (dogLike) {
      const len = fox ? 0.24 : 0.17;
      ell(-0.56 - (fox ? 0.06 : 0), 0.02, len, 0.11, 0); fillStroke(muz);
      ell(-0.56 - (fox ? 0.06 : 0) - len + 0.03, -0.01, 0.055, 0.045, 0); ctx.fillStyle = NAVY; ctx.fill();
    } else {
      ctx.beginPath(); ctx.moveTo(...P(-0.42, -0.06)); ctx.lineTo(...P(-0.33, -0.06)); ctx.lineTo(...P(-0.375, 0.0)); ctx.closePath();
      ctx.fillStyle = '#ff8fa8'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(...P(-0.375, 0.0)); ctx.lineTo(...P(-0.375, 0.06)); ctx.strokeStyle = NAVY; ctx.lineWidth = lw * 0.8; ctx.stroke();
    }
    // 胡子
    ctx.strokeStyle = c.col === 'B' ? '#dddddd' : NAVY; ctx.lineWidth = Math.max(0.8, lw * 0.6);
    const wx = dogLike ? -0.5 : -0.4;
    const len = c.wh === 'L' ? 0.42 : 0.13;
    for (const dy of [-0.06, 0.02, 0.1]) {
      if (c.wh === 'S' && dy === 0.02) continue;
      ctx.beginPath(); ctx.moveTo(...P(wx - 0.08, 0.02)); ctx.lineTo(...P(wx - 0.08 - len, 0.02 + dy * (c.wh === 'L' ? 1.4 : 0.6))); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(...P(wx + 0.1, 0.02)); ctx.lineTo(...P(wx + 0.1 + len, 0.02 + dy * (c.wh === 'L' ? 1.4 : 0.6))); ctx.stroke();
    }
    ctx.restore();
  }
  function drawCard(ctx, x, y, w, h, c, ink, hi) {
    ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = hi || ink; ctx.lineWidth = hi ? 3.5 : 2;
    PG.roundRect(ctx, x, y, w, h, Math.min(10, w * 0.18)); ctx.fill(); ctx.stroke();
    drawCreature(ctx, c, x + w / 2 + w * 0.04, y + h / 2 + h * 0.02, Math.min(w, h) * 0.86);
  }
  function wrap(ctx, text, maxW) {
    const lines = []; let cur = '';
    for (const ch of text) {
      if (ctx.measureText(cur + ch).width > maxW && cur) { lines.push(cur); cur = ch; } else cur += ch;
    }
    if (cur) lines.push(cur);
    return lines;
  }
  const font = (px, bold) => (bold ? 'bold ' : '') + px + 'px ' + getComputedStyle(document.body).fontFamily;

  PG.register({
    id: 'ai',
    no: 12,
    title: '教 AI 认猫狗',
    concept: 'AI 是怎么学会的（训练和测试）',
    kid: 'AI 是看很多例子学会的，没见过的、例子太少太偏的，它就容易错',
    level: 'K2、K6',
    color: 'tomato',
    play: '把上面的卡片拖进“猫”或“狗”的框里（也可以点一下卡片，再点框），这就是在教 AI。看最下面：AI 会猜考题卡是猫还是狗。',

    mount(api) {
      const W = 480, H = 360;
      const s = api.stage(W, H);
      const ctx = s.ctx;
      const h = api.h;

      let tray = [], cats = [], dogs = [], test = null, model = null, guess = null;
      let mode = 'teach', selected = 0, drag = null, found = new Set(), pulse = 0, flyers = [];
      const BOX = { cat: { x: 8, y: 92, w: 228, h: 122 }, dog: { x: 244, y: 92, w: 228, h: 122 } };
      const TEST = { x: 8, y: 222, w: 104, h: 130 };

      // ---------- 控件 ----------
      const modeCtl = api.choice({
        label: '现在做什么', value: 'teach',
        options: [{ value: 'teach', label: '教 AI' }, { value: 'find', label: '找错：让 AI 认错' }],
        onChange: (v) => { mode = v; editor.hidden = v !== 'find'; rFound.el.hidden = v !== 'find'; setModeHint(); },
      });
      const teachRow = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px' } });
      api.controlBox.append(teachRow);
      api.button('放进「猫」', () => place('cat'), '', teachRow);
      api.button('放进「狗」', () => place('dog'), '', teachRow);
      api.button('换一张考题', () => newTest(), 'primary', teachRow);

      const presetBox = h('div', { class: 'ctl' }, h('span', { class: 'lab' }, '一下子换一组例子'));
      const presetRow = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px' } });
      presetBox.append(presetRow);
      api.controlBox.append(presetBox);
      api.button('只给 3 张', () => preset('three'), '', presetRow);
      api.button('所有猫都是白的', () => preset('white'), '', presetRow);
      api.button('给很多不同的', () => preset('many'), '', presetRow);
      api.button('全部清空', () => resetAll(), '', presetRow);

      const rTaught = api.readout('教了几张', 0);
      const rFound = api.readout('找到 AI 认错的', 0);
      rFound.el.hidden = true;

      // 找错用的“考题卡”编辑器
      const editor = h('div', { class: 'ctl', hidden: true, style: { gap: '10px' } },
        h('span', { class: 'lab' }, '自己做一张考题卡'),
        h('span', { class: 'small' }, '想一想：什么样的卡，AI 会认错？'));
      api.controlBox.append(editor);
      let syncing = false;
      const ed = {};
      const edit = (key, label, options) => {
        ed[key] = api.choice({
          label, options, value: null, parent: editor,
          onChange: (v) => { if (syncing) return; test = { ...test, [key]: v, id: ++uid }; update(); },
        });
      };
      edit('kind', '它其实是', [{ value: 'cat', label: '猫' }, { value: 'dog', label: '狗' }, { value: 'fox', label: '狐狸' }]);
      edit('ear', '耳朵', [{ value: 'P', label: '尖' }, { value: 'F', label: '垂' }]);
      edit('col', '颜色', [{ value: 'W', label: '白' }, { value: 'O', label: '橘' }, { value: 'B', label: '黑' }, { value: 'G', label: '灰' }]);
      edit('size', '大小', [{ value: 'S', label: '小' }, { value: 'L', label: '大' }]);
      edit('tail', '尾巴', [{ value: 'T', label: '细长' }, { value: 'U', label: '蓬松' }]);
      edit('wh', '胡子', [{ value: 'L', label: '长' }, { value: 'S', label: '短' }]);
      function syncEditor() {
        syncing = true;
        for (const k of Object.keys(ed)) ed[k].set(test[k]);
        syncing = false;
      }

      function setModeHint() {
        api.setHint(mode === 'find'
          ? '找错：在右边自己做一张考题卡，想办法让 AI 认错。每找到一种新的认错，就记一个。'
          : '把上面的卡片拖进“猫”或“狗”的框里（也可以点一下卡片，再点框）。看最下面：AI 会猜考题卡是猫还是狗。');
      }

      // ---------- 规则 ----------
      function freshTray(n) {
        const list = [];
        for (let i = 0; i < n; i++) list.push(i % 2 ? randDog() : randCat());
        for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
        return list;
      }
      function update() {
        model = train(cats, dogs);
        guess = model && test ? predict(model, test) : null;
        rTaught.set(cats.length + dogs.length);
        pulse = 0.4;
        if (mode === 'find' && guess && guess.lab !== test.kind) {
          const k = sig(test);
          if (!found.has(k)) {
            found.add(k); rFound.set(found.size);
            api.sound('win'); api.toast('抓到一个！AI 认错了');
          }
        }
      }
      function place(lab, idx) {
        const i = idx == null ? selected : idx;
        const c = tray[i];
        if (!c) { api.toast('卡都教完啦，点“换一组例子”再来'); return; }
        tray.splice(i, 1);
        (lab === 'cat' ? cats : dogs).push(c);
        selected = Math.min(selected, Math.max(0, tray.length - 1));
        api.sound(model ? 'pop' : 'ding');
        update();
      }
      function unplace(lab, i) {
        const list = lab === 'cat' ? cats : dogs;
        const [c] = list.splice(i, 1);
        tray.unshift(c); selected = 0;
        api.sound('boing'); update();
      }
      function newTest(c) {
        test = c || (Math.random() < 0.5 ? randCat() : randDog());
        syncEditor(); api.sound('tick'); update();
      }
      function preset(name) {
        const p = PRESETS[name];
        cats = p.cats.map((x) => mk('cat', x));
        dogs = p.dogs.map((x) => mk('dog', x));
        tray = freshTray(8); selected = 0;
        api.sound('ding'); update();
      }
      function resetAll() {
        cats = []; dogs = []; tray = freshTray(10); selected = 0; found = new Set(); rFound.set(0);
        update();
      }

      // ---------- 摸一摸 ----------
      const trayRect = (i) => ({ x: 10 + i * 78, y: 8, w: 64, h: 74 });
      const inR = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
      const miniRect = (box, i) => ({ x: box.x + 8 + (i % 7) * 31, y: box.y + 26 + Math.floor(i / 7) * 31, w: 28, h: 28 });
      api.on(s.canvas, 'pointerdown', (e) => {
        const p = s.pos(e);
        for (let i = 0; i < Math.min(6, tray.length); i++) {
          if (inR(p, trayRect(i))) {
            drag = { i, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false };
            try { s.canvas.setPointerCapture(e.pointerId); } catch (err) { /* 没关系 */ }
            return;
          }
        }
        for (const lab of ['cat', 'dog']) {
          const list = lab === 'cat' ? cats : dogs;
          for (let i = 0; i < list.length; i++) if (inR(p, miniRect(BOX[lab], i))) { unplace(lab, i); return; }
          if (inR(p, BOX[lab])) { place(lab); return; }
        }
        if (inR(p, TEST) && mode === 'teach') newTest();
      });
      api.on(s.canvas, 'pointermove', (e) => {
        if (!drag) return;
        const p = s.pos(e);
        drag.x = p.x; drag.y = p.y;
        if (Math.hypot(p.x - drag.sx, p.y - drag.sy) > 6) drag.moved = true;
      });
      const endDrag = () => {
        if (!drag) return;
        const d = drag; drag = null;
        if (!d.moved) { selected = d.i; api.sound('tick'); return; }
        for (const lab of ['cat', 'dog']) if (inR(d, BOX[lab])) { place(lab, d.i); return; }
      };
      api.on(s.canvas, 'pointerup', endDrag);
      api.on(s.canvas, 'pointercancel', () => { drag = null; });
      api.on(window, 'keydown', (e) => {
        const onBtn = e.target && e.target.closest && e.target.closest('button, input, a, textarea, select');
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          selected = Math.max(0, Math.min(Math.min(6, tray.length) - 1, selected + (e.key === 'ArrowLeft' ? -1 : 1)));
          api.sound('tick');
        } else if (e.key === 'c' || e.key === 'C' || e.key === '1') place('cat');
        else if (e.key === 'd' || e.key === 'D' || e.key === '2') place('dog');
        else if ((e.key === 'Enter' || e.key === ' ') && !onBtn) { e.preventDefault(); newTest(); }
      });

      // ---------- 画 ----------
      api.loop((dt, t) => {
        pulse = Math.max(0, pulse - dt);
        const ink = api.color('--ink'), line = api.color('--line'), card = api.color('--card'),
          tomato = api.color('--tomato'), sky = api.color('--sky'), sun = api.color('--sun'), grass = api.color('--grass'), grape = api.color('--grape');
        s.clear();

        // 还没教的卡
        ctx.font = font(12); ctx.fillStyle = ink;
        if (!tray.length) {
          ctx.font = font(15); ctx.fillText('卡都教完啦！可以在右边换一组例子。', 16, 50);
        }
        for (let i = 0; i < Math.min(6, tray.length); i++) {
          if (drag && drag.moved && drag.i === i) continue;
          const r = trayRect(i);
          const lift = i === selected ? -3 + Math.sin(t * 5) * 1.5 : 0;
          drawCard(ctx, r.x, r.y + lift, r.w, r.h, tray[i], ink, i === selected ? tomato : null);
        }
        if (tray.length > 6) {
          ctx.fillStyle = ink; ctx.font = font(12); ctx.textAlign = 'right';
          ctx.fillText('还有 ' + (tray.length - 6) + ' 张', W - 6, 88); ctx.textAlign = 'left';
        }

        // 两个框
        for (const lab of ['cat', 'dog']) {
          const b = BOX[lab], list = lab === 'cat' ? cats : dogs;
          const over = drag && drag.moved && inR(drag, b);
          ctx.fillStyle = over ? (lab === 'cat' ? 'rgba(255,90,71,.18)' : 'rgba(47,124,246,.18)') : card;
          ctx.strokeStyle = lab === 'cat' ? tomato : sky; ctx.lineWidth = over ? 4 : 3;
          ctx.setLineDash(list.length ? [] : [7, 6]);
          PG.roundRect(ctx, b.x, b.y, b.w, b.h, 12); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = ink; ctx.font = font(17, true);
          ctx.fillText((lab === 'cat' ? '猫' : '狗') + '（' + list.length + '）', b.x + 10, b.y + 20);
          if (!list.length) {
            ctx.font = font(13); ctx.fillStyle = ink; ctx.globalAlpha = 0.6;
            ctx.fillText('把' + (lab === 'cat' ? '猫' : '狗') + '的卡放进来', b.x + 50, b.y + 72); ctx.globalAlpha = 1;
          }
          list.slice(0, 21).forEach((c, i) => { const r = miniRect(b, i); drawCard(ctx, r.x, r.y, r.w, r.h, c, ink); });
        }

        // 考题卡
        ctx.fillStyle = ink; ctx.font = font(12);
        drawCard(ctx, TEST.x, TEST.y + 16, TEST.w, TEST.h - 16, test, ink, sun);
        ctx.fillStyle = ink; ctx.font = font(14, true); ctx.fillText('考题', TEST.x + 2, TEST.y + 11);
        if (mode === 'teach') { ctx.font = font(11); ctx.textAlign = 'right'; ctx.fillText('点我换一张', TEST.x + TEST.w, TEST.y + 11); ctx.textAlign = 'left'; }

        // AI 的话
        const bx = 120, by = 222, bw = 352, bh = 80;
        ctx.fillStyle = card; ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
        PG.roundRect(ctx, bx, by, bw, bh, 12); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bx, by + 30); ctx.lineTo(bx - 8, by + 38); ctx.lineTo(bx, by + 44); ctx.fillStyle = card; ctx.fill();
        ctx.fillStyle = ink;
        if (!guess) {
          ctx.font = font(16, true);
          const need = !cats.length && !dogs.length ? '我还什么都没学过，教我几张吧！'
            : !cats.length ? '我还没见过猫，再教我几张猫吧。' : '我还没见过狗，再教我几张狗吧。';
          ctx.fillText('AI：' + need, bx + 12, by + 30, bw - 24);
          ctx.font = font(13); ctx.globalAlpha = 0.7;
          ctx.fillText('猫和狗都要教，它才能比一比。', bx + 12, by + 56); ctx.globalAlpha = 1;
        } else {
          const sc = 1 + pulse * 0.3;
          ctx.save(); ctx.translate(bx + 12, by + 26); ctx.scale(sc, sc);
          ctx.font = font(18, true);
          ctx.fillText('AI：我觉得是' + KIND[guess.lab] + '，有 ' + guess.conf + '% 把握', 0, 0);
          ctx.restore();
          ctx.font = font(13);
          const lines = wrap(ctx, guess.why, bw - 24).slice(0, 2);
          lines.forEach((l, i) => ctx.fillText(l, bx + 12, by + 46 + i * 16));
          // 对不对
          const ok = guess.lab === test.kind;
          const verdict = ok ? '✓ 认对了' : test.kind === 'fox' ? '✗ 其实是小狐狸！它只认识猫和狗' : '✗ 认错了！其实是' + KIND[test.kind];
          ctx.font = font(13, true); ctx.fillStyle = ok ? grass : tomato; ctx.textAlign = 'right';
          ctx.fillText(verdict, bx + bw - 10, by + bh - 4); ctx.textAlign = 'left';
          // 把握条
          ctx.fillStyle = line; ctx.fillRect(bx + 12, by + bh - 12, 120, 6);
          ctx.fillStyle = guess.lab === 'cat' ? tomato : sky; ctx.fillRect(bx + 12, by + bh - 12, 120 * guess.conf / 100, 6);
        }

        // AI 看哪里最多
        ctx.fillStyle = ink; ctx.font = font(12);
        ctx.fillText('AI 最看重哪里：', 120, 320);
        FEATS.forEach((f, i) => {
          const x = 214 + i * 52, base = 352;
          const v = model ? model.w[f] / 1.15 : 0;
          ctx.fillStyle = line; ctx.fillRect(x, base - 30, 34, 30);
          ctx.fillStyle = grape; ctx.fillRect(x, base - 30 * v, 34, 30 * v);
          ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.strokeRect(x, base - 30, 34, 30);
          ctx.fillStyle = ink; ctx.font = font(12); ctx.textAlign = 'center';
          ctx.fillText(FNAME[f], x + 17, 318); ctx.textAlign = 'left';
        });

        // 正在拖的卡
        if (drag && drag.moved && tray[drag.i]) {
          ctx.save(); ctx.translate(drag.x, drag.y); ctx.rotate(Math.sin(t * 8) * 0.06);
          drawCard(ctx, -36, -40, 72, 82, tray[drag.i], ink, tomato); ctx.restore();
        }
      });

      // ---------- 猜一猜 ----------
      const blackCat = () => mk('cat', 'PBSTL');
      api.guesses([
        {
          q: '只教 AI 看白色的猫。来了一只黑猫，AI 会说它是什么？',
          options: ['猫', '狗', '它会说“不知道”'], answer: 1,
          why: '它看到的猫全是白的，就以为“白的才是猫”。黑黑的这只，反而像它见过的那只小黑狗。看下面的柱子：它最看重“颜色”。',
          apply: () => { modeCtl.set('teach'); preset('white'); newTest(blackCat()); },
        },
        {
          q: '怎么让 AI 更聪明，不再把黑猫认成狗？',
          options: ['再多给它几张白猫', '给它更多、各种各样的例子', '让它多猜几次'], answer: 1,
          why: '见过白猫、橘猫、黑猫、灰猫，它就知道颜色不重要，要看耳朵和胡子。同一只黑猫，这次认对了。',
          apply: () => { modeCtl.set('teach'); preset('many'); newTest(blackCat()); },
        },
        {
          q: '来了一只它从没见过的小狐狸。AI 会怎么说？',
          options: ['“这是狐狸”', '在猫和狗里挑一个', '“我不认识它”'], answer: 1,
          why: '它只学过猫和狗，只会在这两个里选，还挺有把握——它不知道自己不知道。',
          apply: () => { if (!model) preset('many'); newTest(mk('fox', 'POLUS')); },
        },
      ]);

      api.say({
        left: 'AI 的训练',
        right: '让它看很多例子；例子太少、太偏，或者没见过，它就容易认错',
        example: '只给 AI 看白猫，它就以为白的才是猫，看到黑猫反而说是狗。',
        prompt: '我的作品里用到 AI 的地方，它是看什么例子学会的？帮我想 3 个它可能认错的东西，先不要改。',
      });

      resetAll();
      newTest(mk('cat', 'POSTL'));
      setModeHint();
    },

    thumb(ctx, w, h, t) {
      const ink = NAVY;
      const cat = { kind: 'cat', ear: 'P', col: 'W', size: 'S', tail: 'T', wh: 'L', tilt: Math.sin(t * 2) * 0.05 };
      const dog = { kind: 'dog', ear: 'F', col: 'O', size: 'L', tail: 'U', wh: 'S', tilt: Math.sin(t * 2 + 1) * 0.05 };
      const blk = { kind: 'cat', ear: 'P', col: 'B', size: 'S', tail: 'T', wh: 'L', tilt: 0 };
      drawCard(ctx, 30, 40, 80, 90, cat, ink);
      drawCard(ctx, 210, 40, 80, 90, dog, ink);
      const y = 120 + Math.sin(t * 2) * 6;
      drawCard(ctx, 125, y - 30, 70, 76, blk, ink, '#ffd43b');
      ctx.fillStyle = '#fff'; ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
      PG.roundRect(ctx, 110, 14, 100, 34, 10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ink; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(Math.floor(t) % 2 ? '是狗？' : '是猫？', 160, 38); ctx.textAlign = 'left';
    },
  });
})();
