/* 八关进度；旧四关按稳定名称迁移，保留旧记录供回退。 */
(function () {
  'use strict';
  var I = window.Island, KEY = 'island2:v2';
  var ids = ['door','files','robot','debug','weather','turtle','turtlePlus','island'];
  function fresh() { return { levels: {}, badge: false, muted: false, seenIntro: false }; }
  function normalize(raw, legacy) {
    var d = fresh();
    if (!raw || typeof raw !== 'object') return d;
    d.muted = !!raw.muted; d.seenIntro = !!raw.seenIntro;
    ids.forEach(function (id) {
      var r = raw.levels && raw.levels[id];
      if (!r || typeof r !== 'object' || !r.cleared || (legacy && !['door','files','robot','turtle'].includes(id))) return;
      d.levels[id] = { cleared: true, stars: Math.min(3, Math.max(1, Math.floor(Number(r.stars)) || 1)), gold: !legacy && !!r.gold };
    });
    d.badge = ids.slice(0,7).every(function (id) { return !!d.levels[id]; });
    return d;
  }
  function write(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { try { return normalize(JSON.parse(raw), false); } catch (e) {} }
      var old = localStorage.getItem('island2:v1');
      var d = old ? normalize(JSON.parse(old), true) : fresh();
      write(d); return d;
    } catch (e) { return fresh(); }
  }
  var data = read();
  I.session = { unlockAll: I.params.get('unlock') === 'all' };
  if (I.params.get('reset') === '1') { data = fresh(); write(data); }
  function cleared(id) { return !!(data.levels[id] && data.levels[id].cleared); }
  I.store = {
    snapshot: function () { return data; },
    reset: function () { data = fresh(); write(data); },
    isCleared: cleared,
    starsOf: function (id) { return data.levels[id] ? data.levels[id].stars : 0; },
    goldOf: function (id) { return !!(data.levels[id] && data.levels[id].gold); },
    totalStars: function () { return ids.reduce(function (n,id) { return n + I.store.starsOf(id); }, 0); },
    isUnlocked: function (index) {
      if (index < 0 || index >= ids.length) return false;
      return I.session.unlockAll || ids.slice(0,index).every(cleared);
    },
    clearLevel: function (id, stars, miss, hint, steps, gold) {
      if (!ids.includes(id)) return;
      var prev = data.levels[id] || {};
      data.levels[id] = { cleared: true, stars: Math.max(prev.stars || 0, Math.min(3, stars || 1)),
        miss: miss || 0, hint: hint || 0, steps: steps || 0, gold: !!prev.gold || !!gold };
      data.badge = ids.slice(0,7).every(cleared); write(data);
    },
    setMuted: function (m) { data.muted = !!m; write(data); },
    muted: function () { return data.muted; },
    seenIntro: function () { return data.seenIntro; },
    markIntro: function () { data.seenIntro = true; write(data); },
    badge: function () { return data.badge; }
  };
})();
