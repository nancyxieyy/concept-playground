/* 第 6 关：碰撞。电脑不看图片，只看两个框有没有叠在一起。 */
PG.register({
  id: 'hit',
  no: 6,
  title: '框叠上了吗',
  concept: '碰撞',
  kid: '电脑不看图片，只看两个框有没有叠在一起',
  level: 'K4–K5',
  color: 'bubble',
  play: '用手指或鼠标拖着小猫（也可以按方向键），躲开飞过来的刺球。打开“显示框”，看看电脑眼里的小猫是什么样子。',

  mount(api) {
    const W = 480, H = 320;
    const s = api.stage(W, H);
    const ctx = s.ctx;
    const font = (px) => px + 'px ' + getComputedStyle(document.body).fontFamily;

    // 图片的大小（画出来的样子）
    const CAT_W = 56, CAT_H = 54, CAT_R = 22; // 小猫身子大约是个圆
    const BALL_R = 15, BALL_W = 36;          // 刺球连刺一起 36 宽
    const cat = { x: 110, y: H / 2 };
    let balls = [], spawn = 0.6, showBox = false, boxPct = 100;
    let hits = 0, unfair = 0, dodged = 0;
    let flash = 0, flashText = '', flashBad = false, shake = 0, slip = 0;
    const keys = {};

    const rHits = api.readout('撞上了', 0);
    const rUnfair = api.readout('冤枉撞', 0);
    const rDodge = api.readout('躲过了', 0);
    const boxSw = api.choice({
      label: '显示框', value: false,
      options: [{ value: false, label: '不显示' }, { value: true, label: '显示' }],
      onChange: (v) => { showBox = v; },
    });
    const sizeSl = api.slider({
      label: '框的大小（和图比）', min: 60, max: 160, step: 10, value: boxPct, unit: '%',
      note: '100% 就是框刚好把图围起来。',
      onInput: (v) => { boxPct = v; },
    });
    api.button('重新数', resetCount);
    api.controlBox.append(api.h('p', { class: 'small' }, '“冤枉撞”：框叠上了，可是图其实没碰到，也算你撞上了。'));

    function resetCount() {
      hits = 0; unfair = 0; dodged = 0; balls = [];
      rHits.set(0); rUnfair.set(0); rDodge.set(0);
    }

    // 两个框：中心点 + 宽高
    function catBox() { const k = boxPct / 100; return { x: cat.x, y: cat.y, w: CAT_W * k, h: CAT_H * k }; }
    function ballBox(b) { const k = boxPct / 100; return { x: b.x, y: b.y, w: BALL_W * k, h: BALL_W * k }; }
    // 电脑的办法：两个方框叠没叠
    function overlap(a, b) { return Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2; }
    // 用眼睛看：图有没有真的碰到（小猫身子的圆 + 刺球的圆）
    function picsTouch(b) { return Math.hypot(cat.x - b.x, cat.y + 4 - b.y) < CAT_R + BALL_R + 2; }

    // 拖小猫：按下时记住手指和小猫差多少，手指不会挡住小猫
    let drag = null;
    api.on(s.canvas, 'pointerdown', (e) => {
      const p = s.pos(e); drag = { dx: cat.x - p.x, dy: cat.y - p.y };
      s.canvas.setPointerCapture(e.pointerId);
    });
    api.on(s.canvas, 'pointermove', (e) => {
      if (!drag) return;
      const p = s.pos(e); cat.x = p.x + drag.dx; cat.y = p.y + drag.dy; clampCat();
    });
    const endDrag = () => { drag = null; };
    api.on(s.canvas, 'pointerup', endDrag); api.on(s.canvas, 'pointercancel', endDrag);
    api.on(window, 'keydown', (e) => {
      if (e.key.startsWith('Arrow')) { keys[e.key] = true; e.preventDefault(); }
    });
    api.on(window, 'keyup', (e) => { keys[e.key] = false; });
    function clampCat() {
      cat.x = Math.max(CAT_W / 2, Math.min(W - CAT_W / 2, cat.x));
      cat.y = Math.max(CAT_H / 2 + 4, Math.min(H - CAT_H / 2, cat.y));
    }

    function drawCat(x, y, hit) {
      const ink = api.color('--ink');
      ctx.save(); ctx.translate(x, y);
      ctx.fillStyle = hit ? api.color('--tomato') : api.color('--sun');
      ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.lineJoin = 'round';
      // 耳朵
      ctx.beginPath(); ctx.moveTo(-19, -10); ctx.lineTo(-15, -27); ctx.lineTo(-4, -18); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(19, -10); ctx.lineTo(15, -27); ctx.lineTo(4, -18); ctx.closePath(); ctx.fill(); ctx.stroke();
      // 圆身子
      ctx.beginPath(); ctx.arc(0, 4, CAT_R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      // 眼睛、鼻子、胡子
      ctx.fillStyle = '#1b2440';
      ctx.beginPath(); ctx.arc(-8, 0, 3, 0, Math.PI * 2); ctx.arc(8, 0, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = api.color('--bubble'); ctx.beginPath(); ctx.arc(0, 7, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#1b2440'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-6, 9); ctx.lineTo(-18, 7); ctx.moveTo(-6, 11); ctx.lineTo(-18, 13);
      ctx.moveTo(6, 9); ctx.lineTo(18, 7); ctx.moveTo(6, 11); ctx.lineTo(18, 13); ctx.stroke();
      ctx.restore();
    }
    function drawBall(b) {
      const ink = api.color('--ink');
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r);
      ctx.fillStyle = api.color('--grape'); ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i * Math.PI) / 8, rr = i % 2 ? BALL_R : BALL_W / 2;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    function drawBox(bx, on) {
      ctx.save();
      ctx.setLineDash([6, 4]); ctx.lineWidth = 2.5;
      ctx.strokeStyle = on ? api.color('--tomato') : api.color('--sky');
      ctx.strokeRect(bx.x - bx.w / 2, bx.y - bx.h / 2, bx.w, bx.h);
      if (on) { ctx.globalAlpha = 0.18; ctx.fillStyle = api.color('--tomato'); ctx.fillRect(bx.x - bx.w / 2, bx.y - bx.h / 2, bx.w, bx.h); }
      ctx.restore();
    }

    api.loop((dt, t) => {
      // 小猫
      const sp = 260 * dt;
      if (keys.ArrowLeft) cat.x -= sp; if (keys.ArrowRight) cat.x += sp;
      if (keys.ArrowUp) cat.y -= sp; if (keys.ArrowDown) cat.y += sp;
      clampCat();
      // 刺球飞过来
      spawn -= dt;
      if (spawn <= 0) {
        spawn = 0.9 + Math.random() * 0.6;
        balls.push({ x: W + 24, y0: 30 + Math.random() * (H - 60), y: 0, sp: 110 + Math.random() * 80, wob: Math.random() < 0.5 ? 0 : 30, ph: Math.random() * 6, r: 0, was: false, hitDone: false });
      }
      const cb = catBox();
      let anyOver = false;
      for (const b of balls) {
        b.x -= b.sp * dt; b.r -= dt * 2;
        b.y = b.y0 + Math.sin(t * 2 + b.ph) * b.wob;
        const over = overlap(cb, ballBox(b));
        b.over = over; if (over) anyOver = true;
        if (over && !b.was && !b.hitDone) {
          b.hitDone = true; hits++; rHits.set(hits);
          const fair = picsTouch(b);
          if (!fair) { unfair++; rUnfair.set(unfair); }
          flash = 0.8; flashBad = !fair; shake = 0.3;
          flashText = fair ? '撞上了！' : '撞上了！可是图没碰到……';
          api.sound(fair ? 'buzz' : 'boing');
        } else if (!over && picsTouch(b) && !b.hitDone && !b.slipped) {
          b.slipped = true; slip = 0.8; // 图碰到了，框却没叠上
        }
        b.was = over;
        if (b.x < -30 && !b.gone) { b.gone = true; if (!b.hitDone) { dodged++; rDodge.set(dodged); } }
      }
      balls = balls.filter((b) => !b.gone);
      flash = Math.max(0, flash - dt); shake = Math.max(0, shake - dt); slip = Math.max(0, slip - dt);

      // 画
      const ink = api.color('--ink');
      s.clear();
      for (const b of balls) drawBall(b);
      const jx = shake > 0 ? Math.sin(t * 80) * 4 : 0;
      drawCat(cat.x + jx, cat.y, flash > 0);
      if (showBox) {
        drawBox(cb, anyOver);
        for (const b of balls) drawBox(ballBox(b), b.over);
      }
      ctx.fillStyle = ink; ctx.font = font(15);
      ctx.fillText('框的大小 ' + boxPct + '%' + (showBox ? '   虚线框 = 电脑看到的样子' : ''), 12, 22);
      if (flash > 0) {
        ctx.save(); ctx.globalAlpha = Math.min(1, flash * 2);
        ctx.font = font(30); ctx.textAlign = 'center';
        ctx.lineWidth = 5; ctx.strokeStyle = api.color('--stage'); ctx.strokeText(flashText, W / 2, H - 28);
        ctx.fillStyle = flashBad ? api.color('--grape') : api.color('--tomato');
        ctx.fillText(flashText, W / 2, H - 28);
        ctx.restore();
      } else if (slip > 0) {
        ctx.save(); ctx.globalAlpha = Math.min(1, slip * 2); ctx.font = font(22); ctx.textAlign = 'center';
        ctx.fillStyle = api.color('--grass'); ctx.fillText('图碰到了，框没叠上，溜过去了！', W / 2, H - 28);
        ctx.restore();
      }
    });

    api.guesses([
      {
        q: '打开“显示框”。电脑眼里的小猫，是什么形状？',
        options: ['和小猫一模一样', '方方的框', '圆圆的圈'], answer: 1,
        why: '电脑用的是方框，因为比两个方框有没有叠在一起，又简单又快。小猫耳朵旁边、身子四个角上的空地方，也在框里面。',
        apply: () => { boxSw.set(true); sizeSl.set(100); },
      },
      {
        q: '把框调到 160%，比小猫大一大圈。会不会“明明没碰到也算撞上”？',
        options: ['会，没碰到也算撞上', '不会，电脑看得出没碰到'], answer: 0,
        why: '电脑不看图片，只看框。框比小猫大，框先叠上了，就算撞上——“冤枉撞”会一下子变多。玩一会儿看看右边的数。',
        apply: () => { boxSw.set(true); sizeSl.set(160); resetCount(); },
      },
      {
        q: '把框调到 60%，比小猫小。游戏会变容易还是变难？',
        options: ['变容易了', '变难了', '一样'], answer: 0,
        why: '框小了，要贴得很近才算撞上，有时候图都叠上了也不算，刺球就“溜过去了”。框太大不公平，太小也奇怪，做游戏要调到刚刚好。',
        apply: () => { boxSw.set(true); sizeSl.set(60); resetCount(); },
      },
    ]);

    api.say({
      left: '碰撞',
      right: '电脑不看图片，只看两个框有没有叠在一起',
      example: '小猫的框和刺球的框一叠上，电脑就说“撞上了”。框太大，没碰到也会输。',
      prompt: '我的作品里，判断“撞到了”的是哪几行？请帮我把每个角色的框画出来，让我看看框是不是比角色大。先不要改别的。',
    });
  },

  thumb(ctx, w, h, t) {
    const x = 80 + Math.sin(t * 1.2) * 30, bx = 300 - ((t * 70) % 260);
    const over = Math.abs(x - bx) < 60;
    // 两个虚线框
    ctx.setLineDash([7, 5]); ctx.lineWidth = 3;
    ctx.strokeStyle = over ? '#1b2440' : '#fff';
    ctx.strokeRect(x - 34, 70, 68, 68); ctx.strokeRect(bx - 26, 78, 52, 52);
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffd43b'; ctx.strokeStyle = '#1b2440'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - 20, 92); ctx.lineTo(x - 15, 74); ctx.lineTo(x - 4, 84); ctx.lineTo(x + 4, 84); ctx.lineTo(x + 15, 74); ctx.lineTo(x + 20, 92);
    ctx.arc(x, 108, 24, -0.4, Math.PI + 0.4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx, 104, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (over) { ctx.fillStyle = '#fff'; ctx.font = '26px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('撞上了！', 160, 178); ctx.textAlign = 'left'; }
  },
});
