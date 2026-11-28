/* 用 WebAudio 合成音效。第一次指针或按键之前不发声，也不创建音频上下文。 */
(function () {
  'use strict';
  var Island = window.Island;
  var ctx = null;
  var master = null;
  var unlocked = false;
  var muted = false;
  var hoverAt = {};
  var hoverLog = [];

  function ensure() {
    if (ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.6;
      var comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 12;
      comp.ratio.value = 6;
      comp.attack.value = 0.003;
      comp.release.value = 0.15;
      master.connect(comp);
      comp.connect(ctx.destination);
      return true;
    } catch (e) {
      ctx = null;
      return false;
    }
  }

  function tone(opt) {
    if (!unlocked || muted || !ctx) return;
    try {
      var dur = opt.dur == null ? 0.1 : opt.dur;
      var atk = opt.atk == null ? 0.004 : opt.atk;
      var gain = opt.gain == null ? 0.12 : opt.gain;
      var delay = opt.delay || 0;
      var f0 = Math.max(1, opt.f0 || 600);
      var f1 = Math.max(1, opt.f1 == null ? f0 : opt.f1);
      var t = ctx.currentTime + delay;
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = opt.type || 'sine';
      o.frequency.setValueAtTime(f0, t);
      if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + Math.max(0.01, dur));
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t + Math.max(0.001, atk));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      if (opt.filter) {
        var f = ctx.createBiquadFilter();
        f.type = opt.filter;
        f.frequency.setValueAtTime(Math.max(1, opt.fStart || 300), t);
        if (opt.fEnd) f.frequency.exponentialRampToValueAtTime(Math.max(1, opt.fEnd), t + dur);
        o.connect(f);
        f.connect(g);
      } else {
        o.connect(g);
      }
      g.connect(master);
      o.start(t);
      o.stop(t + dur + 0.02);
    } catch (e) {}
  }

  function noise(opt) {
    if (!unlocked || muted || !ctx) return;
    try {
      var dur = opt.dur || 0.08;
      var gain = opt.gain == null ? 0.08 : opt.gain;
      var delay = opt.delay || 0;
      var frames = Math.max(1, Math.floor(ctx.sampleRate * dur));
      var buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
      var data = buffer.getChannelData(0);
      for (var i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
      var src = ctx.createBufferSource();
      src.buffer = buffer;
      var filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = opt.hp || 2000;
      var g = ctx.createGain();
      var t = ctx.currentTime + delay;
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(filter);
      filter.connect(g);
      g.connect(master);
      src.start(t);
      src.stop(t + dur + 0.02);
    } catch (e) {}
  }

  function arp(freqs, opt) {
    for (var i = 0; i < freqs.length; i++) {
      tone({
        type: opt.type || 'sine',
        f0: freqs[i],
        f1: freqs[i],
        dur: opt.dur || 0.09,
        atk: opt.atk || 0.004,
        gain: opt.gain || 0.14,
        delay: (opt.delay || 0) + i * (opt.gap || 0.07)
      });
    }
  }

  var cues = {
    hover: function () { tone({ type: 'sine', f0: 1200, f1: 1400, dur: 0.04, atk: 0.005, gain: 0.04 }); },
    press: function () { tone({ type: 'triangle', f0: 320, f1: 220, dur: 0.05, atk: 0.003, gain: 0.10 }); },
    click: function () { tone({ type: 'sine', f0: 520, f1: 880, dur: 0.11, atk: 0.004, gain: 0.14 }); },
    lift: function () { tone({ type: 'triangle', f0: 440, f1: 660, dur: 0.09, atk: 0.004, gain: 0.12 }); },
    tick: function () { tone({ type: 'sine', f0: 900, f1: 900, dur: 0.02, atk: 0.002, gain: 0.02 }); },
    magnet: function () { tone({ type: 'sine', f0: 780, f1: 1040, dur: 0.06, atk: 0.004, gain: 0.06 }); },
    drop: function () {
      tone({ type: 'sine', f0: 180, f1: 90, dur: 0.08, atk: 0.002, gain: 0.22 });
      noise({ dur: 0.02, hp: 2000, gain: 0.08 });
    },
    ok: function () { arp([523, 659, 784], { dur: 0.09, gap: 0.07, gain: 0.14 }); },
    wrong: function () { tone({ type: 'triangle', f0: 330, f1: 247, dur: 0.18, atk: 0.005, gain: 0.11 }); },
    hint: function (soft) { arp([988, 1319], { dur: 0.1, gap: 0.1, gain: soft ? 0.06 : 0.09 }); },
    win: function () { arp([523, 659, 784, 1047], { type: 'triangle', dur: 0.12, gap: 0.09, gain: 0.16 }); },
    star: function (i) {
      var f = [659, 784, 988, 1175][i] || 784;
      tone({ type: 'sine', f0: f, f1: f, dur: 0.1, atk: 0.004, gain: 0.14 });
    },
    starIn: function () { tone({ type: 'sine', f0: 1568, f1: 2093, dur: 0.07, atk: 0.003, gain: 0.08 }); },
    whooshIn: function () { tone({ type: 'sine', f0: 300, f1: 600, dur: 0.4, atk: 0.01, gain: 0.06 }); },
    whooshOut: function () { tone({ type: 'sine', f0: 600, f1: 300, dur: 0.4, atk: 0.01, gain: 0.06 }); },
    unlock: function () {
      tone({ type: 'sine', f0: 1319, f1: 1319, dur: 0.3, atk: 0.003, gain: 0.14 });
      tone({ type: 'sine', f0: 1319, f1: 1319, dur: 0.22, atk: 0.003, gain: 0.056, delay: 0.12 });
    },
    lock: function () { noise({ dur: 0.08, hp: 3000, gain: 0.08 }); },
    creak: function () {
      tone({ type: 'sawtooth', f0: 90, f1: 140, dur: 0.25, atk: 0.01, gain: 0.08, filter: 'bandpass', fStart: 300, fEnd: 900 });
    },
    chord: function () {
      tone({ type: 'sine', f0: 523, dur: 0.6, atk: 0.01, gain: 0.12 });
      tone({ type: 'sine', f0: 659, dur: 0.6, atk: 0.01, gain: 0.1 });
      tone({ type: 'sine', f0: 784, dur: 0.6, atk: 0.01, gain: 0.1 });
    },
    badge: function () { tone({ type: 'sine', f0: 880, f1: 1760, dur: 0.4, atk: 0.01, gain: 0.08 }); },
    step: function (i) {
      var f = 420 + (i || 0) * 90;
      tone({ type: 'sine', f0: f, f1: f * 1.2, dur: 0.08, atk: 0.003, gain: 0.1 });
    },
    path: function () { tone({ type: 'sine', f0: 520, f1: 740, dur: 0.05, atk: 0.003, gain: 0.08 }); }
  };

  Island.sfx = {
    unlock: function () {
      if (unlocked) {
        if (ctx && ctx.state === 'suspended') {
          try { ctx.resume(); } catch (e) {}
        }
        return;
      }
      if (!ensure()) return;
      unlocked = true;
      if (ctx.state === 'suspended') {
        try { ctx.resume(); } catch (e) {}
      }
    },
    setMuted: function (m) { muted = !!m; },
    muted: function () { return muted; },
    toggle: function () {
      muted = !muted;
      Island.store.setMuted(muted);
      return muted;
    },
    play: function (name, arg) {
      if (!unlocked || muted) return;
      var fn = cues[name];
      if (fn) fn(arg);
    },
    hover: function (key) {
      var now = performance.now();
      var id = key || '_';
      if (hoverAt[id] && now - hoverAt[id] < 150) return;
      var next = [];
      for (var i = 0; i < hoverLog.length; i++) {
        if (now - hoverLog[i] < 1000) next.push(hoverLog[i]);
      }
      hoverLog = next;
      if (hoverLog.length >= 8) return;
      hoverAt[id] = now;
      hoverLog.push(now);
      cues.hover();
    }
  };
})();
