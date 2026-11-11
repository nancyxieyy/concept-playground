/* 第 5 关：游戏循环。游戏像翻书：一秒画很多张，每一张都要把四件事做一遍。 */
PG.register({
  id: 'loop',
  no: 5,
  title: '一秒画很多张',
  concept: '游戏循环',
  kid: '游戏像翻书，一秒钟画很多张，每一张都要算一遍',
  level: 'K4–K5',
  color: 'grape',
  play: '用方向键、下面的大按钮，或者点一下画面，给小球怪换方向，去吃星星。把“一秒画几张”拉到很小，看看右边那四件事是怎么一件一件亮起来的。',

  mount(api) {
    const W = 480, H = 340, WH = 228; // 上面是游戏世界，下面是翻书条
    const s = api.stage(W, H);
    const ctx = s.ctx;
    const font = (px) => px + 'px ' + getComputedStyle(document.body).fontFamily;

    // 小球怪和星星
    const R = 18, SPEED = 200;
    const ball = { x: 120, y: 100, vx: 160, vy: 120 };
    let star = newStar(), score = 0, frameNo = 0;
    function newStar() { return { x: 40 + Math.random() * (W - 80), y: 40 + Math.random() * (WH - 80) }; }

    // 按键：先记下来，等“看按键”那一步再真的去看
    const held = { left: false, right: false, up: false, down: false };
    let seen = { left: false, right: false, up: false, down: false };

    // 四件事
    const STEPS = ['看按键', '挪位置', '检查撞没撞', '重新画'];
    const on = [true, true, true, true];
    let cur = 0, subTime = 0, paused = false, fps = 30;
    let hitWall = 0, flyAway = false;
    const film = []; // 翻书条：最近画的几张
    let lastDrawn = null;

    function stepOnce() {
      const i = cur;
      if (on[i]) {
        if (i === 0) seen = Object.assign({}, held);
        else if (i === 1) move();
        else if (i === 2) check();
        else draw();
      }
      cur = (cur + 1) % 4;
    }

    function move() {
      const sp = SPEED;
      if (seen.left) ball.vx = -Math.abs(ball.vx || sp * 0.7);
      if (seen.right) ball.vx = Math.abs(ball.vx || sp * 0.7);
      if (seen.up) ball.vy = -Math.abs(ball.vy || sp * 0.6);
      if (seen.down) ball.vy = Math.abs(ball.vy || sp * 0.6);
      const dt = 1 / fps; // 一张和下一张之间过了多久
      ball.x = Math.max(-3000, Math.min(3000, ball.x + ball.vx * dt));
      ball.y = Math.max(-3000, Math.min(3000, ball.y + ball.vy * dt));
    }

    function check() {
      let bump = false;
      if (ball.x < R) { ball.x = Math.min(W - R, 2 * R - ball.x); ball.vx = Math.abs(ball.vx); bump = true; }
      if (ball.x > W - R) { ball.x = Math.max(R, 2 * (W - R) - ball.x); ball.vx = -Math.abs(ball.vx); bump = true; }
      if (ball.y < R) { ball.y = Math.min(WH - R, 2 * R - ball.y); ball.vy = Math.abs(ball.vy); bump = true; }
      if (ball.y > WH - R) { ball.y = Math.max(R, 2 * (WH - R) - ball.y); ball.vy = -Math.abs(ball.vy); bump = true; }
      if (bump) { hitWall = 0.25; api.sound('boing'); }
      if (Math.hypot(ball.x - star.x, ball.y - star.y) < R + 14) {
        score++; star = newStar(); api.sound('ding'); rScore.set(score);
      }
    }

    // “重新画”：只有这一步才会把新的样子画到屏幕上
    function draw() {
      frameNo++;
      lastDrawn = { n: frameNo, x: ball.x, y: ball.y, vx: ball.vx, sx: star.x, sy: star.y, hit: hitWall > 0 };
      film.push(lastDrawn);
      if (film.length > 5) film.shift();
      if (fps <= 5) api.sound('tick');
      paint();
    }

    function drawCritter(c, x, y, r, vx, hit) {
      c.fillStyle = hit ? api.color('--sun') : api.color('--grape');
      c.strokeStyle = api.color('--ink'); c.lineWidth = Math.max(1.5, r / 7);
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.stroke();
      const look = vx >= 0 ? 1 : -1;
      c.fillStyle = '#fff';
      for (const dx of [-0.35, 0.3]) { c.beginPath(); c.arc(x + dx * r + look * r * 0.12, y - r * 0.2, r * 0.26, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = '#1b2440';
      for (const dx of [-0.35, 0.3]) { c.beginPath(); c.arc(x + dx * r + look * r * 0.22, y - r * 0.2, r * 0.12, 0, Math.PI * 2); c.fill(); }
    }

    function paint() {
      const ink = api.color('--ink'), line = api.color('--line'), card = api.color('--card');
      s.clear();
      if (!lastDrawn) return;
      const d = lastDrawn;
      ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.strokeRect(1.5, 1.5, W - 3, WH - 3);
      ctx.save(); ctx.translate(d.sx, d.sy); ctx.rotate(d.n * 0.05);
      PG.drawStar(ctx, 0, 0, 14, api.color('--sun'), ink); ctx.restore();
      drawCritter(ctx, d.x, d.y, R, d.vx, d.hit);
      ctx.fillStyle = ink; ctx.font = font(15);
      ctx.fillText('第 ' + d.n + ' 张    星星 ' + score, 12, 22);
      ctx.textAlign = 'right'; ctx.fillText('一秒画 ' + fps + ' 张', W - 12, 22); ctx.textAlign = 'left';
      if (flyAway && (d.x < -R || d.x > W + R || d.y < -R || d.y > WH + R)) {
        ctx.fillStyle = api.color('--tomato'); ctx.font = font(22); ctx.textAlign = 'center';
        ctx.fillText('小球怪穿墙飞走了！', W / 2, WH / 2);
        ctx.font = font(15); ctx.fillStyle = ink;
        ctx.fillText('把“检查撞没撞”装回去，它就会回来', W / 2, WH / 2 + 26);
        ctx.textAlign = 'left';
      }
      // 翻书条
      ctx.fillStyle = ink; ctx.font = font(13);
      ctx.fillText('翻书条：最近画的 5 张（最右边是最新的）', 10, WH + 18);
      const tw = 84, th = Math.round(tw * WH / W), gap = (W - 20 - tw * 5) / 4;
      film.forEach((f, k) => {
        const x0 = 10 + k * (tw + gap), y0 = WH + 26, sc = tw / W;
        const newest = k === film.length - 1;
        ctx.fillStyle = card; ctx.strokeStyle = newest ? api.color('--grape') : line; ctx.lineWidth = newest ? 3 : 2;
        ctx.fillRect(x0, y0, tw, th); ctx.strokeRect(x0, y0, tw, th);
        ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, tw, th); ctx.clip();
        PG.drawStar(ctx, x0 + f.sx * sc, y0 + f.sy * sc, 5, api.color('--sun'));
        drawCritter(ctx, x0 + f.x * sc, y0 + f.y * sc, Math.max(4, R * sc * 1.2), f.vx, f.hit);
        ctx.restore();
        ctx.fillStyle = ink; ctx.font = font(12); ctx.textAlign = 'center';
        ctx.fillText('第 ' + f.n + ' 张', x0 + tw / 2, y0 + th + 15); ctx.textAlign = 'left';
      });
    }

    // ---------- 右边：四件事转圈圈 ----------
    const loopBox = api.h('div', { class: 'ctl', style: { border: '2.5px solid var(--ink)', borderRadius: '14px', padding: '10px 12px', background: 'var(--card)' } });
    const fastNote = api.h('span', { class: 'small' }, '');
    loopBox.append(api.h('span', { class: 'lab' }, '每画一张，都把这 4 件事做一遍'),
      api.h('span', { class: 'small' }, '点一下某件事，可以把它拿掉 / 装回去。'));
    const stepBtns = STEPS.map((name, i) => {
      const b = api.h('button', { class: 'btn', type: 'button', style: { textAlign: 'left', width: '100%', boxShadow: 'none', transition: 'none' } }, (i + 1) + '. ' + name);
      b.addEventListener('click', () => toggleStep(i));
      loopBox.append(b);
      if (i < 3) loopBox.append(api.h('span', { style: { textAlign: 'center', lineHeight: '1' }, 'aria-hidden': 'true' }, '↓'));
      return b;
    });
    loopBox.append(api.h('span', { class: 'small', style: { textAlign: 'center' } }, '↺ 做完第 4 件，再回到第 1 件，一直转'), fastNote);
    api.controlBox.append(loopBox);

    function toggleStep(i, val) {
      on[i] = val == null ? !on[i] : val;
      if (i === 2) flyAway = !on[2];
      api.sound(on[i] ? 'pop' : 'buzz');
      api.toast(on[i] ? '装回去了：' + STEPS[i] : '拿掉了：' + STEPS[i]);
      if (i === 3 && !on[3]) api.setHint('“重新画”被拿掉了：小球怪其实还在动，可是屏幕不再换新的一张，看起来就像停住了。');
      showSteps(true);
    }

    let lastKey = '';
    function showSteps(force) {
      const fast = fps > 12 && !paused;
      const lit = fast ? -1 : (cur + 3) % 4; // 刚刚做完的那一步
      const key = lit + '|' + fast + '|' + paused + '|' + on.join();
      if (!force && key === lastKey) return;
      lastKey = key;
      stepBtns.forEach((b, i) => {
        const glow = on[i] && (fast || i === lit);
        b.style.background = glow ? (fast ? 'color-mix(in srgb, var(--sun) 45%, var(--card))' : 'var(--sun)') : 'var(--card)';
        b.style.color = glow ? '#1b2440' : 'var(--ink)';
        b.style.textDecoration = on[i] ? 'none' : 'line-through';
        b.style.opacity = on[i] ? '1' : '0.45';
        b.style.transform = !fast && i === lit ? 'translateX(6px)' : 'none';
      });
      fastNote.textContent = paused ? '停住了。按“走一小步”，一件一件往下做。'
        : fast ? '转得太快啦，4 件事好像一起亮。把“一秒画几张”调到 5 以下，就能看清。' : '';
    }

    const rScore = api.readout('吃到的星星', 0);
    const fpsSl = api.slider({ label: '一秒画几张', min: 1, max: 60, value: fps, unit: ' 张', onInput: (x) => { fps = x; subTime = 0; showSteps(true); } });

    // 方向按钮（手机用）
    const pad = api.h('div', { class: 'seg' });
    [['←', 'left', '往左'], ['↑', 'up', '往上'], ['↓', 'down', '往下'], ['→', 'right', '往右']].forEach(([lab, k, name]) => {
      const b = api.h('button', { class: 'btn', type: 'button', style: { minWidth: '56px', fontSize: '22px', touchAction: 'none' }, 'aria-label': name }, lab);
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); held[k] = true; });
      const up = () => { held[k] = false; };
      b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
      pad.append(b);
    });
    api.controlBox.append(api.h('div', { class: 'ctl' }, api.h('span', { class: 'lab' }, '按住换方向'), pad));

    const pauseBtn = api.button('暂停在这一张', () => setPaused(!paused));
    api.button('走一小步', () => { if (!paused) setPaused(true); stepOnce(); showSteps(true); api.sound('step'); });
    api.button('重新开始', () => {
      Object.assign(ball, { x: 120, y: 100, vx: 160, vy: 120 });
      score = 0; frameNo = 0; film.length = 0; cur = 0; rScore.set(0); star = newStar();
      for (let i = 0; i < 4; i++) on[i] = true;
      flyAway = false; compare = 0;
      setPaused(false); draw();
    });
    function setPaused(p) {
      paused = p;
      pauseBtn.textContent = p ? '接着动' : '暂停在这一张';
      showSteps(true);
    }

    const keyMap = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
    api.on(window, 'keydown', (e) => {
      if (keyMap[e.key]) { held[keyMap[e.key]] = true; e.preventDefault(); }
      else if (e.key === ' ') {
        e.preventDefault();
        if (document.activeElement && document.activeElement.tagName === 'BUTTON') document.activeElement.blur();
        if (!e.repeat) setPaused(!paused);
      }
    });
    api.on(window, 'keyup', (e) => { if (keyMap[e.key]) held[keyMap[e.key]] = false; });
    // 点画布：小球怪朝点的地方转过去
    api.on(s.canvas, 'pointerdown', (e) => {
      const p = s.pos(e); if (p.y > WH) return;
      const a = Math.atan2(p.y - ball.y, p.x - ball.x);
      ball.vx = Math.cos(a) * SPEED; ball.vy = Math.sin(a) * SPEED; api.sound('pop');
    });

    // 第 2 题用：30 张和 60 张轮流换
    let compare = 0, compareT = 0;

    api.loop((dt) => {
      hitWall = Math.max(0, hitWall - dt);
      if (compare > 0) {
        compare -= dt; compareT -= dt;
        if (compare <= 0) fpsSl.set(60);
        else if (compareT <= 0) { compareT = 2.5; fpsSl.set(fps === 30 ? 60 : 30); }
      }
      if (!paused) {
        subTime += dt;
        const each = 1 / (fps * 4);
        let n = 0;
        while (subTime >= each && n < 40) { subTime -= each; stepOnce(); n++; }
        if (n >= 40) subTime = 0;
      }
      showSteps(false);
    });
    draw();
    showSteps(true);

    api.guesses([
      {
        q: '把“一秒画几张”调到 2 张，小球怪看起来会怎样？',
        options: ['一顿一顿的，一下跳一大格', '慢慢地滑，像慢动作', '和原来一样顺'], answer: 0,
        why: '一秒只画 2 张，两张中间小球怪已经挪了一大段，眼睛就看到它一下一下“跳格子”。它跑得并不慢，只是画得少了。看右边，4 件事一件一件地亮。',
        apply: () => { compare = 0; setPaused(false); fpsSl.set(2); },
      },
      {
        q: '一秒画 30 张和 60 张，差别大吗？（接下来会轮流换，看画面右上角的数）',
        options: ['差别很大', '只差一点点，很难看出来', '60 张反而更卡'], answer: 1,
        why: '一秒 30 张，眼睛已经觉得很顺了。再多画，只是更滑一点点。很多游戏就是一秒画 30 张或 60 张。',
        apply: () => { setPaused(false); fpsSl.set(30); compare = 10; compareT = 2.5; },
        delay: 2500,
      },
      {
        q: '4 件事里，是哪一件让小球怪“碰到墙就弹回来”？我们把它拿掉试试。',
        options: ['看按键', '挪位置', '检查撞没撞'], answer: 2,
        why: '“检查撞没撞”每一张都在问：碰到墙了吗？吃到星星了吗？把它拿掉，小球怪就穿墙飞走，也吃不到星星了。点右边这一步，把它装回去。',
        apply: () => { compare = 0; setPaused(false); fpsSl.set(30); toggleStep(2, false); },
        delay: 1800,
      },
    ]);

    api.say({
      left: '游戏循环',
      right: '游戏像翻书，一秒画很多张，每一张都要算一遍',
      example: '每一张都做 4 件事：看按键 → 挪位置 → 检查撞没撞 → 重新画，然后再来一遍。',
      prompt: '我的作品里，有没有一段“一直重复做”的程序？它每一圈都做了哪几件事？用小学生能听懂的话列出来，先不要改。',
    });
  },

  thumb(ctx, w, h, t) {
    for (let i = 3; i >= 0; i--) {
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1b2440'; ctx.lineWidth = 2.5;
      ctx.fillRect(70 + i * 8, 30 + i * 8, 150, 110); ctx.strokeRect(70 + i * 8, 30 + i * 8, 150, 110);
    }
    const f = Math.floor(t * 6);
    const x = 92 + Math.abs(((f * 9) % 220) - 110), y = 116 - Math.abs(Math.sin(f * 0.5)) * 60;
    ctx.fillStyle = '#ffd43b'; ctx.strokeStyle = '#1b2440'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '20px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('第 ' + (f % 1000) + ' 张', 160, 186); ctx.textAlign = 'left';
  },
});
