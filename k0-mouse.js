/* 电脑小岛第 1 关：鼠标的三个动作。
   三关：点一下点亮星星（单击 = 选中）；快快点两下打开礼物盒（点一下只会选中）；按住水果拖进篮子（拖动 = 搬家）。
   手指也能玩：快快点两下当双击。 */
(function () {
  'use strict';
  const NAVY = '#1b2440';
  const W = 480, H = 340;
  const DBL = 0.6; // 两次点击隔多久以内算“双击”（秒）
  const ROUND_NAME = ['点一下', '快快点两下', '按住拖'];
  const ROUND_TASK = [
    '点一下星星，把 6 颗星星都点亮',
    '快快点两下，打开 3 个礼物盒',
    '按住水果，拖进篮子再松手',
  ];
  const ROUND_TIP = [
    '小窍门：先把箭头停在星星上，站稳了再点，像小鸟啄米。',
    '小窍门：点两下要快，像敲门“咚咚”。只点一下，盒子只会变蓝（选中）。',
    '小窍门：一边拖一边说“抓住……抓住……放！”中间别松手。',
  ];
  const STAR_POS = [[80, 120], [200, 96], [330, 120], [420, 214], [150, 250], [290, 262]];
  const BOX_COL = ['--tomato', '--sky', '--grape'];
  const PRIZE = ['cat', 'robot', 'star'];
  const FRUIT_POS = [['apple', 80, 128], ['orange', 210, 118], ['banana', 196, 262], ['grape', 70, 262]];
  const BASKET = { x: 318, y: 196, w: 146, h: 124 };

  function typing(e) {
    const t = e.target;
    return !!(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || '')));
  }
  function cursorPath(ctx) {
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(0, 26); ctx.lineTo(7, 20); ctx.lineTo(12, 31); ctx.lineTo(17, 29); ctx.lineTo(12, 18); ctx.lineTo(21, 18); ctx.closePath();
  }

  PG.register({
    id: 'mouse',
    title: '鼠标三件事',
    concept: '鼠标：单击、双击、拖动',
    kid: '点一下是“选中”，快点两下是“打开”，按住拖是“搬走”',
    level: 'K0',
    color: 'sun',
    play: '一共三关：点亮星星、打开礼物盒、把水果搬进篮子。用鼠标或者手指都行。',

    mount(api) {
      const s = api.stage(W, H);
      const ctx = s.ctx;
      const cv = s.canvas;
      cv.setAttribute('tabindex', '0');
      cv.setAttribute('aria-label', '鼠标练习场');
      cv.style.outline = 'none';
      const font = getComputedStyle(document.body).fontFamily;

      let round = 0, passed = 0;
      let stars = [], boxes = [], fruits = [];
      let parts = [], timers = [], banner = null, msg = null;
      let clock = 0, down = null, lastUp = null, drag = null, focus = -1, kbHold = null;
      let demo = null, ghost = null;
      let singleTaps = 0, allDone = false;

      // ---------- 右边的控件 ----------
      const rRound = api.readout('第几关', '1 / 3');
      const rStar = api.readout('拿到的星', '0 / 3');
      const taskBox = api.h('p', { style: { font: '20px/1.4 var(--display)', margin: 0 } });
      const tipBox = api.h('p', { class: 'small' });
      api.controlBox.append(api.h('div', { class: 'ctl' }, api.h('span', { class: 'lab' }, '现在要做'), taskBox, tipBox));
      const jump = api.choice({
        label: '想先练哪一关',
        options: ROUND_NAME.map((n, i) => ({ value: i, label: (i + 1) + ' ' + n })),
        value: 0,
        onChange: (v) => { stopDemo(); goRound(v); },
      });
      api.button('从头再来', () => { stopDemo(); passed = 0; rStar.set('0 / 3'); jump.set(0); });
      api.controlBox.append(api.h('p', { class: 'small' }, '没有鼠标也行：← → 选一个，空格键 = 点一下，回车 = 打开。'));

      // ---------- 每一关的东西 ----------
      function goRound(r) {
        round = r; drag = null; down = null; lastUp = null; focus = -1; kbHold = null; banner = null; msg = null;
        singleTaps = 0; allDone = false; timers = [];
        const o = api.stageBox.querySelector('.overlay'); if (o) o.remove();
        stars = STAR_POS.map(([x, y], i) => ({ x, y, lit: false, wob: i * 0.9, t: 0 }));
        boxes = [100, 240, 380].map((x, i) => ({ x, y: 222, w: 96, h: 80, sel: false, open: false, t: 0, col: BOX_COL[i], prize: PRIZE[i] }));
        fruits = FRUIT_POS.map(([kind, x, y]) => ({ kind, x, y, in: false, t: 0 }));
        rRound.set((r + 1) + ' / 3');
        taskBox.textContent = ROUND_TASK[r];
        tipBox.textContent = ROUND_TIP[r];
        if (jump.get() !== r) jump.set(r);
      }

      function after(sec, fn) { timers.push({ t: sec, fn }); }
      function say(text, sec) { msg = { text, t: sec || 2.2 }; }
      function burst(x, y, col, n) {
        for (let i = 0; i < (n || 14); i++) {
          const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 120;
          parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0.8, c: col });
        }
      }

      function roundDone() {
        if (demo) return; // 演示不算过关
        if (round + 1 > passed) { passed = round + 1; rStar.set(passed + ' / 3'); }
        if (round < 2) {
          api.sound('ding');
          banner = { text: '第 ' + (round + 1) + ' 关过关！', t: 1.6 };
          const next = round + 1;
          after(1.6, () => goRound(next));
        } else {
          api.sound('win');
          allDone = true;
          burst(W / 2, H / 2, api.color('--sun'), 40);
          after(0.9, () => api.overlay('全部完成！★★★ 单击、双击、拖动，你都会了。点这里再玩一次', () => goRound(0)));
        }
      }

      // ---------- 找东西（目标都比画出来的大一圈，好点中） ----------
      const near = (p, x, y, r) => Math.hypot(p.x - x, p.y - y) <= r;
      const inBox = (p, b, pad) => p.x >= b.x - b.w / 2 - pad && p.x <= b.x + b.w / 2 + pad && p.y >= b.y - b.h / 2 - pad - 18 && p.y <= b.y + b.h / 2 + pad;
      const inBasket = (p) => p.x >= BASKET.x - 12 && p.x <= BASKET.x + BASKET.w + 12 && p.y >= BASKET.y - 24 && p.y <= BASKET.y + BASKET.h + 10;
      function hit(p) {
        if (round === 0) { for (let i = 0; i < stars.length; i++) if (near(p, stars[i].x, stars[i].y, 40)) return i; }
        if (round === 1) { for (let i = 0; i < boxes.length; i++) if (inBox(p, boxes[i], 12)) return i; }
        if (round === 2) { for (let i = fruits.length - 1; i >= 0; i--) if (!fruits[i].in && near(p, fruits[i].x, fruits[i].y, 42)) return i; }
        return -1;
      }

      // ---------- 单击、双击、拖动 ----------
      function click(i) {
        if (round === 0) {
          if (i < 0) return;
          const st = stars[i];
          if (st.lit) { api.sound('tick'); return; }
          st.lit = true; st.t = 0;
          api.sound('pop'); burst(st.x, st.y, api.color('--sun'));
          if (stars.every((x) => x.lit)) roundDone();
        } else if (round === 1) {
          boxes.forEach((b, k) => { b.sel = k === i; });
          if (i < 0) { say('点空白的地方：取消选中', 1.6); return; }
          api.sound('tick');
          if (!boxes[i].open) {
            singleTaps++;
            say(singleTaps > 2 ? '只点一下只会选中哦，要快快点两下：咚咚！' : '变蓝了：选中了，还没打开', 2);
          }
        }
      }
      function dblclick(i) {
        if (round === 0) { click(i); return; }
        if (round !== 1 || i < 0) return;
        openBox(i);
      }
      function openBox(i) {
        const b = boxes[i];
        boxes.forEach((x, k) => { x.sel = k === i; });
        if (b.open) { api.sound('tick'); return; }
        b.open = true; b.t = 0;
        api.sound('boing'); burst(b.x, b.y - 40, api.color(b.col));
        say('咚咚！打开啦', 1.6);
        if (boxes.every((x) => x.open)) roundDone();
      }
      function dropFruit(f) {
        if (inBasket(f)) {
          const used = fruits.filter((x) => x.in).length;
          f.in = true; f.t = 0;
          f.x = BASKET.x + 38 + (used % 2) * 70; f.y = BASKET.y + 34 + Math.floor(used / 2) * 18;
          api.sound('ding'); burst(f.x, f.y, api.color('--grass'), 10);
          if (fruits.every((x) => x.in)) roundDone();
        } else {
          api.sound('step');
          say('松手了，它就停在这里', 1.6);
        }
      }

      function press(p) {
        if (allDone && !demo) return;
        down = { x: p.x, y: p.y, i: hit(p) };
        if (round === 2 && down.i >= 0) {
          const f = fruits[down.i];
          drag = { f, ox: p.x - f.x, oy: p.y - f.y, moved: false, sx: p.x, sy: p.y };
          fruits.splice(down.i, 1); fruits.push(f); // 拿起来的画在最上面
          focus = -1; kbHold = null;
        }
      }
      function moveTo(p) {
        if (!drag) return;
        drag.f.x = Math.max(24, Math.min(W - 24, p.x - drag.ox));
        drag.f.y = Math.max(64, Math.min(H - 24, p.y - drag.oy));
        if (Math.hypot(p.x - drag.sx, p.y - drag.sy) > 8) drag.moved = true;
      }
      function release(p) {
        if (!down) return;
        const d = down; down = null;
        if (round === 2) {
          const g = drag; drag = null;
          if (!g) { if (d.i < 0) say('按住水果不放，拖到篮子里', 1.8); return; }
          if (!g.moved) { say('要按住不放，拖到篮子里再松手', 2); return; }
          dropFruit(g.f);
          return;
        }
        if (Math.hypot(p.x - d.x, p.y - d.y) > 16) { say('按下去的时候手别动，站稳了再点', 2); lastUp = null; return; }
        const i = hit(p);
        if (lastUp && clock - lastUp.t < DBL && lastUp.i === i && Math.hypot(p.x - lastUp.x, p.y - lastUp.y) < 30) {
          lastUp = null;
          dblclick(i);
        } else {
          lastUp = { t: clock, i, x: p.x, y: p.y };
          click(i);
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
        cv.style.cursor = drag ? 'grabbing' : hit(p) >= 0 ? (round === 2 ? 'grab' : 'pointer') : 'default';
      });
      api.on(cv, 'pointerup', (e) => { if (!demo) release(s.pos(e)); });
      api.on(cv, 'pointercancel', () => {
        if (demo) return;
        if (drag) { const f = drag.f; drag = null; dropFruit(f); }
        down = null;
      });

      // 键盘也能玩：← → 选，空格 = 点一下，回车 = 打开
      api.on(window, 'keydown', (e) => {
        if (typing(e) || demo || allDone) return;
        const k = e.key;
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter'].includes(k)) return;
        const ae = document.activeElement;
        if (ae && (ae.tagName === 'BUTTON' || ae.tagName === 'A')) {
          if (k === ' ' || k === 'Enter') return; // 焦点在按钮上：让按钮自己响应
          ae.blur();
        }
        e.preventDefault();
        if (round === 2 && kbHold) {
          const step = 24;
          if (k === 'ArrowLeft') kbHold.x -= step;
          if (k === 'ArrowRight') kbHold.x += step;
          if (k === 'ArrowUp') kbHold.y -= step;
          if (k === 'ArrowDown') kbHold.y += step;
          kbHold.x = Math.max(24, Math.min(W - 24, kbHold.x)); kbHold.y = Math.max(64, Math.min(H - 24, kbHold.y));
          if (k === ' ' || k === 'Enter') { const f = kbHold; kbHold = null; focus = -1; dropFruit(f); }
          return;
        }
        const list = round === 0 ? stars : round === 1 ? boxes : fruits.filter((f) => !f.in);
        if (!list.length) return;
        if (k === 'ArrowLeft' || k === 'ArrowUp') { focus = (focus <= 0 ? list.length : focus) - 1; api.sound('tick'); }
        else if (k === 'ArrowRight' || k === 'ArrowDown') { focus = (focus + 1) % list.length; api.sound('tick'); }
        else if (focus >= 0 && focus < list.length) {
          if (round === 0) click(focus);
          else if (round === 1) { if (k === 'Enter') openBox(focus); else click(focus); }
          else { kbHold = list[focus]; api.sound('tick'); say('抓住了！用方向键搬，再按空格放下', 2.4); }
        }
      });

      // ---------- 演示（猜一猜用）：一个“影子箭头”自己来点 ----------
      function runDemo(steps) {
        stopDemo();
        demo = { steps, i: 0, t: 0, from: null };
        ghost = { x: W / 2, y: H - 40, down: false };
      }
      function stopDemo() { demo = null; ghost = null; down = null; drag = null; }
      function stepDemo(dt) {
        if (!demo) return;
        const st = demo.steps[demo.i];
        if (!st) { demo = null; after(1.4, () => { ghost = null; }); return; }
        if (st.move) {
          if (!demo.from) demo.from = { x: ghost.x, y: ghost.y };
          demo.t += dt;
          const k = Math.min(1, demo.t / st.dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
          ghost.x = demo.from.x + (st.move[0] - demo.from.x) * e;
          ghost.y = demo.from.y + (st.move[1] - demo.from.y) * e;
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

      // ---------- 画 ----------
      function drawCursor(x, y, pressed) {
        ctx.save(); ctx.translate(x, y);
        if (pressed) { ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,189,26,.5)'; ctx.fill(); }
        cursorPath(ctx);
        ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = NAVY; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.stroke();
        ctx.restore();
      }
      function selRect(x, y, w, hh, sky) {
        ctx.save();
        ctx.globalAlpha = 0.28; ctx.fillStyle = sky; PG.roundRect(ctx, x, y, w, hh, 10); ctx.fill();
        ctx.globalAlpha = 1; ctx.lineWidth = 3; ctx.strokeStyle = sky; ctx.stroke();
        ctx.restore();
      }
      function focusRing(x, y, w, hh, ink) {
        ctx.save(); ctx.setLineDash([6, 5]); ctx.lineWidth = 2.5; ctx.strokeStyle = ink;
        PG.roundRect(ctx, x, y, w, hh, 12); ctx.stroke(); ctx.restore();
      }
      function drawPrize(kind, x, y, k) {
        ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
        ctx.lineWidth = 2.5; ctx.strokeStyle = NAVY;
        if (kind === 'star') { PG.drawStar(ctx, 0, 0, 24, '#ffd43b', NAVY); }
        else if (kind === 'cat') {
          ctx.fillStyle = '#f29a3a';
          ctx.beginPath(); ctx.moveTo(-18, -8); ctx.lineTo(-14, -28); ctx.lineTo(-4, -16); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(18, -8); ctx.lineTo(14, -28); ctx.lineTo(4, -16); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = NAVY; ctx.beginPath(); ctx.arc(-7, -3, 2.6, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(7, -3, 2.6, 0, 7); ctx.fill();
          ctx.beginPath(); ctx.moveTo(-4, 6); ctx.quadraticCurveTo(0, 10, 4, 6); ctx.stroke();
        } else {
          ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(0, -30); ctx.stroke();
          ctx.beginPath(); ctx.arc(0, -32, 4, 0, 7); ctx.fillStyle = '#ff5a47'; ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#9ad1ff'; PG.roundRect(ctx, -20, -22, 40, 34, 8); ctx.fill(); ctx.stroke();
          ctx.fillStyle = NAVY; ctx.fillRect(-11, -10, 6, 6); ctx.fillRect(5, -10, 6, 6); ctx.fillRect(-8, 3, 16, 3);
        }
        ctx.restore();
      }
      function drawFruit(f, x, y, sc) {
        ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
        ctx.lineWidth = 2.5; ctx.strokeStyle = NAVY; ctx.lineJoin = 'round';
        if (f.kind === 'apple') {
          ctx.fillStyle = '#ff5a47'; ctx.beginPath(); ctx.ellipse(0, 3, 24, 21, 0, 0, 7); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(2, -26); ctx.stroke();
          ctx.fillStyle = '#1fb36f'; ctx.beginPath(); ctx.ellipse(10, -22, 9, 5, -0.5, 0, 7); ctx.fill(); ctx.stroke();
        } else if (f.kind === 'orange') {
          ctx.fillStyle = '#ff9f1a'; ctx.beginPath(); ctx.arc(0, 0, 23, 0, 7); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#1fb36f'; ctx.beginPath(); ctx.ellipse(6, -22, 8, 4, 0.3, 0, 7); ctx.fill(); ctx.stroke();
        } else if (f.kind === 'banana') {
          ctx.fillStyle = '#ffd43b';
          ctx.beginPath(); ctx.moveTo(-28, -10); ctx.quadraticCurveTo(0, 30, 28, -10); ctx.quadraticCurveTo(0, 10, -28, -10); ctx.closePath();
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#8a5a2b'; ctx.fillRect(-31, -13, 6, 6);
        } else {
          ctx.fillStyle = '#8a5cf5';
          for (const [gx, gy] of [[-12, -10], [0, -12], [12, -10], [-6, 2], [6, 2], [0, 14]]) { ctx.beginPath(); ctx.arc(gx, gy, 8.5, 0, 7); ctx.fill(); ctx.stroke(); }
          ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(3, -28); ctx.stroke();
        }
        ctx.restore();
      }

      api.loop((dt, t) => {
        clock += dt;
        stepDemo(dt);
        const due = timers.filter((tm) => (tm.t -= dt) <= 0);
        timers = timers.filter((tm) => tm.t > 0);
        due.forEach((tm) => tm.fn());
        const ink = api.color('--ink'), sky = api.color('--sky'), card = api.color('--card'), line = api.color('--line'), ink2 = api.color('--ink-2');
        s.clear();
        ctx.textBaseline = 'middle';

        // 顶上：第几关 + 三颗星
        ctx.fillStyle = card; ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
        PG.roundRect(ctx, 8, 8, W - 16, 40, 12); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ink; ctx.font = '18px ' + font;
        ctx.fillText('第 ' + (round + 1) + ' 关 · ' + ROUND_NAME[round], 20, 28);
        for (let i = 0; i < 3; i++) PG.drawStar(ctx, W - 82 + i * 26, 28, 10, i < passed ? api.color('--sun') : line, ink);
        ctx.fillStyle = line; ctx.fillRect(0, H - 8, W, 8);

        if (round === 0) {
          stars.forEach((st, i) => {
            st.t += dt;
            const bob = Math.sin(t * 2 + st.wob) * 4;
            const sc = st.lit ? 1 + Math.max(0, 0.35 - st.t) : 1;
            if (st.lit) selRect(st.x - 34, st.y - 34 + bob, 68, 68, sky);
            if (focus === i) focusRing(st.x - 38, st.y - 38 + bob, 76, 76, ink);
            ctx.save(); ctx.translate(st.x, st.y + bob); ctx.scale(sc, sc);
            PG.drawStar(ctx, 0, 0, 26, st.lit ? api.color('--sun') : card, ink);
            ctx.restore();
          });
        } else if (round === 1) {
          boxes.forEach((b, i) => {
            b.t += dt;
            const x0 = b.x - b.w / 2, y0 = b.y - b.h / 2;
            if (b.sel) {
              selRect(x0 - 12, y0 - 34, b.w + 24, b.h + 66, sky);
              ctx.fillStyle = sky; ctx.font = '15px ' + font; ctx.textAlign = 'center';
              ctx.fillText(b.open ? '打开了' : '选中了', b.x, b.y + b.h / 2 + 18); ctx.textAlign = 'left';
            }
            if (focus === i) focusRing(x0 - 16, y0 - 38, b.w + 32, b.h + 74, ink);
            const col = api.color(b.col);
            if (b.open) {
              const k = Math.min(1, b.t / 0.4);
              drawPrize(b.prize, b.x, y0 - 18 - 30 * k + Math.sin(t * 3 + i) * 3, 0.4 + 0.6 * k);
            }
            ctx.fillStyle = col; ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
            ctx.fillRect(x0, y0 + 10, b.w, b.h - 10); ctx.strokeRect(x0, y0 + 10, b.w, b.h - 10);
            ctx.fillStyle = '#ffd43b'; ctx.fillRect(b.x - 7, y0 + 10, 14, b.h - 10); ctx.strokeRect(b.x - 7, y0 + 10, 14, b.h - 10);
            // 盖子：选中时轻轻抖（“快打开我”），打开时翻到一边
            ctx.save();
            if (b.open) {
              const k = Math.min(1, b.t / 0.35);
              ctx.translate(x0 - 4, y0 + 10); ctx.rotate(-1.9 * k); ctx.translate(-(x0 - 4), -(y0 + 10));
            } else if (b.sel) {
              ctx.translate(0, Math.sin(t * 10) * 1.5);
            }
            ctx.fillStyle = col; ctx.fillRect(x0 - 6, y0, b.w + 12, 14); ctx.strokeRect(x0 - 6, y0, b.w + 12, 14);
            ctx.fillStyle = '#ffd43b'; ctx.fillRect(b.x - 7, y0, 14, 14); ctx.strokeRect(b.x - 7, y0, 14, 14);
            ctx.beginPath(); ctx.ellipse(b.x - 12, y0 - 6, 11, 7, 0.4, 0, 7); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.ellipse(b.x + 12, y0 - 6, 11, 7, -0.4, 0, 7); ctx.fill(); ctx.stroke();
            ctx.restore();
          });
        } else {
          const bx = BASKET.x, by = BASKET.y, bw = BASKET.w, bh = BASKET.h;
          const held = drag ? drag.f : kbHold;
          const hot = held && inBasket(held);
          ctx.strokeStyle = ink; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(bx + 16, by + 44); ctx.quadraticCurveTo(bx + bw / 2, by - 30, bx + bw - 16, by + 44); ctx.stroke();
          fruits.filter((f) => f.in).forEach((f) => drawFruit(f, f.x, f.y, 0.85));
          ctx.fillStyle = hot ? api.color('--grass') : '#c98a4b';
          ctx.beginPath(); ctx.moveTo(bx, by + 44); ctx.lineTo(bx + bw, by + 44); ctx.lineTo(bx + bw - 16, by + bh); ctx.lineTo(bx + 16, by + bh); ctx.closePath();
          ctx.fill(); ctx.stroke();
          ctx.strokeStyle = 'rgba(27,36,64,.35)'; ctx.lineWidth = 2;
          for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(bx + 4 + k * 3, by + 44 + k * 19); ctx.lineTo(bx + bw - 4 - k * 3, by + 44 + k * 19); ctx.stroke(); }
          ctx.fillStyle = NAVY; ctx.font = '16px ' + font; ctx.textAlign = 'center';
          ctx.fillText('篮子 ' + fruits.filter((f) => f.in).length + ' / 4', bx + bw / 2, by + bh - 14); ctx.textAlign = 'left';
          const free = fruits.filter((f) => !f.in);
          free.forEach((f, i) => {
            const lifted = held === f;
            if (lifted) { ctx.fillStyle = 'rgba(27,36,64,.18)'; ctx.beginPath(); ctx.ellipse(f.x + 6, f.y + 30, 22, 6, 0, 0, 7); ctx.fill(); }
            if (focus === i && !kbHold) focusRing(f.x - 38, f.y - 38, 76, 76, ink);
            drawFruit(f, f.x, f.y - (lifted ? 8 : 0), lifted ? 1.12 : 1);
          });
          if (drag && !drag.moved) { ctx.fillStyle = ink2; ctx.font = '15px ' + font; ctx.textAlign = 'center'; ctx.fillText('按住了，拖！', drag.f.x, drag.f.y - 44); ctx.textAlign = 'left'; }
        }

        // 小碎片
        parts = parts.filter((pt) => (pt.life -= dt) > 0);
        for (const pt of parts) {
          pt.vy += 260 * dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt;
          ctx.globalAlpha = Math.max(0, pt.life / 0.8); ctx.fillStyle = pt.c; ctx.fillRect(pt.x - 3, pt.y - 3, 6, 6);
        }
        ctx.globalAlpha = 1;

        // 底下一句提示
        if (msg) {
          msg.t -= dt;
          if (msg.t <= 0) msg = null;
          else {
            ctx.font = '16px ' + font;
            const tw = ctx.measureText(msg.text).width + 28;
            ctx.globalAlpha = Math.min(1, msg.t * 3);
            ctx.fillStyle = NAVY; PG.roundRect(ctx, (W - tw) / 2, H - 50, tw, 32, 16); ctx.fill();
            ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.fillText(msg.text, W / 2, H - 34); ctx.textAlign = 'left';
            ctx.globalAlpha = 1;
          }
        }
        // 过关横幅
        if (banner) {
          banner.t -= dt;
          if (banner.t <= 0) banner = null;
          else {
            ctx.fillStyle = '#ffd43b'; ctx.strokeStyle = NAVY; ctx.lineWidth = 3;
            PG.roundRect(ctx, W / 2 - 130, H / 2 - 36, 260, 72, 18); ctx.fill(); ctx.stroke();
            ctx.fillStyle = NAVY; ctx.font = '28px ' + font; ctx.textAlign = 'center';
            ctx.fillText(banner.text + ' ★', W / 2, H / 2); ctx.textAlign = 'left';
          }
        }
        if (ghost) {
          drawCursor(ghost.x, ghost.y, ghost.down);
          ctx.fillStyle = ink2; ctx.font = '13px ' + font; ctx.fillText('演示', ghost.x + 18, ghost.y + 40);
        }
        ctx.textBaseline = 'alphabetic';
      });

      // ---------- 猜一猜 ----------
      api.guesses([
        {
          q: '只点一下礼物盒（单击），它会打开吗？',
          options: ['会打开', '不会，只是选中它'], answer: 1,
          why: '点一下是“选中”：盒子变蓝，电脑知道你要它了。快快点两下（咚咚）才是“打开”，演示的箭头后来点了两下，盒子就开了。',
          delay: 1900,
          apply() {
            goRound(1);
            const b = boxes[0];
            runDemo([
              { move: [b.x + 8, b.y + 6], dur: 0.7 }, { down: 1 }, { up: 1 }, { say: '点一下：变蓝了，没打开', sec: 1.8 },
              { wait: 1.9 }, { down: 1 }, { up: 1 }, { wait: 0.12 }, { down: 1 }, { up: 1 },
            ]);
          },
        },
        {
          q: '想把苹果放进篮子，要怎么做？',
          options: ['点一下苹果', '快快点两下苹果', '按住苹果，拖到篮子里再松手'], answer: 2,
          why: '按住不放是“抓住”，移过去是“搬”，松手是“放下”。这就是拖动。',
          delay: 2300,
          apply() {
            goRound(2);
            const f = fruits.find((x) => x.kind === 'apple');
            runDemo([
              { move: [f.x, f.y], dur: 0.6 }, { down: 1 }, { say: '按住……', sec: 1 }, { wait: 0.3 },
              { move: [BASKET.x + 70, BASKET.y + 60], dur: 1.0 }, { up: 1 }, { say: '松手：放进去了！', sec: 2 },
            ]);
          },
        },
        {
          q: '拖苹果的时候，拖到一半就松手，会怎样？',
          options: ['苹果自己飞进篮子', '苹果回到原来的地方', '苹果留在松手的地方'], answer: 2,
          why: '松手就是“放下”，东西就停在松手的地方。所以拖的时候手指要一直按着，到了篮子再松。',
          delay: 2400,
          apply() {
            goRound(2);
            const f = fruits.find((x) => x.kind === 'apple');
            runDemo([
              { move: [f.x, f.y], dur: 0.6 }, { down: 1 }, { wait: 0.3 },
              { move: [236, 196], dur: 0.8 }, { up: 1 }, { say: '松手了：苹果停在半路', sec: 2.4 },
            ]);
          },
        },
      ]);

      api.say({
        left: '鼠标的三个动作',
        right: '点一下是选中，快点两下是打开，按住拖是搬家',
        example: '桌面上点一下“我的作品”，它变蓝了（选中）；快快点两下，它打开了；按住它拖到右上角再松手，它就搬家了。',
        promptIntro: '去你自己的电脑上试一试：',
        prompt: '点一下桌面上的一个图标，看它变色；再快快点两下打开它，然后关掉；最后按住它，拖到屏幕右上角再松手。',
      });

      goRound(0);
    },

    // 首页小图：鼠标左键按下去，箭头一颗一颗点亮星星
    thumb(ctx, w, h, t) {
      ctx.save(); ctx.translate(70, 112);
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = NAVY; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(0, 0, 36, 52, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-36, -8); ctx.lineTo(36, -8); ctx.moveTo(0, -52); ctx.lineTo(0, -8); ctx.stroke();
      const ph = t % 1.2;
      const press = ph < 0.15 || (ph > 0.25 && ph < 0.4);
      if (press) {
        ctx.fillStyle = '#ffd43b';
        ctx.beginPath(); ctx.moveTo(-35, -10); ctx.lineTo(-2, -10); ctx.lineTo(-2, -50); ctx.quadraticCurveTo(-30, -48, -35, -10); ctx.closePath();
        ctx.fill(); ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = NAVY; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(70, 60); ctx.quadraticCurveTo(80, 20, 120, 30); ctx.stroke();
      const k = Math.floor(t / 1.2) % 3;
      for (let i = 0; i < 3; i++) PG.drawStar(ctx, 170 + i * 52, 100, 20, i <= k ? '#ffd43b' : '#ffffff', NAVY);
      ctx.save(); ctx.translate(176 + k * 52, 106);
      cursorPath(ctx);
      ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = NAVY; ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.restore();
      ctx.fillStyle = NAVY; ctx.font = '22px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(press ? '咚咚！' : '点一点', 222, 170); ctx.textAlign = 'left';
    },
  });
})();
