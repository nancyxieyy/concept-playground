/* AI 实验室：AI 会说错。小艾机器人回答问题总是很确定；孩子当侦探，先用别的办法核对，再盖章“对”还是“错”。
   第二关：给几个情景分一分，哪些要核对。题目都是没有争议的事实（课程 K2.3、K2.4 第 2 步）。 */
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
  // 一个说话泡泡；align 'right' 时 x 是右边。返回占的位置。
  function bubble(ctx, text, x, y, maxW, px, fill, ink, align, bold) {
    ctx.font = font(px, bold);
    const pad = 12, lh = Math.round(px * 1.4);
    const ls = wrapLines(ctx, text, maxW - pad * 2);
    const w = Math.max(...ls.map((l) => ctx.measureText(l).width)) + pad * 2;
    const hh = ls.length * lh + pad * 2 - (lh - px) + 4;
    const bx = align === 'right' ? x - w : x;
    box(ctx, bx, y, w, hh, 14, fill, ink, 2.5);
    ctx.fillStyle = ink; ctx.textBaseline = 'top';
    ls.forEach((l, i) => ctx.fillText(l, bx + pad, y + pad + i * lh));
    ctx.textBaseline = 'alphabetic';
    return { x: bx, y, w, h: hh };
  }
  // 小艾：原创的小机器人
  function drawBot(ctx, cx, cy, sz, body, ink, t) {
    ctx.save();
    ctx.translate(cx, cy + Math.sin(t * 2.2) * 2);
    ctx.strokeStyle = ink; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, -sz * 0.5); ctx.lineTo(0, -sz * 0.7); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -sz * 0.76, sz * 0.09, 0, Math.PI * 2); ctx.fillStyle = '#ffd43b'; ctx.fill(); ctx.stroke();
    box(ctx, -sz * 0.5, -sz * 0.5, sz, sz * 0.86, sz * 0.22, body, ink, 3);
    box(ctx, -sz * 0.36, -sz * 0.36, sz * 0.72, sz * 0.5, sz * 0.12, '#ffffff', ink, 2);
    const blink = (t % 3.2) < 0.12;
    ctx.fillStyle = NAVY;
    for (const ex of [-0.15, 0.15]) {
      if (blink) ctx.fillRect(sz * ex - sz * 0.06, -sz * 0.15, sz * 0.12, 2.5);
      else { ctx.beginPath(); ctx.arc(sz * ex, -sz * 0.14, sz * 0.06, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.beginPath(); ctx.arc(0, -sz * 0.05, sz * 0.12, 0.15 * Math.PI, 0.85 * Math.PI); ctx.strokeStyle = NAVY; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();
  }
  // 一个圆圆的印章
  function stamp(ctx, x, y, r, text, col, k) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(-0.22); ctx.scale(k, k);
    ctx.globalAlpha = 0.92;
    ctx.strokeStyle = col; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r - 7, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = font(text.length > 1 ? r * 0.62 : r * 0.95, true);
    ctx.fillText(text, 0, 2);
    ctx.restore();
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  const SENT = '今天放学以后我和同桌一起去公园踢足球了';
  const CHARS = [...SENT];
  const N = CHARS.length; // 19 个字

  // 第一关：小艾的回答。ok = 小艾说得对不对。
  const ROUNDS = [
    { q: '2 + 3 等于几？', a: '2 + 3 = 5。', ok: true, check: 'math', how: '自己算一算',
      why: '2 个加 3 个，一共 5 个。这次小艾说对了！不过，不核对的话，你也不知道它对不对。' },
    { q: '一个星期有几天？', a: '一个星期有 8 天。', ok: false, check: 'week', how: '看日历',
      why: '看日历：星期一到星期日，一共 7 天。小艾说得很确定，可还是错了。' },
    { q: '蜘蛛是昆虫吗？', a: '是的，蜘蛛是昆虫，它有 6 条腿。', ok: false, check: 'book', how: '翻书',
      book: ['昆虫有 6 条腿。', '蜘蛛有 8 条腿。', '所以蜘蛛不是昆虫。'],
      why: '翻书查到：蜘蛛有 8 条腿，不是昆虫。小艾一本正经地说错了。' },
    { q: '一年有几个月？', a: '一年有 12 个月。', ok: true, check: 'year', how: '看日历',
      why: '看日历：1 月到 12 月，一共 12 个月。这次小艾说对了。' },
    { q: '鲸鱼是鱼吗？', a: '是的，鲸鱼是一种很大的鱼。', ok: false, check: 'book', how: '翻书',
      book: ['鲸鱼用肺呼吸，', '要游到水面上换气。', '鲸鱼不是鱼，', '是哺乳动物。'],
      why: '翻书查到：鲸鱼不是鱼，是哺乳动物，用肺呼吸。名字里有“鱼”，也不一定是鱼。' },
    { q: '下面这句话一共有几个字？\n“' + SENT + '”', a: '这句话一共有 ' + (N - 2) + ' 个字。', ok: false, check: 'count', how: '自己数一数',
      why: '一个字一个字数，一共 ' + N + ' 个字，小艾说成了 ' + (N - 2) + ' 个。数字这种事，自己数最靠谱。' },
    { q: '我昨天晚饭吃了什么？', a: '你昨天晚饭吃了米饭和番茄炒蛋。', ok: false, check: 'memory', how: '问问自己',
      stamps: ['它真知道', '它是编的'], marks: ['知道', '编的'],
      why: '小艾没看见你吃饭，它根本不知道。可它编得像真的一样！只有你知道的事，它会乱编。' },
  ];
  // 第二关：要不要核对？（课程 K2.4 第 2 步的三个情景，再加三个）
  const SORTS = [
    { t: '你让 AI 讲个笑话，自己笑一笑就算了。', need: false, why: '只是玩，不用核对。' },
    { t: '你问 AI “蜘蛛是昆虫吗？”，答案要写进科学作业。', need: true, why: '要交的作业，要核对：翻科学课本，或者问老师。' },
    { t: '你让 AI 给你的小怪兽起个名字。', need: false, why: '起名字是好玩的事，喜欢就用，不用核对。' },
    { t: 'AI 说：“这种蘑菇可以吃。”', need: true, adult: true, why: '跟身体有关的事，AI 说了也不能照做！一定要核对，还要问大人。' },
    { t: '你让 AI 帮你想一个画画的点子。', need: false, why: '只是帮你想点子，不用核对。' },
    { t: '你要把 AI 说的恐龙知识，讲给全班同学听。', need: true, why: '要告诉别人的事，要核对：翻书、上网查、问老师。' },
  ];
  const TOTAL = ROUNDS.length + SORTS.length;

  PG.register({
    id: 'wrong',
    title: '抓住 AI 的错',
    concept: 'AI 会说错，重要的事要核对',
    kid: 'AI 说得很确定，也可能是错的；重要的事用别的办法再查一遍',
    level: 'K2',
    color: 'tomato',
    play: '你是小侦探！小艾机器人回答问题总是很确定。先按“核对一下”，用别的办法查一查，再给它盖章：对，还是错？',

    mount(api) {
      const W = 480, H = 440;
      const s = api.stage(W, H);
      const ctx = s.ctx;
      const h = api.h;

      let part = 1, r = 0, step = 'ask', pick = -1, pickOk = false, stampT = 0, score = 0;
      let counted = new Set(), tiles = [];
      let k = 0, sortRes = null, demo = false, finished = false;
      const CARD_Y = 150;
      const card = { x: W / 2, y: CARD_Y, tx: W / 2, ty: CARD_Y, drag: false, ox: 0, oy: 0 };
      const BIN = { no: { x: 16, y: 312, w: 214, h: 112 }, yes: { x: 250, y: 312, w: 214, h: 112 } };
      let timers = [];
      const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };
      const clearLater = () => { timers.forEach(clearTimeout); timers = []; };
      api.onCleanup(clearLater);

      // ---------- 控件 ----------
      const rBadge = api.readout('侦探徽章', 0);
      const rStep = api.readout('第几题', '1 / ' + ROUNDS.length);
      const row1 = h('div', { class: 'seg' });
      const stampRow = h('div', { class: 'seg' });
      const sortRow = h('div', { class: 'seg' });
      api.controlBox.append(row1, stampRow, sortRow);
      const checkBtn = api.button('核对一下', () => doCheck(), 'primary', row1);
      const stampBtns = [0, 1].map((i) => api.button('', () => doStamp(i), '', stampRow));
      const noBtn = api.button('← 不用核对', () => doSort(false), '', sortRow);
      const yesBtn = api.button('要核对 →', () => doSort(true), '', sortRow);
      const nextBtn = api.button('下一题 →', () => next(), 'primary');
      const tip = h('p', { style: { fontSize: '17px', margin: '0' }, 'aria-live': 'polite' });
      api.controlBox.append(tip);
      api.button('从头再来', () => restart());

      const cur = () => ROUNDS[r];
      const rightIdx = (R) => (R.ok ? 0 : 1);

      function sync() {
        const R = cur();
        row1.hidden = stampRow.hidden = part !== 1;
        sortRow.hidden = part !== 2;
        if (part === 1) {
          checkBtn.disabled = step !== 'ask';
          checkBtn.textContent = '核对一下：' + R.how;
          const labs = R.stamps || ['✓ 对', '✗ 错'];
          stampBtns.forEach((b, i) => { b.textContent = '盖章：' + labs[i]; b.disabled = step !== 'checked'; });
          nextBtn.hidden = step !== 'stamped' || finished;
          nextBtn.textContent = r < ROUNDS.length - 1 ? '下一题 →' : '去第二关 →';
          rStep.set((r + 1) + ' / ' + ROUNDS.length);
          if (step === 'ask') tip.textContent = '小艾说得好确定！先按“核对一下”，用别的办法查一查。';
          else if (step === 'checked') tip.textContent = R.check === 'count' ? '点上面的字，一个一个数。数完了再盖章。' : '查好了！现在给小艾盖章吧。';
          else tip.textContent = (pickOk ? '抓得好！' : '再想想。') + R.why;
        } else {
          noBtn.disabled = yesBtn.disabled = !!sortRes;
          nextBtn.hidden = !sortRes || finished;
          nextBtn.textContent = k < SORTS.length - 1 ? '下一张 →' : '看看我的徽章 →';
          rStep.set('二关 ' + (k + 1) + ' / ' + SORTS.length);
          tip.textContent = sortRes ? (sortRes.ok ? '对！' : '再想想。') + SORTS[k].why
            : '这件事，要不要核对？把卡片拖进下面的框，或者按按钮。';
        }
        rBadge.set(score);
      }
      function dropOverlay() { const o = api.stageBox.querySelector('.overlay'); if (o) o.remove(); }
      function goRound(i) {
        part = 1; r = i; step = 'ask'; pick = -1; counted = new Set(); finished = false; dropOverlay(); sync();
      }
      function goSort(i) {
        part = 2; k = i; sortRes = null; finished = false; dropOverlay();
        card.x = card.tx = W / 2; card.y = card.ty = CARD_Y; card.drag = false;
        sync();
      }
      function doCheck() {
        if (part !== 1 || step !== 'ask') return;
        step = 'checked'; api.sound('pop'); sync();
      }
      function doStamp(i) {
        if (part !== 1 || step !== 'checked') return;
        pick = i; pickOk = i === rightIdx(cur());
        if (pickOk && !demo) score++;
        step = 'stamped'; stampT = 0;
        api.sound(pickOk ? 'ding' : 'buzz');
        sync();
      }
      function doSort(yes) {
        if (part !== 2 || sortRes) return;
        const ok = yes === SORTS[k].need;
        if (ok && !demo) score++;
        sortRes = { yes, ok, t: 0 };
        const b = yes ? BIN.yes : BIN.no;
        card.tx = b.x + b.w / 2; card.ty = b.y + b.h / 2 + 10; card.drag = false;
        api.sound(ok ? 'ding' : 'buzz');
        sync();
      }
      function next() {
        if (part === 1) { if (r < ROUNDS.length - 1) goRound(r + 1); else goSort(0); }
        else if (k < SORTS.length - 1) goSort(k + 1);
        else { finish(); return; }
        api.sound('step');
      }
      function finish() {
        finished = true; sync(); api.sound('win');
        api.overlay('全部完成！你拿到 ' + score + ' / ' + TOTAL + ' 枚侦探徽章。点这里再玩一次', restart);
      }
      function restart() { clearLater(); demo = false; score = 0; goRound(0); }

      // ---------- 摸一摸 ----------
      const inR = (p, b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
      const cardRect = () => ({ x: card.x - 160, y: card.y - 62, w: 320, h: 124 });
      api.on(s.canvas, 'pointerdown', (e) => {
        const p = s.pos(e);
        if (part === 1) {
          if (step === 'ask') return;
          tiles.forEach((tl, i) => {
            if (inR(p, tl)) {
              if (counted.has(i)) counted.delete(i); else counted.add(i);
              api.sound('tick');
            }
          });
          return;
        }
        if (sortRes) { if (!finished) next(); return; }
        if (inR(p, cardRect())) {
          card.drag = true; card.ox = p.x - card.x; card.oy = p.y - card.y;
          try { s.canvas.setPointerCapture(e.pointerId); } catch (err) { /* 没关系 */ }
          return;
        }
        if (inR(p, BIN.no)) doSort(false);
        else if (inR(p, BIN.yes)) doSort(true);
      });
      api.on(s.canvas, 'pointermove', (e) => {
        if (!card.drag) return;
        const p = s.pos(e);
        card.x = card.tx = p.x - card.ox; card.y = card.ty = p.y - card.oy;
      });
      const endDrag = (e) => {
        if (!card.drag) return;
        card.drag = false;
        const p = s.pos(e);
        if (inR(p, BIN.no)) doSort(false);
        else if (inR(p, BIN.yes)) doSort(true);
        else { card.tx = W / 2; card.ty = CARD_Y; }
      };
      api.on(s.canvas, 'pointerup', endDrag);
      api.on(s.canvas, 'pointercancel', () => { card.drag = false; card.tx = W / 2; card.ty = CARD_Y; });
      api.on(window, 'keydown', (e) => {
        const t = e.target;
        if (t && t.closest && t.closest('input, textarea, select, button, a')) return;
        if (part === 2 && !sortRes && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
          e.preventDefault(); doSort(e.key === 'ArrowRight');
        }
      });

      // ---------- 画 ----------
      function drawCheck(R, top, c) {
        const bottom = H - 52;
        ctx.font = font(15, true); ctx.fillStyle = c.ink2;
        ctx.fillText('核对：' + R.how, 20, top + 4);
        const y0 = top + 14;
        tiles = [];
        if (step === 'ask') {
          ctx.setLineDash([7, 6]);
          box(ctx, 20, y0, W - 40, bottom - y0, 14, null, c.line, 2.5);
          ctx.setLineDash([]);
          ctx.font = font(18); ctx.fillStyle = c.ink2; ctx.textAlign = 'center';
          ctx.fillText('先按“核对一下”，用别的办法查一查', W / 2, (y0 + bottom) / 2 + 6);
          ctx.textAlign = 'left';
          return;
        }
        box(ctx, 20, y0, W - 40, bottom - y0, 14, c.card, c.ink, 2);
        const mid = (y0 + bottom) / 2;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (R.check === 'math') {
          const dot = (x, col) => { ctx.beginPath(); ctx.arc(x, mid - 10, 14, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = c.ink; ctx.lineWidth = 2; ctx.stroke(); };
          dot(90, c.sun); dot(124, c.sun);
          ctx.font = font(30, true); ctx.fillStyle = c.ink; ctx.fillText('+', 160, mid - 10);
          dot(196, c.sky); dot(230, c.sky); dot(264, c.sky);
          ctx.fillText('=', 304, mid - 10);
          ctx.fillText('5', 344, mid - 10);
          ctx.font = font(16); ctx.fillStyle = c.ink2; ctx.fillText('数一数：一共 5 个', W / 2, bottom - 20);
        } else if (R.check === 'week') {
          const days = ['一', '二', '三', '四', '五', '六', '日'];
          const bw = 58, gx = (W - days.length * bw) / 2;
          days.forEach((d, i) => {
            box(ctx, gx + i * bw + 3, mid - 36, bw - 6, 52, 8, i > 4 ? '#ffd43b' : '#ffffff', c.ink, 2);
            ctx.fillStyle = NAVY; ctx.font = font(17, true); ctx.fillText('周' + d, gx + i * bw + bw / 2, mid - 20);
            ctx.font = font(13); ctx.fillText(String(i + 1), gx + i * bw + bw / 2, mid + 2);
          });
          ctx.font = font(17, true); ctx.fillStyle = c.ink; ctx.fillText('一个星期：一共 7 天', W / 2, bottom - 20);
        } else if (R.check === 'year') {
          const bw = 70, gx = (W - 6 * bw) / 2;
          for (let i = 0; i < 12; i++) {
            const x = gx + (i % 6) * bw, y = mid - 48 + Math.floor(i / 6) * 40;
            box(ctx, x + 3, y, bw - 6, 34, 7, '#ffffff', c.ink, 2);
            ctx.fillStyle = NAVY; ctx.font = font(15, true); ctx.fillText((i + 1) + ' 月', x + bw / 2, y + 18);
          }
          ctx.font = font(17, true); ctx.fillStyle = c.ink; ctx.fillText('一年：一共 12 个月', W / 2, bottom - 18);
        } else if (R.check === 'book') {
          const bx = 50, bw = W - 100, by = y0 + 10, bh = bottom - y0 - 20;
          box(ctx, bx, by, bw / 2, bh, 6, '#fffaf0', NAVY, 2);
          box(ctx, bx + bw / 2, by, bw / 2, bh, 6, '#fffaf0', NAVY, 2);
          ctx.fillStyle = NAVY; ctx.font = font(16, true);
          ctx.fillText('自然百科', bx + bw / 4, by + 24);
          ctx.strokeStyle = '#c6d5e8'; ctx.lineWidth = 2;
          for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(bx + 18, by + 50 + i * 18); ctx.lineTo(bx + bw / 2 - 18, by + 50 + i * 18); ctx.stroke(); }
          ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.font = font(16, true); ctx.fillStyle = NAVY;
          let yy = by + 14;
          for (const ln of R.book) {
            for (const l2 of wrapLines(ctx, ln, bw / 2 - 24)) { ctx.fillText(l2, bx + bw / 2 + 12, yy); yy += 23; }
          }
        } else if (R.check === 'count') {
          const tw = 42, perRow = 10, gx = (W - perRow * tw) / 2;
          CHARS.forEach((ch, i) => {
            const x = gx + (i % perRow) * tw, y = y0 + 10 + Math.floor(i / perRow) * 46;
            const on = counted.has(i);
            tiles.push({ x: x + 2, y, w: tw - 4, h: 42 });
            box(ctx, x + 2, y, tw - 4, 42, 8, on ? '#1fb36f' : '#ffffff', c.ink, 2);
            ctx.fillStyle = NAVY; ctx.font = font(21, true); ctx.fillText(ch, x + tw / 2, y + 22);
          });
          ctx.font = font(18, true); ctx.fillStyle = c.ink;
          ctx.fillText('你数到了：' + counted.size + ' 个字', W / 2, bottom - 18);
        } else if (R.check === 'memory') {
          ctx.fillStyle = '#ffffff'; ctx.strokeStyle = NAVY; ctx.lineWidth = 2.5;
          ctx.beginPath();
          for (const [cx, cy, rr] of [[180, mid, 34], [225, mid - 18, 38], [278, mid - 14, 36], [320, mid + 4, 30], [250, mid + 18, 34], [200, mid + 18, 26]]) {
            ctx.moveTo(cx + rr, cy); ctx.arc(cx, cy, rr, 0, Math.PI * 2);
          }
          ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.arc(158, mid + 46, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.arc(144, mid + 58, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = NAVY; ctx.font = font(18, true);
          ctx.fillText('只有你自己知道！', 250, mid - 10);
          ctx.font = font(15); ctx.fillText('小艾没看见你吃饭', 250, mid + 16);
        }
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      }

      function banner(ok, text, c) {
        box(ctx, 20, H - 44, W - 40, 36, 12, ok ? '#1fb36f' : '#ffd43b', NAVY, 2.5);
        ctx.fillStyle = NAVY; ctx.font = font(18, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(text, W / 2, H - 25);
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      }

      api.loop((dt, t) => {
        stampT += dt;
        if (sortRes) sortRes.t += dt;
        if (!card.drag) { card.x += (card.tx - card.x) * Math.min(1, dt * 12); card.y += (card.ty - card.y) * Math.min(1, dt * 12); }
        const c = {
          ink: api.color('--ink'), ink2: api.color('--ink-2'), card: api.color('--card'), line: api.color('--line'),
          sun: api.color('--sun'), sky: api.color('--sky'), grass: api.color('--grass'), tomato: api.color('--tomato'),
        };
        s.clear();

        // 顶上：第几关 + 徽章
        ctx.font = font(16, true); ctx.fillStyle = c.ink2;
        ctx.fillText(part === 1 ? '第一关：给小艾盖章　' + (r + 1) + ' / ' + ROUNDS.length : '第二关：要不要核对？　' + (k + 1) + ' / ' + SORTS.length, 16, 26);
        PG.drawStar(ctx, W - 66, 20, 11, c.sun, c.ink);
        ctx.fillStyle = c.ink; ctx.font = font(18, true); ctx.fillText('× ' + score, W - 50, 27);

        if (part === 1) {
          const R = cur();
          // 你
          ctx.beginPath(); ctx.arc(W - 30, 64, 18, 0, Math.PI * 2); ctx.fillStyle = c.sun; ctx.fill(); ctx.strokeStyle = c.ink; ctx.lineWidth = 2.5; ctx.stroke();
          ctx.fillStyle = NAVY; ctx.font = font(15, true); ctx.textAlign = 'center'; ctx.fillText('你', W - 30, 69); ctx.textAlign = 'left';
          const qb = bubble(ctx, R.q, W - 56, 42, 340, 18, c.card, c.ink, 'right');
          // 小艾
          const ay = qb.y + qb.h + 14;
          drawBot(ctx, 40, ay + 34, 46, c.sky, c.ink, t);
          ctx.fillStyle = c.ink2; ctx.font = font(13, true); ctx.textAlign = 'center'; ctx.fillText('小艾', 40, ay + 82); ctx.textAlign = 'left';
          const ab = bubble(ctx, R.a, 78, ay, 380, 20, c.card, c.ink, 'left', true);
          // 小艾的口气：总是超确定
          const cy = ab.y + ab.h + 6;
          box(ctx, 78, cy, 138, 24, 12, c.sun, c.ink, 2);
          ctx.fillStyle = NAVY; ctx.font = font(14, true); ctx.fillText('口气：超确定！', 90, cy + 17);
          drawCheck(R, Math.max(cy + 42, 204), c);
          if (step === 'stamped') {
            const kk = Math.max(1, 2.2 - stampT * 7);
            const marks = R.marks || ['对', '错'];
            stamp(ctx, Math.min(W - 44, ab.x + ab.w + 4), ab.y + ab.h / 2 + 6, 34, marks[pick], pick === 0 ? c.grass : c.tomato, kk);
            const truth = R.check === 'memory' ? '它在编！' : R.ok ? '小艾这次说对了' : '小艾说错了';
            banner(pickOk, (pickOk ? '抓得好！+1 徽章　' : '再想想：') + truth, c);
          }
        } else {
          const S = SORTS[k];
          // 两个框
          for (const key of ['no', 'yes']) {
            const b = BIN[key];
            const col = key === 'yes' ? c.tomato : c.grass;
            ctx.save(); ctx.globalAlpha = 0.22; box(ctx, b.x, b.y, b.w, b.h, 16, col, null); ctx.restore();
            box(ctx, b.x, b.y, b.w, b.h, 16, null, c.ink, 3);
            ctx.fillStyle = c.ink; ctx.textAlign = 'center';
            ctx.font = font(22, true); ctx.fillText(key === 'yes' ? '要核对' : '不用核对', b.x + b.w / 2, b.y + 36);
            ctx.font = font(14); ctx.fillStyle = c.ink2;
            ctx.fillText(key === 'yes' ? '翻书、上网查、问大人' : '只是玩一玩', b.x + b.w / 2, b.y + 60);
            ctx.textAlign = 'left';
          }
          // 情景卡
          const cr = cardRect();
          const sc = sortRes ? Math.max(0.45, 1 - sortRes.t * 2) : 1;
          ctx.save();
          ctx.translate(card.x, card.y); ctx.scale(sc, sc); ctx.rotate(card.drag ? 0.04 : 0);
          box(ctx, -cr.w / 2, -cr.h / 2, cr.w, cr.h, 16, '#fffaf0', NAVY, 3);
          ctx.fillStyle = NAVY; ctx.font = font(20, true); ctx.textBaseline = 'top';
          const ls = wrapLines(ctx, S.t, cr.w - 32);
          ls.forEach((l, i) => ctx.fillText(l, -cr.w / 2 + 16, -ls.length * 14 + i * 28 + 2));
          ctx.textBaseline = 'alphabetic';
          ctx.restore();
          if (!sortRes) {
            drawBot(ctx, 40, 262, 34, c.sky, c.ink, t);
            ctx.font = font(15); ctx.fillStyle = c.ink2; ctx.textAlign = 'center';
            ctx.fillText('拖到下面的框里，或者点一个框', W / 2 + 10, 268);
            ctx.textAlign = 'left';
          } else {
            ctx.font = font(20, true); ctx.textAlign = 'center'; ctx.fillStyle = c.ink;
            ctx.fillText(sortRes.ok ? '对！+1 徽章' : '再想想：' + (S.need ? '这件事要核对' : '这件事不用核对'), W / 2, 60);
            ctx.textAlign = 'left';
            if (S.adult) {
              const k2 = Math.max(1, 1.8 - sortRes.t * 5);
              ctx.save(); ctx.translate(W / 2, 130); ctx.rotate(-0.06); ctx.scale(k2, k2);
              box(ctx, -130, -26, 260, 52, 26, '#ffd43b', NAVY, 3);
              ctx.fillStyle = NAVY; ctx.font = font(22, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              ctx.fillText('不能照做，要问大人！', 0, 1);
              ctx.restore(); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
            }
            ctx.font = font(15); ctx.textAlign = 'center'; ctx.fillStyle = c.ink2;
            ctx.fillText('点一下画面，或者按“下一张”', W / 2, 290);
            ctx.textAlign = 'left';
          }
        }
      });

      // ---------- 演示（猜一猜用） ----------
      function demoStart() { clearLater(); demo = true; }
      api.guesses([
        {
          q: '小艾说话总是很确定。它说得很确定，就一定对吗？',
          options: ['一定对', '不一定，也可能是错的'], answer: 1,
          why: '看，小艾很确定地说“一个星期有 8 天”，可日历上只有 7 天。说得很确定，不代表是对的。',
          apply: () => {
            demoStart(); goRound(1);
            later(() => doCheck(), 500);
            later(() => { doStamp(1); demo = false; }, 1300);
          },
          delay: 1700,
        },
        {
          q: 'AI 说：“这种蘑菇可以吃。”你该怎么做？',
          options: ['它说能吃，就去吃', '不能照做，先核对，还要问大人'], answer: 1,
          why: '跟身体、安全有关的事，AI 说了也不能照做。一定要核对，还要问大人。',
          apply: () => {
            demoStart(); goSort(3);
            later(() => { doSort(true); demo = false; }, 700);
          },
          delay: 1500,
        },
        {
          q: '怎么核对 AI 说的话？',
          options: ['再问一遍小艾', '用 AI 以外的办法：自己数、翻书、上网查、问大人'], answer: 1,
          why: '再问一遍，它可能还是错的。用 AI 以外的办法再查一遍，才叫核对。看，自己一个字一个字数，就知道小艾数错了。',
          apply: () => {
            demoStart(); goRound(5);
            later(() => doCheck(), 300);
            CHARS.forEach((ch, i) => later(() => { counted.add(i); api.sound('tick'); }, 600 + i * 110));
            later(() => { doStamp(1); demo = false; }, 600 + N * 110 + 300);
          },
          delay: 600 + N * 110 + 700,
        },
      ]);

      api.say({
        left: 'AI 说得很确定',
        right: '也可能是错的，重要的事要用别的办法核对',
        example: '比如：小艾说“一个星期有 8 天”，说得很确定，可日历上是 7 天。核对就是用 AI 以外的办法再查一遍：自己数、翻书、上网查、问大人。',
        promptIntro: '在 AI 对话工具里试一试：把下面这句话发给它，再自己一个字一个字数，看它说得对不对。',
        prompt: '下面这句话一共有几个字（不算标点）？“' + SENT + '”',
      });

      goRound(0);
    },

    thumb(ctx, w, h, t) {
      // 小艾说错话，被盖了一个“错”章
      drawBot(ctx, 66, 116, 70, '#2f7cf6', NAVY, t);
      box(ctx, 114, 40, 190, 58, 14, '#ffffff', NAVY, 3);
      ctx.fillStyle = NAVY; ctx.font = 'bold 21px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('一星期有 8 天！', 209, 76);
      ctx.textAlign = 'left';
      const k = 1 + Math.max(0, Math.sin(t * 2.5)) * 0.08;
      stamp(ctx, 250, 150, 32, '错', '#1b2440', k);
      // 放大镜
      ctx.strokeStyle = NAVY; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(160, 150, 18, 0, Math.PI * 2); ctx.fillStyle = '#ffd43b'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(173, 163); ctx.lineTo(190, 180); ctx.stroke();
    },
  });
})();
