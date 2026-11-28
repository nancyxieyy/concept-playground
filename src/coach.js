/* 提示统一计数；挑战关闭提示，按目标轮预算结算。 */
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
        return Island.rules.stars(c.misses, c.hints, scene.steps, scene.challenge ? scene.cfg.challengeLimit : scene.cfg.standard);
      };
      c.useHint = function () {
        if (Island.state !== 'PLAY' || scene.locked || scene.challenge || !c.hintLine) return;
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
        if (!scene.challenge && c.hintLine && c.streak >= c.demoAt) {
          c.hints += 1;
          c.streak = 0;
          Island.sfx.play('hint');
          if (scene.lucky) scene.lucky.nod();
          if (c.demo) c.demo();
          else if (scene.lucky) scene.lucky.say(text, 'hint');
          return 'demo';
        }
        if (!scene.challenge && c.hintLine && c.streak >= c.hintAt) {
          c.hints += 1;
          Island.sfx.play('hint');
          if (c.goal) Island.fx.halo(scene, c.goal);
          if (scene.lucky) {
            scene.lucky.confused();
            scene.lucky.say(text || c.hintLine, 'hint');
          }
          return 'hint';
        }
        Island.sfx.play('wrong');
        if (scene.lucky) {
          scene.lucky.confused();
          if (text) scene.lucky.say(text, 'hint');
        }
        return 'wrong';
      };
      c.update = function (now) {
        if (!c.armed || scene.challenge || scene.locked || Island.state !== 'PLAY') return;
        if (!c.goal) return;
        if (now - c.lastAct < c.idleMs) return;
        c.lastAct = now;
        c.idleN += 1;
        c.hints += 1;
        Island.sfx.play('hint', true);
        Island.fx.blink(scene, c.goal);
        if (scene.lucky) scene.lucky.hint(c.hintLine || '看这里');
      };
      return c;
    }
  };
})();
