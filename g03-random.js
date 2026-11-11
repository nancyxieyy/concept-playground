/* 第 3 关：随机。果树每次“掷骰子”决定果子从哪儿掉；关掉随机，就永远从中间掉。 */
PG.register({
  id: 'random',
  no: 3,
  title: '每次都不一样',
  concept: '随机',
  kid: '像掷骰子一样，让游戏每次都不一样',
  level: 'K4',
  color: 'grass',
  play: '用键盘 ← → 或者拖动篮子，接住树上掉下来的苹果。看最下面的小柱子：苹果都掉在哪儿了？再把开关拨到“永远从中间”试试。',

  mount(api) {
    const W = 480, H = 320;
    const COLS = 9, CW = W / COLS;
    const GROUND = 232, HIST_TOP = 244, HIST_H = 62;
    const PER_ROUND = 12;
    const s = api.stage(W, H);
    const ctx = s.ctx;
    const font = () => getComputedStyle(document.body).fontFamily;

    let mode = 'random';
    let apples = [], splats = [], spawn = 1, dropped = 0, caught = 0, over = false, fast = false;
    let counts = new Array(COLS).fill(0), ghost = null;
    const basket = { x: W / 2, w: 70 };
    const keys = {};
    const die = { face: 3, roll: 0 }; // 树上的小骰子
    let bigDie = { face: 1, roll: 0, show: 0 }; // 按按钮掷的大骰子
    let flash = 0;

    // 程序在这里“掷骰子”：随机就挑一格，不随机就永远挑正中间
    function pickColumn() {
      if (mode === 'mid') return Math.floor(COLS / 2);
      return Math.floor(Math.random() * COLS);
    }

    const rCaught = api.readout('接到', 0);
    const rLeft = api.readout('还剩几个', PER_ROUND);
    const modeCtl = api.choice({
      label: '苹果从哪儿掉',
      options: [{ value: 'random', label: '随机' }, { value: 'mid', label: '永远从中间' }],
      value: 'random',
      onChange: (v) => { mode = v; newRound(); },
    });
    api.controlBox.append(api.h('p', { class: 'small' }, '下面的小柱子：苹果掉在哪一格，那一格的柱子就长高一点。虚线是上一局的。',
      api.h('span', { class: 'grown' }, '（程序里常写成 random，随机数）')));
    api.button('掷骰子', rollBig);
    api.button('再来一局', () => newRound());

    function newRound(keepGhost) {
      if (!keepGhost && counts.some((c) => c > 0)) ghost = counts.slice();
      counts = new Array(COLS).fill(0);
      apples = []; splats = []; dropped = 0; caught = 0; spawn = 0.8; over = false; fast = false;
      rCaught.set(0); rLeft.set(PER_ROUND);
      const o = api.stageBox.querySelector('.overlay'); if (o) o.remove();
    }

    function rollBig() {
      bigDie = { face: 1 + Math.floor(Math.random() * 6), roll: 0.9, show: 2.6 };
      api.sound('tick');
    }

    api.on(window, 'keydown', (e) => {
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName || '')) {
        keys[e.key] = true; e.preventDefault();
      }
    });
    api.on(window, 'keyup', (e) => { keys[e.key] = false; });
    const drag = (e) => { basket.x = Math.max(basket.w / 2, Math.min(W - basket.w / 2, s.pos(e).x)); };
    api.on(s.canvas, 'pointerdown', (e) => { drag(e); s.canvas.setPointerCapture(e.pointerId); });
    api.on(s.canvas, 'pointermove', (e) => { if (e.buttons || e.pointerType !== 'mouse') drag(e); });

    function endRound() {
      over = true;
      const used = counts.filter((c) => c > 0).length;
      api.sound(caught >= PER_ROUND * 0.6 ? 'win' : 'ding');
      fast = false;
      api.overlay('这一局接到 ' + caught + ' 个，苹果掉进了 ' + used + ' 个不同的格子。点这里再来一局', () => newRound());
    }

    api.loop((dt, t) => {
      const ink = api.color('--ink'), grass = api.color('--grass'), tomato = api.color('--tomato'), line = api.color('--line');
      if (!over) {
        if (keys.ArrowLeft) basket.x -= 340 * dt;
        if (keys.ArrowRight) basket.x += 340 * dt;
        basket.x = Math.max(basket.w / 2, Math.min(W - basket.w / 2, basket.x));
        spawn -= dt;
        if (spawn <= 0 && dropped < PER_ROUND) {
          const col = pickColumn();
          apples.push({ col, x: (col + 0.5) * CW, y: 58, vy: 0, wob: 0.35 });
          dropped++; rLeft.set(PER_ROUND - dropped);
          die.roll = mode === 'random' ? 0.3 : 0; die.face = 1 + Math.floor(Math.random() * 6);
          spawn = fast ? 0.45 : 1.15;
        }
        for (const a of apples) {
          if (a.wob > 0) { a.wob -= dt; continue; } // 先在树上晃一晃
          a.vy += (fast ? 900 : 520) * dt; a.y += a.vy * dt;
          if (!a.done && a.y > GROUND - 34 && a.y < GROUND - 8 && Math.abs(a.x - basket.x) < basket.w / 2 + 4) {
            a.done = true; caught++; rCaught.set(caught); counts[a.col]++; api.sound('ding'); flash = 0.25;
          } else if (!a.done && a.y >= GROUND - 8) {
            a.done = true; counts[a.col]++; splats.push({ x: a.x, life: 1.4 }); api.sound('step');
          }
        }
        apples = apples.filter((a) => !a.done);
        if (dropped >= PER_ROUND && !apples.length) endRound();
      }
      die.roll = Math.max(0, die.roll - dt);
      if (bigDie.roll > 0 && bigDie.roll - dt <= 0) api.sound('pop');
      bigDie.roll = Math.max(0, bigDie.roll - dt); bigDie.show = Math.max(0, bigDie.show - dt);
      splats.forEach((sp) => { sp.life -= dt; });
      splats = splats.filter((sp) => sp.life > 0);
      flash = Math.max(0, flash - dt);

      s.clear();
      // 每一格的淡竖线，和下面的小柱子对齐
      ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.setLineDash([4, 6]);
      for (let i = 1; i < COLS; i++) { ctx.beginPath(); ctx.moveTo(i * CW, 60); ctx.lineTo(i * CW, GROUND); ctx.stroke(); }
      ctx.setLineDash([]);
      // 树冠
      ctx.fillStyle = grass; ctx.strokeStyle = ink; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(W + 4, -4); ctx.lineTo(W + 4, 46);
      for (let i = 16; i > 0; i--) ctx.quadraticCurveTo(i * 30 - 15, 66, i * 30 - 30, 46);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      // 树上的小骰子：每掉一个苹果，程序就掷一次
      drawDie(ctx, W - 40, 26, 30, mode === 'mid' ? 0 : (die.roll > 0 ? 1 + (Math.floor(t * 20) % 6) : die.face), ink, mode === 'mid');
      // 地面
      ctx.fillStyle = line; ctx.fillRect(0, GROUND, W, 6);
      // 摔扁的苹果
      splats.forEach((sp) => {
        ctx.globalAlpha = Math.min(1, sp.life);
        ctx.fillStyle = tomato; ctx.beginPath(); ctx.ellipse(sp.x, GROUND - 4, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      });
      // 苹果
      for (const a of apples) {
        const wx = a.wob > 0 ? Math.sin(t * 40) * 2 : 0;
        drawApple(ctx, a.x + wx, a.y, 12, tomato, ink);
      }
      // 篮子
      ctx.fillStyle = flash > 0 ? '#ffd43b' : api.color('--sun'); ctx.strokeStyle = ink; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(basket.x - basket.w / 2, GROUND - 32); ctx.lineTo(basket.x + basket.w / 2, GROUND - 32);
      ctx.lineTo(basket.x + basket.w / 2 - 10, GROUND - 4); ctx.lineTo(basket.x - basket.w / 2 + 10, GROUND - 4); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(basket.x - basket.w / 2 + 8, GROUND - 22); ctx.lineTo(basket.x + basket.w / 2 - 8, GROUND - 22); ctx.stroke();

      // 小柱子：苹果掉在哪一格
      const max = Math.max(6, ...counts, ...(ghost || [0]));
      const unit = HIST_H / max;
      for (let i = 0; i < COLS; i++) {
        const x = i * CW + 6, w = CW - 12, base = HIST_TOP + HIST_H;
        if (counts[i]) {
          ctx.fillStyle = tomato; ctx.strokeStyle = ink; ctx.lineWidth = 2;
          ctx.fillRect(x, base - counts[i] * unit, w, counts[i] * unit); ctx.strokeRect(x, base - counts[i] * unit, w, counts[i] * unit);
          ctx.fillStyle = ink; ctx.font = '13px ' + font(); ctx.textAlign = 'center';
          if (counts[i] * unit > 16) ctx.fillText(counts[i], x + w / 2, base - counts[i] * unit + 14);
        }
        if (ghost && ghost[i]) {
          ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
          ctx.strokeRect(x - 2, base - ghost[i] * unit, w + 4, ghost[i] * unit);
          ctx.setLineDash([]);
        }
      }
      ctx.fillStyle = ink; ctx.fillRect(0, HIST_TOP + HIST_H, W, 2);
      ctx.font = '13px ' + font(); ctx.textAlign = 'left'; ctx.fillStyle = api.color('--ink-2');
      ctx.fillText('掉在哪儿', 6, HIST_TOP + 10);

      // 大骰子
      if (bigDie.show > 0) {
        ctx.globalAlpha = Math.min(1, bigDie.show * 2);
        const face = bigDie.roll > 0 ? 1 + (Math.floor(t * 18) % 6) : bigDie.face;
        ctx.save(); ctx.translate(W / 2, 140); ctx.rotate(bigDie.roll * 6);
        drawDie(ctx, 0, 0, 74, face, ink, false);
        ctx.restore();
        if (bigDie.roll <= 0) {
          ctx.fillStyle = ink; ctx.font = '20px ' + font(); ctx.textAlign = 'center';
          ctx.fillText('掷出了 ' + bigDie.face + '！再掷一次猜猜是几？', W / 2, 200);
        }
        ctx.globalAlpha = 1;
      }
      ctx.textAlign = 'left';
    });

    function drawApple(c, x, y, r, fill, ink) {
      c.fillStyle = fill; c.strokeStyle = ink; c.lineWidth = 2.5;
      c.beginPath(); c.arc(x - r * 0.35, y, r * 0.8, 0, Math.PI * 2); c.arc(x + r * 0.35, y, r * 0.8, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(x, y + 1, r * 1.1, r, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(x, y - r + 2); c.lineTo(x + 2, y - r - 6); c.stroke();
      c.fillStyle = '#1fb36f'; c.beginPath(); c.ellipse(x + 7, y - r - 3, 6, 3, -0.5, 0, Math.PI * 2); c.fill();
    }

    // 画一个骰子；fixed=true 时写“中”，表示没在掷
    function drawDie(c, x, y, size, face, ink, fixed) {
      c.fillStyle = '#fff'; c.strokeStyle = '#1b2440'; c.lineWidth = 2.5;
      PG.roundRect(c, x - size / 2, y - size / 2, size, size, size * 0.2); c.fill(); c.stroke();
      c.fillStyle = '#1b2440';
      if (fixed) {
        c.font = Math.round(size * 0.55) + 'px ' + font(); c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('中', x, y + 1); c.textBaseline = 'alphabetic'; c.textAlign = 'left';
        return;
      }
      const p = size * 0.26, r = size * 0.08;
      const spots = {
        1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
        5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
      }[face] || [];
      spots.forEach(([a, b]) => { c.beginPath(); c.arc(x + a * p, y + b * p, r, 0, Math.PI * 2); c.fill(); });
    }

    // 猜一猜里“直接玩完一局”：只算苹果掉在哪儿，不用等
    function quickRound() {
      const c = new Array(COLS).fill(0);
      for (let i = 0; i < PER_ROUND; i++) c[pickColumn()]++;
      return c;
    }

    api.guesses([
      {
        q: '把开关拨到“永远从中间”。苹果会掉在哪儿？',
        options: ['到处乱掉', '全都掉在正中间', '全都掉在最左边'], answer: 1,
        why: '没有随机，程序每次都挑同一格。下面只有中间那根柱子在长，篮子放在中间不动就能全接住。',
        apply: () => { modeCtl.set('mid'); },
      },
      {
        q: '拨回“随机”，玩两局。两局苹果掉的位置会一模一样吗？',
        options: ['一模一样', '不一样'], answer: 1,
        why: '随机就像每掉一个都掷一次骰子。看下面：虚线是上一局，红柱子是这一局，高高低低长得不一样。',
        apply: () => {
          mode = 'random'; modeCtl.set('random');
          ghost = quickRound(); newRound(true); fast = true;
        },
      },
      {
        q: '“随机”和“永远从中间”，你觉得哪个更好玩？',
        options: ['随机更好玩', '永远从中间更好玩', '说不清'], answer: null,
        why: '这题没有标准答案，说出你的理由就行。很多人觉得随机更好玩：猜不到下一个在哪，每局都不一样；永远从中间太好猜，玩两次就没意思了。',
        apply: () => { modeCtl.set('random'); },
      },
    ]);

    api.say({
      left: '随机',
      right: '像掷骰子一样，让游戏每次都不一样',
      example: '苹果每次掉在不同的地方、怪兽从不同的门出来、抽奖抽到不同的东西，背后都是程序在“掷骰子”。',
      prompt: '我的作品里，哪里用了随机（每次都不一样）？告诉我是哪一行，再说说如果去掉随机，游戏会变成什么样。先不要改。',
    });
  },

  thumb(ctx, w, h, t) {
    const ink = '#1b2440';
    // 树冠
    ctx.fillStyle = '#fff'; ctx.strokeStyle = ink; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 30);
    for (let i = 0; i <= 10; i++) ctx.quadraticCurveTo(i * 32 + 16, 50, i * 32 + 32, 30);
    ctx.lineTo(320, 0); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    // 苹果：每秒换一个地方（固定的“假随机”，首页好看就行）
    const k = Math.floor(t * 1.2), p = (t * 1.2) % 1;
    const xs = [60, 210, 130, 270, 90, 180, 240, 40];
    const x = xs[k % xs.length], y = 40 + p * 100;
    ctx.fillStyle = '#ff5a47'; ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // 小柱子
    const bars = [2, 4, 1, 3, 5, 2, 3, 1];
    for (let i = 0; i < 8; i++) {
      const hh = (bars[(i + Math.floor(t / 3)) % 8]) * 7;
      ctx.fillStyle = '#ffd43b'; ctx.fillRect(20 + i * 36, 190 - hh, 26, hh); ctx.strokeRect(20 + i * 36, 190 - hh, 26, hh);
    }
  },
});
