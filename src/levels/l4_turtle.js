/* 乌龟画画：先一步步画正方形，再用一张重复卡画三角形。 */
(function () {
  'use strict';
  var Island = window.Island;
  var P = Island.PAL;
  var STEP = 110;

  Island.IMPL.turtle = {
    create: function (scene, cfg) {
      var api = scene.api;
      var self = this;
      api.placeLucky(150, 700, { pose: 'point', h: 230, flip: true });
      var round = 1;
      var running = false;
      var yawned = false;
      var reps = 3;
      var deg = 90;
      var slots = [];
      var tray = [];
      var chips = [];

      var ink = scene.add.graphics().setDepth(8);
      var turtle = makeTurtle(scene, 630, 360);
      var home = { x: 630, y: 360 };

      var runBtn = Island.ui.button(scene, 980, 640, 180, 72, '运行', function () { go(); }, { states: ['PLAY'] });
      runBtn.add(scene.add.image(-46, -2, 'icon-play-white').setDisplaySize(30, 30));
      runBtn.setDepth(20);

      var slotLayer = scene.add.container(0, 0);
      var controls = scene.add.container(0, 0).setVisible(false);
      var panel = Island.ui.panel(scene, 560, 640, 700, 180);
      panel.setVisible(false);
      var repText = scene.add.text(560, 600, '3', Island.style(38)).setOrigin(0.5);
      var degText = scene.add.text(560, 668, '90°', Island.style(38)).setOrigin(0.5);
      var repWell = scene.add.image(560, 600, 'ui-value-well').setDisplaySize(150, 64);
      var degWell = scene.add.image(560, 668, 'ui-value-well').setDisplaySize(150, 64);
      var frame = scene.add.graphics();
      frame.lineStyle(5, 0x6FB7D6, 1);
      frame.strokeRoundedRect(210, 544, 700, 192, 32);
      var badge = scene.add.image(232, 562, 'ui-slot-no').setDisplaySize(36, 36);
      var badgeN = scene.add.text(232, 562, '1', Island.style(18, '#FFF8EE')).setOrigin(0.5);
      controls.add([panel, frame, badge, badgeN, repWell, degWell, repText, degText]);
      controls.add([
        scene.add.text(300, 600, '重复', Island.style(32)).setOrigin(0, 0.5),
        scene.add.text(300, 668, '右转', Island.style(32)).setOrigin(0, 0.5),
        scene.add.text(650, 600, '次', Island.style(30)).setOrigin(0, 0.5)
      ]);

      function bump(obj) {
        if (Island.MOTION.calm) return;
        obj.setScale(1.2);
        Island.fx.tween(scene, obj, { scaleX: 1, scaleY: 1 }, { dur: 140, ease: 'Back.easeOut' });
      }
      function setRep(n) {
        reps = Phaser.Math.Clamp(n, 1, 6);
        repText.setText(String(reps));
        bump(repText);
        Island.sfx.play('click');
        arm();
      }
      function setDeg(n) {
        var list = [60, 90, 120, 150];
        var i = list.indexOf(deg);
        if (i < 0) i = 1;
        i = Phaser.Math.Clamp(i + n, 0, list.length - 1);
        deg = list[i];
        degText.setText(deg + '°');
        bump(degText);
        Island.sfx.play('click');
        arm();
      }

      var minusR = Island.ui.round(scene, 470, 600, 'minus', function () { setRep(reps - 1); }, { states: ['PLAY'] });
      var plusR = Island.ui.round(scene, 650, 600, 'plus', function () { setRep(reps + 1); }, { states: ['PLAY'] });
      var minusD = Island.ui.round(scene, 470, 668, 'minus', function () { setDeg(-1); }, { states: ['PLAY'] });
      var plusD = Island.ui.round(scene, 650, 668, 'plus', function () { setDeg(1); }, { states: ['PLAY'] });
      controls.add([minusR, plusR, minusD, plusD]);
      controls.setDepth(20);

      function clearSlots() {
        slots.forEach(function (s) { s.destroy(); });
        slots = [];
        chips = chips.filter(function (c) {
          if (c.tray) return true;
          if (c.scene) c.destroy();
          return false;
        });
      }
      function addSlot(x, y) {
        var s = scene.add.container(x, y).setDepth(12);
        var r = scene.add.image(0, 0, 'ui-slot-empty').setDisplaySize(120, 100);
        var n = scene.add.text(0, 0, String(slots.length + 1), Island.style(22, '#8C6950')).setOrigin(0.5);
        s.add([r, n]);
        s.card = null;
        s.index = slots.length;
        s.setSize(120, 100);
        s._bsx = 1;
        s._bsy = 1;
        slots.push(s);
        return s;
      }
      function board8() {
        clearSlots();
        var xs = [430, 550, 670, 790];
        for (var row = 0; row < 2; row++) {
          for (var col = 0; col < 4; col++) addSlot(xs[col], row === 0 ? 500 : 580);
        }
      }
      function board1() {
        clearSlots();
        addSlot(640, 470);
      }
      function emptySlots() {
        var list = [];
        for (var i = 0; i < slots.length; i++) {
          if (!slots[i].card) list.push({ id: i, index: i, x: slots[i].x, y: slots[i].y, magnet: 64, obj: slots[i] });
        }
        return list;
      }
      function chip(kind, x, y) {
        var label = kind === 'F' ? '前进' : kind === 'R' ? '右转' : '重复';
        var c = scene.add.container(x, y).setDepth(18);
        var bg = scene.add.image(0, 0, 'ui-card-blank').setDisplaySize(kind === 'L' ? 150 : 120, kind === 'L' ? 150 : 96);
        var icon = scene.add.image(0, kind === 'L' ? -16 : -8, kind === 'R' ? 'icon-back' : 'icon-play');
        icon.setDisplaySize(36, 36);
        if (kind === 'F') icon.setAngle(-90);
        if (kind === 'R') icon.setFlipX(true);
        var text = scene.add.text(0, kind === 'L' ? 40 : 28, label, Island.style(22)).setOrigin(0.5);
        c.add([bg, icon, text]);
        c.kind = kind;
        c.setSize(kind === 'L' ? 150 : 120, kind === 'L' ? 150 : 96);
        chips.push(c);
        return c;
      }
      function bindTray(card) {
        card.tray = true;
        Island.drag.make(scene, card, {
          key: 'tray' + card.kind,
          hw: 70,
          hh: 32,
          enabled: function () { return !running && (round === 1 || card.kind === 'L'); },
          targets: emptySlots,
          onDrop: function (t, obj) {
            if (slots[t.index].card) {
              Island.drag.park(obj, obj.home.x, obj.home.y);
              return;
            }
            var placed = chip(obj.kind, t.x, t.y);
            placed.slotIndex = t.index;
            slots[t.index].card = placed;
            Island.drag.park(obj, obj.home.x, obj.home.y);
            Island.fx.pop(scene, placed, 0, 1);
            onPlaced();
          },
          onReject: function (obj) {
            Island.drag.park(obj, obj.home.x, obj.home.y);
            return null;
          }
        });
      }
      function makeTray(kind, x, y) {
        var c = chip(kind, x, y);
        c.home = { x: x, y: y };
        c.tray = true;
        bindTray(c);
        tray.push(c);
        return c;
      }
      function countPlaced() {
        var n = 0;
        for (var i = 0; i < slots.length; i++) if (slots[i].card) n++;
        return n;
      }
      function seq() {
        var list = [];
        for (var i = 0; i < slots.length; i++) if (slots[i].card) list.push(slots[i].card.kind);
        return list;
      }
      function onPlaced() {
        if (round === 1 && !yawned && countPlaced() === 5) {
          yawned = true;
          if (scene.lucky) {
            scene.lucky.yawn();
            scene.lucky.say(cfg.bubbles.tired);
          }
        }
        if (round === 2) {
          controls.setVisible(true);
          panel.setVisible(true);
          if (slots[0] && slots[0].card) {
            slots[0].card.setVisible(false);
            slots[0].setVisible(false);
          }
          tray.forEach(function (t) { t.setVisible(false); });
          if (scene.lucky) scene.lucky.say('几条边？数一数');
        }
        arm();
      }
      function fillSquare() {
        var pattern = ['F', 'R', 'F', 'R', 'F', 'R', 'F', 'R'];
        chips = chips.filter(function (c) { return c.tray; });
        for (var i = 0; i < slots.length; i++) {
          if (slots[i].card && !slots[i].card.tray) slots[i].card.destroy();
          var c = chip(pattern[i], slots[i].x, slots[i].y);
          c.slotIndex = i;
          slots[i].card = c;
        }
      }
      function arm() {
        if (round === 1) {
          api.setStep({
            goal: countPlaced() >= 8 ? runBtn : (tray[0] || runBtn),
            hint: cfg.hints.square,
            demo: fillSquare
          });
        } else if (!slots[0] || !slots[0].card) {
          api.setStep({ goal: tray[2] || runBtn, hint: cfg.hints.tri, demo: function () {
            if (slots[0] && !slots[0].card && tray[2]) {
              var c = chip('L', slots[0].x, slots[0].y);
              slots[0].card = c;
              Island.fx.pop(scene, c, 0, 1);
              controls.setVisible(true);
            }
          } });
        } else {
          var goal = (reps !== 3 ? plusR : deg !== 120 ? plusD : runBtn);
          api.setStep({
            goal: goal,
            hint: cfg.hints.tri,
            demo: function () { reps = 3; deg = 120; repText.setText('3'); degText.setText('120°'); }
          });
        }
      }

      function resetTurtle() {
        ink.clear();
        turtle.setPosition(home.x, home.y);
        turtle.setRotation(-Math.PI / 2);
      }
      function forward(done) {
        var a = turtle.rotation;
        var x0 = turtle.x;
        var y0 = turtle.y;
        var x1 = x0 + Math.cos(a) * STEP;
        var y1 = y0 + Math.sin(a) * STEP;
        if (Island.MOTION.calm) {
          ink.lineStyle(14, 0xA8703F, 0.9);
          ink.beginPath();
          ink.moveTo(x0, y0);
          ink.lineTo(x1, y1);
          ink.strokePath();
          turtle.setPosition(x1, y1);
          if (done) done();
          return;
        }
        var proxy = { t: 0 };
        var last = { x: x0, y: y0 };
        scene.tweens.add({
          targets: proxy,
          t: 1,
          duration: 280,
          onUpdate: function () {
            var x = x0 + (x1 - x0) * proxy.t;
            var y = y0 + (y1 - y0) * proxy.t;
            ink.lineStyle(14, 0xA8703F, 0.9);
            ink.beginPath();
            ink.moveTo(last.x, last.y);
            ink.lineTo(x, y);
            ink.strokePath();
            if (Math.hypot(x - last.x, y - last.y) > 16) {
              var puff = scene.add.circle(x, y, 5, 0xffffff, 0.7).setDepth(9);
              scene.tweens.add({ targets: puff, alpha: 0, y: y - 10, duration: 280, onComplete: function () { puff.destroy(); } });
              last.x = x;
              last.y = y;
            }
            turtle.setPosition(x, y);
          },
          onComplete: function () { if (done) done(); }
        });
      }
      function turn(amount, done) {
        Island.sfx.play('step', 1);
        var next = turtle.rotation + amount;
        if (Island.MOTION.calm) { turtle.setRotation(next); if (done) done(); return; }
        Island.fx.tween(scene, turtle, { rotation: next }, { dur: 180, onComplete: done });
      }
      function runSteps(steps, done) {
        var i = 0;
        var step = function () {
          if (!scene.sys.isActive()) return;
          if (i >= steps.length) { if (done) done(); return; }
          var s = steps[i++];
          if (s === 'F') forward(step);
          else turn(s, step);
        };
        step();
      }
      function squareSteps(list) {
        var steps = [];
        list.forEach(function (k) { steps.push(k === 'F' ? 'F' : Math.PI / 2); });
        return steps;
      }
      function closedSquare(list) {
        var x = 0;
        var y = 0;
        var a = -Math.PI / 2;
        var len = 0;
        for (var i = 0; i < list.length; i++) {
          if (list[i] === 'F') {
            x += Math.cos(a) * 10;
            y += Math.sin(a) * 10;
            len += 10;
          } else a += Math.PI / 2;
        }
        return len >= 30 && Math.hypot(x, y) < 1.2;
      }
      function go() {
        if (!api.playable() || running) return;
        if (round === 1) {
          var list = seq();
          if (list.length < 8) { api.say(cfg.bubbles.more); return; }
          running = true;
          scene.locked = true;
          resetTurtle();
          runSteps(squareSteps(list), function () {
            running = false;
            scene.locked = false;
            if (!scene.sys.isActive()) return;
            if (closedSquare(list)) {
              api.good(turtle.x, turtle.y);
              scene.time.delayedCall(600, startRepeat);
            } else {
              var kind = api.miss(cfg.bubbles.close);
              if (kind !== 'demo') {
                chips.forEach(function (c) { if (!c.tray && c.scene) c.destroy(); });
                chips = chips.filter(function (c) { return c.tray; });
                slots.forEach(function (s) { s.card = null; });
              }
              arm();
            }
          });
          return;
        }
        if (!slots[0] || !slots[0].card) { api.say(cfg.bubbles.empty); return; }
        running = true;
        scene.locked = true;
        resetTurtle();
        var steps = [];
        for (var n = 0; n < reps; n++) {
          steps.push('F');
          steps.push(deg * Math.PI / 180);
        }
        var ok = reps === 3 && deg === 120;
        runSteps(steps, function () {
          running = false;
          scene.locked = false;
          if (!scene.sys.isActive()) return;
          if (ok) {
            Island.fx.stars(scene, turtle.x, turtle.y, 10);
            api.win();
          } else {
            if (!Island.MOTION.calm) {
              scene.tweens.add({ targets: turtle, angle: turtle.angle + 12, yoyo: true, duration: 120 });
            }
            scene.coach.goal = reps !== 3 ? repText : degText;
            scene.coach.hintLine = cfg.hints.tri;
            scene.coach.demo = function () {
              reps = 3;
              deg = 120;
              repText.setText('3');
              degText.setText('120°');
            };
            api.miss(cfg.bubbles.close);
          }
        });
      }

      function startRepeat() {
        round = 2;
        api.setTask(cfg.tasks[1]);
        if (scene.lucky) {
          scene.lucky.setLook({ pose: 'point', h: 230, flip: false });
          scene.lucky.say('几条边？数一数');
        }
        resetTurtle();
        tray.forEach(function (t) { t.setVisible(false); t.disableInteractive(); });
        board1();
        controls.setVisible(false);
        var loop = makeTray('L', 160, 400);
        loop.setScale(1);
        if (!Island.MOTION.calm) {
          loop.setAlpha(0.2);
          Island.fx.tween(scene, loop, { alpha: 1, scaleX: 1.08, scaleY: 1.08 }, {
            dur: 280,
            ease: 'Back.easeOut',
            onComplete: function () { loop.setScale(1); }
          });
        }
        var oldDrop = null;
        arm();
        scene._showCtl = function () { controls.setVisible(true); };
      }

      board8();
      var forwardCard = makeTray('F', 120, 310);
      var rightCard = makeTray('R', 120, 400);
      api.onRun = go;
      api.setTask(cfg.tasks[0]);
      api.intro([turtle, forwardCard, rightCard, runBtn].concat(slots));
      arm();

      Island.onArrow = function (key) {
        if (!api.playable() || round !== 2 || !controls.visible) return;
        if (key === 'ArrowUp') setRep(reps + 1);
        else if (key === 'ArrowDown') setRep(reps - 1);
        else if (key === 'ArrowRight') setDeg(1);
        else setDeg(-1);
      };

      var prevDrop = Island.IMPL.turtle;
      self._onPlaced = onPlaced;
      self._round = function () { return round; };
      self._controls = controls;
      self._slots = function () { return slots; };

      var orig = null;
    },
    update: function () {},
    destroy: function () {
      Island.onArrow = null;
    }
  };

  function makeTurtle(scene, x, y) {
    var t = scene.add.container(x, y).setDepth(15);
    var img = scene.add.image(0, 0, 'prop-turtle');
    img.setDisplaySize(118, 124);
    img.setAngle(90);
    t.add(img);
    t.setRotation(-Math.PI / 2);
    t.setSize(120, 120);
    return t;
  }
})();
