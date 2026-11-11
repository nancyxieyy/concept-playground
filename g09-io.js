/* 第 9 关：输入、处理、输出。给小怪兽机器一张纸条，它照规则算，再吐出一张新纸条。 */
PG.register({
  id: 'io',
  no: 9,
  title: '算算小怪兽',
  concept: '输入、处理、输出',
  kid: '给它东西，它照规则算，再给你结果',
  level: 'K4–K6',
  color: 'grape',
  play: '在右边写一张纸条、选一条规则，先猜猜它会吐出什么，再按「开动」（也可以点小怪兽）。看纸条进去、齿轮转、结果出来。',

  mount(api) {
    const W = 480, H = 320;
    const s = api.stage(W, H);
    const ctx = s.ctx;
    const fam = () => getComputedStyle(document.body).fontFamily;

    const RULES = {
      mul: { label: '乘 2 再加 1', kind: 'num', f: (x) => x * 2 + 1 },
      dbl: { label: '变成两倍', kind: 'num', f: (x) => x * 2 },
      rev: { label: '倒过来念', kind: 'text' },
      draw: { label: '抽签', kind: 'draw' },
    };
    const NAMES = ['小猫', '小狗', '小兔', '小熊', '小鸭'];
    const PICKS = { num: ['3', '5', '10'], text: ['上海自来水', '小猫吃鱼', '12345'], draw: ['1', '3', '5'] };
    const DEFAULT = { num: '3', text: '上海自来水', draw: '3' };

    let rule = 'mul';
    let put = 'once'; // once：不放回；repeat：可以重复
    let job = null;   // {phase, t, inText, out, guess, draws, ok}
    let bubble = '', bubbleT = 0, shakeT = 0, gearA = 0, tickT = 0;

    const fmt = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));
    const ruleText = () => (rule === 'draw' ? '抽签 · ' + (put === 'once' ? '不放回' : '可以重复') : RULES[rule].label);

    // ---------- 控件 ----------
    const field = (labelText, ph) => {
      const id = 'io-' + Math.random().toString(36).slice(2, 7);
      const lab = api.h('span', null, labelText);
      const input = api.h('input', {
        id, type: 'text', maxlength: '10', placeholder: ph, autocomplete: 'off',
        style: { font: '20px/1.2 var(--body)', padding: '8px 12px', border: '2.5px solid var(--ink)', borderRadius: '10px',
          background: 'var(--card)', color: 'var(--ink)', width: '100%' },
      });
      const wrap = api.h('div', { class: 'ctl' }, api.h('label', { class: 'lab', for: id }, lab), input);
      api.controlBox.append(wrap);
      return { wrap, lab, input };
    };
    const inF = field('放进去的数', '写在这里');
    const picks = api.h('div', { class: 'seg' });
    inF.wrap.append(picks);

    const ruleCtl = api.choice({
      label: '怎么算（规则）',
      options: Object.keys(RULES).map((k) => ({ value: k, label: RULES[k].label })),
      value: rule,
      onChange: (v) => { rule = v; ruleChanged(); },
    });
    const putCtl = api.choice({
      label: '抽完放不放回',
      options: [{ value: 'once', label: '不放回' }, { value: 'repeat', label: '可以重复' }],
      value: put,
      onChange: (v) => { put = v; job = null; rRule.set(ruleText()); rOut.set('?'); },
    });
    const gF = field('我猜出来的是', '先猜一猜');
    const goBtn = api.button('开动！', () => go(false), 'primary');
    goBtn.style.fontSize = '20px';
    const rIn = api.readout('输入', '?');
    const rRule = api.readout('怎么算', ruleText());
    const rOut = api.readout('输出', '?');

    function renderPicks() {
      picks.textContent = '';
      const kind = RULES[rule].kind;
      picks.append(api.h('span', { class: 'small', style: { alignSelf: 'center' } }, '快选：'));
      for (const p of PICKS[kind]) {
        const b = api.h('button', { class: 'btn', type: 'button', style: { padding: '4px 10px', fontSize: '15px' } }, p);
        b.addEventListener('click', () => { inF.input.value = p; api.sound('pop'); });
        picks.append(b);
      }
    }
    function ruleChanged() {
      const kind = RULES[rule].kind;
      const v = inF.input.value.trim();
      if (kind === 'num' && (v === '' || isNaN(Number(v)))) inF.input.value = DEFAULT.num;
      if (kind === 'text' && v === '') inF.input.value = DEFAULT.text;
      if (kind === 'draw' && !/^[1-5]$/.test(v)) inF.input.value = DEFAULT.draw;
      inF.lab.textContent = { num: '放进去的数', text: '放进去的字', draw: '抽几次（写个数）' }[kind];
      gF.lab.textContent = kind === 'draw' ? '我猜会抽到谁（写一个名字）' : '我猜出来的是';
      gF.input.value = '';
      putCtl.el.hidden = kind !== 'draw';
      job = null; rOut.set('?'); rRule.set(ruleText());
      renderPicks();
    }
    inF.input.value = DEFAULT.num;
    ruleChanged();

    const enter = (e) => { if (e.key === 'Enter') { e.preventDefault(); go(false); } };
    api.on(inF.input, 'keydown', enter);
    api.on(gF.input, 'keydown', enter);
    api.on(s.canvas, 'pointerdown', () => go(false));

    function complain(msg) {
      bubble = msg; bubbleT = 1.8; shakeT = 0.5; api.sound('buzz');
    }
    function drawN(n, rig) {
      for (let tries = 0; tries < 200; tries++) {
        const bag = NAMES.slice(), out = [];
        for (let i = 0; i < n; i++) {
          const k = Math.floor(Math.random() * bag.length);
          out.push(bag[k]);
          if (put === 'once') bag.splice(k, 1);
        }
        if (!rig || new Set(out).size < out.length) return out;
      }
      return NAMES.slice(0, n - 1).concat(NAMES[0]);
    }

    // forced：题目里用，不要求先猜；rig：抽签时让它一定出现重复（演示“可能会”）
    function go(forced, rig) {
      if (job && job.phase !== 'done') return;
      const raw = inF.input.value.trim(), g = gF.input.value.trim();
      const R = RULES[rule];
      let inText, out, draws = null;
      if (R.kind === 'num') {
        if (raw === '' || isNaN(Number(raw))) return complain('我只吃数字！');
        const x = Number(raw);
        inText = fmt(x); out = fmt(R.f(x));
      } else if (R.kind === 'text') {
        if (!raw) return complain('纸条是空的！');
        inText = raw; out = Array.from(raw).reverse().join('');
      } else {
        const n = Number(raw);
        if (!Number.isInteger(n) || n < 1) return complain('写一个数：抽几次？');
        if (put === 'once' && n > NAMES.length) return complain('名单只有 5 个，不放回最多抽 5 次！');
        if (n > 8) return complain('最多抽 8 次就好啦');
        draws = drawN(n, rig);
        inText = '抽 ' + n + ' 次'; out = draws.join('、');
      }
      if (!forced && !g) { complain('先猜一猜，再开动！'); gF.input.focus(); return; }
      job = { phase: 'in', t: 0, inText, out, guess: forced ? '' : g, draws, ok: null, kind: R.kind, rule: ruleText() };
      rIn.set(inText); rRule.set(job.rule); rOut.set('…');
      api.sound('step');
    }
    function judge() {
      if (!job.guess) return null;
      if (job.kind === 'num') return Math.abs(Number(job.guess) - Number(job.out)) < 1e-9;
      if (job.kind === 'text') return job.guess === job.out;
      return job.draws.includes(job.guess);
    }

    // ---------- 画 ----------
    const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
    function wrapText(text, maxW) {
      const lines = []; let cur = '';
      for (const ch of Array.from(text)) {
        if (ctx.measureText(cur + ch).width > maxW && cur) { lines.push(cur); cur = ch; } else cur += ch;
      }
      if (cur) lines.push(cur);
      return lines;
    }
    function ticket(cx, cy, text, scale, c, hiFill) {
      ctx.save(); ctx.translate(cx, cy); ctx.scale(scale, scale);
      ctx.font = 'bold 18px ' + c.f;
      let lines = wrapText(text, 118);
      if (lines.length > 3) { ctx.font = 'bold 14px ' + c.f; lines = wrapText(text, 118); }
      const lh = parseInt(ctx.font.match(/(\d+)px/)[1], 10) + 4;
      const tw = Math.max(54, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 20);
      const th = lines.length * lh + 14;
      ctx.fillStyle = hiFill || c.card; ctx.strokeStyle = c.ink; ctx.lineWidth = 2.5;
      PG.roundRect(ctx, -tw / 2, -th / 2, tw, th, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = hiFill ? '#1b2440' : c.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      lines.forEach((l, i) => ctx.fillText(l, 0, -th / 2 + 7 + lh * (i + 0.5)));
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.restore();
      return th;
    }
    function gear(x, y, r, a, fill, ink) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.beginPath();
      const teeth = 8;
      for (let i = 0; i < teeth * 2; i++) {
        const ang = (i * Math.PI) / teeth, rr = i % 2 ? r : r * 0.78;
        ctx.lineTo(Math.cos(ang - 0.15) * rr, Math.sin(ang - 0.15) * rr);
        ctx.lineTo(Math.cos(ang + 0.15) * rr, Math.sin(ang + 0.15) * rr);
      }
      ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2); ctx.fillStyle = ink; ctx.fill();
      ctx.restore();
    }

    const WAIT = { x: 72, y: 140 }, MOUTH = { x: 245, y: 70 }, CHUTE = { x: 350, y: 262 }, TRAY = { x: 410, y: 268 };
    const workDur = () => (job.kind === 'draw' ? 0.45 * job.draws.length + 0.4 : 1.1);

    api.loop((dt, t) => {
      // 推进
      bubbleT = Math.max(0, bubbleT - dt); shakeT = Math.max(0, shakeT - dt);
      const working = job && job.phase === 'work';
      gearA += dt * (working ? 7 : 0.5);
      if (job && job.phase !== 'done') {
        job.t += dt;
        if (job.phase === 'in' && job.t >= 0.7) { job.phase = 'work'; job.t = 0; bubble = '咕噜咕噜……'; bubbleT = workDur(); }
        else if (job.phase === 'work') {
          tickT -= dt; if (tickT <= 0) { api.sound('tick'); tickT = 0.22; }
          if (job.t >= workDur()) { job.phase = 'out'; job.t = 0; api.sound('pop'); }
        } else if (job.phase === 'out' && job.t >= 0.6) {
          job.phase = 'done'; job.t = 0; job.ok = judge(); rOut.set(job.out);
          api.sound(job.ok === false ? 'boing' : 'ding');
        }
      }

      const c = {
        ink: api.color('--ink'), card: api.color('--card'), line: api.color('--line'), grape: api.color('--grape'),
        sun: api.color('--sun'), sky: api.color('--sky'), grass: api.color('--grass'), tomato: api.color('--tomato'),
        ink2: api.color('--ink-2'), f: fam(),
      };
      s.clear();
      const kind = RULES[rule].kind;

      // 左边：等着放进去的纸条
      ctx.fillStyle = c.ink2; ctx.font = '14px ' + c.f; ctx.textAlign = 'center';
      ctx.fillText('放进去', WAIT.x, 98);
      ctx.textAlign = 'left';
      if (!job || job.phase === 'done') {
        const raw = inF.input.value.trim();
        const preview = kind === 'draw' ? (raw ? '抽 ' + raw + ' 次' : '?') : (raw || '?');
        const bob = Math.sin(t * 3) * 3;
        const sx = shakeT > 0 ? Math.sin(t * 70) * 5 : 0;
        ticket(WAIT.x + sx, WAIT.y + bob, preview, 1, c);
      }

      // 名单（抽签时）
      if (kind === 'draw') {
        ctx.fillStyle = c.ink; ctx.font = 'bold 14px ' + c.f; ctx.fillText('名单', 22, 196);
        const shown = job && job.draws ? (job.phase === 'work' ? Math.floor(job.t / 0.45) : job.phase === 'in' ? 0 : job.draws.length) : 0;
        const got = job && job.draws ? job.draws.slice(0, Math.min(shown, job.draws.length)) : [];
        NAMES.forEach((nm, i) => {
          const y = 218 + i * 20, cnt = got.filter((x) => x === nm).length;
          const gone = job && job.draws && job.rule.indexOf('不放回') >= 0 && cnt > 0;
          ctx.fillStyle = gone ? c.ink2 : c.ink; ctx.font = '15px ' + c.f;
          ctx.fillText(nm, 22, y);
          if (gone) { ctx.strokeStyle = c.tomato; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(18, y - 5); ctx.lineTo(56, y - 5); ctx.stroke(); }
          if (cnt > 0 && !gone) { ctx.fillStyle = cnt > 1 ? c.tomato : c.ink2; ctx.font = 'bold 14px ' + c.f; ctx.fillText('抽到 ×' + cnt, 62, y); }
          if (gone) { ctx.fillStyle = c.ink2; ctx.font = '12px ' + c.f; ctx.fillText('拿走了', 62, y); }
        });
      }

      // 小怪兽机器
      const wob = shakeT > 0 ? Math.sin(t * 70) * 4 : working ? Math.sin(t * 30) * 1.5 : 0;
      ctx.save(); ctx.translate(wob, 0);
      ctx.fillStyle = c.grape; ctx.strokeStyle = c.ink; ctx.lineWidth = 3;
      // 角
      for (const sx of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(245 + sx * 70, 80); ctx.lineTo(245 + sx * 84, 46); ctx.lineTo(245 + sx * 52, 74); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      PG.roundRect(ctx, 150, 72, 190, 216, 26); ctx.fill(); ctx.stroke();
      // 脚
      ctx.fillStyle = c.grape;
      PG.roundRect(ctx, 172, 280, 40, 16, 8); ctx.fill(); ctx.stroke();
      PG.roundRect(ctx, 278, 280, 40, 16, 8); ctx.fill(); ctx.stroke();
      // 嘴（投纸条的口）
      ctx.fillStyle = c.ink; PG.roundRect(ctx, 205, 62, 80, 14, 6); ctx.fill();
      // 眼睛看着纸条
      let look = WAIT;
      if (job && job.phase === 'in') look = MOUTH;
      if (job && job.phase === 'work') look = { x: 245, y: 175 };
      if (job && (job.phase === 'out' || job.phase === 'done')) look = TRAY;
      for (const ex of [212, 278]) {
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, 106, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        const a = Math.atan2(look.y - 106, look.x - ex);
        ctx.fillStyle = '#1b2440'; ctx.beginPath(); ctx.arc(ex + Math.cos(a) * 5, 106 + Math.sin(a) * 5, 5.5, 0, Math.PI * 2); ctx.fill();
      }
      // 齿轮窗
      ctx.fillStyle = c.card; PG.roundRect(ctx, 176, 130, 138, 80, 12); ctx.fill(); ctx.stroke();
      gear(220, 168, 25, gearA, c.sun, c.ink);
      gear(265, 176, 18, -gearA * 1.4 + 0.2, c.sky, c.ink);
      // 规则牌
      ctx.fillStyle = c.card; PG.roundRect(ctx, 168, 220, 154, 32, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c.ink; ctx.font = 'bold 16px ' + c.f; ctx.textAlign = 'center';
      ctx.fillText(job && job.phase !== 'done' ? job.rule : ruleText(), 245, 242);
      ctx.font = '11px ' + c.f; ctx.fillStyle = c.ink2; ctx.fillText('规则', 245, 266);
      ctx.textAlign = 'left';
      // 出口
      ctx.fillStyle = c.ink; PG.roundRect(ctx, 330, 248, 24, 28, 5); ctx.fill();
      ctx.restore();

      // 托盘
      ctx.strokeStyle = c.ink; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(350, 286); ctx.lineTo(356, 304); ctx.lineTo(470, 304); ctx.lineTo(476, 286); ctx.stroke();
      ctx.fillStyle = c.ink2; ctx.font = '14px ' + c.f; ctx.textAlign = 'center'; ctx.fillText('出来的', TRAY.x, H - 3);
      ctx.textAlign = 'left';

      // 正在动的纸条
      if (job) {
        if (job.phase === 'in') {
          const p = ease(Math.min(1, job.t / 0.7));
          const x = WAIT.x + (MOUTH.x - WAIT.x) * p, y = WAIT.y + (MOUTH.y - WAIT.y) * p - Math.sin(Math.PI * p) * 50;
          ticket(x, y, job.inText, 1 - 0.7 * Math.max(0, (p - 0.6) / 0.4), c);
        }
        if (job.phase === 'out' || job.phase === 'done') {
          const p = job.phase === 'out' ? ease(Math.min(1, job.t / 0.6)) : 1;
          const x = CHUTE.x + (TRAY.x - CHUTE.x) * p, y = CHUTE.y + (TRAY.y - CHUTE.y) * p;
          const th = ticket(x, y, job.out, 0.4 + 0.6 * p, c, job.phase === 'done' ? c.sun : null);
          // 猜对没有
          if (job.phase === 'done') {
            ctx.textAlign = 'center';
            const top = TRAY.y - th / 2 - 10;
            if (job.guess) {
              ctx.fillStyle = c.ink2; ctx.font = '14px ' + c.f;
              ctx.fillText((job.kind === 'draw' ? '你猜会抽到：' : '你猜：') + job.guess, TRAY.x, top - 28);
              ctx.font = 'bold 20px ' + c.f; ctx.fillStyle = job.ok ? c.grass : c.tomato;
              ctx.fillText(job.kind === 'draw' ? (job.ok ? '抽到了！' : '这次没抽到') : (job.ok ? '猜对了！' : '不一样！'), TRAY.x, top - 6);
            } else {
              ctx.fillStyle = c.ink2; ctx.font = '14px ' + c.f; ctx.fillText('出来了！', TRAY.x, top - 6);
            }
            ctx.textAlign = 'left';
          }
        }
      }

      // 小怪兽说话
      if (bubbleT > 0 && bubble) {
        ctx.font = 'bold 15px ' + c.f;
        const bw = ctx.measureText(bubble).width + 22, bx = Math.min(W - bw - 6, Math.max(6, 245 - bw / 2)), by = 6;
        ctx.fillStyle = c.card; ctx.strokeStyle = c.ink; ctx.lineWidth = 2.5;
        PG.roundRect(ctx, bx, by, bw, 30, 10); ctx.fill(); ctx.stroke();
        ctx.fillStyle = c.ink; ctx.textAlign = 'center'; ctx.fillText(bubble, bx + bw / 2, by + 21); ctx.textAlign = 'left';
      }
    });

    function setup(r, input, p) {
      job = null;
      ruleCtl.set(r);
      if (p) putCtl.set(p);
      inF.input.value = input;
      gF.input.value = '';
    }
    api.guesses([
      {
        q: '放进去 3，规则是“乘 2 再加 1”，会出来几？',
        options: ['6', '7', '5'], answer: 1,
        why: '3 乘 2 是 6，再加 1 就是 7。小怪兽每次都照规则算，给它 3，就一定出来 7。',
        delay: 2700,
        apply: () => { setup('mul', '3'); go(true); },
      },
      {
        q: '抽签抽 5 次。把“不放回”改成“可以重复”，会不会抽到同一个名字？',
        options: ['会，有可能抽到同一个', '不会，永远不重复'], answer: 0,
        why: '“可以重复”就是抽完把名字放回去，下次还可能抽到它。“不放回”抽走就没了，所以不会重复。规则一改，结果就变了。',
        delay: 4000,
        apply: () => { setup('draw', '5', 'repeat'); go(true, true); },
      },
      {
        q: '规则还是“乘 2 再加 1”。想让它吐出 11，要放进去几？',
        options: ['5', '6', '11'], answer: 0,
        why: '倒着想：11 先减 1 是 10，再除以 2 是 5。放进去 5，5 乘 2 再加 1，正好 11。',
        delay: 2700,
        apply: () => { setup('mul', '5'); go(true); },
      },
    ]);

    api.say({
      left: '输入、处理、输出',
      right: '给它东西，它照规则算，再给你结果',
      example: '放进去 3（输入），小怪兽照“乘 2 再加 1”算（处理），吐出 7（输出）。抽签器也一样：名单进去，照规则抽，名字出来。',
      prompt: '我的小工具里，用户“放进去”的是什么？它是“照什么规则算”的？最后“显示出来”的是什么？请帮我标出这三样，用小学生能听懂的话说，先不要改。',
    });
  },

  thumb(ctx, w, h, t) {
    const ink = '#1b2440';
    const p = (t * 0.5) % 1;
    // 小怪兽
    ctx.fillStyle = '#fff'; ctx.strokeStyle = ink; ctx.lineWidth = 3;
    PG.roundRect(ctx, 115, 40, 90, 130, 18); ctx.fill(); ctx.stroke();
    ctx.fillStyle = ink; PG.roundRect(ctx, 138, 34, 44, 10, 4); ctx.fill();
    for (const ex of [143, 177]) { ctx.beginPath(); ctx.arc(ex, 68, 5, 0, Math.PI * 2); ctx.fill(); }
    // 齿轮
    ctx.save(); ctx.translate(160, 118); ctx.rotate(t * 3);
    ctx.fillStyle = '#ffd43b'; ctx.beginPath();
    for (let i = 0; i < 16; i++) { const a = (i * Math.PI) / 8, r = i % 2 ? 22 : 16; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    // 纸条：3 进去，7 出来
    const tk = (x, y, txt) => {
      ctx.fillStyle = '#fff'; ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
      PG.roundRect(ctx, x - 20, y - 15, 40, 30, 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ink; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(txt, x, y + 7); ctx.textAlign = 'left';
    };
    if (p < 0.45) { const q = p / 0.45; tk(40 + q * 120, 110 - Math.sin(q * Math.PI) * 80 - q * 70, '3'); }
    else tk(255 + Math.min(1, (p - 0.45) / 0.3) * 20, 150, '7');
  },
});
