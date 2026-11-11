/* AI 实验室：三句话（课程 K2.7）。“我想改___。现在是___。我希望变成___。”
   热身：换一碗面。然后让小艾改一个小网页，变成右边“目标”的样子。
   说不清的话（“让它更好看一点”），小艾只能乱猜；三句话说清楚，它就只改你说的那一处。 */
(function () {
  'use strict';
  const NAVY = '#1b2440';
  const font = (px, bold) => (bold ? 'bold ' : '') + px + 'px ' + getComputedStyle(document.body).fontFamily;
  function wrapLines(ctx, text, maxW) {
    const out = [];
    for (const para of String(text).split('\n')) {
      let cur = '';
      for (const ch of para) {
        if (ctx.measureText(cur + ch).width > maxW && cur) { out.push(cur); cur = ch; } else cur += ch;
      }
      out.push(cur);
    }
    return out;
  }
  function box(ctx, x, y, w, hh, r, fill, stroke, lw) {
    PG.roundRect(ctx, x, y, w, hh, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2.5; ctx.stroke(); }
  }
  function drawBot(ctx, cx, cy, sz, body, ink, t) {
    ctx.save();
    ctx.translate(cx, cy + Math.sin(t * 2.2) * 2);
    ctx.strokeStyle = ink; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, -sz * 0.5); ctx.lineTo(0, -sz * 0.7); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -sz * 0.76, sz * 0.09, 0, Math.PI * 2); ctx.fillStyle = '#ffd43b'; ctx.fill(); ctx.stroke();
    box(ctx, -sz * 0.5, -sz * 0.5, sz, sz * 0.86, sz * 0.22, body, ink, 3);
    box(ctx, -sz * 0.36, -sz * 0.36, sz * 0.72, sz * 0.5, sz * 0.12, '#ffffff', ink, 2);
    ctx.fillStyle = NAVY;
    for (const ex of [-0.15, 0.15]) { ctx.beginPath(); ctx.arc(sz * ex, -sz * 0.14, sz * 0.06, 0, Math.PI * 2); ctx.fill(); }
    ctx.beginPath(); ctx.arc(0, -sz * 0.05, sz * 0.12, 0.15 * Math.PI, 0.85 * Math.PI); ctx.strokeStyle = NAVY; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();
  }

  // ---------- 小网页 ----------
  const COL = {
    '白色': '#ffffff', '粉色': '#ffd6e8', '浅蓝色': '#d6ecff', '浅黄色': '#fff3c4',
    '蓝色': '#2f7cf6', '黄色': '#ffd43b', '绿色': '#1fb36f', '红色': '#ff5a47', '紫色': '#8a5cf5', '橙色': '#ff9f1a',
  };
  const PARTS = [
    { key: 'bg', label: '背景', vals: ['白色', '粉色', '浅蓝色', '浅黄色'] },
    { key: 'title', label: '标题', vals: ['小小的', '大大的'] },
    { key: 'btn', label: '按钮', vals: ['蓝色', '黄色', '绿色', '红色'] },
    { key: 'mon', label: '小怪兽', vals: ['绿色', '紫色', '橙色'] },
  ];
  const partOf = (k) => PARTS.find((p) => p.key === k);
  const phr = (v) => (v.endsWith('的') ? v : v + '的');
  const BASE = { bg: '白色', title: '小小的', btn: '蓝色', mon: '绿色' };
  const T1 = { ...BASE, btn: '黄色' };
  const T2 = { ...T1, bg: '粉色' };
  const T3 = { ...T2, title: '大大的' };
  const T4 = { ...T3, mon: '紫色', bg: '浅蓝色' };
  // 0 = 热身（面），1–4 = 网页关，5 = 自由改
  const ROUNDS = [null, { start: BASE, target: T1 }, { start: T1, target: T2 }, { start: T2, target: T3 },
    { start: T3, target: T4, two: true }];
  const same = (a, b) => PARTS.every((p) => a[p.key] === b[p.key]);

  function drawMonster(ctx, cx, cy, s, col, t) {
    ctx.save(); ctx.translate(cx, cy + Math.sin(t * 3) * 2 * s); ctx.scale(s, s);
    ctx.strokeStyle = NAVY; ctx.lineWidth = 2.5;
    ctx.fillStyle = col;
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * 10, -20); ctx.lineTo(d * 20, -36); ctx.lineTo(d * 22, -16); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-26, 26); ctx.quadraticCurveTo(-30, -26, 0, -26); ctx.quadraticCurveTo(30, -26, 26, 26);
    ctx.quadraticCurveTo(13, 20, 0, 26); ctx.quadraticCurveTo(-13, 20, -26, 26); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, -6, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = NAVY; ctx.beginPath(); ctx.arc(1, -5, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 9, 7, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
    ctx.restore();
  }
  // 小网页，原本大小 260×214
  function drawPage(ctx, x, y, k, st, t, glow) {
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    box(ctx, 0, 0, 260, 214, 12, '#eef1f6', NAVY, 2.5 / k);
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(16 + i * 14, 13, 4, 0, Math.PI * 2); ctx.fillStyle = ['#ff5a47', '#ffd43b', '#1fb36f'][i]; ctx.fill(); }
    ctx.fillStyle = COL[st.bg]; ctx.fillRect(2, 26, 256, 186);
    ctx.strokeStyle = NAVY; ctx.lineWidth = 2 / k; ctx.beginPath(); ctx.moveTo(0, 26); ctx.lineTo(260, 26); ctx.stroke();
    PG.roundRect(ctx, 0, 0, 260, 214, 12); ctx.lineWidth = 2.5 / k; ctx.stroke();
    ctx.fillStyle = NAVY; ctx.textAlign = 'center';
    ctx.font = font(st.title === '大大的' ? 32 : 17, true);
    ctx.fillText('我的小网页', 130, st.title === '大大的' ? 66 : 56);
    drawMonster(ctx, 130, 118, 1.05, COL[st.mon], t);
    box(ctx, 82, 162, 96, 34, 17, COL[st.btn], NAVY, 2.5 / k);
    ctx.fillStyle = st.btn === '黄色' ? NAVY : '#ffffff'; ctx.font = font(16, true); ctx.fillText('点我', 130, 185);
    ctx.textAlign = 'left';
    if (glow) { ctx.globalAlpha = Math.max(0, glow); ctx.strokeStyle = '#ffd43b'; ctx.lineWidth = 8 / k; PG.roundRect(ctx, -4, -4, 268, 222, 14); ctx.stroke(); }
    ctx.restore();
  }
  // 一碗面：spicy 0 不辣，1 辣，2 更辣
  function drawBowl(ctx, cx, cy, k, spicy, t) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    // 热气
    ctx.strokeStyle = '#9aa3ad'; ctx.lineWidth = 3;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      for (let j = 0; j < 12; j++) ctx.lineTo(i * 26 + Math.sin(j * 0.8 + t * 3 + i) * 5, -40 - j * 4);
      ctx.stroke();
    }
    ctx.fillStyle = spicy ? (spicy > 1 ? '#d83a2a' : '#f0603e') : '#f6d58a';
    ctx.strokeStyle = NAVY; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, -18, 78, 20, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // 面条
    ctx.strokeStyle = '#fff3c4'; ctx.lineWidth = 4;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 22 - 12, -22); ctx.quadraticCurveTo(i * 22, -10, i * 22 + 12, -24); ctx.stroke(); }
    // 辣椒
    for (let i = 0; i < (spicy === 2 ? 6 : spicy ? 3 : 0); i++) {
      const px = -54 + i * 22, py = -26 + (i % 2) * 8;
      ctx.fillStyle = '#c4161c'; ctx.beginPath(); ctx.ellipse(px, py, 8, 3.5, 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1fb36f'; ctx.fillRect(px + 5, py - 5, 3, 3);
    }
    // 碗
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = NAVY; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-82, -18); ctx.quadraticCurveTo(-78, 46, 0, 50); ctx.quadraticCurveTo(78, 46, 82, -18);
    ctx.quadraticCurveTo(0, 8, -82, -18); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#2f7cf6'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-66, 14); ctx.quadraticCurveTo(0, 32, 66, 14); ctx.stroke();
    ctx.restore();
  }
  function stampBig(ctx, x, y, text, k) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-0.12); ctx.scale(k, k);
    ctx.font = font(22, true);
    const w = ctx.measureText(text).width + 30;
    box(ctx, -w / 2, -22, w, 44, 10, 'rgba(255,255,255,0.92)', '#ff5a47', 4);
    ctx.fillStyle = '#ff5a47'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 1);
    ctx.restore(); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  const VAGUE = ['让它更好看一点', '帮我改一改', '变得酷一点'];
  // 热身用的三句话选项
  const NOODLE = {
    parts: [{ key: 'noodle', label: '这碗面' }, { key: 'chop', label: '这双筷子' }, { key: 'cup', label: '这杯水' }],
    now: ['辣的', '甜的', '凉的'],
    want: ['不辣的', '更辣的', '冰的'],
  };

  PG.register({
    id: 'say3',
    title: '三句话说清楚',
    concept: '三句话：把要求说清楚',
    kid: '说清楚改哪里、现在什么样、想要什么样，AI 就很少猜错',
    level: 'K2',
    color: 'sky',
    play: '先热身：用三句话请妈妈换一碗面。然后让小艾改网页，变成右边“目标”的样子。先试试只说“让它更好看一点”，再用三句话说清楚，看看有什么不一样。',

    mount(api) {
      const W = 480, H = 460;
      const s = api.stage(W, H);
      const ctx = s.ctx;
      const h = api.h;

      let round = 0, page = { ...BASE }, spicy = 1, sel = {}, temp = null, stampT = 9, stampText = '', glow = 0;
      let youSaid = '', aiSaid = '', who = '妈妈', passed = false;
      let timers = [];
      const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
      const clearLater = () => { timers.forEach(clearTimeout); timers = []; };
      api.onCleanup(clearLater);
      const R = () => ROUNDS[round];
      const target = () => (R() ? R().target : null);

      // ---------- 控件：三句话拼一拼 ----------
      const rRound = api.readout('第几关', '热身');
      const builder = h('div', { class: 'ctl', style: { gap: '10px' } });
      api.controlBox.append(builder);
      const rowPart = h('div', { class: 'seg' });
      const rowNow = h('div', { class: 'seg' });
      const rowWant = h('div', { class: 'seg' });
      const lab = (t) => h('span', { class: 'lab' }, t);
      builder.append(lab('我想改……'), rowPart, lab('现在是……'), rowNow, lab('我希望变成……'), rowWant);
      const preview = h('p', { style: { font: '20px/1.5 var(--display)', margin: '0' }, 'aria-live': 'polite' });
      builder.append(preview);
      const sendRow = h('div', { class: 'seg' });
      builder.append(sendRow);
      const sendBtn = api.button('发给小艾 ➤', () => send(), 'primary', sendRow);
      api.button('清空', () => { sel = {}; build(); api.sound('tick'); }, '', sendRow);
      const vagueBox = h('div', { class: 'ctl' }, lab('说一句不清楚的话试试：'));
      const vagueRow = h('div', { class: 'seg' });
      vagueBox.append(vagueRow);
      api.controlBox.append(vagueBox);
      const vagueBtns = VAGUE.map((v) => api.button('“' + v + '”', () => vague(v), '', vagueRow));
      const nextBtn = api.button('下一关 →', () => goRound(round + 1), 'primary');
      const tip = h('p', { style: { fontSize: '17px', margin: '0' }, 'aria-live': 'polite' });
      api.controlBox.append(tip);
      api.button('从头再来', () => goRound(0));

      function chip(label, on, fn) {
        const b = h('button', { class: 'btn', type: 'button', 'aria-pressed': String(!!on) }, label);
        b.addEventListener('click', () => { fn(); api.sound('pop'); });
        return b;
      }
      function nowOptions(pk) {
        const p = partOf(pk);
        if (p.vals.length <= 3) return p.vals;
        const i = p.vals.indexOf(page[pk]);
        const pickI = [i, (i + 1) % p.vals.length, (i + 2) % p.vals.length].sort((a, b) => a - b);
        return pickI.map((j) => p.vals[j]);
      }
      function sentence() {
        const blank = '___';
        let part = blank, now = blank, want = blank;
        if (round === 0) {
          if (sel.part) part = NOODLE.parts.find((p) => p.key === sel.part).label;
          if (sel.now) now = sel.now;
          if (sel.want) want = sel.want;
        } else {
          if (sel.part) part = partOf(sel.part).label;
          if (sel.now) now = phr(sel.now);
          if (sel.want) want = phr(sel.want);
        }
        return { text: '我想改' + part + '。现在是' + now + '。我希望变成' + want + '。', part, now, want };
      }
      function build() {
        rowPart.textContent = ''; rowNow.textContent = ''; rowWant.textContent = '';
        if (round === 0) {
          NOODLE.parts.forEach((p) => rowPart.append(chip(p.label, sel.part === p.key, () => { sel.part = p.key; build(); })));
          NOODLE.now.forEach((v) => rowNow.append(chip(v, sel.now === v, () => { sel.now = v; build(); })));
          NOODLE.want.forEach((v) => rowWant.append(chip(v, sel.want === v, () => { sel.want = v; build(); })));
        } else {
          PARTS.forEach((p) => rowPart.append(chip(p.label, sel.part === p.key, () => {
            if (sel.part !== p.key) { sel = { part: p.key }; }
            build();
          })));
          if (sel.part) {
            nowOptions(sel.part).forEach((v) => rowNow.append(chip(phr(v), sel.now === v, () => { sel.now = v; build(); })));
            partOf(sel.part).vals.forEach((v) => rowWant.append(chip(phr(v), sel.want === v, () => { sel.want = v; build(); })));
          } else {
            rowNow.append(h('span', { class: 'small' }, '先选上面“改哪里”'));
            rowWant.append(h('span', { class: 'small' }, '先选上面“改哪里”'));
          }
        }
        preview.textContent = sentence().text;
        sendBtn.disabled = !sel.part || !!temp || passed;
        vagueBtns.forEach((b) => { b.disabled = !!temp || passed; });
      }
      function sync() {
        rRound.set(round === 0 ? '热身' : round <= 4 ? round + ' / 4' : '自由改');
        nextBtn.hidden = !passed || round >= 5;
        nextBtn.textContent = round === 0 ? '开始改网页 →' : round < 4 ? '下一关 →' : '全部完成！';
        build();
      }
      function dropOverlay() { const o = api.stageBox.querySelector('.overlay'); if (o) o.remove(); }
      function goRound(i) {
        clearLater(); dropOverlay();
        if (i === 5) {
          round = 5; passed = false; temp = null; sel = {};
          youSaid = ''; who = '小艾'; aiSaid = '现在你来当设计师：想改哪里，就用三句话告诉我！';
          tip.textContent = '自由改：每次只改一件事，用三句话说。';
          api.sound('win');
          api.overlay('全部完成！你会用三句话了。点这里，自己随便改改看', () => {});
          sync(); return;
        }
        round = i; passed = false; temp = null; sel = {}; stampT = 9; glow = 0;
        if (i === 0) {
          spicy = 1; who = '妈妈'; youSaid = ''; aiSaid = '这碗面怎么了？你想换成什么样的？';
          tip.textContent = '热身：面太辣了，想换一碗。用三句话跟妈妈说清楚。';
        } else {
          page = { ...R().start }; who = '小艾'; youSaid = '';
          aiSaid = '你想让网页变成什么样？';
          tip.textContent = R().two
            ? '这次要改两个地方！每次只改一件事，用三句话说两次。'
            : '把网页变成右边“目标”的样子。先找找：哪里不一样？';
        }
        sync();
      }
      function stampIt(text) { stampText = text; stampT = 0; }
      function checkPass() {
        if (round >= 1 && round <= 4 && same(page, target())) {
          passed = true; api.sound('win'); glow = 1;
          tip.textContent = round < 4 ? '过关！三句话说清楚，小艾一次就改对了。' : '四关全过！按“全部完成”。';
        }
      }
      function send() {
        if (temp || passed) return;
        const sn = sentence();
        if (round === 0) {
          youSaid = sn.text; who = '妈妈';
          if (!sel.part) return;
          if (sel.part !== 'noodle') { aiSaid = '你是说' + sn.part + '吗？' + sn.part + '没问题呀，你想改的是哪个？'; api.sound('boing'); }
          else if (!sel.now) { aiSaid = '这碗面怎么了？现在是什么样的？'; api.sound('boing'); }
          else if (sel.now !== '辣的') { aiSaid = '这碗面现在不是' + sel.now + '呀，你再看看？'; api.sound('boing'); }
          else if (!sel.want) { aiSaid = '辣的面，然后呢？你希望变成什么样的？'; api.sound('boing'); }
          else if (sel.want === '更辣的') { spicy = 2; aiSaid = '好嘞，再加点辣椒！'; api.sound('pop'); tip.textContent = '妈妈照你说的做了……可这是你想要的吗？'; }
          else if (sel.want === '冰的') { aiSaid = '冰的面？好奇怪……你是说想要不辣的吗？'; api.sound('boing'); }
          else {
            spicy = 0; aiSaid = '明白！给你换一碗不辣的。'; stampIt('你说得很清楚！');
            passed = true; api.sound('win');
            tip.textContent = '三句话：改哪里（这碗面），现在什么样（辣的），想要什么样（不辣的）。';
          }
          sel = {}; sync(); return;
        }
        youSaid = (sel.part ? '我想改' + sn.part + '。' : '') + (sel.now ? '现在是' + sn.now + '。' : '') + (sel.want ? '我希望变成' + sn.want + '。' : '');
        who = '小艾';
        const pk = sel.part, p = partOf(pk);
        if (sel.now && sel.now !== page[pk]) {
          aiSaid = '咦？' + p.label + '现在不是' + phr(sel.now) + '呀。你说的是哪个' + p.label + '？';
          api.sound('boing'); tip.textContent = '看看网页：' + p.label + '现在是什么样？';
        } else if (!sel.want) {
          // 少了“我希望变成___”，只能猜
          const opts = p.vals.filter((v) => v !== page[pk] && !(target() && v === target()[pk]));
          const g = opts.length ? opts[Math.floor(Math.random() * opts.length)] : p.vals.find((v) => v !== page[pk]);
          aiSaid = '你想把' + p.label + '变成什么样呢？我猜……' + phr(g) + '？';
          tryTemp(pk, g, '小艾猜错了，撤回。少了“我希望变成___”，它不知道你要什么样。');
          api.sound('boing');
        } else if (sel.want === page[pk]) {
          aiSaid = p.label + '本来就是' + phr(sel.want) + '呀，不用改。'; api.sound('boing');
        } else {
          page[pk] = sel.want;
          aiSaid = '好的！只把' + p.label + '变成' + phr(sel.want) + '，别的都不动。' + (sel.now ? '' : '（下次把“现在是___”也说上，我更不会找错。）');
          stampIt('你说得很清楚！'); api.sound('ding');
          if (target() && !same(page, target())) tip.textContent = '小艾照你说的改了。和目标比一比，还有哪里不一样？';
          checkPass();
        }
        sel = {}; sync();
      }
      function tryTemp(pk, v, after) {
        temp = { pk, old: page[pk] };
        page[pk] = v; glow = 0.8;
        build();
        later(() => {
          if (!temp) return;
          page[temp.pk] = temp.old; temp = null;
          aiSaid = after; api.sound('tick');
          build();
        }, 2400);
      }
      function vague(text) {
        if (temp || passed) return;
        youSaid = text; who = round === 0 ? '妈妈' : '小艾';
        if (round === 0) {
          aiSaid = '更好？那……给你换一杯水？'; api.sound('boing');
          tip.textContent = '妈妈也只能乱猜。用三句话说清楚吧！';
          sync(); return;
        }
        const tg = target();
        const cands = [];
        for (const p of PARTS) for (const v of p.vals) {
          if (v === page[p.key]) continue;
          if (tg && v === tg[p.key]) continue; // 乱猜不会正好猜中
          cands.push([p.key, v]);
        }
        const [pk, v] = cands[Math.floor(Math.random() * cands.length)];
        aiSaid = '好看一点？我猜你是想……把' + partOf(pk).label + '变成' + phr(v) + '？';
        api.sound('boing');
        tip.textContent = '小艾在乱猜！它不知道你想改哪里。';
        tryTemp(pk, v, '猜错了，撤回。说清楚“改哪里、现在什么样、想要什么样”，我就不用猜啦。');
        sync();
      }

      // 点画面上的网页部件 = 选“我想改___”
      api.on(s.canvas, 'pointerdown', (e) => {
        if (round === 0 || passed || temp) return;
        const p = s.pos(e);
        const k = PAGE.k, px = (p.x - PAGE.x) / k, py = (p.y - PAGE.y) / k;
        if (px < 0 || px > 260 || py < 26 || py > 214) return;
        let key = 'bg';
        if (px > 82 && px < 178 && py > 158 && py < 200) key = 'btn';
        else if (px > 96 && px < 164 && py > 76 && py < 148) key = 'mon';
        else if (py < (page.title === '大大的' ? 80 : 66) && px > 60 && px < 200) key = 'title';
        if (sel.part !== key) sel = { part: key };
        api.sound('pop'); build();
      });

      const PAGE = { x: 14, y: 44, k: 1.05 };
      api.loop((dt, t) => {
        stampT += dt; glow = Math.max(0, glow - dt * 1.2);
        const c = { ink: api.color('--ink'), ink2: api.color('--ink-2'), card: api.color('--card'), sky: api.color('--sky'), sun: api.color('--sun') };
        s.clear();
        ctx.font = font(17, true); ctx.fillStyle = c.ink;
        ctx.fillText(round === 0 ? '热身：请妈妈换一碗面' : round <= 4 ? '第 ' + round + ' 关：把网页变成“目标”的样子' : '自由改：你来当设计师', 16, 27);

        // 左边：现在的样子
        if (round === 0) {
          box(ctx, 14, 44, 274, 224, 12, c.card, c.ink, 2.5);
          drawBowl(ctx, 151, 168, 1.15, spicy, t);
          ctx.font = font(15, true); ctx.fillStyle = c.ink2; ctx.fillText('现在的面', 26, 66);
        } else {
          drawPage(ctx, PAGE.x, PAGE.y, PAGE.k, page, t, glow);
          if (!passed && round <= 4) { ctx.font = font(13); ctx.fillStyle = c.ink2; ctx.fillText('点网页上的东西，也能选“改哪里”', 16, 284); }
        }
        // 右边：目标
        const tx = 304, ty = 60;
        if (round <= 4) {
          ctx.font = font(15, true); ctx.fillStyle = c.ink; ctx.fillText(round === 0 ? '你想要' : '目标', tx, ty - 6);
          if (round === 0) { box(ctx, tx, ty, 162, 128, 10, c.card, c.ink, 2); drawBowl(ctx, tx + 81, ty + 76, 0.72, 0, t); }
          else drawPage(ctx, tx, ty, 0.623, target(), t, 0);
          if (round === 0 || same(page, target())) {
            if (passed) { ctx.font = font(26, true); ctx.fillStyle = '#1fb36f'; ctx.fillText('✓', tx + 140, ty - 4); }
          }
        }
        if (round > 0) {
          drawBot(ctx, 420, 238, 40, c.sky, c.ink, t);
          ctx.font = font(13, true); ctx.fillStyle = c.ink2; ctx.textAlign = 'center'; ctx.fillText('小艾', 420, 284); ctx.textAlign = 'left';
        }

        // 对话
        let y = 296;
        if (youSaid) {
          ctx.font = font(16, true);
          const ls = wrapLines(ctx, '你：' + youSaid, W - 52);
          const hh = ls.length * 22 + 14;
          box(ctx, 14, y, W - 28, hh, 10, c.card, c.ink, 2);
          ctx.fillStyle = c.ink; ctx.textBaseline = 'top';
          ls.forEach((l, i) => ctx.fillText(l, 26, y + 8 + i * 22));
          ctx.textBaseline = 'alphabetic';
          y += hh + 8;
        }
        if (aiSaid) {
          ctx.font = font(16, true);
          const ls = wrapLines(ctx, who + '：' + aiSaid, W - 52);
          const hh = ls.length * 22 + 14;
          box(ctx, 14, y, W - 28, hh, 10, '#d6ecff', NAVY, 2);
          ctx.fillStyle = NAVY; ctx.textBaseline = 'top';
          ls.forEach((l, i) => ctx.fillText(l, 26, y + 8 + i * 22));
          ctx.textBaseline = 'alphabetic';
        }
        if (stampT < 2.6) stampBig(ctx, 190, 236, stampText, Math.max(1, 2 - stampT * 6));
        if (passed && round >= 1 && round <= 4) {
          ctx.save(); ctx.translate(385, 130); ctx.rotate(0.1);
          box(ctx, -46, -18, 92, 36, 18, '#1fb36f', NAVY, 3);
          ctx.fillStyle = NAVY; ctx.font = font(20, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('过关！', 0, 1); ctx.restore(); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        }
      });

      // ---------- 猜一猜 ----------
      api.guesses([
        {
          q: '只说“让它更好看一点”，小艾会改哪里？',
          options: ['一定改我想改的地方', '不一定，它会乱猜'], answer: 1,
          why: '看，小艾不知道你想改哪里，只能乱猜一个。你心里想的，它看不见。',
          apply: () => { goRound(1); vague('让它更好看一点'); },
          delay: 1300,
        },
        {
          q: '三句话少了“我希望变成___”，会怎样？',
          options: ['小艾知道我要什么样', '小艾不知道要变成什么样，只能猜'], answer: 1,
          why: '只说了“我想改按钮。现在是蓝色的。”，小艾不知道你想要什么颜色，只好乱猜。',
          apply: () => { goRound(1); sel = { part: 'btn', now: page.btn }; build(); send(); },
          delay: 1300,
        },
        {
          q: '“我想改按钮。现在是蓝色的。我希望变成黄色的。”小艾会改什么？',
          options: ['把整个网页都变黄', '只把按钮变成黄色', '把小怪兽变黄'], answer: 1,
          why: '三句话说清楚了改哪里、现在什么样、想要什么样，小艾就只改按钮，别的都不动。',
          apply: () => { goRound(1); sel = { part: 'btn', now: '蓝色', want: '黄色' }; build(); send(); },
          delay: 1100,
        },
      ]);

      api.say({
        left: '三句话',
        right: '我想改___。现在是___。我希望变成___。',
        example: '比如：“我想改按钮。现在是蓝色的。我希望变成黄色的。”说清楚改哪里、现在什么样、想要什么样，AI 就很少猜错。',
        promptIntro: '在你做网页的那个 AI 对话里试一试：填好空，再发给它。',
        prompt: '我想改网页的背景颜色。\n现在是____。\n我希望变成____。请给我完整的新代码。',
      });

      goRound(0);
    },

    thumb(ctx, w, h, t) {
      // 三句话的填空卡，空格一个一个填上
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = NAVY; ctx.lineWidth = 3;
      PG.roundRect(ctx, 34, 28, 252, 144, 14); ctx.fill(); ctx.stroke();
      const lines = [['我想改', '按钮'], ['现在是', '蓝色的'], ['我希望变成', '黄色的']];
      const step = Math.floor(t * 1.2) % 5;
      lines.forEach(([a, b], i) => {
        const y = 66 + i * 40;
        ctx.fillStyle = NAVY; ctx.font = 'bold 20px sans-serif'; ctx.fillText(a, 52, y);
        const x = 52 + ctx.measureText(a).width + 6;
        if (step > i) {
          ctx.fillStyle = i === 2 ? '#ffd43b' : i === 1 ? '#2f7cf6' : '#ffd43b';
          PG.roundRect(ctx, x - 4, y - 22, ctx.measureText(b).width + 10, 30, 8); ctx.fill();
          ctx.fillStyle = i === 1 ? '#ffffff' : NAVY; ctx.fillText(b, x + 1, y);
        } else {
          ctx.strokeStyle = NAVY; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
          ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x + 70, y + 4); ctx.stroke(); ctx.setLineDash([]);
        }
      });
    },
  });
})();
