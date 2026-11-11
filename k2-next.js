/* AI 实验室：AI 文字接龙（K2.1 的“接龙”比方，K2.2 第 5 步“一个字一个字冒出来”）。
   一台小小的“AI 接龙机”：它只读过下面这几十句话，记住了“哪个词后面常跟着哪个词”，
   然后一个词一个词猜着往下接。“胆子”越大，越敢挑不常见的词。
   没读过的事（我昨天穿的袜子），它也会接得很像真的——因为它是猜出来的。 */
(function () {
  'use strict';
  const NAVY = '#1b2440';
  const font = (px, bold) => (bold ? 'bold ' : '') + px + 'px ' + getComputedStyle(document.body).fontFamily;

  // 它读过的“书”：一句话一行，用空格分好词，后面是读到的次数
  const BOOK = [
    ['小猫 爱 吃 鱼 。', 6], ['小猫 爱 吃 小鱼干 。', 2], ['小猫 爱 吃 猫粮 。', 2], ['小猫 爱 睡觉 。', 2], ['小猫 爱 玩 毛线球 。', 2],
    ['小狗 爱 吃 骨头 。', 6], ['小狗 爱 吃 肉 。', 2], ['小狗 爱 跑步 。', 2],
    ['小兔 爱 吃 胡萝卜 。', 5], ['小兔 爱 吃 青菜 。', 2],
    ['小猴 爱 吃 香蕉 。', 5], ['小猴 爱 吃 桃子 。', 1],
    ['床前 明月 光 ， 疑是 地上 霜 。', 5],
    ['早上 起床 先 刷牙 。', 4], ['早上 起床 先 洗脸 。', 2], ['早上 起床 先 穿衣服 。', 2],
    ['一 二 三 四 五 。', 5], ['一 二 三 四 五 六 七 。', 1],
    ['我 喜欢 吃 西瓜 。', 3], ['我 喜欢 吃 苹果 。', 2], ['我 喜欢 画画 。', 3], ['我 喜欢 小猫 。', 2], ['我 喜欢 唱歌 。', 2],
    ['天空 是 蓝色 的 。', 4], ['大海 是 蓝色 的 。', 2], ['草地 是 绿色 的 。', 3], ['雪 是 白色 的 。', 3],
    ['香蕉 是 黄色 的 。', 2], ['草莓 是 红色 的 。', 2],
    ['小鸟 会 飞 。', 4], ['小鸟 会 唱歌 。', 3], ['小鱼 会 游泳 。', 4],
    ['今天 天气 真 好 。', 3], ['今天 天气 很 热 。', 1],
  ];
  const END = '。';
  const PUNCT = new Set(['。', '，']);

  // ---------- 小模型：数一数“前面是这几个词时，后面跟过什么” ----------
  const table = new Map(); // key: 前面 0~3 个词用 | 连起来
  const vocab = new Set();
  const uni = new Map();
  const bump = (m, k, n) => m.set(k, (m.get(k) || 0) + n);
  for (const [line, n] of BOOK) {
    const toks = line.split(' ');
    toks.forEach((tk, i) => {
      vocab.add(tk);
      if (!PUNCT.has(tk)) bump(uni, tk, n);
      for (let k = 1; k <= 3 && i - k >= 0; k++) {
        const key = toks.slice(i - k, i).join('|');
        if (!table.has(key)) table.set(key, new Map());
        bump(table.get(key), tk, n);
      }
    });
  }
  const maxLen = Math.max(...[...vocab].map((v) => v.length));
  // 把孩子打的字切成词：能认出的最长的词优先，认不出的一个字一块
  function cut(text) {
    const out = [];
    const s = [...text.replace(/\s+/g, '')];
    let i = 0;
    while (i < s.length) {
      let hit = s[i];
      for (let L = Math.min(maxLen, s.length - i); L > 1; L--) {
        const w = s.slice(i, i + L).join('');
        if (vocab.has(w)) { hit = w; break; }
      }
      out.push(hit); i += [...hit].length;
    }
    return out;
  }
  // 找它读过的最长的一段“前面”，返回候选词和次数
  function candidates(toks) {
    for (let k = Math.min(3, toks.length); k >= 1; k--) {
      const ctxT = toks.slice(-k);
      const m = table.get(ctxT.join('|'));
      if (m) {
        const list = [...m.entries()].map(([w, c]) => ({ w, c })).sort((a, b) => b.c - a.c);
        return { list, ctx: ctxT, full: k === Math.min(3, toks.length) };
      }
    }
    const list = [...uni.entries()].map(([w, c]) => ({ w, c })).sort((a, b) => b.c - a.c).slice(0, 8);
    return { list, ctx: [], full: false };
  }
  const TEMPS = [0, 0.5, 1, 2, 4]; // 胆子 1~5；1 = 只挑最常见的
  function chances(list, level) {
    const T = TEMPS[level - 1];
    if (!T) return list.map((x, i) => (i === 0 ? 1 : 0));
    const ws = list.map((x) => Math.pow(x.c, 1 / T));
    const sum = ws.reduce((a, b) => a + b, 0);
    return ws.map((x) => x / sum);
  }
  function sample(ps) {
    let r = Math.random();
    for (let i = 0; i < ps.length; i++) { r -= ps[i]; if (r <= 0) return i; }
    return ps.length - 1;
  }
  // 一口气把要接的词都想好（动画再一个一个放出来）
  function plan(startToks, level, maxNew) {
    const toks = startToks.slice();
    const steps = [];
    for (let n = 0; n < maxNew; n++) {
      const c = candidates(toks);
      const ps = chances(c.list, level);
      const pick = sample(ps);
      steps.push({ list: c.list, ps, pick, ctx: c.ctx, full: c.full });
      toks.push(c.list[pick].w);
      if (c.list[pick].w === END) break;
    }
    return steps;
  }

  function drawBot(ctx, x, y, s, blink, ink) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(0, -24); ctx.lineTo(0, -32); ctx.stroke();
    ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.arc(0, -34, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; PG.roundRect(ctx, -22, -24, 44, 38, 10); ctx.fill(); ctx.stroke();
    ctx.fillStyle = NAVY;
    if (blink) { ctx.fillRect(-12, -8, 8, 2.5); ctx.fillRect(4, -8, 8, 2.5); }
    else { ctx.beginPath(); ctx.arc(-8, -7, 4, 0, Math.PI * 2); ctx.arc(8, -7, 4, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillRect(-8, 4, 16, 3);
    ctx.restore();
  }

  PG.register({
    id: 'next',
    title: 'AI 接龙机',
    concept: 'AI 文字接龙（预测下一个字）',
    kid: 'AI 读过很多很多文字，它是一个字一个字猜着往下接的',
    level: 'K2',
    color: 'sun',
    play: '在旁边点一个开头，比如“小猫爱吃”，看接龙机怎么一个词一个词往下接。柱子越长，它越可能挑那个词。',

    mount(api) {
      const W = 480, H = 340;
      const s = api.stage(W, H);
      const ctx = s.ctx;
      const h = api.h;

      let mode = 'watch';
      let brave = 2;
      let gen = null;          // 正在接的这一句
      let history = [];        // 刚才接出来的
      let queue = [];          // 猜一猜里连着接几次
      let note = '';           // 最下面的一句小提示
      let round = null;        // “我也来当 AI”
      let startText = '小猫爱吃';
      let flash = 0;

      const STARTS = ['小猫爱吃', '小狗爱吃', '床前明月', '早上起床先', '一二三四', '我喜欢', '我昨天穿的袜子是'];
      const ROUNDS = ['小猫爱吃', '小狗爱吃', '床前明月', '一二三四', '早上起床先'];
      const DISTRACT = ['袜子', '霜', '跑步', '雪', '唱歌', '天空', '游泳'];
      const SOCK = '我昨天穿的袜子是';

      // ---------- 接龙 ----------
      function start(text, opts) {
        opts = opts || {};
        startText = text;
        const toks = cut(text);
        let steps = plan(toks, brave, opts.maxNew || 10);
        if (opts.avoid) {
          for (let k = 0; k < 20 && opts.avoid.includes(text + steps.map((x) => x.list[x.pick].w).join('')); k++) steps = plan(toks, brave, opts.maxNew || 10);
        }
        if (opts.forcePick != null) steps[0].pick = opts.forcePick;
        gen = { text, steps, i: 0, phase: 'think', t: 0, typed: 0, words: [], speed: opts.speed || 1, onDone: opts.onDone, sock: text === SOCK };
        note = '';
        api.sound('step');
      }
      const genWord = () => gen.steps[gen.i].list[gen.steps[gen.i].pick].w;
      function finish() {
        const full = gen.text + gen.words.join('');
        if (mode === 'watch') {
          history.unshift({ text: full, brave });
          history = history.slice(0, 3);
          if (gen.text === '小猫爱吃') done('cat');
          if (brave >= 4) done('brave');
          if (gen.sock) done('sock');
          if (!STARTS.includes(gen.text)) done('own');
        }
        if (gen.sock) note = '它从没读过你的袜子，可还是接得很像真的！';
        api.sound('ding');
        const cb = gen.onDone;
        gen.phase = 'done';
        if (cb) cb();
        else if (queue.length) setTimeout(() => { const q = queue.shift(); if (q) q(); }, 350);
      }
      function tick(dt) {
        if (!gen || gen.phase === 'done') return;
        gen.t += dt * gen.speed;
        if (gen.phase === 'think' && gen.t > 0.75) { gen.phase = 'pick'; gen.t = 0; api.sound('tick'); }
        else if (gen.phase === 'pick' && gen.t > 0.5) { gen.phase = 'type'; gen.t = 0; gen.typed = 0; }
        else if (gen.phase === 'type') {
          const w = [...genWord()];
          gen.typed = Math.min(w.length, Math.floor(gen.t / 0.1) + 1);
          if (gen.t > w.length * 0.1 + 0.15) {
            gen.words.push(genWord());
            const last = genWord() === END;
            gen.i++;
            if (last || gen.i >= gen.steps.length) { gen.i = 0; finish(); }
            else { gen.phase = 'think'; gen.t = 0; api.sound('pop'); }
          }
        }
      }

      // ---------- 我也来当 AI ----------
      function newRound(i) {
        const text = ROUNDS[i];
        const c = candidates(cut(text));
        const opts = [c.list[0].w];
        if (c.list[1]) opts.push(c.list[1].w);
        const pool = DISTRACT.filter((w) => !c.list.some((x) => x.w === w));
        while (opts.length < 3) {
          const w = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
          opts.push(w);
        }
        for (let k = opts.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [opts[k], opts[j]] = [opts[j], opts[k]]; }
        round = { i, text, opts, chosen: null, score: round ? round.score : 0, ok: null, wait: 0 };
        gen = { text, steps: [], i: 0, phase: 'wait', t: 0, typed: 0, words: [], speed: 1 };
        startText = text;
      }
      function choose(k) {
        if (!round || round.chosen != null || !round.opts[k]) return;
        round.chosen = k;
        api.sound('pop');
        // 柱子照它读到的次数画；当 AI 的时候，接龙机挑最常见的那个
        const keep = brave;
        brave = 3;
        start(round.text, { maxNew: 1, forcePick: 0, onDone: () => {
          const ai = gen.words[0];
          round.ok = ai === round.opts[k];
          if (round.ok) { round.score++; rScore.set(round.score + ' / ' + ROUNDS.length); api.sound('ding'); flash = 0.6; }
          else api.sound('boing');
          if (round.score >= 3) done('me');
          round.wait = 1.8;
        } });
        brave = keep;
      }
      function nextRound() {
        if (round.i + 1 < ROUNDS.length) newRound(round.i + 1);
        else {
          const sc = round.score;
          round.over = true;
          api.sound('win');
          api.overlay('5 题猜完啦！你和 AI 想的一样的有 ' + sc + ' 题。点这里再来一轮', () => { round = null; newRound(0); rScore.set('0 / ' + ROUNDS.length); });
        }
      }

      // ---------- 控件 ----------
      const modeCtl = api.choice({
        label: '玩什么', value: 'watch',
        options: [{ value: 'watch', label: '看 AI 接' }, { value: 'me', label: '我也来当 AI' }],
        onChange: (v) => {
          mode = v; queue = [];
          watchBox.hidden = v !== 'watch';
          rScore.el.hidden = v !== 'me';
          const o = api.stageBox.querySelector('.overlay'); if (o) o.remove();
          if (v === 'me') { round = null; newRound(0); rScore.set('0 / ' + ROUNDS.length); api.setHint('先猜：下一个词会是哪个？点下面的大按钮（或按 1、2、3）。再看接龙机挑了哪个。'); }
          else { round = null; api.setHint('在旁边点一个开头，看接龙机怎么一个词一个词往下接。柱子越长，它越可能挑那个词。'); start(startText); }
        },
      });
      const watchBox = h('div', { style: { display: 'grid', gap: '12px' } });
      api.controlBox.append(watchBox);
      const startRow = h('div', { class: 'seg' });
      watchBox.append(h('div', { class: 'ctl' }, h('span', { class: 'lab' }, '选一个开头'), startRow));
      STARTS.forEach((t) => api.button(t + '……', () => { queue = []; start(t); }, '', startRow));
      const own = h('input', { type: 'text', maxlength: 12, id: 'next-own', placeholder: '比如：小兔爱', style: { font: '18px/1.3 var(--body)', padding: '8px 10px', border: '2.5px solid var(--ink)', borderRadius: '10px', background: 'var(--card)', color: 'var(--ink)', flex: '1', minWidth: '0' } });
      const goOwn = () => {
        const v = own.value.trim();
        if (!v) { api.toast('先打几个字'); own.focus(); return; }
        queue = []; start(v);
      };
      own.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); goOwn(); } });
      const ownRow = h('div', { style: { display: 'flex', gap: '8px' } }, own);
      watchBox.append(h('div', { class: 'ctl' }, h('label', { class: 'lab', for: 'next-own' }, '或者自己打一个开头'), ownRow));
      api.button('让它接', goOwn, 'primary', ownRow);
      api.button('同一个开头，再接一次', () => { queue = []; start(startText); }, '', watchBox);
      const braveCtl = api.slider({
        label: '胆子大小', min: 1, max: 5, value: brave,
        note: '1 = 只挑最常见的　5 = 敢挑不常见的',
        onInput: (v) => { brave = v; },
      });
      const rScore = api.readout('和 AI 想的一样', '0 / ' + ROUNDS.length);
      rScore.el.hidden = true;
      const rDone = api.readout('完成的小任务', '0 / 5');
      const MISSIONS = [
        ['cat', '让它接“小猫爱吃……”'],
        ['brave', '把胆子调到 4 或 5，再接一次'],
        ['sock', '问它“我昨天穿的袜子是……”'],
        ['own', '自己打一个开头，让它接'],
        ['me', '“我也来当 AI”里，和 AI 想的一样 3 次'],
      ];
      const got = {};
      const mList = h('ol', { style: { margin: '0', paddingLeft: '1.4em', display: 'grid', gap: '2px', fontSize: '15px' } });
      api.controlBox.append(h('div', { class: 'ctl' }, h('span', { class: 'lab' }, '小任务'), mList),
        h('p', { class: 'small grown' }, '真的 AI 一次猜一小块，叫 token（词元），可能是一个字，也可能是一个词。“胆子”在大人那里叫 temperature（温度）。'));
      function drawMissions() {
        mList.textContent = '';
        const cur = MISSIONS.findIndex(([k]) => !got[k]);
        MISSIONS.forEach(([k, t], i) => mList.append(h('li', { style: { fontWeight: i === cur ? '700' : '400', color: got[k] ? 'var(--good)' : i === cur ? 'var(--ink)' : 'var(--ink-2)' } }, (got[k] ? '✓ ' : '') + t)));
      }
      function done(k) {
        if (got[k]) return;
        got[k] = true;
        const n = Object.keys(got).length;
        rDone.set(n + ' / ' + MISSIONS.length);
        drawMissions();
        if (n === MISSIONS.length) setTimeout(() => { api.sound('win'); api.overlay('全部完成！你知道了：AI 是一个词一个词猜着接的，所以会猜错。点这里接着玩', () => {}); }, 1200);
        else api.toast('完成一个小任务！');
      }
      drawMissions();

      // ---------- 摸一摸 ----------
      const optRect = (k) => ({ x: 14 + k * 154, y: 276, w: 144, h: 52 });
      api.on(s.canvas, 'pointerdown', (e) => {
        const p = s.pos(e);
        if (mode === 'me' && round && round.chosen == null) {
          for (let k = 0; k < 3; k++) {
            const r = optRect(k);
            if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) { choose(k); return; }
          }
        } else if (mode === 'watch' && p.y < 100 && (!gen || gen.phase === 'done')) { queue = []; start(startText); }
      });
      api.on(window, 'keydown', (e) => {
        const tag = e.target && e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        const onBtn = e.target && e.target.closest && e.target.closest('button, a, select');
        if (mode === 'me' && /^[123]$/.test(e.key)) choose(Number(e.key) - 1);
        else if (mode === 'watch' && (e.key === ' ' || e.key === 'Enter') && !onBtn) { e.preventDefault(); queue = []; start(startText); }
      });

      // ---------- 画 ----------
      function sentenceLayout(maxW) {
        // 每个字一格，记下它是开头的字，还是接出来的第几个词
        const chars = [...gen.text].map((ch) => ({ ch, k: -1 }));
        gen.words.forEach((w, k) => [...w].forEach((ch) => chars.push({ ch, k })));
        if (gen.phase === 'type') [...genWord()].slice(0, gen.typed).forEach((ch) => chars.push({ ch, k: gen.words.length }));
        const lines = [[]]; let x = 0;
        for (const c of chars) {
          const cw = ctx.measureText(c.ch).width;
          if (x + cw > maxW && lines[lines.length - 1].length) { lines.push([]); x = 0; }
          lines[lines.length - 1].push({ ...c, x, w: cw }); x += cw;
        }
        return lines;
      }

      api.loop((dt, t) => {
        tick(dt);
        flash = Math.max(0, flash - dt);
        if (round && round.wait > 0) { round.wait -= dt; if (round.wait <= 0 && !round.over) nextRound(); }
        const ink = api.color('--ink'), card = api.color('--card'), line = api.color('--line'), sun = api.color('--sun'),
          grape = api.color('--grape'), sky = api.color('--sky'), grass = api.color('--grass'), tomato = api.color('--tomato'), ink2 = api.color('--ink-2');
        s.clear();
        ctx.textBaseline = 'middle';

        // 句子框
        ctx.fillStyle = card; ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
        PG.roundRect(ctx, 10, 10, W - 20, 86, 14); ctx.fill(); ctx.stroke();
        const thinking = gen && gen.phase === 'think';
        drawBot(ctx, 42, 58 + (thinking ? Math.sin(t * 14) * 1.5 : 0), 1, Math.sin(t * 1.3) > 0.97, ink);
        if (gen) {
          ctx.font = font(26, true);
          const lines = sentenceLayout(W - 108).slice(-2);
          const y0 = lines.length > 1 ? 36 : 53;
          let endX = 80, endY = y0;
          lines.forEach((ln, li) => {
            ln.forEach((c) => {
              const y = y0 + li * 34;
              ctx.fillStyle = c.k < 0 ? ink : grape;
              ctx.fillText(c.ch, 80 + c.x, y);
              if (c.k >= 0) { ctx.fillStyle = c.k % 2 ? sky : grape; ctx.fillRect(80 + c.x + 1, y + 15, c.w - 2, 3); }
              endX = 80 + c.x + c.w; endY = y;
            });
          });
          if (gen.phase !== 'done' && Math.floor(t * 2.5) % 2 === 0) { ctx.fillStyle = ink; ctx.fillRect(endX + 3, endY - 13, 3, 26); }
        }

        // 它在想什么
        const step = gen && gen.steps[gen.i];
        const showBars = step && gen.phase !== 'wait';
        ctx.font = font(14); ctx.fillStyle = ink2; ctx.textAlign = 'left';
        let say = '';
        if (mode === 'me' && round && round.chosen == null) say = '第 ' + (round.i + 1) + ' 题：你先猜，下一个词会是哪个？';
        else if (showBars && gen.phase !== 'done') {
          say = step.ctx.length
            ? (step.full ? '读过的句子里，“' : '没读过这一整句，只看“') + step.ctx.join(' ') + '”后面跟过：'
            : '这些词它都没读过……只好挑它读得最多的词瞎猜：';
        } else if (gen && gen.phase === 'done') say = '接好了！柱子是它接第一个词时在想的：';
        ctx.fillText(say, 14, 114, W - 28);

        // 柱子
        if (showBars) {
          const k = gen.phase === 'think' ? Math.min(1, gen.t / 0.5) : 1;
          step.list.slice(0, 5).forEach((c, i) => {
            const y = 136 + i * 26;
            const picked = i === step.pick && gen.phase !== 'think';
            const blink = gen.phase === 'pick' && Math.floor(t * 10) % 2 === 0;
            ctx.textAlign = 'right'; ctx.font = font(17, picked); ctx.fillStyle = picked ? grape : ink;
            ctx.fillText(c.w === END ? '。（说完）' : c.w, 112, y);
            ctx.fillStyle = line; PG.roundRect(ctx, 120, y - 9, 250, 18, 6); ctx.fill();
            const pw = 250 * step.ps[i] * k;
            if (pw > 1) { ctx.fillStyle = picked ? (blink ? sun : grape) : sky; PG.roundRect(ctx, 120, y - 9, Math.max(6, pw), 18, 6); ctx.fill(); }
            ctx.textAlign = 'left'; ctx.font = font(14, true); ctx.fillStyle = ink;
            ctx.fillText(Math.round(step.ps[i] * 100) + '%', 376, y);
            ctx.textAlign = 'right'; ctx.font = font(12); ctx.fillStyle = ink2;
            ctx.fillText('读到 ' + c.c + ' 次', W - 10, y);
          });
          if (step.list.length > 5) { ctx.textAlign = 'left'; ctx.font = font(12); ctx.fillStyle = ink2; ctx.fillText('还有 ' + (step.list.length - 5) + ' 个更少见的……', 120, 262); }
        } else if (mode === 'me') {
          ctx.textAlign = 'center'; ctx.font = font(40, true); ctx.fillStyle = line;
          ctx.fillText('？', W / 2, 196);
        }
        ctx.textAlign = 'left';

        // 最下面
        if (mode === 'me' && round) {
          round.opts.forEach((w, i) => {
            const r = optRect(i);
            const isPick = round.chosen === i;
            const isAI = gen && gen.phase === 'done' && gen.words[0] === w;
            ctx.fillStyle = isAI ? grass : isPick ? sun : card;
            ctx.strokeStyle = ink; ctx.lineWidth = isPick ? 4 : 2.5;
            PG.roundRect(ctx, r.x, r.y, r.w, r.h, 12); ctx.fill(); ctx.stroke();
            ctx.fillStyle = isAI || isPick ? NAVY : ink; ctx.font = font(22, true); ctx.textAlign = 'center';
            ctx.fillText(w, r.x + r.w / 2, r.y + r.h / 2 + 1);
            ctx.font = font(11); ctx.textAlign = 'left'; ctx.fillText(String(i + 1), r.x + 7, r.y + 11);
          });
          if (round.ok != null) {
            ctx.textAlign = 'center'; ctx.font = font(16, true); ctx.fillStyle = round.ok ? grass : tomato;
            ctx.fillText(round.ok ? '你和 AI 想的一样！' : 'AI 挑的是“' + gen.words[0] + '”：它读到最多的那个', W / 2, 266);
          }
        } else {
          ctx.font = font(13); ctx.fillStyle = ink2; ctx.textAlign = 'left';
          if (note) {
            ctx.font = font(16, true); ctx.fillStyle = tomato;
            ctx.fillText(note, 14, 282, W - 28);
          } else if (history.length) {
            ctx.fillText('刚才接出来的：', 14, 280);
          }
          ctx.font = font(15); ctx.fillStyle = ink;
          history.slice(0, note ? 1 : 3).forEach((it, i) => {
            ctx.fillText('· ' + it.text + '（胆子 ' + it.brave + '）', 14, (note ? 310 : 300) + i * 19, W - 28);
          });
        }
        if (flash > 0) { ctx.globalAlpha = flash; PG.drawStar(ctx, W - 40, 50, 22, '#ffd43b', ink); ctx.globalAlpha = 1; }
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      });

      // ---------- 猜一猜 ----------
      const toWatch = () => { if (mode !== 'watch') modeCtl.set('watch'); queue = []; };
      api.guesses([
        {
          q: '“小猫爱吃……”它最可能接什么？',
          options: ['鱼', '骨头', '胡萝卜'], answer: 0,
          why: '它读过的句子里，“小猫爱吃”后面最常跟的就是“鱼”（读到 6 次）。它没尝过鱼，是读得多了猜到的。“骨头”它也读过，可那是跟在“小狗爱吃”后面的。',
          apply: () => { toWatch(); braveCtl.set(1); start('小猫爱吃'); },
          delay: 2800,
        },
        {
          q: '把“胆子”调到最大，同一个开头连着接 3 次，每次接的会一样吗？',
          options: ['每次都一样', '不一定一样'], answer: 1,
          why: '胆子大，它就敢挑不常见的词，每次像抽签一样，接出来的常常不一样。看最下面“刚才接出来的”。胆子调到 1，它就每次都挑最常见的，次次一样。',
          apply: () => {
            toWatch(); braveCtl.set(5); history = [];
            const run = () => start('小猫爱', { speed: 2.2, avoid: history.map((x) => x.text) });
            queue = [run, run];
            run();
          },
          delay: 6800,
        },
        {
          q: '问它“我昨天穿的袜子是……”，它会怎么接？',
          options: ['说出你袜子真正的颜色', '说“我不知道”', '也编一个颜色出来，看起来很确定'], answer: 2,
          why: '它从来没读过你的袜子。可它是接龙机：读过的句子里，“是”后面常跟颜色，它就接了一个颜色，说得像真的一样。真的 AI 有时会老实说“不知道”，但也常常这样编。所以 AI 会猜错，重要的事要自己核对。',
          apply: () => { toWatch(); braveCtl.set(2); start(SOCK); },
          delay: 4600,
        },
      ]);

      api.say({
        left: 'AI 说话',
        right: '读过很多文字，一个字一个字猜着往下接',
        example: '“床前明月”后面接“光”，因为它读过很多遍。没读过的事，比如你的袜子，它也会猜一个，所以会说错。',
        promptIntro: '把这句话发给 AI 对话工具，看它的回答是不是一个字一个字冒出来的：',
        prompt: '你是怎么知道下一句该说什么的？请用 10 岁小朋友能听懂的话告诉我。',
      });

      start(startText);
    },

    thumb(ctx, w, h, t) {
      const ink = NAVY;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = ink; ctx.lineWidth = 3;
      PG.roundRect(ctx, 20, 18, 280, 60, 14); ctx.fill(); ctx.stroke();
      drawBot(ctx, 50, 56, 0.8, false, ink);
      const ph = t % 3;
      ctx.font = 'bold 24px sans-serif'; ctx.textBaseline = 'middle';
      ctx.fillStyle = ink; ctx.fillText('小猫爱吃', 80, 48);
      if (ph > 1.6) { ctx.fillStyle = '#7b4fe0'; ctx.fillText('鱼', 178, 48); }
      if (ph < 1.6 || Math.floor(t * 3) % 2) { ctx.fillStyle = ink; ctx.fillRect(ph > 1.6 ? 206 : 180, 36, 3, 24); }
      const bars = [['鱼', 0.6], ['小鱼干', 0.2], ['猫粮', 0.2]];
      const k = Math.min(1, ph / 0.9);
      bars.forEach(([wd, p], i) => {
        const y = 104 + i * 30;
        ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.font = 'bold 16px sans-serif'; ctx.fillText(wd, 92, y);
        ctx.fillStyle = 'rgba(255,255,255,.5)'; PG.roundRect(ctx, 100, y - 9, 180, 18, 6); ctx.fill();
        ctx.fillStyle = i === 0 && ph > 1.2 ? '#7b4fe0' : ink; PG.roundRect(ctx, 100, y - 9, Math.max(6, 180 * p * k), 18, 6); ctx.fill();
      });
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    },
  });
})();
