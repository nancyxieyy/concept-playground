/* 程序森林 第 3 关：重复。小乌龟照着“重复 N 次：往前走、右转”画画。
   画正方形、三角形、五角星、圆圈；看看不用重复的话要写多少行。 */
(function () {
  'use strict';
  const font = (px) => px + 'px ' + getComputedStyle(document.body).fontFamily;
  const RAD = Math.PI / 180;

  const GOALS = [
    { name: '正方形', ok: (n, a) => a === 90 && n >= 4, need: 4,
      tips: ['正方形有 4 条边，要拐 4 个弯。', '试试：重复 4 次，每次右转 90°。'] },
    { name: '三角形', ok: (n, a) => a === 120 && n >= 3, need: 3,
      tips: ['三角形有 3 条边。拐 3 个弯，加起来正好转一整圈（360°）。', '360 ÷ 3 = 120。试试：重复 3 次，每次右转 120°。'] },
    { name: '五角星', ok: (n, a) => a === 144 && n >= 5, need: 5,
      tips: ['五角星有 5 个尖，要重复 5 次。每次拐一个很大的弯，比 90° 大多了。', '试试：重复 5 次，每次右转 144°。'] },
    { name: '圆圈', ok: (n, a) => a > 0 && a <= 15 && n * a >= 360, need: 0,
      tips: ['圆圈是好多好多很短的边拼成的：次数多一点，每次转少一点。', '试试：重复 36 次，往前走 10 步，每次右转 10°。'] },
  ];

  // 小乌龟（从上往下看），头朝 ang 的方向
  function drawTurtle(ctx, x, y, ang, sz, shell, ink) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.lineWidth = 2; ctx.strokeStyle = ink; ctx.fillStyle = '#7fd9a8';
    for (const [lx, ly] of [[6, -9], [6, 9], [-7, -9], [-7, 9]]) {
      ctx.beginPath(); ctx.ellipse(lx * sz / 12, ly * sz / 12, sz * 0.28, sz * 0.18, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(sz * 0.95, 0, sz * 0.32, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1b2440';
    ctx.beginPath(); ctx.arc(sz * 1.05, -sz * 0.13, sz * 0.07, 0, Math.PI * 2); ctx.arc(sz * 1.05, sz * 0.13, sz * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = shell;
    ctx.beginPath(); ctx.ellipse(0, 0, sz * 0.8, sz * 0.68, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(27,36,64,.45)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-sz * 0.3, -sz * 0.6); ctx.lineTo(-sz * 0.3, sz * 0.6); ctx.moveTo(sz * 0.25, -sz * 0.6); ctx.lineTo(sz * 0.25, sz * 0.6);
    ctx.moveTo(-sz * 0.78, 0); ctx.lineTo(sz * 0.78, 0); ctx.stroke();
    ctx.restore();
  }

  // 走一遍，记下每个拐角的点（乌龟一开始头朝上）
  function trace(n, step, ang) {
    let x = 0, y = 0, hd = -90;
    const pts = [{ x, y, hd }];
    for (let i = 0; i < n; i++) {
      x += Math.cos(hd * RAD) * step; y += Math.sin(hd * RAD) * step;
      hd += ang;
      pts.push({ x, y, hd });
    }
    return pts;
  }

  function goalIcon(ctx, k, cx, cy, r, ink) {
    const n = [4, 3, 5, 36][k], a = [90, 120, 144, 10][k];
    const pts = trace(n, 1, a);
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (const p of pts) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
    const sc = (r * 2) / Math.max(maxX - minX, maxY - minY);
    ctx.strokeStyle = ink; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    ctx.beginPath();
    pts.forEach((p, i) => {
      const x = cx + (p.x - (minX + maxX) / 2) * sc, y = cy + (p.y - (minY + maxY) / 2) * sc;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    });
    ctx.stroke();
  }

  PG.register({
    id: 'repeat',
    title: '小乌龟画画',
    concept: '重复（循环）',
    kid: '同样的事做好几遍，不用写好几遍，写“重复几次”就行',
    level: 'K1',
    color: 'sky',
    play: '小乌龟会照着右边的程序画画：重复几次“往前走，右转”。拖动滑块改数字，按“▶ 画画”。先画一个正方形吧！',

    mount(api) {
      const W = 480, H = 320;
      const s = api.stage(W, H);
      const ctx = s.ctx;
      const h = api.h;

      let goal = 0, n = 2, step = 100, ang = 90;
      let pts = null, sc = 1, ox = 0, oy = 0, big = false;
      let anim = null, done = false, banner = '', party = [], fails = 0, demo = false;
      const wins = [false, false, false, false];
      const timers = [];
      const later = (fn, ms) => timers.push(setTimeout(fn, ms));
      api.onCleanup(() => timers.forEach(clearTimeout));

      // ---------- 右边：挑战、程序、滑块 ----------
      const goalPick = api.choice({
        label: '挑战', value: 0,
        options: GOALS.map((g, i) => ({ value: i, label: (i + 1) + ' ' + g.name })),
        onChange: (v) => { goal = v; fails = 0; stop(); banner = '要画：' + GOALS[v].name; api.setHint('要画' + GOALS[v].name + '。改一改数字，再按“▶ 画画”。'); },
      });
      const lineStyle = { padding: '4px 10px', borderRadius: '8px', font: '18px/1.5 var(--body)', fontWeight: '700' };
      const L1 = h('div', { style: lineStyle }), L2 = h('div', { style: Object.assign({ marginLeft: '28px' }, lineStyle) }), L3 = h('div', { style: Object.assign({ marginLeft: '28px' }, lineStyle) });
      const progBox = h('div', { style: { display: 'grid', gap: '2px', padding: '10px', border: '2.5px solid var(--ink)', borderRadius: '12px', background: 'var(--card)' } }, L1, L2, L3);
      api.controlBox.append(h('div', { class: 'ctl' },
        h('span', { class: 'lab' }, h('span', null, '程序', h('span', { class: 'grown', style: { fontWeight: '400' } }, '（循环）')), h('span', { class: 'small' }, '只有 3 行')), progBox));
      const slN = api.slider({ label: '重复几次', min: 1, max: 36, value: n, unit: ' 次', onInput: (v) => { n = v; changed(); } });
      const slS = api.slider({ label: '每次往前走', min: 10, max: 150, step: 5, value: step, unit: ' 步', onInput: (v) => { step = v; changed(); } });
      const slA = api.slider({ label: '每次右转', min: 0, max: 180, value: ang, unit: '°', onInput: (v) => { ang = v; changed(); } });
      const nudge = h('div', { class: 'seg' });
      api.button('右转 −1°', () => slA.set(Math.max(0, ang - 1)), '', nudge);
      api.button('右转 +1°', () => slA.set(Math.min(180, ang + 1)), '', nudge);
      slA.el.append(nudge);
      const row = h('div', { class: 'seg' });
      api.controlBox.append(row);
      const bGo = api.button('▶ 画画', () => draw(), 'primary', row);
      const rLong = api.readout('不用重复，要写', '');
      const rShort = api.readout('用了重复，只要', '3 行');
      const longList = h('div', { style: { font: '14px/1.6 var(--mono)', maxHeight: '180px', overflow: 'auto', padding: '6px 10px', border: '2px solid var(--line)', borderRadius: '10px', background: 'var(--card)' } });
      api.controlBox.append(h('details', null, h('summary', { style: { cursor: 'pointer', fontWeight: '700' } }, '不用重复的话，要这样写……'), longList));

      function renderProg(line, k) {
        L1.textContent = '重复 ' + n + ' 次：';
        L2.textContent = '往前走 ' + step + ' 步';
        L3.textContent = '右转 ' + ang + '°';
        [L1, L2, L3].forEach((el, i) => {
          el.style.background = line === i + 1 ? 'var(--sky)' : 'transparent';
          el.style.color = line === i + 1 ? '#1b2440' : 'var(--ink)';
        });
        if (k) L1.textContent += '  （第 ' + k + ' 次）';
      }
      function changed() {
        stop();
        rLong.set(2 * n + ' 行');
        longList.textContent = '';
        for (let i = 0; i < n; i++) {
          longList.append(h('div', null, '往前走 ' + step + ' 步'), h('div', null, '右转 ' + ang + '°'));
        }
        renderProg(0);
      }

      function stop() {
        timers.forEach(clearTimeout); timers.length = 0;
        anim = null; pts = null; done = false; party = []; demo = false;
        banner = '要画：' + GOALS[goal].name + '。按 ▶ 画画';
        const o = api.stageBox.querySelector('.overlay'); if (o) o.remove();
        bGo.disabled = false;
      }

      function draw(onDone, isDemo) {
        stop();
        demo = !!isDemo;
        pts = trace(n, step, ang);
        let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
        for (const p of pts) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
        const bw = maxX - minX, bh = maxY - minY, AW = 340, AH = 240;
        sc = Math.min(1, AW / Math.max(bw, 1), AH / Math.max(bh, 1));
        big = sc < 1;
        ox = 190 - ((minX + maxX) / 2) * sc; oy = 182 - ((minY + maxY) / 2) * sc;
        const per = Math.max(0.07, Math.min(0.55, 2.8 / n));
        anim = { i: 0, t: 0, per, onDone, lastSound: -1 };
        bGo.disabled = true;
        banner = '重复 ' + n + ' 次：往前走 ' + step + ' 步，右转 ' + ang + '°';
      }

      function finished() {
        const cb = anim.onDone; anim = null; done = true; bGo.disabled = false;
        renderProg(0);
        if (cb) { cb(); return; }
        if (demo) return;
        const g = GOALS[goal];
        if (g.ok(n, ang)) {
          api.sound('win');
          banner = '画出' + g.name + '啦！';
          for (let i = 0; i < 30; i++) {
            const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 140;
            party.push({ x: 190, y: 182, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, r: Math.random() * 6, life: 1.5 });
          }
          wins[goal] = true; fails = 0;
          const all = wins.every(Boolean);
          let extra = '';
          if (g.need && n > g.need) extra = '（其实重复 ' + g.need + ' 次就够了，多的几次是在原来的线上再画一遍。）';
          api.setHint('画出' + g.name + '了！重复 ' + n + ' 次，程序却只有 3 行。' + extra);
          later(() => api.overlay(all ? '四个都画出来了！你是重复小画家！点这里再玩一次'
            : '画出' + g.name + '啦！点这里下一个挑战',
          () => goalPick.set((goal + 1) % GOALS.length)), 1300);
        } else {
          api.sound('boing');
          const turned = n * ang;
          banner = '这不是' + g.name + '……一共转了 ' + turned + '°';
          api.setHint(g.tips[Math.min(fails, 1)]);
          fails++;
        }
      }

      api.on(window, 'keydown', (e) => {
        const tg = e.target;
        if (tg && tg.closest && tg.closest('input, textarea, select, button, a, summary')) return;
        if (e.key === 'Enter') { e.preventDefault(); if (!anim) draw(); }
      });
      api.on(s.canvas, 'pointerdown', () => { if (!anim) draw(); });

      // ---------- 每一帧 ----------
      api.loop((dt, t) => {
        if (anim) {
          anim.t += dt;
          if (anim.t >= anim.per) { anim.t -= anim.per; anim.i++; }
          if (anim.i >= n) { anim.i = n; anim.t = 0; finished(); }
          else {
            const moving = anim.t < anim.per * 0.7;
            renderProg(moving ? 2 : 3, anim.i + 1);
            if (anim.i !== anim.lastSound) { anim.lastSound = anim.i; if (n <= 12 || anim.i % 3 === 0) api.sound('step'); }
          }
        }
        for (const p of party) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 240 * dt; p.r += dt * 6; p.life -= dt; }
        party = party.filter((p) => p.life > 0);

        const ink = api.color('--ink'), card = api.color('--card'), sky = api.color('--sky'), sun = api.color('--sun'), line = api.color('--line');
        s.clear();
        // 淡淡的方格纸
        ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
        for (let x = 0; x <= W; x += 20) { ctx.beginPath(); ctx.moveTo(x, 50); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 50; y <= H; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
        ctx.globalAlpha = 1;
        // 提示条
        ctx.fillStyle = card; ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
        PG.roundRect(ctx, 10, 8, W - 20, 36, 12); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ink; ctx.font = font(17); ctx.textBaseline = 'middle';
        ctx.fillText(anim ? '第 ' + Math.min(n, anim.i + 1) + ' / ' + n + ' 次 · ' + banner : banner, 22, 27, W - 44);
        ctx.textBaseline = 'alphabetic';
        // 目标
        ctx.fillStyle = card; ctx.strokeStyle = ink; ctx.lineWidth = 2;
        PG.roundRect(ctx, 384, 56, 86, 96, 12); ctx.fill(); ctx.stroke();
        ctx.fillStyle = api.color('--ink-2'); ctx.font = font(13); ctx.textAlign = 'center';
        ctx.fillText('目标', 427, 74);
        ctx.fillStyle = ink; ctx.fillText(GOALS[goal].name, 427, 144); ctx.textAlign = 'left';
        goalIcon(ctx, goal, 427, 106, 22, ink);
        if (wins[goal]) PG.drawStar(ctx, 460, 66, 9, sun, ink);

        // 画出来的线
        let tx = 190, ty = 182, th = -90 * RAD;
        if (pts) {
          const upto = anim ? anim.i : n;
          const P = (p) => [ox + p.x * sc, oy + p.y * sc];
          ctx.strokeStyle = sky; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.beginPath();
          const [x0, y0] = P(pts[0]); ctx.moveTo(x0, y0);
          for (let i = 1; i <= upto; i++) { const [x, y] = P(pts[i]); ctx.lineTo(x, y); }
          const a = pts[upto], [ax, ay] = P(a);
          tx = ax; ty = ay; th = a.hd * RAD;
          if (anim && upto < n) {
            const b = pts[upto + 1], [bx, by] = P(b);
            const k = Math.min(1, anim.t / (anim.per * 0.7));
            tx = ax + (bx - ax) * k; ty = ay + (by - ay) * k;
            ctx.lineTo(tx, ty);
            th = (a.hd + (anim.t > anim.per * 0.7 ? ang * Math.min(1, (anim.t - anim.per * 0.7) / (anim.per * 0.3)) : 0)) * RAD;
          }
          ctx.stroke(); ctx.lineCap = 'butt';
          ctx.fillStyle = sun; ctx.strokeStyle = ink; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(x0, y0, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          if (big && !anim) { ctx.fillStyle = api.color('--ink-2'); ctx.font = font(13); ctx.fillText('画太大了，缩小给你看', 14, H - 12); }
        }
        drawTurtle(ctx, tx, ty, th, 15, api.color('--grass'), ink);
        for (const q of party) {
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.globalAlpha = Math.min(1, q.life);
          PG.drawStar(ctx, 0, 0, 8, sun, ink); ctx.restore();
        }
        ctx.globalAlpha = 1;
      });

      // ---------- 猜一猜 ----------
      const setAll = (N, S, A) => { slN.set(N); slS.set(S); slA.set(A); };
      api.guesses([
        {
          q: '重复 4 次：往前走 100 步，右转 90°。会画出什么？',
          options: ['正方形', '三角形', '一条直线'], answer: 0,
          why: '每次走一条边、拐一个直角，拐 4 次正好转回起点，就是正方形。不用写 8 行，3 行就够了。',
          apply: () => { setAll(4, 100, 90); later(() => draw(null, true), 300); },
          delay: 3600,
        },
        {
          q: '把次数改成 3，角度改成 120°，会画出什么？',
          options: ['正方形', '三角形', '圆圈'], answer: 1,
          why: '重复 3 次，每次转 120°，3 × 120 = 360，正好转一整圈回到起点：三条边，三角形。',
          apply: () => { setAll(3, 120, 120); later(() => draw(null, true), 300); },
          delay: 3600,
        },
        {
          q: '想画一个更圆的圈，要怎么改？',
          options: ['次数变多，每次转得少一点', '次数变少，每次转得多一点', '只把步数变大'], answer: 0,
          why: '先画了重复 6 次、转 60°（六边形），再画重复 36 次、转 10°。边越多越短，拐的弯越小，看起来就越圆。',
          apply: () => {
            setAll(6, 60, 60);
            later(() => draw(() => later(() => { setAll(36, 10, 10); draw(null, true); }, 700), true), 300);
          },
          delay: 7200,
        },
      ]);

      api.say({
        left: '重复',
        right: '同样的事做好几遍，写一次“重复几次”就行',
        example: '跳绳跳 10 下，你不会说十遍“跳”，你会说“跳 10 下”。小乌龟画正方形也是：重复 4 次：往前走，右转 90°。',
        prompt: '我的作品里，有没有一件事是一直重复在做的？帮我找出来，告诉我它重复做的是什么、重复几次，先不要改。',
      });

      changed();
      banner = '要画：正方形。按 ▶ 画画';
    },

    thumb(ctx, w, h, t) {
      const ink = '#1b2440';
      // 一颗星星慢慢画出来，乌龟在笔头上
      const pts = trace(5, 120, 144);
      const oy = 30;
      let minX = 1e9, maxX = -1e9;
      for (const p of pts) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); }
      const cx = 160 - (minX + maxX) / 2;
      const k = (t * 0.6) % 6.5, i = Math.min(5, Math.floor(k)), f = Math.min(1, k - i);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx + pts[0].x, oy + 135 + pts[0].y);
      for (let j = 1; j <= i; j++) ctx.lineTo(cx + pts[j].x, oy + 135 + pts[j].y);
      let x = cx + pts[i].x, y = oy + 135 + pts[i].y;
      if (i < 5) { x += (pts[i + 1].x - pts[i].x) * f; y += (pts[i + 1].y - pts[i].y) * f; ctx.lineTo(x, y); }
      ctx.stroke(); ctx.lineCap = 'butt';
      drawTurtle(ctx, x, y, pts[i].hd * RAD, 13, '#1fb36f', ink);
      ctx.fillStyle = '#fff'; ctx.font = '18px sans-serif'; ctx.fillText('重复 5 次', 228, 186);
    },
  });
})();
