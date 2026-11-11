/* 程序森林：二进制卡片（K1.5，参考 CS Unplugged 的“数点点”）。
   5 张卡片 16、8、4、2、1 个点，点一下翻面：朝上就数它的点，记 1；朝下不算，记 0。 */
(function () {
  'use strict';
  const NAVY = '#1b2440';
  const font = (px, bold) => (bold ? 'bold ' : '') + px + 'px ' + getComputedStyle(document.body).fontFamily;
  // 每种点数怎么排：几列 × 几行
  const GRID = { 1: [1, 1], 2: [1, 2], 4: [2, 2], 8: [2, 4], 16: [4, 4], 32: [4, 8] };

  // 画一张卡：vis 从 -1（背面）到 1（正面），翻的时候横着压扁
  function drawCard(ctx, x, y, w, h, n, vis, ink, back, hi) {
    const sx = Math.max(0.04, Math.abs(vis));
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.scale(sx, 1);
    ctx.translate(-w / 2, -h / 2);
    if (vis > 0) {
      ctx.fillStyle = '#fffdf6';
      PG.roundRect(ctx, 0, 0, w, h, 10); ctx.fill();
      const [c, r] = GRID[n];
      const pad = 10, cw = (w - pad * 2) / c, ch = (h - pad * 2) / r;
      const rad = Math.min(cw, ch) * (n >= 16 ? 0.36 : 0.3);
      ctx.fillStyle = NAVY;
      for (let i = 0; i < c; i++) for (let j = 0; j < r; j++) {
        ctx.beginPath(); ctx.arc(pad + cw * (i + 0.5), pad + ch * (j + 0.5), rad, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      ctx.fillStyle = back;
      PG.roundRect(ctx, 0, 0, w, h, 10); ctx.fill();
      ctx.save(); PG.roundRect(ctx, 0, 0, w, h, 10); ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 6;
      for (let k = -h; k < w + h; k += 16) { ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k + h, h); ctx.stroke(); }
      ctx.restore();
    }
    ctx.strokeStyle = hi || ink; ctx.lineWidth = hi ? 4 : 2.5;
    PG.roundRect(ctx, 0, 0, w, h, 10); ctx.stroke();
    ctx.restore();
  }

  PG.register({
    id: 'binary',
    title: '翻卡片变数字',
    concept: '二进制（0 和 1）',
    kid: '电脑里全是小开关，开是 1、关是 0，就能记下所有数字',
    level: 'K1',
    color: 'grape',
    play: '点一下卡片就翻面。朝上的卡，数它的点；朝下的不算。翻出上面要的数，就过关！',

    mount(api) {
      const W = 480, H = 340;
      const s = api.stage(W, H);
      const ctx = s.ctx;
      const h = api.h;

      // 卡片：从左到右 16 8 4 2 1；extra=true 时左边多一张 32
      let extra = false;
      const mkCards = () => (extra ? [32, 16, 8, 4, 2, 1] : [16, 8, 4, 2, 1]).map((n) => ({ n, up: false, vis: -1, flips: 0 }));
      let cards = mkCards();
      let sel = 0; // 键盘选中的那张
      const LEVELS = [5, 10, 21, 'age', 31];
      let level = 0, allDone = false, cheer = 0, sparks = [];
      let auto = null; // 从 0 数到 10 的自动演示
      let age = null;

      const total = () => cards.reduce((a, c) => a + (c.up ? c.n : 0), 0);
      const bits = () => cards.map((c) => (c.up ? '1' : '0')).join('');
      const target = () => {
        if (allDone) return null;
        const t = LEVELS[level];
        return t === 'age' ? age : t;
      };

      // ---------- 控件 ----------
      const rSum = api.readout('朝上的点加起来', 0);
      const rBits = api.readout('写成 0 和 1', '00000');
      const ageIn = h('input', {
        type: 'number', min: 1, max: 31, inputmode: 'numeric', placeholder: '比如 9', id: 'binary-age',
        style: { font: '22px/1.2 var(--display)', width: '5.5em', padding: '6px 10px', border: '2.5px solid var(--ink)', borderRadius: '10px', background: 'var(--card)', color: 'var(--ink)' },
      });
      ageIn.addEventListener('input', () => {
        const v = Math.round(Number(ageIn.value));
        age = v >= 1 && v <= 31 ? v : null;
        if (ageIn.value && !age) api.toast('5 张卡最多拼到 31 哦');
        check();
      });
      api.controlBox.append(h('div', { class: 'ctl' },
        h('label', { class: 'lab', for: 'binary-age' }, h('span', null, '你几岁？（第 4 关用）')), ageIn));
      const row = h('div', { class: 'seg' });
      api.controlBox.append(row);
      api.button('全部翻成背面', () => { stopAuto(); setAll(false); api.sound('boing'); }, '', row);
      api.button('从 0 数到 10 ▶', () => startAuto(), 'primary', row);
      api.button('跳到下一关', () => { stopAuto(); nextLevel(); api.sound('step'); }, '', row);
      api.controlBox.append(
        h('p', { class: 'small' }, '电脑里有好多好多小开关，开就是 1，关就是 0。你翻卡片，就是在当电脑。'),
        h('p', { class: 'small grown' }, '这叫二进制：每一位只有 0 和 1 两种。每往左一位，代表的数大一倍。'));

      // ---------- 规则 ----------
      function sync() { rSum.set(total()); rBits.set(bits()); }
      function setAll(up) { cards.forEach((c) => { c.up = up; }); sync(); }
      function setNumber(v) {
        let rest = v;
        cards.forEach((c) => {
          const up = rest >= c.n;
          if (up) rest -= c.n;
          if (up !== c.up) { c.up = up; c.flips++; }
        });
        sync();
      }
      function flip(i) {
        if (!cards[i]) return;
        stopAuto();
        cards[i].up = !cards[i].up; cards[i].flips++;
        sel = i;
        api.sound(cards[i].up ? 'pop' : 'tick');
        sync(); check();
      }
      function check() {
        const t = target();
        if (t == null || auto || cheer > 0) return;
        if (total() === t) {
          cheer = 1.4;
          api.sound(level === LEVELS.length - 1 ? 'win' : 'ding');
          for (let k = 0; k < 26; k++) sparks.push({ x: W / 2, y: 120, vx: (Math.random() - 0.5) * 420, vy: -Math.random() * 300 - 60, life: 1 });
        }
      }
      function nextLevel() {
        cheer = 0;
        if (allDone) { level = 0; allDone = false; }
        else if (level < LEVELS.length - 1) level++;
        else allDone = true;
        if (!allDone) setAll(false);
        if (LEVELS[level] === 'age' && !allDone && !age) setTimeout(() => ageIn.focus(), 50);
      }
      function finishLevel() {
        if (level === LEVELS.length - 1) {
          allDone = true;
          api.overlay('全部完成！你会用 0 和 1 记数字啦。点这里，接着随便翻', () => {});
        } else nextLevel();
      }
      function startAuto(fast) {
        cheer = 0;
        setNumber(0);
        cards.forEach((c) => { c.flips = 0; });
        auto = { n: 0, t: 0, step: fast ? 0.62 : 0.95, end: 0 };
        api.sound('step');
      }
      function stopAuto() { auto = null; }

      // ---------- 摸一摸 ----------
      const layout = () => {
        const n = cards.length, gap = 10;
        const cw = Math.min(84, (W - 24 - gap * (n - 1)) / n), ch = 110;
        const x0 = (W - (cw * n + gap * (n - 1))) / 2;
        return cards.map((c, i) => ({ x: x0 + i * (cw + gap), y: 62, w: cw, h: ch }));
      };
      api.on(s.canvas, 'pointerdown', (e) => {
        const p = s.pos(e);
        const L = layout();
        for (let i = 0; i < L.length; i++) {
          const r = L[i];
          // 卡片、下面的 0/1 和小灯泡都能点
          if (p.x >= r.x - 5 && p.x <= r.x + r.w + 5 && p.y >= r.y - 20 && p.y <= r.y + r.h + 92) { flip(i); return; }
        }
      });
      api.on(window, 'keydown', (e) => {
        const tag = e.target && e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        const onBtn = e.target && e.target.closest && e.target.closest('button, a, select');
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          sel = Math.max(0, Math.min(cards.length - 1, sel + (e.key === 'ArrowLeft' ? -1 : 1)));
          api.sound('tick');
        } else if ((e.key === ' ' || e.key === 'Enter') && !onBtn) {
          e.preventDefault(); flip(sel);
        } else if (/^[1-6]$/.test(e.key) && Number(e.key) <= cards.length) {
          flip(Number(e.key) - 1);
        }
      });

      // ---------- 画 ----------
      api.loop((dt, t) => {
        const ink = api.color('--ink'), grape = api.color('--grape'), sun = api.color('--sun'),
          line = api.color('--line'), grass = api.color('--grass'), tomato = api.color('--tomato'), card = api.color('--card');
        for (const c of cards) {
          const goal = c.up ? 1 : -1;
          const d = goal - c.vis;
          c.vis = Math.abs(d) < 0.05 ? goal : c.vis + Math.sign(d) * Math.min(Math.abs(d), dt * 9);
        }
        if (auto) {
          auto.t += dt;
          if (auto.t >= auto.step) {
            auto.t = 0;
            if (auto.n < 10) { auto.n++; setNumber(auto.n); api.sound('step'); }
            else if (++auto.end > 2) { auto = null; api.sound('ding'); }
          }
        }
        if (cheer > 0) {
          cheer -= dt;
          if (cheer <= 0) { cheer = 0; finishLevel(); }
        }
        sparks.forEach((p) => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 520 * dt; p.life -= dt * 0.9; });
        sparks = sparks.filter((p) => p.life > 0);

        s.clear();
        ctx.textBaseline = 'middle';
        // 上面：关卡和目标
        if (auto) {
          ctx.fillStyle = ink; ctx.font = font(20, true); ctx.textAlign = 'center';
          ctx.fillText('从 0 数到 10：现在是 ' + auto.n, W / 2, 22);
        } else if (allDone) {
          ctx.fillStyle = ink; ctx.font = font(18, true); ctx.textAlign = 'center';
          ctx.fillText('随便翻：想拼几就拼几（最大 ' + cards.reduce((a, c) => a + c.n, 0) + '）', W / 2, 22, W - 20);
        } else {
          LEVELS.forEach((lv, i) => {
            const x = 20 + i * 30, y = 22;
            ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2);
            ctx.fillStyle = i < level ? grass : i === level ? sun : card; ctx.fill();
            ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = i <= level ? NAVY : ink; ctx.font = font(12, true); ctx.textAlign = 'center';
            ctx.fillText(String(i + 1), x, y + 1);
          });
          const tg = target();
          ctx.textAlign = 'left'; ctx.fillStyle = ink; ctx.font = font(22, true);
          const label = LEVELS[level] === 'age' ? (tg ? '拼出你的年龄：' + tg : '拼出你的年龄（先在旁边写几岁）') : '拼出 ' + tg;
          ctx.fillText(label, 176, 22, W - 184);
        }

        // 卡片 + 0/1 + 小灯泡
        const L = layout();
        const last = cards.length - 1;
        cards.forEach((c, i) => {
          const r = L[i];
          drawCard(ctx, r.x, r.y, r.w, r.h, c.n, c.vis, ink, grape, i === sel && !auto ? sun : null);
          ctx.textAlign = 'center';
          if (auto) {
            ctx.fillStyle = i === last ? tomato : ink; ctx.font = font(13, true);
            ctx.fillText('翻了 ' + c.flips + ' 次', r.x + r.w / 2, r.y - 11);
          } else {
            ctx.fillStyle = ink; ctx.font = font(13, true);
            ctx.fillText(c.n + ' 个点', r.x + r.w / 2, r.y - 11);
          }
          ctx.font = font(30, true); ctx.fillStyle = c.up ? grape : ink;
          ctx.globalAlpha = c.up ? 1 : 0.45;
          ctx.fillText(c.up ? '1' : '0', r.x + r.w / 2, r.y + r.h + 22);
          ctx.globalAlpha = 1;
          const bx = r.x + r.w / 2, by = r.y + r.h + 60;
          if (c.up) {
            ctx.fillStyle = 'rgba(255,212,59,.35)';
            ctx.beginPath(); ctx.arc(bx, by - 2, 21 + Math.sin(t * 6 + i) * 1.5, 0, Math.PI * 2); ctx.fill();
          }
          ctx.fillStyle = c.up ? '#ffd43b' : line;
          ctx.beginPath(); ctx.arc(bx, by - 2, 13, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = ink; ctx.fillRect(bx - 6, by + 10, 12, 7);
          ctx.font = font(12); ctx.fillText(c.up ? '开' : '关', bx, by + 27);
        });
        if (auto) {
          const r = L[last], bob = Math.sin(t * 6) * 3;
          ctx.fillStyle = tomato;
          ctx.beginPath();
          ctx.moveTo(r.x + r.w / 2, r.y - 22 - bob);
          ctx.lineTo(r.x + r.w / 2 - 8, r.y - 34 - bob); ctx.lineTo(r.x + r.w / 2 + 8, r.y - 34 - bob); ctx.fill();
        }

        // 下面：算式
        const ups = cards.filter((c) => c.up).map((c) => c.n);
        const sum = total();
        ctx.font = font(20, true); ctx.fillStyle = ink; ctx.textAlign = 'center';
        ctx.fillText(ups.length ? ups.join(' + ') + ' = ' + sum : '一张都没朝上 = 0', W / 2, H - 22, W - 20);
        const tg = target();
        if (!auto && tg != null && cheer <= 0 && sum > tg) {
          ctx.font = font(13); ctx.fillStyle = tomato;
          ctx.fillText('多了！先看最大的那张能不能用', W / 2, H - 5);
        }

        // 过关
        if (cheer > 0) {
          const k = Math.min(1, (1.4 - cheer) * 4);
          ctx.fillStyle = card; ctx.strokeStyle = ink; ctx.lineWidth = 3;
          PG.roundRect(ctx, W / 2 - 120, 90, 240, 64, 16); ctx.fill(); ctx.stroke();
          ctx.save(); ctx.translate(W / 2, 122); ctx.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
          ctx.fillStyle = grass; ctx.font = font(30, true); ctx.textAlign = 'center';
          ctx.fillText(level === LEVELS.length - 1 ? '全部翻对啦！' : '拼对啦！', 0, 0);
          ctx.restore();
        }
        for (const p of sparks) { ctx.globalAlpha = Math.max(0, p.life); PG.drawStar(ctx, p.x, p.y, 7, '#ffd43b', ink); }
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      });

      // ---------- 猜一猜 ----------
      api.guesses([
        {
          q: '左边再加一张卡片，它上面应该有几个点？',
          options: ['17 个', '20 个', '32 个'], answer: 2,
          why: '从右往左看：1、2、4、8、16，每张都是右边那张的两倍。所以下一张是 16 的两倍：32。',
          apply: () => {
            stopAuto(); cheer = 0; extra = true; cards = mkCards(); sel = 0; sync();
            setTimeout(() => { if (extra) { cards[0].up = true; sync(); api.sound('pop'); } }, 350);
          },
        },
        {
          q: '回到 5 张卡片。5 张全部翻成正面，加起来是几？',
          options: ['16', '31', '32'], answer: 1,
          why: '16 + 8 + 4 + 2 + 1 = 31，写成 0 和 1 就是 11111。5 张卡最多数到 31；再加一张 32 的，就能数到 63。',
          apply: () => {
            stopAuto(); cheer = 0; extra = false; cards = mkCards(); sel = 0; sync();
            cards.forEach((c, i) => setTimeout(() => { if (cards[i] === c) { c.up = true; sync(); api.sound('pop'); } }, 200 + i * 180));
          },
          delay: 1400,
        },
        {
          q: '从 0 数到 10，每次加 1。哪张卡片每次都要翻？',
          options: ['最左边那张', '中间那张', '最右边那张'], answer: 2,
          why: '最右边那张是“1 个点”。每加 1，它都要翻一次：从关到开，或者从开到关。看卡片上面写的“翻了几次”，它最多！',
          apply: () => { cheer = 0; extra = false; cards = mkCards(); sel = cards.length - 1; startAuto(true); },
          delay: 7200,
        },
      ]);

      api.say({
        left: '二进制',
        right: '只用 0 和 1（关和开）来记数字',
        example: '5 就是“反反正反正”：4 和 1 两张朝上，写成 00101。电脑里有好多好多小开关，开是 1，关是 0，就能记下所有数字，还有字、图片和声音。',
        promptIntro: '和大人一起，把这句话发给 AI，再用翻卡片自己核对它说得对不对：',
        prompt: '用 16、8、4、2、1 五张点点卡片，数字 13 要翻哪几张朝上？写成 0 和 1 是什么？',
      });

      sync();
    },

    thumb(ctx, w, h, t) {
      const n = Math.floor(t * 1.2) % 32;
      [16, 8, 4, 2, 1].forEach((v, i) => {
        const up = (n & v) !== 0;
        drawCard(ctx, 22 + i * 58, 34, 48, 72, v, up ? 1 : -1, NAVY, '#5b3bb8', null);
        ctx.fillStyle = up ? '#ffd43b' : 'rgba(255,255,255,.35)';
        ctx.beginPath(); ctx.arc(46 + i * 58, 128, 10, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = NAVY; ctx.lineWidth = 2; ctx.stroke();
      });
      ctx.fillStyle = '#fff'; ctx.strokeStyle = NAVY; ctx.lineWidth = 2.5;
      PG.roundRect(ctx, 70, 150, 180, 36, 10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = NAVY; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(n.toString(2).padStart(5, '0') + ' = ' + n, 160, 169);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    },
  });
})();
