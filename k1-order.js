/* 程序森林 第 1 关：顺序。把指令卡排好，小机器人从上往下一条一条照着做。
   顺序错了它照样做（袜子套在鞋外面）；少写一步它就不做（不会自己补上）。 */
(function () {
  'use strict';
  const font = (px) => px + 'px ' + getComputedStyle(document.body).fontFamily;
  const has = (a, x) => a.indexOf(x) >= 0;

  // ---------- 三件事：每张卡做什么、做错了会怎样 ----------
  // act(st, card) 返回 { bad: 是不是出了怪事, say: 机器人说的话 }
  const TASKS = [
    {
      name: '穿鞋出门', panel: '机器人的脚（放大看）',
      goal: '帮机器人穿好袜子和鞋，系好鞋带。',
      cards: ['穿袜子', '穿鞋', '系鞋带'],
      init: () => ({ layers: [], tied: false }),
      act(st, c) {
        if (c === '穿袜子') {
          const over = has(st.layers, 'shoe');
          st.layers.push('sock');
          return over ? { bad: true, say: '袜子套在鞋外面了！' } : { say: '穿好袜子' };
        }
        if (c === '穿鞋') { st.layers.push('shoe'); return { say: has(st.layers, 'sock') ? '穿好鞋' : '光着脚穿上鞋……' }; }
        if (!has(st.layers, 'shoe')) return { bad: true, say: '脚上没有鞋，鞋带在哪？' };
        st.tied = true;
        return { say: '系好鞋带' };
      },
    },
    {
      name: '刷牙', panel: '洗手台',
      goal: '帮机器人刷牙。',
      cards: ['拿起牙刷', '打开牙膏盖', '挤牙膏', '刷牙', '漱口'],
      init: () => ({ hand: false, open: false, paste: false, handPaste: false, brushed: false, foam: false, rinsed: false }),
      act(st, c) {
        if (c === '拿起牙刷') { st.hand = true; return { say: '拿起牙刷' }; }
        if (c === '打开牙膏盖') { st.open = true; return { say: '打开盖子' }; }
        if (c === '挤牙膏') {
          if (!st.open) return { bad: true, say: '盖子没开，挤不出来！' };
          if (!st.hand) { st.handPaste = true; return { bad: true, say: '没拿牙刷，挤到手上了！' }; }
          st.paste = true; return { say: '挤好牙膏' };
        }
        if (c === '刷牙') {
          if (!st.hand) return { bad: true, say: '没拿牙刷，用手指刷？' };
          if (!st.paste) { st.brushed = true; return { bad: true, say: '没有牙膏，干刷……' }; }
          st.brushed = true; st.foam = true; return { say: '刷刷刷，满嘴泡泡' };
        }
        if (!st.brushed) return { bad: true, say: '还没刷牙，先漱了口？' };
        st.foam = false; st.rinsed = true; return { say: '咕噜咕噜，干净了' };
      },
    },
    {
      name: '做三明治', panel: '厨房桌子',
      goal: '帮机器人做一个三明治。',
      cards: ['拿出盘子', '放一片面包', '抹果酱', '放生菜', '盖上一片面包', '切成两半'],
      init: () => ({ plate: false, stack: [], cut: false }),
      act(st, c) {
        const where = st.plate ? '盘子' : '桌子';
        if (c === '拿出盘子') {
          const late = st.stack.length > 0;
          st.plate = true;
          return late ? { bad: true, say: '东西早就放在桌子上了！' } : { say: '拿出盘子' };
        }
        if (c === '放一片面包') {
          const bad = !st.plate;
          st.stack.push('bread');
          return bad ? { bad, say: '没有盘子，面包放桌上了' } : { say: '放一片面包' };
        }
        if (c === '抹果酱' || c === '放生菜') {
          const k = c === '抹果酱' ? 'jam' : 'leaf', nm = c === '抹果酱' ? '果酱' : '生菜';
          const noBread = !has(st.stack, 'bread'), onTop = has(st.stack, 'top');
          st.stack.push(k);
          if (noBread) return { bad: true, say: nm + (k === 'jam' ? '抹在' : '放在') + where + '上了！' };
          if (onTop) return { bad: true, say: nm + '跑到三明治外面了！' };
          return { say: c };
        }
        if (c === '盖上一片面包') {
          const bad = !has(st.stack, 'bread');
          st.stack.push('top');
          return bad ? { bad, say: '下面没有面包，直接盖在' + where + '上' } : { say: '盖上面包' };
        }
        // 切成两半
        st.cut = true;
        if (!st.stack.length) return { bad: true, say: '什么都没有，切了个空气！' };
        if (!has(st.stack, 'top')) return { bad: true, say: '还没盖上就切，散了！' };
        return { say: '咔嚓，切成两半' };
      },
    },
  ];

  // ---------- 画画的小零件 ----------
  function drawBot(ctx, x, y, o) {
    const ink = o.ink, body = o.body;
    ctx.save();
    ctx.translate(x + (o.shake || 0), y);
    ctx.lineWidth = 3; ctx.strokeStyle = ink; ctx.lineJoin = 'round';
    // 腿
    ctx.fillStyle = '#b9c2d3';
    ctx.fillRect(-22, 70, 14, 34); ctx.strokeRect(-22, 70, 14, 34);
    ctx.fillRect(8, 70, 14, 34); ctx.strokeRect(8, 70, 14, 34);
    // 手臂
    ctx.beginPath(); ctx.moveTo(-40, 14); ctx.lineTo(-58, 58); ctx.moveTo(40, 14); ctx.lineTo(58, 58); ctx.stroke();
    ctx.fillStyle = '#b9c2d3';
    for (const sx of [-58, 58]) { ctx.beginPath(); ctx.arc(sx, 62, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    // 身体
    ctx.fillStyle = body; PG.roundRect(ctx, -40, 0, 80, 72, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.arc(0, 30, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // 脖子、头
    ctx.fillStyle = '#b9c2d3'; ctx.fillRect(-8, -10, 16, 12); ctx.strokeRect(-8, -10, 16, 12);
    ctx.fillStyle = body; PG.roundRect(ctx, -38, -64, 76, 56, 14); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -64); ctx.lineTo(0, -76); ctx.stroke();
    ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.arc(0, -80, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // 脸
    ctx.fillStyle = '#fff'; PG.roundRect(ctx, -30, -56, 60, 40, 10); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#1b2440'; ctx.fillStyle = '#1b2440'; ctx.lineWidth = 3;
    if (o.mood === 'oops') {
      for (const ex of [-13, 13]) { ctx.beginPath(); ctx.moveTo(ex - 5, -46); ctx.lineTo(ex + 5, -38); ctx.moveTo(ex + 5, -46); ctx.lineTo(ex - 5, -38); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(0, -22, 5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      ctx.fillStyle = '#5c9cff'; ctx.beginPath(); ctx.moveTo(34, -60); ctx.quadraticCurveTo(42, -48, 34, -44); ctx.quadraticCurveTo(26, -48, 34, -60); ctx.fill();
    } else if (o.mood === 'happy') {
      for (const ex of [-13, 13]) { ctx.beginPath(); ctx.arc(ex, -40, 5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(0, -30, 8, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    } else {
      for (const ex of [-13, 13]) { ctx.beginPath(); ctx.arc(ex, -42, 4.5, 0, Math.PI * 2); ctx.fill(); }
      ctx.beginPath(); ctx.moveTo(-7, -26); ctx.lineTo(7, -26); ctx.stroke();
    }
    if (o.foam) {
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#9fb6d9'; ctx.lineWidth = 1.5;
      for (const [bx, by, r] of [[-12, -24, 6], [-2, -20, 7], [10, -23, 6], [18, -18, 5], [-18, -18, 4], [4, -14, 5]]) {
        ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    }
    ctx.restore();
  }

  function bubble(ctx, text, x, y, w, tipX, tipY, fill, ink) {
    ctx.font = font(17);
    ctx.fillStyle = fill; ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
    PG.roundRect(ctx, x, y, w, 38, 12); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tipX - 8, y + 37); ctx.lineTo(tipX, tipY); ctx.lineTo(tipX + 8, y + 37); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(tipX - 8, y + 38); ctx.lineTo(tipX, tipY); ctx.lineTo(tipX + 8, y + 38); ctx.stroke();
    ctx.fillStyle = '#1b2440'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + 20, w - 16);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  // 脚：一层一层套上去，后套的在外面
  function drawFoot(ctx, st, ink, c) {
    ctx.lineWidth = 3; ctx.strokeStyle = ink;
    ctx.fillStyle = '#b9c2d3';
    ctx.fillRect(312, 96, 36, 140); ctx.strokeRect(312, 96, 36, 140);
    PG.roundRect(ctx, 312, 214, 120, 40, 18); ctx.fill(); ctx.stroke();
    st.layers.forEach((L, i) => {
      const g = 4 + i * 6;
      if (L === 'sock') {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.rect(312 - g, 150 - g, 36 + g * 2, 80); ctx.fill(); ctx.stroke();
        PG.roundRect(ctx, 312 - g, 214 - g, 120 + g * 2, 40 + g * 2, 18 + g); ctx.fill(); ctx.stroke();
        ctx.fillStyle = c.sky; ctx.fillRect(313 - g, 152 - g, 34 + g * 2, 8); ctx.fillRect(313 - g, 166 - g, 34 + g * 2, 8);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(313 - g, 216 - g, 34 + g * 2, 12);
      } else {
        ctx.fillStyle = c.tomato;
        ctx.beginPath(); ctx.rect(310 - g, 196 - g, 40 + g * 2, 30); ctx.fill(); ctx.stroke();
        PG.roundRect(ctx, 310 - g, 208 - g, 126 + g * 2, 46 + g * 2, 20); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#1b2440'; ctx.fillRect(310 - g, 246 + g, 126 + g * 2, 8);
        ctx.fillStyle = c.tomato; ctx.fillRect(312 - g, 212 - g, 36 + g * 2, 14);
      }
    });
    if (has(st.layers, 'shoe')) {
      const top = 208 - (4 + (st.layers.length - 1) * 6);
      ctx.strokeStyle = '#ffd43b'; ctx.lineWidth = 4;
      if (st.tied) {
        ctx.beginPath(); ctx.ellipse(372, top - 4, 12, 7, -0.4, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(392, top - 4, 12, 7, 0.4, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.moveTo(374, top + 4); ctx.quadraticCurveTo(366, top + 30, 356, top + 52); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(388, top + 4); ctx.quadraticCurveTo(400, top + 32, 396, top + 54); ctx.stroke();
      }
    }
  }

  function drawBrush(ctx, x1, y1, x2, y2, paste, ink, c) {
    ctx.lineCap = 'round'; ctx.strokeStyle = ink; ctx.lineWidth = 11;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = c.sky; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.lineCap = 'butt';
    const a = Math.atan2(y2 - y1, x2 - x1);
    ctx.save(); ctx.translate(x2, y2); ctx.rotate(a);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = ink; ctx.lineWidth = 2;
    ctx.fillRect(-26, -16, 24, 12); ctx.strokeRect(-26, -16, 24, 12);
    if (paste) {
      ctx.fillStyle = '#e8f6ff'; ctx.strokeStyle = c.sky; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(-14, -21, 13, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  function drawSink(ctx, st, ink, c, botX, botY) {
    // 牙膏
    ctx.lineWidth = 2.5; ctx.strokeStyle = ink; ctx.fillStyle = '#fff';
    PG.roundRect(ctx, 256, 252, 110, 32, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = c.sky; ctx.fillRect(272, 262, 60, 10);
    ctx.fillStyle = '#fff'; ctx.fillRect(366, 260, 12, 16); ctx.strokeRect(366, 260, 12, 16);
    ctx.fillStyle = c.tomato;
    if (st.open) { ctx.fillRect(388, 284, 14, 12); ctx.strokeRect(388, 284, 14, 12); }
    else { ctx.fillRect(378, 258, 12, 20); ctx.strokeRect(378, 258, 12, 20); }
    ctx.fillStyle = ink; ctx.font = font(12); ctx.fillText('牙膏', 292, 300);
    // 杯子
    ctx.fillStyle = 'rgba(92,156,255,.25)'; ctx.strokeStyle = ink;
    ctx.beginPath(); ctx.moveTo(410, 236); ctx.lineTo(456, 236); ctx.lineTo(450, 290); ctx.lineTo(416, 290); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = ink; ctx.fillText('杯子', 420, 306);
    // 牙刷：在桌上，或者在机器人手里
    if (st.hand) drawBrush(ctx, botX + 58, botY + 62, botX + 96, botY + 6, st.paste, ink, c);
    else drawBrush(ctx, 270, 220, 400, 220, st.paste, ink, c);
    if (st.handPaste) {
      ctx.fillStyle = '#e8f6ff'; ctx.strokeStyle = c.sky; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(botX + 58, botY + 58, 14, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(botX + 64, botY + 52, 7, 4, 0.4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  }

  function drawLayer(ctx, k, y, ink, c) {
    ctx.lineWidth = 2.5; ctx.strokeStyle = ink;
    if (k === 'bread' || k === 'top') {
      ctx.fillStyle = '#f2c27b';
      PG.roundRect(ctx, 290, y - 16, 126, 16, k === 'top' ? 8 : 4); ctx.fill(); ctx.stroke();
      return 16;
    }
    if (k === 'jam') {
      ctx.fillStyle = c.tomato; PG.roundRect(ctx, 296, y - 7, 114, 7, 3); ctx.fill(); ctx.stroke();
      return 7;
    }
    ctx.fillStyle = c.grass;
    ctx.beginPath(); ctx.moveTo(286, y);
    for (let i = 0; i <= 12; i++) ctx.lineTo(286 + i * 11, y - (i % 2 ? 11 : 5));
    ctx.lineTo(418, y); ctx.closePath(); ctx.fill(); ctx.stroke();
    return 9;
  }

  function drawKitchen(ctx, st, ink, c) {
    ctx.strokeStyle = ink; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(248, 292); ctx.lineTo(458, 292); ctx.stroke();
    if (st.plate) {
      ctx.fillStyle = '#fff'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(353, 282, 96, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    const base = st.plate ? 280 : 291;
    const paint = () => { let y = base; for (const k of st.stack) y -= drawLayer(ctx, k, y, ink, c); };
    if (!st.cut) { paint(); return; }
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.beginPath(); ctx.rect(side < 0 ? 240 : 353, 60, 113, 222); ctx.clip();
      ctx.translate(side * 9, 0); paint();
      ctx.restore();
    }
  }

  PG.register({
    id: 'order',
    title: '一步一步来',
    concept: '顺序（一步一步的指令）',
    kid: '电脑只会一步一步照着做，顺序错了结果就不对',
    level: 'K1',
    color: 'grass',
    play: '点下面的指令卡，把它们排进程序里，再按“▶ 运行”。小机器人会从上往下，一条一条照着做。',

    mount(api) {
      const W = 480, H = 320;
      const s = api.stage(W, H);
      const ctx = s.ctx;
      const h = api.h;
      const BX = 118, BY = 186; // 机器人的位置

      let round = 0, task = TASKS[0];
      let deck = [], prog = [];
      let st = null, run = null, banner = '', say = '', mood = 'ok', shake = 0, party = [];
      const wins = [false, false, false];
      const timers = [];
      const later = (fn, ms) => timers.push(setTimeout(fn, ms));
      api.onCleanup(() => timers.forEach(clearTimeout));

      // ---------- 右边：程序 + 卡片 ----------
      const roundPick = api.choice({
        label: '关卡', value: 0,
        options: TASKS.map((t, i) => ({ value: i, label: (i + 1) + ' ' + t.name })),
        onChange: (v) => loadRound(v),
      });
      const goalP = h('p', { class: 'small', style: { margin: '0', fontSize: '16px', color: 'var(--ink)' } });
      const slots = h('div', { style: { display: 'grid', gap: '6px' }, role: 'list', 'aria-label': '程序' });
      api.controlBox.append(h('div', { class: 'ctl' },
        h('span', { class: 'lab' }, h('span', null, '程序', h('span', { class: 'grown', style: { fontWeight: '400' } }, '（顺序）')), h('span', { class: 'small' }, '从上往下做')),
        goalP, slots));
      const pool = h('div', { class: 'seg', 'aria-label': '指令卡' });
      api.controlBox.append(h('div', { class: 'ctl' }, h('span', { class: 'lab' }, h('span', null, '指令卡（点一下放进程序）')), pool));
      const row = h('div', { class: 'seg' });
      api.controlBox.append(row);
      const bRun = api.button('▶ 运行', () => start(), 'primary', row);
      const bClear = api.button('清空', () => { if (run) return; prog = []; reset(); api.sound('pop'); render(); }, '', row);

      function render() {
        const busy = !!run;
        slots.textContent = '';
        for (let i = 0; i < task.cards.length; i++) {
          const c = prog[i];
          const num = h('span', { style: { font: '20px/1 var(--display)', width: '1.4em', textAlign: 'center', flex: 'none' } }, String(i + 1));
          if (!c) {
            slots.append(h('div', { role: 'listitem', style: { display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 10px', border: '2.5px dashed var(--line)', borderRadius: '12px', color: 'var(--ink-2)' } },
              num, h('span', null, i === prog.length ? '点下面的卡片放到这里' : '（空）')));
            continue;
          }
          const now = run && run.i === i;
          const card = h('button', {
            class: 'btn', type: 'button', disabled: busy, title: '点一下拿回去',
            'aria-label': '第 ' + (i + 1) + ' 步：' + c + '，点一下拿回去',
            style: { flex: '1', textAlign: 'left', padding: '8px 12px', outline: now ? '4px solid var(--grass)' : 'none', outlineOffset: '2px' },
          }, c);
          card.addEventListener('click', () => { if (run) return; prog.splice(i, 1); reset(); api.sound('pop'); render(); });
          const up = h('button', { class: 'btn', type: 'button', disabled: busy || i === 0, 'aria-label': '往上挪一格', style: { padding: '8px 12px', flex: 'none' } }, '▲');
          up.addEventListener('click', () => { if (run || i === 0) return; [prog[i - 1], prog[i]] = [prog[i], prog[i - 1]]; reset(); api.sound('tick'); render(); });
          slots.append(h('div', { role: 'listitem', style: { display: 'flex', alignItems: 'center', gap: '6px' } }, num, card, up));
        }
        pool.textContent = '';
        const left = deck.filter((c) => !has(prog, c));
        left.forEach((c) => {
          const b = h('button', { class: 'btn', type: 'button', disabled: busy, style: { padding: '10px 14px' } }, c);
          b.addEventListener('click', () => addCard(c));
          pool.append(b);
        });
        if (!left.length) pool.append(h('span', { class: 'small' }, '卡片都放进去了。按“▶ 运行”试试！'));
        bRun.disabled = busy || !prog.length;
        bClear.disabled = busy || !prog.length;
      }

      function addCard(c) {
        if (run || has(prog, c)) return;
        prog.push(c); reset(); api.sound('pop'); render();
      }

      function reset() {
        st = task.init(); mood = 'ok'; say = ''; party = [];
        banner = prog.length ? '排好了就按 ▶ 运行' : '任务：' + task.goal;
        const o = api.stageBox.querySelector('.overlay'); if (o) o.remove();
      }

      function shuffled(cards) {
        let d;
        do { d = cards.slice().sort(() => Math.random() - 0.5); } while (d.length > 1 && d.every((c, i) => c === cards[i]));
        return d;
      }

      function loadRound(k, preset) {
        timers.forEach(clearTimeout); timers.length = 0;
        round = k; task = TASKS[k]; run = null;
        deck = shuffled(task.cards);
        prog = preset ? preset.slice() : [];
        goalP.textContent = '任务：' + task.goal;
        reset();
        api.setHint('点指令卡，把它们排进程序里，再按“▶ 运行”。点程序里的卡可以拿回来，▲ 可以往上挪。');
        render();
      }

      function start() {
        if (run || !prog.length) return;
        reset();
        run = { i: -1, t: 0.4, bad: 0 };
        banner = '运行中……';
        api.setHint('看：机器人从上往下，一条一条照着做。');
        render();
      }

      function step() {
        run.i++;
        if (run.i >= prog.length) { finish(); return; }
        const c = prog[run.i];
        const r = task.act(st, c);
        banner = '第 ' + (run.i + 1) + ' 步：' + c;
        say = r.say;
        if (r.bad) { run.bad++; mood = 'oops'; shake = 0.6; api.sound('buzz'); } else { mood = 'ok'; api.sound('step'); }
        render();
      }

      function finish() {
        const missing = task.cards.filter((c) => !has(prog, c));
        const okRun = !run.bad && !missing.length;
        run = null;
        if (okRun) {
          banner = '完成啦！'; mood = 'happy'; say = '照着做完了！';
          api.sound('win');
          for (let i = 0; i < 30; i++) {
            const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 140;
            party.push({ x: 353, y: 170, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 80, r: Math.random() * 6, life: 1.5 });
          }
          wins[round] = true;
          const all = wins.every(Boolean);
          api.setHint(all ? '三关全部完成！每一步都排对了。' : '排对啦！顺序对了，机器人就能做成。');
          later(() => api.overlay(
            all ? '三关全部完成！你是指令小队长！点这里再玩一次'
              : '第 ' + (round + 1) + ' 关完成！点这里去下一关',
            () => roundPick.set((round + 1) % TASKS.length)), 1200);
        } else {
          mood = 'oops'; shake = 0.5;
          api.sound('lose');
          if (missing.length) {
            banner = '少了“' + missing[0] + '”';
            say = '程序里没写，我就不做';
            api.setHint('少了“' + missing.join('”“') + '”。机器人只做写下来的，不会自己补上。把卡片放进去再试试。');
          } else {
            banner = '没做成……这是一个 bug';
            api.setHint('顺序错了，机器人照样一步一步做，结果就不对。这种指令里的错，叫 bug。挪一挪卡片，再按“▶ 运行”。');
          }
        }
        render();
      }

      // ---------- 键盘：数字键放卡，退格拿回最后一张，回车运行 ----------
      api.on(window, 'keydown', (e) => {
        const tg = e.target;
        if (tg && tg.closest && tg.closest('input, textarea, select')) return;
        const onBtn = tg && tg.closest && tg.closest('button, a');
        if (e.key === 'Enter' && !onBtn) { e.preventDefault(); start(); }
        else if (/^[1-9]$/.test(e.key)) {
          const left = deck.filter((c) => !has(prog, c));
          const c = left[Number(e.key) - 1];
          if (c) addCard(c);
        } else if (e.key === 'Backspace' && prog.length && !run) {
          e.preventDefault(); prog.pop(); reset(); api.sound('pop'); render();
        }
      });
      api.on(s.canvas, 'pointerdown', () => { if (!run && prog.length) start(); });

      // ---------- 每一帧 ----------
      api.loop((dt, t) => {
        if (run) {
          run.t -= dt;
          if (run.t <= 0) { run.t = 1.05; step(); }
        }
        shake = Math.max(0, shake - dt);
        for (const p of party) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 240 * dt; p.r += dt * 6; p.life -= dt; }
        party = party.filter((p) => p.life > 0);

        const ink = api.color('--ink'), card = api.color('--card'), grass = api.color('--grass'), sun = api.color('--sun');
        const c = { sky: api.color('--sky'), tomato: api.color('--tomato'), grass };
        s.clear();
        // 上面的提示条
        ctx.fillStyle = card; ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
        PG.roundRect(ctx, 10, 8, W - 20, 40, 12); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ink; ctx.font = font(18); ctx.textBaseline = 'middle';
        ctx.fillText(banner, 24, 29, W - 48);
        ctx.textBaseline = 'alphabetic';
        // 右边的场景
        ctx.fillStyle = card; ctx.strokeStyle = api.color('--line'); ctx.lineWidth = 2;
        PG.roundRect(ctx, 240, 58, 230, 252, 14); ctx.fill(); ctx.stroke();
        ctx.fillStyle = api.color('--ink-2'); ctx.font = font(13); ctx.fillText(task.panel, 252, 78);
        if (round === 0) drawFoot(ctx, st, ink, c);
        else if (round === 2) drawKitchen(ctx, st, ink, c);
        // 地面 + 机器人
        ctx.fillStyle = api.color('--line'); ctx.fillRect(10, 296, 222, 6);
        const sh = shake > 0 ? Math.sin(t * 60) * 4 * shake : 0;
        drawBot(ctx, BX, BY, { ink, body: mood === 'happy' ? sun : grass, mood, shake: sh, foam: round === 1 && st.foam });
        if (round === 1) drawSink(ctx, st, ink, c, BX, BY);
        if (say) {
          ctx.font = font(17);
          const w = Math.min(224, ctx.measureText(say).width + 28);
          bubble(ctx, say, Math.max(8, Math.min(232 - w, BX - w / 2 + 20)), 58, w, BX + 26, 104, mood === 'oops' ? '#ffd9d3' : '#fff', ink);
        }
        for (const q of party) {
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.globalAlpha = Math.min(1, q.life);
          PG.drawStar(ctx, 0, 0, 8, sun, ink); ctx.restore();
        }
        ctx.globalAlpha = 1;
      });

      // ---------- 猜一猜 ----------
      const demo = (k, preset) => { roundPick.set(k); loadRound(k, preset); later(start, 500); };
      api.guesses([
        {
          q: '把“穿袜子”和“穿鞋”换个位置，机器人会怎样？',
          options: ['袜子套在鞋外面', '它会自己换回来', '和原来一样'], answer: 0,
          why: '机器人不会想“这样不对吧”。写的是先穿鞋，它就先穿鞋，再把袜子套在外面。顺序变了，结果就变了。',
          apply: () => demo(0, ['穿鞋', '穿袜子', '系鞋带']),
          delay: 4200,
        },
        {
          q: '程序里少了“挤牙膏”这一步，机器人会自己补上吗？',
          options: ['会，它知道要挤牙膏', '不会，它就干刷'], answer: 1,
          why: '程序里没写的事，机器人就不做。它不会自己补上，也不会提醒你。所以每一步都要写全。',
          apply: () => demo(1, ['拿起牙刷', '打开牙膏盖', '刷牙', '漱口']),
          delay: 5600,
        },
        {
          q: '先“抹果酱”，再“放一片面包”，果酱抹到盘子上了。这叫什么？',
          options: ['机器人坏了', 'bug，指令写错了', '电脑在开玩笑'], answer: 1,
          why: '机器人没坏，它是一字不差照着做的。错在指令的顺序，这样的错叫 bug（小虫子）。把卡片挪回去，虫子就捉掉了。',
          apply: () => demo(2, ['拿出盘子', '抹果酱', '放一片面包', '放生菜', '盖上一片面包', '切成两半']),
          delay: 3600,
        },
      ]);

      api.say({
        left: '顺序',
        right: '电脑一步一步照着做，先后不能乱',
        example: '刷牙要先拿牙刷、挤牙膏，再刷，最后漱口。顺序一乱，机器人就把牙膏挤到手上。少写一步，它也不会自己补。',
        prompt: '我的作品里，点“开始”以后，程序先做什么、再做什么？请按顺序一条一条列给我看，用小学生能听懂的话，先不要改。',
      });

      loadRound(0);
    },

    thumb(ctx, w, h, t) {
      const ink = '#1b2440';
      ctx.save(); ctx.translate(72, 96); ctx.scale(0.62, 0.62);
      drawBot(ctx, 0, 0, { ink, body: '#fff', mood: Math.floor(t) % 4 === 3 ? 'happy' : 'ok' });
      ctx.restore();
      // 三个格子，第二、三张卡时不时换位置
      const names = ['穿袜子', '穿鞋', '系鞋带'];
      const k = (t % 4) / 4;
      const swap = k < 0.5 ? 0 : Math.min(1, (k - 0.5) * 4);
      const ys = [44, 100, 156];
      ctx.font = '18px sans-serif'; ctx.textBaseline = 'middle'; ctx.lineWidth = 2.5; ctx.strokeStyle = ink;
      ys.forEach((y, i) => {
        ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.arc(162, y, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.fillText(String(i + 1), 162, y + 1); ctx.textAlign = 'left';
      });
      names.forEach((n, i) => {
        let y = ys[i];
        if (i === 1) y = ys[2] + (ys[1] - ys[2]) * swap;
        if (i === 2) y = ys[1] + (ys[2] - ys[1]) * swap;
        ctx.fillStyle = '#fff';
        PG.roundRect(ctx, 184, y - 20, 112, 40, 10); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ink; ctx.fillText(n, 200, y + 1);
      });
      ctx.textBaseline = 'alphabetic';
    },
  });
})();
