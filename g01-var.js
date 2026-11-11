/* 第 1 关：变量。接星星，看“分数”“速度”“命”这几个盒子里的数怎么变。 */
PG.register({
  id: 'var',
  no: 1,
  title: '会变的数',
  concept: '变量',
  kid: '一个有名字的盒子，里面的数会变',
  level: 'K3–K4',
  color: 'tomato',
  play: '用键盘 ← → 或者拖动篮子，接住掉下来的星星。一边玩一边看右边的小盒子：哪个数在变？',

  mount(api) {
    const W = 480, H = 320;
    const s = api.stage(W, H);
    const ctx = s.ctx;

    // 这几个就是“变量”：有名字，里面的数会变
    const v = { score: 0, speed: 3, add: 1, lives: 3 };
    let startLives = 3;
    const basket = { x: W / 2, w: 86 };
    let stars = [], spawn = 0, over = false, flash = 0;
    const keys = {};

    const rScore = api.readout('分数', 0);
    const rSpeed = api.readout('速度', v.speed);
    const rLives = api.readout('命', v.lives);
    const speed = api.slider({ label: '速度', min: 1, max: 10, value: v.speed, onInput: (x) => { v.speed = x; rSpeed.set(x); } });
    const add = api.slider({ label: '接一颗星加几分', min: 1, max: 10, value: v.add, onInput: (x) => { v.add = x; } });
    const lives = api.slider({ label: '一开始有几条命', min: 1, max: 5, value: startLives, onInput: (x) => { startLives = x; } });
    api.button('重新开始', restart);

    function restart() {
      v.score = 0; v.lives = startLives; stars = []; over = false;
      rScore.set(0); rLives.set(v.lives);
      const o = api.stageBox.querySelector('.overlay'); if (o) o.remove();
    }

    api.on(window, 'keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { keys[e.key] = true; e.preventDefault(); }
    });
    api.on(window, 'keyup', (e) => { keys[e.key] = false; });
    const drag = (e) => { basket.x = Math.max(basket.w / 2, Math.min(W - basket.w / 2, s.pos(e).x)); };
    api.on(s.canvas, 'pointerdown', (e) => { drag(e); s.canvas.setPointerCapture(e.pointerId); });
    api.on(s.canvas, 'pointermove', (e) => { if (e.buttons || e.pointerType !== 'mouse') drag(e); });

    api.loop((dt, t) => {
      const ink = api.color('--ink'), sun = api.color('--sun'), tomato = api.color('--tomato');
      if (!over) {
        if (keys.ArrowLeft) basket.x -= 320 * dt;
        if (keys.ArrowRight) basket.x += 320 * dt;
        basket.x = Math.max(basket.w / 2, Math.min(W - basket.w / 2, basket.x));
        spawn -= dt;
        if (spawn <= 0) { stars.push({ x: 24 + Math.random() * (W - 48), y: -16, r: 0 }); spawn = 1.1; }
        for (const st of stars) { st.y += v.speed * 38 * dt; st.r += dt * 2; }
        for (const st of stars) {
          if (st.y > H - 46 && st.y < H - 14 && Math.abs(st.x - basket.x) < basket.w / 2 + 6 && !st.gone) {
            st.gone = true; v.score += v.add; rScore.set(v.score); api.sound('ding'); flash = 0.3;
          } else if (st.y > H + 10 && !st.gone) {
            st.gone = true; v.lives -= 1; rLives.set(v.lives); api.sound('buzz');
            if (v.lives <= 0) { over = true; api.sound('lose'); api.overlay('游戏结束！“命”变成 0 了。点这里再来一局', restart); }
          }
        }
        stars = stars.filter((st) => !st.gone);
      }
      flash = Math.max(0, flash - dt);

      s.clear();
      // 地面
      ctx.fillStyle = api.color('--line'); ctx.fillRect(0, H - 10, W, 10);
      for (const st of stars) {
        ctx.save(); ctx.translate(st.x, st.y); ctx.rotate(st.r);
        PG.drawStar(ctx, 0, 0, 14, sun, ink); ctx.restore();
      }
      // 篮子
      ctx.fillStyle = flash > 0 ? sun : tomato; ctx.strokeStyle = ink; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(basket.x - basket.w / 2, H - 46); ctx.lineTo(basket.x + basket.w / 2, H - 46);
      ctx.lineTo(basket.x + basket.w / 2 - 12, H - 14); ctx.lineTo(basket.x - basket.w / 2 + 12, H - 14); ctx.closePath();
      ctx.fill(); ctx.stroke();
      // 角上写着变量
      ctx.fillStyle = ink; ctx.font = '16px ' + getComputedStyle(document.body).fontFamily;
      ctx.fillText('分数 = ' + v.score + '    速度 = ' + v.speed + '    命 = ' + v.lives, 12, 24);
    });

    api.guesses([
      {
        q: '把“速度”从 3 改成 9，星星会怎样？',
        options: ['掉得更快', '掉得更慢', '没变化'], answer: 0,
        why: '“速度”这个盒子里的数变大了，星星每一下就往下挪得更多。',
        apply: () => speed.set(9),
      },
      {
        q: '把“接一颗星加几分”改成 10。现在分数是 2，再接一颗，分数会变成多少？',
        options: ['3', '10', '12'], answer: 2,
        why: '程序做的是：分数 = 原来的分数 + 10。所以 2 变成 12，不是直接变成 10。',
        apply: () => { speed.set(3); add.set(10); restart(); v.score = 2; rScore.set(2); },
      },
      {
        q: '“命”变成 0 的时候会发生什么？',
        options: ['游戏结束', '命变成 -1，接着玩', '星星停在半空'], answer: 0,
        why: '程序一直在看“命”这个盒子，一看到 0，就切到“游戏结束”。漏掉一颗试试看。',
        apply: () => { add.set(1); lives.set(1); restart(); },
      },
    ]);

    api.say({
      left: '变量',
      right: '一个有名字的盒子，里面的数会变',
      example: '分数、速度、命，都是变量。它们有名字，玩的时候里面的数一直在变。',
      prompt: '我的作品里，管着“分数”的是哪一行？用一句小学生能听懂的话告诉我它在做什么，先不要改。',
    });
  },

  // 首页的小动画
  thumb(ctx, w, h, t) {
    const ink = PG.color('--ink');
    for (let i = 0; i < 4; i++) {
      const x = 50 + i * 70, y = ((t * 50 + i * 47) % 150) + 10;
      ctx.save(); ctx.translate(x, y); ctx.rotate(t + i);
      PG.drawStar(ctx, 0, 0, 13, '#ffd43b', ink); ctx.restore();
    }
    ctx.fillStyle = '#fff'; ctx.strokeStyle = ink; ctx.lineWidth = 3;
    PG.roundRect(ctx, 110, 140, 100, 44, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1b2440'; ctx.font = '22px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('分数 ' + (Math.floor(t * 1.3) % 100), 160, 170); ctx.textAlign = 'left';
  },
});
