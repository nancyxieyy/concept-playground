/* 第 4 关：坐标。藏宝图上的格子，用 x、y 两个数把小海盗开到宝藏那儿。 */
PG.register({
  id: 'coord',
  no: 4,
  title: '藏宝图上的格子',
  concept: '坐标',
  kid: '屏幕是一张方格纸，每个东西都有两个数：离左边多远、离上边多远',
  level: 'K4',
  color: 'sun',
  play: '拖右边的 x、y 两个滑块（也可以按键盘方向键），把小海盗的船开到宝藏那一格。点一点地图上的格子，看看它是哪两个数。',

  mount(api) {
    const W = 480, H = 320;
    const COLS = 10, ROWS = 7, CELL = 41;
    const LEFT = 50, TOP = 30; // 地图左上角
    const s = api.stage(W, H);
    const ctx = s.ctx;
    const font = () => getComputedStyle(document.body).fontFamily;
    let alive = true;
    api.onCleanup(() => { alive = false; });
    const later = (fn, ms) => setTimeout(() => { if (alive) fn(); }, ms);

    const ship = { x: 0, y: 0, dx: LEFT + CELL / 2, dy: TOP + CELL / 2 }; // x、y 是格子；dx、dy 是画出来的位置（慢慢跟上）
    let treasure = null, found = 0, win = 0, peek = null, waitWin = 0, seek = 0;
    const sparks = [];
    const cx = (gx) => LEFT + gx * CELL + CELL / 2;
    const cy = (gy) => TOP + gy * CELL + CELL / 2;

    // ---------- 右边 ----------
    const quest = api.h('div', {
      style: { font: '22px/1.35 var(--display)', padding: '10px 14px', border: '2.5px solid var(--ink)', borderRadius: '12px', background: 'var(--sun)', color: '#1b2440' },
    });
    api.controlBox.append(quest);
    const xs = api.slider({ label: 'x（往右数几格）', min: 0, max: COLS - 1, value: 0, onInput: (v) => { ship.x = v; } });
    const ys = api.slider({ label: 'y（往下数几格）', min: 0, max: ROWS - 1, value: 0, onInput: (v) => { ship.y = v; } });
    const rFound = api.readout('找到宝藏', 0);
    api.button('换一张藏宝图', () => newTreasure(true));
    api.controlBox.append(api.h('p', { class: 'small' },
      '注意：屏幕上 y 越大越往下，和数学课的方格图不一样！',
      api.h('span', { class: 'grown' }, '（这两个数合起来叫坐标）')));

    function newTreasure(sound) {
      let t;
      do { t = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) }; }
      while ((t.x === ship.x && t.y === ship.y) || (treasure && t.x === treasure.x && t.y === treasure.y));
      treasure = t; win = 0; seek = 0;
      quest.textContent = '宝藏在 x=' + t.x + '，y=' + t.y + '，把小海盗开过去！';
      if (sound) api.sound('pop');
    }
    newTreasure(false);

    // 键盘：方向键一次走一格（焦点在滑块上时让滑块自己处理）
    api.on(window, 'keydown', (e) => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '')) return;
      const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (!d) return;
      e.preventDefault();
      const nx = Math.max(0, Math.min(COLS - 1, ship.x + d[0])), ny = Math.max(0, Math.min(ROWS - 1, ship.y + d[1]));
      if (nx !== ship.x) xs.set(nx);
      if (ny !== ship.y) ys.set(ny);
      if (nx !== ship.x || ny !== ship.y) api.sound('step'); else api.sound('buzz');
    });

    // 点格子：告诉你这一格是哪两个数
    api.on(s.canvas, 'pointerdown', (e) => {
      const p = s.pos(e);
      const gx = Math.floor((p.x - LEFT) / CELL), gy = Math.floor((p.y - TOP) / CELL);
      if (gx < 0 || gy < 0 || gx >= COLS || gy >= ROWS) return;
      peek = { x: gx, y: gy, life: 2.2 };
      api.sound('tick');
    });

    api.loop((dt, t) => {
      const ink = api.color('--ink'), line = api.color('--line'), card = api.color('--card');
      const sun = api.color('--sun'), sky = api.color('--sky'), tomato = api.color('--tomato'), ink2 = api.color('--ink-2');
      ship.dx += (cx(ship.x) - ship.dx) * Math.min(1, dt * 8);
      ship.dy += (cy(ship.y) - ship.dy) * Math.min(1, dt * 8);
      seek += dt;
      const arrived = Math.abs(ship.dx - cx(ship.x)) < 3 && Math.abs(ship.dy - cy(ship.y)) < 3;

      // 到了宝藏那一格
      if (treasure && !win && arrived && ship.x === treasure.x && ship.y === treasure.y) {
        win = 1.8; found++; rFound.set(found); api.sound('win');
        quest.textContent = '找到啦！就在 x=' + treasure.x + '，y=' + treasure.y + '。';
        for (let i = 0; i < 16; i++) {
          const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 90;
          sparks.push({ x: cx(treasure.x), y: cy(treasure.y), vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1 });
        }
        waitWin = 1;
      }
      if (win > 0) { win -= dt; if (win <= 0 && waitWin) { waitWin = 0; newTreasure(true); } }
      sparks.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 120 * dt; p.life -= dt; });
      for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].life <= 0) sparks.splice(i, 1);
      if (peek) { peek.life -= dt; if (peek.life <= 0) peek = null; }

      s.clear();
      // 地图格子
      ctx.fillStyle = card; ctx.fillRect(LEFT, TOP, COLS * CELL, ROWS * CELL);
      // 小海盗所在的这一列、这一行，淡淡地涂一下
      ctx.fillStyle = sky; ctx.globalAlpha = 0.12;
      ctx.fillRect(LEFT + ship.x * CELL, TOP, CELL, ROWS * CELL);
      ctx.fillRect(LEFT, TOP + ship.y * CELL, COLS * CELL, CELL);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = line; ctx.lineWidth = 1.5;
      for (let i = 0; i <= COLS; i++) { ctx.beginPath(); ctx.moveTo(LEFT + i * CELL, TOP); ctx.lineTo(LEFT + i * CELL, TOP + ROWS * CELL); ctx.stroke(); }
      for (let j = 0; j <= ROWS; j++) { ctx.beginPath(); ctx.moveTo(LEFT, TOP + j * CELL); ctx.lineTo(LEFT + COLS * CELL, TOP + j * CELL); ctx.stroke(); }
      ctx.strokeStyle = ink; ctx.lineWidth = 2.5; ctx.strokeRect(LEFT, TOP, COLS * CELL, ROWS * CELL);

      // 上面的 x 数字、左边的 y 数字（小海盗那一格的数字变大变色）
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let i = 0; i < COLS; i++) {
        const on = i === ship.x;
        ctx.font = (on ? 'bold 19px ' : '15px ') + font(); ctx.fillStyle = on ? sky : ink2;
        ctx.fillText(i, cx(i), TOP - 14);
      }
      for (let j = 0; j < ROWS; j++) {
        const on = j === ship.y;
        ctx.font = (on ? 'bold 19px ' : '15px ') + font(); ctx.fillStyle = on ? tomato : ink2;
        ctx.fillText(j, LEFT - 14, cy(j));
      }
      // 角上的箭头：x 往右变大，y 往下变大
      ctx.font = 'bold 15px ' + font(); ctx.fillStyle = sky; ctx.fillText('x→', 18, 15);
      ctx.fillStyle = tomato; ctx.fillText('y', 14, TOP + 24); ctx.fillText('↓', 14, TOP + 44);

      // 从小海盗到两边数字的虚线
      ctx.setLineDash([5, 5]); ctx.lineWidth = 2;
      ctx.strokeStyle = sky; ctx.beginPath(); ctx.moveTo(ship.dx, ship.dy - 14); ctx.lineTo(ship.dx, TOP); ctx.stroke();
      ctx.strokeStyle = tomato; ctx.beginPath(); ctx.moveTo(ship.dx - 16, ship.dy); ctx.lineTo(LEFT, ship.dy); ctx.stroke();
      ctx.setLineDash([]);

      // 宝藏：找到的时候才露出来；找了 15 秒还没找到，才冒出一个小问号帮忙
      if (treasure) {
        const tx = cx(treasure.x), ty = cy(treasure.y);
        if (win > 0) drawChest(ctx, tx, ty - Math.sin(Math.min(1, (1.8 - win) * 3) * Math.PI / 2) * 6, ink, true);
        else if (seek > 15) {
          ctx.globalAlpha = 0.25 + 0.15 * Math.sin(t * 3);
          ctx.fillStyle = ink2; ctx.font = '20px ' + font(); ctx.fillText('?', tx, ty);
          ctx.globalAlpha = 1;
        }
      }
      sparks.forEach((p) => { ctx.globalAlpha = Math.max(0, p.life); PG.drawStar(ctx, p.x, p.y, 6, '#ffd43b'); });
      ctx.globalAlpha = 1;

      // 小海盗和船
      drawPirate(ctx, ship.dx, ship.dy, t, ink, sky);

      // 点过的格子
      if (peek) {
        const px = cx(peek.x), py = cy(peek.y);
        ctx.globalAlpha = Math.min(1, peek.life * 2);
        ctx.strokeStyle = sun; ctx.lineWidth = 4; ctx.strokeRect(LEFT + peek.x * CELL + 2, TOP + peek.y * CELL + 2, CELL - 4, CELL - 4);
        const label = 'x=' + peek.x + ', y=' + peek.y;
        ctx.font = 'bold 16px ' + font();
        const bw = ctx.measureText(label).width + 18;
        const bx = Math.max(bw / 2 + 2, Math.min(W - bw / 2 - 2, px)), by = peek.y === 0 ? py + 34 : py - 32;
        ctx.fillStyle = card; ctx.strokeStyle = ink; ctx.lineWidth = 2;
        PG.roundRect(ctx, bx - bw / 2, by - 14, bw, 28, 8); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ink; ctx.fillText(label, bx, by + 1);
        ctx.globalAlpha = 1;
      }
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    });

    function drawChest(c, x, y, ink, open) {
      c.fillStyle = '#c47a2c'; c.strokeStyle = ink; c.lineWidth = 2.5;
      PG.roundRect(c, x - 15, y - 4, 30, 18, 3); c.fill(); c.stroke();
      if (open) { c.fillStyle = '#ffd43b'; c.beginPath(); c.ellipse(x, y - 4, 13, 5, 0, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#c47a2c'; PG.roundRect(c, x - 15, y - 16, 30, 10, 4); c.fill(); c.stroke();
      c.fillStyle = '#ffd43b'; c.fillRect(x - 3, y - 2, 6, 6);
    }

    function drawPirate(c, x, y, t, ink, sky) {
      const bob = Math.sin(t * 3) * 1.5;
      c.save(); c.translate(x, y + bob);
      // 船
      c.fillStyle = '#c47a2c'; c.strokeStyle = ink; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(-17, 4); c.lineTo(17, 4); c.lineTo(11, 15); c.lineTo(-11, 15); c.closePath(); c.fill(); c.stroke();
      // 脑袋
      c.fillStyle = '#ffe0bd'; c.beginPath(); c.arc(0, -4, 9, 0, Math.PI * 2); c.fill(); c.stroke();
      // 眼罩和眼睛
      c.fillStyle = '#1b2440'; c.beginPath(); c.arc(-3.5, -4, 2.6, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(3.5, -4, 1.6, 0, Math.PI * 2); c.fill();
      c.lineWidth = 1.5; c.beginPath(); c.moveTo(-9, -8); c.lineTo(7, -1); c.stroke();
      // 帽子
      c.lineWidth = 2.5; c.fillStyle = '#1b2440';
      c.beginPath(); c.moveTo(-13, -10); c.quadraticCurveTo(0, -26, 13, -10); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#ffd43b'; c.beginPath(); c.arc(0, -15, 2.5, 0, Math.PI * 2); c.fill();
      c.restore();
    }

    // ---------- 猜一猜 ----------
    function goto(x, y) { xs.set(x); ys.set(y); }
    api.guesses([
      {
        q: '小海盗在 x=2，y=3。把 x 改成 7，它会往哪边走？',
        options: ['往右', '往左', '往下'], answer: 0,
        why: 'x 管左右，是“离左边有几格”。x 变大，就离左边更远，所以往右走。',
        apply: () => { goto(2, 3); later(() => { xs.set(7); api.sound('step'); }, 700); },
      },
      {
        q: '现在 y=1。把 y 改成 5，小海盗会往上走还是往下走？',
        options: ['往上', '往下'], answer: 1,
        why: '屏幕上 y 是“离上边有几格”，越大越往下。数学课的方格图正好反过来，y 越大越往上，别弄混啦！',
        apply: () => { goto(ship.x, 1); later(() => { ys.set(5); api.sound('step'); }, 700); },
      },
      {
        q: '想让小海盗从右下角那一格出发，x 和 y 应该写多少？',
        options: ['x=0，y=0', 'x=9，y=6', 'x=9，y=0'], answer: 1,
        why: '最右边一列是 x=9，最下面一行是 y=6。左上角才是 x=0，y=0，所有的数都是从左上角开始数的。',
        apply: () => { goto(9, 6); later(() => { peek = { x: 9, y: 6, life: 3 }; }, 500); },
      },
    ]);

    api.say({
      left: '坐标',
      right: '两个数：离左边多远、离上边多远',
      example: '小海盗在 x=6，y=4，就是从左上角往右数 6 格、往下数 4 格。屏幕上的每个东西都有这样两个数。',
      prompt: '我的作品里，主角一开始站在哪儿？告诉我那两个数是多少，哪个管左右、哪个管上下。先不要改。',
    });
  },

  thumb(ctx, w, h, t) {
    const ink = '#1b2440';
    const L = 70, T = 30, C = 26;
    ctx.fillStyle = '#fff'; ctx.fillRect(L, T, C * 8, C * 6);
    ctx.strokeStyle = ink; ctx.lineWidth = 1;
    for (let i = 0; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(L + i * C, T); ctx.lineTo(L + i * C, T + 6 * C); ctx.stroke(); }
    for (let j = 0; j <= 6; j++) { ctx.beginPath(); ctx.moveTo(L, T + j * C); ctx.lineTo(L + 8 * C, T + j * C); ctx.stroke(); }
    ctx.lineWidth = 3; ctx.strokeRect(L, T, C * 8, C * 6);
    // 一条小路：慢慢走过几个格子
    const path = [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1], [3, 2], [4, 2], [5, 2], [5, 3], [5, 4], [6, 4]];
    const k = Math.floor(t * 2) % (path.length + 3);
    const [gx, gy] = path[Math.min(k, path.length - 1)];
    // 宝箱
    ctx.fillStyle = '#c47a2c'; ctx.fillRect(L + 6 * C + 5, T + 4 * C + 7, C - 10, C - 12); ctx.strokeRect(L + 6 * C + 5, T + 4 * C + 7, C - 10, C - 12);
    ctx.fillStyle = '#ff5a47'; ctx.beginPath(); ctx.arc(L + gx * C + C / 2, T + gy * C + C / 2, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = ink; ctx.font = '18px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('x=' + gx + '  y=' + gy, 160, 192); ctx.textAlign = 'left';
  },
});
