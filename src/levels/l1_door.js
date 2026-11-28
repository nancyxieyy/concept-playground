/* 开门热身：点亮星星，双击礼物，把钥匙拖到门上。 */
(function () {
  'use strict';
  var Island = window.Island;
  var P = Island.PAL;
  var STARS = [[360, 220], [530, 170], [700, 260]];

  Island.IMPL.door = {
    create: function (scene, cfg) {
      var api = scene.api;
      api.placeLucky(190, 620);
      var lit = 0;
      var opened = false;
      var doorOpen = false;
      var key = null;
      var last = 0;
      var wait = null;

      var door = scene.add.container(1040, 430).setDepth(8);
      var frame = scene.add.rectangle(0, 0, 168, 250, P.woodDeep).setStrokeStyle(4, P.ink);
      var glow = scene.add.rectangle(0, 8, 128, 210, P.hint, 0);
      var panel = scene.add.rectangle(0, 8, 128, 210, P.wood).setStrokeStyle(4, P.ink);
      var knob = scene.add.circle(36, 16, 10, P.star).setStrokeStyle(3, P.ink);
      door.add([frame, glow, panel, knob]);
      door.setSize(168, 250);
      door._bsx = 1;
      door._bsy = 1;

      var stars = STARS.map(function (p, i) {
        var c = scene.add.container(p[0], p[1]).setDepth(12);
        var img = scene.add.image(0, 0, 'fx-star');
        c.add(img);
        c.img = img;
        c.i = i;
        c.lit = false;
        c.setSize(84, 84);
        c.setInteractive({
          hitArea: Island.hit.circle(c, 42),
          hitAreaCallback: Phaser.Geom.Circle.Contains,
          useHandCursor: true
        });
        c.on('pointerover', function () {
          if (!api.playable() || c.lit) return;
          Island.sfx.hover('star' + i);
          c.setScale(1.06);
        });
        c.on('pointerout', function () { if (!c.lit) c.setScale(1); });
        c.on('pointerdown', function () {
          if (!api.playable() || c.lit) return;
          Island.sfx.play('press');
          c.setScale(0.92);
        });
        c.on('pointerup', function (pointer) {
          if (!api.playable() || c.lit) return;
          c.setScale(1);
          light(c, pointer);
        });
        return c;
      });

      var gift = scene.add.container(530, 450).setDepth(14).setVisible(false);
      var body = scene.add.rectangle(0, 16, 128, 96, P.orange).setStrokeStyle(4, P.ink);
      var ribbon = scene.add.rectangle(0, 16, 18, 110, P.cream).setStrokeStyle(3, P.ink);
      var lid = scene.add.rectangle(0, -42, 136, 36, P.orangeDeep).setStrokeStyle(4, P.ink);
      var blue = scene.add.rectangle(0, 0, 136, 140, P.select, 0);
      gift.add([body, ribbon, lid, blue]);
      gift.lid = lid;
      gift.blue = blue;
      gift.setSize(140, 140);
      gift.setInteractive({
        hitArea: Island.hit.rect(gift, 140, 140),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true
      });

      function goalStar() {
        for (var i = 0; i < stars.length; i++) if (!stars[i].lit) return stars[i];
        return stars[0];
      }
      function armStars() {
        api.setTask(cfg.tasks[0]);
        api.setStep({
          goal: goalStar(),
          hint: cfg.hints.star,
          demo: function () { var s = goalStar(); if (s && !s.lit) light(s); }
        });
      }
      function light(star) {
        if (star.lit) return;
        star.lit = true;
        star.setScale(1.08);
        Island.sfx.play('star', lit);
        Island.fx.ring(scene, star.x, star.y);
        Island.fx.sparks(scene, star.x, star.y, 6);
        Island.fx.stars(scene, star.x, star.y, 4);
        lit += 1;
        scene.coach.streak = 0;
        scene.coach.touch();
        if (scene.lucky) scene.lucky.nod();
        if (lit >= 3) showGift();
        else armStars();
      }
      function showGift() {
        api.setTask(cfg.tasks[1]);
        gift.setVisible(true);
        Island.fx.pop(scene, gift, 40, 1);
        armGift();
      }
      function armGift() {
        api.setStep({ goal: gift, hint: cfg.hints.gift, demo: openGift });
      }
      function openGift() {
        if (opened) return;
        opened = true;
        if (wait) wait.remove();
        gift.blue.setAlpha(0);
        gift.disableInteractive();
        Island.sfx.play('click');
        if (scene.lucky) scene.lucky.nod();
        Island.fx.tween(scene, lid, { y: -150, angle: -28, alpha: 0 }, { dur: 280, ease: 'Back.easeOut' });
        key = makeKey();
        Island.fx.pop(scene, key, 80, 1);
        api.setTask(cfg.tasks[2]);
        armKey();
      }
      function makeKey() {
        var k = scene.add.container(530, 300).setDepth(18);
        var shaft = scene.add.rectangle(14, 0, 48, 14, P.star).setStrokeStyle(4, P.starEdge);
        var head = scene.add.circle(-22, 0, 16, P.star).setStrokeStyle(4, P.starEdge);
        var tooth = scene.add.rectangle(30, 10, 14, 12, P.star).setStrokeStyle(3, P.starEdge);
        k.add([shaft, tooth, head]);
        k.setSize(90, 48);
        Island.drag.make(scene, k, {
          key: 'key',
          hw: 50,
          hh: 28,
          targets: function () {
            return [{ id: 'door', x: door.x, y: door.y + 10, magnet: cfg.tuning.magnet, obj: door }];
          },
          onDrop: function () { openDoor(); },
          onReject: function () { return api.miss(cfg.bubbles.door); }
        });
        return k;
      }
      function armKey() {
        api.setStep({
          goal: door,
          hint: cfg.hints.key,
          demo: function () {
            if (!key) return;
            scene.tweens.killTweensOf(key);
            Island.drag.park(key, door.x - 10, door.y + 20);
            openDoor();
          }
        });
      }
      function openDoor() {
        if (doorOpen) return;
        doorOpen = true;
        if (key) key.disableInteractive();
        Island.sfx.play('drop');
        glow.setAlpha(0.95);
        Island.fx.tween(scene, panel, { x: 78 }, { dur: 320, ease: 'Quad.easeOut' });
        if (scene.lucky) scene.lucky.hop(860, 600);
        Island.store.clearLevel(cfg.id, scene.coach.stars(), scene.coach.misses, scene.coach.hints);
        scene.time.delayedCall(520, function () {
          if (scene.sys.isActive() && !scene.won) api.win();
        });
      }

      gift.on('pointerover', function () {
        if (!api.playable() || opened) return;
        Island.sfx.hover('gift');
        gift.setScale(1.06);
      });
      gift.on('pointerout', function () { if (!opened) gift.setScale(1); });
      gift.on('pointerdown', function () {
        if (!api.playable() || opened) return;
        Island.sfx.play('press');
        gift.setScale(0.92);
      });
      gift.on('pointerup', function (p) {
        if (!api.playable() || opened) return;
        gift.setScale(1);
        Island.sfx.play('click');
        Island.fx.ring(scene, p.worldX, p.worldY);
        var now = scene.time.now;
        if (now - last < cfg.tuning.dblMs) {
          if (wait) wait.remove();
          last = 0;
          openGift();
          return;
        }
        last = now;
        gift.blue.setAlpha(0.42);
        if (!Island.MOTION.calm) {
          scene.tweens.add({ targets: gift, angle: 7, yoyo: true, repeat: 2, duration: 55 });
        }
        wait = scene.time.delayedCall(cfg.tuning.dblMs, function () {
          if (!opened && api.playable()) api.miss(cfg.bubbles.single);
        });
      });

      armStars();
      api.intro(stars.concat([door]));

      this._tick = function (time) {
        stars.forEach(function (s, i) {
          if (!s.lit) s.img.y = Math.sin(time / 420 + i) * 8;
        });
      };
    },
    update: function (time) { if (this._tick) this._tick(time); },
    destroy: function () {}
  };
})();
