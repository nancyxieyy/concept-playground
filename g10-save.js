/* 第 10 关：保存数据。最高分记在哪？关掉就忘、存进抽屉、存到网上。全部在页面里假装，不用真的浏览器存储。 */
PG.register({
  id: 'save',
  no: 10,
  title: '关了还记得吗',
  concept: '保存数据',
  kid: '存在这台电脑里，换一台就没有；要大家都能看到，就得存到网上',
  level: 'K6',
  color: 'bubble',
  play: '按「开始一局」，5 秒里拼命点画面（或按空格），玩出一个最高分。再试试「关掉再打开」「存到这台电脑」「换到手机 B 打开」「存到网上」，看最高分去了哪儿。',

  mount(api) {
    const W = 480, H = 320;
    const s = api.stage(W, H);
    const ctx = s.ctx;
    const fam = () => getComputedStyle(document.body).fontFamily;

    // 这些全是“假装的”：只活在这个页面里
    let dev = 'A';          // 正在用哪台：A 电脑，B 手机
    let appOn = true;       // 程序开着吗
    let best = 0;           // 正在跑的程序“脑子里”记着的最高分
    let last = null;        // 上一局的分数
    const drawers = { A: null, B: null };
    let cloud = null;
    let round = null;       // {t, dur, n}
    let booting = 0;
    let flights = [];       // 飞来飞去的最高分
    let floats = [];        // +1
    let timers = [];
    let msg = '', msgT = 0;
    const later = (sec, fn) => timers.push({ s: sec, fn });
    const say = (t) => { msg = t; msgT = 3.2; };

    const POS = {
      screen: { A: { x: 115, y: 165 }, B: { x: 370, y: 170 } },
      drawer: { A: { x: 115, y: 277 }, B: { x: 370, y: 277 } },
      cloud: { x: 240, y: 60 },
    };
    const devName = (d) => (d === 'A' ? '电脑 A' : '手机 B');
    const busy = () => !!round || booting > 0 || flights.length > 0 || timers.length > 0;

    // ---------- 控件 ----------
    const rBest = api.readout('正在玩的最高分', 0);
    const rA = api.readout('电脑 A 抽屉', '空');
    const rB = api.readout('手机 B 抽屉', '空');
    const rC = api.readout('网上', '空');
    const playBtn = api.button('开始一局（5 秒）', () => startRound(), 'primary');
    playBtn.style.fontSize = '20px';
    const row1 = api.h('div', { class: 'seg' });
    const row2 = api.h('div', { class: 'seg' });
    api.controlBox.append(row1, row2);
    api.button('关掉再打开', () => { if (!busy()) restartApp(); }, '', row1);
    const switchBtn = api.button('换到手机 B 打开', () => { if (!busy()) switchDev(); }, '', row1);
    const localBtn = api.button('存到这台电脑', () => { if (!busy()) saveLocal(); }, '', row2);
    api.button('存到网上', () => { if (!busy()) saveCloud(); }, '', row2);
    api.controlBox.append(api.h('p', { class: 'small' },
      '真要存到网上，会用到账号，还要想好隐私（不放真名、照片）。这一步请找老师或总部帮忙。'));
    api.button('全部清空，从头来', () => reset());

    function refresh() {
      rBest.set(appOn ? best : '关着');
      rA.set(drawers.A == null ? '空' : drawers.A);
      rB.set(drawers.B == null ? '空' : drawers.B);
      rC.set(cloud == null ? '空' : cloud);
      switchBtn.textContent = dev === 'A' ? '换到手机 B 打开' : '换到电脑 A 打开';
      localBtn.textContent = dev === 'A' ? '存到这台电脑' : '存到这台手机';
    }
    function fly(from, to, value, done) {
      flights.push({ from, to, value, t: 0, dur: 0.9, done });
      api.sound('boing');
    }

    function startRound() {
      if (!appOn || busy()) return;
      round = { t: 0, dur: 5, n: 0 };
      say('点点点！5 秒里点得越多越好');
      api.sound('step');
    }
    function tap() {
      if (round) {
        round.n++;
        const p = POS.screen[dev];
        floats.push({ x: p.x + (Math.random() - 0.5) * 30, y: p.y - 10, t: 0 });
        api.sound('pop');
      } else startRound();
    }
    function endRound() {
      const n = round.n; round = null; last = n;
      if (n > best) { best = n; say('新纪录！最高分变成 ' + n + '（只记在程序脑子里）'); api.sound('win'); }
      else { say('这一局 ' + n + '，没超过最高分 ' + best); api.sound('ding'); }
      refresh();
    }
    function closeApp() {
      appOn = false; round = null; best = 0; last = null;
      say(devName(dev) + '上的程序关掉了，脑子里记的全忘了');
      api.sound('lose');
      refresh();
    }
    function openApp() {
      appOn = true; best = 0; last = null; booting = 0.7;
      api.sound('step');
      refresh();
    }
    function load() {
      const a = drawers[dev], c = cloud;
      if (a == null && c == null) { say('打开了。什么都没存，最高分是 0'); api.sound('boing'); refresh(); return; }
      const fromCloud = c != null && (a == null || c >= a);
      const v = fromCloud ? c : a;
      fly(fromCloud ? POS.cloud : POS.drawer[dev], POS.screen[dev], v, () => {
        best = v; refresh();
        say('从' + (fromCloud ? '网上' : '这台的抽屉里') + '拿回了最高分 ' + v);
        api.sound('ding');
      });
    }
    function restartApp() {
      closeApp();
      later(0.9, openApp);
    }
    function switchDev() {
      closeApp();
      later(0.7, () => { dev = dev === 'A' ? 'B' : 'A'; openApp(); say('换到' + devName(dev) + '，打开同一个游戏'); });
    }
    function saveLocal() {
      if (!appOn) return;
      const d = dev, v = best;
      fly(POS.screen[d], POS.drawer[d], v, () => {
        drawers[d] = v; refresh(); say('最高分 ' + v + ' 放进了' + devName(d) + '的抽屉'); api.sound('ding');
      });
    }
    function saveCloud() {
      if (!appOn) return;
      const v = best;
      fly(POS.screen[dev], POS.cloud, v, () => {
        cloud = v; refresh(); say('最高分 ' + v + ' 存到网上了，哪台都能拿到'); api.sound('ding');
      });
    }
    function reset() {
      dev = 'A'; appOn = true; best = 0; last = null; drawers.A = null; drawers.B = null; cloud = null;
      round = null; booting = 0; flights = []; floats = []; timers = [];
      say('从头来：在电脑 A 上玩');
      refresh();
    }
    refresh();

    api.on(s.canvas, 'pointerdown', (e) => { e.preventDefault(); if (appOn && booting <= 0 && !flights.length && !timers.length) tap(); });
    api.on(window, 'keydown', (e) => {
      if (e.key === ' ' || e.code === 'Space') {
        if (e.target && /INPUT|TEXTAREA|BUTTON/.test(e.target.tagName)) return;
        e.preventDefault();
        if (appOn && booting <= 0 && !flights.length && !timers.length) tap();
      }
    });

    // ---------- 画 ----------
    function badge(x, y, v, c, scale) {
      ctx.save(); ctx.translate(x, y); ctx.scale(scale || 1, scale || 1);
      const txt = '★ ' + v;
      ctx.font = 'bold 16px ' + c.f;
      const w = ctx.measureText(txt).width + 18;
      ctx.fillStyle = c.sun; ctx.strokeStyle = c.ink; ctx.lineWidth = 2.5;
      PG.roundRect(ctx, -w / 2, -14, w, 28, 14); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1b2440'; ctx.textAlign = 'center'; ctx.fillText(txt, 0, 6); ctx.textAlign = 'left';
      ctx.restore();
    }
    function drawer(d, c) {
      const p = POS.drawer[d], x = p.x - 70, y = 248;
      ctx.fillStyle = c.card; ctx.strokeStyle = c.ink; ctx.lineWidth = 2.5;
      PG.roundRect(ctx, x, y, 140, 44, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c.ink2; ctx.font = '12px ' + c.f; ctx.textAlign = 'center';
      ctx.fillText(devName(d) + ' 的抽屉', p.x, y + 15);
      if (drawers[d] == null) { ctx.font = '14px ' + c.f; ctx.fillText('空的', p.x, y + 35); }
      ctx.textAlign = 'left';
      if (drawers[d] != null) badge(p.x, y + 29, drawers[d], c, 0.8);
    }
    function screenContent(d, x, y, w, hh, c, narrow) {
      const on = appOn && dev === d;
      ctx.fillStyle = on ? c.card : '#1b2440';
      PG.roundRect(ctx, x, y, w, hh, 6); ctx.fill();
      const cx = x + w / 2;
      ctx.textAlign = 'center';
      if (!on) {
        ctx.fillStyle = '#7d8bb0'; ctx.font = '13px ' + c.f;
        ctx.fillText(dev === d && !appOn ? '关掉了' : '没在用', cx, y + hh / 2 + 4);
      } else if (booting > 0) {
        ctx.fillStyle = c.ink2; ctx.font = '14px ' + c.f; ctx.fillText('打开中…', cx, y + hh / 2 + 4);
      } else if (round) {
        ctx.fillStyle = c.ink; ctx.font = (narrow ? 13 : 15) + 'px ' + c.f; ctx.fillText('点点点！', cx, y + 20);
        ctx.font = 'bold ' + (narrow ? 34 : 40) + 'px ' + c.f; ctx.fillText(round.n, cx, y + hh / 2 + 16);
        const left = Math.max(0, 1 - round.t / round.dur);
        ctx.fillStyle = c.bubble; ctx.fillRect(x + 6, y + hh - 10, (w - 12) * left, 5);
      } else {
        ctx.fillStyle = c.ink2; ctx.font = (narrow ? 12 : 14) + 'px ' + c.f; ctx.fillText('最高分', cx, y + 20);
        ctx.fillStyle = c.ink; ctx.font = 'bold ' + (narrow ? 32 : 38) + 'px ' + c.f; ctx.fillText(best, cx, y + hh / 2 + 14);
        ctx.fillStyle = c.ink2; ctx.font = (narrow ? 11 : 12) + 'px ' + c.f;
        ctx.fillText(last == null ? '点一下开始' : '这一局 ' + last, cx, y + hh - 8);
      }
      ctx.textAlign = 'left';
    }
    function drawCloud(c) {
      const { x, y } = POS.cloud;
      ctx.fillStyle = c.card; ctx.strokeStyle = c.ink; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x - 44, y + 6, 24, Math.PI * 0.5, Math.PI * 1.5);
      ctx.arc(x - 16, y - 16, 28, Math.PI * 1.05, Math.PI * 1.9);
      ctx.arc(x + 22, y - 12, 26, Math.PI * 1.2, Math.PI * 1.95);
      ctx.arc(x + 48, y + 8, 22, Math.PI * 1.5, Math.PI * 0.5);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c.ink2; ctx.font = '13px ' + c.f; ctx.textAlign = 'center';
      ctx.fillText('网上', x, y - 14);
      if (cloud == null) { ctx.font = '14px ' + c.f; ctx.fillText('空的', x, y + 14); }
      ctx.textAlign = 'left';
      if (cloud != null) badge(x, y + 10, cloud, c, 0.85);
    }

    api.loop((dt, t) => {
      // 推进
      for (const tm of timers) { tm.s -= dt; if (tm.s <= 0 && !tm.done) { tm.done = true; tm.fn(); } }
      timers = timers.filter((tm) => !tm.done);
      if (booting > 0) { booting -= dt; if (booting <= 0) { booting = 0; load(); } }
      if (round) { round.t += dt; if (round.t >= round.dur) endRound(); }
      for (const f of flights) { f.t += dt; if (f.t >= f.dur && !f.fin) { f.fin = true; f.done && f.done(); } }
      flights = flights.filter((f) => !f.fin);
      for (const f of floats) f.t += dt;
      floats = floats.filter((f) => f.t < 0.7);
      msgT = Math.max(0, msgT - dt);

      const c = {
        ink: api.color('--ink'), card: api.color('--card'), line: api.color('--line'), sun: api.color('--sun'),
        bubble: api.color('--bubble'), ink2: api.color('--ink-2'), f: fam(),
      };
      s.clear();

      // 网线：云和两台机器
      ctx.setLineDash([5, 6]); ctx.lineWidth = 2;
      ctx.strokeStyle = cloud != null ? c.bubble : c.line;
      ctx.beginPath(); ctx.moveTo(196, 74); ctx.lineTo(150, 108); ctx.moveTo(286, 74); ctx.lineTo(336, 100); ctx.stroke();
      ctx.setLineDash([]);
      drawCloud(c);

      // 电脑 A
      const onA = dev === 'A';
      ctx.fillStyle = c.ink; ctx.font = 'bold 15px ' + c.f; ctx.textAlign = 'center';
      ctx.fillText('电脑 A' + (onA ? '（正在用）' : ''), 115, 104); ctx.textAlign = 'left';
      ctx.fillStyle = c.card; ctx.strokeStyle = onA ? c.bubble : c.ink; ctx.lineWidth = onA ? 4 : 2.5;
      PG.roundRect(ctx, 30, 110, 170, 112, 10); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = c.ink; ctx.lineWidth = 2.5; ctx.fillStyle = c.card;
      ctx.fillRect(106, 222, 18, 14); ctx.strokeRect(106, 222, 18, 14);
      PG.roundRect(ctx, 80, 236, 70, 8, 4); ctx.fill(); ctx.stroke();
      screenContent('A', 40, 120, 150, 92, c, false);

      // 手机 B
      const onB = dev === 'B';
      ctx.fillStyle = c.ink; ctx.font = 'bold 15px ' + c.f; ctx.textAlign = 'center';
      ctx.fillText('手机 B' + (onB ? '（正在用）' : ''), 370, 96); ctx.textAlign = 'left';
      ctx.fillStyle = c.card; ctx.strokeStyle = onB ? c.bubble : c.ink; ctx.lineWidth = onB ? 4 : 2.5;
      PG.roundRect(ctx, 330, 102, 80, 142, 14); ctx.fill(); ctx.stroke();
      screenContent('B', 337, 116, 66, 116, c, true);
      ctx.fillStyle = c.ink; ctx.beginPath(); ctx.arc(370, 238, 3, 0, Math.PI * 2); ctx.fill();

      drawer('A', c); drawer('B', c);

      // +1
      for (const f of floats) {
        ctx.globalAlpha = 1 - f.t / 0.7;
        ctx.fillStyle = c.bubble; ctx.font = 'bold 18px ' + c.f; ctx.fillText('+1', f.x, f.y - f.t * 50);
        ctx.globalAlpha = 1;
      }
      // 飞着的最高分
      for (const f of flights) {
        const p = Math.min(1, f.t / f.dur), e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        const x = f.from.x + (f.to.x - f.from.x) * e;
        const y = f.from.y + (f.to.y - f.from.y) * e - Math.sin(Math.PI * p) * 40;
        badge(x, y, f.value, c, 1.1);
      }
      // 说明
      if (msgT > 0 && msg) {
        ctx.globalAlpha = Math.min(1, msgT * 2);
        ctx.font = 'bold 14px ' + c.f;
        const w = Math.min(W - 12, ctx.measureText(msg).width + 20);
        ctx.fillStyle = c.card; ctx.strokeStyle = c.ink; ctx.lineWidth = 2;
        PG.roundRect(ctx, (W - w) / 2, H - 28 + 2, w, 24, 10);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = c.ink; ctx.textAlign = 'center'; ctx.fillText(msg, W / 2, H - 9); ctx.textAlign = 'left';
        ctx.globalAlpha = 1;
      }
    });

    // 题目里先“假装玩过”，有个最高分 12
    function played() { reset(); best = 12; last = 12; refresh(); say('玩出了最高分 12'); }

    api.guesses([
      {
        q: '玩出最高分 12，什么都没存，就“关掉再打开”。最高分还在吗？',
        options: ['还在，是 12', '没了，变回 0'], answer: 1,
        why: '最高分只记在正在跑的程序“脑子”里。一关掉就全忘了。想留下来，得先存起来。',
        delay: 3000,
        apply: () => { played(); later(0.8, restartApp); },
      },
      {
        q: '把最高分 12 存进电脑 A，再换到手机 B 打开。手机上能看到 12 吗？',
        options: ['能看到 12', '看不到，手机上是 0'], answer: 1,
        why: '存在电脑 A 的抽屉里，就只在电脑 A 里。手机 B 有自己的抽屉，是空的。',
        delay: 4200,
        apply: () => { played(); later(0.4, saveLocal); later(1.6, switchDev); },
      },
      {
        q: '想让同学在他们自己的手机上，也看到你的最高分（排行榜）。要存在哪？',
        options: ['存在自己电脑里', '存到网上', '不用存，大家自动能看到'], answer: 1,
        why: '存到网上，哪台电脑、哪部手机都能拿到。不过存到网上要用账号，还要想好隐私（别放真名和照片）。真要做，先找老师或总部帮忙。',
        delay: 4400,
        apply: () => { played(); later(0.4, saveCloud); later(1.6, switchDev); },
      },
    ]);

    api.say({
      left: '保存数据',
      right: '存在这台电脑里，换一台就没有；要大家都能看到，就得存到网上',
      example: '最高分存在这台电脑的浏览器里，关掉再打开还在；换一部手机就没有了。排行榜要大家都看到，就得存到网上。',
      prompt: '我的作品里，最高分（或者清单、记录）存在哪里？关掉网页再打开它还在吗？换一台电脑呢？用小学生能听懂的话告诉我，先不要改。',
    });
  },

  thumb(ctx, w, h, t) {
    const ink = '#1b2440';
    ctx.fillStyle = '#fff'; ctx.strokeStyle = ink; ctx.lineWidth = 3;
    // 云
    ctx.beginPath(); ctx.arc(140, 50, 20, Math.PI * 0.5, Math.PI * 1.5); ctx.arc(165, 34, 24, Math.PI, Math.PI * 1.9);
    ctx.arc(192, 50, 20, Math.PI * 1.5, Math.PI * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    // 电脑
    PG.roundRect(ctx, 40, 100, 100, 66, 8); ctx.fill(); ctx.stroke();
    ctx.fillRect(82, 166, 16, 12); ctx.strokeRect(82, 166, 16, 12);
    // 手机
    PG.roundRect(ctx, 230, 92, 50, 86, 10); ctx.fill(); ctx.stroke();
    // 最高分在电脑和云、云和手机之间飞
    const p = (t * 0.45) % 1;
    let x, y;
    if (p < 0.5) { const q = p / 0.5; x = 90 + (165 - 90) * q; y = 130 + (55 - 130) * q; }
    else { const q = (p - 0.5) / 0.5; x = 165 + (255 - 165) * q; y = 55 + (135 - 55) * q; }
    ctx.fillStyle = '#ffd43b'; PG.roundRect(ctx, x - 26, y - 13, 52, 26, 13); ctx.fill(); ctx.stroke();
    ctx.fillStyle = ink; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('★ 12', x, y + 6); ctx.textAlign = 'left';
  },
});
