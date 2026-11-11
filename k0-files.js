/* 电脑小岛第 3 关：文件、文件夹和路径。
   一个小桌面：散着几个文件（画、歌、故事、游戏）和几个文件夹。拖文件进文件夹，快快点两下打开文件夹，
   上面的路径栏跟着变：桌面 → 我的作品 → 画画。四关：整理、文件夹搬进文件夹、照路径找文件、删掉再找回。 */
(function () {
  'use strict';
  const NAVY = '#1b2440';
  const W = 480, H = 400;
  const AREA = { x: 12, y: 58, w: 456, h: 256 };   // 文件夹里面
  const DOCK = { x: 8, y: 322, w: 464, h: 70 };     // 底下一条
  const BIN = { x: 392, y: 326, w: 76, h: 62 };     // 回收站 / 废纸篓
  const RESTORE = { x: 24, y: 200, w: 432, h: 100 }; // 回收站里：拖到这里放回原处
  const DBL = 0.6;
  const EXT = { png: '图片', mp3: '声音', txt: '文字', html: '网页' };
  const isMac = (() => { try { return /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || ''); } catch (e) { return false; } })();
  const BINNAME = isMac ? '废纸篓' : '回收站';
  const ROUND_NAME = ['整理桌面', '文件夹搬家', '照路径找', '删掉再找回'];
  const FIND_PATH = '桌面 → 我的作品 → 过程记录 → K2 认识AI';

  function typing(e) {
    const t = e.target;
    return !!(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || '')));
  }
  const inR = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

  // ---------- 画图标（游戏里和首页小图都用） ----------
  function drawFolder(ctx, cx, cy, sc, hot) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
    ctx.lineWidth = 2.5; ctx.strokeStyle = NAVY; ctx.lineJoin = 'round';
    ctx.fillStyle = hot ? '#ffe58a' : '#f5b82e';
    ctx.beginPath(); ctx.moveTo(-34, -22); ctx.lineTo(-12, -22); ctx.lineTo(-6, -15); ctx.lineTo(34, -15); ctx.lineTo(34, 24); ctx.lineTo(-34, 24); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = hot ? '#fff3c4' : '#ffd43b';
    ctx.beginPath(); ctx.moveTo(-34, -8); ctx.lineTo(34, -8); ctx.lineTo(34, 24); ctx.lineTo(-34, 24); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  function drawFile(ctx, type, cx, cy, sc) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
    ctx.lineWidth = 2.5; ctx.strokeStyle = NAVY; ctx.lineJoin = 'round';
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(-22, -28); ctx.lineTo(10, -28); ctx.lineTo(22, -16); ctx.lineTo(22, 28); ctx.lineTo(-22, 28); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, -28); ctx.lineTo(10, -16); ctx.lineTo(22, -16); ctx.stroke();
    if (type === 'draw') {
      ctx.fillStyle = '#9ad1ff'; ctx.fillRect(-15, -10, 30, 28); ctx.strokeRect(-15, -10, 30, 28);
      ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.arc(7, -3, 4, 0, 7); ctx.fill();
      ctx.fillStyle = '#1fb36f'; ctx.beginPath(); ctx.moveTo(-15, 18); ctx.lineTo(-4, 4); ctx.lineTo(6, 18); ctx.closePath(); ctx.fill();
    } else if (type === 'song') {
      ctx.fillStyle = '#8a5cf5';
      ctx.beginPath(); ctx.ellipse(-7, 14, 6, 5, -0.3, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(9, 10, 6, 5, -0.3, 0, 7); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#8a5cf5';
      ctx.beginPath(); ctx.moveTo(-2, 13); ctx.lineTo(-2, -10); ctx.lineTo(14, -14); ctx.lineTo(14, 9); ctx.stroke();
    } else if (type === 'game') {
      ctx.fillStyle = '#ff5a47'; PG.roundRect(ctx, -16, -4, 32, 20, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-11, 4, 9, 3); ctx.fillRect(-8, 1, 3, 9);
      ctx.beginPath(); ctx.arc(8, 6, 3, 0, 7); ctx.fill();
    } else {
      ctx.strokeStyle = '#8a93ad'; ctx.lineWidth = 2.5;
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-14, -12 + i * 8); ctx.lineTo(i === 4 ? 2 : 14, -12 + i * 8); ctx.stroke(); }
    }
    ctx.restore();
  }
  function drawBin(ctx, cx, cy, full, hot) {
    ctx.save(); ctx.translate(cx, cy);
    ctx.lineWidth = 2.5; ctx.strokeStyle = NAVY; ctx.lineJoin = 'round';
    if (full) { ctx.fillStyle = '#ffffff'; ctx.save(); ctx.rotate(-0.25); ctx.fillRect(-12, -24, 16, 20); ctx.strokeRect(-12, -24, 16, 20); ctx.restore(); }
    ctx.fillStyle = hot ? '#ffd43b' : '#c6d5e8';
    ctx.beginPath(); ctx.moveTo(-16, -10); ctx.lineTo(16, -10); ctx.lineTo(12, 20); ctx.lineTo(-12, 20); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.save(); if (hot) { ctx.translate(-18, -12); ctx.rotate(-0.5); ctx.translate(18, 12); }
    ctx.fillRect(-19, -16, 38, 6); ctx.strokeRect(-19, -16, 38, 6); ctx.restore();
    ctx.beginPath(); ctx.moveTo(-5, -3); ctx.lineTo(-4, 14); ctx.moveTo(5, -3); ctx.lineTo(4, 14); ctx.stroke();
    ctx.restore();
  }

  PG.register({
    id: 'files',
    title: '文件住在哪',
    concept: '文件、文件夹和路径',
    kid: '文件是一样东西，文件夹是装东西的书包，路径是一层一层怎么走到它',
    level: 'K0',
    color: 'grass',
    play: '这是一个小桌面。按住文件拖进文件夹；快快点两下打开文件夹；看最上面的路径栏，它告诉你现在走到哪一层了。',

    mount(api) {
      const s = api.stage(W, H);
      const ctx = s.ctx, cv = s.canvas;
      cv.setAttribute('tabindex', '0');
      cv.setAttribute('aria-label', '小桌面：文件和文件夹');
      cv.style.outline = 'none';
      const font = getComputedStyle(document.body).fontFamily;

      // ---------- 桌面上的东西 ----------
      let nodes = [];
      let view = 'desk', sel = null, round = 0, passed = 0, sub = 0;
      let drag = null, down = null, lastUp = null, clock = 0;
      let popup = null, banner = null, msg = null, timers = [], demo = null, ghost = null, allDone = false;
      let iconRects = [], segRects = [], backRect = null;

      const byId = (id) => nodes.find((n) => n.id === id);
      const kids = (id) => nodes.filter((n) => n.parent === id);
      const nameOf = (id) => (id === 'desk' ? '桌面' : id === 'trash' ? BINNAME : byId(id).name);
      function chain(id) { // 从桌面走到这里的一串
        if (id === 'trash') return ['trash'];
        const out = [];
        let c = id;
        while (c && c !== 'desk') { out.unshift(c); c = byId(c).parent; }
        out.unshift('desk');
        return out;
      }
      const pathText = (id) => chain(id).map(nameOf).join(' → ');
      const inside = (a, b) => { let c = byId(b); while (c) { if (c.id === a) return true; c = byId(c.parent); } return false; };

      function build(r) {
        const F = (id, name, parent) => ({ id, name, kind: 'folder', parent });
        const f = (id, name, type, parent) => ({ id, name, kind: 'file', type, ext: name.split('.').pop(), parent });
        nodes = [
          F('works', '我的作品', 'desk'), F('draw', '画画', 'desk'), F('music', '音乐', 'desk'),
          f('cat', '小猫.png', 'draw', 'desk'), f('song', '生日歌.mp3', 'song', 'desk'),
          f('story', '我的故事.txt', 'story', 'desk'), f('game', '接星星.html', 'game', 'desk'),
          F('log', '过程记录', 'works'), F('old', '旧东西', 'works'),
          f('k1', 'K1 程序.txt', 'story', 'log'), f('k2', 'K2 认识AI.txt', 'story', 'log'),
          f('doodle', '涂鸦.png', 'draw', 'old'),
        ];
        // 后面的关：前面几关已经做好
        if (r >= 1) { byId('cat').parent = 'draw'; byId('song').parent = 'music'; byId('story').parent = 'works'; byId('game').parent = 'works'; }
        if (r >= 2) moveNode(byId('draw'), 'works');
        if (r >= 3) nodes.push(f('draft', '草稿1.txt', 'story', 'desk'));
      }
      function moveNode(n, to) { n.parent = to; nodes = nodes.filter((x) => x !== n).concat([n]); }

      const HOME = { cat: 'draw', song: 'music', story: 'works', game: 'works' };
      const TASK = [
        '把桌面上的 4 个文件放进对的文件夹：画 → 画画，歌 → 音乐，故事和游戏 → 我的作品。',
        '把「画画」文件夹整个拖进「我的作品」。再快快点两下，一层一层打开，看看小猫.png 去哪了。',
        '照着这条路径找到文件，快快点两下打开它：' + FIND_PATH,
        '把「草稿1.txt」拖进' + BINNAME + '删掉。再点开' + BINNAME + '，把它拖回来（放回原处）。',
      ];
      const TIP = [
        '按住文件不放，拖到文件夹上，文件夹变亮了再松手。',
        '文件夹也能拖。拖进去以后，路径栏会告诉你走到哪一层。',
        '每打开一层，就看一眼上面的路径栏，和要找的路径对一对。点“上一层”能退回去。',
        '删除不是马上消失，是先扔进' + BINNAME + '。没清空之前，都能捡回来。',
      ];

      // ---------- 右边的控件 ----------
      const rRound = api.readout('第几关', '1 / 4');
      const rStar = api.readout('拿到的星', '0 / 4');
      const taskBox = api.h('p', { style: { font: '19px/1.45 var(--display)', margin: 0 } });
      const tipBox = api.h('p', { class: 'small' });
      api.controlBox.append(api.h('div', { class: 'ctl' }, api.h('span', { class: 'lab' }, '现在要做'), taskBox, tipBox));
      const jump = api.choice({
        label: '想练哪一关',
        options: ROUND_NAME.map((n, i) => ({ value: i, label: (i + 1) + ' ' + n })),
        value: 0,
        onChange: (v) => { stopDemo(); goRound(v); },
      });
      const restoreBtn = api.button('放回原处（先点一下要找回的文件）', () => {
        const n = sel && byId(sel);
        if (view !== 'trash' || !n || n.parent !== 'trash') { api.toast('先打开' + BINNAME + '，点一下要找回的文件'); return; }
        restore(n);
      });
      api.button('从头再来', () => { stopDemo(); passed = 0; rStar.set('0 / 4'); goRound(0); });
      api.controlBox.append(api.h('p', { class: 'small' },
        '键盘也行：← → 选一个，回车 = 打开，', isMac ? 'command+↑' : 'Backspace', ' = 上一层，',
        isMac ? 'command+delete' : 'Delete', ' = 删除。'));

      function goRound(r) {
        round = r; sub = 0; view = 'desk'; sel = null; drag = null; down = null; lastUp = null;
        popup = null; banner = null; msg = null; timers = []; allDone = false;
        const o = api.stageBox.querySelector('.overlay'); if (o) o.remove();
        build(r);
        rRound.set((r + 1) + ' / 4');
        taskBox.textContent = TASK[r];
        tipBox.textContent = TIP[r];
        restoreBtn.hidden = r !== 3;
        if (jump.get() !== r) jump.set(r);
      }
      function after(sec, fn) { timers.push({ t: sec, fn }); }
      function say(t, sec) { msg = { text: t, t: sec || 2.4 }; }

      function pass() {
        if (demo || banner || allDone) return;
        if (round + 1 > passed) { passed = round + 1; rStar.set(passed + ' / 4'); }
        if (round < 3) {
          api.sound('ding');
          banner = { text: '第 ' + (round + 1) + ' 关过关！', t: 1.6 };
          const next = round + 1;
          after(1.7, () => goRound(next));
        } else {
          api.sound('win'); allDone = true;
          after(1.2, () => api.overlay('全部完成！★ 会整理、会走路径、会从' + BINNAME + '找回东西了。点这里再玩一次', () => goRound(0)));
        }
      }
      function check() {
        if (round === 0) {
          if (Object.keys(HOME).every((k) => byId(k).parent === HOME[k])) pass();
        } else if (round === 1) {
          if (byId('draw').parent === 'works' && sub === 0) { sub = 1; if (!demo) say('「画画」搬进去了！快快点两下「我的作品」看看', 3); }
          if (byId('draw').parent === 'works' && view === 'draw') { if (!demo) say('小猫.png 跟着「画画」一起搬进来了', 3); pass(); }
        } else if (round === 3) {
          const d = byId('draft');
          if (d.parent === 'trash' && sub === 0) { sub = 1; if (!demo) say('扔进' + BINNAME + '了。点一下' + BINNAME + '打开它', 3); }
          if (d.parent === 'desk' && sub === 1) { sub = 2; pass(); }
        }
      }

      // ---------- 搬、开、删、找回 ----------
      function tryMove(n, to) {
        if (to === n.parent) return false;
        if (n.kind === 'folder' && (to === n.id || inside(n.id, to))) { say('文件夹不能放进它自己里面', 2); api.sound('boing'); return false; }
        if (!demo && round === 0 && HOME[n.id] && to !== 'desk' && to !== HOME[n.id]) {
          api.sound('boing');
          say(n.name + ' 是' + { draw: '一张画', song: '一首歌', story: '一个故事', game: '一个游戏' }[n.type] + '，应该放进「' + nameOf(HOME[n.id]) + '」', 2.6);
          return false;
        }
        if (!demo && round === 1 && n.id === 'draw' && to !== 'works') { api.sound('boing'); say('要拖进「我的作品」哦', 2); return false; }
        moveNode(n, to);
        api.sound('pop');
        if (to !== view) say(n.name + ' 放进了「' + nameOf(to) + '」', 1.8);
        check();
        return true;
      }
      function del(n) {
        if (!demo && round < 3) { api.sound('boing'); say('这一关先不删东西，第 4 关再试', 2.2); return; }
        n.from = n.parent; moveNode(n, 'trash'); sel = null;
        api.sound('buzz');
        check();
      }
      function restore(n) {
        let to = n.from || 'desk';
        if (to !== 'desk' && (!byId(to) || chain(to).length === 0 || byId(to).parent === 'trash')) to = 'desk';
        moveNode(n, to); n.from = null; sel = null;
        api.sound('ding');
        if (!demo) say('放回原处了：回到「' + nameOf(to) + '」', 2.4);
        check();
      }
      function open(n) {
        if (n.parent === 'trash') { api.sound('boing'); say('先放回原处，再打开', 2); return; }
        msg = null;
        if (n.kind === 'folder') { view = n.id; sel = null; api.sound('step'); check(); return; }
        popup = { n, t: 0 };
        api.sound(n.id === 'k2' ? 'win' : 'pop');
        if (round === 2 && n.id === 'k2') pass();
      }
      function goTo(id) {
        if (id === view) return;
        view = id; sel = null; api.sound('step'); check();
      }
      function up() {
        if (view === 'desk') { say('已经在最外面的桌面啦', 1.6); return; }
        goTo(view === 'trash' ? 'desk' : byId(view).parent);
      }

      // ---------- 位置 ----------
      function layout() {
        const list = kids(view);
        const cols = list.length <= 8 ? 4 : 5;
        const rows = Math.max(1, Math.ceil(list.length / cols));
        const cw = AREA.w / cols, ch = Math.min(124, (view === 'trash' ? 130 : AREA.h) / rows);
        const sc = Math.min(1, cw / 114, ch / 124);
        iconRects = list.map((n, i) => ({ n, x: AREA.x + (i % cols) * cw, y: AREA.y + Math.floor(i / cols) * ch, w: cw, h: ch, sc }));
      }
      function hitIcon(p) { return iconRects.find((r) => inR(p, r)) || null; }
      function hitSeg(p) { return segRects.find((r) => inR(p, r)) || null; }
      function iconCenter(id) { layout(); const r = iconRects.find((q) => q.n.id === id); return r ? { x: r.x + r.w / 2, y: r.y + 50 * r.sc } : { x: W / 2, y: H / 2 }; }

      // 拖的时候，下面是谁
      function dropTarget(p) {
        if (!drag) return null;
        if (inR(p, BIN) && view !== 'trash') return { kind: 'bin' };
        if (view === 'trash') return inR(p, RESTORE) ? { kind: 'restore' } : null;
        const sg = hitSeg(p);
        if (sg && sg.id !== 'trash' && sg.id !== view) return { kind: 'folder', id: sg.id };
        const ic = hitIcon(p);
        if (ic && ic.n.kind === 'folder' && ic.n !== drag.n) return { kind: 'folder', id: ic.n.id };
        return null;
      }

      // ---------- 按下、移动、松开（手指、鼠标、演示都走这里） ----------
      function press(p) {
        if (allDone && !demo) return;
        if (popup) { popup = null; down = null; return; }
        down = { x: p.x, y: p.y };
        layout();
        const ic = hitIcon(p);
        if (ic) { sel = ic.n.id; drag = { n: ic.n, sx: p.x, sy: p.y, x: p.x, y: p.y, moved: false }; down.icon = ic.n; return; }
        if (backRect && inR(p, backRect)) { down.back = true; return; }
        const sg = hitSeg(p); if (sg) { down.seg = sg.id; return; }
        if (inR(p, BIN)) { down.bin = true; return; }
        sel = null;
      }
      function moveTo(p) {
        if (!drag) return;
        drag.x = p.x; drag.y = p.y;
        if (Math.hypot(p.x - drag.sx, p.y - drag.sy) > 10) drag.moved = true;
      }
      function release(p) {
        if (!down) return;
        const d = down; down = null;
        const g = drag;
        const tg = g && g.moved ? dropTarget(p) : null;
        drag = null;
        if (g && g.moved) {
          if (!tg) { api.sound('step'); if (view === 'trash') say('拖到下面的框里，就能放回原处', 2.2); return; }
          if (tg.kind === 'bin') del(g.n);
          else if (tg.kind === 'restore') restore(g.n);
          else tryMove(g.n, tg.id);
          lastUp = null;
          return;
        }
        // 没拖动：单击或者双击
        const key = d.icon ? 'i:' + d.icon.id : d.back ? 'back' : d.seg ? 's:' + d.seg : d.bin ? 'bin' : 'none';
        const dbl = lastUp && lastUp.key === key && clock - lastUp.t < DBL && Math.hypot(p.x - lastUp.x, p.y - lastUp.y) < 30;
        lastUp = dbl ? null : { key, t: clock, x: p.x, y: p.y };
        if (d.back) { up(); return; }
        if (d.seg) { goTo(d.seg); return; }
        if (d.bin) { if (view !== 'trash') { goTo('trash'); if (round === 3 && sub === 1 && !demo) say('把草稿1.txt 拖到下面的框里，放回原处', 3); } return; }
        if (d.icon) {
          if (dbl) open(d.icon);
          else { api.sound('tick'); if (d.icon.kind === 'folder' && !demo) say('选中了。要打开，快快点两下', 1.6); }
        }
      }

      api.on(cv, 'pointerdown', (e) => {
        if (demo) return;
        try { cv.focus({ preventScroll: true }); } catch (err) { /* 没关系 */ }
        try { cv.setPointerCapture(e.pointerId); } catch (err) { /* 没关系 */ }
        press(s.pos(e));
      });
      api.on(cv, 'pointermove', (e) => {
        if (demo) return;
        const p = s.pos(e);
        moveTo(p);
        if (!drag) cv.style.cursor = hitIcon(p) || hitSeg(p) || inR(p, BIN) || (backRect && inR(p, backRect)) ? 'pointer' : 'default';
        else cv.style.cursor = 'grabbing';
      });
      api.on(cv, 'pointerup', (e) => { if (!demo) release(s.pos(e)); });
      api.on(cv, 'pointercancel', () => { if (!demo) { drag = null; down = null; } });

      api.on(window, 'keydown', (e) => {
        if (typing(e) || demo || allDone) return;
        const k = e.key;
        const isUp = (k === 'ArrowUp' && (e.metaKey || e.altKey)) || (k === 'Backspace' && !e.metaKey);
        const isDel = k === 'Delete' || (k === 'Backspace' && e.metaKey);
        if (!(['ArrowLeft', 'ArrowRight', 'Enter'].includes(k) || isUp || isDel)) return;
        const ae = document.activeElement;
        if (ae && (ae.tagName === 'BUTTON' || ae.tagName === 'A')) { if (k === 'Enter') return; ae.blur(); }
        e.preventDefault();
        if (popup) { popup = null; return; }
        layout();
        const list = iconRects.map((r) => r.n);
        const i = list.findIndex((n) => n.id === sel);
        if (k === 'ArrowLeft') { sel = list.length ? list[(i <= 0 ? list.length : i) - 1].id : null; api.sound('tick'); }
        else if (k === 'ArrowRight') { sel = list.length ? list[(i + 1) % list.length].id : null; api.sound('tick'); }
        else if (k === 'Enter') { if (i >= 0) open(list[i]); }
        else if (isDel) { if (i >= 0) { if (view === 'trash') restore(list[i]); else del(list[i]); } }
        else if (isUp) up();
      });

      // ---------- 演示（猜一猜用） ----------
      function runDemo(steps) { stopDemo(); demo = { steps, i: 0, t: 0, from: null, to: null }; ghost = { x: W / 2, y: H - 20, down: false }; }
      function stopDemo() { demo = null; ghost = null; drag = null; down = null; }
      function stepDemo(dt) {
        if (!demo) return;
        const st = demo.steps[demo.i];
        if (!st) { demo = null; after(1.4, () => { ghost = null; }); return; }
        if (st.move) {
          if (!demo.from) { demo.from = { x: ghost.x, y: ghost.y }; demo.to = typeof st.move === 'function' ? st.move() : st.move; }
          demo.t += dt;
          const k = Math.min(1, demo.t / st.dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          ghost.x = demo.from.x + (demo.to.x - demo.from.x) * e;
          ghost.y = demo.from.y + (demo.to.y - demo.from.y) * e;
          moveTo({ x: ghost.x, y: ghost.y });
          if (k >= 1) { demo.i++; demo.t = 0; demo.from = null; }
          return;
        }
        if (st.wait) { demo.t += dt; if (demo.t >= st.wait) { demo.i++; demo.t = 0; } return; }
        if (st.down) { ghost.down = true; press({ x: ghost.x, y: ghost.y }); }
        if (st.up) { ghost.down = false; release({ x: ghost.x, y: ghost.y }); }
        if (st.say) say(st.say, st.sec || 2.4);
        demo.i++; demo.t = 0;
      }
      const at = (id) => () => iconCenter(id);
      const dbl = (id, dur) => [{ move: at(id), dur: dur || 0.7 }, { down: 1 }, { up: 1 }, { wait: 0.1 }, { down: 1 }, { up: 1 }];

      // ---------- 画 ----------
      function label(text, cx, y, maxW, ink) {
        ctx.font = '14px ' + font; ctx.textAlign = 'center'; ctx.fillStyle = ink;
        let t = text;
        while (ctx.measureText(t).width > maxW && t.length > 2) t = t.slice(0, -2) + '…';
        ctx.fillText(t, cx, y); ctx.textAlign = 'left';
      }
      function drawNode(n, cx, cy, sc, ink, hot) {
        if (n.kind === 'folder') {
          drawFolder(ctx, cx, cy, sc, hot);
          const c = kids(n.id).length;
          if (c) { ctx.fillStyle = NAVY; ctx.font = Math.round(13 * sc) + 'px ' + font; ctx.textAlign = 'center'; ctx.fillText(c + ' 个', cx, cy + 10 * sc); ctx.textAlign = 'left'; }
        } else drawFile(ctx, n.type, cx, cy, sc);
      }

      api.loop((dt, t) => {
        clock += dt;
        stepDemo(dt);
        const due = timers.filter((tm) => (tm.t -= dt) <= 0);
        timers = timers.filter((tm) => tm.t > 0);
        due.forEach((tm) => tm.fn());
        const ink = api.color('--ink'), card = api.color('--card'), sky = api.color('--sky'), line = api.color('--line'), ink2 = api.color('--ink-2'), grass = api.color('--grass');
        s.clear();
        ctx.textBaseline = 'middle';
        layout();
        const tg = drag && drag.moved ? dropTarget({ x: drag.x, y: drag.y }) : null;

        // 路径栏：上一层 + 桌面 → 我的作品 → 画画
        ctx.fillStyle = card; ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
        PG.roundRect(ctx, 8, 8, W - 16, 42, 12); ctx.fill(); ctx.stroke();
        backRect = { x: 14, y: 13, w: 82, h: 32 };
        ctx.fillStyle = view === 'desk' ? line : api.color('--grass');
        PG.roundRect(ctx, backRect.x, backRect.y, backRect.w, backRect.h, 9); ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = NAVY; ctx.font = '15px ' + font; ctx.textAlign = 'center'; ctx.fillText('⬆ 上一层', backRect.x + backRect.w / 2, 29); ctx.textAlign = 'left';
        segRects = [];
        let x = 106;
        const ch = chain(view);
        ctx.font = '16px ' + font;
        ch.forEach((id, i) => {
          const nm = nameOf(id);
          const w = ctx.measureText(nm).width + 14;
          const r = { x, y: 13, w, h: 32, id };
          const hot = tg && tg.kind === 'folder' && tg.id === id;
          if (hot || i === ch.length - 1) {
            ctx.fillStyle = hot ? '#ffe58a' : 'rgba(31,179,111,.2)';
            PG.roundRect(ctx, r.x, r.y, r.w, r.h, 8); ctx.fill();
          }
          ctx.fillStyle = i === ch.length - 1 ? ink : ink2; ctx.fillText(nm, x + 7, 29);
          segRects.push(r);
          x += w;
          if (i < ch.length - 1) { ctx.fillStyle = ink2; ctx.fillText('→', x + 2, 29); x += 22; }
        });

        // 窗口里面
        ctx.fillStyle = view === 'trash' ? 'rgba(127,140,170,.12)' : 'rgba(31,179,111,.07)';
        PG.roundRect(ctx, 8, 54, W - 16, 264, 10); ctx.fill();
        if (view === 'trash') {
          const hot = tg && tg.kind === 'restore';
          ctx.save(); ctx.setLineDash([8, 6]); ctx.lineWidth = 3; ctx.strokeStyle = hot ? grass : ink2;
          ctx.fillStyle = hot ? 'rgba(31,179,111,.25)' : 'transparent';
          PG.roundRect(ctx, RESTORE.x, RESTORE.y, RESTORE.w, RESTORE.h, 14); ctx.fill(); ctx.stroke(); ctx.restore();
          ctx.fillStyle = ink; ctx.font = '18px ' + font; ctx.textAlign = 'center';
          ctx.fillText('拖到这里 = 放回原处', W / 2, RESTORE.y + RESTORE.h / 2); ctx.textAlign = 'left';
        }
        if (!iconRects.length) {
          ctx.fillStyle = ink2; ctx.font = '16px ' + font; ctx.textAlign = 'center';
          ctx.fillText(view === 'trash' ? BINNAME + '是空的' : '这个文件夹是空的', W / 2, view === 'trash' ? 120 : 180); ctx.textAlign = 'left';
        }
        iconRects.forEach((r) => {
          const n = r.n, cx = r.x + r.w / 2, cy = r.y + 46 * r.sc;
          const lifted = drag && drag.moved && drag.n === n;
          const hot = tg && tg.kind === 'folder' && tg.id === n.id;
          if (sel === n.id && !lifted) {
            ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = sky; PG.roundRect(ctx, r.x + 6, r.y + 4, r.w - 12, r.h - 8, 10); ctx.fill();
            ctx.globalAlpha = 1; ctx.strokeStyle = sky; ctx.lineWidth = 2.5; ctx.stroke(); ctx.restore();
          }
          ctx.globalAlpha = lifted ? 0.3 : 1;
          drawNode(n, cx, cy, r.sc * (hot ? 1.15 : 1), ink, hot);
          label(n.name, cx, r.y + 96 * r.sc, r.w - 8, ink);
          ctx.globalAlpha = 1;
        });

        // 底下：要找的路径 + 回收站
        ctx.fillStyle = card; ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
        PG.roundRect(ctx, DOCK.x, DOCK.y, DOCK.w, DOCK.h, 12); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ink; ctx.font = '14px ' + font;
        if (round === 2) {
          ctx.fillStyle = ink2; ctx.fillText('要找的路径：', 22, DOCK.y + 20);
          ctx.fillStyle = ink; ctx.font = '15px ' + font; ctx.fillText(FIND_PATH, 22, DOCK.y + 46);
        } else {
          ctx.fillStyle = ink2; ctx.fillText('现在在：', 22, DOCK.y + 20);
          ctx.fillStyle = ink; ctx.font = '15px ' + font; ctx.fillText(pathText(view), 22, DOCK.y + 46);
        }
        const binHot = tg && tg.kind === 'bin';
        const full = kids('trash').length > 0;
        if (view === 'trash') { ctx.fillStyle = 'rgba(31,179,111,.2)'; PG.roundRect(ctx, BIN.x, BIN.y, BIN.w, BIN.h, 10); ctx.fill(); }
        drawBin(ctx, BIN.x + BIN.w / 2, BIN.y + 24, full, binHot);
        ctx.fillStyle = ink; ctx.font = '13px ' + font; ctx.textAlign = 'center';
        ctx.fillText(BINNAME, BIN.x + BIN.w / 2, BIN.y + 54); ctx.textAlign = 'left';

        // 正在拖的东西跟着手走
        if (drag && drag.moved) {
          ctx.globalAlpha = 0.9;
          drawNode(drag.n, drag.x, drag.y - 10, 0.85, ink, false);
          ctx.globalAlpha = 1;
          if (tg) {
            const word = tg.kind === 'bin' ? '删除' : tg.kind === 'restore' ? '放回原处' : '放进「' + nameOf(tg.id) + '」';
            ctx.font = '14px ' + font; const tw = ctx.measureText(word).width + 16;
            ctx.fillStyle = NAVY; PG.roundRect(ctx, drag.x + 18, drag.y + 14, tw, 24, 12); ctx.fill();
            ctx.fillStyle = '#ffffff'; ctx.fillText(word, drag.x + 26, drag.y + 26);
          }
        }

        // 打开了一个文件
        if (popup) {
          popup.t += dt;
          const n = popup.n, k = Math.min(1, popup.t / 0.25);
          ctx.save(); ctx.translate(W / 2, 186); ctx.scale(0.8 + 0.2 * k, 0.8 + 0.2 * k);
          ctx.fillStyle = '#ffffff'; ctx.strokeStyle = NAVY; ctx.lineWidth = 3;
          PG.roundRect(ctx, -150, -96, 300, 192, 16); ctx.fill(); ctx.stroke();
          drawFile(ctx, n.type, 0, -36, 1.2);
          ctx.fillStyle = NAVY; ctx.textAlign = 'center';
          ctx.font = '18px ' + font; ctx.fillText('打开了：' + n.name, 0, 20);
          ctx.font = '14px ' + font; ctx.fillStyle = '#4b5778';
          ctx.fillText(n.id === 'k2' ? '找到了！这是你的 K2 学习记录' : '点后面是 .' + n.ext + '：它是' + (EXT[n.ext] || '文件'), 0, 48);
          ctx.fillText('点一下关掉', 0, 74);
          ctx.textAlign = 'left'; ctx.restore();
        }

        if (msg) {
          msg.t -= dt;
          if (msg.t <= 0) msg = null;
          else {
            ctx.font = '15px ' + font;
            const tw = Math.min(W - 20, ctx.measureText(msg.text).width + 28);
            ctx.globalAlpha = Math.min(1, msg.t * 3);
            ctx.fillStyle = NAVY; PG.roundRect(ctx, (W - tw) / 2, 278, tw, 32, 16); ctx.fill();
            ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.fillText(msg.text, W / 2, 294); ctx.textAlign = 'left';
            ctx.globalAlpha = 1;
          }
        }
        if (banner) {
          banner.t -= dt;
          if (banner.t <= 0) banner = null;
          else {
            ctx.fillStyle = '#ffd43b'; ctx.strokeStyle = NAVY; ctx.lineWidth = 3;
            PG.roundRect(ctx, W / 2 - 130, 150, 260, 72, 18); ctx.fill(); ctx.stroke();
            ctx.fillStyle = NAVY; ctx.font = '28px ' + font; ctx.textAlign = 'center';
            ctx.fillText(banner.text + ' ★', W / 2, 186); ctx.textAlign = 'left';
          }
        }
        if (ghost) {
          ctx.save(); ctx.translate(ghost.x, ghost.y);
          if (ghost.down) { ctx.beginPath(); ctx.arc(0, 0, 16, 0, 7); ctx.fillStyle = 'rgba(255,189,26,.5)'; ctx.fill(); }
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 26); ctx.lineTo(7, 20); ctx.lineTo(12, 31); ctx.lineTo(17, 29); ctx.lineTo(12, 18); ctx.lineTo(21, 18); ctx.closePath();
          ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = NAVY; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.stroke();
          ctx.restore();
          ctx.fillStyle = ink2; ctx.font = '13px ' + font; ctx.fillText('演示', ghost.x + 18, ghost.y + 40);
        }
        ctx.textBaseline = 'alphabetic';
      });

      // ---------- 猜一猜 ----------
      api.guesses([
        {
          q: '把「画画」文件夹拖进「我的作品」。原来在「画画」里的小猫.png 去哪了？',
          options: ['留在桌面上', '跟着一起进了「我的作品」', '不见了'], answer: 1,
          why: '文件夹像书包，小猫.png 装在「画画」这个书包里。书包搬到哪，里面的东西就跟到哪。看路径栏：桌面 → 我的作品 → 画画。',
          delay: 4600,
          apply() {
            goRound(1);
            const target = iconCenter('works');
            runDemo([
              { move: at('draw'), dur: 0.7 }, { down: 1 }, { move: { x: target.x, y: target.y }, dur: 1.0 }, { up: 1 },
              { say: '「画画」搬进了「我的作品」', sec: 1.6 }, { wait: 0.8 },
              ...dbl('works'), { wait: 0.8 }, ...dbl('draw'), { say: '小猫.png 还在「画画」里！', sec: 2.6 },
            ]);
          },
        },
        {
          q: '删掉的文件，还能找回来吗？',
          options: ['不能，删了就没了', '能，它在' + BINNAME + '里，清空之前都能找回'], answer: 1,
          why: '删除是先扔进' + BINNAME + '，就像扔进垃圾桶，还没倒之前都能捡回来、放回原处。清空以后就真的没了，所以清空要先问老师。',
          delay: 4200,
          apply() {
            goRound(3);
            runDemo([
              { move: at('draft'), dur: 0.7 }, { down: 1 }, { move: { x: BIN.x + BIN.w / 2, y: BIN.y + 26 }, dur: 1.0 }, { up: 1 },
              { say: '扔进' + BINNAME + '了', sec: 1.4 }, { wait: 0.6 }, { down: 1 }, { up: 1 }, { wait: 0.8 },
              { move: at('draft'), dur: 0.6 }, { down: 1 }, { move: { x: W / 2, y: RESTORE.y + 50 }, dur: 0.9 }, { up: 1 },
              { say: '放回原处：草稿1.txt 回到桌面了', sec: 2.4 },
            ]);
          },
        },
        {
          q: '路径“桌面 → 我的作品 → 画画”，说的是什么？',
          options: ['从桌面打开「我的作品」，再打开里面的「画画」', '桌面上有三个文件夹', '「画画」里面装着「我的作品」'], answer: 0,
          why: '路径就是一层一层的路线：先到桌面，打开「我的作品」，再打开它里面的「画画」。别人问你作品在哪，就把这条路线告诉他。',
          delay: 3200,
          apply() {
            goRound(2);
            runDemo([...dbl('works'), { say: '走了一层：桌面 → 我的作品', sec: 1.4 }, { wait: 1.0 }, ...dbl('draw'), { say: '又一层：桌面 → 我的作品 → 画画', sec: 3 }]);
          },
        },
      ]);

      api.say({
        left: '路径',
        right: '从桌面开始，一层一层打开文件夹，走到文件的路线',
        example: '文件是一样东西，文件夹是装东西的书包。“桌面 → 我的作品 → 画画”就是：打开桌面上的「我的作品」，再打开里面的「画画」。',
        promptIntro: '去你自己的电脑上试一试：',
        prompt: '打开' + (isMac ? '访达' : '文件资源管理器') + '，从“桌面”一层一层点到“我的作品”，然后大声说出路径，再找到窗口里写着路径的地方（' + (isMac ? '底下的路径栏' : '上面的地址栏') + '）。',
      });

      goRound(0);
    },

    // 首页小图：一个文件飞进文件夹，下面是路径
    thumb(ctx, w, h, t) {
      const k = (t % 2.4) / 1.6;
      drawFolder(ctx, 220, 92, 1.3, k > 0.95 && k < 1.2);
      if (k < 1) {
        const x = 80 + (220 - 80) * k, y = 92 - Math.sin(k * Math.PI) * 50;
        drawFile(ctx, 'draw', x, y, 1 - 0.4 * k);
      }
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = NAVY; ctx.lineWidth = 2.5;
      PG.roundRect(ctx, 40, 150, 240, 34, 10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = NAVY; ctx.font = '17px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('桌面 → 我的作品 → 画画', 160, 167);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    },
  });
})();
