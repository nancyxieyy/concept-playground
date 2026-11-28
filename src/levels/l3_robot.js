/* 机器人出门：把指令排进格子再运行。刷牙第一轮故意少一格。 */
(function () {
  'use strict';
  var Island = window.Island;
  var P = Island.PAL;

  Island.IMPL.robot = {
    create: function (scene, cfg) {
      var api = scene.api;
      api.placeLucky(1170, 620, { pose: 'point', h: 210, flip: true });
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

      if (scene.challenge) {
        round = 2; slotCount = 5;
        brush.push({id:'rinse',label:'漱口'}, {id:'shoe',label:'穿鞋'});
      }

      var robot = makeRobot(scene, 651, 400);
      var board = Island.ui.panel(scene, 520, 635, 760, 190);
      board.setDepth(6);
      var runBtn = Island.ui.button(scene, 1000, 640, 200, 72, '运行', function () { run(); }, {
        states: ['PLAY']
      });
      runBtn.add(scene.add.image(-52, -2, 'icon-play-white').setDisplaySize(32, 32));
      runBtn.setDepth(20);

      function pack() { return round === 1 ? shoe : brush; }
      function trayX(i, n) {
        var gap = 156;
        var start = 640 - ((n - 1) * gap) / 2;
        return start + i * gap;
      }
      function slotX(i) {
        var xs = slotCount === 4 ? [230, 400, 570, 740] : [293, 483, 673];
        return slotCount === 5 ? 200 + i * 148 : xs[i];
      }

      function layoutSlots() {
        slots.forEach(function (s) { s.destroy(); });
        slots = [];
        for (var i = 0; i < slotCount; i++) {
          var s = scene.add.container(slotX(i), 640).setDepth(12);
          var r = scene.add.image(0, 0, 'ui-slot-empty').setDisplaySize(156, 140);
          var badge = scene.add.image(-62, -58, 'ui-slot-no').setDisplaySize(36, 36);
          var n = scene.add.text(-62, -58, String(i + 1), Island.style(20, '#FFF8EE')).setOrigin(0.5);
          s.add([r, badge, n]);
          s.card = null;
          s.index = i;
          s.plate = r;
          s.setSize(156, 140);
          s._bsx = 1;
          s._bsy = 1;
          slots.push(s);
          attachSlot(s);
        }
      }

      function makeCard(def, x, y) {
        var c = scene.add.container(x, y).setDepth(18);
        var bg = scene.add.image(0, 0, 'ui-card-blank').setDisplaySize(150, 150);
        var picKey = {
          sock: 'prop-socks', shoe: 'prop-shoe', lace: 'prop-shoe-tied',
          brush: 'prop-toothbrush', cap: 'prop-toothpaste', paste: 'prop-toothpaste', teeth: 'prop-toothbrush', rinse: 'prop-toothbrush'
        }[def.id];
        var pic = scene.add.image(0, -16, picKey);
        pic.setDisplaySize(72 * pic.width / pic.height, 72);
        var text = scene.add.text(0, 48, def.label, Island.style(22)).setOrigin(0.5);
        var glow = scene.add.rectangle(0, 0, 150, 150, 0xBFE6CF, 0);
        c.add([bg, pic, text, glow]);
        c.kind = def.id;
        c.glow = glow;
        c.home = { x: x, y: y };
        c.slotIndex = null;
        c.setSize(150, 150);
        cards.push(c);
        Island.drag.make(scene, c, {
          key: def.id,
          hw: 75,
          hh: 75,
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
        api.count();
        s.card = card;
        card.slotIndex = index;
        Island.drag.park(card, s.x, s.y);
        card.setDepth(18);
        select(null);
        arm();
      }
      function attachSlot(s) {
        s.setInteractive({
          hitArea: Island.hit.rect(s, 156, 140),
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
      function wanted() { if (scene.challenge) return ['brush','cap','paste','teeth','rinse']; return round === 1 ? ['sock', 'shoe', 'lace'] : ['brush', 'cap', 'paste', 'teeth']; }
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
        return Island.rules.sequence(seq, want);
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
        if (seq.length < slotCount) {
          api.say(cfg.bubbles.empty);
          return;
        }
        running = true;
        scene.locked = true;
        if (!scene.challenge && round === 2 && slotCount === 3) {
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
            api.resetSteps();
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
            scene.locked = true;
            scene.time.delayedCall(500, function () {
              scene.locked = false;
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
          scene.locked = true;
          scene.time.delayedCall(700, function () {
            scene.locked = false;
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
        var ys = list.length === 3 ? [430, 400, 360] : [400, 400, 400, 400];
        var xs = list.length === 3 ? [300, 500, 980] : [240, 420, 600, 800];
        list.forEach(function (def, i) {
          makeCard(def, list.length > 4 ? 180 + i * 175 : xs[i], list.length > 4 ? 400 : ys[i]);
        });
        api.intro(cards);
      }

      api.onRun = run;
      api.setTask(scene.challenge ? '五张卡，帮机器人刷牙' : cfg.tasks[0]);
      layoutSlots();
      spread(scene.challenge ? brush : shoe);
      api.intro([robot, runBtn]);
      arm();
      this._robot = robot;
    },
    update: function () {},
    destroy: function () { this._robot = null; }
  };

  function makeRobot(scene, x, y) {
    var c = scene.add.container(x, y).setDepth(14);
    var shadow = scene.add.ellipse(0, 120, 140, 24, 0x4A3222, 0.25);
    var body = scene.add.image(0, 0, 'prop-robot-idle');
    body.setDisplaySize(182, 250);
    c.add([shadow, body]);
    c.body = body;
    function face(key) {
      if (c.scene && scene.textures.exists(key)) body.setTexture(key);
    }
    c.pose = function (kind) {
      if (kind === 'lace' || kind === 'teeth') {
        if (!Island.MOTION.calm) scene.tweens.add({ targets: c, y: y - 10, yoyo: true, duration: 120 });
      }
    };
    c.oops = function () {
      face('prop-robot-oops');
      if (Island.MOTION.calm) return;
      scene.tweens.add({ targets: c, angle: 8, yoyo: true, duration: 160 });
    };
    c.dance = function () {
      face('prop-robot-happy');
      if (Island.MOTION.calm) return;
      scene.tweens.add({ targets: c, y: y - 16, yoyo: true, repeat: 1, duration: 140 });
    };
    c.clean = function () { c.dance(); };
    c.reset = function () {
      c.angle = 0;
      face('prop-robot-idle');
    };
    c.setSize(180, 250);
    return c;
  }
})();
