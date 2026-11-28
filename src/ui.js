/* 软糖界面：九宫格按钮、任务牌、气泡、星豆。按下立刻有反馈。 */
(function () {
  'use strict';
  var Island = window.Island;

  function can(states) {
    if (!states || !states.length) return true;
    return states.indexOf(Island.state) >= 0;
  }

  function markInput() {
    if (Island.DEBUG) Island._inAt = performance.now();
  }

  function markVisual() {
    if (Island.DEBUG && Island._inAt) {
      var t0 = Island._inAt;
      Island._inAt = 0;
      requestAnimationFrame(function () {
        console.log('pointerdown → 视觉 ' + (performance.now() - t0).toFixed(1) + 'ms');
      });
    }
  }

  function slice(scene, key, x, y, w, h, inset) {
    var s = scene.add.nineslice(x, y, key, null, Math.max(inset * 4, w * 2), Math.max(inset * 4, h * 2), inset * 2, inset * 2, inset * 2, inset * 2);
    s.setScale(0.5);
    return s;
  }

  function hand(obj, scene, states, onClick, home) {
    obj.setHomePosition = function (x, y) {
      home.x = x;
      home.y = y;
      obj.setPosition(x, y);
    };
    obj.setInteractive({
      hitArea: Island.hit.rect(obj, obj.width, obj.height),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true
    });
    obj.on('pointerover', function () {
      if (!can(states)) return;
      Island.sfx.hover(obj._key || 'ui');
      if (!Island.MOTION.calm) {
        obj.y = home.y - 4;
        obj.setScale(1.04);
      }
    });
    obj.on('pointerout', function () {
      obj.y = home.y;
      obj.setScale(1);
    });
    obj.on('pointerdown', function () {
      if (!can(states)) return;
      markInput();
      Island.sfx.play('press');
      obj.y = home.y + 5;
      obj.setScale(0.98);
      obj._down = true;
      markVisual();
    });
    obj.on('pointerup', function (p) {
      if (!obj._down) return;
      obj._down = false;
      obj.y = home.y;
      obj.setScale(1);
      if (!can(states)) return;
      Island.sfx.play('click');
      Island.fx.ring(scene, p.worldX, p.worldY);
      Island.fx.sparks(scene, p.worldX, p.worldY, 4);
      if (onClick) onClick();
    });
  }

  Island.ui = {
    slice: slice,

    stage: function (scene) {
      var zone = scene.add.zone(Island.DESIGN.w / 2, Island.DESIGN.h / 2, Island.DESIGN.w, Island.DESIGN.h).setDepth(-100);
      zone.setInteractive({ useHandCursor: false });
      zone.on('pointerdown', function (p) {
        if (Island.state !== 'PLAY' && Island.state !== 'IDLE') return;
        markInput();
        Island.sfx.play('press');
        markVisual();
        Island.fx.ring(scene, p.worldX, p.worldY);
      });
      scene.backZone = zone;
      scene.hud = scene.add.container(0, 0).setDepth(1000);
      scene.hudNudge = 0;
      scene.flash = scene.add.rectangle(Island.DESIGN.w / 2, Island.DESIGN.h / 2, 1800, 1200, 0xFFF4E0, 1);
      scene.flash.setDepth(3000);
      scene.flash.setAlpha(0);
    },

    button: function (scene, x, y, w, h, label, onClick, opt) {
      opt = opt || {};
      var secondary = opt.kind === 'secondary' || (opt.face != null && opt.face !== 0xF08A24);
      var key = secondary ? 'ui-btn-secondary' : 'ui-btn-primary';
      var c = scene.add.container(x, y);
      var face = slice(scene, key, 0, 0, w, h || (secondary ? 60 : 72), secondary ? 36 : 46);
      var text = scene.add.text(0, -2, label, Island.style(opt.font || (secondary ? 26 : 32), secondary ? '#4A3222' : '#FFF8EE')).setOrigin(0.5);
      if (!secondary) text.setShadow(0, 2, '#C46A12', 0, true, true);
      c.add([face, text]);
      c.setSize(w, (h || 72) + 8);
      c._key = label;
      hand(c, scene, opt.states, onClick, { x: x, y: y });
      c.setLabel = function (s) { text.setText(s); };
      return c;
    },

    round: function (scene, x, y, kind, onClick, opt) {
      opt = opt || {};
      var c = scene.add.container(x, y);
      var plateKey = kind === 'hint' ? 'ui-ibtn-hint' : 'ui-ibtn-cream';
      var plate = scene.add.image(0, 2, plateKey).setDisplaySize(84, 84);
      var iconName = kind === 'hint' ? 'icon-bulb' : kind === 'back' ? 'icon-back' : kind === 'plus' ? 'icon-plus' : kind === 'minus' ? 'icon-minus' : 'icon-speaker';
      var icon = scene.add.image(0, -2, iconName).setDisplaySize(36, 36);
      c.add([plate, icon]);
      c.setSize(64, 70);
      c._key = kind;
      hand(c, scene, opt.states, onClick, { x: x, y: y });
      c.setMutedIcon = function (muted) {
        if (kind !== 'speaker') return;
        icon.setTexture(muted ? 'icon-speaker_off' : 'icon-speaker');
      };
      return c;
    },

    task: function (scene) {
      var c = scene.add.container(640, 78);
      var bar = scene.add.image(0, -52, 'ui-task-bar').setDisplaySize(360, 18);
      var ropeL = scene.add.rectangle(-78, -36, 3, 16, 0xD9C29A);
      var ropeR = scene.add.rectangle(78, -36, 3, 16, 0xD9C29A);
      var plate = slice(scene, 'ui-task-plate-9slice', 0, 0, 360, 74, 40);
      var text = scene.add.text(0, 0, '', Island.style(34)).setOrigin(0.5);
      var tick = scene.add.image(-150, 0, 'icon-check').setDisplaySize(28, 28).setVisible(false);
      c.add([bar, ropeL, ropeR, plate, tick, text]);
      c.setSize(420, 90);
      c.setText = function (s) {
        text.setText(s);
        tick.setVisible(false);
        var w = Math.max(300, Math.min(640, text.width + 96));
        plate.setSize(w * 2, 148);
        plate.setScale(0.5);
        bar.setDisplaySize(Math.max(280, w * 0.72), 18);
        ropeL.x = -w * 0.22;
        ropeR.x = w * 0.22;
        tick.x = -w / 2 + 36;
      };
      c.bump = function () {
        tick.setVisible(true);
        if (Island.MOTION.calm) return;
        c.setScale(1.06);
        Island.fx.tween(scene, c, { scaleX: 1, scaleY: 1 }, { dur: 200, ease: 'Back.easeOut' });
      };
      return c;
    },

    beads: function (scene, n) {
      var c = scene.add.container(104, 52);
      var groove = slice(scene, 'ui-groove-9slice', 70, 0, 168, 56, 28);
      var dots = [];
      for (var i = 0; i < n; i++) {
        var d = scene.add.image(0, 0, 'ui-bead-todo').setDisplaySize(34, 34);
        dots.push(d);
      }
      var num = scene.add.text(0, 0, '1/' + n, Island.style(22, '#8C6950')).setOrigin(0, 0.5);
      c.add([groove].concat(dots).concat([num]));
      function layout(index) {
        var gap = 42;
        var left = 16;
        for (var i = 0; i < dots.length; i++) {
          dots[i].setTexture(i < index ? 'ui-bead-done' : i === index ? 'ui-bead-cur' : 'ui-bead-todo');
          dots[i].setDisplaySize(i < index ? 36 : 34, i < index ? 36 : 34);
          dots[i].x = left + i * gap;
        }
        num.x = left + dots.length * gap + 4;
        num.setText((Math.min(index, n - 1) + 1) + '/' + n);
        var w = num.x + num.width + 18;
        groove.setPosition(w / 2, 0);
        groove.setSize(w * 2, 112);
        groove.setScale(0.5);
      }
      c.setIndex = function (i) { layout(i); };
      layout(0);
      return c;
    },

    beans: function (scene, x, y) {
      var c = scene.add.container(x, y);
      var plate = slice(scene, 'ui-pill-bean-9slice', 0, 0, 132, 64, 32);
      var icon = scene.add.image(-36, -2, 'icon-bean').setDisplaySize(40, 40);
      var text = scene.add.text(8, -2, '0', Island.style(30)).setOrigin(0, 0.5);
      c.add([plate, icon, text]);
      c.setSize(140, 70);
      c.setCount = function (n) {
        text.setText(String(n));
        var w = Math.max(120, text.width + 96);
        plate.setSize(w * 2, 128);
        plate.setScale(0.5);
        icon.x = -w / 2 + 28;
        text.x = icon.x + 28;
        c.setSize(w, 70);
      };
      c.bump = function () {
        if (Island.MOTION.calm) return;
        c.setScale(1.18);
        Island.fx.tween(scene, c, { scaleX: 1, scaleY: 1 }, { dur: 160, ease: 'Back.easeOut' });
      };
      return c;
    },

    stars: function (scene, x, y) {
      return Island.ui.beans(scene, x, y);
    },

    tag: function (scene, x, y, label, kind, iconName) {
      kind = kind || 'peach';
      var key = 'ui-tag-' + (kind === 'file' ? 'cream' : kind) + '-9slice';
      if (!scene.textures.exists(key)) key = 'ui-tag-cream-9slice';
      var c = scene.add.container(x, y);
      var h = kind === 'file' ? 38 : 44;
      var plate = slice(scene, key, 0, 0, 120, h, 22);
      var bits = [plate];
      var tx = 0;
      if (iconName) {
        var ic = scene.add.image(-30, 0, iconName).setDisplaySize(26, 26);
        bits.push(ic);
        tx = 12;
      }
      var font = kind === 'file' ? 20 : 24;
      var color = kind === 'cool' ? '#1F4F63' : kind === 'mint' ? '#2F6B4C' : '#4A3222';
      var text = scene.add.text(tx, 0, label, kind === 'file' ? Island.bodyStyle(font, color) : Island.style(font, color)).setOrigin(0.5);
      bits.push(text);
      c.add(bits);
      var w = Math.max(88, text.width + (iconName ? 70 : 40));
      plate.setSize(w * 2, h * 2);
      plate.setScale(0.5);
      if (iconName) bits[1].x = -w / 2 + 24;
      text.x = iconName ? 10 : 0;
      c.setSize(w, h);
      return c;
    },

    nametag: function (scene, x, y, label, kind) {
      kind = kind || 'peach';
      var key = kind === 'dim' ? 'ui-nametag-dim-9slice' : kind === 'mint' ? 'ui-nametag-mint-9slice' : 'ui-nametag-peach-9slice';
      var c = scene.add.container(x, y);
      var plate = slice(scene, key, 0, 0, 150, 46, 24);
      var color = kind === 'dim' ? '#8C6950' : kind === 'mint' ? '#2F6B4C' : '#4A3222';
      var text = scene.add.text(0, -1, label, Island.style(24, color)).setOrigin(0.5);
      c.add([plate, text]);
      var w = Math.max(120, text.width + 36);
      plate.setSize(w * 2, 92);
      plate.setScale(0.5);
      c.setSize(w, 46);
      c.setKind = function (next, nextLabel) {
        var k = next === 'dim' ? 'ui-nametag-dim-9slice' : next === 'mint' ? 'ui-nametag-mint-9slice' : 'ui-nametag-peach-9slice';
        plate.setTexture(k);
        text.setColor(next === 'dim' ? '#8C6950' : next === 'mint' ? '#2F6B4C' : '#4A3222');
        if (nextLabel) text.setText(nextLabel);
      };
      return c;
    },

    panel: function (scene, x, y, w, h) {
      return slice(scene, 'ui-panel-9slice', x, y, w, h, 48);
    },

    bubble: function (scene, text, hint) {
      var c = scene.add.container(0, 0);
      var key = hint ? 'ui-bubble-hint-9slice' : 'ui-bubble-cream-9slice';
      var tailKey = hint ? 'ui-bubble-tail-hint' : 'ui-bubble-tail-cream';
      var plate = slice(scene, key, 0, 0, 220, 76, 36);
      var bits = [plate];
      var tx = 0;
      if (hint) {
        bits.push(scene.add.image(-70, 0, 'icon-bulb').setDisplaySize(36, 36));
        tx = 16;
      }
      var label = scene.add.text(tx, 0, text, Island.bodyStyle(28)).setOrigin(0.5);
      var tail = scene.add.image(0, 48, tailKey).setDisplaySize(32, 26);
      bits.push(label, tail);
      c.add(bits);
      var w = Math.max(160, label.width + (hint ? 100 : 64));
      plate.setSize(w * 2, 152);
      plate.setScale(0.5);
      if (hint) bits[1].x = -w / 2 + 32;
      label.x = hint ? 14 : 0;
      c.setSize(w, 90);
      c.setScale(0);
      return c;
    },

    concept: function (scene, cfg, stars, onContinue, onReplay) {
      var root = scene.add.container(700, 410).setDepth(1100);
      var scrim = scene.add.rectangle(-60, -10, 1800, 1200, 0x1E2A44, 0.45);
      var panel = slice(scene, 'ui-panel-9slice', 0, 20, 600, 500, 48);
      var tag = Island.ui.nametag(scene, 0, -230, cfg.name + ' · 过关', 'mint');
      var slots = [];
      for (var i = 0; i < 3; i++) {
        var earned = i < stars;
        var h = i === 1 ? 132 : 110;
        var star = scene.add.image((i - 1) * 120, -120 + (i === 1 ? -16 : 0), earned ? 'prop-star-lit' : 'prop-star-dim');
        star.setDisplaySize(h, h * 0.96);
        star._earned = earned;
        slots.push(star);
      }
      var title = scene.add.text(0, 20, cfg.concept.name, Island.style(52)).setOrigin(0.5);
      var line = scene.add.text(0, 86, cfg.concept.line, Island.bodyStyle(28, '#8C6950')).setOrigin(0.5);
      var pill = Island.ui.beans(scene, 0, 156);
      pill.setCount('+' + stars);
      var beanLabel = scene.add.text(28, 156, '星豆', Island.style(26)).setOrigin(0, 0.5);
      var again = Island.ui.button(scene, -110, 240, 180, 60, '再玩一次', onReplay, { kind: 'secondary', states: ['MODAL'] });
      var next = Island.ui.button(scene, 120, 246, 200, 72, '回小岛', onContinue, { states: ['MODAL'] });
      root.add([scrim, panel, tag, title, line, pill, beanLabel, again, next].concat(slots));
      if (!Island.MOTION.calm) {
        root.setScale(0.6);
        Island.fx.tween(scene, root, { scaleX: 1, scaleY: 1 }, { dur: 420, ease: 'Back.easeOut' });
      }
      scene.hud.add(root);
      return { root: root, slots: slots };
    },

    decor: function (scene, obj, states) {
      if (!obj || !obj.setInteractive) return;
      obj.setInteractive({ useHandCursor: true });
      obj.on('pointerdown', function () {
        if (states && states.indexOf(Island.state) < 0) return;
        Island.sfx.play('press');
        if (!Island.MOTION.calm) {
          var s = obj.scaleX || 1;
          obj.setScale(s * 1.06);
          scene.tweens.add({ targets: obj, scaleX: s, scaleY: s, duration: 140, ease: 'Back.easeOut' });
        }
      });
    },

    wood: function () {}
  };
})();
