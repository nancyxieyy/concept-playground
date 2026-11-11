/* AI 实验室：用 AI 的三条规矩（课程 K2.4）。
   规矩一：不告诉 AI 自己的真实信息（分卡片 + 生日贺卡情景）；规矩二：重要的事要核对（三个情景）；
   规矩三：作品里哪部分是 AI 做的，大方说出来（给作品贴标签 + 选一句诚实的话）。每条规矩一枚徽章。
   题目里的“信息”全是占位说法（“我的真名”“我学校的名字”），不出现任何像真的个人信息。 */
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
  function bubble(ctx, text, x, y, maxW, px, fill, ink, bold) {
    ctx.font = font(px, bold);
    const pad = 12, lh = Math.round(px * 1.4);
    const ls = wrapLines(ctx, text, maxW - pad * 2);
    const w = Math.max(...ls.map((l) => ctx.measureText(l).width)) + pad * 2;
    const hh = ls.length * lh + pad * 2 - (lh - px) + 4;
    box(ctx, x, y, w, hh, 14, fill, ink, 2.5);
    ctx.fillStyle = ink; ctx.textBaseline = 'top';
    ls.forEach((l, i) => ctx.fillText(l, x + pad, y + pad + i * lh));
    ctx.textBaseline = 'alphabetic';
    return { x, y, w, h: hh };
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
  // 一个原创的小朋友头像（同学）
  function drawFriend(ctx, cx, cy, r, ink) {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = '#ffd9b3'; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy - r * 0.2, r, Math.PI * 1.05, Math.PI * 1.95); ctx.fillStyle = NAVY; ctx.fill();
    ctx.fillStyle = NAVY;
    ctx.beginPath(); ctx.arc(cx - r * 0.35, cy + r * 0.05, r * 0.11, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.35, cy + r * 0.05, r * 0.11, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy + r * 0.3, r * 0.28, 0.1 * Math.PI, 0.9 * Math.PI); ctx.strokeStyle = NAVY; ctx.lineWidth = 2; ctx.stroke();
  }
  // 小恐龙（作品里的“角色图”）
  function drawDino(ctx, cx, cy, s) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
    ctx.lineWidth = 2.5 / s; ctx.strokeStyle = NAVY; ctx.fillStyle = '#4cc38a';
    ctx.beginPath(); ctx.ellipse(0, 6, 22, 15, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-20, -10, 12, 10, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(20, 4); ctx.lineTo(36, 12); ctx.lineTo(18, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd43b';
    for (const x of [-6, 4, 14]) { ctx.beginPath(); ctx.moveTo(x - 5, -7); ctx.lineTo(x, -16); ctx.lineTo(x + 5, -7); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = '#ff5a47'; ctx.beginPath(); ctx.moveTo(-30, -18); ctx.lineTo(-20, -34); ctx.lineTo(-10, -18); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = NAVY; ctx.beginPath(); ctx.arc(-23, -11, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ---------- 题目 ----------
  const PRIV = [
    { t: '我喜欢恐龙', ans: 0, why: '喜欢什么，可以跟 AI 说。' },
    { t: '我的真名', ans: 1, why: '真名不说。需要名字的时候，用你的代号。' },
    { t: '我想做一个跳跳游戏', ans: 0, why: '想做什么，正要告诉 AI！' },
    { t: '我家住址', ans: 1, why: '住址不说。就像不会把家在哪告诉路上的陌生人。' },
    { t: '我 10 岁', ans: 0, why: '只说年龄可以，名字不用说。' },
    { t: '我的电话号码', ans: 1, why: '电话号码不说。' },
    { t: '我的代号 A01', ans: 0, why: '代号就是用来跟 AI 说的！' },
    { t: '我的照片', ans: 1, photo: true, why: '真人照片不发：照片里有你的脸、校服、窗外，别人能认出你、知道你在哪。画的角色图可以。' },
    { t: '我学校的名字', ans: 1, why: '学校的名字不说，“我的学校”就够了。' },
  ];
  const BDAY = [
    { t: '我叫（我的真名），同桌叫（同桌的真名），我们在（我学校的名字）上学。', ok: false, why: '不行！真名、学校都不能告诉 AI。' },
    { t: '我叫 A01，同桌就叫“我的同桌”，学校不用写。', ok: true, why: '对！用代号。贺卡打印出来以后，真名自己用笔写上。' },
    { t: '我发一张我和同桌的合照给你看。', ok: false, why: '不行！照片里有你们的脸和校服，也不能发。' },
  ];
  const CHECK = [
    { t: '你问 AI “蜘蛛是昆虫吗？”，答案要写进科学作业。', ans: 1, why: '要交的作业，要核对：翻科学课本，或者问老师。' },
    { t: '你让 AI 讲个笑话，自己笑一笑就算了。', ans: 0, why: '只是玩，不用核对。' },
    { t: 'AI 说：“这种蘑菇可以吃。”', ans: 1, adult: true, why: '一定要核对，还要问大人！跟身体有关的事，AI 说了也不能直接照做。' },
  ];
  // 作品：恐龙跳跳。ans 0 = AI 做的，1 = 我想的、我改的
  const WORK = [
    { part: '角色图', t: '角色图：我告诉 AI 要一只戴帽子的小恐龙，AI 画出来的。', ans: 0, why: '图是 AI 画的（画什么样子是你说的）。' },
    { part: '名字', t: '游戏名字“恐龙跳跳”：我自己想的。', ans: 1, why: '名字是你想的。' },
    { part: '故事', t: '故事：小恐龙要跳过石头回家。我自己编的。', ans: 1, why: '故事是你编的。' },
    { part: '代码', t: '网页代码：是 AI 写的。', ans: 0, why: '代码是 AI 写的。' },
  ];
  const HONEST = [
    { t: '对，全是我一个人做的！', ok: false, why: '这样说不诚实：图和代码是 AI 做的。' },
    { t: '图和代码是我让 AI 做的；名字和故事是我自己想的。', ok: true, why: '说得清清楚楚！用 AI 不丢人，就像用计算器、用字典。' },
    { t: '都是 AI 做的，我什么也没做。', ok: false, why: '也不对：名字和故事是你想的！大方说清楚哪部分是谁做的就好。' },
  ];
  const PHASES = [
    { type: 'sort', rule: 0, title: '规矩一：这个能跟 AI 说吗？', size: 26, cards: PRIV,
      bins: [{ label: '可以跟 AI 说', sub: '喜欢的、想做的', col: '--grass' }, { label: '不能说', sub: '用代号代替', col: '--tomato' }] },
    { type: 'pick', rule: 0, title: '规矩一：帮同桌做生日贺卡', who: 'ai', opts: BDAY,
      ask: '好呀，我来帮你写贺卡！你的名字是什么？同桌叫什么？你们在哪个学校？' },
    { type: 'sort', rule: 1, title: '规矩二：要不要核对？', size: 20, cards: CHECK,
      bins: [{ label: '不用核对', sub: '只是玩一玩', col: '--grass' }, { label: '要核对', sub: '翻书、上网查、问大人', col: '--tomato' }] },
    { type: 'sort', rule: 2, title: '规矩三：哪部分是 AI 做的？', size: 18, poster: true, cards: WORK,
      bins: [{ label: 'AI 做的', sub: '', col: '--sky' }, { label: '我想的、我改的', sub: '', col: '--sun' }] },
    { type: 'pick', rule: 2, title: '规矩三：同学来看你的作品', who: 'friend', poster: true, opts: HONEST,
      ask: '哇，这都是你做的吗？' },
  ];
  const BADGE = ['保护自己', '会核对', '大方说'];

  PG.register({
    id: 'rules',
    title: 'AI 三条规矩',
    concept: '用 AI 的三条规矩',
    kid: '不说真实信息；重要的事要核对；哪部分是 AI 做的，大方说出来',
    level: 'K2',
    color: 'grass',
    play: '闯三关，拿三枚规矩徽章！把卡片拖进对的框（也可以点框或按按钮），遇到问题就选一个最好的回答。',

    mount(api) {
      const W = 480, H = 500;
      const s = api.stage(W, H);
      const ctx = s.ctx;
      const h = api.h;

      let ph = 0, ci = 0, anim = null, pickRes = null, wrongPicks = new Set(), shake = 0, demo = false, finished = false;
      let earned = [false, false, false], tags = [null, null, null, null], cele = null, optRects = [];
      const card = { x: W / 2, y: 0, tx: W / 2, ty: 0, drag: false, ox: 0, oy: 0 };
      let timers = [];
      const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
      const clearLater = () => { timers.forEach(clearTimeout); timers = []; };
      api.onCleanup(clearLater);

      const P = () => PHASES[ph];
      const cardHome = () => (P().poster ? { x: W / 2, y: 262 } : { x: W / 2, y: 190 });
      const cardSize = () => (P().poster ? { w: 380, h: 84 } : { w: 330, h: 120 });
      const binRect = (i) => ({ x: i ? 250 : 16, y: H - 126, w: 214, h: 112 });

      // ---------- 控件 ----------
      const rBadge = api.readout('规矩徽章', '0 / 3');
      const sortRow = h('div', { class: 'seg' });
      const pickRow = h('div', { class: 'seg' });
      api.controlBox.append(sortRow, pickRow);
      const binBtns = [0, 1].map((i) => api.button('', () => doSort(i), '', sortRow));
      const pickBtns = ['A', 'B', 'C'].map((L, i) => api.button('选 ' + L, () => doPick(i), '', pickRow));
      const nextBtn = api.button('下一步 →', () => phaseDone(), 'primary');
      const tip = h('p', { style: { fontSize: '17px', margin: '0' }, 'aria-live': 'polite' });
      api.controlBox.append(tip);
      api.button('从头再来', () => restart());

      function sync() {
        const p = P();
        sortRow.hidden = p.type !== 'sort';
        pickRow.hidden = p.type !== 'pick';
        if (p.type === 'sort') {
          binBtns[0].textContent = '← ' + p.bins[0].label;
          binBtns[1].textContent = p.bins[1].label + ' →';
          binBtns.forEach((b) => { b.disabled = !!anim; });
        } else {
          pickBtns.forEach((b, i) => { b.disabled = !!(pickRes && pickRes.ok); b.hidden = i >= p.opts.length; });
        }
        nextBtn.hidden = !(p.type === 'pick' && pickRes && pickRes.ok) || finished;
        nextBtn.textContent = ph < PHASES.length - 1 ? '下一步 →' : '完成！';
        rBadge.set(earned.filter(Boolean).length + ' / 3');
      }
      function dropOverlay() { const o = api.stageBox.querySelector('.overlay'); if (o) o.remove(); }
      function resetCard() { const hm = cardHome(); card.x = card.tx = hm.x; card.y = card.ty = hm.y; card.drag = false; }
      function goPhase(i) {
        ph = i; ci = 0; anim = null; pickRes = null; wrongPicks = new Set(); finished = false; dropOverlay();
        if (P().poster && P().type === 'pick') tags = WORK.map((w) => w.ans);
        if (P().type === 'sort' && P().poster) tags = [null, null, null, null];
        resetCard();
        tip.textContent = P().type === 'sort' ? '把卡片拖进对的框里，也可以点框，或者按按钮。' : '选一个最好的回答：点画面上的回答，或者按“选 A / B / C”。';
        sync();
      }
      function phaseDone() {
        if (finished) return;
        const p = P();
        const nextP = PHASES[ph + 1];
        if (!demo && (!nextP || nextP.rule !== p.rule) && !earned[p.rule]) {
          earned[p.rule] = true;
          cele = { text: '拿到徽章：' + BADGE[p.rule] + '！', rule: p.rule, t: 0 };
          api.sound('win');
        } else api.sound('step');
        if (nextP) goPhase(ph + 1);
        else {
          finished = true; sync();
          later(() => api.overlay('全部完成！三枚规矩徽章都拿到啦。点这里再玩一次', restart), 1400);
        }
      }
      function doSort(bin) {
        const p = P();
        if (p.type !== 'sort' || anim || finished) return;
        const C = p.cards[ci];
        const b = binRect(bin);
        if (bin === C.ans) {
          anim = { bin, t: 0 };
          card.tx = b.x + b.w / 2; card.ty = b.y + b.h / 2 + 8; card.drag = false;
          if (p.poster) tags[ci] = bin;
          tip.textContent = '对！' + C.why;
          api.sound('ding');
          if (!demo) later(advanceCard, C.photo ? 3600 : C.adult ? 2600 : 1500);
        } else {
          shake = 0.5; resetCard();
          tip.textContent = '再想想：' + C.why.replace(/^(对！|不行！)/, '');
          api.sound('boing');
        }
        sync();
      }
      function advanceCard() {
        if (!anim) return;
        clearLater();
        anim = null; ci++;
        if (ci >= P().cards.length) { phaseDone(); return; }
        resetCard(); sync();
      }
      function doPick(i) {
        const p = P();
        if (p.type !== 'pick' || (pickRes && pickRes.ok) || finished || i >= p.opts.length) return;
        const o = p.opts[i];
        pickRes = { i, ok: o.ok, t: 0 };
        if (!o.ok) wrongPicks.add(i);
        tip.textContent = o.why + (o.ok ? '' : ' 再选一次。');
        api.sound(o.ok ? 'ding' : 'boing');
        sync();
      }
      function restart() { clearLater(); demo = false; earned = [false, false, false]; cele = null; goPhase(0); }

      // ---------- 摸一摸 ----------
      const inR = (p, b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
      const cardRect = () => { const z = cardSize(); return { x: card.x - z.w / 2, y: card.y - z.h / 2, w: z.w, h: z.h }; };
      api.on(s.canvas, 'pointerdown', (e) => {
        const p = s.pos(e);
        const ph0 = P();
        if (ph0.type === 'sort') {
          if (anim) { if (!demo) advanceCard(); return; }
          if (inR(p, cardRect())) {
            card.drag = true; card.ox = p.x - card.x; card.oy = p.y - card.y;
            try { s.canvas.setPointerCapture(e.pointerId); } catch (err) { /* 没关系 */ }
            return;
          }
          if (inR(p, binRect(0))) doSort(0); else if (inR(p, binRect(1))) doSort(1);
        } else {
          if (pickRes && pickRes.ok) { phaseDone(); return; }
          optRects.forEach((r, i) => { if (inR(p, r)) doPick(i); });
        }
      });
      api.on(s.canvas, 'pointermove', (e) => {
        if (!card.drag) return;
        const p = s.pos(e);
        card.x = card.tx = p.x - card.ox; card.y = card.ty = p.y - card.oy;
      });
      api.on(s.canvas, 'pointerup', (e) => {
        if (!card.drag) return;
        card.drag = false;
        const p = s.pos(e);
        if (inR(p, binRect(0))) doSort(0); else if (inR(p, binRect(1))) doSort(1);
        else resetCard();
      });
      api.on(s.canvas, 'pointercancel', () => { card.drag = false; resetCard(); });
      api.on(window, 'keydown', (e) => {
        const t = e.target;
        if (t && t.closest && t.closest('input, textarea, select, button, a')) return;
        if (P().type === 'sort' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) { e.preventDefault(); doSort(e.key === 'ArrowRight' ? 1 : 0); }
        if (P().type === 'pick' && ['1', '2', '3'].includes(e.key)) doPick(Number(e.key) - 1);
      });

      // ---------- 画 ----------
      function drawPhoto(cx, cy, k) {
        ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
        box(ctx, -120, -86, 240, 172, 8, '#ffffff', NAVY, 3);
        box(ctx, -108, -74, 216, 136, 4, '#f6eee2', NAVY, 2);
        // 窗外
        box(ctx, 22, -66, 76, 60, 4, '#a9d8ff', NAVY, 2);
        ctx.fillStyle = '#1fb36f'; ctx.beginPath(); ctx.arc(46, -26, 13, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#9aa3ad'; ctx.fillRect(66, -52, 22, 46);
        ctx.strokeStyle = NAVY; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(60, -66); ctx.lineTo(60, -6); ctx.stroke();
        // 小朋友：校服 + 校徽
        box(ctx, -78, 4, 76, 58, 12, '#2f7cf6', NAVY, 2);
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(-52, 4); ctx.lineTo(-40, 18); ctx.lineTo(-28, 4); ctx.fill();
        ctx.fillStyle = '#ffd43b'; ctx.beginPath(); ctx.arc(-20, 26, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        drawFriend(ctx, -40, -24, 24, NAVY);
        // 三个圈
        const ring = (x, y, r, label, lx, ly) => {
          ctx.strokeStyle = '#ff5a47'; ctx.lineWidth = 3.5; ctx.setLineDash([6, 4]);
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
          box(ctx, lx - 26, ly - 14, 52, 26, 13, '#ff5a47', NAVY, 2);
          ctx.fillStyle = '#ffffff'; ctx.font = font(15, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(label, lx, ly); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        };
        ring(-40, -24, 32, '脸', -108, -60);
        ring(-40, 34, 34, '校服', -108, 64);
        ring(60, -36, 46, '窗外', 108, 70);
        ctx.restore();
      }
      function drawPoster(c, y0) {
        box(ctx, 16, y0, W - 32, 160, 14, c.card, c.ink, 2.5);
        ctx.fillStyle = c.ink; ctx.font = font(17, true);
        ctx.fillText('我的作品：恐龙跳跳', 30, y0 + 26);
        const pw = 102, gap = 8, gx = (W - (pw * 4 + gap * 3)) / 2;
        WORK.forEach((wk, i) => {
          const x = gx + i * (pw + gap), y = y0 + 38;
          const cur = P().type === 'sort' && i === ci && !anim;
          box(ctx, x, y, pw, 82, 10, '#fffaf0', cur ? '#ff5a47' : NAVY, cur ? 4 : 2);
          ctx.fillStyle = NAVY; ctx.textAlign = 'center';
          if (i === 0) drawDino(ctx, x + pw / 2 + 4, y + 46, 1.1);
          else if (i === 1) { ctx.font = font(19, true); ctx.fillText('恐龙', x + pw / 2, y + 36); ctx.fillText('跳跳', x + pw / 2, y + 62); }
          else if (i === 2) {
            ctx.strokeStyle = '#9aa3ad'; ctx.lineWidth = 3;
            for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.moveTo(x + 14, y + 20 + j * 15); ctx.lineTo(x + pw - 14 - (j === 3 ? 30 : 0), y + 20 + j * 15); ctx.stroke(); }
          } else { ctx.font = font(26, true); ctx.fillText('</>', x + pw / 2, y + 52); }
          ctx.font = font(14, true); ctx.fillStyle = c.ink; ctx.fillText(wk.part, x + pw / 2, y + 100);
          ctx.textAlign = 'left';
          if (tags[i] != null) {
            ctx.save(); ctx.translate(x + pw / 2, y + 128); ctx.rotate(-0.05);
            box(ctx, -48, -13, 96, 26, 13, tags[i] === 0 ? '#2f7cf6' : '#ffd43b', NAVY, 2);
            ctx.fillStyle = tags[i] === 0 ? '#ffffff' : NAVY; ctx.font = font(14, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(tags[i] === 0 ? 'AI 做的' : '我做的', 0, 1);
            ctx.restore(); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
          }
        });
      }
      function drawBdayCard(c, y0, t) {
        ctx.save(); ctx.translate(W / 2, y0 + 110); ctx.rotate(-0.03);
        box(ctx, -170, -100, 340, 200, 14, '#ffd6e8', NAVY, 3);
        ctx.fillStyle = NAVY; ctx.textAlign = 'center';
        ctx.font = font(28, true); ctx.fillText('生日快乐！', 0, -54);
        ctx.font = font(18); ctx.fillText('祝我的同桌天天开心！', 0, -14);
        ctx.font = font(18, true); ctx.fillText('—— A01', 70, 22);
        // 打印出来以后，自己用笔写真名
        const k = Math.min(1, t / 1.4);
        ctx.strokeStyle = '#8a5cf5'; ctx.lineWidth = 3; ctx.beginPath();
        for (let i = 0; i <= 40 * k; i++) { const x = -120 + i * 4.5; ctx.lineTo(x, 62 + Math.sin(i * 1.3) * 5); }
        ctx.stroke();
        ctx.font = font(14); ctx.fillStyle = NAVY; ctx.fillText('打印出来以后，真名自己用笔写在这里', 0, 92);
        ctx.restore(); ctx.textAlign = 'left';
      }

      api.loop((dt, t) => {
        if (anim) anim.t += dt;
        if (pickRes) pickRes.t += dt;
        if (cele) { cele.t += dt; if (cele.t > 2.2) cele = null; }
        shake = Math.max(0, shake - dt);
        if (!card.drag) { card.x += (card.tx - card.x) * Math.min(1, dt * 12); card.y += (card.ty - card.y) * Math.min(1, dt * 12); }
        const c = {
          ink: api.color('--ink'), ink2: api.color('--ink-2'), card: api.color('--card'), line: api.color('--line'),
          sun: api.color('--sun'), sky: api.color('--sky'), grass: api.color('--grass'), tomato: api.color('--tomato'),
        };
        s.clear();
        const p = P();

        // 顶上：这一关 + 三枚徽章
        ctx.font = font(17, true); ctx.fillStyle = c.ink;
        ctx.fillText(p.title, 16, 27);
        earned.forEach((on, i) => {
          const x = W - 104 + i * 36, y = 20;
          ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2);
          ctx.fillStyle = on ? c.sun : c.card; ctx.fill(); ctx.strokeStyle = c.ink; ctx.lineWidth = 2;
          if (!on) ctx.setLineDash([4, 3]);
          ctx.stroke(); ctx.setLineDash([]);
          ctx.fillStyle = on ? NAVY : c.ink2; ctx.font = font(15, true); ctx.textAlign = 'center'; ctx.fillText(String(i + 1), x, y + 5); ctx.textAlign = 'left';
        });

        if (p.type === 'sort') {
          const C = p.cards[ci];
          if (p.poster) drawPoster(c, 44);
          // 两个框
          p.bins.forEach((b, i) => {
            const r = binRect(i);
            ctx.save(); ctx.globalAlpha = 0.25; box(ctx, r.x, r.y, r.w, r.h, 16, api.color(b.col), null); ctx.restore();
            box(ctx, r.x, r.y, r.w, r.h, 16, null, c.ink, 3);
            ctx.fillStyle = c.ink; ctx.textAlign = 'center';
            ctx.font = font(21, true); ctx.fillText(b.label, r.x + r.w / 2, r.y + (b.sub ? 44 : 64));
            if (b.sub) { ctx.font = font(14); ctx.fillStyle = c.ink2; ctx.fillText(b.sub, r.x + r.w / 2, r.y + 70); }
            ctx.textAlign = 'left';
          });
          // 卡片
          const z = cardSize();
          const sc = anim ? Math.max(0.4, 1 - anim.t * 2) : 1;
          const sx = shake > 0 ? Math.sin(shake * 40) * 8 : 0;
          ctx.save(); ctx.translate(card.x + sx, card.y); ctx.scale(sc, sc); ctx.rotate(card.drag ? 0.04 : 0);
          box(ctx, -z.w / 2, -z.h / 2, z.w, z.h, 16, '#fffaf0', NAVY, 3);
          ctx.fillStyle = NAVY; ctx.font = font(p.size, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          const ls = wrapLines(ctx, C.t, z.w - 30);
          const lh = p.size * 1.35;
          ls.forEach((l, i) => ctx.fillText(l, 0, (i - (ls.length - 1) / 2) * lh));
          ctx.restore(); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
          if (!anim && !p.poster) {
            drawBot(ctx, 44, 310, 34, c.sky, c.ink, t);
            ctx.font = font(15); ctx.fillStyle = c.ink2; ctx.fillText('拖到下面的框里，或者点一个框', 80, 316);
          }
          ctx.font = font(14); ctx.fillStyle = c.ink2; ctx.textAlign = 'right';
          ctx.fillText((ci + 1) + ' / ' + p.cards.length, W - 16, p.poster ? 222 : 60);
          ctx.textAlign = 'left';
          if (anim) {
            if (C.photo) drawPhoto(W / 2, 160, Math.min(1, 0.6 + anim.t * 2));
            else if (C.adult) {
              ctx.save(); ctx.translate(W / 2, 150); ctx.rotate(-0.05); const k2 = Math.max(1, 1.8 - anim.t * 5); ctx.scale(k2, k2);
              box(ctx, -130, -26, 260, 52, 26, '#ffd43b', NAVY, 3);
              ctx.fillStyle = NAVY; ctx.font = font(22, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              ctx.fillText('不能照做，要问大人！', 0, 1);
              ctx.restore(); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
            }
            if (!C.photo) {
              ctx.font = font(20, true); ctx.fillStyle = c.ink; ctx.textAlign = 'center';
              ctx.fillText('对！', W / 2, p.poster ? 250 : 100);
              ctx.textAlign = 'left';
            }
          }
        } else {
          // 选一个回答
          let y = 48;
          if (p.poster) { drawPoster(c, 40); y = 210; }
          if (p.who === 'ai') drawBot(ctx, 40, y + 30, 44, c.sky, c.ink, t);
          else drawFriend(ctx, 40, y + 24, 22, c.ink);
          if (p.who === 'ai') { ctx.fillStyle = c.ink2; ctx.font = font(13, true); ctx.textAlign = 'center'; ctx.fillText('小艾', 40, y + 72); ctx.textAlign = 'left'; }
          const qb = bubble(ctx, p.who === 'ai' ? p.ask : '同学：' + p.ask, 76, y, W - 92, 19, c.card, c.ink, true);
          y = Math.max(qb.y + qb.h, y + (p.who === 'ai' ? 70 : 46)) + 14;
          if (pickRes && pickRes.ok && p.who === 'ai') {
            drawBdayCard(c, y, pickRes.t);
            optRects = [];
          } else {
            ctx.font = font(14, true); ctx.fillStyle = c.ink2; ctx.fillText('你怎么回答？点一个：', 20, y + 2);
            y += 12;
            optRects = [];
            p.opts.forEach((o, i) => {
              ctx.font = font(18, true);
              const ls = wrapLines(ctx, o.t, W - 100);
              const hh = ls.length * 25 + 20;
              const r = { x: 20, y, w: W - 40, h: hh };
              optRects.push(r);
              const chosen = pickRes && pickRes.i === i;
              const fill = chosen && pickRes.ok ? '#1fb36f' : wrongPicks.has(i) ? '#e4e8ef' : '#fffaf0';
              box(ctx, r.x, r.y, r.w, r.h, 12, fill, NAVY, chosen ? 3.5 : 2.5);
              ctx.beginPath(); ctx.arc(r.x + 22, r.y + 22, 13, 0, Math.PI * 2); ctx.fillStyle = '#ffd43b'; ctx.fill(); ctx.strokeStyle = NAVY; ctx.lineWidth = 2; ctx.stroke();
              ctx.fillStyle = NAVY; ctx.font = font(15, true); ctx.textAlign = 'center'; ctx.fillText('ABC'[i], r.x + 22, r.y + 27); ctx.textAlign = 'left';
              ctx.font = font(18, true); ctx.fillStyle = wrongPicks.has(i) ? '#6b7280' : NAVY; ctx.textBaseline = 'top';
              ls.forEach((l, j) => ctx.fillText(l, r.x + 46, r.y + 11 + j * 25));
              ctx.textBaseline = 'alphabetic';
              if (wrongPicks.has(i)) {
                ctx.strokeStyle = '#ff5a47'; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.moveTo(r.x + r.w - 40, r.y + 12); ctx.lineTo(r.x + r.w - 18, r.y + 34); ctx.moveTo(r.x + r.w - 18, r.y + 12); ctx.lineTo(r.x + r.w - 40, r.y + 34); ctx.stroke();
              }
              y += hh + 10;
            });
          }
          if (pickRes && pickRes.ok) {
            box(ctx, 20, H - 44, W - 40, 36, 12, '#1fb36f', NAVY, 2.5);
            ctx.fillStyle = NAVY; ctx.font = font(17, true); ctx.textAlign = 'center';
            ctx.fillText('说得好！点一下画面，或者按“下一步”', W / 2, H - 20); ctx.textAlign = 'left';
          }
        }

        // 拿到徽章
        if (cele) {
          const k = Math.min(1, cele.t * 4);
          ctx.save(); ctx.globalAlpha = Math.min(1, (2.2 - cele.t) * 3);
          ctx.translate(W / 2, H / 2); ctx.scale(k, k);
          box(ctx, -170, -70, 340, 140, 20, '#ffd43b', NAVY, 4);
          PG.drawStar(ctx, -120, 0, 34, '#ffffff', NAVY);
          ctx.fillStyle = NAVY; ctx.font = font(15, true); ctx.textAlign = 'center';
          ctx.fillText(String(cele.rule + 1), -120, 6);
          ctx.font = font(24, true); ctx.fillText(cele.text, 30, -6);
          ctx.font = font(15); ctx.fillText('规矩' + '一二三'[cele.rule] + '记住啦', 30, 26);
          ctx.restore(); ctx.textAlign = 'left';
        }
      });

      // ---------- 猜一猜 ----------
      function demoStart() { clearLater(); demo = true; cele = null; }
      api.guesses([
        {
          q: 'AI 问：“你叫什么名字？在哪个学校？”你怎么回答？',
          options: ['说出真名和学校', '用代号，学校不说'], answer: 1,
          why: '用代号就够了，学校不用说。真名等贺卡打印出来，自己用笔写上。',
          apply: () => { demoStart(); goPhase(1); later(() => { doPick(1); demo = false; }, 700); },
          delay: 1500,
        },
        {
          q: '为什么不能把自己的照片发给 AI？',
          options: ['照片太大了，发不出去', '照片里有脸、校服、窗外，能认出你是谁、在哪'], answer: 1,
          why: '看上面：脸能认出你，校服能看出你在哪个学校，窗外能看出你家在哪。画的角色图可以，真人照片不行。',
          apply: () => {
            demoStart(); goPhase(0); ci = PRIV.findIndex((x) => x.photo); resetCard(); sync();
            later(() => { doSort(1); demo = false; }, 600);
          },
          delay: 1800,
        },
        {
          q: '用 AI 做了作品，给别人介绍时怎么说？',
          options: ['不提 AI，说全是自己做的', '大方说哪部分是 AI 做的，哪部分是我做的'], answer: 1,
          why: '用 AI 不丢人，就像用计算器、用字典。说清楚“图和代码是 AI 做的，名字和故事是我想的”，别人反而觉得你很会用工具。',
          apply: () => { demoStart(); goPhase(4); later(() => { doPick(1); demo = false; }, 700); },
          delay: 1500,
        },
      ]);

      api.say({
        left: '用 AI 的三条规矩',
        right: '不说真实信息，重要的事要核对，哪部分是 AI 做的大方说出来',
        example: '比如：AI 问我的名字，我说“我叫 A01”；AI 说蘑菇能吃，我先问大人；给同学看作品时，我说“图是 AI 画的，故事是我编的”。',
        promptIntro: '下次用 AI 之前，先做这两件事：',
        prompt: '1. 给自己定一个代号（比如 A01），以后跟 AI 说话都用它。\n2. 做完作品，写一句：“____是 AI 做的，____是我想的、我改的。”',
      });

      goPhase(0);
    },

    thumb(ctx, w, h, t) {
      // 三枚徽章轮流亮起来，中间一把小锁
      const labels = ['不说', '核对', '说出来'];
      for (let i = 0; i < 3; i++) {
        const x = 70 + i * 90, y = 92;
        const on = Math.floor(t * 1.2) % 4 > i;
        ctx.beginPath(); ctx.arc(x, y, 34, 0, Math.PI * 2);
        ctx.fillStyle = on ? '#ffd43b' : '#ffffff'; ctx.fill(); ctx.strokeStyle = NAVY; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = NAVY; ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(i + 1), x, y + 11);
        ctx.font = 'bold 18px sans-serif'; ctx.fillStyle = '#ffffff'; ctx.fillText(labels[i], x, y + 64);
      }
      ctx.textAlign = 'left';
    },
  });
})();
