/* 程序森林：网页的三样东西（K1.6–K1.10）。
   一个“我的小宠物”小网页：内容（写了什么）、样子（长什么样）、动作（点了会怎样）可以一样一样关掉、改掉。
   最后看地址栏：file:// 只有我的电脑能打开，发布成 https:// 大家都能打开。
   网页是放在舞台里的 DOM，不是画布。 */
(function () {
  'use strict';
  const NAVY = '#1b2440';
  const BG = { cream: '#fff6d6', sky: '#dcefff', pink: '#ffe1ef', mint: '#dcf7e8' };
  const TITLE = { navy: '#24304f', red: '#e2453a', purple: '#7b4fe0', green: '#14935a' };
  const BTN = { blue: '#3d7fe0', orange: '#f08a24', green: '#1fa866', purple: '#8a5cf5' };
  const SIZE = { s: 22, m: 30, l: 40 };
  const PET = ['#ffb347', '#7ec8ff', '#ff8fc2', '#8be0a4', '#c5a3ff'];
  const FILE_URL = 'file:///Users/我/Desktop/我的作品/我的小宠物/index.html';
  const WEB_URL = 'https://example.com/my-pet/';
  const DEF_TITLE = '我的小宠物', DEF_TEXT = '它叫团团，最喜欢吃东西。';

  // 原创小宠物“团团”：一个圆圆的小团子
  function petSvg(col) {
    return '<svg viewBox="0 0 120 100" width="120" height="100" aria-hidden="true">' +
      '<ellipse cx="60" cy="94" rx="34" ry="5" fill="rgba(0,0,0,.12)"/>' +
      '<circle cx="34" cy="26" r="13" fill="' + col + '" stroke="' + NAVY + '" stroke-width="3"/>' +
      '<circle cx="86" cy="26" r="13" fill="' + col + '" stroke="' + NAVY + '" stroke-width="3"/>' +
      '<ellipse cx="60" cy="58" rx="40" ry="35" fill="' + col + '" stroke="' + NAVY + '" stroke-width="3"/>' +
      '<circle cx="46" cy="52" r="5" fill="' + NAVY + '"/><circle cx="74" cy="52" r="5" fill="' + NAVY + '"/>' +
      '<circle cx="44.5" cy="50" r="1.6" fill="#fff"/><circle cx="72.5" cy="50" r="1.6" fill="#fff"/>' +
      '<circle cx="36" cy="64" r="5" fill="#ff7a9a" opacity=".55"/><circle cx="84" cy="64" r="5" fill="#ff7a9a" opacity=".55"/>' +
      '<path d="M52 64 Q60 72 68 64" fill="none" stroke="' + NAVY + '" stroke-width="3" stroke-linecap="round"/></svg>';
  }

  PG.register({
    id: 'web',
    title: '拆开小网页',
    concept: '网页的三样东西：内容、样子、动作（HTML、CSS、JS）',
    kid: '网页 = 写了什么 + 长什么样 + 点了会怎样',
    level: 'K1',
    color: 'bubble',
    play: '先点网页里的「喂它」。再按旁边的开关，把「内容」「样子」「动作」一样一样关掉，看网页少了什么。',

    mount(api) {
      const h = api.h;
      // 舞台里放的是一个小网页，手指在上面也要能上下滑动页面
      api.stageBox.style.touchAction = 'auto';

      const st = {
        on: { content: true, style: true, action: true },
        title: DEF_TITLE, text: DEF_TEXT,
        bg: 'cream', tcol: 'navy', size: 'm', bcol: 'blue', act: 'jump',
        pet: 0, web: false, talkN: 0,
      };

      // ---------- 小网页 ----------
      const addr = h('div', { style: { flex: '1', minWidth: '0', font: '12px/1.4 var(--mono)', padding: '5px 10px', borderRadius: '999px', background: 'var(--paper)', border: '1.5px solid var(--line)', wordBreak: 'break-all' } });
      const bar = h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', borderBottom: '2px solid var(--ink)', background: 'var(--card)' } },
        h('span', { 'aria-hidden': 'true', style: { display: 'flex', gap: '5px', flex: 'none' } },
          ['#ff5f57', '#febc2e', '#28c840'].map((c) => h('i', { style: { width: '11px', height: '11px', borderRadius: '50%', background: c, display: 'block' } }))),
        addr);
      const titleEl = h('h1');
      const textEl = h('p');
      const petEl = h('div');
      const bubble = h('div', { hidden: true, style: { position: 'absolute', left: '50%', top: '-6px', transform: 'translate(10px,-100%)', background: '#fff', color: NAVY, border: '2px solid ' + NAVY, borderRadius: '12px', padding: '4px 10px', font: '15px/1.3 sans-serif', whiteSpace: 'nowrap', zIndex: '2' } });
      const petBox = h('div', { style: { position: 'relative', width: '120px', height: '100px' } }, petEl, bubble);
      const feedBtn = h('button', { type: 'button' }, '喂它');
      const content = h('div', null, titleEl, textEl, petBox, feedBtn);
      const frame = h('div', null, content);
      const page = h('div', { role: 'region', 'aria-label': '小网页' }, frame);
      const browser = h('div', { style: { border: '2.5px solid var(--ink)', borderRadius: '12px', overflow: 'hidden', background: 'var(--card)' } }, bar, page);
      const status = h('p', { class: 'small', 'aria-live': 'polite', style: { minHeight: '1.6em', margin: '8px 2px 0' } }, '');
      const friend = h('div', { hidden: true, style: { marginTop: '10px', display: 'flex', gap: '12px', alignItems: 'center' } });
      api.stageBox.append(h('div', { style: { padding: '12px' } }, browser, status, friend));

      function render() {
        const S = st.on.style;
        petEl.innerHTML = petSvg(PET[st.pet]);
        titleEl.textContent = st.title || ' ';
        textEl.textContent = st.text;
        content.hidden = !st.on.content;
        addr.textContent = (st.web ? '🔒 ' : '') + (st.web ? WEB_URL : FILE_URL);
        addr.title = st.web ? WEB_URL : FILE_URL;
        if (S) {
          page.style.cssText = 'color-scheme:light;min-height:280px;padding:16px 12px;background:' + BG[st.bg] + ';transition:background .3s;';
          frame.style.cssText = 'background:#fff;border-radius:20px;padding:16px 14px 18px;margin:0 auto;max-width:300px;min-height:244px;text-align:center;box-shadow:0 5px 0 rgba(27,36,64,.15);font-family:var(--display);color:#3a4260;';
          titleEl.style.cssText = 'margin:0 0 4px;font-family:var(--display);font-weight:400;line-height:1.2;color:' + TITLE[st.tcol] + ';font-size:' + SIZE[st.size] + 'px;';
          textEl.style.cssText = 'margin:0 0 6px;font-size:16px;line-height:1.5;color:#4a5272;font-family:var(--body);';
          petBox.style.margin = '0 auto 8px';
          feedBtn.style.cssText = 'font:20px/1.2 var(--display);color:#fff;background:' + BTN[st.bcol] + ';border:0;border-radius:999px;padding:10px 30px;cursor:pointer;box-shadow:0 4px 0 rgba(0,0,0,.22);';
        } else {
          // 没有“样子”：浏览器自己默认的样子，白底黑字
          page.style.cssText = 'color-scheme:light;min-height:280px;padding:8px;background:#fff;color:#000;font:16px/1.25 "Times New Roman",Times,serif;text-align:left;';
          frame.style.cssText = '';
          titleEl.style.cssText = 'all:revert;';
          textEl.style.cssText = 'all:revert;';
          petBox.style.margin = '0 0 8px';
          feedBtn.style.cssText = 'all:revert;';
        }
      }

      // ---------- 动作 ----------
      let talkTimer = 0;
      function feed(fromGuess) {
        feedBtn.animate([{ transform: 'scale(.92)' }, { transform: 'scale(1)' }], 180);
        if (!st.on.action) {
          status.textContent = '你点了「喂它」……什么也没发生。';
          api.sound('tick');
          return;
        }
        if (st.act === 'jump') {
          petBox.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-46px) rotate(-6deg)', offset: 0.45 }, { transform: 'translateY(0)' }, { transform: 'translateY(-10px)', offset: 0.8 }, { transform: 'translateY(0)' }], { duration: 700, easing: 'ease-out' });
          api.sound('boing');
          status.textContent = '团团跳了一下！';
        } else if (st.act === 'color') {
          st.pet = (st.pet + 1) % PET.length; render();
          petBox.animate([{ transform: 'scale(1.15)' }, { transform: 'scale(1)' }], 300);
          api.sound('pop');
          status.textContent = '团团变颜色了！';
        } else {
          const lines = ['好吃！谢谢你！', '咕噜咕噜，我还要！', '我吃饱啦～'];
          bubble.textContent = lines[st.talkN++ % lines.length];
          bubble.hidden = false;
          clearTimeout(talkTimer);
          talkTimer = setTimeout(() => { bubble.hidden = true; }, 1800);
          api.sound('ding');
          status.textContent = '团团说话了！';
        }
        if (!fromGuess) {
          if (st.on.content) done('feed');
          if (st.act === 'talk') done('talk');
        }
      }
      api.onCleanup(() => clearTimeout(talkTimer));
      feedBtn.addEventListener('click', () => feed(false));

      function sendFriend() {
        friend.hidden = false;
        friend.textContent = '';
        const ok = st.web;
        const phone = h('div', { style: { flex: 'none', width: '92px', height: '120px', border: '3px solid var(--ink)', borderRadius: '16px', background: ok ? BG[st.bg] : '#fff', color: NAVY, display: 'grid', placeItems: 'center', textAlign: 'center', padding: '6px', font: '13px/1.3 var(--display)', colorScheme: 'light' } },
          ok ? h('div', null, h('div', { style: { color: TITLE[st.tcol], fontSize: '14px' } }, st.on.content ? (st.title || ' ') : ''), h('div', { html: petSvg(PET[st.pet]).replace('width="120" height="100"', 'width="60" height="50"') }), '打开啦')
            : h('div', null, h('div', { style: { fontSize: '30px', lineHeight: '1' } }, '?'), '打不开'));
        const say = h('p', { style: { margin: '0', fontSize: '15px' } },
          h('b', null, '朋友的手机：'),
          ok ? '打开了！和你看到的是同一个网页。' : '找不到这个文件。朋友的电脑和手机里，根本没有你的“我的作品”文件夹。');
        friend.append(phone, say);
        phone.animate([{ transform: 'translateY(16px)', opacity: 0 }, { transform: 'none', opacity: 1 }], 300);
        api.sound(ok ? 'win' : 'buzz');
        if (ok) done('friend');
      }

      // ---------- 小任务 ----------
      const MISSIONS = [
        ['feed', '点「喂它」，看看团团怎么了'],
        ['plain', '关掉「样子」，看网页变成什么样'],
        ['bg', '打开「样子」，换一个背景颜色'],
        ['title', '在「改内容」里，把大标题改成你起的名字'],
        ['talk', '在「改动作」里选「说话」，再喂它'],
        ['friend', '请老师发布，再发给朋友看看'],
      ];
      const got = {};
      const mList = h('ol', { style: { margin: '0', paddingLeft: '1.4em', display: 'grid', gap: '2px', fontSize: '15px' } });
      const rDone = api.readout('完成的小任务', '0 / ' + MISSIONS.length);
      api.controlBox.append(h('div', { class: 'ctl' }, h('span', { class: 'lab' }, '小任务'), mList));
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
        if (n === MISSIONS.length) {
          setTimeout(() => { api.sound('win'); api.overlay('全部完成！你会拆网页啦：内容、样子、动作，一样都不少。点这里接着玩', () => {}); }, 900);
        } else { api.sound('ding'); api.toast('完成一个小任务！'); }
      }
      drawMissions();

      // ---------- 三个开关 ----------
      const SW = [
        ['content', '内容', '写了什么', 'HTML · index.html（骨架）'],
        ['style', '样子', '长什么样', 'CSS · style.css（衣服）'],
        ['action', '动作', '点了会怎样', 'JavaScript · script.js'],
      ];
      const swRow = h('div', { style: { display: 'grid', gap: '8px' } });
      const swBtns = {};
      SW.forEach(([k, name, what, grown]) => {
        const state = h('span', { style: { marginLeft: 'auto', fontSize: '15px' } });
        const b = h('button', { class: 'btn', type: 'button', style: { display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left', width: '100%', flexWrap: 'wrap' } },
          h('span', { style: { font: '22px/1 var(--display)' } }, name),
          h('span', { style: { fontWeight: '400', fontSize: '15px' } }, what, h('span', { class: 'grown', style: { display: 'block', fontSize: '12px', opacity: '.8' } }, grown)),
          state);
        b.addEventListener('click', () => { setSwitch(k, !st.on[k]); api.sound(st.on[k] ? 'pop' : 'boing'); });
        swBtns[k] = { b, state };
        swRow.append(b);
      });
      api.controlBox.append(h('div', { class: 'ctl' }, h('span', { class: 'lab' }, '网页的三样东西（点一下开 / 关）'), swRow));
      function setSwitch(k, v) {
        st.on[k] = v;
        swBtns[k].b.setAttribute('aria-pressed', String(v));
        swBtns[k].state.textContent = v ? '开着' : '关掉了';
        if (k === 'style' && !v) done('plain');
        if (k === 'action') status.textContent = v ? '' : '「动作」关掉了。点「喂它」试试？';
        if (k === 'content') status.textContent = v ? '' : '「内容」关掉了：只剩一个空盒子。';
        if (k === 'style') status.textContent = v ? '' : '「样子」关掉了：东西都还在，只是变朴素了。';
        render();
      }
      SW.forEach(([k]) => setSwitch(k, true));
      status.textContent = '';

      // ---------- 改一改 ----------
      const panels = {};
      api.choice({
        label: '改一改', value: 'content',
        options: [{ value: 'content', label: '改内容' }, { value: 'style', label: '改样子' }, { value: 'action', label: '改动作' }],
        onChange: (v) => { for (const k in panels) panels[k].hidden = k !== v; },
      });
      const inputStyle = { font: '17px/1.3 var(--body)', padding: '8px 10px', border: '2.5px solid var(--ink)', borderRadius: '10px', background: 'var(--card)', color: 'var(--ink)', width: '100%' };
      const tIn = h('input', { type: 'text', maxlength: 10, value: st.title, id: 'web-title', style: inputStyle });
      const pIn = h('input', { type: 'text', maxlength: 20, value: st.text, id: 'web-text', style: inputStyle });
      tIn.addEventListener('input', () => { st.title = tIn.value; render(); if (tIn.value.trim() && tIn.value.trim() !== DEF_TITLE) done('title'); });
      pIn.addEventListener('input', () => { st.text = pIn.value; render(); });
      panels.content = h('div', { class: 'ctl', style: { gap: '8px' } },
        h('label', { class: 'lab', for: 'web-title' }, '大标题'), tIn,
        h('label', { class: 'lab', for: 'web-text' }, '一句话'), pIn);
      panels.style = h('div', { class: 'ctl', hidden: true, style: { gap: '4px' } });
      panels.action = h('div', { class: 'ctl', hidden: true });
      api.controlBox.append(panels.content, panels.style, panels.action);
      const styleCtl = (label, key, opts) => api.choice({
        label, value: st[key], parent: panels.style, options: opts,
        onChange: (v) => {
          st[key] = v; render();
          if (key === 'bg' && v !== 'cream' && st.on.style) done('bg');
          if (!st.on.style) api.toast('「样子」关着呢，先把它打开');
        },
      });
      styleCtl('背景颜色', 'bg', [{ value: 'cream', label: '奶黄' }, { value: 'sky', label: '天蓝' }, { value: 'pink', label: '粉红' }, { value: 'mint', label: '薄荷' }]);
      styleCtl('标题颜色', 'tcol', [{ value: 'navy', label: '深蓝' }, { value: 'red', label: '红' }, { value: 'purple', label: '紫' }, { value: 'green', label: '绿' }]);
      styleCtl('标题大小', 'size', [{ value: 's', label: '小' }, { value: 'm', label: '中' }, { value: 'l', label: '大' }]);
      styleCtl('按钮颜色', 'bcol', [{ value: 'blue', label: '蓝' }, { value: 'orange', label: '橙' }, { value: 'green', label: '绿' }, { value: 'purple', label: '紫' }]);
      const actCtl = api.choice({
        label: '点「喂它」会', value: st.act, parent: panels.action,
        options: [{ value: 'jump', label: '跳一下' }, { value: 'color', label: '变颜色' }, { value: 'talk', label: '说话' }],
        onChange: (v) => { st.act = v; if (!st.on.action) api.toast('「动作」关着呢，先把它打开'); },
      });

      // ---------- 地址栏 ----------
      const placeCtl = api.choice({
        label: '网页放在哪', value: 'file',
        options: [{ value: 'file', label: '只在我的电脑里' }, { value: 'web', label: '请老师发布到网上' }],
        onChange: (v) => { st.web = v === 'web'; friend.hidden = true; render(); if (st.web) api.toast('发布好了！地址变成 https:// 开头'); },
      });
      api.button('把地址发给朋友', () => sendFriend(), 'primary');
      api.controlBox.append(h('p', { class: 'small' }, '看网页最上面的地址栏：file:// 开头，是“我电脑里的一个文件”；https:// 开头，是放到网上的网页。'));

      render();

      // ---------- 猜一猜 ----------
      const allOn = () => { SW.forEach(([k]) => setSwitch(k, true)); };
      api.guesses([
        {
          q: '关掉“样子”，网页会怎样？',
          options: ['整个网页都不见了', '还在，但变得很朴素', '变成一片黑'], answer: 1,
          why: '标题、那句话、团团和按钮都还在，那是“内容”管的。只是颜色、大小、位置没人管了，就变成浏览器默认的白底黑字。',
          apply: () => { allOn(); setTimeout(() => { setSwitch('style', false); api.sound('boing'); }, 400); },
        },
        {
          q: '按钮还在、也很好看，可点了没反应。是哪一样出了问题？',
          options: ['内容', '样子', '动作'], answer: 2,
          why: '“点了以后会怎样”归“动作”管。动作关掉了，按钮就只是摆着好看。把动作打开再点，团团又跳起来了。',
          apply: () => {
            allOn(); st.act = 'jump'; actCtl.set('jump'); setSwitch('action', false);
            setTimeout(() => feed(true), 500);
            setTimeout(() => { setSwitch('action', true); api.toast('把「动作」打开，再点一次'); }, 1700);
            setTimeout(() => feed(true), 2300);
          },
          delay: 2900,
        },
        {
          q: '地址是 file:// 开头的，把它发给朋友，朋友能打开吗？',
          options: ['能，一样打得开', '不能，要发布成 https:// 才行'], answer: 1,
          why: 'file:// 的意思是“我电脑里的一个文件”，朋友那里没有这个文件。发布以后地址变成 https:// 开头，谁都能打开，用手机也行。发布这件事找老师帮忙。',
          apply: () => {
            placeCtl.set('file');
            setTimeout(() => sendFriend(), 300);
            setTimeout(() => placeCtl.set('web'), 1700);
            setTimeout(() => sendFriend(), 2400);
          },
          delay: 3000,
        },
      ]);

      api.say({
        left: '网页',
        right: '内容 + 样子 + 动作：写了什么、长什么样、点了会怎样',
        example: '标题、那句话、团团的图是“内容”；背景颜色、字的大小是“样子”；点「喂它」团团会跳，是“动作”。',
        promptIntro: '在你的电脑上试一试：',
        prompt: '打开“我的作品 → 拆开看看”，找到 index.html、style.css、script.js 三个文件。说一说：哪个管内容，哪个管样子，哪个管动作？',
      });

    },

    thumb(ctx, w, h, t) {
      const ink = NAVY;
      // 浏览器窗口
      ctx.fillStyle = '#fff'; ctx.strokeStyle = ink; ctx.lineWidth = 3;
      PG.roundRect(ctx, 40, 22, 240, 160, 12); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(40, 46); ctx.lineTo(280, 46); ctx.stroke();
      ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(56 + i * 13, 34, 4.5, 0, Math.PI * 2); ctx.fill(); });
      ctx.fillStyle = '#eef3ff'; PG.roundRect(ctx, 100, 27, 168, 14, 7); ctx.fill();
      ctx.fillStyle = ink; ctx.font = '10px monospace'; ctx.fillText('https://…/index.html', 108, 37);
      const phase = Math.floor(t / 1.5) % 3; // 轮流：内容、样子、动作
      ctx.fillStyle = phase === 1 ? '#fff' : '#fff6d6'; ctx.fillRect(42, 48, 236, 132);
      ctx.fillStyle = phase === 1 ? '#000' : '#e2453a';
      ctx.font = (phase === 1 ? 'bold 16px serif' : '18px sans-serif'); ctx.textAlign = phase === 1 ? 'left' : 'center';
      ctx.fillText('我的小宠物', phase === 1 ? 50 : 160, 70); ctx.textAlign = 'left';
      const jump = phase === 2 ? Math.abs(Math.sin(t * 5)) * 16 : 0;
      const px = phase === 1 ? 80 : 160, py = 118 - jump;
      ctx.fillStyle = '#ffb347'; ctx.strokeStyle = ink; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(px - 14, py - 18, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(px + 14, py - 18, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(px, py, 22, 19, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(px - 7, py - 3, 2.6, 0, Math.PI * 2); ctx.arc(px + 7, py - 3, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = phase === 1 ? '#ddd' : '#3d7fe0';
      PG.roundRect(ctx, phase === 1 ? 50 : 130, 148, 60, 22, phase === 1 ? 3 : 11); ctx.fill();
      ctx.fillStyle = phase === 1 ? '#000' : '#fff'; ctx.font = '13px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('喂它', phase === 1 ? 80 : 160, 163);
      // 三个小签
      ['内容', '样子', '动作'].forEach((s, i) => {
        const on = !(phase === 1 && i === 1);
        ctx.fillStyle = on ? '#ffd43b' : '#fff'; ctx.strokeStyle = ink; ctx.lineWidth = 2;
        PG.roundRect(ctx, 286, 52 + i * 44, 30, 34, 8); ctx.fill(); ctx.stroke();
        ctx.fillStyle = ink; ctx.font = '11px sans-serif'; ctx.fillText(s, 301, 73 + i * 44);
      });
      ctx.textAlign = 'left';
    },
  });
})();
