/* 第 2 关：事件。小怪兽一直在等，规则表里写着“当……就……”，你做了那件事，它才动。 */
PG.register({
  id: 'event',
  no: 2,
  title: '按下去会怎样',
  concept: '事件',
  kid: '程序一直在等，等你做了什么，它才做那件事',
  level: 'K3–K4',
  color: 'sky',
  play: '按键盘 ← → ↑ 空格，或者点一点小怪兽（手机上按右边的大按钮）。看看规则表：哪条规则让它动了？再自己加一条新规则试试。',

  mount(api) {
    const W = 480, H = 320, GROUND = H - 44;
    const s = api.stage(W, H);
    const ctx = s.ctx;
    const font = () => getComputedStyle(document.body).fontFamily;
    let alive = true;
    api.onCleanup(() => { alive = false; });
    const later = (fn, ms) => setTimeout(() => { if (alive) fn(); }, ms);

    // ---------- 能“等”的事，和能“做”的事 ----------
    const WHEN = {
      right: '按 → 键', left: '按 ← 键', up: '按 ↑ 键', space: '按空格', tap: '点它', tick3: '每过 3 秒',
    };
    const WHEN_PAST = {
      right: '按了 →', left: '按了 ←', up: '按了 ↑', space: '按了空格', tap: '点了它', tick3: '过了 3 秒',
    };
    const DO = {
      moveR: '往右走', moveL: '往左走', jump: '跳一下', color: '变颜色', sound: '放音效', spin: '转一圈', hello: '说“你好”',
    };
    const DO_PAST = {
      moveR: '往右走了', moveL: '往左走了', jump: '跳了一下', color: '变了颜色', sound: '放了音效', spin: '转了一圈', hello: '说了“你好”',
    };
    const START_RULES = [['right', 'moveR'], ['left', 'moveL'], ['tap', 'jump']];
    let rules = START_RULES.map(([w, d]) => ({ when: w, then: d }));

    // ---------- 小怪兽 ----------
    const mon = { x: W / 2, tx: W / 2, jump: 0, spin: 0, colorI: 0, hello: 0, notes: [] };
    const COLORS = ['--sky', '--tomato', '--grass', '--grape', '--bubble', '--sun'];
    let lastEvent = -99, heard = '', heardOk = true, clock = 0, now = 0;

    const ACT = {
      moveR() { mon.tx = Math.min(W - 50, mon.tx + 60); api.sound('step'); },
      moveL() { mon.tx = Math.max(50, mon.tx - 60); api.sound('step'); },
      jump() { mon.jump = 0.0001; api.sound('boing'); },
      color() { mon.colorI = (mon.colorI + 1) % COLORS.length; api.sound('pop'); },
      sound() {
        api.sound('ding');
        for (let i = 0; i < 3; i++) mon.notes.push({ x: mon.x + (i - 1) * 18, y: GROUND - 80, life: 1.2 + i * 0.15, dx: (i - 1) * 16 });
      },
      spin() { mon.spin = 0.0001; api.sound('tick'); },
      hello() { mon.hello = 1.6; api.sound('pop'); },
    };

    // 事件发生了：去规则表里找“当这件事”的规则，找到几条就做几件事
    function fire(ev) {
      const hit = rules.filter((r) => r.when === ev);
      lastEvent = now; heard = WHEN_PAST[ev];
      heardOk = hit.length > 0;
      if (!hit.length) {
        log(WHEN_PAST[ev] + ' → 规则表里没有它，什么也没做', true);
        return;
      }
      hit.forEach((r) => { ACT[r.then](); flashRule(r); });
      log(WHEN_PAST[ev] + ' → ' + hit.map((r) => DO_PAST[r.then]).join('，还'));
    }

    // ---------- 右边：大按钮 ----------
    const h = api.h;
    const keyRow = h('div', { class: 'seg', role: 'group', 'aria-label': '按键' });
    [['left', '←'], ['up', '↑'], ['right', '→'], ['space', '空格']].forEach(([ev, label]) => {
      const b = h('button', { class: 'btn', type: 'button', style: { minWidth: '58px', fontSize: '20px' } }, label);
      b.addEventListener('click', () => fire(ev));
      keyRow.append(b);
    });
    api.controlBox.append(h('div', { class: 'ctl' }, h('span', { class: 'lab' }, '手机上按这里（和键盘一样）'), keyRow));

    // ---------- 规则表 ----------
    const ruleList = h('div', { style: { display: 'grid', gap: '6px' } });
    const ruleBox = h('div', { class: 'ctl' },
      h('span', { class: 'lab' }, h('span', null, '规则表', h('span', { class: 'grown small' }, '（事件 → 要做的事）'))),
      ruleList);
    api.controlBox.append(ruleBox);
    const ruleEls = new Map();

    function drawRules() {
      ruleList.textContent = ''; ruleEls.clear();
      if (!rules.length) ruleList.append(h('p', { class: 'small' }, '一条规则也没有。小怪兽会一直等，可是什么也不会做。'));
      rules.forEach((r) => {
        const del = h('button', { class: 'btn', type: 'button', 'aria-label': '删掉这条规则', style: { padding: '2px 10px', fontSize: '15px', boxShadow: 'none' } }, '删');
        del.addEventListener('click', () => { rules = rules.filter((x) => x !== r); api.sound('tick'); drawRules(); });
        const row = h('div', {
          style: {
            display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', border: '2px solid var(--ink)',
            borderRadius: '10px', background: 'var(--card)', fontSize: '16px',
          },
        },
        h('span', { style: { flex: '1' } }, '当 ', h('b', null, WHEN[r.when]), ' → 就 ', h('b', null, DO[r.then])), del);
        ruleEls.set(r, row);
        ruleList.append(row);
      });
    }
    function flashRule(r) {
      const el = ruleEls.get(r);
      if (el && el.animate) el.animate([{ background: 'var(--sun)', transform: 'scale(1.04)' }, { background: 'var(--card)', transform: 'scale(1)' }], 700);
    }
    function addRule(when, then, quiet) {
      const old = rules.find((r) => r.when === when && r.then === then);
      if (old) { if (!quiet) api.toast('这条规则已经有了'); flashRule(old); return old; }
      if (rules.length >= 8) { api.toast('规则表写满啦，先删掉一条'); return null; }
      const r = { when, then };
      rules.push(r);
      drawRules();
      flashRule(r);
      if (!quiet) api.sound('ding');
      return r;
    }
    drawRules();

    // ---------- 自己加规则 ----------
    const builder = h('div', { style: { display: 'grid', gap: '10px', padding: '12px', border: '2.5px dashed var(--ink)', borderRadius: '12px' } },
      h('b', null, '加一条新规则'));
    api.controlBox.append(builder);
    const whenPick = api.choice({
      label: '当……', parent: builder, value: 'space',
      options: [{ value: 'space', label: '按空格' }, { value: 'tap', label: '点它' }, { value: 'up', label: '按 ↑' }, { value: 'tick3', label: '每过 3 秒' }],
    });
    const doPick = api.choice({
      label: '就……', parent: builder, value: 'jump',
      options: [{ value: 'jump', label: '跳一下' }, { value: 'color', label: '变颜色' }, { value: 'sound', label: '放音效' }, { value: 'spin', label: '转一圈' }, { value: 'hello', label: '说“你好”' }],
    });
    api.button('加上这条规则', () => addRule(whenPick.get(), doPick.get()), 'primary', builder);
    api.button('规则表回到最开始', () => { resetRules(); api.sound('pop'); });

    // ---------- 事件记录 ----------
    const waitLine = h('div', { style: { fontWeight: '700' } }, '程序在等……');
    if (waitLine.animate) {
      const blink = waitLine.animate([{ opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }], { duration: 1200, iterations: Infinity });
      api.onCleanup(() => blink.cancel());
    }
    const logList = h('div', { style: { display: 'grid', gap: '2px', fontSize: '15px' } });
    api.controlBox.append(h('div', { class: 'ctl' }, h('span', { class: 'lab' }, '事件记录'),
      h('div', { style: { padding: '8px 12px', border: '2px solid var(--line)', borderRadius: '10px', background: 'var(--paper)', display: 'grid', gap: '4px', minHeight: '64px' } },
        waitLine, logList)));
    function log(text, grey) {
      logList.prepend(h('div', { style: { color: grey ? 'var(--ink-2)' : 'var(--ink)' } }, text));
      while (logList.children.length > 5) logList.lastChild.remove();
    }

    // ---------- 键盘、点击 ----------
    const KEY = { ArrowRight: 'right', ArrowLeft: 'left', ArrowUp: 'up', ' ': 'space', Spacebar: 'space' };
    const typing = (e) => /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '');
    api.on(window, 'keydown', (e) => {
      const ev = KEY[e.key];
      if (!ev || typing(e)) return;
      e.preventDefault();
      // 空格不要顺手按到刚点过的按钮
      if (document.activeElement && document.activeElement.tagName === 'BUTTON') document.activeElement.blur();
      if (e.repeat) return; // 按住不放只算一次
      fire(ev);
    });
    api.on(window, 'keyup', (e) => { if (KEY[e.key] && !typing(e)) e.preventDefault(); });
    api.on(s.canvas, 'pointerdown', (e) => {
      const p = s.pos(e);
      const my = GROUND - 34 - monY();
      if (Math.hypot(p.x - mon.x, p.y - my) < 50) fire('tap');
      else { lastEvent = now; heard = '点了旁边的空地'; heardOk = false; log('点了旁边的空地 → 没有规则管它', true); }
    });

    function monY() { return mon.jump > 0 ? Math.sin(Math.min(1, mon.jump) * Math.PI) * 70 : 0; }

    // ---------- 画 ----------
    api.loop((dt, t) => {
      now = t;
      const ink = api.color('--ink');
      // 每过 3 秒（规则表里有它，程序才看这个钟）
      const hasTimer = rules.some((r) => r.when === 'tick3');
      if (hasTimer) { clock += dt; if (clock >= 3) { clock -= 3; fire('tick3'); } } else clock = 0;

      mon.x += (mon.tx - mon.x) * Math.min(1, dt * 10);
      if (mon.jump > 0) { mon.jump += dt * 1.8; if (mon.jump >= 1) mon.jump = 0; }
      if (mon.spin > 0) { mon.spin += dt * 1.7; if (mon.spin >= 1) mon.spin = 0; }
      mon.hello = Math.max(0, mon.hello - dt);
      mon.notes.forEach((n) => { n.life -= dt; n.y -= 50 * dt; n.x += n.dx * dt; });
      mon.notes = mon.notes.filter((n) => n.life > 0);
      const idle = t - lastEvent > 1.4;
      waitLine.style.visibility = idle ? 'visible' : 'hidden';

      s.clear();
      ctx.fillStyle = api.color('--line'); ctx.fillRect(0, GROUND, W, H - GROUND);
      // 上面一行：程序在等 / 听到了
      ctx.font = '18px ' + font(); ctx.textAlign = 'left';
      if (idle) {
        ctx.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(t * 2.4));
        ctx.fillStyle = ink;
        ctx.fillText('程序在等' + '.'.repeat(1 + (Math.floor(t * 2) % 3)), 14, 28);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = heardOk ? api.color('--sky') : api.color('--ink-2');
        ctx.fillText('听到了：' + heard + (heardOk ? '！' : '（没有规则）'), 14, 28);
      }
      // 每过 3 秒的小钟
      if (hasTimer) {
        const cx = W - 34, cy = 30;
        ctx.strokeStyle = ink; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = api.color('--sky');
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, 13, -Math.PI / 2, -Math.PI / 2 + (clock / 3) * Math.PI * 2); ctx.closePath(); ctx.fill();
      }

      // 小怪兽
      const body = api.color(COLORS[mon.colorI]);
      const y = GROUND - 34 - monY();
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.beginPath(); ctx.ellipse(mon.x, GROUND + 4, Math.max(10, 30 - monY() / 6), 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.translate(mon.x, y);
      ctx.rotate(mon.spin > 0 ? mon.spin * Math.PI * 2 : 0);
      drawMonster(ctx, body, ink, t);
      ctx.restore();
      // 音符
      ctx.fillStyle = ink; ctx.font = '22px ' + font(); ctx.textAlign = 'center';
      mon.notes.forEach((n) => { ctx.globalAlpha = Math.max(0, Math.min(1, n.life)); ctx.fillText('♪', n.x, n.y); });
      ctx.globalAlpha = 1;
      // 说你好
      if (mon.hello > 0) {
        const bx = Math.min(W - 60, Math.max(60, mon.x + 40)), by = Math.max(60, y - 70);
        ctx.fillStyle = api.color('--card'); ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
        PG.roundRect(ctx, bx - 44, by - 22, 88, 38, 12); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ink; ctx.font = '20px ' + font(); ctx.fillText('你好！', bx, by + 4);
      }
      ctx.textAlign = 'left';
    });

    function drawMonster(c, body, ink, t) {
      c.lineWidth = 3; c.strokeStyle = ink;
      // 触角
      c.beginPath(); c.moveTo(-12, -28); c.lineTo(-18, -46); c.moveTo(12, -28); c.lineTo(18, -46); c.stroke();
      c.fillStyle = '#ffd43b';
      [[-18, -48], [18, -48]].forEach(([x, yy]) => { c.beginPath(); c.arc(x, yy, 5, 0, Math.PI * 2); c.fill(); c.stroke(); });
      // 身体
      c.fillStyle = body;
      c.beginPath(); c.ellipse(0, 0, 34, 32, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      // 脚
      c.beginPath(); c.ellipse(-14, 32, 9, 5, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      c.beginPath(); c.ellipse(14, 32, 9, 5, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      // 眼睛（偶尔眨眼）
      const blink = (t % 3.2) < 0.12;
      [-12, 12].forEach((x) => {
        if (blink) { c.beginPath(); c.moveTo(x - 7, -6); c.lineTo(x + 7, -6); c.stroke(); return; }
        c.fillStyle = '#fff'; c.beginPath(); c.arc(x, -6, 8, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = '#1b2440'; c.beginPath(); c.arc(x + 2, -5, 3.5, 0, Math.PI * 2); c.fill();
      });
      // 嘴
      c.beginPath(); c.arc(0, 8, 9, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
    }

    // ---------- 猜一猜 ----------
    function resetRules() { rules = START_RULES.map(([w, d]) => ({ when: w, then: d })); drawRules(); }
    api.guesses([
      {
        q: '规则表回到最开始，里面没有“按空格”。现在按一下空格，小怪兽会怎样？',
        options: ['跳一下', '什么也不做', '跑出屏幕'], answer: 1,
        why: '程序听到了空格，可是规则表里没写“按空格要做什么”，所以它只能接着等。看看事件记录最上面那一行。',
        apply: () => { resetRules(); later(() => fire('space'), 500); },
      },
      {
        q: '加一条“当 按空格 → 就 跳一下”，再按一下空格呢？',
        options: ['跳一下', '什么也不做', '一直跳个不停'], answer: 0,
        why: '有了这条规则，程序一等到空格，就去做“跳一下”。按一次只跳一次，不按就不跳。',
        apply: () => { addRule('space', 'jump', true); later(() => fire('space'), 600); },
      },
      {
        q: '再加一条“当 按空格 → 就 变颜色”。两条规则都在等空格，按一下会怎样？',
        options: ['只跳一下', '只变颜色', '又跳又变颜色'], answer: 2,
        why: '两条规则都在等同一件事。按一下空格，两条都被叫醒，两件事一起做。',
        apply: () => { addRule('space', 'jump', true); addRule('space', 'color', true); later(() => fire('space'), 600); },
      },
    ]);

    api.say({
      left: '事件',
      right: '程序一直在等，等你做了什么，它才做那件事',
      example: '按空格就跳、点一下门就打开、每过 3 秒出来一个怪，这些“当……就……”说的都是事件。',
      prompt: '我的作品里，按哪些键、点哪里会发生事情？帮我列一张表：我做了什么 → 屏幕上发生了什么。先不要改。',
    });
  },

  thumb(ctx, w, h, t) {
    const ink = '#1b2440';
    const phase = t % 2;
    const pressed = phase < 0.25;
    const jump = phase < 0.7 ? Math.sin((phase / 0.7) * Math.PI) * 50 : 0;
    // 空格键
    ctx.fillStyle = pressed ? '#ffd43b' : '#fff'; ctx.strokeStyle = ink; ctx.lineWidth = 3;
    PG.roundRect(ctx, 30, 140 + (pressed ? 4 : 0), 110, 38, 9); ctx.fill(); ctx.stroke();
    ctx.fillStyle = ink; ctx.font = '20px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('空格', 85, 166 + (pressed ? 4 : 0));
    ctx.fillText('→', 170, 166);
    // 小怪兽
    const x = 240, y = 150 - jump;
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.beginPath(); ctx.ellipse(x, 186, 26, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(x, y, 30, 28, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 10, y - 25); ctx.lineTo(x - 16, y - 42); ctx.moveTo(x + 10, y - 25); ctx.lineTo(x + 16, y - 42); ctx.stroke();
    ctx.fillStyle = '#ffd43b';
    [[x - 16, y - 44], [x + 16, y - 44]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(a, b, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); });
    ctx.fillStyle = ink;
    ctx.beginPath(); ctx.arc(x - 10, y - 4, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 10, y - 4, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y + 6, 8, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    // 在等……
    if (phase > 1) { ctx.fillStyle = '#fff'; ctx.font = '18px sans-serif'; ctx.fillText('在等' + '.'.repeat(1 + (Math.floor(t * 3) % 3)), 240, 60); }
    ctx.textAlign = 'left';
  },
});
