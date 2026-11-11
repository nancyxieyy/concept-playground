/* 第 11 关：调试。小机器人照着程序卡走，可有一张卡被悄悄写错了。
   先猜两张“嫌疑卡”，再一步一步走、一张一张改，把真凶找出来。 */
(function () {
  'use strict';
  const COLS = 9, ROWS = 5, CELL = 48, OX = 24, OY = 70;
  const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1]; // 0 朝右 1 朝下 2 朝左 3 朝上
  const F = (n) => ({ t: 'F', n }), R = () => ({ t: 'R' }), L = () => ({ t: 'L' });

  // 每一关：起点 [x,y,朝向]、旗子、石头、正确的程序；bug 是被写错的那张（从 0 数），bad 是写错后的样子
  const PUZZLES = [
    { start: [0, 4, 0], flag: [6, 0], rocks: [[4, 3], [0, 1], [8, 2]],
      prog: [F(2), L(), F(3), R(), F(4), L(), F(1)], bug: 2, bad: F(2) },
    { start: [0, 0, 0], flag: [8, 4], rocks: [[5, 0], [1, 3], [6, 4]],
      prog: [F(3), R(), F(2), L(), F(5), R(), F(2)], bug: 1, bad: L() },
    { start: [0, 2, 0], flag: [7, 3], rocks: [[5, 2], [1, 4], [6, 1]],
      prog: [F(3), L(), F(2), R(), F(4), R(), F(3)], bug: 0, bad: F(5) },
    { start: [0, 4, 3], flag: [6, 4], rocks: [[1, 3], [5, 2], [8, 0]],
      prog: [F(3), R(), F(3), R(), F(3), L(), F(3)], bug: 5, bad: R() },
    { start: [1, 0, 1], flag: [7, 2], rocks: [[2, 1], [6, 4], [8, 4]],
      prog: [F(4), L(), F(3), L(), F(2), R(), F(3)], bug: 0, bad: F(2) },
  ];

  const cardText = (c) => (c.t === 'F' ? '往前走 ' + c.n + ' 步' : c.t === 'R' ? '右转' : '左转');
  const same = (a, b) => a.t === b.t && (a.t !== 'F' || a.n === b.n);
  const isRock = (pz, x, y) => pz.rocks.some((r) => r[0] === x && r[1] === y);

  // 照着程序走一遍，记下每一小步（给动画用）
  function simulate(prog, pz) {
    let [x, y, d] = pz.start;
    const segs = [];
    let bumped = false, bumpCard = -1;
    for (let i = 0; i < prog.length && !bumped; i++) {
      const c = prog[i];
      if (c.t === 'F') {
        for (let k = 0; k < c.n; k++) {
          const nx = x + DX[d], ny = y + DY[d];
          const out = nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS;
          if (out || isRock(pz, nx, ny)) {
            segs.push({ card: i, kind: 'bump', x, y, d, wall: out ? 'wall' : 'rock' });
            bumped = true; bumpCard = i; break;
          }
          segs.push({ card: i, kind: 'move', fx: x, fy: y, x: nx, y: ny, d });
          x = nx; y = ny;
        }
      } else {
        const nd = (d + (c.t === 'R' ? 1 : 3)) % 4;
        segs.push({ card: i, kind: 'turn', x, y, d0: d, d: nd });
        d = nd;
      }
    }
    return { segs, x, y, d, bumped, bumpCard, win: !bumped && x === pz.flag[0] && y === pz.flag[1] };
  }

  const font = (px) => px + 'px ' + getComputedStyle(document.body).fontFamily;

  function drawRobot(ctx, cx, cy, ang, sz, body, ink, shake) {
    ctx.save();
    ctx.translate(cx + (shake || 0), cy);
    // 身体不转，眼睛和小箭头看着前面
    ctx.fillStyle = body; ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
    PG.roundRect(ctx, -sz / 2, -sz / 2, sz, sz, sz * 0.22); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -sz / 2); ctx.lineTo(0, -sz / 2 - 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -sz / 2 - 9, 3.5, 0, Math.PI * 2); ctx.fillStyle = '#ffd43b'; ctx.fill(); ctx.stroke();
    const fx = Math.cos(ang), fy = Math.sin(ang);
    const px = -fy, py = fx;
    for (const sd of [-1, 1]) {
      const ex = fx * sz * 0.16 + px * sd * sz * 0.17, ey = fy * sz * 0.16 + py * sd * sz * 0.17;
      ctx.beginPath(); ctx.arc(ex, ey, sz * 0.12, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(ex + fx * 2.5, ey + fy * 2.5, sz * 0.05, 0, Math.PI * 2); ctx.fillStyle = '#1b2440'; ctx.fill();
    }
    // 朝向小箭头
    ctx.beginPath();
    ctx.moveTo(fx * (sz / 2 + 9), fy * (sz / 2 + 9));
    ctx.lineTo(fx * (sz / 2 + 2) + px * 6, fy * (sz / 2 + 2) + py * 6);
    ctx.lineTo(fx * (sz / 2 + 2) - px * 6, fy * (sz / 2 + 2) - py * 6);
    ctx.closePath(); ctx.fillStyle = ink; ctx.fill();
    ctx.restore();
  }

  function drawFlag(ctx, x, y, s, ink, color, wave) {
    ctx.strokeStyle = ink; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - s * 0.25, y + s * 0.4); ctx.lineTo(x - s * 0.25, y - s * 0.4); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - s * 0.25, y - s * 0.4);
    ctx.quadraticCurveTo(x, y - s * 0.4 + wave, x + s * 0.3, y - s * 0.25);
    ctx.lineTo(x - s * 0.25, y - s * 0.05); ctx.closePath();
    ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
  }

  PG.register({
    id: 'debug',
    no: 11,
    title: '机器人侦探',
    concept: '调试',
    kid: '修 bug 不是乱试，是先猜，再一样一样排除',
    level: 'K5',
    color: 'grape',
    play: '小机器人照着右边的卡片走，要走到旗子那儿。可是有一张卡被悄悄写错了！先按“运行”看看，再当侦探把它找出来。',

    mount(api) {
      const W = 480, H = 320;
      const s = api.stage(W, H);
      const ctx = s.ctx;
      const h = api.h;

      let pzIndex = 0, pz = null;
      let prog = [];      // 现在的卡（会被孩子改）
      let start = [];     // 这一关一开始（带错）的卡
      let phase = 'ready'; // ready 还没运行 / suspect 写侦探笔记 / tools 可以用工具 / won 修好了
      let suspects = [], selected = -1, stepPc = 0, curCard = -1, spoiled = false, blame = -1;
      let robot = { x: 0, y: 0, d: 0 }, trail = [];
      let anim = null, bumpFx = 0, bumpText = '', msg = '', party = [];
      let hits = 0, fixed = 0;
      const timers = [];
      const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
      const clearTimers = () => { while (timers.length) clearTimeout(timers.pop()); };
      api.onCleanup(clearTimers);

      // ---------- 右边的控件 ----------
      const row = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px' } });
      api.controlBox.append(row);
      const bRun = api.button('▶ 运行', () => runAll(), 'primary', row);
      const bStep = api.button('一步一步走', () => stepOnce(), '', row);
      const bEdit = api.button('改这张卡', () => editCard(selected), '', row);
      const bBack = api.button('↩ 退回原样', () => revert(), '', row);
      const note = h('p', { class: 'small', style: { margin: '0' } });
      const cardList = h('div', { style: { display: 'grid', gap: '6px' }, role: 'list', 'aria-label': '程序卡' });
      api.controlBox.append(
        h('div', { class: 'ctl' }, h('span', { class: 'lab' }, h('span', null, '程序卡'), h('span', { class: 'small' }, '机器人从上往下照着做')), cardList, note));
      const rLevel = api.readout('第几关', 1);
      const rHits = api.readout('猜中了', 0);
      const rFixed = api.readout('修好了', 0);

      function tag(text, bg, fg) {
        return h('span', { style: { font: '13px/1 var(--body)', fontWeight: '700', padding: '4px 7px', borderRadius: '999px', border: '2px solid var(--ink)', background: bg, color: fg || '#1b2440', whiteSpace: 'nowrap' } }, text);
      }

      function renderCards() {
        cardList.textContent = '';
        prog.forEach((c, i) => {
          const tags = h('span', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' } });
          if (suspects.includes(i)) tags.append(tag('嫌疑', 'var(--sun)'));
          if (!same(c, start[i])) tags.append(tag('改过', 'var(--card)', 'var(--ink)'));
          if (blame === i) tags.append(tag('从这张开始走歪', 'var(--tomato)'));
          if (phase === 'won' && i === pz.bug) tags.append(tag('真凶', 'var(--tomato)'));
          const b = h('button', {
            class: 'btn', type: 'button', role: 'listitem',
            'aria-pressed': String(phase === 'tools' && i === selected),
            'aria-label': '第 ' + (i + 1) + ' 张：' + cardText(c),
            style: {
              display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between', textAlign: 'left',
              padding: '7px 10px', width: '100%',
              outline: i === curCard ? '4px solid var(--grape)' : 'none', outlineOffset: '2px',
            },
          }, h('span', null, h('span', { style: { fontFamily: 'var(--display)', marginRight: '8px', opacity: '.7' } }, (i + 1) + ''), cardText(c)), tags);
          b.addEventListener('click', () => tapCard(i));
          cardList.append(b);
        });
        const busy = !!anim;
        bRun.disabled = busy || phase === 'won' || phase === 'suspect';
        bStep.disabled = busy || phase !== 'tools';
        bEdit.disabled = busy || phase !== 'tools' || selected < 0;
        bEdit.textContent = selected >= 0 && phase === 'tools' ? '改第 ' + (selected + 1) + ' 张卡' : '改这张卡';
        bBack.disabled = busy || phase !== 'tools' || prog.every((c, i) => same(c, start[i]));
        note.textContent = phase === 'suspect' ? '侦探笔记：已经标了 ' + suspects.length + ' / 2 张嫌疑卡'
          : phase === 'tools' ? '点一张卡选中它，再按“改这张卡”。键盘：↑↓ 选卡，← → 改卡，空格一步一步走，回车运行。'
            : phase === 'ready' ? '键盘：回车 = 运行' : '';
      }

      function loadPuzzle(k) {
        clearTimers();
        pzIndex = ((k % PUZZLES.length) + PUZZLES.length) % PUZZLES.length;
        pz = PUZZLES[pzIndex];
        prog = pz.prog.map((c, i) => (i === pz.bug ? { ...pz.bad } : { ...c }));
        start = prog.map((c) => ({ ...c }));
        phase = 'ready'; suspects = []; selected = -1; stepPc = 0; curCard = -1; spoiled = false; blame = -1;
        anim = null; party = []; bumpFx = 0;
        resetRobot();
        msg = '能走到旗子吗？按“运行”看看';
        const o = api.stageBox.querySelector('.overlay'); if (o) o.remove();
        rLevel.set(pzIndex + 1);
        api.setHint('按“运行”，看看小机器人能不能走到旗子那儿。');
        renderCards();
      }
      function resetRobot() {
        robot = { x: pz.start[0], y: pz.start[1], d: pz.start[2] };
        trail = [[robot.x, robot.y]];
        bumpFx = 0;
      }

      function play(segs, onDone) {
        anim = { segs, i: 0, t: 0, onDone, started: -1 };
        renderCards();
      }

      function runAll(after) {
        if (anim || phase === 'won' || phase === 'suspect') return;
        stepPc = 0; resetRobot();
        const sim = simulate(prog, pz);
        msg = '运行中……';
        play(sim.segs, () => { curCard = -1; finish(sim); if (after) after(sim); });
      }

      function stepOnce() {
        if (anim || phase !== 'tools') return;
        const sim = simulate(prog, pz);
        if (stepPc === 0) resetRobot();
        const pc = stepPc;
        const segs = sim.segs.filter((g) => g.card === pc);
        curCard = pc;
        msg = '第 ' + (pc + 1) + ' 张：' + cardText(prog[pc]);
        play(segs.concat([{ card: pc, kind: 'pause' }]), () => {
          stepPc++;
          if (sim.bumpCard === pc || stepPc >= prog.length) { stepPc = 0; curCard = -1; finish(sim); }
          else { msg = '第 ' + (pc + 1) + ' 张走完了。和你想的一样吗？再走下一张'; renderCards(); }
        });
      }

      function finish(sim) {
        if (sim.win) return win();
        api.sound('lose');
        msg = sim.bumped ? '咚！撞到了，没走到旗子' : '停在这里了，没走到旗子';
        if (phase === 'ready') {
          phase = 'suspect';
          api.setHint('侦探笔记：先别急着改！哪张卡最可疑？在右边点两张，标上“嫌疑”，工具才会打开。');
        } else if (phase === 'tools') {
          const changed = !prog.every((c, i) => same(c, start[i]));
          api.setHint(changed
            ? '还是不对。改过的那张可能不是真凶：按“↩ 退回原样”，再去查另一张嫌疑卡。'
            : '用“一步一步走”看看，是第几张开始和你想的不一样？');
        }
        renderCards();
      }

      function win() {
        phase = 'won'; curCard = -1; fixed++; rFixed.set(fixed);
        const guessed = suspects.includes(pz.bug);
        if (guessed && !spoiled) { hits++; rHits.set(hits); }
        api.sound('win');
        const fx = OX + pz.flag[0] * CELL + CELL / 2, fy = OY + pz.flag[1] * CELL + CELL / 2;
        for (let i = 0; i < 26; i++) {
          const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 120;
          party.push({ x: fx, y: fy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, r: Math.random() * 6, life: 1.4 });
        }
        msg = '走到旗子啦！';
        const changedCards = prog.map((c, i) => (same(c, start[i]) ? -1 : i)).filter((i) => i >= 0).map((i) => i + 1);
        let text = '修好啦！你先猜了第 ' + suspects.map((i) => i + 1).join('、') + ' 张，第 ' + (pz.bug + 1) + ' 张才是真凶——';
        text += spoiled ? '这关是看着演示修的。' : guessed ? '猜对了！' : '这次没猜中，可你一样一样查出来了！';
        if (changedCards.length && !(changedCards.length === 1 && changedCards[0] === pz.bug + 1)) text += '（你改的是第 ' + changedCards.join('、') + ' 张。）';
        text += ' 点这里下一关';
        api.setHint('修好了！看看右边哪张标着“真凶”。');
        renderCards();
        later(() => api.overlay(text, () => loadPuzzle(pzIndex + 1)), 900);
      }

      function tapCard(i) {
        if (anim) return;
        if (phase === 'ready') { api.toast('先按“运行”看看哪里不对'); return; }
        if (phase === 'won') return;
        if (phase === 'suspect') {
          const k = suspects.indexOf(i);
          if (k >= 0) suspects.splice(k, 1); else suspects.push(i);
          api.sound('pop');
          if (suspects.length >= 2) {
            phase = 'tools'; selected = suspects[0];
            api.sound('ding'); api.toast('侦探笔记写好了，工具打开啦！');
            api.setHint('先查你最怀疑的那张：用“一步一步走”看它是不是走歪了，或者直接“改这张卡”再运行。');
          }
          renderCards();
          return;
        }
        selected = i; api.sound('tick'); renderCards();
      }

      function editCard(i) {
        if (anim || phase !== 'tools' || i < 0) return;
        const c = prog[i];
        if (c.t === 'F') c.n = (c.n % 6) + 1; else c.t = c.t === 'R' ? 'L' : 'R';
        stepPc = 0; curCard = -1; resetRobot();
        msg = '第 ' + (i + 1) + ' 张改成了“' + cardText(c) + '”，按运行试试';
        api.sound('boing');
        renderCards();
      }

      function revert() {
        if (anim || phase !== 'tools') return;
        prog = start.map((c) => ({ ...c }));
        stepPc = 0; curCard = -1; resetRobot();
        msg = '退回原样了，换一张嫌疑卡查查';
        api.sound('pop');
        renderCards();
      }

      // ---------- 键盘、点画布 ----------
      api.on(window, 'keydown', (e) => {
        const onBtn = e.target && e.target.closest && e.target.closest('button, input, a, textarea, select');
        if (e.key === 'Enter' && !onBtn) { e.preventDefault(); runAll(); }
        else if (e.key === ' ' && !onBtn) { e.preventDefault(); stepOnce(); }
        else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && phase === 'tools') {
          e.preventDefault();
          selected = Math.max(0, Math.min(prog.length - 1, selected + (e.key === 'ArrowUp' ? -1 : 1)));
          api.sound('tick'); renderCards();
        } else if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && phase === 'tools') {
          e.preventDefault(); editCard(selected);
        } else if (/^[1-9]$/.test(e.key) && Number(e.key) <= prog.length) {
          tapCard(Number(e.key) - 1);
        }
      });
      api.on(s.canvas, 'pointerdown', () => {
        if (phase === 'ready') runAll();
        else if (phase === 'tools') stepOnce();
      });

      // ---------- 动画 ----------
      const DUR = { move: 0.26, turn: 0.24, bump: 0.5, pause: 0.35 };
      function pose() {
        const still = { x: robot.x, y: robot.y, a: robot.d * Math.PI / 2, shake: 0 };
        const g = anim && anim.segs[anim.i];
        if (!g) return still;
        const k = Math.min(1, anim.t / DUR[g.kind]);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        if (g.kind === 'move') return { x: g.fx + (g.x - g.fx) * e, y: g.fy + (g.y - g.fy) * e, a: g.d * Math.PI / 2, shake: 0 };
        if (g.kind === 'turn') {
          let diff = g.d - g.d0; if (diff > 2) diff -= 4; if (diff < -2) diff += 4;
          return { x: g.x, y: g.y, a: (g.d0 + diff * e) * Math.PI / 2, shake: 0 };
        }
        if (g.kind === 'bump') {
          const push = Math.sin(k * Math.PI) * 0.28;
          return { x: g.x + DX[g.d] * push, y: g.y + DY[g.d] * push, a: g.d * Math.PI / 2, shake: Math.sin(k * 40) * 3 * (1 - k) };
        }
        return still;
      }

      api.loop((dt, t) => {
        if (anim) {
          const g = anim.segs[anim.i];
          if (g && anim.started !== anim.i) {
            anim.started = anim.i;
            if (g.card !== curCard && g.kind !== 'pause') { curCard = g.card; renderCards(); }
            if (g.kind === 'move') api.sound('step');
            if (g.kind === 'turn') api.sound('tick');
            if (g.kind === 'bump') { api.sound('buzz'); bumpFx = 0.9; bumpText = g.wall === 'rock' ? '撞到石头！' : '撞墙了！'; }
          }
          if (g) {
            anim.t += dt;
            if (anim.t >= DUR[g.kind]) {
              if (g.kind === 'move') { robot.x = g.x; robot.y = g.y; trail.push([g.x, g.y]); }
              if (g.kind === 'turn') robot.d = g.d;
              anim.i++; anim.t = 0;
            }
          }
          if (!anim.segs[anim.i]) { const done = anim.onDone; anim = null; renderCards(); if (done) done(); }
        }
        bumpFx = Math.max(0, bumpFx - dt);
        for (const p of party) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; p.r += dt * 6; p.life -= dt; }
        party = party.filter((p) => p.life > 0);

        // ---------- 画 ----------
        const ink = api.color('--ink'), line = api.color('--line'), grape = api.color('--grape'),
          tomato = api.color('--tomato'), sun = api.color('--sun'), card = api.color('--card'), grass = api.color('--grass');
        s.clear();
        // 上面的提示条
        ctx.fillStyle = card; ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
        PG.roundRect(ctx, 12, 10, W - 24, 46, 12); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ink; ctx.font = font(18); ctx.textBaseline = 'middle';
        let top = msg;
        if (curCard >= 0 && anim) top = '▶ 第 ' + (curCard + 1) + ' 张：' + cardText(prog[curCard]);
        ctx.fillText(top, 26, 34, W - 52);
        ctx.textBaseline = 'alphabetic';

        // 格子
        ctx.strokeStyle = line; ctx.lineWidth = 1.5;
        for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(OX + x * CELL, OY); ctx.lineTo(OX + x * CELL, OY + ROWS * CELL); ctx.stroke(); }
        for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(OX, OY + y * CELL); ctx.lineTo(OX + COLS * CELL, OY + y * CELL); ctx.stroke(); }
        ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.strokeRect(OX, OY, COLS * CELL, ROWS * CELL);
        // 石头
        for (const [rx, ry] of pz.rocks) {
          const cx = OX + rx * CELL + CELL / 2, cy = OY + ry * CELL + CELL / 2;
          ctx.fillStyle = '#9aa3b5'; ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(cx - 17, cy + 13); ctx.lineTo(cx - 13, cy - 6); ctx.lineTo(cx - 2, cy - 15);
          ctx.lineTo(cx + 12, cy - 10); ctx.lineTo(cx + 18, cy + 13); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        // 起点
        const sx = OX + pz.start[0] * CELL, sy = OY + pz.start[1] * CELL;
        ctx.fillStyle = 'rgba(138,92,245,.16)'; ctx.fillRect(sx + 3, sy + 3, CELL - 6, CELL - 6);
        ctx.fillStyle = grape; ctx.font = font(11); ctx.fillText('起点', sx + 4, sy + CELL - 5);
        // 旗子
        const fx = OX + pz.flag[0] * CELL + CELL / 2, fy = OY + pz.flag[1] * CELL + CELL / 2;
        ctx.fillStyle = 'rgba(31,179,111,.18)'; ctx.fillRect(fx - CELL / 2 + 3, fy - CELL / 2 + 3, CELL - 6, CELL - 6);
        drawFlag(ctx, fx, fy, CELL * 0.85, ink, grass, Math.sin(t * 4) * 4);
        // 走过的脚印
        ctx.fillStyle = grape; ctx.globalAlpha = 0.55;
        trail.forEach(([x, y], i) => {
          if (i === 0) return;
          ctx.beginPath(); ctx.arc(OX + x * CELL + CELL / 2, OY + y * CELL + CELL / 2, 5, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;
        // 机器人
        const p = pose();
        drawRobot(ctx, OX + p.x * CELL + CELL / 2, OY + p.y * CELL + CELL / 2, p.a, 30, phase === 'won' ? sun : grape, ink, p.shake);
        // 撞到了
        if (bumpFx > 0) {
          const bx = OX + robot.x * CELL + CELL / 2;
          const by = Math.max(OY + 14, OY + robot.y * CELL + CELL / 2 - 30);
          ctx.globalAlpha = Math.min(1, bumpFx * 2);
          ctx.fillStyle = tomato; ctx.strokeStyle = ink; ctx.lineWidth = 2;
          ctx.font = font(18); ctx.textAlign = 'center';
          const tw = ctx.measureText(bumpText).width + 18;
          const bxx = Math.max(OX + tw / 2, Math.min(OX + COLS * CELL - tw / 2, bx));
          PG.roundRect(ctx, bxx - tw / 2, by - 16, tw, 28, 10); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.fillText(bumpText, bxx, by + 4);
          ctx.textAlign = 'left'; ctx.globalAlpha = 1;
        }
        // 彩色星星
        for (const q of party) {
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.globalAlpha = Math.min(1, q.life);
          PG.drawStar(ctx, 0, 0, 8, sun, ink); ctx.restore();
        }
        ctx.globalAlpha = 1;
        // 侦探阶段：提示去标嫌疑卡
        if (phase === 'suspect' && !anim) {
          ctx.font = font(15); ctx.textAlign = 'center';
          const tx = W / 2, ty = OY + ROWS * CELL + 2 + Math.sin(t * 5) * 2;
          const tw = ctx.measureText('侦探笔记：先标两张嫌疑卡').width + 20;
          ctx.fillStyle = sun; ctx.strokeStyle = ink; ctx.lineWidth = 2;
          PG.roundRect(ctx, tx - tw / 2, ty - 18, tw, 26, 9); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#1b2440'; ctx.fillText('侦探笔记：先标两张嫌疑卡', tx, ty);
          ctx.textAlign = 'left';
        }
      });

      // ---------- 猜一猜 ----------
      // 和正确的程序比一比：第几张走完以后，机器人的位置开始不一样
      function firstWrongCard() {
        const good = simulate(pz.prog, pz), bad = simulate(prog, pz);
        const after = (sim, card) => {
          let [x, y, d] = pz.start;
          for (const g of sim.segs) {
            if (g.card > card) break;
            if (g.kind === 'bump') return 'bump';
            if (g.kind === 'move') { x = g.x; y = g.y; }
            if (g.kind === 'turn') d = g.d;
          }
          return x + ',' + y + ',' + d;
        };
        for (let i = 0; i < prog.length; i++) if (after(good, i) !== after(bad, i)) return i;
        return pz.bug;
      }

      api.guesses([
        {
          q: '机器人走错了路。第一件事做什么？',
          options: ['把整个程序全部重写', '先猜是哪张卡有问题', '多按几次运行，说不定就好了'], answer: 1,
          why: '全部重写又累，还可能写出新的错。先猜一两张最可疑的，再一张一张查，最快找到。看上面：它走错了，现在轮到你写侦探笔记。',
          apply: () => { loadPuzzle(pzIndex); runAll(); },
          delay: 1400,
        },
        {
          q: '“一步一步走”有什么用？',
          options: ['让机器人走得更好看', '看清是从哪一步开始不对', '能跳过写错的卡'], answer: 1,
          why: '一次只走一张卡，走完就停下来对一对：和我想的一样吗？第一张对不上的，嫌疑最大。看右边标红的那张。',
          apply: () => {
            loadPuzzle(pzIndex); spoiled = true; phase = 'tools'; renderCards();
            const target = firstWrongCard();
            const go = () => {
              const before = stepPc;
              stepOnce();
              later(function wait() {
                if (anim) { later(wait, 120); return; }
                if (before >= target) {
                  blame = target; msg = '第 ' + (target + 1) + ' 张走完，和想的不一样了！';
                  api.sound('ding'); renderCards(); return;
                }
                go();
              }, 120);
            };
            later(go, 300);
          },
          delay: 1200,
        },
        {
          q: '改了一张卡，机器人还是走不对。接下来呢？',
          options: ['退回去，再换一张嫌疑卡查', '在这张卡上接着乱改', '把每一张卡都改一遍'], answer: 0,
          why: '改了没用，说明它可能不是真凶。先退回原样，免得越改越乱，再去查下一张嫌疑卡。看上面的机器人就是这么做的。',
          apply: () => {
            loadPuzzle(pzIndex); spoiled = true;
            // 找一张“看着可疑、其实没错”的卡来演示
            let decoy = -1;
            for (let i = prog.length - 1; i >= 0; i--) {
              if (i === pz.bug || prog[i].t !== 'F') continue;
              const test = prog.map((c) => ({ ...c })); test[i].n = (test[i].n % 6) + 1;
              if (!simulate(test, pz).win) { decoy = i; break; }
            }
            phase = 'tools'; suspects = [decoy, pz.bug]; selected = decoy; renderCards();
            later(() => {
              editCard(decoy);
              later(() => runAll(() => {
                msg = '改了第 ' + (decoy + 1) + ' 张，还是不对……';
                later(() => {
                  revert(); msg = '退回去！再查另一张嫌疑卡：第 ' + (pz.bug + 1) + ' 张';
                  selected = pz.bug; renderCards();
                  later(() => {
                    prog[pz.bug] = { ...pz.prog[pz.bug] }; api.sound('boing');
                    msg = '第 ' + (pz.bug + 1) + ' 张改成“' + cardText(prog[pz.bug]) + '”'; renderCards();
                    later(() => runAll(), 900);
                  }, 1300);
                }, 1300);
              }), 700);
            }, 400);
          },
          delay: 1500,
        },
      ]);

      api.say({
        left: '调试',
        right: '先猜哪里坏了，再一样一样排除',
        example: '机器人走歪了：我先猜第 3 张和第 5 张，一步一步走，发现第 3 张走完就不对了，改好它，就到旗子了。',
        prompt: '我的作品里有个地方不对劲：（写下哪里不对）。先不要改，帮我列出 2 个最可能出问题的地方，告诉我怎么一个一个检查。',
      });

      loadPuzzle(0);
    },

    thumb(ctx, w, h, t) {
      const ink = '#1b2440';
      const cs = 30, ox = 40, oy = 40;
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.5;
      for (let x = 0; x <= 8; x++) { ctx.beginPath(); ctx.moveTo(ox + x * cs, oy); ctx.lineTo(ox + x * cs, oy + 4 * cs); ctx.stroke(); }
      for (let y = 0; y <= 4; y++) { ctx.beginPath(); ctx.moveTo(ox, oy + y * cs); ctx.lineTo(ox + 8 * cs, oy + y * cs); ctx.stroke(); }
      drawFlag(ctx, ox + 7.5 * cs, oy + 0.5 * cs, cs, ink, '#ffd43b', Math.sin(t * 4) * 3);
      // 机器人沿着路走，走到头抖一抖，又重来
      const path = [[0, 3], [1, 3], [2, 3], [3, 3], [3, 2], [3, 1], [4, 1], [5, 1]];
      const k = (t * 2) % (path.length + 2);
      const i = Math.min(path.length - 1, Math.floor(k));
      const f = Math.min(1, k - i);
      const a = path[i], b = path[Math.min(path.length - 1, i + 1)];
      const x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f;
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) || 0;
      drawRobot(ctx, ox + x * cs + cs / 2, oy + y * cs + cs / 2, ang, 20, '#fff', ink, k > path.length ? Math.sin(t * 40) * 2 : 0);
      // 放大镜
      const mx = 250 + Math.sin(t * 1.5) * 12, my = 160 + Math.cos(t * 1.5) * 6;
      ctx.lineWidth = 5; ctx.strokeStyle = ink;
      ctx.beginPath(); ctx.arc(mx, my, 18, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx + 13, my + 13); ctx.lineTo(mx + 30, my + 30); ctx.stroke();
      ctx.fillStyle = ink; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('?', mx, my + 7); ctx.textAlign = 'left';
    },
  });
})();
