/* 第 8 关：函数。把“闪光、跳起来、撒彩带”打包成“庆祝”，得分了、过关了都只说一声“庆祝！”。 */
PG.register({
  id: 'func',
  no: 8,
  title: '打包一串动作',
  concept: '函数',
  kid: '把一串动作打包起个名字，改一处，用到它的地方都跟着变',
  level: 'K5–K6',
  color: 'sun',
  play: '点「得分了」或「过关了」（键盘 1、2），小猫会做一整套“庆祝”。在右边给“庆祝”加一步、换个顺序，再点一次，看两个地方是不是一起变了。',

  mount(api) {
    const W = 480, H = 320;
    const s = api.stage(W, H);
    const ctx = s.ctx;
    const fam = () => getComputedStyle(document.body).fontFamily;

    const STEPS = {
      flash: { label: '闪一下光', dur: 0.45 },
      jump: { label: '跳起来', dur: 0.6 },
      confetti: { label: '撒彩带', dur: 0.6 },
      ding: { label: '叮一声', dur: 0.45 },
      spin: { label: '转一圈', dur: 0.6 },
    };
    const ORDER = ['flash', 'jump', 'confetti', 'ding', 'spin'];
    const START = ['flash', 'jump', 'confetti'];
    const MAX = 6;
    const TRIG = { score: '得分了', level: '过关了', record: '破纪录' };

    // 打包：只有一份“庆祝”，大家都用它。没打包：每个地方各抄一份。
    let mode = 'pack';
    const recipe = START.slice();
    let copies = {};
    const triggers = ['score', 'level'];
    let edits = 0;

    // 动画
    let run = null; // {tid, steps, i, t, end}
    let flash = 0, jumpT = -1, spinT = -1, dingT = 0, bubble = null, bubbleT = 0;
    let bits = [];
    let timers = [];
    const later = (sec, fn) => timers.push({ s: sec, fn });

    const stepsOf = (tid) => (mode === 'pack' ? recipe : copies[tid]);
    const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

    function trigger(tid) {
      if (!triggers.includes(tid)) return;
      const list = stepsOf(tid);
      run = { tid, steps: list.slice(), i: -1, t: 0, end: 0 };
      bubble = mode === 'pack' ? TRIG[tid] + '！庆祝！' : TRIG[tid] + '！照我这份做';
      bubbleT = 1.4;
      trigBtns[tid].animate([{ transform: 'scale(1.08)' }, { transform: 'scale(1)' }], 300);
      if (!list.length) { bubble = '庆祝里什么都没有…'; api.sound('buzz'); run.i = 0; run.end = 0.8; return; }
      nextStep();
    }
    function nextStep() {
      run.i++; run.t = 0;
      if (run.i >= run.steps.length) { run.end = 0.7; return; }
      const k = run.steps[run.i];
      if (k === 'flash') { flash = 1; api.sound('tick'); }
      if (k === 'jump') { jumpT = 0; api.sound('boing'); }
      if (k === 'spin') { spinT = 0; api.sound('step'); }
      if (k === 'ding') { dingT = 0.6; api.sound('ding'); }
      if (k === 'confetti') {
        api.sound('pop');
        const cs = ['--tomato', '--sky', '--grass', '--grape', '--bubble'];
        for (let i = 0; i < 34; i++) {
          bits.push({ x: 105, y: 190, vx: (Math.random() - 0.5) * 320, vy: -160 - Math.random() * 220,
            c: cs[i % cs.length], r: Math.random() * 6, life: 1.6 });
        }
      }
    }
    function runTime(list) { return list.reduce((a, k) => a + STEPS[k].dur + 0.08, 0) + 0.6; }

    // ---------- 控件 ----------
    const trigRow = api.h('div', { class: 'seg' });
    api.controlBox.append(api.h('div', { class: 'ctl' }, api.h('span', { class: 'lab' }, '什么时候庆祝'), trigRow));
    const trigBtns = {};
    for (const tid of ['score', 'level', 'record']) {
      trigBtns[tid] = api.button(TRIG[tid], () => trigger(tid), 'primary', trigRow);
    }
    trigBtns.record.hidden = true;

    const modeCtl = api.choice({
      label: '怎么写',
      options: [{ value: 'pack', label: '打包成“庆祝”' }, { value: 'copy', label: '没打包，各写一份' }],
      value: 'pack',
      onChange: setMode,
    });

    const edBox = api.h('div', { class: 'ctl' });
    const edHint = api.h('p', { class: 'small' });
    api.controlBox.append(edBox, edHint);
    const rCopies = api.readout('庆祝有几份', 1);
    const rEdits = api.readout('你动手改了几次', 0);
    api.button('从头再来', () => resetAll());

    function setMode(m) {
      mode = m;
      if (m === 'copy') {
        copies = {};
        for (const tid of triggers) copies[tid] = recipe.slice();
      }
      edits = 0; rEdits.set(0);
      render();
    }
    function addThird() {
      if (triggers.includes('record')) return;
      triggers.push('record');
      if (mode === 'copy') copies.record = START.slice();
      trigBtns.record.hidden = false;
      render();
    }
    function resetAll() {
      recipe.splice(0, recipe.length, ...START);
      if (triggers.includes('record')) triggers.pop();
      trigBtns.record.hidden = true;
      run = null; timers = [];
      modeCtl.set('pack');
    }
    function edited() { edits++; rEdits.set(edits); api.sound('pop'); render(); }

    const small = { padding: '4px 9px', fontSize: '15px', boxShadow: '2px 2px 0 var(--ink)' };
    function editor(title, list) {
      const tiles = api.h('div', { class: 'seg' });
      if (!list.length) tiles.append(api.h('span', { class: 'small' }, '（空的，点下面加一步）'));
      list.forEach((k, i) => {
        const up = api.h('button', { class: 'btn', type: 'button', style: small, 'aria-label': '往前挪：' + STEPS[k].label, disabled: i === 0 }, '↑');
        up.addEventListener('click', () => { [list[i - 1], list[i]] = [list[i], list[i - 1]]; edited(); });
        const del = api.h('button', { class: 'btn', type: 'button', style: small, 'aria-label': '拿掉：' + STEPS[k].label }, '✕');
        del.addEventListener('click', () => { list.splice(i, 1); edited(); });
        tiles.append(api.h('span', {
          style: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 4px 3px 10px',
            border: '2px solid var(--ink)', borderRadius: '10px', background: 'var(--paper)', fontWeight: '700' },
        }, (i + 1) + '. ' + STEPS[k].label, up, del));
      });
      const add = api.h('div', { class: 'seg' }, api.h('span', { class: 'small', style: { alignSelf: 'center' } }, '加一步：'));
      for (const k of ORDER) {
        const b = api.h('button', { class: 'btn', type: 'button', style: small, disabled: list.length >= MAX }, STEPS[k].label);
        b.addEventListener('click', () => { if (list.length < MAX) { list.push(k); edited(); } });
        add.append(b);
      }
      return api.h('div', { style: { display: 'grid', gap: '6px', padding: '10px', border: '2px dashed var(--ink)', borderRadius: '12px' } },
        api.h('b', null, title), tiles, add);
    }
    function render() {
      edBox.textContent = '';
      if (mode === 'pack') {
        edBox.append(editor('“庆祝”里面有：', recipe));
        edHint.textContent = '每个地方都只说一声“庆祝！”。改这一份，用到它的地方一起变。';
      } else {
        for (const tid of triggers) edBox.append(editor('“' + TRIG[tid] + '”自己那份：', copies[tid]));
        edHint.textContent = '现在每个地方各抄了一份。改了一份，别的不会跟着变，要一份一份去改。';
      }
      rCopies.set(mode === 'pack' ? 1 : triggers.length);
    }
    render();

    api.on(window, 'keydown', (e) => {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      const tid = { 1: 'score', 2: 'level', 3: 'record' }[e.key];
      if (tid && triggers.includes(tid)) { e.preventDefault(); trigger(tid); }
    });

    // ---------- 画 ----------
    function drawCat(x, y, r, fill, ink, rot) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0);
      ctx.fillStyle = fill; ctx.strokeStyle = ink; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(0, r * 0.75, r * 0.85, r * 0.7, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      for (const sx of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(sx * r * 0.7, -r * 0.45); ctx.lineTo(sx * r * 0.62, -r * 1.25); ctx.lineTo(sx * r * 0.12, -r * 0.8);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(0, -r * 0.25, r * 0.78, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ink;
      ctx.beginPath(); ctx.arc(-r * 0.28, -r * 0.35, r * 0.09, 0, Math.PI * 2); ctx.arc(r * 0.28, -r * 0.35, r * 0.09, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, -r * 0.12, r * 0.22, 0.15 * Math.PI, 0.85 * Math.PI); ctx.lineWidth = 2.5; ctx.stroke();
      ctx.restore();
    }
    function signX(j, n) { return 222 + 250 * (j + 0.5) / n; }
    function drawSign(x, y, label, sub, on, c) {
      const w = 76, hh = 40;
      ctx.fillStyle = on ? c.sun : c.card; ctx.strokeStyle = c.ink; ctx.lineWidth = 2.5;
      PG.roundRect(ctx, x - w / 2, y, w, hh, 9); ctx.fill(); ctx.stroke();
      ctx.fillStyle = on ? '#1b2440' : c.ink; ctx.textAlign = 'center';
      ctx.font = 'bold 15px ' + c.f; ctx.fillText(label, x, y + 18);
      ctx.font = '12px ' + c.f; ctx.fillText(sub, x, y + 34);
      ctx.textAlign = 'left';
    }
    function drawCard(x, y, w, title, list, hi, on, c, fs) {
      const rowH = fs + 9, hh = 30 + Math.max(1, list.length) * rowH + 6;
      ctx.fillStyle = c.card; ctx.strokeStyle = c.ink; ctx.lineWidth = on ? 3.5 : 2.5;
      PG.roundRect(ctx, x, y, w, hh, 10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c.ink; ctx.font = 'bold ' + (fs + 1) + 'px ' + c.f; ctx.fillText(title, x + 8, y + 20);
      ctx.strokeStyle = c.line; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x + 6, y + 27); ctx.lineTo(x + w - 6, y + 27); ctx.stroke();
      if (!list.length) { ctx.fillStyle = c.ink2; ctx.font = fs + 'px ' + c.f; ctx.fillText('（空的）', x + 8, y + 30 + fs + 2); }
      list.forEach((k, i) => {
        const ry = y + 30 + i * rowH;
        if (i === hi) { ctx.fillStyle = c.sun; PG.roundRect(ctx, x + 4, ry, w - 8, rowH - 2, 6); ctx.fill(); }
        ctx.fillStyle = i === hi ? '#1b2440' : c.ink; ctx.font = fs + 'px ' + c.f;
        ctx.fillText((i + 1) + '. ' + STEPS[k].label, x + 8, ry + fs + 1);
      });
      return hh;
    }
    function arrow(x1, y1, x2, y2, col, wdt) {
      ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = wdt;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      const a = Math.atan2(y2 - y1, x2 - x1);
      ctx.beginPath(); ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - 10 * Math.cos(a - 0.45), y2 - 10 * Math.sin(a - 0.45));
      ctx.lineTo(x2 - 10 * Math.cos(a + 0.45), y2 - 10 * Math.sin(a + 0.45)); ctx.closePath(); ctx.fill();
    }

    api.loop((dt) => {
      // 时间推进
      for (const tm of timers) { tm.s -= dt; if (tm.s <= 0 && !tm.done) { tm.done = true; tm.fn(); } }
      timers = timers.filter((tm) => !tm.done);
      if (run) {
        if (run.i < run.steps.length && run.steps.length) {
          run.t += dt;
          if (run.t >= STEPS[run.steps[run.i]].dur + 0.08) nextStep();
        } else { run.end -= dt; if (run.end <= 0) run = null; }
      }
      flash = Math.max(0, flash - dt * 2.6);
      dingT = Math.max(0, dingT - dt);
      bubbleT = Math.max(0, bubbleT - dt);
      if (jumpT >= 0) { jumpT += dt; if (jumpT > 0.6) jumpT = -1; }
      if (spinT >= 0) { spinT += dt; if (spinT > 0.6) spinT = -1; }
      for (const b of bits) { b.vy += 420 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.r += dt * 8; b.life -= dt; }
      bits = bits.filter((b) => b.life > 0 && b.y < H + 20);

      const c = {
        ink: api.color('--ink'), card: api.color('--card'), line: api.color('--line'), sun: api.color('--sun'),
        tomato: api.color('--tomato'), ink2: api.color('--ink-2'), f: fam(),
      };
      s.clear();

      // 左边：小猫的舞台
      ctx.fillStyle = c.line; ctx.fillRect(0, H - 40, 210, 40);
      const jy = jumpT >= 0 ? -Math.sin(Math.PI * jumpT / 0.6) * 70 : 0;
      const rot = spinT >= 0 ? (spinT / 0.6) * Math.PI * 2 : 0;
      drawCat(105, 220 + jy, 34, c.sun, c.ink, rot);
      for (const b of bits) {
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r);
        ctx.fillStyle = api.color(b.c); ctx.fillRect(-5, -2.5, 10, 5); ctx.restore();
      }
      if (dingT > 0) {
        ctx.fillStyle = c.ink; ctx.font = 'bold 22px ' + c.f;
        ctx.fillText('叮！', 150, 150 - (0.6 - dingT) * 40);
      }
      if (bubbleT > 0 && bubble) {
        ctx.font = 'bold 16px ' + c.f;
        const bw = Math.min(200, ctx.measureText(bubble).width + 22);
        const bx = Math.max(6, 105 - bw / 2), by = 28;
        ctx.fillStyle = c.card; ctx.strokeStyle = c.ink; ctx.lineWidth = 2.5;
        PG.roundRect(ctx, bx, by, bw, 34, 12); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(95, by + 34); ctx.lineTo(105, by + 48); ctx.lineTo(115, by + 34); ctx.fill();
        ctx.fillStyle = c.ink; ctx.textAlign = 'center'; ctx.fillText(bubble, bx + bw / 2, by + 23); ctx.textAlign = 'left';
      }
      // 正在做第几步
      if (run && run.i >= 0 && run.i < run.steps.length) {
        ctx.fillStyle = c.ink2; ctx.font = '14px ' + c.f;
        ctx.fillText('第 ' + (run.i + 1) + ' 步：' + STEPS[run.steps[run.i]].label, 10, H - 14);
      }

      // 分隔线
      ctx.strokeStyle = c.line; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(214, 10); ctx.lineTo(214, H - 10); ctx.stroke(); ctx.setLineDash([]);

      // 右边：牌子和配方卡
      const n = triggers.length;
      if (mode === 'pack') {
        const cardX = 255, cardY = 100, cardW = 190;
        triggers.forEach((tid, j) => {
          const x = signX(j, n), on = run && run.tid === tid;
          arrow(x, 56, cardX + cardW / 2 + (x - 347) * 0.35, cardY - 4, on ? c.tomato : c.ink2, on ? 3.5 : 2);
        });
        triggers.forEach((tid, j) => drawSign(signX(j, n), 14, TRIG[tid], '说“庆祝！”', run && run.tid === tid, c));
        const hh = drawCard(cardX, cardY, cardW, '庆祝（只有这一份）', recipe, run && run.i < run.steps.length ? run.i : -1, !!run, c, 15);
        ctx.fillStyle = c.ink2; ctx.font = '13px ' + c.f;
        ctx.fillText(n + ' 个地方都用这一份', cardX + 8, Math.min(H - 8, cardY + hh + 18));
      } else {
        const colW = 250 / n, fs = n > 2 ? 12 : 14;
        triggers.forEach((tid, j) => {
          const x = signX(j, n), on = run && run.tid === tid;
          drawSign(x, 14, TRIG[tid], '照自己那份', on, c);
          drawCard(222 + j * colW + 4, 64, colW - 8, '自己那份', copies[tid], on && run.i < run.steps.length ? run.i : -1, on, c, fs);
        });
        const lists = triggers.map((tid) => copies[tid]);
        const differ = lists.some((l) => !same(l, lists[0]));
        ctx.font = 'bold 15px ' + c.f; ctx.textAlign = 'center';
        ctx.fillStyle = differ ? c.tomato : c.ink2;
        ctx.fillText(differ ? '这几份不一样了！' : n + ' 份一模一样，要改得改 ' + n + ' 次', 347, H - 12);
        ctx.textAlign = 'left';
      }

      // 闪光：盖住整个画面
      if (flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (flash * 0.5).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H); }
    });

    api.guesses([
      {
        q: '把“庆祝”改成“闪一下光”连着三次。点“过关了”，会怎样？',
        options: ['只闪一下', '也闪三下', '什么都不做'], answer: 1,
        why: '“过关了”只说了一声“庆祝！”，用的就是那唯一一份“庆祝”。改了它，用到它的地方都跟着变。',
        apply: () => {
          run = null; timers = [];
          modeCtl.set('pack');
          recipe.splice(0, recipe.length, 'flash', 'flash', 'flash');
          render();
          later(0.4, () => trigger('level'));
        },
      },
      {
        q: '换成“没打包，各写一份”。只把“得分了”那份改成闪三下，再点“过关了”，它会变吗？',
        options: ['也变成闪三下', '不变，还是原来那样'], answer: 1,
        why: '各写一份的时候，每份是分开的。改了“得分了”那份，“过关了”那份还是老样子。想一起变，就得再去改一遍。',
        delay: 2600,
        apply: () => {
          run = null; timers = [];
          recipe.splice(0, recipe.length, ...START);
          modeCtl.set('copy');
          copies.score.splice(0, copies.score.length, 'flash', 'flash', 'flash');
          edits = 1; rEdits.set(1);
          render();
          later(0.3, () => trigger('score'));
          later(0.3 + runTime(copies.score), () => trigger('level'));
        },
      },
      {
        q: '现在“破纪录”的时候也想庆祝。已经打包好了，要做几步？',
        options: ['把每个动作再写一遍', '说一声“庆祝！”就行', '做不到'], answer: 1,
        why: '“庆祝”已经打包好了，新地方只要说一声它的名字。用的地方越多，打包就越省事。',
        apply: () => {
          run = null; timers = [];
          modeCtl.set('pack');
          addThird();
          later(0.4, () => trigger('record'));
        },
      },
    ]);

    api.say({
      left: '函数',
      right: '把一串动作打包起个名字，改一处，用到它的地方都跟着变',
      example: '“庆祝”就是一个函数：里面装着闪光、跳起来、撒彩带。得分了、过关了，都只要说一声“庆祝！”。',
      prompt: '我的作品里，有没有一串动作在好几个地方都出现了？帮我找出来，告诉我它们是不是已经打包成一个有名字的东西，先不要改。',
    });
  },

  thumb(ctx, w, h, t) {
    const ink = '#1b2440';
    // 彩带
    const cs = ['#fff', '#ff5a47', '#2f7cf6', '#1b2440'];
    for (let i = 0; i < 16; i++) {
      const p = (t * 0.6 + i / 16) % 1;
      const x = 90 + Math.sin(i * 2.3) * 70 * p, y = 150 - Math.sin(p * Math.PI) * 110 + p * 40;
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * 4 + i);
      ctx.fillStyle = cs[i % 4]; ctx.fillRect(-5, -2, 10, 4); ctx.restore();
    }
    // 小猫
    const jy = -Math.abs(Math.sin(t * 3)) * 26;
    ctx.save(); ctx.translate(90, 130 + jy);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = ink; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, 22, 26, 20, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    for (const sx of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(sx * 20, -14); ctx.lineTo(sx * 18, -38); ctx.lineTo(sx * 4, -24); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, -8, 23, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(-8, -11, 2.6, 0, Math.PI * 2); ctx.arc(8, -11, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // 配方卡
    ctx.fillStyle = '#fff'; ctx.strokeStyle = ink; ctx.lineWidth = 3;
    PG.roundRect(ctx, 180, 50, 112, 110, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = ink; ctx.font = 'bold 18px sans-serif'; ctx.fillText('庆祝', 196, 76);
    const rows = ['闪一下', '跳起来', '撒彩带'];
    const hi = Math.floor(t * 2) % 3;
    rows.forEach((r, i) => {
      if (i === hi) { ctx.fillStyle = '#ffd43b'; ctx.fillRect(188, 86 + i * 22, 96, 20); }
      ctx.fillStyle = ink; ctx.font = '15px sans-serif'; ctx.fillText((i + 1) + '. ' + r, 196, 101 + i * 22);
    });
  },
});
