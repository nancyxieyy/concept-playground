/* 概念游乐场的外壳：首页、路由、每个游戏共用的小工具。
   每个游戏一个文件，用 PG.register({...}) 注册，见 g01-var.js。 */
(function () {
  'use strict';
  const PG = (window.PG = { games: [] });
  PG.register = (g) => PG.games.push(g);

  // ---------- 小工具 ----------
  function h(tag, props, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v === false || v == null) continue;
      if (k === 'class') e.className = v;
      else if (k === 'style' && typeof v === 'object') {
        for (const [sk, sv] of Object.entries(v)) sk.startsWith('--') ? e.style.setProperty(sk, sv) : (e.style[sk] = sv);
      }
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat(Infinity)) {
      if (c == null || c === false) continue;
      e.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return e;
  }
  PG.h = h;

  const store = {
    get(k, d) { try { const v = localStorage.getItem('pg:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('pg:' + k, JSON.stringify(v)); } catch (e) { /* 存不了也能玩 */ } },
  };

  // ---------- 声音（点过一次之后才会响） ----------
  let actx = null;
  let muted = store.get('muted', false);
  function sound(kind) {
    if (muted) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      const notes = {
        pop: [[660, 0.06]], tick: [[1200, 0.03]], ding: [[880, 0.08], [1320, 0.12]],
        buzz: [[160, 0.18, 'sawtooth']], boing: [[300, 0.05], [520, 0.09]],
        win: [[523, 0.09], [659, 0.09], [784, 0.09], [1047, 0.18]], lose: [[392, 0.12], [311, 0.2]],
        step: [[440, 0.04]],
      }[kind] || [[600, 0.05]];
      let t = actx.currentTime;
      for (const [f, d, type] of notes) {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = type || 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g).connect(actx.destination); o.start(t); o.stop(t + d + 0.02);
        t += d * 0.9;
      }
    } catch (e) { /* 没有声音也没关系 */ }
  }
  PG.sound = sound;

  function color(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888'; }
  PG.color = color;

  function toast(text) {
    const t = h('div', { class: 'toast', role: 'status' }, text);
    document.body.append(t);
    setTimeout(() => t.remove(), 1600);
  }
  PG.toast = toast;

  // 一颗星星（SVG），首页和完成标记用
  function starSvg(on) {
    const fill = on ? 'var(--sun)' : 'none';
    return `<svg class="s" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z" fill="${fill}" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round"/></svg>`;
  }

  // 画一颗五角星（canvas），游戏里常用
  PG.drawStar = function (ctx, x, y, r, fill, stroke) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.lineWidth = 2; ctx.strokeStyle = stroke; ctx.stroke(); }
  };
  PG.roundRect = function (ctx, x, y, w, hgt, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + hgt, r); ctx.arcTo(x + w, y + hgt, x, y + hgt, r);
    ctx.arcTo(x, y + hgt, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  };

  // ---------- 闯关地图：六站，按课程级别排 ----------
  // games 里写游戏 id，顺序就是关的顺序。还没写好的游戏会自动跳过。
  PG.STAGES = [
    { name: '电脑小岛', level: 'K0', color: 'sun', badge: '电脑小能手',
      intro: '鼠标、键盘、文件夹，先把电脑用顺手。', games: ['mouse', 'keys', 'files'] },
    { name: '程序森林', level: 'K1', color: 'grass', badge: '指令小队长',
      intro: '电脑只会一步一步照做。看看程序是怎么想事情的。', games: ['order', 'ifthen', 'repeat', 'binary', 'web'] },
    { name: 'AI 实验室', level: 'K2', color: 'grape', badge: 'AI 小侦探',
      intro: 'AI 是怎么说话的？它会错吗？怎么跟它说清楚？', games: ['next', 'wrong', 'rules', 'say3', 'ai'] },
    { name: '游戏工坊', level: 'K3–K4', color: 'tomato', badge: '游戏小工匠',
      intro: '游戏里的分数、按键、随机和位置，是怎么做出来的。', games: ['var', 'event', 'random', 'coord'] },
    { name: '让它动起来', level: 'K4–K5', color: 'sky', badge: '动画魔法师',
      intro: '画面怎么动、怎么撞、怎么换样子，坏了怎么修。', games: ['loop', 'hit', 'state', 'debug'] },
    { name: '高手工坊', level: 'K5–K6', color: 'bubble', badge: '作品小高手',
      intro: '把动作打包、做小工具、把数据存下来。', games: ['func', 'io', 'save'] },
  ];
  const byId = (id) => PG.games.find((g) => g.id === id);
  function stages() {
    return PG.STAGES.map((s, i) => ({ ...s, no: i + 1, list: s.games.map(byId).filter(Boolean) }));
  }
  function ordered() { return stages().flatMap((s) => s.list); }
  function stageOf(id) { return stages().find((s) => s.games.includes(id)); }

  // ---------- 进度 ----------
  const done = () => store.get('done', {});
  const need = (s) => Math.ceil(s.list.length / 2); // 上一站点亮一半，下一站就打开
  function unlocked(s) {
    if (s.no === 1 || store.get('unlockAll', false)) return true;
    const prev = stages()[s.no - 2];
    const d = done();
    return prev.list.filter((g) => d[g.id]).length >= need(prev);
  }
  function markDone(id) {
    const d = done(); d[id] = true; store.set('done', d);
    const s = stageOf(id);
    if (s && s.list.every((g) => d[g.id])) {
      const won = store.get('badges', {});
      if (!won[s.no]) { won[s.no] = true; store.set('badges', won); setTimeout(() => celebrate(s), 500); }
    }
  }

  // 徽章（SVG）：亮的、灰的、锁着的
  function badgeSvg(s, state) {
    const fill = state === 'won' ? `var(--${s.color})` : 'var(--card)';
    const inner = state === 'locked'
      ? '<rect x="22" y="30" width="20" height="15" rx="3" fill="var(--ink)"/><path d="M26 30v-5a6 6 0 0 1 12 0v5" fill="none" stroke="var(--ink)" stroke-width="3"/>'
      : `<text x="32" y="42" text-anchor="middle" font-size="24" font-family="ZCOOL KuaiLe, sans-serif" fill="${state === 'won' ? '#1b2440' : 'var(--ink-2)'}">${s.no}</text>`;
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 3l7 6 9-1 3 8 8 4-1 9 6 7-6 7 1 9-8 4-3 8-9-1-7 6-7-6-9 1-3-8-8-4 1-9-6-7 6-7-1-9 8-4 3-8 9 1z" fill="${fill}" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round" ${state === 'todo' ? 'stroke-dasharray="4 3"' : ''}/>${inner}</svg>`;
  }

  // 通关庆祝：彩纸 + 大徽章
  function celebrate(s) {
    sound('win');
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const layer = h('div', { class: 'celebrate', role: 'dialog', 'aria-label': '通关' });
    const cv = h('canvas', { 'aria-hidden': 'true' });
    const card = h('div', { class: 'celebrate-card sticker' },
      h('div', { class: 'big-badge', html: badgeSvg(s, 'won') }),
      h('p', { class: 'cel-k' }, '第 ' + s.no + ' 站 · ' + s.name + ' 通关！'),
      h('p', { class: 'cel-t' }, '拿到徽章：' + s.badge),
      h('button', { class: 'btn primary', type: 'button', style: { '--c': 'var(--' + s.color + ')' } }, '太棒了'));
    layer.append(cv, card);
    document.body.append(layer);
    const close = () => { alive = false; layer.remove(); };
    card.querySelector('button').addEventListener('click', close);
    let alive = !reduce;
    if (reduce) return;
    const ctx = cv.getContext('2d');
    const W = (cv.width = innerWidth), H = (cv.height = innerHeight);
    const cols = ['#ff5a47', '#ffbd1a', '#1fb36f', '#2f7cf6', '#8a5cf5', '#ff6fb0'];
    const bits = Array.from({ length: 140 }, () => ({ x: Math.random() * W, y: -Math.random() * H, v: 2 + Math.random() * 4, r: Math.random() * 6, c: cols[(Math.random() * 6) | 0], w: 6 + Math.random() * 6 }));
    const tick = () => {
      if (!alive) return;
      ctx.clearRect(0, 0, W, H);
      for (const b of bits) {
        b.y += b.v; b.r += 0.1; if (b.y > H + 20) b.y = -20;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r); ctx.fillStyle = b.c; ctx.fillRect(-b.w / 2, -3, b.w, 6); ctx.restore();
      }
      requestAnimationFrame(tick);
    };
    tick();
  }

  // ---------- 游戏页给游戏用的 api ----------
  function makeApi(game, root, cleanups) {
    const sec = (n, title, cls) => {
      const s = h('section', { class: 'step sticker ' + (cls || '') }, h('h2', null, h('span', { class: 'n' }, n), title));
      return s;
    };
    const playSec = sec('1', '先玩', 'play');
    const playHint = h('p', { class: 'hint' }, game.play || '');
    const stageBox = h('div', { class: 'stage-box' });
    const controlBox = h('div', { class: 'controls' });
    playSec.append(playHint, h('div', { class: 'play-area' }, stageBox, controlBox));
    const guessSec = sec('2', '猜一猜，改一改', 'guess-sec');
    guessSec.append(h('p', { class: 'hint' }, '先选你的答案，再按“试试看”，回到上面看看发生了什么。'));
    const guessBox = h('div');
    guessSec.append(guessBox);
    const saySec = sec('3', '说出来', 'say-sec');
    root.append(h('div', { class: 'steps' }, playSec, guessSec, saySec));

    const api = {
      game, root, h, sound, color, toast, store,
      stageBox, controlBox, guessBox,
      setHint(t) { playHint.textContent = t; },
      onCleanup(fn) { cleanups.push(fn); },
      on(target, ev, fn, opt) { target.addEventListener(ev, fn, opt); cleanups.push(() => target.removeEventListener(ev, fn, opt)); },

      // 画布：用固定的“逻辑尺寸”画，显示时自动缩放
      stage(w, hgt, parent) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const c = h('canvas', { width: Math.round(w * dpr), height: Math.round(hgt * dpr) });
        const ctx = c.getContext('2d');
        ctx.scale(dpr, dpr);
        (parent || stageBox).append(c);
        return {
          canvas: c, ctx, w, h: hgt,
          // 把鼠标/手指位置换成画布里的坐标
          pos(ev) {
            const r = c.getBoundingClientRect();
            const p = ev.touches ? ev.touches[0] : ev;
            return { x: ((p.clientX - r.left) * w) / r.width, y: ((p.clientY - r.top) * hgt) / r.height };
          },
          clear(bg) { ctx.clearRect(0, 0, w, hgt); if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, hgt); } },
        };
      },

      // 一直重复的动画；离开页面时自动停
      loop(fn) {
        let last = performance.now(), alive = true, id;
        const tick = (t) => {
          if (!alive) return;
          const dt = Math.min(0.05, (t - last) / 1000); last = t;
          try { fn(dt, t / 1000); } catch (e) { console.error(e); }
          id = requestAnimationFrame(tick);
        };
        id = requestAnimationFrame(tick);
        const stop = () => { alive = false; cancelAnimationFrame(id); };
        cleanups.push(stop);
        return stop;
      },

      overlay(text, onClick) {
        const o = h('button', { class: 'overlay', type: 'button', style: { border: '0', cursor: onClick ? 'pointer' : 'default', color: 'var(--ink)', width: '100%' } }, text);
        if (onClick) o.addEventListener('click', () => { o.remove(); onClick(); });
        stageBox.append(o);
        return o;
      },

      // 滑块：{label, min, max, step, value, unit, onInput}
      slider(o) {
        const id = 'c-' + game.id + '-' + Math.random().toString(36).slice(2, 7);
        const val = h('span', { class: 'val' }, o.value + (o.unit || ''));
        const input = h('input', { type: 'range', id, min: o.min, max: o.max, step: o.step || 1, value: o.value });
        const wrap = h('div', { class: 'ctl' }, h('label', { class: 'lab', for: id }, h('span', null, o.label), val), input);
        if (o.note) wrap.append(h('span', { class: 'small' }, o.note));
        const fire = () => { val.textContent = input.value + (o.unit || ''); o.onInput && o.onInput(Number(input.value)); };
        input.addEventListener('input', () => { fire(); sound('tick'); });
        (o.parent || controlBox).append(wrap);
        return {
          el: wrap, input,
          get: () => Number(input.value),
          set(v) { input.value = v; fire(); wrap.querySelector('.val').animate([{ transform: 'scale(1.3)' }, { transform: 'scale(1)' }], 400); },
        };
      },

      // 几个按钮选一个：{label, options:[{value,label}], value, onChange}
      choice(o) {
        const wrap = h('div', { class: 'ctl' });
        if (o.label) wrap.append(h('span', { class: 'lab' }, o.label));
        const seg = h('div', { class: 'seg', role: 'group', 'aria-label': o.label || '' });
        let cur = o.value;
        const btns = o.options.map((op) => {
          const b = h('button', { class: 'btn', type: 'button', 'aria-pressed': String(op.value === cur) }, op.label);
          b.addEventListener('click', () => { api_set(op.value); sound('pop'); });
          seg.append(b);
          return [op.value, b];
        });
        function api_set(v) {
          cur = v;
          btns.forEach(([val, b]) => b.setAttribute('aria-pressed', String(val === v)));
          o.onChange && o.onChange(v);
        }
        wrap.append(seg);
        (o.parent || controlBox).append(wrap);
        return { el: wrap, get: () => cur, set: api_set };
      },

      button(label, onClick, cls, parent) {
        const b = h('button', { class: 'btn ' + (cls || ''), type: 'button' }, label);
        b.addEventListener('click', onClick);
        (parent || controlBox).append(b);
        return b;
      },

      // 变量盒子之类的读数：返回 set(v)
      readout(label, value, parent) {
        let row = (parent || controlBox).querySelector(':scope > .readouts');
        if (!row) { row = h('div', { class: 'readouts' }); (parent || controlBox).append(row); }
        const v = h('span', { class: 'v' }, value);
        const box = h('div', { class: 'box-var' }, h('span', { class: 'k' }, label), v);
        row.append(box);
        let last = String(value);
        return {
          el: box,
          set(nv) {
            nv = String(nv);
            if (nv === last) return;
            last = nv; v.textContent = nv;
            box.classList.remove('pulse'); void box.offsetWidth; box.classList.add('pulse');
          },
        };
      },

      // 猜一猜：一组题，一题一题来。
      // 每题 {q, options:[...], answer: 下标, why: '为什么', apply(){ 把改动做出来 }}
      guesses(list) {
        let i = 0;
        const dots = h('div', { class: 'dots', 'aria-hidden': 'true' }, list.map(() => h('i')));
        const holder = h('div');
        const nav = h('div', { class: 'guess-nav' }, dots);
        guessBox.append(holder, nav);
        function show() {
          const g = list[i];
          [...dots.children].forEach((d, k) => d.classList.toggle('on', k <= i));
          holder.textContent = '';
          let picked = -1;
          const tryBtn = h('button', { class: 'btn primary', type: 'button', disabled: true }, '试试看！');
          const verdict = h('div', { hidden: true });
          const opts = g.options.map((t, k) => {
            const b = h('button', { class: 'btn', type: 'button', 'aria-pressed': 'false' }, t);
            b.addEventListener('click', () => {
              if (tryBtn.dataset.used) return;
              picked = k; opts.forEach((x, j) => x.setAttribute('aria-pressed', String(j === k)));
              tryBtn.disabled = false; sound('pop');
            });
            return b;
          });
          tryBtn.addEventListener('click', () => {
            if (picked < 0 || tryBtn.dataset.used) return;
            tryBtn.dataset.used = '1'; tryBtn.disabled = true;
            try { g.apply && g.apply(); } catch (e) { console.error(e); }
            const ok = g.answer == null || picked === g.answer;
            const answerText = g.answer == null ? '' : g.options[g.answer];
            setTimeout(() => {
              verdict.hidden = false;
              verdict.className = 'verdict ' + (ok ? 'ok' : 'no');
              verdict.textContent = '';
              verdict.append(
                h('b', null, ok ? '猜对了！' : '和你想的不一样！'),
                ok || !answerText ? '' : '答案是“' + answerText + '”。',
                g.why || ''
              );
              sound(ok ? 'ding' : 'boing');
              if (i < list.length - 1) next.hidden = false; else fin.hidden = false;
            }, g.delay == null ? 900 : g.delay);
            if (g.scroll !== false) stageBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
          });
          const next = h('button', { class: 'btn', type: 'button', hidden: true }, '下一题 →');
          next.addEventListener('click', () => { i++; show(); holder.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
          const fin = h('p', { class: 'small', hidden: true }, '题目做完啦，去第 3 步说一说吧。');
          holder.append(h('div', { class: 'guess' },
            h('p', { class: 'q' }, h('span', { class: 'qi' }, '第 ' + (i + 1) + ' 题'), g.q),
            h('div', { class: 'opts' }, opts),
            h('div', { class: 'guess-nav' }, tryBtn, next),
            verdict, fin));
        }
        show();
      },

      // 说出来：{left:'变量', right:'一个有名字、会变的数', example:'…', prompt:'请 AI 的话'}
      say(o) {
        const mk = (text, ph) => {
          const b = h('button', { class: 'blank', type: 'button', 'aria-label': '点一下看答案' }, ph);
          b.addEventListener('click', () => { b.textContent = text; b.classList.add('open'); sound('pop'); });
          return b;
        };
        const line = h('p', { class: 'line' }, '原来', mk(o.left, '？？'), '就是', mk(o.right, '？？？'));
        const star = h('button', { class: 'btn primary star-btn', type: 'button' }, '我说出来了，点亮星星 ★');
        star.addEventListener('click', () => {
          markDone(game.id); sound('win'); toast('点亮一颗星！');
          star.textContent = '已经点亮 ★'; star.disabled = true;
        });
        if (done()[game.id]) { star.textContent = '已经点亮 ★'; star.disabled = true; }
        const sec = root.querySelector('.say-sec');
        sec.append(
          h('p', { class: 'hint' }, '先自己用一句话说一遍，讲给老师或者家长听。说完再点空格看看答案。'),
          line,
          o.example ? h('p', { class: 'example' }, o.example) : null,
          star,
          o.prompt ? h('div', { class: 'mywork' }, h('b', null, '在你自己的作品里找一找'),
            h('p', { class: 'small' }, o.promptIntro || '把下面这句话发给 AI，让它帮你找到，先不要改：'),
            h('div', { class: 'prompt' }, o.prompt)) : null
        );
      },
    };
    return api;
  }

  // ---------- 页面 ----------
  const app = document.getElementById('app');
  let cleanups = [];
  let thumbStop = null;
  let little = store.get('little', false);

  function topbar(isHome) {
    const littleBtn = h('button', { class: 'pill-btn', type: 'button', 'aria-pressed': String(little), title: '8–10 岁的小朋友可以打开，会藏起大人的说法' }, '小小玩家模式');
    littleBtn.addEventListener('click', () => {
      little = !little; store.set('little', little);
      document.body.classList.toggle('little', little);
      littleBtn.setAttribute('aria-pressed', String(little));
    });
    const muteBtn = h('button', { class: 'pill-btn', type: 'button', 'aria-pressed': String(!muted) }, muted ? '声音：关' : '声音：开');
    muteBtn.addEventListener('click', () => {
      muted = !muted; store.set('muted', muted);
      muteBtn.textContent = muted ? '声音：关' : '声音：开';
      muteBtn.setAttribute('aria-pressed', String(!muted));
      if (!muted) sound('pop');
    });
    return h('div', { class: 'topbar' },
      isHome ? null : h('a', { class: 'back', href: '#home' }, '← 回游乐场'),
      h('span', { class: 'spacer' }), littleBtn, muteBtn);
  }

  function home() {
    const d = done();
    const all = ordered();
    const n = all.filter((g) => d[g.id]).length;
    const st = stages();
    const won = store.get('badges', {});
    const canvases = [];
    const stateOf = (s) => (!unlocked(s) ? 'locked' : won[s.no] ? 'won' : 'todo');
    app.append(
      topbar(true),
      h('header', { class: 'hero' },
        h('h1', null, '概念游乐场', h('span', { class: 'dot' }, '.')),
        h('p', { class: 'sub' }, '电脑和 AI 里藏着很多小秘密：电脑怎么听懂指令？分数是谁在记？AI 为什么会说错？一站一站闯过去，收集 6 枚徽章。'),
        h('div', { class: 'stars-bar' },
          h('span', null, '已经点亮 ' + n + ' / ' + all.length + ' 颗星'),
          h('span', { class: 'badge-row' }, st.map((s) => h('a', { class: 'mini-badge ' + stateOf(s), href: '#stage-' + s.no, title: s.name, 'aria-label': '第 ' + s.no + ' 站 ' + s.name, html: badgeSvg(s, stateOf(s)) }))))),
      h('div', { class: 'how' },
        h('div', { class: 'sticker' }, h('b', null, h('span', { class: 'n' }, '1'), '先玩'), h('span', null, '玩一会儿，看看里面在发生什么。')),
        h('div', { class: 'sticker' }, h('b', null, h('span', { class: 'n' }, '2'), '猜一猜，改一改'), h('span', null, '先猜会怎样，再动手改，看看猜得对不对。')),
        h('div', { class: 'sticker' }, h('b', null, h('span', { class: 'n' }, '3'), '说出来'), h('span', null, '用一句话说：原来____就是____。'))),
      h('div', { class: 'map' }, st.map((s) => {
        const state = stateOf(s);
        const lit = s.list.filter((g) => d[g.id]).length;
        const prev = st[s.no - 2];
        return h('section', { class: 'station ' + state, id: 'stage-' + s.no, style: { '--c': 'var(--' + s.color + ')' } },
          h('div', { class: 'station-head' },
            h('div', { class: 'station-badge', html: badgeSvg(s, state) }),
            h('div', { class: 'station-text' },
              h('p', { class: 'station-k' }, '第 ' + s.no + ' 站', h('span', { class: 'grown' }, ' · ' + s.level)),
              h('h2', null, s.name),
              h('p', { class: 'station-intro' }, s.intro)),
            h('div', { class: 'station-prog' },
              state === 'locked'
                ? h('span', null, '在“' + prev.name + '”点亮 ' + need(prev) + ' 颗星就能打开')
                : h('span', null, state === 'won' ? '已通关 · ' + s.badge : '点亮 ' + lit + ' / ' + s.list.length),
              h('span', { class: 'row', html: s.list.map((g) => starSvg(d[g.id])).join('') }))),
          h('div', { class: 'grid' }, s.list.map((g, i) => {
            const c = h('canvas', { width: 320, height: 200, 'aria-hidden': 'true' });
            if (g.thumb) canvases.push([c, g]);
            const inner = [
              h('div', { class: 'thumb' }, c, h('span', { class: 'no' }, '第 ' + (i + 1) + ' 关'),
                d[g.id] ? h('span', { class: 'done', html: starSvg(true).replace('class="s"', 'class="done"') }) : null),
              h('div', { class: 'body' }, h('h3', null, g.title), h('span', { class: 'tag' }, h('span', { class: 'grown' }, g.concept + ' · '), g.kid))];
            const style = { '--c': 'var(--' + (g.color || s.color) + ')' };
            if (state === 'locked') {
              const b = h('button', { class: 'gcard sticker is-locked', type: 'button', style }, inner);
              b.addEventListener('click', () => { sound('boing'); toast('先在“' + prev.name + '”点亮 ' + need(prev) + ' 颗星'); });
              return b;
            }
            return h('a', { class: 'gcard sticker', href: '#' + g.id, style }, inner);
          })));
      })),
      teacherNote());
    // 首页小动画
    if (canvases.length) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvases.forEach(([c]) => { c.width = 320 * dpr; c.height = 200 * dpr; c.getContext('2d').scale(dpr, dpr); });
      const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
      let alive = true, t0 = performance.now();
      const draw = (now) => {
        if (!alive) return;
        const t = (now - t0) / 1000;
        canvases.forEach(([c, g]) => {
          const ctx = c.getContext('2d');
          ctx.clearRect(0, 0, 320, 200);
          try { g.thumb(ctx, 320, 200, reduce ? 1 : t); } catch (e) { /* 缩略图坏了不影响首页 */ }
        });
        if (!reduce) requestAnimationFrame(draw);
      };
      requestAnimationFrame(draw);
      thumbStop = () => { alive = false; };
    }
  }

  function teacherNote() {
    const all = store.get('unlockAll', false);
    const btn = h('button', { class: 'pill-btn', type: 'button', 'aria-pressed': String(all) }, all ? '已经全部打开' : '老师：把所有站都打开');
    btn.addEventListener('click', () => { store.set('unlockAll', !store.get('unlockAll', false)); route(); });
    const reset = h('button', { class: 'pill-btn', type: 'button' }, '清空这台电脑上的星星');
    let armed = false;
    reset.addEventListener('click', () => {
      if (!armed) { armed = true; reset.textContent = '再点一次，确定清空'; return; }
      store.set('done', {}); store.set('badges', {}); route();
    });
    return h('section', { class: 'teacher-note sticker' },
      h('h2', null, '给老师'),
      h('ul', null,
        h('li', null, '一站对应一级课程：电脑小岛 K0，程序森林 K1，AI 实验室 K2，后面三站配 K3–K6 的作品。'),
        h('li', null, '每次课最多玩一两关，5–15 分钟，放在讲完那一级对应内容之后，或者孩子做作品的间隙。'),
        h('li', null, '让孩子先猜再按“试试看”，猜错了是好事，问他“为什么和你想的不一样”。'),
        h('li', null, '第 3 步让孩子先自己说，再点空格看答案；把孩子的原话记进课后记录。'),
        h('li', null, '上一站点亮一半的星星，下一站才打开。孩子直接从后面的级别开始时，点下面的按钮全部打开。'),
        h('li', null, '8–10 岁打开右上角“小小玩家模式”，藏起“变量”“函数”这类大人的说法。'),
        h('li', null, '星星只记在这台电脑的浏览器里，换电脑、清浏览器就没了；不会上传任何东西。')),
      h('div', { class: 'seg' }, btn, reset));
  }

  function gamePage(g) {
    const s = stageOf(g.id);
    const list = s ? s.list : [g];
    const color = g.color || (s && s.color) || 'sky';
    const bar = topbar(false);
    if (s) bar.querySelector('.back').setAttribute('href', '#stage-' + s.no);
    app.append(
      bar,
      h('header', { class: 'ghead', style: { '--c': 'var(--' + color + ')' } },
        h('div', { class: 'meta' },
          s ? h('a', { class: 'chip', href: '#stage-' + s.no, style: { textDecoration: 'none' } }, '第 ' + s.no + ' 站 ' + s.name + ' · 第 ' + (list.indexOf(g) + 1) + ' 关') : null,
          h('span', { class: 'chip concept grown' }, '这叫：' + g.concept), h('span', { class: 'chip grown' }, '适合 ' + (g.level || ''))),
        h('h1', null, g.title),
        h('p', { class: 'hint' }, g.kid ? '一句话：' + g.kid : '')));
    const root = h('main', { style: { '--c': 'var(--' + color + ')' } });
    app.append(root);
    const api = makeApi(g, root, cleanups);
    try { g.mount(api); } catch (e) { console.error(e); root.append(h('p', null, '这个游戏出了点问题，请告诉老师。')); }
    // 上一关、下一关（按地图顺序，跨站也接得上）
    const seq = ordered();
    const k = seq.indexOf(g);
    const nav = h('div', { class: 'guess-nav', style: { marginTop: '26px' } });
    if (seq[k - 1]) nav.append(h('a', { class: 'btn', href: '#' + seq[k - 1].id, style: { textDecoration: 'none' } }, '← ' + seq[k - 1].title));
    const next = seq[k + 1];
    if (next) {
      const ns = stageOf(next.id);
      if (ns && !unlocked(ns)) nav.append(h('span', { class: 'small' }, '下一站“' + ns.name + '”还锁着：这一站再点亮几颗星就能打开。'));
      else nav.append(h('a', { class: 'btn', href: '#' + next.id, style: { textDecoration: 'none' } }, next.title + ' →'));
    }
    app.append(nav);
  }

  function route() {
    cleanups.forEach((f) => { try { f(); } catch (e) { /* ignore */ } });
    cleanups = [];
    if (thumbStop) { thumbStop(); thumbStop = null; }
    app.textContent = '';
    document.body.classList.toggle('little', little);
    const id = location.hash.replace('#', '');
    const g = PG.games.find((x) => x.id === id);
    if (g) gamePage(g); else home();
    const anchor = !g && /^stage-\d$/.test(id) && document.getElementById(id);
    if (anchor) anchor.scrollIntoView(); else window.scrollTo(0, 0);
    document.title = g ? g.title + ' · 概念游乐场' : '概念游乐场';
  }
  window.addEventListener('hashchange', route);
  PG.start = route;
})();
