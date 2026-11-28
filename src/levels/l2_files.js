/* 搬家小队：文件进箱子，箱子再进箱子，然后按路径找到小猫。 */
(function () {
  'use strict';
  var Island = window.Island;
  var P = Island.PAL;

  Island.IMPL.files = {
    create: function (scene, cfg) {
      var api = scene.api;
      var self = this;
      api.placeLucky(140, 745, { pose: 'carry', h: 250 });
      var round = 1;
      var view = 'desk';
      var held = null;
      var moved = false;

      var desk = Island.ui.panel(scene, 670, 230, 620, 196);
      desk.setDepth(6);
      var deskTag = Island.ui.tag(scene, 430, 148, '桌面', 'peach', 'icon-house');
      deskTag.setDepth(7);

      function box(x, y, key, w, label) {
        var probe = scene.add.image(0, 0, key);
        var h = w * probe.height / probe.width;
        probe.destroy();
        var c = scene.add.container(x, y).setDepth(10);
        var shadow = scene.add.ellipse(0, h * 0.42, w * 0.72, 18, 0x4A3222, 0.22);
        var body = scene.add.image(0, 0, key).setDisplaySize(w, h);
        var tag = Island.ui.tag(scene, 0, h * 0.48, label, 'cream');
        c.add([shadow, body, tag]);
        c.lid = { angle: 0 };
        c._bsx = 1;
        c._bsy = 1;
        c.setSize(w, h);
        return c;
      }

      var draw = box(440, 560, 'prop-crate-peach', 220, '画画');
      var music = box(734, 560, 'prop-crate-blue', 220, '音乐');
      var works = box(1043, 548, 'prop-crate-mint', 250, '我的作品');
      var boxes = { draw: draw, music: music, works: works };
      draw.boxId = 'draw';
      music.boxId = 'music';
      works.boxId = 'works';

      var defs = [
        { id: 'cat', label: '小猫.png', box: 'draw', x: 470, y: 214, key: 'prop-file-cat' },
        { id: 'song', label: '生日歌.mp3', box: 'music', x: 590, y: 214, key: 'prop-file-music' },
        { id: 'story', label: '我的故事.txt', box: 'works', x: 730, y: 214, key: 'prop-file-story' },
        { id: 'html', label: '接星星.html', box: 'works', x: 870, y: 214, key: 'prop-file-game' }
      ];
      var items = defs.map(function (d) {
        var c = scene.add.container(d.x, d.y).setDepth(16);
        var icon = scene.add.image(0, -8, d.key);
        icon.setDisplaySize(96 * icon.width / icon.height, 96);
        var label = Island.ui.tag(scene, 0, 62, d.label, 'file');
        c.add([icon, label]);
        c.meta = d;
        c.placed = false;
        c.setSize(156, 112);
        Island.drag.make(scene, c, {
          key: d.id,
          hw: 78,
          hh: 56,
          enabled: function () { return round === 1 && view === 'desk'; },
          targets: function () {
            var b = boxes[d.box];
            return [{ id: d.box, x: b.x, y: b.y, magnet: cfg.tuning.magnet, obj: b }];
          },
          onLift: function (obj) { held = obj; },
          onDrop: function () { held = null; putFile(c); },
          onReject: function () {
            held = null;
            return api.miss(cfg.bubbles[d.box]);
          }
        });
        return c;
      });

      var inner = scene.add.container(640, 400).setDepth(12).setVisible(false);
      var innerPanel = Island.ui.panel(scene, 0, 0, 560, 320);
      var innerDraw = box(0, 40, 'prop-crate-peach', 200, '画画');
      inner.add(innerPanel);
      innerDraw.setPosition(0, 40);
      inner.add(innerDraw);
      var decoy = scene.add.container(180, 20);
      var decoyImg = scene.add.image(0, -10, 'prop-file-story');
      decoyImg.setDisplaySize(80, 80);
      decoy.add([decoyImg, Island.ui.tag(scene, 0, 50, '我的故事.txt', 'file')]);
      decoy.setSize(120, 120);
      inner.add(decoy);
      var cat = scene.add.container(640, 400).setVisible(false).setDepth(16);
      var catImg = scene.add.image(0, -16, 'prop-file-cat');
      catImg.setDisplaySize(140, 160);
      cat.add([catImg, Island.ui.tag(scene, 0, 90, '小猫.png', 'file')]);
      cat.setSize(160, 200);

      var names = ['桌面', '我的作品', '画画'];
      var cells = [];
      var bar = scene.add.container(640, 118);
      names.forEach(function (name, i) {
        var cell = Island.ui.tag(scene, (i - 1) * 180, 0, name, i === 0 ? 'peach' : 'cream');
        cells.push(cell);
        bar.add(cell);
      });
      scene.hud.add(bar);
      bar.setVisible(false);

      function paintCell(i, on) {
        var cell = cells[i];
        var plate = cell.list && cell.list[0];
        if (plate && plate.setTexture) plate.setTexture(on ? 'ui-tag-mint-9slice' : 'ui-tag-cream-9slice');
      }
      function markPath(depth) {
        for (var i = 0; i < 3; i++) paintCell(i, i === depth);
      }
      function shakeCell(i) {
        var cell = cells[i];
        if (Island.MOTION.calm) return;
        var x = cell.x;
        scene.tweens.add({ targets: cell, x: x + 8, yoyo: true, repeat: 2, duration: 55, onComplete: function () { cell.x = x; } });
      }
      function flash(fn) {
        scene.locked = true;
        Island.sfx.play('path');
        scene.tweens.add({ targets: scene.flash, alpha: 1, duration: 80 });
        scene.time.delayedCall(90, function () {
          if (!scene.sys.isActive()) return;
          fn();
          scene.tweens.add({
            targets: scene.flash,
            alpha: 0,
            duration: 120,
            onComplete: function () { scene.locked = false; }
          });
        });
      }
      function showDesk() {
        view = 'desk';
        inner.setVisible(false);
        cat.setVisible(false);
        desk.setVisible(true);
        deskTag.setVisible(true);
        draw.setVisible(!moved);
        music.setVisible(true);
        works.setVisible(true);
        items.forEach(function (it) { if (!it.placed) it.setVisible(true); });
        markPath(0);
      }
      function showWorks() {
        view = 'works';
        items.forEach(function (it) { it.setVisible(false); });
        desk.setVisible(false);
        deskTag.setVisible(false);
        draw.setVisible(false);
        music.setVisible(false);
        works.setVisible(false);
        inner.setVisible(true);
        innerDraw.setVisible(moved);
        decoy.setVisible(true);
        cat.setVisible(false);
        markPath(1);
      }
      function showDraw() {
        view = 'draw';
        desk.setVisible(false);
        deskTag.setVisible(false);
        inner.setVisible(true);
        innerDraw.setVisible(false);
        decoy.setVisible(false);
        cat.setVisible(true);
        markPath(2);
      }
      function go(depth) {
        flash(function () {
          if (depth <= 0) showDesk();
          else if (depth === 1) showWorks();
          else showDraw();
        });
      }

      function loose() {
        for (var i = 0; i < items.length; i++) if (!items[i].placed) return items[i];
        return null;
      }
      function putFile(item) {
        if (item.placed) return;
        item.placed = true;
        item.disableInteractive();
        var b = boxes[item.meta.box];
        b.lid.angle = 0;
        if (!Island.MOTION.calm) {
          b.setScale(1.06);
          Island.fx.tween(scene, b, { scaleX: 1, scaleY: 1 }, { dur: 140, ease: 'Back.easeOut' });
        }
        Island.fx.tween(scene, item, { scaleX: 0, scaleY: 0 }, {
          dur: 160,
          onComplete: function () { item.setVisible(false); }
        });
        api.good(b.x, b.y);
        if (!loose()) startMove();
        else armSort();
      }
      function armSort() {
        var item = loose();
        api.setStep({
          goal: item ? boxes[item.meta.box] : draw,
          hint: cfg.hints.sort,
          demo: function () {
            var it = loose();
            if (!it) return;
            var b = boxes[it.meta.box];
            Island.drag.park(it, b.x, b.y);
            putFile(it);
          }
        });
      }
      function startMove() {
        round = 2;
        api.setTask(cfg.tasks[1]);
        Island.drag.make(scene, draw, {
          key: 'drawbox',
          hw: 90,
          hh: 70,
          enabled: function () { return round === 2 && view === 'desk' && !moved; },
          targets: function () {
            return [{ id: 'works', x: works.x, y: works.y, magnet: 120, obj: works }];
          },
          onLift: function (obj) { held = obj; },
          onDrop: function () {
            held = null;
            moved = true;
            draw.disableInteractive();
            api.good(works.x, works.y);
            Island.fx.tween(scene, draw, { scaleX: 0.2, scaleY: 0.2, alpha: 0 }, {
              dur: 220,
              onComplete: function () {
                draw.setVisible(false);
                startPath();
              }
            });
          },
          onReject: function () {
            held = null;
            return api.miss(cfg.bubbles.works);
          }
        });
        api.setStep({
          goal: works,
          hint: cfg.hints.move,
          demo: function () {
            if (moved) return;
            moved = true;
            draw.disableInteractive();
            draw.setVisible(false);
            api.good(works.x, works.y);
            startPath();
          }
        });
      }
      function startPath() {
        round = 3;
        api.setTask(cfg.tasks[2]);
        bar.setVisible(true);
        showDesk();
        armPath();
      }
      function armPath() {
        var goal = view === 'desk' ? works : view === 'works' ? innerDraw : cat;
        api.setStep({
          goal: goal,
          hint: cfg.hints.path,
          demo: function () {
            if (view === 'desk') go(1);
            else if (view === 'works') go(2);
            else api.win();
          }
        });
      }

      function dbl(obj, fn) {
        var last = 0;
        obj.setInteractive({
          hitArea: Island.hit.rect(obj, obj.width, obj.height),
          hitAreaCallback: Phaser.Geom.Rectangle.Contains,
          useHandCursor: true
        });
        obj.on('pointerdown', function () {
          if (!api.playable()) return;
          Island.sfx.play('press');
          obj.setScale((obj._bsx || 1) * 0.94);
        });
        obj.on('pointerup', function (p) {
          if (Island.drag.busy || Island.drag.just) return;
          if (!api.playable()) return;
          obj.setScale(obj._bsx || 1, obj._bsy || 1);
          Island.sfx.play('click');
          Island.fx.ring(scene, p.worldX, p.worldY);
          var now = scene.time.now;
          if (now - last < cfg.tuning.dblMs) {
            last = 0;
            fn();
          } else last = now;
        });
      }

      dbl(works, function () {
        if (Island.drag.just) { Island.drag.just = false; return; }
        if (round < 2) return;
        if (!moved) {
          if (round === 2) api.miss(cfg.bubbles.seek);
          return;
        }
        if (round < 3 || view !== 'desk') return;
        go(1);
        scene.time.delayedCall(240, armPath);
      });
      dbl(music, function () {
        if (round < 3 || view !== 'desk') return;
        shakeCell(0);
        api.miss(cfg.bubbles.layer);
      });
      dbl(innerDraw, function () {
        if (round < 3 || view !== 'works' || !moved) return;
        go(2);
        scene.time.delayedCall(240, armPath);
      });
      dbl(decoy, function () {
        if (view !== 'works') return;
        shakeCell(1);
        api.miss(cfg.bubbles.layer);
        go(0);
      });
      dbl(cat, function () {
        if (view !== 'draw') return;
        Island.fx.stars(scene, cat.x, cat.y, 8);
        api.win();
      });

      api.setTask(cfg.tasks[0]);
      armSort();
      api.intro(items.concat([draw, music, works]));

      self._held = function () { return held; };
      self._boxes = [draw, music, works];
    },
    update: function () {
      var held = this._held ? this._held() : null;
      var list = this._boxes || [];
      for (var i = 0; i < list.length; i++) {
        var b = list[i];
        if (!b.scene || !b.lid) continue;
        var want = 0;
        if (held) {
          var d = Math.hypot(b.x - held.x, b.y - held.y);
          if (d < 180) want = -34;
        }
        b.lid.angle += (want - b.lid.angle) * 0.28;
      }
    },
    destroy: function () {}
  };
})();
