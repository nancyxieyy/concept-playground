/* 连错、提示、演示和发呆提醒。星星按失误次数计算。 */
(function () {
  'use strict';
  var Island = window.Island;

  Island.coach = {
    attach: function (scene, tuning) {
      var t = tuning || {};
      var c = {
        scene: scene,
        hintAt: t.wrongToHint == null ? 2 : t.wrongToHint,
        demoAt: t.wrongToDemo == null ? 3 : t.wrongToDemo,
        idleMs: t.idleHintMs || 20000,
        misses: 0,
        hints: 0,
        streak: 0,
        goal: null,
        hintLine: '',
        demo: null,
        lastAct: 0,
        armed: false,
        idleN: 0
      };
      c.touch = function () { c.lastAct = scene.time.now; };
      c.arm = function () {
        c.armed = true;
        c.touch();
      };
      c.stars = function () {
        var m = c.misses + c.hints;
        if (m <= 0) return 3;
        if (m <= 2) return 2;
        return 1;
      };
      c.useHint = function () {
        if (Island.state !== 'PLAY') return;
        c.hints += 1;
        c.touch();
        Island.sfx.play('hint');
        if (c.goal) Island.fx.halo(scene, c.goal);
        if (scene.lucky) scene.lucky.hint(c.hintLine || '看这里');
      };
      c.miss = function (text) {
        if (Island.state !== 'PLAY') return 'wrong';
        c.misses += 1;
        c.streak += 1;
        c.touch();
        if (c.streak >= c.demoAt) {
          c.hints += 1;
          c.streak = 0;
          Island.sfx.play('hint');
          if (scene.lucky) scene.lucky.nod();
          if (c.demo) c.demo();
          else if (scene.lucky) scene.lucky.say(text);
          return 'demo';
        }
        if (c.streak >= c.hintAt) {
          c.hints += 1;
          Island.sfx.play('hint');
          if (c.goal) Island.fx.halo(scene, c.goal);
          if (scene.lucky) {
            scene.lucky.confused();
            scene.lucky.say(c.hintLine || text, 'hint', 1600);
          }
          return 'hint';
        }
        Island.sfx.play('wrong');
        if (scene.lucky) {
          scene.lucky.confused();
          if (text) scene.lucky.say(text);
        }
        return 'wrong';
      };
      c.update = function (now) {
        if (!c.armed || Island.state !== 'PLAY') return;
        if (!c.goal) return;
        if (now - c.lastAct < c.idleMs) return;
        c.lastAct = now;
        c.idleN += 1;
        Island.sfx.play('hint', true);
        Island.fx.blink(scene, c.goal);
        if (scene.lucky) scene.lucky.hint(c.hintLine || '看这里');
      };
      return c;
    }
  };
})();
