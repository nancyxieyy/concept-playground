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

    // 所有胶囊以可见表面计尺寸，避免切图透明留白被九宫格拉伸。
    pill: function (scene, x, y, w, h, opt) {
      opt = opt || {};
      var g = scene.add.graphics({ x: x, y: y });
      g.resize = function (width, height) {
        w = width; h = height;
        var r = h / 2;
        g.clear();
        g.fillStyle(0xB8683C, 0.10);
        g.fillRoundedRect(-w / 2 - 2, -h / 2 + 5, w + 4, h + 4, r);
        g.fillStyle(opt.shadow == null ? 0xEFA98A : opt.shadow, 1);
        g.fillRoundedRect(-w / 2, -h / 2 + (opt.soft ? 2 : 5), w, h, r);
        g.fillStyle(0xFFFFFF, 1);
        g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
        g.fillStyle(opt.fill == null ? 0xFFF8EE : opt.fill, 1);
        g.fillRoundedRect(-w / 2 + 1, -h / 2 + 4, w - 2, h - 4, r - 1);
        if (opt.stitch) {
          // 沿内缩胶囊等距走线，圆头也保持 7/6 的虚线节奏。
          var sr = r - 10, straight = w - h;
          var perimeter = 2 * straight + 2 * Math.PI * sr;
          function point(d) {
            if (d < straight) return { x: -straight / 2 + d, y: -sr };
            d -= straight;
            if (d < Math.PI * sr) {
              var a = d / sr - Math.PI / 2;
              return { x: straight / 2 + Math.cos(a) * sr, y: Math.sin(a) * sr };
            }
            d -= Math.PI * sr;
            if (d < straight) return { x: straight / 2 - d, y: sr };
            var a = (d - straight) / sr + Math.PI / 2;
            return { x: -straight / 2 + Math.cos(a) * sr, y: Math.sin(a) * sr };
          }
          g.lineStyle(2, 0xF0C9AE, 1);
          for (var d = 0; d < perimeter; d += 13) {
            var from = point(d), to = point(Math.min(d + 7, perimeter));
            g.lineBetween(from.x, from.y, to.x, to.y);
          }
        }
        g.width = w; g.height = h;
        return g;
      };
      return g.resize(w, h);
    },

    label: function (scene, x, y, text, opt) {
      opt = opt || {};
      var style = opt.body ? Island.bodyStyle : Island.style;
      return scene.add.text(x, y, text, style(Math.max(20, opt.font || 24), opt.color)).setOrigin(0.5);
    },

    taskPlate: function (scene) {
      var c = scene.add.container(640, 88);
      var bar = scene.add.image(0, -60, 'ui-task-bar').setDisplaySize(300, 18);
      var ropeL = scene.add.rectangle(-78, -46, 3, 16, 0xD9C29A);
      var ropeR = scene.add.rectangle(78, -46, 3, 16, 0xD9C29A);
      var plate = Island.ui.pill(scene, 0, 0, 360, 74, { stitch: true, soft: true });
      var text = Island.ui.label(scene, 0, 0, '', { font: 34 });
      var tick = scene.add.image(-150, 0, 'icon-check').setDisplaySize(28, 28).setVisible(false);
      c.add([bar, ropeL, ropeR, plate, tick, text]);
      c.setText = function (s) {
        text.setText(Island.ui.instruction(s));
        tick.setVisible(false);
        var w = Math.max(300, text.width + 80);
        plate.resize(w, 74);
        bar.setDisplaySize(w, 18);
        ropeL.x = -w * 0.28; ropeR.x = w * 0.28;
        tick.x = -w / 2 + 22;
        c.setSize(w, 134);
      };
      c.bump = function () {
        tick.setVisible(true);
        if (Island.MOTION.calm) return;
        c.setScale(1.06);
        Island.fx.tween(scene, c, { scaleX: 1, scaleY: 1 }, { dur: 200, ease: 'Back.easeOut' });
      };
      return c;
    },
    task: function (scene) { return Island.ui.taskPlate(scene); },
    instruction: function (text) { return String(text).replace(/\.(?:png|mp3|txt|html)\b/gi, ''); },

    beadTrack: function (scene, n) {
      var c = scene.add.container(104, 52);
      var groove = Island.ui.pill(scene, 0, 0, 194, 56, { soft: true, shadow: 0xE8DCCB });
      var dots = [];
      for (var i = 0; i < n; i++) dots.push(scene.add.graphics({ x: 36 + i * 42, y: 0 }));
      var num = Island.ui.label(scene, 0, 0, '1/' + n, { font: 24, color: '#8C6950' }).setOrigin(0, 0.5);
      c.add([groove].concat(dots, [num]));
      c.setIndex = function (index) {
        dots.forEach(function (d, i) {
          d.clear();
          d.fillStyle(i < index ? 0xBFE6CF : i === index ? 0xDDF0F7 : 0xD6C3AC, 1);
          d.fillCircle(0, 0, 17);
          if (i > index) { d.fillStyle(0xE8DCCB, 1); d.fillCircle(0, 2, 15); }
          if (i <= index) {
            d.lineStyle(i === index ? 4 : 3, i === index ? 0x6FB7D6 : 0xFFFFFF, 1);
            d.strokeCircle(0, 0, 16);
          }
        });
        num.setText((Math.min(index, n - 1) + 1) + '/' + n);
        num.x = 36 + (n - 1) * 42 + 32;
        var w = num.x + num.width + 18;
        groove.x = w / 2;
        groove.resize(w, 56);
        c.setSize(w, 56);
      };
      c.setIndex(0);
      return c;
    },
    beads: function (scene, n) { return Island.ui.beadTrack(scene, n); },

    beanPill: function (scene, x, y, opt) {
      opt = opt || {};
      var c = scene.add.container(x, y);
      var h = opt.label ? 52 : 64;
      var plate = Island.ui.pill(scene, 0, 0, 100, h, { shadow: 0xD9A93E });
      var icon = scene.add.image(0, 0, 'icon-bean').setDisplaySize(32, 32);
      var text = Island.ui.label(scene, 0, 0, '', { font: opt.label ? 26 : 32 }).setOrigin(0, 0.5);
      c.add([plate, icon, text]);
      var edge = null;
      c.alignLeft = function (left) { edge = { left: left }; c.x = left + c.width / 2; };
      c.alignRight = function (right) { edge = { right: right }; c.x = right - c.width / 2; };
      c.setCount = function (n) {
        text.setText(String(n) + (opt.label ? ' 星豆' : ''));
        var w = Math.max(100, text.width + 76);
        plate.resize(w, h);
        icon.x = -w / 2 + 30;
        text.x = -w / 2 + 56;
        c.setSize(w, h);
        if (edge && edge.left != null) c.x = edge.left + w / 2;
        if (edge && edge.right != null) c.x = edge.right - w / 2;
      };
      c.bump = function () {
        if (Island.MOTION.calm) return;
        c.setScale(1.18);
        Island.fx.tween(scene, c, { scaleX: 1, scaleY: 1 }, { dur: 160, ease: 'Back.easeOut' });
      };
      c.setCount(0);
      return c;
    },
    beans: function (scene, x, y, opt) { return Island.ui.beanPill(scene, x, y, opt); },
    stars: function (scene, x, y) { return Island.ui.beanPill(scene, x, y); },

    tag: function (scene, x, y, label, kind, iconName, opt) {
      opt = opt || {};
      kind = kind || 'peach';
      var c = scene.add.container(x, y);
      var h = opt.height || (kind === 'file' ? 38 : 46);
      var font = opt.font || (kind === 'file' ? 20 : 24);
      var plate = Island.ui.pill(scene, 0, 0, 120, h, { soft: !opt.raised });
      var text = Island.ui.label(scene, 0, 0, label, { font: font, body: kind === 'file' });
      var icon = iconName ? scene.add.image(0, 0, iconName).setDisplaySize(h > 50 ? 32 : 26, h > 50 ? 32 : 26) : null;
      c.add([plate, text]);
      if (icon) c.add(icon);
      c.setKind = function (next, nextLabel) {
        if (nextLabel != null) text.setText(nextLabel);
        var colors = { peach: 0xFFE3D3, mint: 0xBFE6CF, cool: 0xDDF0F7, dim: 0xE8DCCB, cream: 0xFFF8EE, file: 0xFFF8EE };
        // 重新创建表面参数；文字与图标的内边距由同一处计算。
        var fill = colors[next] == null ? colors.cream : colors[next];
        var w = Math.max(80, text.width + (icon ? 76 : 36));
        var old = plate;
        plate = Island.ui.pill(scene, 0, 0, w, h, { fill: fill, soft: !opt.raised,
          shadow: next === 'mint' ? 0x7DBE9A : next === 'cool' ? 0x6FB7D6 : 0xEFA98A });
        c.addAt(plate, 0); old.destroy();
        text.setColor(next === 'cool' ? '#1F4F63' : next === 'mint' ? '#2F6B4C' : next === 'dim' ? '#8C6950' : '#4A3222');
        text.x = icon ? 20 : 0;
        if (icon) icon.x = -w / 2 + 30;
        c.setSize(w, h);
      };
      c.setKind(kind);
      return c;
    },
    nametag: function (scene, x, y, label, kind, icon, opt) {
      return Island.ui.tag(scene, x, y, label, kind, icon, Object.assign({ raised: true }, opt));
    },

    breadcrumb: function (scene, x, y, names) {
      var c = scene.add.container(x, y);
      var cursor = 0;
      c.cells = names.map(function (name, i) {
        if (i) {
          // 分隔符使用系统字体，避免装饰字体的缺字影响路径辨识。
          var sep = scene.add.text(0, 0, '›', {
            fontFamily: 'Arial, sans-serif', fontSize: '26px', color: '#8C6950'
          }).setOrigin(0.5);
          sep.x = cursor + 12 + sep.width / 2;
          c.add(sep); cursor += sep.width + 24;
        }
        var tag = Island.ui.tag(scene, 0, 0, name, 'cream', i === 0 ? 'icon-house' : null);
        tag.x = cursor + tag.width / 2;
        cursor += tag.width;
        c.add(tag);
        return tag;
      });
      c.setSize(cursor, 46);
      c.setIndex = function (depth) {
        c.cells.forEach(function (cell, i) { cell.setKind(i === depth ? 'cool' : 'cream'); });
      };
      c.setIndex(0);
      return c;
    },

    slotNumber: function (scene, x, y, number) {
      var c = scene.add.container(x, y);
      var face = scene.add.circle(0, 0, 18, 0x7A4E2A);
      var label = Island.ui.label(scene, 0, 0, String(number), { font: 24, color: '#FFF8EE' });
      c.add([face, label]);
      c.setSize(36, 36);
      return c;
    },

    panel: function (scene, x, y, w, h) {
      return slice(scene, 'ui-panel-9slice', x, y, w, h, 48);
    },

    bubble: function (scene, text, hint) {
      var c = scene.add.container(0, 0);
      var tailKey = hint ? 'ui-bubble-tail-hint' : 'ui-bubble-tail-cream';
      var plate = Island.ui.pill(scene, 0, 0, 220, 76, { fill: hint ? 0xFFE9A8 : 0xFFF4E0, soft: true });
      var bits = [plate];
      var tx = 0;
      if (hint) {
        bits.push(scene.add.image(-70, 0, 'icon-bulb').setDisplaySize(36, 36));
        tx = 16;
      }
      var label = scene.add.text(tx, 0, Island.ui.instruction(text), Island.bodyStyle(28)).setOrigin(0.5);
      var tail = scene.add.image(0, 48, tailKey).setDisplaySize(32, 26);
      bits.push(label, tail);
      c.add(bits);
      var w = Math.max(160, label.width + (hint ? 100 : 64));
      plate.resize(w, 76);
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
      var title = scene.add.text(0, -20, cfg.concept.name, Island.style(52)).setOrigin(0.5);
      var line = scene.add.text(0, 56, cfg.concept.line, Island.bodyStyle(28, '#8C6950')).setOrigin(0.5);
      var pill = Island.ui.beans(scene, 0, 126, { label: true });
      pill.setCount('+' + stars);
      var again = Island.ui.button(scene, -150, 216, 180, 60, '再玩一次', onReplay, { kind: 'secondary', states: ['MODAL'] });
      var next = Island.ui.button(scene, 100, 216, 200, 72, '回小岛', onContinue, { states: ['MODAL'] });
      root.add([scrim, panel, tag, title, line, pill, again, next].concat(slots));
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
