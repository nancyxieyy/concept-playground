/* 开门热身：点亮星星，双击礼物，把钥匙拖到门锁上。门是背景里的，打开时只加一道光。 */
(function () {
  'use strict';
  var Island = window.Island;
  var STARS = [[296, 198], [446, 156], [598, 208]];

  Island.IMPL.door = {
    create: function (scene, cfg) {
      var api = scene.api;
      api.placeLucky(150, 740, { pose: 'point', h: 290, flip: true });
      var lit = 0;
      var opened = false;
      var doorOpen = false;
      var key = null;
      var last = null;
      var wait = null;

      var door = scene.add.container(1030, 458).setDepth(8);
      var halo = scene.add.image(0, 0, 'ui-drop-target-ring').setDisplaySize(124, 124).setAlpha(0);
      var glow = scene.add.circle(0, 0, 36, 0xFFE9A8, 0);
      door.add([halo, glow]);
      door.glow = glow;
      door.halo = halo;
      door.setSize(120, 120);
      door._bsx = 1;
      door._bsy = 1;
      var here = Island.ui.tag(scene, 980, 540, '拖到这里', 'cool');
      here.setVisible(false);
      door.tag = here;

      var stars = STARS.map(function (p, i) {
        var img = scene.add.image(p[0], p[1], 'prop-star-dim').setDepth(12);
        img.setDisplaySize(92, 90);
        img._bsx = img.scaleX;
        img._bsy = img.scaleY;
        img.i = i;
        img.lit = false;
        img.baseY = p[1];
        img.setInteractive({ useHandCursor: true });
        img.on('pointerover', function () {
          if (!api.playable() || img.lit) return;
          Island.sfx.hover('star' + i);
          img.setScale(img._bsx * 1.06, img._bsy * 1.06);
        });
        img.on('pointerout', function () { if (!img.lit) img.setScale(img._bsx, img._bsy); });
        img.on('pointerdown', function () {
          if (!api.playable() || img.lit) return;
          Island.sfx.play('press');
          img.setScale(img._bsx * 0.92, img._bsy * 0.92);
        });
        img.on('pointerup', function (pointer) {
          if (!api.playable() || img.lit) return;
          img.setScale(img._bsx, img._bsy);
          light(img, pointer);
        });
        return img;
      });

      var gift = scene.add.image(450, 545, 'prop-gift-closed').setDepth(14).setVisible(false);
      gift.setDisplaySize(156, 170);
      gift._bsx = gift.scaleX;
      gift._bsy = gift.scaleY;
      gift.setInteractive({ useHandCursor: true });

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
        if (!star || star.lit) return;
        star.lit = true;
        star.setTexture('prop-star-lit');
        star._bsx = 92 / star.frame.width;
        star._bsy = 90 / star.frame.height;
        star.setScale(star._bsx * 1.08, star._bsy * 1.08);
        Island.sfx.play('star', lit);
        Island.fx.ring(scene, star.x, star.y);
        Island.fx.sparks(scene, star.x, star.y, 6);
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
        gift.clearTint();
        gift.disableInteractive();
        gift.setTexture('prop-gift-open');
        gift.setDisplaySize(180, 170);
        gift._bsx = gift.scaleX;
        gift._bsy = gift.scaleY;
        Island.sfx.play('click');
        if (scene.lucky) scene.lucky.nod();
        key = makeKey();
        Island.fx.pop(scene, key, 80, 1);
        api.setTask(cfg.tasks[2]);
        door.halo.setAlpha(0.95);
        door.tag.setVisible(true);
        armKey();
      }
      function makeKey() {
        var k = scene.add.image(500, 470, 'prop-key').setDepth(18);
        k.setDisplaySize(96, 122);
        k._bsx = k.scaleX;
        k._bsy = k.scaleY;
        k.setAngle(-18);
        Island.drag.make(scene, k, {
          key: 'key',
          hw: 48,
          hh: 60,
          targets: function () {
            return [{ id: 'door', x: door.x, y: door.y, magnet: cfg.tuning.magnet, obj: door }];
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
            Island.drag.park(key, door.x, door.y);
            openDoor();
          }
        });
      }
      function openDoor() {
        if (doorOpen) return;
        doorOpen = true;
        if (key) {
          key.disableInteractive();
          key.setPosition(door.x - 8, door.y + 10);
        }
        Island.sfx.play('drop');
        door.glow.setAlpha(0.85);
        door.tag.setVisible(false);
        var doneTag = Island.ui.tag(scene, 980, 540, '开了', 'mint');
        if (scene.lucky) scene.lucky.hop(860, 700);
        Island.store.clearLevel(cfg.id, scene.coach.stars(), scene.coach.misses, scene.coach.hints);
        scene.time.delayedCall(520, function () {
          if (scene.sys.isActive() && !scene.won) api.win();
        });
        return doneTag;
      }

      gift.on('pointerover', function () {
        if (!api.playable() || opened) return;
        Island.sfx.hover('gift');
        gift.setScale(gift._bsx * 1.06, gift._bsy * 1.06);
      });
      gift.on('pointerout', function () { if (!opened) gift.setScale(gift._bsx, gift._bsy); });
      gift.on('pointerdown', function () {
        if (!api.playable() || opened) return;
        Island.sfx.play('press');
        gift.setScale(gift._bsx * 0.92, gift._bsy * 0.92);
      });
      gift.on('pointerup', function (p) {
        if (!api.playable() || opened) return;
        gift.setScale(gift._bsx, gift._bsy);
        Island.sfx.play('click');
        Island.fx.ring(scene, p.worldX, p.worldY);
        var now = scene.time.now;
        if (last !== null && now - last < cfg.tuning.dblMs) {
          if (wait) wait.remove();
          last = null;
          openGift();
          return;
        }
        last = now;
        gift.setTint(0xBFE6CF);
        if (!Island.MOTION.calm) {
          scene.tweens.add({ targets: gift, angle: 7, yoyo: true, repeat: 2, duration: 55 });
        }
        wait = scene.time.delayedCall(cfg.tuning.dblMs, function () {
          if (!opened && api.playable()) api.miss(cfg.bubbles.single);
        });
      });

      armStars();
      api.intro(stars);

      this._tick = function (time) {
        stars.forEach(function (s, i) {
          if (!s.lit) s.y = s.baseY + Math.sin(time / 420 + i) * 8;
        });
      };
    },
    update: function (time) { if (this._tick) this._tick(time); },
    destroy: function () {}
  };
})();
