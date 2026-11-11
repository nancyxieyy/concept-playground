/* 第 7 关：状态。游戏在不同时候是不同的样子，箭头上写着什么时候换。 */
PG.register({
  id: 'state',
  no: 7,
  title: '跟着箭头换画面',
  concept: '状态',
  kid: '游戏在不同时候是不同的样子；箭头上写着什么时候换',
  level: 'K5',
  color: 'grass',
  play: '按“开始”跑起来，按“跳”躲开障碍。一边玩一边看右边的圈圈图：亮着的圈就是游戏现在的样子，走过的箭头会闪一下。',

  mount(api) {
    const W = 480, H = 280, GROUND = 232;
    const s = api.stage(W, H);
    const ctx = s.ctx;
    const font = (px) => px + 'px ' + getComputedStyle(document.body).fontFamily;

    // ---------- 圈和箭头 ----------
    const NAMES = { start: '开始', run: '进行中', over: '结束', pause: '暂停' };
    const EVN = { start: '开始', jump: '跳', p: 'P 暂停', again: '再来一次' };
    const ARROWS = [
      { from: 'start', to: 'run', ev: 'start', label: '按开始', bend: 0 },
      { from: 'run', to: 'over', ev: 'crash', label: '撞到', bend: 0 },
      { from: 'over', to: 'start', ev: 'again', label: '再来一次', bend: 0 },
      { from: 'run', to: 'pause', ev: 'p', label: '按 P', bend: 20, extra: true },
      { from: 'pause', to: 'run', ev: 'p', label: '再按 P', bend: 20, extra: true },
    ];
    let state = 'start', pauseOn = false;
    let litArrow = -1, litT = 0, rejectT = 0, msg = '', msgT = 0;

    // ---------- 小怪兽快跑 ----------
    const me = { x: 80, y: GROUND, vy: 0, w: 30, h: 30 };
    let blocks = [], spawn = 1, score = 0, noJump = 0, runT = 0;

    function resetRun() { me.y = GROUND; me.vy = 0; blocks = []; spawn = 1; score = 0; rScore.set(0); }

    function go(i) {
      const a = ARROWS[i];
      state = a.to; litArrow = i; litT = 1.1;
      rState.set(NAMES[state]);
      if (a.to === 'run' && a.from === 'start') resetRun();
      api.sound(a.to === 'over' ? 'lose' : a.to === 'pause' || a.from === 'pause' ? 'step' : 'pop');
    }
    // 按了一个键：从现在这个圈出发，有没有写着它的箭头？
    function send(ev) {
      if (ev === 'jump' && state === 'run') { jump(); return; }
      const i = ARROWS.findIndex((a) => a.from === state && a.ev === ev && (!a.extra || pauseOn));
      if (i >= 0) { go(i); return; }
      if (ev === 'p' && !pauseOn) say('还没有“暂停”这个圈。先在右边把它加上。');
      else say('在“' + NAMES[state] + '”这个圈里，按「' + EVN[ev] + '」没反应：没有写着它的箭头。');
      rejectT = 0.6; api.sound('tick');
    }
    function say(t) { msg = t; msgT = 2.6; }
    function jump() {
      if (noJump > 0) { api.sound('tick'); return; }
      if (me.y >= GROUND - 0.5) { me.vy = -560; api.sound('boing'); }
    }

    // ---------- 右边：按钮和圈圈图 ----------
    const rState = api.readout('现在在哪个圈', NAMES[state]);
    const rScore = api.readout('跑过几个障碍', 0);
    const pad = api.h('div', { class: 'seg' });
    [['开始', 'start'], ['跳', 'jump'], ['P 暂停', 'p'], ['再来一次', 'again']].forEach(([lab, ev]) => {
      const b = api.h('button', { class: 'btn', type: 'button', style: { touchAction: 'manipulation' } }, lab);
      b.addEventListener('click', () => send(ev));
      pad.append(b);
    });
    api.controlBox.append(api.h('div', { class: 'ctl' },
      api.h('span', { class: 'lab' }, '按键'), pad,
      api.h('span', { class: 'small' }, '键盘：回车 = 开始，空格或 ↑ = 跳，P = 暂停，R = 再来一次。点画面也能跳。')));

    const diaWrap = api.h('div', { class: 'ctl' }, api.h('span', { class: 'lab' }, '圈圈图：圈是游戏的样子，箭头上写着什么时候换'));
    api.controlBox.append(diaWrap);
    const DW = 380, DH = 260;
    const d = api.stage(DW, DH, diaWrap);
    Object.assign(d.canvas.style, { width: '100%', height: 'auto', display: 'block', border: '2.5px solid var(--ink)', borderRadius: '12px', background: 'var(--stage)' });
    const dc = d.ctx;
    const POS = { start: [62, 92], run: [200, 92], over: [131, 210], pause: [326, 92] };
    const CR = 34;

    const pauseSw = api.choice({
      label: '加一个“暂停”圈', value: false,
      options: [{ value: false, label: '不加' }, { value: true, label: '加上' }],
      onChange: (v) => {
        pauseOn = v;
        if (!v && state === 'pause') { state = 'run'; rState.set(NAMES.run); }
        say(v ? '加好了：多了一个“暂停”圈，还有两条写着 P 的箭头。' : '“暂停”圈拿掉了。');
      },
    });

    function drawArrow(a, lit, ghost) {
      const [x1, y1] = POS[a.from], [x2, y2] = POS[a.to];
      const len = Math.hypot(x2 - x1, y2 - y1), dx = (x2 - x1) / len, dy = (y2 - y1) / len;
      const nx = dy, ny = -dx; // 箭头左手边
      const sx = x1 + dx * CR + nx * a.bend * 0.6, sy = y1 + dy * CR + ny * a.bend * 0.6;
      const ex = x2 - dx * (CR + 2) + nx * a.bend * 0.6, ey = y2 - dy * (CR + 2) + ny * a.bend * 0.6;
      const cx = (x1 + x2) / 2 + nx * a.bend * 1.6, cy = (y1 + y2) / 2 + ny * a.bend * 1.6;
      const col = lit ? api.color('--sun') : api.color('--ink');
      dc.save();
      dc.globalAlpha = ghost ? 0.35 : 1;
      if (ghost) dc.setLineDash([5, 4]);
      dc.strokeStyle = col; dc.lineWidth = lit ? 5 : 2.5;
      dc.beginPath(); dc.moveTo(sx, sy); dc.quadraticCurveTo(cx, cy, ex, ey); dc.stroke();
      dc.setLineDash([]);
      const ang = Math.atan2(ey - cy, ex - cx);
      dc.fillStyle = col; dc.beginPath();
      dc.moveTo(ex, ey);
      dc.lineTo(ex - Math.cos(ang - 0.45) * 12, ey - Math.sin(ang - 0.45) * 12);
      dc.lineTo(ex - Math.cos(ang + 0.45) * 12, ey - Math.sin(ang + 0.45) * 12);
      dc.closePath(); dc.fill();
      // 箭头上的字
      const off = a.bend ? a.bend * 0.8 + 12 : 16;
      const lx = (x1 + x2) / 2 + nx * off, ly = (y1 + y2) / 2 + ny * off;
      dc.font = font(14); dc.textAlign = 'center'; dc.textBaseline = 'middle';
      const tw = dc.measureText(a.label).width + 10;
      dc.fillStyle = lit ? api.color('--sun') : api.color('--card');
      dc.fillRect(lx - tw / 2, ly - 10, tw, 20);
      dc.fillStyle = lit ? '#1b2440' : api.color('--ink');
      dc.fillText(a.label, lx, ly);
      dc.restore();
    }
    function drawCircle(key, ghost, t) {
      let [x, y] = POS[key];
      const cur = key === state && !ghost;
      if (cur && rejectT > 0) x += Math.sin(t * 60) * 4;
      dc.save();
      dc.globalAlpha = ghost ? 0.35 : 1;
      if (ghost) dc.setLineDash([5, 4]);
      dc.fillStyle = cur ? (rejectT > 0 ? api.color('--tomato') : api.color('--grass')) : api.color('--card');
      dc.strokeStyle = api.color('--ink'); dc.lineWidth = cur ? 4 : 2.5;
      dc.beginPath(); dc.arc(x, y, cur ? CR + 3 : CR, 0, Math.PI * 2); dc.fill(); dc.stroke();
      dc.fillStyle = cur ? '#1b2440' : api.color('--ink');
      dc.font = font(NAMES[key].length > 2 ? 16 : 18); dc.textAlign = 'center'; dc.textBaseline = 'middle';
      dc.fillText(NAMES[key], x, y);
      if (ghost) { dc.font = font(12); dc.fillText('（还没加）', x, y + CR + 14); }
      dc.restore();
    }
    function drawDiagram(t) {
      d.clear();
      ARROWS.forEach((a, i) => { if (!a.extra || pauseOn) drawArrow(a, i === litArrow && litT > 0, false); });
      if (!pauseOn) ARROWS.forEach((a) => { if (a.extra) drawArrow(a, false, true); });
      ['start', 'run', 'over'].forEach((k) => drawCircle(k, false, t));
      drawCircle('pause', !pauseOn, t);
      dc.fillStyle = api.color('--ink'); dc.font = font(13); dc.textAlign = 'left'; dc.textBaseline = 'alphabetic';
      dc.fillText('亮着的圈 = 现在的样子', 10, 20);
      if (state === 'run') { dc.textAlign = 'center'; dc.fillText('（这里按跳 = 跳一下）', POS.run[0], POS.run[1] - CR - 12); }
    }

    // ---------- 键盘、点画面 ----------
    const keyEv = { Enter: 'start', ' ': 'jump', ArrowUp: 'jump', p: 'p', P: 'p', r: 'again', R: 'again' };
    api.on(window, 'keydown', (e) => {
      const ev = keyEv[e.key];
      if (!ev) return;
      e.preventDefault();
      // 焦点在按钮上时，免得按钮自己也被按一次
      if (document.activeElement && document.activeElement.tagName === 'BUTTON') document.activeElement.blur();
      if (!e.repeat) send(ev);
    });
    api.on(s.canvas, 'pointerdown', (e) => { e.preventDefault(); send('jump'); });

    // ---------- 每一张 ----------
    function drawMonster(x, y, t, sad) {
      const ink = api.color('--ink');
      ctx.fillStyle = api.color('--grass'); ctx.strokeStyle = ink; ctx.lineWidth = 3;
      PG.roundRect(ctx, x - 15, y - 30, 30, 30, 9); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 10, y - 30); ctx.lineTo(x - 6, y - 38); ctx.lineTo(x - 2, y - 30);
      ctx.moveTo(x + 2, y - 30); ctx.lineTo(x + 6, y - 38); ctx.lineTo(x + 10, y - 30); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + 4, y - 19, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1b2440';
      if (sad) { ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('x', x + 4, y - 15); ctx.textAlign = 'left'; }
      else { ctx.beginPath(); ctx.arc(x + 6, y - 19, 2.8, 0, Math.PI * 2); ctx.fill(); }
      // 小脚
      const step = state === 'run' ? Math.sin(t * 20) * 3 : 0;
      ctx.fillStyle = ink; ctx.fillRect(x - 10 + step, y - 2, 7, 4); ctx.fillRect(x + 3 - step, y - 2, 7, 4);
    }
    function bigText(a, b, col) {
      ctx.save();
      ctx.fillStyle = api.color('--stage'); ctx.globalAlpha = 0.72; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
      ctx.textAlign = 'center'; ctx.fillStyle = col; ctx.font = font(34); ctx.fillText(a, W / 2, 110);
      ctx.fillStyle = api.color('--ink'); ctx.font = font(18); ctx.fillText(b, W / 2, 146);
      ctx.restore();
    }

    api.loop((dt, t) => {
      litT = Math.max(0, litT - dt); rejectT = Math.max(0, rejectT - dt); msgT = Math.max(0, msgT - dt);
      noJump = Math.max(0, noJump - dt);
      if (state === 'run') {
        runT += dt;
        me.vy += 1500 * dt; me.y += me.vy * dt;
        if (me.y > GROUND) { me.y = GROUND; me.vy = 0; }
        spawn -= dt;
        if (spawn <= 0) { spawn = 1.1 + Math.random() * 0.9; blocks.push({ x: W + 20, w: 22, h: 26 + Math.random() * 20 }); }
        const sp = 230 + score * 6;
        for (const b of blocks) {
          b.x -= sp * dt;
          if (!b.passed && b.x + b.w < me.x - me.w / 2) { b.passed = true; score++; rScore.set(score); api.sound('ding'); }
          // 撞到了吗：两个框叠上没有（框比画的小一点点，公平些）
          const hit = me.x + me.w / 2 - 4 > b.x && me.x - me.w / 2 + 4 < b.x + b.w && me.y - 4 > GROUND - b.h;
          if (hit && state === 'run') send('crash');
        }
        blocks = blocks.filter((b) => b.x > -40);
      }

      // 画游戏
      const ink = api.color('--ink');
      s.clear();
      ctx.fillStyle = api.color('--line'); ctx.fillRect(0, GROUND, W, H - GROUND);
      ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, GROUND); ctx.lineTo(W, GROUND); ctx.stroke();
      for (const b of blocks) {
        ctx.fillStyle = api.color('--tomato'); ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
        PG.roundRect(ctx, b.x, GROUND - b.h, b.w, b.h, 5); ctx.fill(); ctx.stroke();
      }
      const bob = state === 'start' ? Math.abs(Math.sin(t * 3)) * -10 : 0;
      drawMonster(me.x, me.y + bob, t, state === 'over');
      ctx.fillStyle = ink; ctx.font = font(15); ctx.textAlign = 'left';
      if (state !== 'start') ctx.fillText('跑过 ' + score + ' 个', 12, 24);

      if (state === 'start') bigText('小怪兽快跑', '按「开始」（或回车）就跑起来', api.color('--grass'));
      else if (state === 'over') bigText('撞到了！跑过 ' + score + ' 个', '按「再来一次」回到开始画面', api.color('--tomato'));
      else if (state === 'pause') bigText('暂停中 ‖', '什么都不动。再按 P 回去接着跑', api.color('--sky'));

      // 右上角：现在在哪个圈
      ctx.font = font(15);
      const tag = '现在在：' + NAMES[state];
      const tw = ctx.measureText(tag).width + 16;
      ctx.fillStyle = api.color('--card'); ctx.strokeStyle = ink; ctx.lineWidth = 2;
      PG.roundRect(ctx, W - tw - 10, 8, tw, 26, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ink; ctx.fillText(tag, W - tw - 2, 26);

      if (msgT > 0) {
        ctx.save(); ctx.globalAlpha = Math.min(1, msgT * 2);
        ctx.font = font(15); ctx.textAlign = 'center';
        const mw = Math.min(W - 20, ctx.measureText(msg).width + 20);
        ctx.fillStyle = '#1b2440'; PG.roundRect(ctx, (W - mw) / 2, H - 40, mw, 30, 10); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillText(msg, W / 2, H - 20, W - 30);
        ctx.restore();
      }
      drawDiagram(t);
    });

    // 老师帮忙直接跳到某个圈（猜一猜里用）
    function setState(k) { state = k; rState.set(NAMES[k]); }

    api.guesses([
      {
        q: '游戏在“开始”这个圈里。这时按「跳」，会怎样？',
        options: ['小怪兽跳起来', '游戏开始跑', '什么都不发生'], answer: 2,
        why: '从“开始”出去，只有一条写着“按开始”的箭头。没有写着“跳”的箭头，所以按跳没反应。看看画面下面那句话。',
        apply: () => { setState('start'); resetRun(); setTimeout(() => send('jump'), 400); },
      },
      {
        q: '跑着跑着撞到障碍了，游戏会去哪个圈？',
        options: ['开始', '结束', '暂停'], answer: 1,
        why: '“撞到”这条箭头是从“进行中”指向“结束”的。撞到了，就沿着箭头走到“结束”，画面也换成了结束的样子。',
        apply: () => {
          setState('start'); resetRun(); send('start');
          blocks = [{ x: 190, w: 22, h: 40 }]; spawn = 3; noJump = 1.5;
        },
      },
      {
        q: '加上“暂停”圈以后，能不能从“暂停”直接去“结束”？',
        options: ['能，撞到就会去结束', '不能，要先按 P 回到进行中'], answer: 1,
        why: '从“暂停”出去只有一条箭头：再按 P 回到“进行中”。暂停的时候什么都不动，障碍就停在旁边，撞不上，所以去不了“结束”。',
        apply: () => {
          pauseSw.set(true);
          setState('start'); resetRun(); send('start');
          blocks = [{ x: 130, w: 22, h: 40 }]; spawn = 3;
          setTimeout(() => { if (state === 'run') send('p'); }, 80);
        },
      },
    ]);

    api.say({
      left: '状态',
      right: '游戏在不同时候是不同的样子，箭头上写着什么时候换',
      example: '开始、进行中、结束、暂停都是状态。“撞到”这条箭头，把游戏从进行中带到结束。',
      prompt: '我的作品里有几个状态（比如开始、进行中、结束）？每个状态之间，按什么或者发生什么就会换过去？请画成圈和箭头告诉我，先不要改。',
    });
  },

  thumb(ctx, w, h, t) {
    const pts = [[70, 80], [250, 80], [160, 160]];
    const names = ['开始', '进行中', '结束'];
    const cur = Math.floor(t / 1.2) % 3;
    ctx.strokeStyle = '#1b2440'; ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % 3];
      ctx.beginPath(); ctx.moveTo(x1 + (x2 - x1) * 0.25, y1 + (y2 - y1) * 0.25); ctx.lineTo(x1 + (x2 - x1) * 0.72, y1 + (y2 - y1) * 0.72); ctx.stroke();
    }
    pts.forEach(([x, y], i) => {
      ctx.fillStyle = i === cur ? '#ffd43b' : '#fff';
      ctx.beginPath(); ctx.arc(x, y, 34, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1b2440'; ctx.font = '17px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(names[i], x, y);
    });
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  },
});
