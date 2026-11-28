/* 可独立验证的关卡规则，与画面共用。 */
(function () {
  'use strict';
  var I = window.Island;
  I.rules = {
    stars: function (misses, hints, steps, standard) {
      if (hints === 0 && steps <= standard) return 3;
      return misses + hints <= 2 ? 2 : 1;
    },
    sequence: function (actual, wanted) {
      return actual.length === wanted.length && actual.every(function (v, i) { return v === wanted[i]; });
    },
    polygon: function (reps, degrees, sides) { return reps === sides && degrees === 360 / sides; },
    weather: function (slots, days) {
      return days.map(function (rain) { return slots[rain ? 0 : 1] === (rain ? 'umbrella' : 'sunhat'); });
    },
    route: function (cards, reps, rocks) {
      var actions = [], error = '', pos = 0, trace = [];
      function perform(kind) {
        if (pos >= 6) { error = '走过旗子啦'; return; }
        var rock = rocks.indexOf(pos + 1) >= 0;
        if ((kind === 'walk' && rock) || (kind === 'jump' && !rock)) { error = rock ? '石头挡住啦' : '这里可以走'; return; }
        pos++; trace.push({ pos: pos, jump: kind === 'jump' });
      }
      if (cards.length > 5 || cards.length === 0) error = '最多放五张卡';
      var body = cards.slice();
      var times = body[0] === 'repeat' ? reps : 1;
      if (body[0] === 'repeat') body.shift();
      if (!Number.isInteger(times) || times < 1 || times > 8) error = '再数数格子';
      for (var n = 0; n < times && !error; n++) {
        if (body[0] === 'if') {
          if (body.length !== 4 || body[2] !== 'else' || !['walk', 'jump'].includes(body[1]) || !['walk', 'jump'].includes(body[3])) { error = '把两种做法补齐'; break; }
          actions = [rocks.includes(pos + 1) ? body[1] : body[3]];
        } else actions = body;
        for (var j = 0; j < actions.length && !error; j++) {
          if (!['walk', 'jump'].includes(actions[j])) { error = '再看看卡片顺序'; break; }
          perform(actions[j]);
        }
      }
      return { ok: !error && pos === 6, trace: trace, message: error || (pos < 6 ? '还没到旗子呢' : '到旗子啦') };
    }
  };
})();
