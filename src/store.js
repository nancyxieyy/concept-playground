/* 进度只存在本地 island2:v1。读写失败时仍可继续玩。 */
(function () {
  'use strict';
  var Island = window.Island;
  var KEY = 'island2:v1';

  function fresh() {
    return { levels: {}, badge: false, muted: false, seenIntro: false };
  }

  function normalize(d) {
    if (!d || typeof d !== 'object') return fresh();
    if (!d.levels || typeof d.levels !== 'object') d.levels = {};
    d.badge = !!d.badge;
    d.muted = !!d.muted;
    d.seenIntro = !!d.seenIntro;
    return d;
  }

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return fresh();
      return normalize(JSON.parse(raw));
    } catch (e) {
      return fresh();
    }
  }

  function write(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
  }

  var data = read();
  Island.session = { unlockAll: Island.params.get('unlock') === 'all' };

  if (Island.params.get('reset') === '1') {
    try { localStorage.removeItem(KEY); } catch (e) {}
    data = fresh();
    try {
      var u = new URL(location.href);
      u.searchParams.delete('reset');
      history.replaceState(null, '', u.pathname + u.search + u.hash);
    } catch (e) {}
  }

  function cleared(id) {
    return !!(data.levels[id] && data.levels[id].cleared);
  }

  Island.store = {
    snapshot: function () { return data; },
    reset: function () {
      data = fresh();
      write(data);
    },
    isCleared: cleared,
    starsOf: function (id) {
      return (data.levels[id] && data.levels[id].stars) || 0;
    },
    totalStars: function () {
      var n = 0;
      var list = Island.LEVELS || [];
      for (var i = 0; i < list.length; i++) n += this.starsOf(list[i].id);
      return n;
    },
    isUnlocked: function (index) {
      if (Island.session.unlockAll) return true;
      if (index <= 0) return true;
      var prev = Island.LEVELS[index - 1];
      return cleared(prev.id);
    },
    clearLevel: function (id, stars, miss, hint) {
      var prev = data.levels[id] || {};
      data.levels[id] = {
        cleared: true,
        stars: Math.max(prev.stars || 0, stars || 1),
        miss: miss || 0,
        hint: hint || 0
      };
      var list = Island.LEVELS || [];
      var all = list.length > 0;
      for (var i = 0; i < list.length; i++) {
        if (!cleared(list[i].id)) all = false;
      }
      if (all) data.badge = true;
      write(data);
    },
    setMuted: function (m) { data.muted = !!m; write(data); },
    muted: function () { return !!data.muted; },
    seenIntro: function () { return !!data.seenIntro; },
    markIntro: function () { data.seenIntro = true; write(data); },
    badge: function () { return !!data.badge; }
  };
})();
