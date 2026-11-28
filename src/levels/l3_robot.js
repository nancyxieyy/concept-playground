/* 机器人出门：把指令排进格子再运行。刷牙第一轮故意少一格。 */
(function () {
  'use strict';
  var Island = window.Island;
  var P = Island.PAL;

  Island.IMPL.robot = {
    create: function (scene, cfg) {
      var api = scene.api;
      api.placeLucky(150, 640);
      var round = 1;
      var slotCount = 3;
      var running = false;
      var selected = null;
      var slots = [];
      var cards = [];

      var shoe = [
        { id: 'sock', label: '穿袜子' },
        { id: 'shoe', label: '穿鞋' },
        { id: 'lace', label: '系鞋带' }
      ];
      var brush = [
        { id: 'brush', label: '拿牙刷' },
        { id: 'cap', label: '打开牙膏盖' },
        { id: 'paste', label: '挤牙膏' },
        { id: 'teeth', label: '刷牙' }
      ];

      var robot = makeRobot(scene, 250, 400);
      var board = scene.add.graphics().setDepth(6);
      var runBtn = Island.ui.button(scene, 900, 400, 220, 72, '▶ 运行', function () { run(); }, {
        states: ['PLAY']
      });
      runBtn.setDepth(20);

      function pack() { return round === 1 ? shoe : brush; }
      function trayX(i, n) {
        var gap = 156;
        var start = 640 - ((n - 1) * gap) / 2;
        return start + i * gap;
      }
      function slotX(i) {
        var gap = slotCount === 4 ? 150 : 170;
        var start = 700 - ((slotCount - 1) * gap) / 2;
        return start + i * gap;
      }

      function layoutSlots() {
        slots.forEach(function (s) { s.destroy(); });
        slots = [];
        board.clear();
        Island.ui.wood(board, 430, 150, 620, 200, 0xE7C89A, P.woodDeep, 18);
        for (var i = 0; i < slotCount; i++) {
          var s = scene.add.container(slotX(i), 250).setDepth(12);
          var r = scene.add.rectangle(0, 0, 132, 72, P.cream).setStrokeStyle(4, P.ink);
          var n = scene.add.text(0, 0, String(i + 1), Island.style(26, '#8C6950', false)).setOrigin(0.5);
          s.add([r, n]);
          s.card = null;
          s.index = i;
          s.setSize(132, 72);
          s._bsx = 1;
          s._bsy = 1;
          slots.push(s);
          attachSlot(s);
        }
      }

      function makeCard(def, x, y) {
        var c = scene.add.container(x, y).setDepth(18);
        var bg = scene.add.rectangle(0, 0, 140, 72, P.cream).setStrokeStyle(4, P.ink);
        var glow = scene.add.rectangle(0, 0, 148, 80, P.hint, 0);
        var text = scene.add.text(0, 0, def.label, Island.style(22, '#4A3222', false)).setOrigin(0.5);
        c.add([glow, bg, text]);
        c.kind = def.id;
        c.glow = glow;
        c.home = { x: x, y: y };
        c.slotIndex = null;
        c.setSize(140, 72);
        cards.push(c);
        Island.drag.make(scene, c, {
          key: def.id,
          hw: 70,
          hh: 36,
          enabled: function () { return !running; },
          targets: function () {
            var list = [];
            for (var i = 0; i < slots.length; i++) {
              if (!slots[i].card || slots[i].card === c) {
                list.push({ id: i, index: i, x: slots[i].x, y: slots[i].y, magnet: cfg.tuning.magnet, obj: slots[i] });
              }
            }
            return list;
          },
          onClick: function (obj) { select(obj); },
          onLift: function (obj) {
            obj._from = obj.slotIndex;
            if (obj.slotIndex != null && slots[obj.slotIndex]) {
              slots[obj.slotIndex].card = null;
              obj.slotIndex = null;
            }
          },
          onDrop: function (t, obj) { sit(obj, t.index); },
          onReject: function (obj) {
            if (obj._from != null && slots[obj._from] && !slots[obj._from].card) sit(obj, obj._from);
            else Island.drag.park(obj, obj.home.x, obj.home.y);
            return null;
          }
        });
        return c;
      }

      function select(card) {
        selected = card;
        cards.forEach(function (c) { if (c.glow) c.glow.setAlpha(c === card ? 0.85 : 0); });
      }
      function sit(card, index) {
        if (card.slotIndex != null && slots[card.slotIndex] && slots[card.slotIndex].card === card) {
          slots[card.slotIndex].card = null;
        }
        var s = slots[index];
        if (!s) return;
        if (s.card && s.card !== card) return;
        s.card = card;
        card.slotIndex = index;
        Island.drag.park(card, s.x, s.y);
        card.setDepth(18);
        select(null);
        arm();
      }
      function attachSlot(s) {
        s.setInteractive({
          hitArea: Island.hit.rect(s, 132, 72),
          hitAreaCallback: Phaser.Geom.Rectangle.Contains,
          useHandCursor: true
        });
        s.on('pointerdown', function () { if (api.playable()) Island.sfx.play('press'); });
        s.on('pointerup', function () {
          if (!api.playable() || running) return;
          Island.sfx.play('click');
          if (selected && !s.card) sit(selected, s.index);
        });
      }
      function recall() {
        cards.forEach(function (c) {
          if (!c.scene) return;
          c.slotIndex = null;
          Island.drag.park(c, c.home.x, c.home.y);
          c.setDepth(18);
        });
        slots.forEach(function (s) { s.card = null; });
        select(null);
      }
      function findTray(kind) {
        for (var i = 0; i < cards.length; i++) {
          if (cards[i].kind === kind && cards[i].slotIndex == null) return cards[i];
        }
        return null;
      }
      function wanted() { return round === 1 ? ['sock', 'shoe', 'lace'] : ['brush', 'cap', 'paste', 'teeth']; }
      function nextStep() {
        var want = wanted();
        for (var i = 0; i < slotCount && i < want.length; i++) {
          var has = slots[i] && slots[i].card && slots[i].card.kind;
          if (has !== want[i]) return { kind: want[i], slot: slots[i] };
        }
        return { kind: want[0], slot: slots[0] };
      }
      function arm() {
        var n = nextStep();
        api.setStep({
          goal: findTray(n.kind) || runBtn,
          hint: round === 1 ? cfg.hints.shoe : cfg.hints.brush,
          demo: function () {
            var card = findTray(n.kind);
            if (card && n.slot && !n.slot.card) sit(card, n.slot.index);
          }
        });
      }
      function sequence() {
        var seq = [];
        slots.forEach(function (s) { if (s.card) seq.push(s.card.kind); });
        return seq;
      }
      function explain(seq) {
        if (round === 1) {
          var sock = seq.indexOf('sock');
          var shoeI = seq.indexOf('shoe');
          var lace = seq.indexOf('lace');
          if (shoeI >= 0 && (sock < 0 || shoeI < sock)) return cfg.bubbles.socks;
          if (lace >= 0 && (shoeI < 0 || lace < shoeI)) return cfg.bubbles.lace;
          return cfg.bubbles.order;
        }
        var cap = seq.indexOf('cap');
        var paste = seq.indexOf('paste');
        if (paste >= 0 && (cap < 0 || paste < cap)) return cfg.bubbles.paste;
        return cfg.bubbles.order;
      }
      function correct(seq) {
        var want = wanted();
        if (seq.length !== want.length) return false;
        for (var i = 0; i < want.length; i++) if (seq[i] !== want[i]) return false;
        return true;
      }

      function playSteps(seq, done) {
        var i = 0;
        var step = function () {
          if (!scene.sys.isActive()) return;
          if (i >= seq.length) { done(); return; }
          var kind = seq[i];
          if (slots[i]) {
            slots[i].setScale(1.06);
            Island.fx.tween(scene, slots[i], { scaleX: 1, scaleY: 1 }, { dur: 180 });
          }
          Island.sfx.play('step', i);
          robot.pose(kind);
          i += 1;
          scene.time.delayedCall(600, step);
        };
        step();
      }

      function run() {
        if (!api.playable() || running) return;
        var seq = sequence();
        if (!seq.length) {
          api.say(cfg.bubbles.empty);
          return;
        }
        running = true;
        scene.locked = true;
        if (round === 2 && slotCount === 3) {
          robot.oops();
          scene.time.delayedCall(800, function () {
            if (!scene.sys.isActive()) return;
            running = false;
            scene.locked = false;
            robot.reset();
            recall();
            cards.forEach(function (c) { if (c.scene) c.destroy(); });
            cards = [];
            slotCount = 4;
            layoutSlots();
            spread(brush);
            if (scene.lucky) {
              scene.lucky.confused();
              scene.lucky.say(cfg.bubbles.paste);
            }
            arm();
          });
          return;
        }
        var ok = correct(seq);
        playSteps(seq, function () {
          running = false;
          scene.locked = false;
          if (!scene.sys.isActive()) return;
          if (ok) succeed();
          else {
            var text = explain(seq);
            robot.oops();
            scene.time.delayedCall(500, function () {
              robot.reset();
              recall();
              api.miss(text);
              arm();
            });
          }
        });
      }

      function succeed() {
        if (round === 1) {
          robot.dance();
          api.good(robot.x, robot.y);
          scene.time.delayedCall(700, function () {
            if (!scene.sys.isActive()) return;
            round = 2;
            slotCount = 3;
            api.setTask(cfg.tasks[1]);
            cards.forEach(function (c) { c.destroy(); });
            cards = [];
            layoutSlots();
            spread(brush);
            robot.reset();
            arm();
          });
        } else {
          robot.clean();
          api.win();
        }
      }

      function spread(list) {
        list.forEach(function (def, i) {
          makeCard(def, trayX(i, list.length), 630);
        });
        api.intro(cards);
      }

      api.onRun = run;
      api.setTask(cfg.tasks[0]);
      layoutSlots();
      spread(shoe);
      api.intro([robot, runBtn]);
      arm();
      this._robot = robot;
    },
    update: function () {},
    destroy: function () { this._robot = null; }
  };

  function makeRobot(scene, x, y) {
    var c = scene.add.container(x, y).setDepth(14);
    var shadow = scene.add.ellipse(0, 78, 100, 22, P.ink, 0.25);
    var body = scene.add.rectangle(0, 16, 84, 92, 0xB9DFF3).setStrokeStyle(4, P.ink);
    var footL = scene.add.ellipse(-22, 66, 30, 16, P.cream).setStrokeStyle(3, P.ink);
    var footR = scene.add.ellipse(22, 66, 30, 16, P.cream).setStrokeStyle(3, P.ink);
    var arm = scene.add.container(48, -8);
    var armRect = scene.add.rectangle(0, 22, 18, 50, P.orange).setStrokeStyle(4, P.ink);
    var paste = scene.add.circle(0, 52, 14, 0x7EC8F0).setStrokeStyle(3, P.ink).setVisible(false);
    arm.add([armRect, paste]);
    var head = scene.add.container(0, -62);
    var skull = scene.add.circle(0, 0, 36, 0xE7F4FB).setStrokeStyle(4, P.ink);
    var eyeL = scene.add.circle(-12, -6, 6, P.ink);
    var eyeR = scene.add.circle(12, -6, 6, P.ink);
    var mouth = scene.add.rectangle(0, 14, 16, 6, P.ink);
    var bubbles = scene.add.container(0, 16);
    head.add([skull, eyeL, eyeR, mouth, bubbles]);
    c.add([shadow, footL, footR, body, arm, head]);
    c.arm = arm;
    c.head = head;
    c.paste = paste;
    c.footL = footL;
    c.footR = footR;
    c.bubbles = bubbles;
    c.pose = function (kind) {
      if (kind === 'sock') { footL.setFillStyle(P.sage); footR.setFillStyle(P.sage); }
      if (kind === 'shoe') { footL.setFillStyle(P.woodDeep); footR.setFillStyle(P.woodDeep); }
      if (kind === 'lace') {
        if (!Island.MOTION.calm) scene.tweens.add({ targets: c, y: y - 10, yoyo: true, duration: 120 });
      }
      if (kind === 'brush' || kind === 'teeth') arm.angle = -50;
      if (kind === 'cap') arm.angle = -20;
      if (kind === 'paste') { arm.angle = -40; paste.setVisible(true); }
    };
    c.oops = function () {
      paste.setVisible(true);
      if (Island.MOTION.calm) return;
      scene.tweens.add({ targets: head, angle: 14, duration: 180, ease: 'Back.easeOut' });
      scene.tweens.add({ targets: arm, angle: -80, duration: 200, ease: 'Back.easeOut' });
    };
    c.dance = function () {
      if (Island.MOTION.calm) return;
      scene.tweens.add({ targets: c, y: y - 16, yoyo: true, repeat: 1, duration: 140 });
    };
    c.clean = function () {
      for (var i = 0; i < 3; i++) {
        var b = scene.add.circle((i - 1) * 14, 0, 8, 0xffffff, 0.9).setStrokeStyle(2, P.skyBot);
        bubbles.add(b);
      }
      c.dance();
    };
    c.reset = function () {
      arm.angle = 0;
      head.angle = 0;
      paste.setVisible(false);
      footL.setFillStyle(P.cream);
      footR.setFillStyle(P.cream);
      bubbles.removeAll(true);
    };
    c.setSize(120, 180);
    return c;
  }
})();
