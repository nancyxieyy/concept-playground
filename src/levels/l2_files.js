/* 搬家小队：文件进箱子，箱子再进箱子，然后按路径找到小猫。 */
(function () {
  'use strict';
  var Island = window.Island;
  var P = Island.PAL;

  Island.IMPL.files = {
    create: function (scene, cfg) {
      var api = scene.api;
      var self = this;
      api.placeLucky(1080, 610);
      var round = 1;
      var view = 'desk';
      var held = null;
      var moved = false;

      function box(x, y, w, h, fill, label) {
        var c = scene.add.container(x, y).setDepth(10);
        var shadow = scene.add.ellipse(0, h * 0.45, w * 0.75, 18, P.ink, 0.22);
        var body = scene.add.rectangle(0, 6, w, h, fill).setStrokeStyle(4, P.ink);
        var lid = scene.add.rectangle(0, -h * 0.42, w + 10, 24, P.woodDeep).setStrokeStyle(4, P.ink);
        var text = scene.add.text(0, 14, label, Island.style(22, '#4A3222', false)).setOrigin(0.5);
        c.add([shadow, body, lid, text]);
        c.lid = lid;
        c._bsx = 1;
        c._bsy = 1;
        c.setSize(w, h + 10);
        return c;
      }

      var draw = box(300, 390, 168, 132, 0xC5D7B4, '画画');
      var music = box(560, 400, 168, 132, 0xF6D98A, '音乐');
      var works = box(860, 390, 196, 150, P.wood, '我的作品');
      var boxes = { draw: draw, music: music, works: works };
      draw.boxId = 'draw';
      music.boxId = 'music';
      works.boxId = 'works';

      var defs = [
        { id: 'cat', label: '小猫.png', box: 'draw', x: 230, y: 600, icon: '🐱', color: 0xF6C9A0 },
        { id: 'song', label: '生日歌.mp3', box: 'music', x: 430, y: 600, icon: '🎵', color: 0xFFE9A8 },
        { id: 'story', label: '我的故事.txt', box: 'works', x: 640, y: 600, icon: '📄', color: 0xFFF4E0 },
        { id: 'html', label: '接星星.html', box: 'works', x: 850, y: 600, icon: '🌐', color: 0xD5EEF8 }
      ];
      var items = defs.map(function (d) {
        var c = scene.add.container(d.x, d.y).setDepth(16);
        var bg = scene.add.rectangle(0, 0, 156, 112, d.color).setStrokeStyle(4, P.ink);
        var icon = scene.add.text(0, -18, d.icon, {
          fontFamily: Island.EMOJI, fontSize: '34px', resolution: 2
        }).setOrigin(0.5);
        var label = scene.add.text(0, 30, d.label, Island.style(22, '#4A3222', false)).setOrigin(0.5);
        c.add([bg, icon, label]);
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

      var inner = scene.add.container(0, 0).setDepth(12).setVisible(false);
      var innerDraw = box(470, 420, 180, 140, 0xC5D7B4, '画画');
      var decoy = scene.add.container(760, 430);
      decoy.add([
        scene.add.rectangle(0, 0, 150, 100, 0xFFF4E0).setStrokeStyle(4, P.ink),
        scene.add.text(0, 0, '我的故事.txt', Island.style(22, '#4A3222', false)).setOrigin(0.5)
      ]);
      decoy.setSize(150, 100);
      var cat = scene.add.container(640, 420).setVisible(false);
      cat.add([
        scene.add.rectangle(0, 0, 180, 140, 0xF6C9A0).setStrokeStyle(4, P.ink),
        scene.add.text(0, -16, '🐱', { fontFamily: Island.EMOJI, fontSize: '48px', resolution: 2 }).setOrigin(0.5),
        scene.add.text(0, 40, '小猫.png', Island.style(22, '#4A3222', false)).setOrigin(0.5)
      ]);
      cat.setSize(180, 140);
      inner.add([innerDraw, decoy]);
      cat.setDepth(16);

      var names = ['桌面', '我的作品', '画画'];
      var cells = [];
      var bar = scene.add.container(640, 130);
      names.forEach(function (name, i) {
        var cell = scene.add.container((i - 1) * 200, 0);
        var g = scene.add.graphics();
        Island.ui.wood(g, -84, -26, 168, 52, i === 0 ? P.hint : P.wood, P.woodDeep, 12);
        var t = scene.add.text(0, -2, name, Island.style(22, '#4A3222', false)).setOrigin(0.5);
        cell.add([g, t]);
        cell.g = g;
        cells.push(cell);
        bar.add(cell);
      });
      scene.hud.add(bar);
      bar.setVisible(false);

      function paintCell(i, on) {
        var cell = cells[i];
        cell.g.clear();
        Island.ui.wood(cell.g, -84, -26, 168, 52, on ? P.hint : P.wood, P.woodDeep, 12);
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
        draw.setVisible(!moved);
        music.setVisible(true);
        works.setVisible(true);
        items.forEach(function (it) { if (!it.placed) it.setVisible(true); });
        markPath(0);
      }
      function showWorks() {
        view = 'works';
        items.forEach(function (it) { it.setVisible(false); });
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
        inner.setVisible(false);
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
