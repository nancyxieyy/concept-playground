/* 木牌、圆按钮、气泡和概念卡。画面上的字都从这里出来。 */
(function () {
  'use strict';
  var Island = window.Island;
  var P = Island.PAL;

  function wood(g, x, y, w, h, fill, deep, radius) {
    var r = radius == null ? 16 : radius;
    g.fillStyle(deep, 1);
    g.fillRoundedRect(x, y + 6, w, h, r);
    g.fillStyle(fill, 1);
    g.fillRoundedRect(x, y, w, h, r);
    g.lineStyle(4, P.ink, 1);
    g.strokeRoundedRect(x, y, w, h, r);
    g.fillStyle(0xffffff, 0.22);
    g.fillRoundedRect(x + 10, y + 6, Math.max(12, w * 0.38), Math.max(8, h * 0.22), 8);
  }

  function markInput() {
    if (!Island.DEBUG) return;
    Island._inAt = performance.now();
  }
  function markVisual() {
    if (!Island.DEBUG || !Island._inAt) return;
    var t0 = Island._inAt;
    Island._inAt = 0;
    requestAnimationFrame(function () {
      console.log('pointerdown → 视觉 ' + (performance.now() - t0).toFixed(1) + 'ms');
    });
  }

  function can(states) {
    if (Island.state === 'TRANSITION') return false;
    if (!states) return Island.state === 'IDLE' || Island.state === 'PLAY' || Island.state === 'MODAL';
    return states.indexOf(Island.state) >= 0;
  }

  function bindPress(scene, obj, opt) {
    var restX = obj.scaleX || 1;
    var restY = obj.scaleY || 1;
    var lift = opt.lift !== false;
    obj._restY = obj.y;
    obj.on('pointerover', function () {
      if (!can(opt.states)) return;
      Island.sfx.hover(opt.key || obj.name || 'ui');
      markVisual();
      var s = Island.MOTION.calm ? 1.03 : 1.06;
      obj.setScale(restX * s, restY * s);
      if (lift && !Island.MOTION.calm) obj.y = obj._restY - 4;
    });
    obj.on('pointerout', function () {
      obj.setScale(restX, restY);
      if (lift) obj.y = obj._restY;
    });
    obj.on('pointerdown', function (pointer) {
      if (!can(opt.states)) return;
      markInput();
      Island.sfx.play('press');
      obj.setScale(restX * 0.92, restY * 0.92);
      if (lift) obj.y = obj._restY + 4;
      markVisual();
      obj._pressed = true;
      obj._px = pointer.worldX;
      obj._py = pointer.worldY;
    });
    obj.on('pointerup', function (pointer) {
      if (!obj._pressed) return;
      obj._pressed = false;
      if (!can(opt.states)) {
        obj.setScale(restX, restY);
        obj.y = obj._restY;
        return;
      }
      Island.sfx.play('click');
      Island.fx.ring(scene, pointer.worldX, pointer.worldY);
      Island.fx.sparks(scene, pointer.worldX, pointer.worldY, 5);
      obj.y = obj._restY;
      if (Island.MOTION.calm) obj.setScale(restX, restY);
      else {
        obj.setScale(restX * 1.08, restY * 1.08);
        Island.fx.tween(scene, obj, { scaleX: restX, scaleY: restY }, { dur: 180, ease: 'Back.easeOut' });
      }
      if (opt.onClick) opt.onClick(pointer);
    });
  }

  function roundIcon(g, kind, muted) {
    g.clear();
    if (kind === 'home') {
      g.fillStyle(P.cream, 1);
      g.fillTriangle(0, -16, -16, 0, 16, 0);
      g.lineStyle(3, P.ink, 1);
      g.strokeTriangle(0, -16, -16, 0, 16, 0);
      g.fillStyle(P.cream, 1);
      g.fillRoundedRect(-11, -2, 22, 16, 3);
      g.lineStyle(3, P.ink, 1);
      g.strokeRoundedRect(-11, -2, 22, 16, 3);
    } else if (kind === 'hint') {
      g.fillStyle(P.star, 1);
      g.fillCircle(0, -4, 12);
      g.lineStyle(3, P.ink, 1);
      g.strokeCircle(0, -4, 12);
      g.fillStyle(P.ink, 1);
      g.fillRoundedRect(-4, 8, 8, 6, 2);
      g.fillStyle(P.cream, 1);
      g.fillCircle(-4, -8, 3);
    } else {
      g.fillStyle(P.cream, 1);
      g.fillRoundedRect(-14, -8, 10, 16, 2);
      g.fillTriangle(-4, -8, -4, 8, 12, 14);
      g.fillTriangle(-4, -8, -4, 8, 12, -14);
      g.lineStyle(3, P.ink, 1);
      g.strokeRoundedRect(-14, -8, 10, 16, 2);
      if (muted) {
        g.lineStyle(4, P.ink, 1);
        g.beginPath();
        g.moveTo(-12, -12);
        g.lineTo(14, 14);
        g.strokePath();
      }
    }
  }

  Island.ui = {
    wood: wood,

    stage: function (scene) {
      scene.hud = scene.add.container(0, 0);
      scene.hud.setDepth(1000);
      scene.hudNudge = 0;
      scene.flash = scene.add.rectangle(640, 360, 1280, 720, P.cream, 1);
      scene.flash.setDepth(3000);
      scene.flash.setAlpha(0);
      var zone = scene.add.zone(640, 360, 4200, 2800);
      zone.setDepth(-100);
      zone.setInteractive();
      zone.on('pointerdown', function (p) {
        if (Island.state !== 'IDLE' && Island.state !== 'PLAY') return;
        Island.sfx.play('press');
        Island.fx.ring(scene, p.worldX, p.worldY);
      });
      scene.backZone = zone;
    },

    button: function (scene, x, y, w, h, label, onClick, opt) {
      opt = opt || {};
      var face = opt.face == null ? P.orange : opt.face;
      var deep = opt.deep == null ? P.orangeDeep : opt.deep;
      var hot = opt.hot == null ? P.orangeHot : opt.hot;
      var c = scene.add.container(x, y);
      var g = scene.add.graphics();
      var text = scene.add.text(0, -2, label, Island.style(opt.font || 30, '#FFF4E0')).setOrigin(0.5);
      c.add([g, text]);
      function paint(fill, pressed) {
        g.clear();
        var r = 16;
        if (!pressed) {
          g.fillStyle(deep, 1);
          g.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, r);
        }
        var oy = pressed ? 4 : 0;
        g.fillStyle(fill, 1);
        g.fillRoundedRect(-w / 2, -h / 2 + oy, w, h, r);
        g.lineStyle(4, P.ink, 1);
        g.strokeRoundedRect(-w / 2, -h / 2 + oy, w, h, r);
        g.fillStyle(0xffffff, 0.24);
        g.fillRoundedRect(-w / 2 + 12, -h / 2 + 8 + oy, Math.min(80, w * 0.36), 12, 6);
      }
      paint(face, false);
      c.setSize(w, h + 6);
      c.setInteractive({
        hitArea: Island.hit.rect(c, w, h + 8),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true
      });
      c.on('pointerover', function () {
        if (!can(opt.states)) return;
        Island.sfx.hover(label);
        paint(hot, false);
        if (!Island.MOTION.calm) c.y = y - 4;
        c.setScale(Island.MOTION.calm ? 1.02 : 1.06);
      });
      c.on('pointerout', function () {
        paint(face, false);
        c.y = y;
        c.setScale(1);
      });
      c.on('pointerdown', function () {
        if (!can(opt.states)) return;
        markInput();
        Island.sfx.play('press');
        paint(face, true);
        c.setScale(0.92);
        c.y = y + 2;
        markVisual();
        c._down = true;
      });
      c.on('pointerup', function (pointer) {
        if (!c._down) return;
        c._down = false;
        paint(face, false);
        c.y = y;
        c.setScale(1);
        if (!can(opt.states)) return;
        Island.sfx.play('click');
        Island.fx.ring(scene, pointer.worldX, pointer.worldY);
        Island.fx.sparks(scene, pointer.worldX, pointer.worldY, 4);
        if (!Island.MOTION.calm) {
          c.setScale(1.08);
          Island.fx.tween(scene, c, { scaleX: 1, scaleY: 1 }, { dur: 180, ease: 'Back.easeOut' });
        }
        if (onClick) onClick();
      });
      c.setLabel = function (s) { text.setText(s); };
      return c;
    },

    round: function (scene, x, y, kind, onClick, opt) {
      opt = opt || {};
      var c = scene.add.container(x, y);
      var shadow = scene.add.ellipse(0, 8, 52, 16, P.ink, 0.25);
      var disc = scene.add.circle(0, 0, 32, P.wood);
      disc.setStrokeStyle(4, P.ink);
      var icon = scene.add.graphics();
      c.add([shadow, disc, icon]);
      c._muted = false;
      function paint() { roundIcon(icon, kind, c._muted); }
      paint();
      c.setSize(64, 64);
      c.setInteractive({
        hitArea: Island.hit.circle(c, 34),
        hitAreaCallback: Phaser.Geom.Circle.Contains,
        useHandCursor: true
      });
      bindPress(scene, c, {
        states: opt.states,
        key: kind,
        onClick: function () { if (onClick) onClick(c); }
      });
      c.setMutedIcon = function (m) { c._muted = !!m; paint(); };
      c.disc = disc;
      return c;
    },

    task: function (scene, x, y) {
      var c = scene.add.container(x, y);
      var g = scene.add.graphics();
      var t = scene.add.text(0, -2, '', Island.style(30)).setOrigin(0.5);
      var mark = scene.add.text(0, -2, '✓', Island.style(28, '#FFF4E0')).setOrigin(0.5);
      mark.setVisible(false);
      c.add([g, t, mark]);
      c.setText = function (text) {
        Island.assertCopy('任务', text, 15);
        t.setText(text);
        mark.setVisible(false);
        t.setVisible(true);
        var w = Math.min(640, Math.max(240, t.width + 72));
        g.clear();
        wood(g, -w / 2, -32, w, 64, P.wood, P.woodDeep, 16);
        c._w = w;
      };
      c.bump = function () {
        if (Island.MOTION.calm) return;
        c.setScale(1.08);
        Island.fx.tween(scene, c, { scaleX: 1, scaleY: 1 }, { dur: 200, ease: 'Back.easeOut' });
      };
      return c;
    },

    bubble: function (scene) {
      var c = scene.add.container(0, 0);
      c.setDepth(60);
      var g = scene.add.graphics();
      var t = scene.add.text(0, -6, '', Island.style(26, P.inkCss, false)).setOrigin(0.5);
      c.add([g, t]);
      c.setScale(0);
      c.setVisible(false);
      var timer = null;
      function paint(tone) {
        var w = Math.min(360, Math.max(96, t.width + 36));
        var h = 58;
        var fill = tone === 'hint' || tone === 'ask' ? P.hint : P.cream;
        g.clear();
        g.fillStyle(fill, 1);
        g.fillRoundedRect(-w / 2, -h / 2 - 4, w, h, 16);
        g.lineStyle(4, P.ink, 1);
        g.strokeRoundedRect(-w / 2, -h / 2 - 4, w, h, 16);
        g.fillStyle(fill, 1);
        g.fillTriangle(-10, h / 2 - 8, 10, h / 2 - 8, 0, h / 2 + 10);
        g.lineStyle(4, P.ink, 1);
        g.strokeTriangle(-10, h / 2 - 8, 10, h / 2 - 8, 0, h / 2 + 10);
      }
      c.show = function (x, y, text, tone, hold) {
        Island.assertCopy('气泡', text, 12);
        t.setText(text);
        paint(tone || 'talk');
        c.setPosition(x, y);
        c.setVisible(true);
        c.setScale(Island.MOTION.calm ? 1 : 0);
        if (!Island.MOTION.calm) {
          Island.fx.tween(scene, c, { scaleX: 1, scaleY: 1 }, { dur: 200, ease: 'Back.easeOut' });
        }
        if (timer) timer.remove();
        timer = scene.time.delayedCall(hold || 1600, function () { c.hide(); });
      };
      c.hide = function () {
        if (!c.visible) return;
        if (Island.MOTION.calm) { c.setVisible(false); return; }
        Island.fx.tween(scene, c, { scaleX: 0, scaleY: 0 }, {
          dur: 140,
          ease: 'Quad.easeIn',
          onComplete: function () { c.setVisible(false); }
        });
      };
      return c;
    },

    stars: function (scene, x, y) {
      var c = scene.add.container(x, y);
      var icon = scene.add.image(-28, 0, 'fx-star').setScale(0.55);
      var t = scene.add.text(8, 0, '0', Island.style(32)).setOrigin(0, 0.5);
      c.add([icon, t]);
      c.setCount = function (n) { t.setText(String(n)); };
      c.bump = function () {
        Island.sfx.play('starIn');
        if (Island.MOTION.calm) return;
        c.setScale(1.25);
        Island.fx.tween(scene, c, { scaleX: 1, scaleY: 1 }, { dur: 160, ease: 'Back.easeOut' });
      };
      return c;
    },

    concept: function (scene, cfg, count, onContinue) {
      var root = scene.add.container(640, 340);
      root.setScale(0.6);
      root.setAlpha(0);
      var g = scene.add.graphics();
      wood(g, -300, -210, 600, 400, P.cream, P.wood, 24);
      var title = scene.add.text(0, -140, cfg.concept.name, Island.style(44, P.inkCss, false)).setOrigin(0.5);
      var line = scene.add.text(0, -70, cfg.concept.line, Island.style(26, P.inkCss, false)).setOrigin(0.5);
      Island.assertCopy('概念', cfg.concept.line, 20);
      root.add([g, title, line]);
      var slots = [];
      var total = Math.max(1, Math.min(3, count));
      for (var i = 0; i < total; i++) {
        var sx = (i - (total - 1) / 2) * 78;
        var star = scene.add.image(sx, 20, 'fx-star');
        star.setScale(0);
        root.add(star);
        slots.push(star);
      }
      var btn = Island.ui.button(scene, 0, 130, 240, 72, '回小岛', onContinue, { states: ['MODAL'] });
      root.add(btn);
      scene.hud.add(root);
      Island.fx.tween(scene, root, { alpha: 1, scaleX: 1, scaleY: 1 }, { dur: 420, ease: 'Back.easeOut' });
      slots.forEach(function (star, i) {
        scene.time.delayedCall(Island.MOTION.calm ? 40 : 280 + i * 300, function () {
          if (!alive(scene)) return;
          Island.sfx.play('star', i);
          if (Island.MOTION.calm) { star.setScale(0.8); return; }
          star.setScale(1.3, 0.6);
          Island.fx.tween(scene, star, { scaleX: 0.82, scaleY: 0.82 }, { dur: 220, ease: 'Back.easeOut' });
        });
      });
      return { root: root, slots: slots };
    },

    decor: function (scene, obj, states) {
      obj.setInteractive({ useHandCursor: true });
      var sx = obj.scaleX || 1;
      var sy = obj.scaleY || 1;
      obj.on('pointerover', function () {
        if (!can(states || ['IDLE', 'PLAY'])) return;
        Island.sfx.hover('decor' + obj.x);
        obj.setScale(sx * (Island.MOTION.calm ? 1.03 : 1.06));
      });
      obj.on('pointerout', function () { obj.setScale(sx, sy); });
      obj.on('pointerdown', function (p) {
        if (!can(states || ['IDLE', 'PLAY'])) return;
        markInput();
        Island.sfx.play('press');
        obj.setScale(sx * 0.92, sy * 0.92);
        markVisual();
        Island.fx.ring(scene, p.worldX, p.worldY);
      });
      obj.on('pointerup', function () {
        obj.setScale(sx, sy);
        if (!can(states || ['IDLE', 'PLAY'])) return;
        Island.sfx.play('click');
        if (!Island.MOTION.calm) {
          var a = obj.angle || 0;
          Island.fx.tween(scene, obj, { angle: a + 8 }, {
            dur: 90, yoyo: true, onComplete: function () { obj.angle = a; }
          });
        }
      });
    }
  };

  function alive(scene) {
    return !!(scene && scene.sys && scene.sys.isActive());
  }
})();
