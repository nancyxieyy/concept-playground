/* 电脑小岛第 2 关：键盘上的特别键。
   上面是一张小白纸（有闪闪的光标），下面是一块简化的键盘。真键盘、点屏幕上的键都算。
   六个小任务：删除键、空格、回车、Shift 换大写、方向键挪光标、复制粘贴星星贴纸。
   会看是 Mac 还是 Windows：Mac 显示 command / delete / return，Windows 显示 Ctrl / Backspace / Enter。 */
(function () {
  'use strict';
  const NAVY = '#1b2440';
  const W = 480, H = 420;
  const TB = { x: 12, y: 58, w: 456, h: 106 }; // 小白纸
  const KY = 178, ROW_H = 54, GAP = 6;          // 键盘
  const ROWS = [
    [...'qwertyuiop'].map((c) => [c, 1]).concat([['del', 1.7]]),
    [['pad', 0.45]].concat([...'asdfghjkl'].map((c) => [c, 1]), [['enter', 2.25]]),
    [['shift', 2.2]].concat([...'zxcvbnm'].map((c) => [c, 1]), [['shift2', 2.5]]),
    [['mod', 2.4], ['space', 5.9], ['left', 1.6], ['right', 1.6]],
  ];
  const isMacGuess = () => {
    try { return /Mac|iPhone|iPad|iPod/i.test((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent || ''); }
    catch (e) { return false; }
  };
  function typing(e) {
    const t = e.target;
    return !!(t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName || '')));
  }

  PG.register({
    id: 'keys',
    title: '键盘上的特别键',
    concept: '键盘上的特别键',
    kid: '字母键用来打字，特别键管“确定、删掉、空一格、换大写”',
    level: 'K0',
    color: 'sky',
    play: '上面是一张小白纸，下面是键盘。用真键盘按，或者点屏幕上的键都行。跟着任务，一个一个特别键认过去。',

    mount(api) {
      const s = api.stage(W, H);
      const ctx = s.ctx, cv = s.canvas;
      cv.setAttribute('tabindex', '0');
      cv.setAttribute('aria-label', '键盘练习：小白纸和键盘');
      cv.style.outline = 'none';
      const font = getComputedStyle(document.body).fontFamily;

      let mac = isMacGuess();
      // 键的名字，按电脑不同而不同
      const N = () => mac
        ? { del: 'delete', enter: 'return', mod: '⌘ command', modShort: 'command', shift: 'shift', bin: '废纸篓' }
        : { del: 'Backspace', enter: 'Enter', mod: 'Ctrl', modShort: 'Ctrl', shift: 'Shift', bin: '回收站' };

      // ---------- 键盘布局 ----------
      const keys = [];
      ROWS.forEach((row, r) => {
        const units = row.reduce((a, k) => a + k[1], 0);
        const u = (W - 16 - (row.length - 1) * GAP) / units;
        let x = 8;
        row.forEach(([id, wu]) => {
          const w = wu * u;
          if (id !== 'pad') keys.push({ id, x, y: KY + r * (ROW_H + GAP), w, h: ROW_H, lit: 0 });
          x += w + GAP;
        });
      });
      const keyOf = (id) => keys.find((k) => k.id === id);
      function label(id) {
        const n = N();
        if (id.length === 1) return [id.toUpperCase(), ''];
        return {
          del: [mac ? 'delete' : 'Backspace', '删除'],
          enter: [mac ? 'return' : 'Enter ↵', '回车'],
          shift: ['⇧ ' + n.shift, '换大写'], shift2: ['⇧ ' + n.shift, '换大写'],
          mod: [n.mod, '快捷键'], space: ['', '空格'],
          left: ['←', ''], right: ['→', ''],
        }[id] || [id, ''];
      }

      // ---------- 小白纸上的字 ----------
      let text = '', cur = 0, sel = null, clip = '', pastes = 0;
      let shiftLatch = false, modLatch = false;
      let task = 0, finished = 0, idle = 0, banner = null, msg = null, pocketFlash = 0, allDone = false;
      let demo = null, timers = [];
      const MAXLEN = 28;

      const TASKS = [
        { name: '删除', key: ['del'],
          text: () => '多打了一个 t！按一下“' + N().del + '”（删除键），擦掉它。',
          setup() { setText('catt', 4); }, ok: () => text === 'cat' },
        { name: '空格', key: ['space'],
          text: () => '“cat”和“dog”挤在一起了。光标在中间，按一下最长的空格键，把它们分开。',
          setup() { setText('catdog', 3); }, ok: () => text === 'cat dog' },
        { name: '回车', key: ['enter'],
          text: () => '按“' + N().enter + '”（回车键），换到下一行。',
          setup() { setText('hi', 2); }, ok: () => text.indexOf('\n') >= 0 },
        { name: '大写', key: ['shift', 'a'],
          text: () => '打出大写的 A：按住 ' + N().shift + ' 不放，再按 A。（点屏幕的话：先点 ⇧，再点 A）',
          setup() { setText('', 0); }, ok: () => text.indexOf('A') >= 0 },
        { name: '方向', key: ['left'],
          text: () => '用 ← 方向键，把闪闪的光标挪到最前面（字不要删）。',
          setup() { setText('cat', 3); }, ok: () => cur === 0 && text === 'cat' },
        { name: '复制', key: ['mod', 'c', 'v'],
          text: () => '星星贴纸已经选中（变蓝了）。按 ' + N().modShort + '+C 复制，再按 ' + N().modShort + '+V 粘贴 3 次。（点屏幕：先点 ' + N().modShort + '，再点 C）',
          setup() { setText('★', 1); sel = [0, 1]; clip = ''; pastes = 0; }, ok: () => pastes >= 3 },
      ];

      // ---------- 右边的控件 ----------
      const rTask = api.readout('第几个', '1 / 6');
      const rDone = api.readout('做到了', '0 / 6');
      const taskBox = api.h('p', { style: { font: '19px/1.45 var(--display)', margin: 0 } });
      api.controlBox.append(api.h('div', { class: 'ctl' }, api.h('span', { class: 'lab' }, '现在要做'), taskBox));
      const jump = api.choice({
        label: '想练哪个键',
        options: TASKS.map((tk, i) => ({ value: i, label: tk.name })),
        value: 0,
        onChange: (v) => { demo = null; goTask(v); },
      });
      api.choice({
        label: '我用的电脑是',
        options: [{ value: true, label: 'Mac' }, { value: false, label: 'Windows' }],
        value: mac,
        onChange: (v) => { mac = v; taskBox.textContent = TASKS[task].text(); },
      });
      api.controlBox.append(api.h('p', { class: 'small' }, '看你的键盘：上面写的字可能和这里不完全一样，位置差不多。手机和平板没有真键盘，点屏幕上的键就行。'));

      function setText(t, c) { text = t; cur = c; sel = null; }
      function goTask(i) {
        task = i; idle = 0; banner = null; msg = null; shiftLatch = false; modLatch = false; allDone = false; timers = [];
        const o = api.stageBox.querySelector('.overlay'); if (o) o.remove();
        TASKS[i].setup();
        rTask.set((i + 1) + ' / ' + TASKS.length);
        taskBox.textContent = TASKS[i].text();
        if (jump.get() !== i) jump.set(i);
      }
      function after(sec, fn) { timers.push({ t: sec, fn }); }
      function say(t, sec) { msg = { text: t, t: sec || 2.2 }; }

      function check() {
        if (banner || allDone || demo) return;
        if (!TASKS[task].ok()) return;
        finished = Math.max(finished, task + 1);
        rDone.set(finished + ' / ' + TASKS.length);
        if (task < TASKS.length - 1) {
          api.sound('ding');
          banner = { text: '做到了！', t: 1.4 };
          const next = task + 1;
          after(1.4, () => goTask(next));
        } else {
          api.sound('win');
          allDone = true;
          after(1.2, () => api.overlay('全部完成！★ 删除、空格、回车、大写、方向键、复制粘贴，你都认识了。点这里再玩一次', () => goTask(0)));
        }
      }

      // ---------- 按一个键会发生什么 ----------
      function light(id) { const k = keyOf(id); if (k) k.lit = 1; }
      function insert(str) {
        if (sel) { text = text.slice(0, sel[0]) + text.slice(sel[1]); cur = sel[0]; sel = null; }
        const next = text.slice(0, cur) + str + text.slice(cur);
        ctx.font = '30px ' + font;
        const tooWide = next.split('\n').some((ln) => ctx.measureText(ln).width > TB.w - 40);
        if (next.length > MAXLEN || tooWide || next.split('\n').length > 2) { say('小白纸写满啦，先删掉几个字', 1.8); api.sound('buzz'); return false; }
        text = next;
        cur += str.length;
        return true;
      }
      function act(id, shift, mod) {
        idle = 0;
        light(id);
        if (shift) { light('shift'); }
        if (mod) light('mod');
        if (mod && (id === 'c' || id === 'v')) {
          if (id === 'c') {
            if (!sel) { say('先选中要复制的东西（点一下星星）', 2.2); api.sound('boing'); return; }
            clip = text.slice(sel[0], sel[1]);
            pocketFlash = 1.2;
            api.sound('tick'); // 复制没有什么动静：只是悄悄记住了
          } else {
            if (!clip) { say('还没复制东西呢：先 ' + N().modShort + '+C', 2.2); api.sound('boing'); return; }
            if (insert(clip)) { pastes++; api.sound('pop'); }
          }
          check(); return;
        }
        if (mod) { say('这个快捷键这里没用到。试试 C 或者 V', 1.8); return; }
        if (id.length === 1) {
          if (insert(shift ? id.toUpperCase() : id)) api.sound('step');
        } else if (id === 'del') {
          if (sel) { text = text.slice(0, sel[0]) + text.slice(sel[1]); cur = sel[0]; sel = null; api.sound('tick'); }
          else if (cur > 0) { text = text.slice(0, cur - 1) + text.slice(cur); cur--; api.sound('tick'); }
          else { api.sound('boing'); say('光标前面没有字可以删了', 1.6); }
        } else if (id === 'fdel') {
          if (cur < text.length) { text = text.slice(0, cur) + text.slice(cur + 1); api.sound('tick'); }
        } else if (id === 'enter') {
          if (insert('\n')) api.sound('pop');
        } else if (id === 'space') {
          if (insert(' ')) api.sound('step');
        } else if (id === 'left' || id === 'right') {
          if (sel) { cur = id === 'left' ? sel[0] : sel[1]; sel = null; }
          else cur = Math.max(0, Math.min(text.length, cur + (id === 'left' ? -1 : 1)));
          api.sound('tick');
        }
        check();
      }

      // ---------- 真键盘 ----------
      let imeTold = false;
      api.on(window, 'keydown', (e) => {
        if (typing(e) || e.altKey) return;
        if (e.isComposing || e.key === 'Process' || e.keyCode === 229) {
          if (!imeTold) { imeTold = true; say('现在是中文输入法：先切到英文再按', 2.6); }
          return;
        }
        const k = e.key;
        let id = null;
        if (k === 'Backspace') id = 'del';
        else if (k === 'Delete') id = 'fdel';
        else if (k === 'Enter') id = 'enter';
        else if (k === ' ' || k === 'Spacebar') id = 'space';
        else if (k === 'ArrowLeft') id = 'left';
        else if (k === 'ArrowRight') id = 'right';
        else if (k === 'Shift') { light('shift'); light('shift2'); return; }
        else if (k === 'Meta' || k === 'Control') { light('mod'); return; }
        else if (k && k.length === 1) id = /[a-z]/i.test(k) ? k.toLowerCase() : 'char:' + k;
        if (!id) return;
        const mod = e.metaKey || e.ctrlKey;
        if (mod && id !== 'c' && id !== 'v') return; // 别的快捷键留给浏览器
        const ae = document.activeElement;
        if (ae && (ae.tagName === 'BUTTON' || ae.tagName === 'A')) {
          if (id === 'enter' || id === 'space') return; // 焦点在按钮上：让按钮自己响应
          ae.blur();
        }
        e.preventDefault();
        if (demo) return;
        try { cv.focus({ preventScroll: true }); } catch (err) { /* 没关系 */ }
        if (id.startsWith('char:')) { idle = 0; if (insert(id.slice(5))) api.sound('step'); check(); return; }
        // 大写锁定开着时，e.key 本来就是大写
        const upper = id.length === 1 && k !== k.toLowerCase();
        if (e.shiftKey && id.length === 1) light('shift');
        act(id, upper, mod);
      });

      // ---------- 点屏幕上的键 / 点小白纸 ----------
      let charBoxes = []; // 画字的时候记下每个字的位置，点小白纸时用
      api.on(cv, 'pointerdown', (e) => {
        if (demo) return;
        try { cv.focus({ preventScroll: true }); } catch (err) { /* 没关系 */ }
        const p = s.pos(e);
        const k = keys.find((q) => p.x >= q.x - GAP / 2 && p.x <= q.x + q.w + GAP / 2 && p.y >= q.y - GAP / 2 && p.y <= q.y + q.h + GAP / 2);
        if (k) {
          if (k.id === 'shift' || k.id === 'shift2') { shiftLatch = !shiftLatch; k.lit = 1; api.sound('tick'); idle = 0; return; }
          if (k.id === 'mod') { modLatch = !modLatch; k.lit = 1; api.sound('tick'); idle = 0; return; }
          const sh = shiftLatch, md = modLatch;
          shiftLatch = false; modLatch = false;
          act(k.id, sh, md);
          return;
        }
        if (p.x >= TB.x && p.x <= TB.x + TB.w && p.y >= TB.y && p.y <= TB.y + TB.h) {
          // 点在字上：星星就选中它；别的字就把光标放过去
          let best = null, bd = 1e9;
          for (const b of charBoxes) {
            const d = Math.abs(p.y - b.y) * 3 + Math.abs(p.x - b.x);
            if (d < bd) { bd = d; best = b; }
          }
          if (!best) return;
          if (best.i < text.length && text[best.i] === '★' && Math.abs(p.x - (best.x + best.w / 2)) < best.w) {
            sel = [best.i, best.i + 1]; cur = best.i + 1; api.sound('tick');
          } else {
            sel = null; cur = best.i; api.sound('tick');
          }
          idle = 0;
        }
      });

      // ---------- 演示（猜一猜用） ----------
      function runDemo(steps) { demo = { steps, i: 0, t: 0 }; }
      function stepDemo(dt) {
        if (!demo) return;
        const st = demo.steps[demo.i];
        if (!st) { demo = null; return; }
        demo.t += dt;
        if (demo.t < (st.wait || 0.5)) return;
        demo.t = 0; demo.i++;
        if (st.say) say(st.say, st.sec || 2);
        if (st.id) act(st.id, !!st.shift, !!st.mod); // 演示时 check() 不算分
      }

      // ---------- 画 ----------
      function drawKey(k, ink, card, sun, sky, hintOn, t) {
        const latched = ((k.id === 'shift' || k.id === 'shift2') && shiftLatch) || (k.id === 'mod' && modLatch);
        const down = k.lit > 0.4 || latched;
        const off = down ? 2 : 0;
        ctx.fillStyle = ink; PG.roundRect(ctx, k.x + 3, k.y + 3, k.w, k.h, 9); ctx.fill();
        const special = k.id.length > 1;
        PG.roundRect(ctx, k.x + off, k.y + off, k.w, k.h, 9);
        ctx.fillStyle = card; ctx.fill();
        if (k.lit > 0 || latched) { ctx.globalAlpha = latched ? 1 : Math.min(1, k.lit * 1.6); ctx.fillStyle = sun; ctx.fill(); ctx.globalAlpha = 1; }
        else if (special) { ctx.fillStyle = 'rgba(127,140,170,.22)'; ctx.fill(); }
        ctx.lineWidth = 2; ctx.strokeStyle = ink; ctx.stroke();
        if (hintOn) {
          ctx.save(); ctx.lineWidth = 3; ctx.strokeStyle = sky; ctx.setLineDash([6, 4]); ctx.lineDashOffset = -t * 20;
          PG.roundRect(ctx, k.x - 3, k.y - 3, k.w + 6, k.h + 6, 11); ctx.stroke(); ctx.restore();
        }
        const [a, b] = label(k.id);
        const lit = k.lit > 0 || latched;
        ctx.fillStyle = lit ? NAVY : ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const cx = k.x + off + k.w / 2, cy = k.y + off + k.h / 2;
        if (b) {
          let fs = 15;
          ctx.font = fs + 'px ' + font;
          while (fs > 10 && ctx.measureText(a).width > k.w - 8) { fs--; ctx.font = fs + 'px ' + font; }
          ctx.fillText(a, cx, cy - (a ? 9 : 0));
          ctx.font = '12px ' + font; ctx.fillStyle = lit ? NAVY : api.color('--ink-2'); ctx.fillText(b, cx, a ? cy + 11 : cy);
        } else {
          ctx.font = '20px ' + font; ctx.fillText(a, cx, cy);
        }
        ctx.textAlign = 'left';
      }

      api.loop((dt, t) => {
        stepDemo(dt);
        const due = timers.filter((tm) => (tm.t -= dt) <= 0);
        timers = timers.filter((tm) => tm.t > 0);
        due.forEach((tm) => tm.fn());
        idle += dt;
        pocketFlash = Math.max(0, pocketFlash - dt);
        keys.forEach((k) => { k.lit = Math.max(0, k.lit - dt * 2.2); });
        const ink = api.color('--ink'), card = api.color('--card'), sun = api.color('--sun'), sky = api.color('--sky'), line = api.color('--line'), ink2 = api.color('--ink-2');
        s.clear();
        ctx.textBaseline = 'middle';

        // 顶上：第几个任务
        ctx.fillStyle = card; ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
        PG.roundRect(ctx, 8, 8, W - 16, 40, 12); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ink; ctx.font = '18px ' + font;
        ctx.fillText('第 ' + (task + 1) + ' 个 · ' + TASKS[task].name + '键', 20, 28);
        for (let i = 0; i < TASKS.length; i++) {
          ctx.beginPath(); ctx.arc(W - 30 - (TASKS.length - 1 - i) * 18, 28, 6, 0, 7);
          ctx.fillStyle = i < finished ? sun : line; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = ink; ctx.stroke();
        }

        // 小白纸
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
        PG.roundRect(ctx, TB.x, TB.y, TB.w, TB.h, 10); ctx.fill(); ctx.stroke();
        ctx.font = '30px ' + font;
        const lines = text.split('\n');
        charBoxes = [];
        let idx = 0;
        const LH = 36, X0 = TB.x + 18, Y0 = TB.y + 26;
        lines.forEach((ln, li) => {
          let x = X0;
          const y = Y0 + li * LH;
          for (let j = 0; j <= ln.length; j++) {
            const ch = ln[j];
            const w = ch == null ? 14 : ctx.measureText(ch).width;
            charBoxes.push({ i: idx, x, y, w });
            if (ch != null) {
              if (sel && idx >= sel[0] && idx < sel[1]) { ctx.fillStyle = 'rgba(47,124,246,.35)'; ctx.fillRect(x - 1, y - 18, w + 2, 36); }
              ctx.fillStyle = ch === '★' ? '#e0a100' : NAVY;
              ctx.fillText(ch, x, y);
            }
            if (idx === cur && ((t % 1) < 0.6 || idle < 0.5)) { ctx.fillStyle = '#2f7cf6'; ctx.fillRect(x - 1.5, y - 17, 3, 34); }
            if (ch != null) { x += w; idx++; }
          }
          idx++; // 换行符也占一个位置
        });
        if (!text.length) { ctx.font = '16px ' + font; ctx.fillStyle = '#8a93ad'; ctx.fillText('（这里是空的）', X0 + 10, Y0); }
        // 复制以后：电脑心里记住了（真电脑上看不到这个）
        if (task === TASKS.length - 1 || clip) {
          ctx.font = '13px ' + font; ctx.textAlign = 'right';
          ctx.globalAlpha = pocketFlash > 0 ? 1 : 0.75;
          ctx.fillStyle = pocketFlash > 0 ? '#e0a100' : '#8a93ad';
          ctx.fillText(clip ? '电脑悄悄记着：' + clip + '（真电脑上看不到）' : '电脑悄悄记着：（还没有）', TB.x + TB.w - 10, TB.y + TB.h - 14);
          ctx.globalAlpha = 1; ctx.textAlign = 'left';
        }

        // 键盘：卡住 6 秒，就给要按的键描一圈虚线
        const hint = idle > 6 && !demo && !banner && !allDone ? TASKS[task].key : [];
        keys.forEach((k) => drawKey(k, ink, card, sun, sky, hint.indexOf(k.id) >= 0 || (k.id === 'shift2' && hint.indexOf('shift') >= 0), t));

        // 提示条
        if (msg) {
          msg.t -= dt;
          if (msg.t <= 0) msg = null;
          else {
            ctx.font = '16px ' + font;
            const tw = ctx.measureText(msg.text).width + 28;
            ctx.globalAlpha = Math.min(1, msg.t * 3);
            ctx.fillStyle = NAVY; PG.roundRect(ctx, (W - tw) / 2, TB.y + TB.h - 37, tw, 30, 15); ctx.fill();
            ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.fillText(msg.text, W / 2, TB.y + TB.h - 22); ctx.textAlign = 'left';
            ctx.globalAlpha = 1;
          }
        }
        if (banner) {
          banner.t -= dt;
          if (banner.t <= 0) banner = null;
          else {
            ctx.fillStyle = '#ffd43b'; ctx.strokeStyle = NAVY; ctx.lineWidth = 3;
            PG.roundRect(ctx, W / 2 - 100, TB.y + 20, 200, 64, 18); ctx.fill(); ctx.stroke();
            ctx.fillStyle = NAVY; ctx.font = '28px ' + font; ctx.textAlign = 'center';
            ctx.fillText(banner.text + ' ★', W / 2, TB.y + 52); ctx.textAlign = 'left';
          }
        }
        if (demo) { ctx.fillStyle = ink2; ctx.font = '13px ' + font; ctx.fillText('演示中……', TB.x + 10, TB.y + TB.h - 14); }
        ctx.textBaseline = 'alphabetic';
      });

      // ---------- 猜一猜 ----------
      const n0 = N();
      api.guesses([
        {
          q: '打错了一个字，按哪个键可以擦掉它？',
          options: [n0.del + '（删除键）', '空格键', n0.enter + '（回车键）'], answer: 0,
          why: n0.del + ' 是删除键，擦掉光标左边的一个字。空格是空一格，回车是换到下一行。',
          delay: 1300,
          apply() { goTask(0); runDemo([{ wait: 0.6, id: 'del', say: '按一下删除键：多出来的 t 没了' }]); },
        },
        {
          q: '按住 ' + n0.shift + ' 不放，再按 a，会打出什么？',
          options: ['a', 'A', '什么也打不出来'], answer: 1,
          why: n0.shift + ' 就像“换一副面孔”：按住它再按字母，打出来的是大写。',
          delay: 1300,
          apply() { goTask(3); runDemo([{ wait: 0.6, id: 'a', shift: true, say: '按住 ' + n0.shift + ' + a → A' }]); },
        },
        {
          q: '按了 ' + n0.modShort + '+C 以后，屏幕上什么都没变。是不是没复制成功？',
          options: ['没成功，要一直按', '成功了，只是看不出来，粘贴才看得到'], answer: 1,
          why: '复制是把东西悄悄放进电脑的“口袋”，屏幕上看不出来。按 ' + n0.modShort + '+V 粘贴，它才出来，而且想贴几次都行。',
          delay: 3000,
          apply() {
            goTask(5);
            runDemo([
              { wait: 0.6, id: 'c', mod: true, say: '按了 ' + n0.modShort + '+C……屏幕上没变化？', sec: 1.8 },
              { wait: 1.6, id: 'v', mod: true, say: n0.modShort + '+V：贴出来了！', sec: 1.2 },
              { wait: 0.5, id: 'v', mod: true, say: '再贴一次也行', sec: 1.4 },
            ]);
          },
        },
      ]);

      api.say({
        left: '特别键',
        right: '管“删掉、空一格、换一行、换大写”的键，它们不打字，只帮忙',
        example: mac
          ? 'delete 擦掉光标左边的字，空格空一格，return 换一行，按住 shift 打大写。command+C 复制，command+V 粘贴。'
          : 'Backspace 擦掉光标左边的字，空格空一格，Enter 换一行，按住 Shift 打大写。Ctrl+C 复制，Ctrl+V 粘贴。',
        promptIntro: '去你自己的电脑上试一试：',
        prompt: '打开记事本（Mac 是“文本编辑”），打 abc 123，按回车换一行，再打 Hi! ，然后用删除键删掉最后一个字，再补回来。',
      });

      goTask(0);
    },

    // 首页小图：几个键轮流被按下
    thumb(ctx, w, h, t) {
      const ks = [['A', 40, 50, 56], ['⇧', 40, 116, 80], ['空格', 132, 116, 150], ['⌫', 210, 50, 70], ['C', 108, 50, 56]];
      const on = Math.floor(t * 1.5) % 5;
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = NAVY; ctx.lineWidth = 3;
      PG.roundRect(ctx, 20, 20, 280, 170, 16); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fill(); ctx.stroke();
      ks.forEach(([lab, x, y, kw], i) => {
        const down = i === on;
        ctx.fillStyle = NAVY; PG.roundRect(ctx, x + 3, y + 3, kw, 54, 10); ctx.fill();
        PG.roundRect(ctx, x + (down ? 3 : 0), y + (down ? 3 : 0), kw, 54, 10);
        ctx.fillStyle = down ? '#ffd43b' : '#ffffff'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = NAVY; ctx.stroke();
        ctx.fillStyle = NAVY; ctx.font = '22px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(lab, x + kw / 2 + (down ? 3 : 0), y + 27 + (down ? 3 : 0));
      });
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    },
  });
})();
