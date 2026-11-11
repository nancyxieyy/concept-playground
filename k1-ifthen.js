/* 程序森林 第 2 关：条件。传送带上的小球和小方块一个一个过来，
   分拣机先看一看：如果……就……，否则……。孩子写规则，让东西进对的筐。 */
(function () {
  'use strict';
  const font = (px) => px + 'px ' + getComputedStyle(document.body).fontFamily;

  const COND = {
    red: { label: '是红色的', test: (it) => it.color === 'red' },
    blue: { label: '是蓝色的', test: (it) => it.color === 'blue' },
    yellow: { label: '是黄色的', test: (it) => it.color === 'yellow' },
    ball: { label: '是圆的', test: (it) => it.shape === 'ball' },
    box: { label: '是方的', test: (it) => it.shape === 'box' },
    big: { label: '是大的', test: (it) => it.size === 'big' },
    small: { label: '是小的', test: (it) => it.size === 'small' },
  };
  const ACT = { L: '放左边', R: '放右边' };
  const DEST_NAME = { L: '左边筐', R: '右边筐', F: '往前走' };
  const I = (color, shape, size) => ({ color, shape, size });

  const ROUNDS = [
    {
      name: '分颜色',
      goal: '左边筐要红色的，右边筐要别的颜色。',
      want: (it) => (it.color === 'red' ? 'L' : 'R'),
      tags: { L: '红色的', R: '别的颜色', F: null },
      nRules: 1, start: { rules: [{ c: 'ball', a: 'L' }], else: 'R' },
      items: [I('red', 'ball', 'big'), I('blue', 'box', 'small'), I('yellow', 'ball', 'small'), I('red', 'box', 'big'), I('blue', 'ball', 'big'), I('red', 'ball', 'small')],
    },
    {
      name: '只挑大的',
      goal: '只把大的放进右边筐。小的别进筐，让它继续往前走。',
      want: (it) => (it.size === 'big' ? 'R' : 'F'),
      tags: { L: null, R: '大的', F: '小的' },
      nRules: 1, start: { rules: [{ c: 'big', a: 'L' }], else: 'R' },
      items: [I('red', 'ball', 'big'), I('blue', 'box', 'small'), I('yellow', 'box', 'big'), I('red', 'ball', 'small'), I('blue', 'ball', 'big'), I('yellow', 'ball', 'small')],
    },
    {
      name: '两条规则',
      goal: '左边筐要所有红色的。右边筐要别的圆的。剩下的继续往前走。',
      want: (it) => (it.color === 'red' ? 'L' : it.shape === 'ball' ? 'R' : 'F'),
      tags: { L: '红色的', R: '别的圆的', F: '剩下的' },
      nRules: 2, start: { rules: [{ c: 'ball', a: 'R' }, { c: 'red', a: 'L' }], else: 'R' },
      items: [I('red', 'ball', 'big'), I('blue', 'ball', 'small'), I('yellow', 'box', 'big'), I('red', 'box', 'small'), I('yellow', 'ball', 'big'), I('blue', 'box', 'big')],
    },
  ];

  // 场景里的位置
  const SX = 170, BELT = 124;
  const BASK = { L: { x: 22, w: 144 }, R: { x: 186, w: 144 }, F: { x: 350, w: 120 } };
  const BTOP = 222, BBOT = 304;

  function itemR(it) { return it.size === 'big' ? 18 : 11; }
  function drawItem(ctx, it, x, y, sc, ink, col) {
    const r = itemR(it) * sc;
    ctx.fillStyle = col[it.color]; ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
    if (it.shape === 'ball') {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.28, 0, Math.PI * 2); ctx.fill();
    } else {
      PG.roundRect(ctx, x - r, y - r, r * 2, r * 2, 4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(x - r * 0.65, y - r * 0.65, r * 0.5, r * 0.5);
    }
  }
  function slotPos(dest, n) {
    const b = BASK[dest];
    const per = Math.floor((b.w - 12) / 27);
    return { x: b.x + 20 + (n % per) * 27, y: BBOT - 18 - Math.floor(n / per) * 26 };
  }

  PG.register({
    id: 'ifthen',
    title: '分拣传送带',
    concept: '条件（如果……就……）',
    kid: '程序会先看一看：如果……就做这个，否则就做那个',
    level: 'K1',
    color: 'tomato',
    play: '传送带上的东西一个一个过来。在右边写好规则“如果……就……，否则……”，按“▶ 开始”，看分拣机把它们放进哪个筐。',

    mount(api) {
      const W = 480, H = 320;
      const s = api.stage(W, H);
      const ctx = s.ctx;
      const h = api.h;

      let round = 0, R = ROUNDS[0];
      let rules = [], elseA = 'R';
      let items = [], cur = -1, running = false, demo = false, speed = 1;
      let look = null, msg = '', party = [], judged = false;
      let open = null; // 正在选的那个按钮：{ row, which }
      const wins = [false, false, false];
      const timers = [];
      const later = (fn, ms) => timers.push(setTimeout(fn, ms));
      api.onCleanup(() => timers.forEach(clearTimeout));

      // ---------- 右边：规则 ----------
      const roundPick = api.choice({
        label: '关卡', value: 0,
        options: ROUNDS.map((r, i) => ({ value: i, label: (i + 1) + ' ' + r.name })),
        onChange: (v) => loadRound(v),
      });
      const goalP = h('p', { style: { margin: '0', fontSize: '16px' } });
      const rulesBox = h('div', { style: { display: 'grid', gap: '8px' } });
      api.controlBox.append(h('div', { class: 'ctl' },
        h('span', { class: 'lab' }, h('span', null, '规则', h('span', { class: 'grown', style: { fontWeight: '400' } }, '（条件）')), h('span', { class: 'small' }, '从上往下看')),
        goalP, rulesBox));
      const row = h('div', { class: 'seg' });
      api.controlBox.append(row);
      const bGo = api.button('▶ 开始', () => go(), 'primary', row);
      const speedPick = api.choice({ label: '速度', value: 1, options: [{ value: 1, label: '正常' }, { value: 2, label: '快一点' }], onChange: (v) => { speed = v; } });

      const ruleCardStyle = { display: 'grid', gap: '8px', padding: '10px', border: '2.5px solid var(--ink)', borderRadius: '12px', background: 'var(--card)' };
      const kw = (t) => h('b', { style: { fontFamily: 'var(--display)', fontWeight: '400', fontSize: '20px', color: 'var(--tomato)' } }, t);

      function pickBtn(rowKey, which, label) {
        const isOpen = open && open.row === rowKey && open.which === which;
        const b = h('button', { class: 'btn', type: 'button', disabled: running, 'aria-expanded': String(isOpen), style: { padding: '7px 12px' } }, label + ' ▾');
        b.addEventListener('click', () => {
          if (running) return;
          open = isOpen ? null : { row: rowKey, which };
          api.sound('tick'); render();
        });
        return b;
      }
      function optionList(rowKey, which) {
        if (!open || open.row !== rowKey || open.which !== which) return null;
        const list = which === 'c'
          ? Object.keys(COND).map((k) => [k, COND[k].label])
          : rowKey === 'else' ? [['L', '放左边'], ['R', '放右边'], [null, '不写（什么也不做）']] : [['L', '放左边'], ['R', '放右边']];
        const curV = rowKey === 'else' ? elseA : rules[rowKey][which];
        const seg = h('div', { class: 'seg' });
        for (const [v, t] of list) {
          const b = h('button', { class: 'btn', type: 'button', 'aria-pressed': String(v === curV), style: { padding: '7px 12px', fontSize: '16px' } }, t);
          b.addEventListener('click', () => {
            if (rowKey === 'else') elseA = v; else rules[rowKey][which] = v;
            open = null; clearResult(); api.sound('pop'); render();
          });
          seg.append(b);
        }
        return seg;
      }

      function render() {
        rulesBox.textContent = '';
        rules.forEach((r, i) => {
          const line = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' } },
            rules.length > 1 ? h('span', { style: { font: '18px/1 var(--display)', opacity: '.7' } }, (i + 1) + '.') : null,
            kw('如果'), pickBtn(i, 'c', COND[r.c].label), kw('就'), pickBtn(i, 'a', ACT[r.a]));
          rulesBox.append(h('div', { style: ruleCardStyle }, line, optionList(i, 'c'), optionList(i, 'a')));
        });
        if (rules.length > 1) {
          const sw = h('button', { class: 'btn', type: 'button', disabled: running, style: { justifySelf: 'start', padding: '6px 12px', fontSize: '15px' } }, '⇅ 两条换个顺序');
          sw.addEventListener('click', () => { if (running) return; rules.reverse(); open = null; clearResult(); api.sound('boing'); render(); });
          rulesBox.append(sw);
        }
        const elseLine = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' } },
          kw('否则'), pickBtn('else', 'a', elseA ? ACT[elseA] : '不写'));
        const elseCard = h('div', { style: Object.assign({}, ruleCardStyle, elseA ? {} : { borderStyle: 'dashed', background: 'transparent' }) },
          elseLine, optionList('else', 'a'),
          elseA ? null : h('span', { class: 'small' }, '没写“否则”：不符合的，分拣机什么也不做，它就继续往前走。'));
        rulesBox.append(elseCard);
        bGo.disabled = running;
      }

      function clearResult() {
        if (running) return;
        items = []; cur = -1; judged = false; look = null; party = [];
        msg = '写好规则，按 ▶ 开始';
        const o = api.stageBox.querySelector('.overlay'); if (o) o.remove();
      }

      function loadRound(k, setup) {
        timers.forEach(clearTimeout); timers.length = 0;
        round = k; R = ROUNDS[k]; running = false; demo = false; open = null;
        const st = setup || R.start;
        rules = st.rules.map((r) => ({ ...r }));
        elseA = st.else;
        goalP.textContent = '要做到：' + R.goal;
        clearResult();
        msg = '要做到：' + R.goal;
        api.setHint('点规则里带 ▾ 的按钮，选一选，再按“▶ 开始”。');
        render();
      }

      function decide(it) {
        const trace = [];
        for (const r of rules) {
          const yes = COND[r.c].test(it);
          trace.push({ q: COND[r.c].label + '吗？', yes });
          if (yes) return { dest: r.a, trace, how: ACT[r.a] };
        }
        return elseA ? { dest: elseA, trace, how: '否则：' + ACT[elseA] } : { dest: 'F', trace, how: '没写否则：什么也不做' };
      }

      function go(list, isDemo) {
        if (running) return;
        clearResult();
        demo = !!isDemo; running = true; open = null;
        items = (list || R.items).map((it, k) => ({ ...it, x: -40 - k * 58, y: 0, phase: 'wait', dest: null, n: 0, wrong: false }));
        cur = 0; msg = '分拣中……';
        render();
      }

      function finish() {
        running = false; look = null; cur = -1;
        render();
        if (demo) { msg = '看完了！'; return; }
        let bad = 0;
        for (const it of items) { it.wrong = it.dest !== R.want(it); if (it.wrong) bad++; }
        judged = true;
        if (!bad) {
          msg = '全都放对了！';
          api.sound('win');
          for (let i = 0; i < 30; i++) {
            const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 140;
            party.push({ x: W / 2, y: 200, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 90, r: Math.random() * 6, life: 1.5 });
          }
          wins[round] = true;
          const all = wins.every(Boolean);
          api.setHint(all ? '三关全部完成！你的规则让分拣机自己做决定。' : '规则写对了，分拣机先看一看，再决定放哪边。');
          later(() => api.overlay(all ? '三关全部完成！你是分拣小能手！点这里再玩一次' : '第 ' + (round + 1) + ' 关完成！点这里去下一关',
            () => roundPick.set((round + 1) % ROUNDS.length)), 1200);
        } else {
          msg = '有 ' + bad + ' 个放错了（打了 ✗ 的）';
          api.sound('lose');
          api.setHint('打了 ✗ 的放错了。看看它是什么样的，再想想：分拣机看到它时，规则让它去了哪？改一改再按“▶ 开始”。');
        }
      }

      api.on(window, 'keydown', (e) => {
        const tg = e.target;
        if (tg && tg.closest && tg.closest('input, textarea, select')) return;
        if (e.key === 'Escape' && open) { open = null; render(); }
        else if (e.key === 'Enter' && !(tg && tg.closest && tg.closest('button, a'))) { e.preventDefault(); go(); }
      });
      api.on(s.canvas, 'pointerdown', () => { if (!running) go(); });

      // ---------- 每一帧 ----------
      const BELT_V = 170;
      api.loop((dt, t) => {
        const d = dt * speed;
        if (running) {
          // 排队的往前挪，最前面那个停在分拣机下面
          items.forEach((it, k) => {
            if (it.phase !== 'wait' && it.phase !== 'belt') return;
            const target = SX - (k - cur) * 58;
            it.y = BELT - itemR(it);
            if (it.x < target) { it.x = Math.min(target, it.x + BELT_V * d); it.phase = 'belt'; }
          });
          const it = items[cur];
          if (it && it.phase !== 'fly' && it.phase !== 'in' && it.x >= SX && !look) {
            const r = decide(it);
            look = { it, r, t: 0, shown: 0, total: 0.5 * r.trace.length + 0.6 };
            it.phase = 'look'; api.sound('tick');
          }
          if (look) {
            look.t += d;
            const shown = Math.min(look.r.trace.length + 1, Math.floor(look.t / 0.5) + 1);
            if (shown > look.shown) { look.shown = shown; if (shown > 1) api.sound('tick'); }
            if (look.t >= look.total) {
              const L = look; look = null;
              L.it.dest = L.r.dest;
              L.it.n = items.filter((o) => o.phase === 'in' && o.dest === L.r.dest).length + items.filter((o) => o.phase === 'fly' && o.dest === L.r.dest).length;
              const p2 = slotPos(L.r.dest, L.it.n);
              L.it.fly = { t: 0, dur: L.r.dest === 'F' ? 0.95 : 0.6, x0: L.it.x, y0: L.it.y, cx: L.r.dest === 'F' ? 470 : (L.it.x + p2.x) / 2, cy: L.r.dest === 'F' ? L.it.y - 6 : L.it.y - 50, x2: p2.x, y2: p2.y };
              L.it.phase = 'fly'; L.it.last = L.r.how;
              api.sound(L.r.dest === 'F' ? 'step' : 'pop');
              cur++;
            }
          }
          for (const o of items) {
            if (o.phase !== 'fly') continue;
            const f = o.fly; f.t += d;
            const k = Math.min(1, f.t / f.dur), u = 1 - k;
            o.x = u * u * f.x0 + 2 * u * k * f.cx + k * k * f.x2;
            o.y = u * u * f.y0 + 2 * u * k * f.cy + k * k * f.y2;
            if (k >= 1) { o.phase = 'in'; api.sound('step'); }
          }
          if (cur >= items.length && items.every((o) => o.phase === 'in')) finish();
        }
        for (const p of party) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 240 * dt; p.r += dt * 6; p.life -= dt; }
        party = party.filter((p) => p.life > 0);

        // ---------- 画 ----------
        const ink = api.color('--ink'), ink2 = api.color('--ink-2'), card = api.color('--card'),
          tomato = api.color('--tomato'), sun = api.color('--sun'), grass = api.color('--grass');
        const col = { red: tomato, blue: api.color('--sky'), yellow: sun };
        s.clear();
        // 筐
        for (const k of ['L', 'R', 'F']) {
          const b = BASK[k];
          ctx.fillStyle = k === 'F' ? 'transparent' : card; ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
          if (k === 'F') ctx.setLineDash([6, 5]);
          PG.roundRect(ctx, b.x, BTOP, b.w, BBOT - BTOP, 10); if (k !== 'F') ctx.fill(); ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = ink; ctx.font = font(15); ctx.textAlign = 'center';
          ctx.fillText(DEST_NAME[k], b.x + b.w / 2, BTOP - 26);
          ctx.fillStyle = R.tags[k] ? tomato : ink2; ctx.font = font(13);
          ctx.fillText(R.tags[k] ? '要：' + R.tags[k] : '要：空着', b.x + b.w / 2, BTOP - 8);
          ctx.textAlign = 'left';
        }
        // 传送带
        ctx.fillStyle = api.color('--ink-2'); ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
        PG.roundRect(ctx, -10, BELT, 490, 16, 8); ctx.fill(); ctx.stroke();
        ctx.fillStyle = card;
        const off = running ? (t * BELT_V * speed) % 24 : 0;
        for (let x = -24 + off; x < W; x += 24) { ctx.beginPath(); ctx.arc(x, BELT + 8, 3, 0, Math.PI * 2); ctx.fill(); }
        // 分拣机（一只大眼睛）
        ctx.strokeStyle = ink; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(SX, 0); ctx.lineTo(SX, 30); ctx.stroke();
        if (look) {
          ctx.fillStyle = 'rgba(255,189,26,.28)';
          ctx.beginPath(); ctx.moveTo(SX - 12, 70); ctx.lineTo(SX + 12, 70); ctx.lineTo(SX + 30, BELT); ctx.lineTo(SX - 30, BELT); ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = tomato; ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
        PG.roundRect(ctx, SX - 30, 28, 60, 44, 12); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(SX, 50, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#1b2440'; ctx.beginPath(); ctx.arc(SX + (look ? 0 : Math.sin(t * 2) * 5), 50 + (look ? 6 : 2), 6, 0, Math.PI * 2); ctx.fill();
        // 东西
        for (const it of items) {
          if (it.phase === 'wait' && it.x < -30) continue;
          const inside = it.phase === 'in';
          drawItem(ctx, it, it.x, it.y, inside ? 0.62 : it.phase === 'fly' ? 0.62 + 0.38 * (1 - Math.min(1, it.fly.t / it.fly.dur)) : 1, ink, col);
          if (judged && it.wrong) {
            ctx.strokeStyle = '#de4434'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(it.x - 9, it.y - 9); ctx.lineTo(it.x + 9, it.y + 9); ctx.moveTo(it.x + 9, it.y - 9); ctx.lineTo(it.x - 9, it.y + 9); ctx.stroke();
          }
        }
        // 想法泡泡：一条一条看
        const bx = 234, by = 8, bw = 238;
        if (look) {
          const rows = look.r.trace.slice(0, look.shown);
          const res = look.shown > look.r.trace.length;
          const n = rows.length + (res ? 1 : 0);
          ctx.fillStyle = card; ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
          PG.roundRect(ctx, bx, by, bw, 18 + n * 24, 12); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(bx, by + 22); ctx.lineTo(SX + 32, 46); ctx.lineTo(bx, by + 36); ctx.fillStyle = card; ctx.fill();
          ctx.font = font(16); ctx.textBaseline = 'middle';
          rows.forEach((r, i) => {
            const y = by + 20 + i * 24;
            ctx.fillStyle = ink; ctx.fillText((look.r.trace.length > 1 ? (i + 1) + '. ' : '') + r.q, bx + 12, y);
            ctx.fillStyle = r.yes ? grass : tomato; ctx.textAlign = 'right';
            ctx.fillText(r.yes ? '是！' : '不是', bx + bw - 12, y); ctx.textAlign = 'left';
          });
          if (res) {
            ctx.fillStyle = ink; ctx.fillText('→ ' + look.r.how, bx + 12, by + 20 + rows.length * 24, bw - 24);
          }
          ctx.textBaseline = 'alphabetic';
        } else {
          ctx.fillStyle = ink; ctx.font = font(16);
          wrapText(ctx, msg, bx, by + 18, bw, 22);
        }
        for (const q of party) {
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.globalAlpha = Math.min(1, q.life);
          PG.drawStar(ctx, 0, 0, 8, sun, ink); ctx.restore();
        }
        ctx.globalAlpha = 1;
      });

      function wrapText(c, text, x, y, w, lh) {
        let lineS = '', yy = y;
        for (const ch of text) {
          if (c.measureText(lineS + ch).width > w && lineS) { c.fillText(lineS, x, yy); lineS = ch; yy += lh; }
          else lineS += ch;
        }
        if (lineS) c.fillText(lineS, x, yy);
      }

      // ---------- 猜一猜 ----------
      const demoRun = (k, setup, list) => { roundPick.set(k); loadRound(k, setup); speedPick.set(1); later(() => go(list, true), 400); };
      api.guesses([
        {
          q: '规则是“如果是红色的，就放左边；否则，放右边”。来了一个蓝色的球，它去哪？',
          options: ['左边筐', '右边筐', '停在传送带上'], answer: 1,
          why: '分拣机先看：是红色的吗？不是。那就走“否则”那一边，放右边。',
          apply: () => demoRun(0, { rules: [{ c: 'red', a: 'L' }], else: 'R' }, [I('blue', 'ball', 'big')]),
          delay: 3600,
        },
        {
          q: '把“否则”那一行改成“不写”。不是红色的东西会怎样？',
          options: ['也放进左边筐', '什么也不做，继续往前走', '分拣机自己想办法'], answer: 1,
          why: '没写“否则”，不符合的时候分拣机就什么也不做，东西跟着传送带继续往前走。程序不会自己补上没写的事。',
          apply: () => demoRun(0, { rules: [{ c: 'red', a: 'L' }], else: null }, [I('blue', 'ball', 'big'), I('red', 'box', 'small')]),
          delay: 5200,
        },
        {
          q: '两条规则：第 1 条“如果是红色的，就放左边”，第 2 条“如果是圆的，就放右边”。来了一个红色的圆球，去哪？',
          options: ['左边筐', '右边筐', '两个筐都去'], answer: 0,
          why: '分拣机从上往下看。第 1 条：是红色的吗？是！马上放左边，第 2 条就不看了。先写的先看。',
          apply: () => demoRun(2, { rules: [{ c: 'red', a: 'L' }, { c: 'ball', a: 'R' }], else: null }, [I('red', 'ball', 'big')]),
          delay: 3600,
        },
      ]);

      api.say({
        left: '条件',
        right: '先看一看：如果……就……，否则……',
        example: '如果下雨，就带伞；否则，就不带。游戏里也一样：如果血量变成 0，就游戏结束；否则，就继续玩。',
        prompt: '我的作品里，有没有“如果……就……”？帮我找出一个，用“如果___，就___；否则，就___”说给我听，先不要改。',
      });

      loadRound(0);
    },

    thumb(ctx, w, h, t) {
      const ink = '#1b2440';
      ctx.fillStyle = '#4b5778'; ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
      PG.roundRect(ctx, -10, 86, 190, 12, 6); ctx.fill(); ctx.stroke();
      // 两个筐
      ctx.fillStyle = '#fff';
      PG.roundRect(ctx, 150, 150, 70, 40, 8); ctx.fill(); ctx.stroke();
      PG.roundRect(ctx, 236, 150, 70, 40, 8); ctx.fill(); ctx.stroke();
      // 眼睛
      ctx.fillStyle = '#fff'; PG.roundRect(ctx, 160, 30, 44, 34, 10); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(182, 47, 10, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(182, 51, 4, 0, Math.PI * 2); ctx.fill();
      // 球：红的往左下，别的往右下
      const cols = ['#ff5a47', '#2f7cf6', '#ff5a47', '#ffd43b'];
      for (let i = 0; i < 4; i++) {
        const k = ((t * 0.45 + i / 4) % 1);
        let x, y;
        if (k < 0.6) { x = 10 + (k / 0.6) * 172; y = 74; }
        else {
          const u = (k - 0.6) / 0.4, red = cols[i] === '#ff5a47';
          const tx = red ? 185 : 271, ty = 168;
          x = 182 + (tx - 182) * u; y = 74 + (ty - 74) * u - Math.sin(u * Math.PI) * 30;
        }
        ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = '#fff'; ctx.font = '20px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('如果……就……', 160, 24); ctx.textAlign = 'left';
    },
  });
})();
