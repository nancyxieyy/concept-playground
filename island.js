/* 电脑小岛 · 周日试玩
   六站都留在地图上（见 REGIONS）。真正打磨的只有一条：
   mouse 开门热身 → files 搬家小队 → order 机器人出门 → repeat 乌龟画画。
   其余关卡的原文件还在仓库里，这里不加载、地图上锁住。

   解锁规则：mode 'clear' = 上一关完成就解锁。
   改成 mode 'stars' 后，上一关达到 starsNeeded 颗星才解锁（例如 2 星）。 */
(function () {
  'use strict';

  const UNLOCK_RULE = { mode: 'clear', starsNeeded: 2 };
  const STORE = 'island:v1';
  const DBL = 400;
  const IDLE = 20000;
  const MAGNET = 60;
  const DOOR_MAGNET = 80;

  const LEVELS = [
    { id: 'mouse', name: '开门热身', accent: 'sun' },
    { id: 'files', name: '搬家小队', accent: 'grass' },
    { id: 'order', name: '机器人出门', accent: 'tomato' },
    { id: 'repeat', name: '乌龟画画', accent: 'sky' },
  ];
  const REGIONS = [
    { id: 'island', name: '电脑小岛', live: true },
    { id: 'forest', name: '程序森林', live: false },
    { id: 'lab', name: 'AI实验室', live: false },
    { id: 'workshop', name: '游戏工坊', live: false },
    { id: 'motion', name: '让它动起来', live: false },
    { id: 'craft', name: '高手工坊', live: false },
  ];

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const app = document.getElementById('app');
  let cleanups = [];
  let audioCtx = null;
  let booted = false;

  function h(tag, props, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'style' && v && typeof v === 'object') Object.assign(e.style, v);
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) {
      if (c == null || c === false) continue;
      e.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return e;
  }

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE)) || {}; }
    catch (e) { return {}; }
  }
  function save(p) {
    try { localStorage.setItem(STORE, JSON.stringify(p)); } catch (e) { /* 仍可玩 */ }
  }
  function patch(fn) {
    const p = load();
    fn(p);
    save(p);
    return p;
  }
  function rec(id) { return (load().levels || {})[id] || null; }
  function isUnlocked(i) {
    if (i <= 0) return true;
    const prev = rec(LEVELS[i - 1].id);
    if (!prev || !prev.cleared) return false;
    if (UNLOCK_RULE.mode === 'stars') return (prev.stars || 0) >= UNLOCK_RULE.starsNeeded;
    return true;
  }
  function clearedCount() {
    return LEVELS.filter((g) => rec(g.id) && rec(g.id).cleared).length;
  }
  function totalStars() {
    return LEVELS.reduce((n, g) => n + ((rec(g.id) && rec(g.id).stars) || 0), 0);
  }

  function unlockAudio() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) { /* 没声音也能玩 */ }
  }
  function sound(kind) {
    if (load().muted) return;
    try {
      unlockAudio();
      if (!audioCtx) return;
      const notes = {
        pop: [[660, 0.06]], tick: [[880, 0.04]], ding: [[880, 0.08], [1320, 0.1]],
        buzz: [[180, 0.16, 'sawtooth']], boing: [[320, 0.06], [520, 0.09]],
        win: [[523, 0.09], [659, 0.09], [784, 0.1], [1047, 0.16]],
        step: [[520, 0.04]],
      }[kind] || [[600, 0.05]];
      let t = audioCtx.currentTime;
      for (const [f, d, type] of notes) {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = type || 'triangle';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.16, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g).connect(audioCtx.destination);
        o.start(t); o.stop(t + d + 0.02);
        t += d * 0.85;
      }
    } catch (e) { /* 忽略 */ }
  }

  function cleanupAll() {
    cleanups.forEach((fn) => { try { fn(); } catch (e) { /* 忽略 */ } });
    cleanups = [];
  }
  function later(fn, ms) {
    const id = setTimeout(fn, ms);
    cleanups.push(() => clearTimeout(id));
    return id;
  }
  function sleep(ms) {
    return new Promise((res) => { later(() => res(true), ms); });
  }

  function toast(text) {
    const t = h('div', { class: 'toast', role: 'status' }, text);
    document.body.append(t);
    setTimeout(() => t.remove(), 1600);
  }

  function starIcons(n) {
    return [0, 1, 2].map((i) => h('span', { class: i < n ? 'on' : '' }, '★'));
  }

  function svgIco(kind) {
    const common = 'stroke="#1b2440" stroke-width="3" fill="none" stroke-linejoin="round"';
    const paths = {
      star: '<polygon points="24,4 30,18 46,18 33,28 38,44 24,34 10,44 15,28 2,18 18,18" fill="#ffbd1a" ' + common + '/>',
      pointer: '<path d="M12 4l5 36 8-12 14 10 5-7-14-9 12-4z" fill="#ffbd1a" ' + common + '/>',
      door: '<rect x="10" y="6" width="28" height="38" rx="3" fill="#c9843a" ' + common + '/><circle cx="30" cy="26" r="3" fill="#ffbd1a" stroke="#1b2440" stroke-width="2"/>',
      folder: '<path d="M6 16h14l4 4h18v20H6z" fill="#ffe08a" ' + common + '/>',
      bot: '<rect x="12" y="10" width="24" height="18" rx="4" fill="#d7deea" ' + common + '/><rect x="16" y="30" width="16" height="12" rx="3" fill="#ff5a47" ' + common + '/>',
      turtle: '<ellipse cx="24" cy="28" rx="14" ry="10" fill="#1fb36f" ' + common + '/><circle cx="36" cy="24" r="5" fill="#b7ebc8" ' + common + '/>',
      img: '<rect x="6" y="8" width="36" height="32" rx="3" fill="#fff" ' + common + '/><circle cx="16" cy="18" r="4" fill="#ffbd1a" stroke="#1b2440"/><path d="M8 34l10-10 8 8 6-6 8 8" fill="#9fd8ff" stroke="#1b2440" stroke-width="2"/>',
      song: '<ellipse cx="16" cy="34" rx="7" ry="5" fill="#8a5cf5" stroke="#1b2440" stroke-width="3"/><path d="M22 34V12l16-4v18" ' + common + '/>',
      doc: '<path d="M14 6h14l10 10v26H14z" fill="#fff" ' + common + '/><path d="M28 6v10h10"/>',
      game: '<rect x="8" y="16" width="32" height="20" rx="8" fill="#ff5a47" ' + common + '/><path d="M16 26h8M20 22v8" stroke="#fff" stroke-width="3"/>',
      note: '<path d="M14 6h14l10 10v26H14z" fill="#fff6dc" ' + common + '/><path d="M20 24h12M20 30h8" stroke="#1b2440" stroke-width="2"/>',
    };
    const e = h('span', { class: 'ico', html: '<svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">' + (paths[kind] || paths.doc) + '</svg>' });
    return e;
  }

  function checkLen(kind, text, max) {
    const n = [...text].length;
    if (n > max) console.error('文字超限', kind, n, text);
  }

  let routeLock = false;
  function go(hash) {
    if (location.hash === '#' + hash) onRoute();
    else location.hash = hash;
  }

  function luckyImg(mood) {
    const img = h('img', { src: 'assets/lucky.svg', alt: 'Lucky', width: '72', height: '72', class: 'mood-' + (mood || 'idle') });
    return img;
  }

  function showMap() {
    cleanupAll();
    app.replaceChildren();
    app.className = 'app';
    app.style.setProperty('--accent', 'var(--sun)');
    document.body.dataset.level = 'map';
    document.body.dataset.phase = '';
    document.title = '电脑小岛 · 概念游乐场';
    const data = load();
    const n = clearedCount();
    const stars = totalStars();
    const all = n === LEVELS.length;
    const current = LEVELS.findIndex((g, i) => isUnlocked(i) && !(rec(g.id) && rec(g.id).cleared));
    const showGo = !(rec('mouse') && rec('mouse').cleared);

    const trail = h('div', { class: 'trail' });
    const chestRow = h('div', { class: 'row' });
    chestRow.append(h('div', { class: 'lucky-slot' }));
    const chest = h('div', { class: 'chest' + (all ? ' open' : ''), 'data-testid': 'map-chest', 'aria-label': all ? '岛主徽章' : '宝箱' });
    chest.append(h('div', { class: 'lid' }));
    const wrap = h('div', { style: { position: 'relative' } }, chest);
    if (all) wrap.append(h('div', { class: 'badge', 'data-testid': 'map-badge' }, '电脑小岛岛主'));
    chestRow.append(wrap);
    trail.append(chestRow);

    for (let i = LEVELS.length - 1; i >= 0; i--) {
      const g = LEVELS[i];
      const open = isUnlocked(i);
      const done = rec(g.id) && rec(g.id).cleared;
      const starsN = (rec(g.id) && rec(g.id).stars) || 0;
      const on = i === current;
      trail.append(h('div', { class: 'seg' + (done ? ' on' : '') }));
      const row = h('div', { class: 'row' });
      const slot = h('div', { class: 'lucky-slot' });
      if (on) slot.append(luckyImg('idle'));
      row.append(slot);
      const btn = h('button', {
        class: 'node' + (open ? '' : ' locked') + (done ? ' done' : '') + (on ? ' current' : ''),
        type: 'button',
        'data-testid': 'map-node-' + g.id,
        'aria-label': g.name,
      }, svgIco(g.id === 'mouse' ? 'door' : g.id === 'files' ? 'folder' : g.id === 'order' ? 'bot' : 'turtle'),
        h('span', null, h('span', { class: 'nm' }, g.name), h('span', { class: 'stars star-row' }, starIcons(starsN))));
      btn.addEventListener('click', () => {
        sound('pop');
        if (!open) {
          btn.classList.add('shake');
          later(() => btn.classList.remove('shake'), 450);
          toast('先过上一关');
          return;
        }
        go(g.id);
      });
      row.append(btn);
      trail.append(row);
    }

    const regions = h('aside', { class: 'regions', 'aria-label': '六个区域' });
    REGIONS.forEach((r) => {
      const b = h('button', {
        class: 'region' + (r.live ? ' on' : ' locked'),
        type: 'button',
        'aria-pressed': r.live ? 'true' : 'false',
        'data-testid': 'region-' + r.id,
      }, r.name, r.live ? '' : '🔒');
      b.addEventListener('click', () => {
        if (r.live) return;
        sound('boing');
        b.classList.add('shake');
        later(() => b.classList.remove('shake'), 450);
        toast('还没开放');
      });
      regions.append(b);
    });

    let resetArm = false;
    const resetBtn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': '清空进度', title: '清空进度' }, '↺');
    resetBtn.addEventListener('click', () => {
      if (!resetArm) { resetArm = true; toast('再按一次'); resetBtn.textContent = '？'; return; }
      save({ muted: load().muted });
      showMap();
    });
    const muteBtn = h('button', {
      class: 'icon-btn', type: 'button', 'aria-label': '声音', 'aria-pressed': String(!data.muted), 'data-testid': 'mute',
    }, data.muted ? '🔇' : '🔊');
    muteBtn.addEventListener('click', () => {
      const m = !load().muted;
      patch((p) => { p.muted = m; });
      muteBtn.textContent = m ? '🔇' : '🔊';
      muteBtn.setAttribute('aria-pressed', String(!m));
      if (!m) { unlockAudio(); sound('pop'); }
    });

    const island = h('div', { class: 'island' + (showGo ? ' has-go' : ''), 'data-testid': 'island' }, trail);
    if (showGo) {
      const goBtn = h('button', { class: 'btn primary', type: 'button', 'data-testid': 'map-go' }, '出发！');
      goBtn.addEventListener('click', () => { sound('pop'); go('mouse'); });
      island.append(h('div', { class: 'go-wrap' }, goBtn));
    }

    app.append(
      h('header', { class: 'top' },
        h('h1', null, '电脑小岛'),
        h('span', { class: 'spacer' }),
        h('span', { class: 'prog', 'data-testid': 'map-prog' }, n + '/4'),
        h('span', { class: 'prog', 'data-testid': 'map-stars' }, '★' + stars),
        resetBtn, muteBtn),
      h('div', { class: 'world', 'data-screen': 'map' }, island, regions)
    );
    if (all && !data.badgeSeen) {
      sound('win');
      patch((p) => { p.badgeSeen = true; });
    }
  }

  function showLevel(meta) {
    cleanupAll();
    app.replaceChildren();
    const idx = LEVELS.findIndex((g) => g.id === meta.id);
    app.className = 'app level';
    app.style.setProperty('--accent', 'var(--' + meta.accent + ')');
    document.body.dataset.level = meta.id;
    document.title = meta.name + ' · 电脑小岛';

    const taskEl = h('div', { class: 'task', 'data-testid': 'task' });
    const sayEl = h('div', { class: 'say', 'data-testid': 'say', role: 'status' });
    const stage = h('div', { class: 'stage', 'data-testid': 'stage' });
    const lucky = luckyImg('idle');
    let sayTimer = 0;
    let streak = 0;
    let hintText = '';
    let hintClicked = false;
    let targetFn = () => null;
    let idleTimer = 0;
    let dragging = false;
    let overlayOn = false;
    let alive = true;
    let finished = false;
    cleanups.push(() => { alive = false; clearTimeout(sayTimer); clearTimeout(idleTimer); });

    function setMood(m) {
      lucky.className = 'mood-' + m;
    }
    function setTask(t) {
      checkLen('任务', t, 15);
      taskEl.textContent = t;
    }
    function setHint(t) { hintText = t; }
    function setTarget(fn) { targetFn = fn; }
    function say(text, kind) {
      if (!text || dragging) return;
      checkLen('反馈', text, kind === 'line' ? 20 : 12);
      clearTimeout(sayTimer);
      sayEl.className = 'say on ' + (kind || '');
      sayEl.replaceChildren(h('i', null, kind === 'ok' ? '✓' : '↺'), document.createTextNode(text));
      setMood(kind === 'ok' ? 'happy' : kind === 'hint' ? 'think' : 'wow');
      sayTimer = setTimeout(() => {
        sayEl.className = 'say';
        if (!overlayOn) setMood('idle');
      }, 2000);
      cleanups.push(() => clearTimeout(sayTimer));
    }
    function hush() {
      clearTimeout(sayTimer);
      sayEl.className = 'say';
      sayEl.replaceChildren();
      if (!overlayOn) setMood('idle');
    }
    function flash(el) {
      const node = el || (targetFn && targetFn());
      if (!node) return;
      node.classList.remove('flash');
      void node.offsetWidth;
      node.classList.add('flash', 'show-answer');
      later(() => node.classList.remove('flash'), 2200);
    }
    function bumpIdle() {
      clearTimeout(idleTimer);
      if (overlayOn || !alive) return;
      idleTimer = setTimeout(() => { if (alive && !overlayOn) flash(); }, IDLE);
    }
    function fail(text) {
      streak++;
      if (streak >= 2 && hintText) say(hintText, 'hint');
      else say(text, 'no');
      if (streak >= 3) flash();
      setMood('wow');
      later(() => { if (!overlayOn) setMood('think'); }, 400);
    }
    function right() {
      streak = 0;
      setMood('happy');
    }
    function snap(el) {
      if (reduced) { el.style.transition = 'none'; el.style.transform = ''; return; }
      el.style.transition = 'transform 380ms cubic-bezier(.2,1.15,.3,1)';
      el.style.transform = '';
      later(() => { el.style.transition = ''; }, 400);
    }
    function near(el, target, radius) {
      if (!el || !target) return false;
      const a = el.getBoundingClientRect();
      const b = target.getBoundingClientRect();
      const cx = a.left + a.width / 2;
      const cy = a.top + a.height / 2;
      return cx >= b.left - radius && cx <= b.right + radius && cy >= b.top - radius && cy <= b.bottom + radius;
    }
    const hots = new Set();
    function markHot(el) {
      hots.forEach((n) => n.classList.remove('is-hot'));
      hots.clear();
      if (el) { el.classList.add('is-hot'); hots.add(el); }
    }

    let dragPid = null;
    function dragItem(el, opts) {
      let pid = null, sx = 0, sy = 0, moved = false, lastTap = 0, tapTimer = 0;
      const down = (e) => {
        if (pid != null || dragPid != null || (e.button && e.button !== 0)) return;
        if (el.dataset.lock === '1') return;
        pid = dragPid = e.pointerId;
        sx = e.clientX; sy = e.clientY; moved = false;
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* 旧浏览器 */ }
        bumpIdle();
      };
      const move = (e) => {
        if (e.pointerId !== pid) return;
        const dx = e.clientX - sx;
        const dy = e.clientY - sy;
        if (!moved && Math.hypot(dx, dy) < 8) return;
        moved = true;
        dragging = true;
        clearTimeout(tapTimer);
        el.classList.add('is-dragging');
        const lift = reduced ? 0 : -20;
        const sc = reduced ? 1 : 1.12;
        el.style.transition = 'none';
        el.style.transform = 'translate(' + dx + 'px, ' + (dy + lift) + 'px) scale(' + sc + ')';
        markHot(opts.hits ? opts.hits(el) : null);
      };
      const up = (e) => {
        if (e.pointerId !== pid) return;
        pid = null; dragPid = null;
        const wasDrag = moved;
        moved = false;
        dragging = false;
        el.classList.remove('is-dragging');
        if (wasDrag) {
          const hot = opts.hits ? opts.hits(el) : null;
          markHot(null);
          if (hot && opts.onAccept) {
            const ok = opts.onAccept(hot);
            if (!ok) snap(el);
          } else {
            snap(el);
            if (opts.onReject) opts.onReject();
          }
          return;
        }
        const now = performance.now();
        if (now - lastTap < DBL) {
          clearTimeout(tapTimer);
          lastTap = 0;
          if (opts.onDouble) opts.onDouble();
        } else {
          lastTap = now;
          if (opts.onSingle) opts.onSingle();
          if (opts.singleDelay) {
            clearTimeout(tapTimer);
            tapTimer = setTimeout(() => { if (alive) opts.singleDelay(); }, DBL);
          }
        }
      };
      const cancel = (e) => {
        if (e.pointerId !== pid) return;
        pid = null; dragPid = null; dragging = false;
        el.classList.remove('is-dragging');
        markHot(null);
        snap(el);
      };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', cancel);
      cleanups.push(() => {
        clearTimeout(tapTimer);
        el.removeEventListener('pointerdown', down);
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerup', up);
        el.removeEventListener('pointercancel', cancel);
      });
    }

    function cover(node, screen) {
      const old = stage.querySelector('.overlay');
      if (old) old.remove();
      const layer = h('div', { class: 'overlay', 'data-screen': screen });
      layer.append(node);
      stage.append(layer);
      overlayOn = true;
      sayEl.className = 'say';
      return layer;
    }
    function uncover() {
      const old = stage.querySelector('.overlay');
      if (old) old.remove();
      overlayOn = false;
      setMood('idle');
    }

    async function finish(opts) {
      if (finished || !alive) return;
      finished = true;
      clearTimeout(idleTimer);
      patch((p) => {
        p.levels = p.levels || {};
        const prev = p.levels[meta.id] || {};
        p.levels[meta.id] = { cleared: true, stars: Math.max(prev.stars || 0, 1) };
      });
      checkLen('点破', opts.line, 20);
      checkLen('概念', opts.title, 12);
      const sheet = h('div', { class: 'sheet' },
        h('p', { class: 'kicker' }, opts.title),
        h('p', { class: 'line' }));
      const lineEl = sheet.querySelector('.line');
      if (opts.lineHtml) lineEl.innerHTML = opts.lineHtml;
      else lineEl.textContent = opts.line;
      if (opts.icon) sheet.append(h('div', { class: 'sheet-ico', 'aria-hidden': 'true' }, svgIco(opts.icon)));
      cover(sheet, 'concept');
      setMood('happy');
      sound('ding');
      await sleep(reduced ? 400 : 2000);
      if (!alive) return;
      let quizOK = false;
      if (opts.quiz) {
        quizOK = await ask(opts.quiz);
        if (!alive) return;
        if (opts.quiz.demo) opts.quiz.demo(quizOK);
        await sleep(900);
        if (!alive) return;
      }
      const stars = quizOK && !hintClicked ? 3 : quizOK ? 2 : 1;
      patch((p) => {
        p.levels = p.levels || {};
        const prev = p.levels[meta.id] || {};
        p.levels[meta.id] = { cleared: true, stars: Math.max(prev.stars || 0, stars) };
      });
      await settle(stars, opts.extra);
    }

    function ask(q) {
      checkLen('题目', q.q, 15);
      q.options.forEach((o) => checkLen('选项', o.t, 6));
      return new Promise((resolve) => {
        let done = false;
        const opts = h('div', { class: 'opts' });
        const sheet = h('div', { class: 'sheet' }, h('p', { class: 'kicker', style: { fontSize: '28px' } }, q.q), opts);
        q.options.forEach((o) => {
          const b = h('button', { class: 'opt', type: 'button', 'data-testid': 'quiz-' + o.t }, o.t);
          b.addEventListener('click', () => {
            if (done) return;
            done = true;
            b.classList.add(o.ok ? 'good' : 'bad');
            if (!o.ok) {
              sound('boing');
              const rightBtn = [...opts.children].find((x, i) => q.options[i].ok);
              if (rightBtn) rightBtn.classList.add('good');
              say(q.miss || '看看这个', 'hint');
            } else sound('ding');
            later(() => { uncover(); resolve(!!o.ok); }, 700);
          });
          opts.append(b);
        });
        cover(sheet, 'quiz');
      });
    }

    function settle(stars, extra) {
      return new Promise((resolve) => {
        const next = LEVELS[idx + 1];
        const actions = h('div', { class: 'actions' });
        const primary = h('button', { class: 'btn primary', type: 'button', 'data-testid': 'next' }, next ? '下一关' : '看宝箱');
        const back = h('button', { class: 'btn', type: 'button', 'data-testid': 'back-map' }, '回地图');
        primary.addEventListener('click', () => { sound('pop'); go(next ? next.id : 'map'); resolve(); });
        back.addEventListener('click', () => { sound('pop'); go('map'); resolve(); });
        actions.append(primary, back);
        if (extra) {
          const b = h('button', { class: 'btn', type: 'button', 'data-testid': 'extra' }, extra.label);
          b.addEventListener('click', () => { uncover(); extra.onClick(); resolve(); });
          actions.append(b);
        }
        const sheet = h('div', { class: 'sheet' },
          h('div', { class: 'star-row', 'data-testid': 'settle-stars' }, starIcons(stars)),
          actions);
        cover(sheet, 'settle');
        sound('win');
        setMood('happy');
      });
    }

    const hintBtn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': '提示', 'data-testid': 'hint' }, '💡');
    hintBtn.addEventListener('click', () => {
      hintClicked = true;
      sound('tick');
      if (hintText) say(hintText, 'hint');
      setMood('think');
      flash();
    });
    const homeBtn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': '回地图', 'data-testid': 'home' }, '🏠');
    homeBtn.addEventListener('click', () => go('map'));
    const muteBtn = h('button', {
      class: 'icon-btn', type: 'button', 'aria-label': '声音', 'aria-pressed': String(!load().muted),
    }, load().muted ? '🔇' : '🔊');
    muteBtn.addEventListener('click', () => {
      const m = !load().muted;
      patch((p) => { p.muted = m; });
      muteBtn.textContent = m ? '🔇' : '🔊';
      muteBtn.setAttribute('aria-pressed', String(!m));
      if (!m) { unlockAudio(); sound('pop'); }
    });

    app.append(
      h('header', { class: 'top' }, homeBtn, taskEl, hintBtn, muteBtn),
      h('div', { class: 'stage-wrap' }, stage),
      h('footer', { class: 'dock' }, h('div', { class: 'lucky-slot' }, lucky), sayEl)
    );

    stage.addEventListener('pointerdown', bumpIdle);
    bumpIdle();

    const api = {
      stage, setTask, setHint, setTarget, say, hush, fail, right, sound, flash, dragItem, near, snap,
      sleep, finish, cover, uncover, h, svgIco, later, markHot,
      get alive() { return alive; },
      get reduced() { return reduced; },
      set dragging(v) { dragging = v; },
      bumpIdle, MAGNET, DOOR_MAGNET,
    };
    const mounts = { mouse: mountMouse, files: mountFiles, order: mountOrder, repeat: mountRepeat };
    try { mounts[meta.id](api); }
    catch (e) { console.error(e); say('这关出了点问题', 'no'); }
  }

  function onRoute() {
    if (routeLock) { routeLock = false; return; }
    const id = (location.hash || '#map').replace('#', '') || 'map';
    if (id === 'map') { showMap(); return; }
    const i = LEVELS.findIndex((g) => g.id === id);
    if (i < 0 || !isUnlocked(i)) {
      toast(i < 0 ? '还没开放' : '先过上一关');
      if (location.hash !== '#map') {
        routeLock = true;
        location.replace('#map');
      }
      showMap();
      return;
    }
    showLevel(LEVELS[i]);
  }

  document.body.addEventListener('pointerdown', () => unlockAudio(), { capture: true });

  // ---------- ① 开门热身 ----------
  function mountMouse(api) {
    const { stage, h, setTask, setHint, setTarget, fail, right, sound, dragItem, near } = api;
    let step = 0;
    let lit = 0;
    setTask('点亮三颗星');
    setHint('点亮星星');
    const stars = [0, 1, 2].map((i) => h('button', {
      class: 'star-btn', type: 'button', 'data-testid': 'mouse-star-' + i, 'aria-label': '星星',
    }, '☆'));
    const gift = h('div', { class: 'gift', 'data-testid': 'mouse-gift', 'aria-label': '礼物盒' },
      h('div', { class: 'lid' }), h('div', { class: 'box' }));
    const key = h('div', { class: 'key', 'data-testid': 'mouse-key', 'aria-label': '钥匙', hidden: true }, '🔑');
    const door = h('div', { class: 'door', 'data-testid': 'mouse-door', 'aria-label': '门' }, h('div', { class: 'hole' }));
    const col = h('div', { class: 'pieces' }, stars);
    stage.append(h('div', { class: 'mouse-scene' }, col, h('div', { class: 'pieces stack' }, gift, key), door));
    setTarget(() => stars.find((s) => !s.classList.contains('lit')) || null);

    stars.forEach((s) => {
      s.addEventListener('pointerdown', () => {
        if (step !== 0 || s.classList.contains('lit')) return;
        s.classList.add('lit');
        s.textContent = '★';
        sound('pop');
      });
      s.addEventListener('click', () => {
        if (step !== 0) return;
        if (!s.classList.contains('lit')) return;
        lit = stars.filter((x) => x.classList.contains('lit')).length;
        if (lit >= 3) {
          right();
          sound('ding');
          step = 1;
          setTask('打开礼物盒');
          setHint('快点两下');
          setTarget(() => gift);
          gift.classList.add('glow');
        }
      });
    });

    dragItem(gift, {
      hits: () => null,
      onSingle() {
        if (step !== 1) return;
        gift.classList.add('selected');
        sound('pop');
      },
      singleDelay() {
        if (step !== 1 || gift.classList.contains('open')) return;
        fail('快点两下：咚咚！');
      },
      onDouble() {
        if (step !== 1) return;
        gift.classList.add('open', 'selected');
        gift.classList.remove('glow');
        right();
        sound('boing');
        step = 2;
        key.hidden = false;
        setTask('把钥匙拖到门');
        setHint('拖到门上');
        setTarget(() => door);
        door.classList.add('glow');
      },
    });

      function unlockDoor() {
      if (step !== 2) return false;
      step = 3;
      door.classList.add('open');
      door.classList.remove('glow');
      key.dataset.lock = '1';
      right();
      sound('win');
      api.finish({
        title: '鼠标',
        icon: 'pointer',
        line: '单击选中 · 双击打开 · 拖动搬走',
        quiz: {
          q: '只点一下会怎样',
          miss: '点一下是选中',
          options: [
            { t: '变成选中', ok: true },
            { t: '盒子打开', ok: false },
            { t: '完全没变', ok: false },
          ],
          demo() {
            gift.classList.add('selected');
            gift.classList.remove('open');
          },
        },
      });
      return true;
    }

    dragItem(key, {
      hits: () => (step === 2 && near(key, door, DOOR_MAGNET) ? door : null),
      onAccept() { return unlockDoor(); },
      onReject() { if (step === 2) fail('拖到门上'); },
      onSingle() {
        if (step !== 2) return;
        key.classList.add('picked');
        sound('tick');
      },
    });
    door.addEventListener('click', () => {
      if (step === 2 && key.classList.contains('picked')) unlockDoor();
    });
    document.body.dataset.phase = 'stars';
    const phaseWatch = setInterval(() => {
      document.body.dataset.phase = step === 0 ? 'stars' : step === 1 ? 'gift' : 'key';
    }, 200);
    cleanups.push(() => clearInterval(phaseWatch));
  }

  // ---------- ② 搬家小队 ----------
  function mountFiles(api) {
    const { stage, h, setTask, setHint, setTarget, fail, right, sound, dragItem, near, svgIco } = api;
    let phase = 'sort';
    let loc = 'desk';
    let sawCat = false;
    const nodes = {
      desk: { name: '桌面', kind: 'root' },
      draw: { name: '画画', kind: 'folder', parent: 'desk' },
      music: { name: '音乐', kind: 'folder', parent: 'desk' },
      work: { name: '作品', kind: 'folder', parent: 'desk' },
      cat: { name: '小猫', kind: 'file', icon: 'img', parent: 'desk', want: 'draw' },
      song: { name: '歌曲', kind: 'file', icon: 'song', parent: 'desk', want: 'music' },
      story: { name: '故事', kind: 'file', icon: 'doc', parent: 'desk', want: 'work' },
      game: { name: '游戏', kind: 'file', icon: 'game', parent: 'desk', want: 'work' },
    };
    setTask('拖进文件夹');
    setHint('看颜色和图');

    function kids(id) {
      return Object.keys(nodes).filter((k) => nodes[k].parent === id);
    }
    function chain(id) {
      const out = [];
      let c = id;
      while (c) { out.unshift(c); c = nodes[c] && nodes[c].parent; }
      return out;
    }
    function wantedFolder(fileId) {
      return nodes[fileId] && nodes[fileId].want;
    }

    function tryMove(id, folderId) {
      const n = nodes[id];
      if (!n || nodes[folderId].kind !== 'folder') return false;
      if (phase === 'sort' && n.kind === 'file') {
        if (folderId === n.want) {
          n.parent = folderId;
          sound('pop');
          right();
          if (['cat', 'song', 'story', 'game'].every((k) => nodes[k].parent === nodes[k].want)) {
            phase = 'pack';
            loc = 'desk';
            setTask('小猫搬进作品');
            setHint('拖整个画画');
            api.say('放好啦', 'ok');
          }
          render();
          return true;
        }
        const tip = n.want === 'draw' ? '画要进画画' : n.want === 'music' ? '歌要进音乐' : '这个进作品';
        fail(tip);
        return false;
      }
      if (phase === 'pack') {
        if (id === 'cat') { fail('拖整个画画'); return false; }
        if (id === 'draw' && folderId === 'work') {
          n.parent = 'work';
          sound('ding');
          right();
          setTask('打开看看');
          setHint('点两下打开');
          render();
          return true;
        }
        fail('拖到作品里');
        return false;
      }
      return false;
    }

    function openNode(id) {
      const n = nodes[id];
      if (!n || phase === 'sort') return;
      if (n.kind === 'folder') {
        if (phase === 'seek') {
          const correct = { desk: 'work', work: 'log' }[n.parent];
          if (correct && id !== correct) { fail('不是这里'); return; }
        }
        loc = id;
        sound('step');
        if (phase === 'pack' && loc === 'draw' && nodes.draw.parent === 'work' && !sawCat) {
          sawCat = true;
          api.say('小猫还在', 'ok');
          right();
          later(() => startSeek(), 900);
        }
        render();
        return;
      }
      if (phase === 'seek' && id === 'note') {
        right();
        sound('win');
        api.finish({
        title: '文件夹·路径',
        icon: 'folder',
        lineHtml: '<b>文件夹</b>像书包，<b>路径</b>是一层层的路线',
          line: '文件夹像书包，路径是一层层的路线',
          quiz: {
            q: '书包搬走里面呢',
            miss: '里面跟着走',
            options: [
              { t: '跟着走', ok: true },
              { t: '会掉出', ok: false },
              { t: '会消失', ok: false },
            ],
          },
        });
      } else if (phase === 'seek') {
        fail('不是这里');
      }
    }

    function startSeek() {
      phase = 'seek';
      Object.keys(nodes).forEach((k) => { if (k !== 'desk') delete nodes[k]; });
      Object.assign(nodes, {
        work: { name: '作品', kind: 'folder', parent: 'desk' },
        music: { name: '音乐', kind: 'folder', parent: 'desk' },
        log: { name: '记录', kind: 'folder', parent: 'work' },
        draw: { name: '画画', kind: 'folder', parent: 'work' },
        note: { name: '笔记', kind: 'file', icon: 'note', parent: 'log' },
        photo: { name: '照片', kind: 'file', icon: 'img', parent: 'log' },
      });
      loc = 'desk';
      setTask('照路径找笔记');
      setHint('跟着亮的走');
      api.hush();
      render();
    }

    function nextTarget() {
      if (phase === 'sort') {
        const left = ['cat', 'song', 'story', 'game'].find((k) => nodes[k].parent !== nodes[k].want);
        if (!left) return null;
        return stage.querySelector('[data-id="' + nodes[left].want + '"]')
          || stage.querySelector('[data-id="' + left + '"]');
      }
      if (phase === 'pack') {
        if (nodes.draw.parent !== 'work') return stage.querySelector('[data-id="draw"]');
        if (loc === 'desk') return stage.querySelector('[data-id="work"]');
        if (loc === 'work') return stage.querySelector('[data-id="draw"]');
        return null;
      }
      const goal = { desk: 'work', work: 'log', log: 'note' }[loc];
      return goal && stage.querySelector('[data-id="' + goal + '"]');
    }

    function render() {
      document.body.dataset.phase = phase;
      stage.replaceChildren();
      const bar = h('div', { class: 'path', 'data-testid': 'path' });
      if (phase === 'seek') {
        const goal = ['desk', 'work', 'log', 'note'];
        const cur = chain(loc);
        goal.forEach((id) => {
          const onPath = cur.includes(id);
          bar.append(h('span', { class: 'crumb' + (id === loc ? ' now' : onPath ? '' : ' todo') }, nodes[id] ? nodes[id].name : ''));
        });
      } else {
        chain(loc).forEach((id) => bar.append(h('span', { class: 'crumb' + (id === loc ? ' now' : '') }, nodes[id].name)));
      }
      const board = h('div', { class: 'pieces', 'data-testid': 'board' });
      if (loc !== 'desk') {
        const back = h('button', { class: 'btn', type: 'button', 'data-testid': 'up' }, '返回');
        back.addEventListener('click', () => {
          loc = nodes[loc].parent || 'desk';
          sound('tick');
          render();
        });
        board.append(back);
      }
      kids(loc).forEach((id) => {
        const n = nodes[id];
        const el = h('button', {
          class: 'piece ' + (n.kind === 'folder' ? 'folder' : 'file'),
          type: 'button',
          'data-id': id,
          'data-testid': 'node-' + id,
          'aria-label': n.name,
        }, svgIco(n.kind === 'folder' ? 'folder' : n.icon), h('span', { class: 'lb' }, n.name));
        if (n.kind === 'folder') el.append(h('i', { class: 'flap', 'aria-hidden': 'true' }));
        dragItem(el, {
          hits() {
            if (n.kind === 'root') return null;
            const folders = [...stage.querySelectorAll('.piece.folder')];
            return folders.find((f) => f.dataset.id !== id && near(el, f, MAGNET)) || null;
          },
          onAccept(folder) { return tryMove(id, folder.dataset.id); },
          onReject() { fail(phase === 'pack' ? '拖整个画画' : '再拖一次'); },
          onSingle() {
            const prev = stage.querySelector('.piece.picked');
            if (prev && prev !== el && nodes[prev.dataset.id] && nodes[prev.dataset.id].kind === 'file' && n.kind === 'folder') {
              tryMove(prev.dataset.id, id);
              return;
            }
            if (prev === el) { openNode(id); return; }
            [...stage.querySelectorAll('.piece')].forEach((p) => p.classList.remove('picked'));
            el.classList.add('picked');
            sound('tick');
          },
          onDouble() { openNode(id); },
        });
        board.append(el);
      });
      // 点选备用：已选中的文件，再点文件夹
      stage.append(h('div', { class: 'panel' }, bar, board));
      setTarget(nextTarget);
    }
    render();
  }

  // ---------- ③ 机器人出门 ----------
  function mountOrder(api) {
    const { stage, h, setTask, setHint, setTarget, fail, right, sound, dragItem, near, sleep } = api;
    const ROUNDS = {
      shoe: {
        task: '让它穿好鞋',
        hint: '先袜再鞋',
        slots: 3,
        cards: [
          { id: 'sock', t: '穿袜子' },
          { id: 'shoe', t: '穿鞋' },
          { id: 'tie', t: '系鞋带' },
        ],
      },
      tooth: {
        task: '帮它刷牙',
        hint: '先开盖再挤',
        slots: 3,
        cards: [
          { id: 'brush', t: '拿牙刷' },
          { id: 'paste', t: '挤牙膏' },
          { id: 'teeth', t: '刷牙' },
          { id: 'cap', t: '开盖' },
        ],
      },
    };
    let round = 'shoe';
    let slotN = 3;
    let grew = false;
    let running = false;
    const host = h('div', { class: 'bot mood-idle', 'data-testid': 'robot' });
    const tray = h('div', { class: 'tray', 'data-testid': 'tray' });
    const slotsEl = h('div', { class: 'slots', 'data-testid': 'slots' });
    const runBtn = h('button', { class: 'btn primary', type: 'button', 'data-testid': 'run' }, '运行');
    stage.append(h('div', { class: 'scene' },
      h('div', { class: 'panel play' }, host),
      h('div', { class: 'panel' }, slotsEl, tray, runBtn)));

    function paint(look) {
      host.className = 'bot mood-' + (look.mood || 'idle')
        + (look.sock ? ' show-sock' : '')
        + (look.shoe ? ' show-shoe' : '')
        + (look.out ? ' show-out' : '')
        + (look.lace ? ' show-lace' : '')
        + (look.mess ? ' show-paste' : '')
        + (look.foam ? ' show-foam' : '');
      host.replaceChildren(
        h('div', { class: 'ant' }, h('i')),
        h('div', { class: 'head' }, h('i', { class: 'eye l' }), h('i', { class: 'eye r' }), h('i', { class: 'mouth' })),
        h('div', { class: 'foam' }, '🫧'),
        h('div', { class: 'body' }),
        h('div', { class: 'arm l' }), h('div', { class: 'arm r' }),
        h('div', { class: 'paste' }),
        h('div', { class: 'foot l' }), h('div', { class: 'foot r' })
      );
    }
    paint({ mood: 'idle' });

    function spec() { return ROUNDS[round]; }

    function renderCards() {
      document.body.dataset.phase = round + (grew ? '-full' : '');
      tray.replaceChildren();
      slotsEl.replaceChildren();
      const placed = new Set();
      for (let i = 0; i < slotN; i++) {
        const slot = h('div', { class: 'slot', 'data-testid': 'slot-' + i, 'data-i': String(i) });
        const existing = slotsEl._cards && slotsEl._cards[i];
        slotsEl.append(slot);
      }
      // rebuild from model
      slotsEl.replaceChildren();
      const model = renderCards.model || Array.from({ length: slotN }, () => null);
      while (model.length < slotN) model.push(null);
      model.length = slotN;
      renderCards.model = model;
      const used = {};
      model.forEach((id) => { if (id) used[id] = true; });
      model.forEach((id, i) => {
        const slot = h('div', { class: 'slot', 'data-testid': 'slot-' + i });
        if (id) slot.append(cardEl(spec().cards.find((c) => c.id === id), true));
        slot.addEventListener('click', () => {
          if (running) return;
          const armed = tray.querySelector('.card.picked');
          if (armed) {
            const old = model[i];
            model[i] = armed.dataset.id;
            sound('pop');
            renderCards();
            return;
          }
          if (model[i]) { model[i] = null; sound('tick'); renderCards(); }
        });
        slotsEl.append(slot);
      });
      spec().cards.forEach((c) => {
        if (used[c.id]) return;
        tray.append(cardEl(c, false));
      });
      setTask(spec().task);
      setHint(slotN === 3 && round === 'tooth' ? '只有三格' : spec().hint);
      setTarget(() => (round === 'tooth' && !grew ? tray.querySelector('[data-id="cap"]') : runBtn));
      bindSlotDrops();
    }

    function cardEl(c, inSlot) {
      const el = h('div', {
        class: 'card', 'data-id': c.id, 'data-testid': 'card-' + c.id, 'aria-label': c.t,
      }, c.t);
      dragItem(el, {
        hits() {
          return [...slotsEl.querySelectorAll('.slot')].find((s) => near(el, s, MAGNET)) || null;
        },
        onAccept(slot) {
          if (running) return false;
          const i = [...slotsEl.children].indexOf(slot);
          if (i < 0) return false;
          const model = renderCards.model;
          const old = model.indexOf(c.id);
          const prev = model[i];
          if (old >= 0) model[old] = prev === c.id ? null : prev;
          model[i] = c.id;
          sound('pop');
          renderCards();
          return true;
        },
        onReject() { if (!inSlot) sound('tick'); },
        onSingle() {
          if (running) return;
          if (inSlot) {
            const i = renderCards.model.indexOf(c.id);
            if (i >= 0) renderCards.model[i] = null;
            sound('tick');
            renderCards();
            return;
          }
          [...tray.querySelectorAll('.card')].forEach((n) => n.classList.remove('picked'));
          el.classList.add('picked');
          sound('tick');
        },
      });
      return el;
    }

    function bindSlotDrops() { /* 拖动在卡片上 */ }

    function stepResult(id, st) {
      if (round === 'shoe') {
        if (id === 'sock') {
          if (st.shoe) { st.out = true; return '袜子在外面'; }
          st.sock = true; return '';
        }
        if (id === 'shoe') { st.shoe = true; return ''; }
        if (!st.shoe) return '还没有鞋';
        st.lace = true; return '';
      }
      if (id === 'brush') { st.hand = true; return ''; }
      if (id === 'cap') { st.open = true; return ''; }
      if (id === 'paste') {
        if (!st.open) { st.mess = true; return '没开盖，挤到手上啦'; }
        if (!st.hand) return '还没拿牙刷';
        st.paste = true; return '';
      }
      if (!st.hand) return '还没拿牙刷';
      if (!st.paste) return '牙膏还没挤';
      st.foam = true; return '';
    }

    function doneState(st, seq) {
      if (round === 'shoe') return seq.length === 3 && st.sock && st.shoe && st.lace && !st.out;
      return seq.length === 4 && st.foam;
    }

    async function run() {
      if (running) return;
      const seq = (renderCards.model || []).filter(Boolean);
      if (!seq.length) { api.say('先放卡片', 'hint'); return; }
      running = true;
      runBtn.disabled = true;
      const st = { mood: 'idle' };
      let err = '';
      const cards = [...slotsEl.querySelectorAll('.card')];
      for (let i = 0; i < seq.length; i++) {
        cards.forEach((c) => c.classList.remove('now'));
        const card = [...slotsEl.querySelectorAll('.card')].find((c) => c.dataset.id === seq[i]);
        if (card) card.classList.add('now');
        err = stepResult(seq[i], st) || '';
        st.mood = err ? 'oops' : 'idle';
        paint(st);
        sound(err ? 'buzz' : 'step');
        if (err && card) card.classList.add('bad');
        await sleep(600);
        if (!api.alive) return;
        if (err) break;
      }
      running = false;
      runBtn.disabled = false;
      if (err || !doneState(st, seq)) {
        const msg = err || '少了一步';
        fail(msg);
        paint(Object.assign(st, { mood: 'oops' }));
        await sleep(1000);
        if (!api.alive) return;
        [...slotsEl.querySelectorAll('.card')].forEach((c) => c.classList.remove('now', 'bad'));
        if (round === 'tooth' && !grew) {
          grew = true;
          slotN = 4;
          setHint('先开盖再挤');
          api.say('只做写下来的', 'hint');
          renderCards();
        }
        return;
      }
      right();
      paint(Object.assign(st, { mood: 'happy' }));
      sound('ding');
      if (round === 'shoe') {
        await sleep(700);
        if (!api.alive) return;
        round = 'tooth';
        slotN = 3;
        grew = false;
        renderCards.model = [null, null, null];
        setTask('帮它刷牙');
        setHint('只有三格');
        renderCards();
        return;
      }
      api.finish({
        title: '顺序',
        icon: 'bot',
        line: '按顺序做，错了就是 bug',
        quiz: {
          q: '少了一步它会',
          miss: '不会自己补',
          options: [
            { t: '自己补', ok: false },
            { t: '只做有的', ok: true },
            { t: '全部重来', ok: false },
          ],
          demo() { paint({ mood: 'oops', hand: true }); },
        },
      });
    }
    runBtn.addEventListener('click', run);
    renderCards.model = [null, null, null];
    renderCards();
    setTask('让它穿好鞋');
  }

  // ---------- ④ 乌龟画画 ----------
  function mountRepeat(api) {
    const { stage, h, setTask, setHint, setTarget, fail, right, sound, near, sleep, dragItem } = api;
    let phase = 'square';
    let running = false;
    let model = [];
    const pond = h('div', { class: 'pond', 'data-testid': 'pond' });
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 300 240');
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    poly.setAttribute('fill', 'none');
    poly.setAttribute('stroke', '#2f7cf6');
    poly.setAttribute('stroke-width', '4');
    poly.setAttribute('stroke-linejoin', 'round');
    poly.setAttribute('stroke-linecap', 'round');
    const turtle = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    turtle.innerHTML = '<ellipse cx="0" cy="0" rx="16" ry="12" fill="#1fb36f" stroke="#1b2440" stroke-width="3"/><circle cx="16" cy="-2" r="6" fill="#b7ebc8" stroke="#1b2440" stroke-width="3"/>';
    svg.append(poly, turtle);
    pond.append(svg);
    const slotsEl = h('div', { class: 'slots' });
    const tray = h('div', { class: 'tray' });
    const runBtn = h('button', { class: 'btn primary', type: 'button', 'data-testid': 'run' }, '运行');
    const freeRow = h('div', { class: 'tray', hidden: true });
    stage.append(h('div', { class: 'scene' },
      h('div', { class: 'panel play' }, pond),
      h('div', { class: 'panel' }, slotsEl, tray, freeRow, runBtn)));

    function slotCount() { return phase === 'square' ? 8 : 3; }

    function render() {
      document.body.dataset.phase = phase;
      const n = slotCount();
      while (model.length < n) model.push(null);
      model.length = n;
      slotsEl.replaceChildren();
      model.forEach((tok, i) => {
        const slot = h('div', { class: 'slot', 'data-testid': 'rslot-' + i });
        if (tok) slot.append(tokenEl(tok, i));
        else slot.append(h('span', { class: 'lb' }, String(i + 1)));
        slot.addEventListener('click', () => {
          if (running) return;
          const armed = tray.querySelector('.card.picked');
          if (!armed) {
            if (model[i]) { model[i] = null; sound('tick'); render(); }
            return;
          }
          model[i] = fresh(armed.dataset.kind);
          sound('pop');
          render();
        });
        slotsEl.append(slot);
      });
      tray.replaceChildren();
      const kinds = phase === 'square' ? [['go', '前进'], ['turn', '右转']] : [['rep', '重复'], ['go', '前进'], ['turn', '右转']];
      kinds.forEach(([k, label]) => {
        const b = h('button', {
          class: 'card' + (k === 'rep' && (phase === 'tri' || phase === 'circle') ? ' glow' : ''),
          type: 'button', 'data-kind': k, 'data-testid': 'pal-' + k,
        }, label);
        b.addEventListener('click', () => {
          if (running) return;
          [...tray.querySelectorAll('.card')].forEach((n) => n.classList.remove('picked'));
          b.classList.add('picked');
          sound('tick');
        });
        proxyDrag(b, k);
        tray.append(b);
      });
      setTask(phase === 'square' ? '画出正方形' : phase === 'tri' ? '画出三角形' : phase === 'free' ? '再画一个' : '画出大圆');
      setHint(phase === 'square' ? '前进右转交替' : phase === 'tri' ? hintForTri() : phase === 'free' ? '再画一个' : hintForCircle());
      setTarget(() => (phase === 'square' ? runBtn : tray.querySelector('[data-kind="rep"]')));
      freeRow.hidden = phase !== 'free';
    }

    function fresh(kind) {
      if (kind === 'rep') return { kind, n: phase === 'circle' ? 24 : 3 };
      if (kind === 'turn') return { kind, ang: phase === 'circle' ? 15 : 90 };
      return { kind: 'go' };
    }

    function bumpAng(cur, dir) {
      const seq = phase === 'circle' ? [15, 30, 60, 120] : [30, 60, 90, 120, 150, 180];
      let i = seq.indexOf(cur);
      if (i < 0) {
        i = 0;
        seq.forEach((v, k) => { if (Math.abs(v - cur) < Math.abs(seq[i] - cur)) i = k; });
      }
      return seq[Math.max(0, Math.min(seq.length - 1, i + dir))];
    }

    function bumpN(cur, dir) {
      if (phase !== 'circle') return Math.max(1, Math.min(36, cur + dir));
      const seq = [3, 6, 12, 24, 36];
      let i = seq.indexOf(cur);
      if (i < 0) {
        i = seq.findIndex((v) => v >= cur);
        if (i < 0) i = seq.length - 1;
      }
      return seq[Math.max(0, Math.min(seq.length - 1, i + dir))];
    }

    function tokenEl(tok, index) {
      const el = h('div', { class: 'card', 'data-testid': 'tok-' + tok.kind });
      if (tok.kind === 'go') el.append('前进');
      else if (tok.kind === 'turn') {
        el.append('右转');
        if (phase !== 'square') {
          const num = h('b', { 'data-testid': 'ang-n' }, String(tok.ang));
          el.append(holdBtn('−', 'ang-minus', () => { tok.ang = bumpAng(tok.ang, -1); num.textContent = String(tok.ang); sound('tick'); }));
          el.append(num);
          el.append(holdBtn('+', 'ang-plus', () => { tok.ang = bumpAng(tok.ang, 1); num.textContent = String(tok.ang); sound('tick'); }));
        }
      } else {
        const num = h('b', { 'data-testid': 'rep-n' }, String(tok.n));
        el.append('重复');
        el.append(holdBtn('−', 'rep-minus', () => { tok.n = bumpN(tok.n, -1); num.textContent = String(tok.n); sound('tick'); }));
        el.append(num);
        el.append(holdBtn('+', 'rep-plus', () => { tok.n = bumpN(tok.n, 1); num.textContent = String(tok.n); sound('tick'); }));
      }
      el.addEventListener('click', (e) => {
        if (e.target.closest('.tiny')) return;
        if (running) return;
        model[index] = null;
        sound('tick');
        render();
      });
      dragItem(el, {
        hits() {
          return [...slotsEl.querySelectorAll('.slot')].find((s) => near(el, s, MAGNET)) || null;
        },
        onAccept(slot) {
          const j = [...slotsEl.children].indexOf(slot);
          if (j < 0 || j === index) return false;
          const tmp = model[j];
          model[j] = model[index];
          model[index] = tmp;
          sound('pop');
          render();
          return true;
        },
        onSingle() {},
      });
      return el;
    }

    function holdBtn(label, testid, fn) {
      const b = h('button', { class: 'tiny', type: 'button', 'data-testid': testid }, label);
      let delay = 0, iv = 0, pid = null;
      const stop = () => { clearTimeout(delay); clearInterval(iv); delay = 0; iv = 0; pid = null; };
      const up = (e) => { if (pid == null || e.pointerId === pid) stop(); };
      b.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (running || pid != null) return;
        pid = e.pointerId;
        fn();
        delay = setTimeout(() => { iv = setInterval(fn, 70); }, 350);
      });
      b.addEventListener('click', (e) => e.stopPropagation());
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
      cleanups.push(() => {
        stop();
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
      });
      return b;
    }

    function proxyDrag(btn, kind) {
      const down = (e) => {
        if (running || dragPid != null || (e.button && e.button !== 0)) return;
        e.preventDefault();
        dragPid = e.pointerId;
        const r = btn.getBoundingClientRect();
        const ox = e.clientX - r.left;
        const oy = e.clientY - r.top;
        let moved = false;
        const label = kind === 'go' ? '前进' : kind === 'turn' ? '右转' : '重复';
        const ghost = h('div', { class: 'card' }, label);
        ghost.style.cssText = 'position:fixed;z-index:30;margin:0;pointer-events:none;left:' + r.left + 'px;top:' + r.top + 'px';
        const move = (ev) => {
          if (ev.pointerId !== dragPid) return;
          const lift = reduced ? 0 : 20;
          if (Math.hypot(ev.clientX - r.left - ox, ev.clientY - r.top - oy) > 8) {
            moved = true;
            if (!ghost.parentNode) document.body.append(ghost);
          }
          ghost.style.left = (ev.clientX - ox) + 'px';
          ghost.style.top = (ev.clientY - oy - lift) + 'px';
          markSlots(moved ? slotAt(ev.clientX, ev.clientY - lift) : null);
        };
        const up = (ev) => {
          if (ev.pointerId !== dragPid) return;
          end();
          const lift = reduced ? 0 : 20;
          const slot = moved ? slotAt(ev.clientX, ev.clientY - lift) : null;
          if (slot) {
            const i = [...slotsEl.children].indexOf(slot);
            if (i >= 0) model[i] = fresh(kind);
            sound('pop');
            render();
          } else if (!moved) {
            [...tray.querySelectorAll('.card')].forEach((n) => n.classList.remove('picked'));
            btn.classList.add('picked');
            sound('tick');
          } else sound('tick');
        };
        const end = () => {
          dragPid = null;
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          window.removeEventListener('pointercancel', up);
          markSlots(null);
          ghost.remove();
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
        cleanups.push(end);
      };
      btn.addEventListener('pointerdown', down);
    }
    let dragPid = null;
    function slotAt(x, y) {
      return [...slotsEl.querySelectorAll('.slot')].find((s) => {
        const b = s.getBoundingClientRect();
        return x >= b.left - MAGNET && x <= b.right + MAGNET && y >= b.top - MAGNET && y <= b.bottom + MAGNET;
      }) || null;
    }
    function markSlots(slot) {
      [...slotsEl.querySelectorAll('.slot')].forEach((s) => s.classList.toggle('is-hot', s === slot));
    }

    function expand(tokens) {
      const rep = tokens.find((t) => t && t.kind === 'rep');
      const body = tokens.filter((t) => t && t.kind !== 'rep');
      const n = rep ? rep.n : 1;
      const seq = [];
      for (let i = 0; i < n; i++) body.forEach((b) => seq.push(b));
      return { seq, n, body, rep };
    }

    function isSquare(tokens) {
      const seq = tokens.filter(Boolean);
      if (seq.some((t) => t.kind === 'rep')) return false;
      let x = 0, y = 0, h = 0;
      const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
      let minx = 0, maxx = 0, miny = 0, maxy = 0, gos = 0;
      for (const t of seq) {
        if (t.kind === 'turn') h = (h + 1) % 4;
        else {
          gos++;
          x += dirs[h][0]; y += dirs[h][1];
          minx = Math.min(minx, x); maxx = Math.max(maxx, x);
          miny = Math.min(miny, y); maxy = Math.max(maxy, y);
        }
      }
      const side = maxx - minx;
      return x === 0 && y === 0 && side > 0 && side === (maxy - miny) && gos === side * 4;
    }

    function oneGoTurn(tokens) {
      const { body, rep } = expand(tokens);
      if (!rep) return null;
      const turns = body.filter((b) => b.kind === 'turn');
      const gos = body.filter((b) => b.kind === 'go');
      if (turns.length !== 1 || gos.length !== 1) return null;
      return { rep, turn: turns[0] };
    }

    function isTriangle(tokens) {
      const pair = oneGoTurn(tokens);
      return !!pair && pair.rep.n === 3 && pair.turn.ang === 120;
    }

    function isCircle(tokens) {
      const pair = oneGoTurn(tokens);
      if (!pair) return false;
      const total = pair.rep.n * pair.turn.ang;
      return pair.rep.n >= 18 && pair.turn.ang <= 20 && pair.turn.ang >= 10 && total >= 330 && total <= 390;
    }

    function trace(tokens) {
      const { seq } = expand(tokens);
      let x = 0, y = 0, deg = 0;
      const pts = [{ x, y, deg }];
      const step = phase === 'square' ? 1 : 1;
      seq.forEach((t) => {
        if (!t) return;
        if (t.kind === 'turn') deg = (deg + (t.ang || 90)) % 360;
        else if (t.kind === 'go') {
          const r = deg * Math.PI / 180;
          x += Math.sin(r) * step;
          y -= Math.cos(r) * step;
          pts.push({ x, y, deg });
        }
      });
      return pts;
    }

    function fit(pts) {
      let minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
      pts.forEach((p) => {
        minx = Math.min(minx, p.x); maxx = Math.max(maxx, p.x);
        miny = Math.min(miny, p.y); maxy = Math.max(maxy, p.y);
      });
      const bw = Math.max(0.001, maxx - minx);
      const bh = Math.max(0.001, maxy - miny);
      const s = Math.min(240 / bw, 180 / bh);
      const ox = 150 - ((minx + maxx) / 2) * s;
      const oy = 120 - ((miny + maxy) / 2) * s;
      return pts.map((p) => ({ x: ox + p.x * s, y: oy + p.y * s, deg: p.deg }));
    }

    function placeTurtle(p) {
      turtle.setAttribute('transform', 'translate(' + p.x + ' ' + p.y + ') rotate(' + p.deg + ')');
    }

    function clearPond() {
      poly.setAttribute('points', '');
      placeTurtle({ x: 150, y: 200, deg: 0 });
    }

    function burst() {
      if (reduced) return;
      for (let i = 0; i < 6; i++) {
        const s = h('div', { class: 'confetti' }, '★');
        s.style.left = (18 + i * 10) + '%';
        s.style.top = (30 + (i % 3) * 12) + '%';
        pond.append(s);
        later(() => s.remove(), 760);
      }
    }

    async function run() {
      if (running) return;
      const tokens = model.filter(Boolean);
      if (!tokens.length) { api.say('先放卡片', 'hint'); return; }
      running = true;
      runBtn.disabled = true;
      const raw = trace(model);
      const pts = fit(raw);
      poly.setAttribute('points', '');
      placeTurtle(pts[0]);
      const drawn = [pts[0]];
      const n = pts.length;
      const delay = n > 16 ? 36 : 280;
      for (let i = 1; i < pts.length; i++) {
        drawn.push(pts[i]);
        poly.setAttribute('points', drawn.map((p) => p.x + ',' + p.y).join(' '));
        placeTurtle(pts[i]);
        sound('step');
        await sleep(delay);
        if (!api.alive) return;
      }
      running = false;
      runBtn.disabled = false;
      if (phase === 'square' && isSquare(model)) {
        right();
        sound('ding');
        burst();
        api.say('围好啦', 'ok');
        await sleep(800);
        if (!api.alive) return;
        phase = 'tri';
        model = [null, null, null];
        clearPond();
        render();
        api.say('同样的事说一遍', 'hint');
        return;
      }
      if (phase === 'tri' && isTriangle(model)) {
        right();
        sound('ding');
        burst();
        api.say('三角好啦', 'ok');
        await sleep(800);
        if (!api.alive) return;
        phase = 'circle';
        clearPond();
        render();
        api.say('转小一点', 'hint');
        return;
      }
      if (phase === 'circle' && isCircle(model)) {
        right();
        sound('win');
        burst();
        api.say('圆了', 'ok');
        await sleep(600);
        if (!api.alive || phase === 'free') return;
        api.finish({
          title: '重复',
          icon: 'turtle',
          line: '同样的动作，说几次就够',
          extra: {
            label: '再画',
            onClick() {
              phase = 'free';
              finishedGuard();
              clearPond();
              render();
              api.say('再画一个', 'hint');
            },
          },
          quiz: {
            q: '正方形要几张卡',
            miss: '要排八张',
            options: [
              { t: '八张', ok: true },
              { t: '三张', ok: false },
              { t: '一张', ok: false },
            ],
          },
        });
        return;
      }
      if (phase === 'free') { api.say('好看', 'ok'); return; }
      const tip = phase === 'square' ? '还没围好' : phase === 'tri' ? hintForTri() : hintForCircle();
      setHint(tip);
      fail(tip);
    }

    function hintForTri() {
      const rep = model.find((t) => t && t.kind === 'rep');
      const turn = model.find((t) => t && t.kind === 'turn');
      const go = model.find((t) => t && t.kind === 'go');
      if (!rep) return '用重复卡';
      if (!turn || turn.ang !== 120) return '每次转120度';
      if (rep.n !== 3) return '次数调成3';
      if (!go) return '要有前进';
      return '用重复卡';
    }

    function hintForCircle() {
      const rep = model.find((t) => t && t.kind === 'rep');
      const turn = model.find((t) => t && t.kind === 'turn');
      const go = model.find((t) => t && t.kind === 'go');
      if (!rep) return '用重复卡';
      if (!turn || turn.ang > 30) return '角度再减小';
      if (rep.n < 18) return '次数再加大';
      if (!go) return '要有前进';
      if (rep.n * turn.ang > 390) return '次数太多啦';
      if (rep.n * turn.ang < 330) return '还没转够';
      return '再调一调';
    }

    function finishedGuard() {
      // 再画时结算已关掉，允许再跑，但不重复发徽章
    }

    runBtn.addEventListener('click', run);
    [['三角', 3, 120], ['星星', 5, 144]].forEach(([label, n, ang]) => {
      const b = h('button', { class: 'btn', type: 'button', 'data-testid': 'preset-' + label }, label);
      b.addEventListener('click', async () => {
        if (phase !== 'free' || running) return;
        model = [{ kind: 'rep', n }, { kind: 'go' }, { kind: 'turn', ang }];
        render();
        await run();
      });
      freeRow.append(b);
    });
    const done = h('button', { class: 'btn primary', type: 'button', 'data-testid': 'free-done' }, '看宝箱');
    done.addEventListener('click', () => go('map'));
    freeRow.append(done);
    render();
    setTask('画出正方形');
    setHint('前进右转交替');
    placeTurtle({ x: 150, y: 200, deg: 0 });
  }

  function boot() {
    if (booted) return;
    booted = true;
    window.addEventListener('hashchange', onRoute);
    // 刷新一律回地图，进度留在 localStorage。
    if (location.hash !== '#map') location.replace('#map');
    else onRoute();
  }
  boot();
})();
