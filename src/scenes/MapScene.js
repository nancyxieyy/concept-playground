/* 电脑小岛：海、岛、路、节点和宝箱。进关和回关都在这块画布上推镜头。 */
(function () {
  'use strict';
  var Island = window.Island;
  var P = Island.PAL;

  function standOf(x, y) { return { x: x - 78, y: y + 58 }; }

  Island.MapScene = class extends Phaser.Scene {
    constructor() { super('Map'); }

    init(data) { this.entry = data || {}; }

    create() {
      var self = this;
      Island.clearWatch();
      this._done = false;
      var just = this.entry.justCleared || null;
      var calm = Island.MOTION.calm;
      Island.ui.stage(this);
      this.cameras.main.centerOn(640, 360);
      this.drawWorld();
      this.nodes = [];
      this.paths = [];
      this.buildPath();
      this.buildNodes(just);
      this.buildChest(just);
      this.buildHud();

      var goal = this.goalStand();
      var start = goal;
      if (just) {
        var jn = this.nodeById(just);
        if (jn) start = standOf(jn.x, jn.y);
      }
      if (!just && !Island.store.seenIntro()) start = { x: -180, y: goal.y };
      this.lucky = new Island.Lucky(this, start.x, start.y, 0.45);
      this.lucky._ground = start.y;

      this.input.topOnly = true;
      Island.forceReady = function () { self.finishNow(); };

      if (just) {
        Island.state = 'TRANSITION';
        this.input.enabled = false;
        this.hud.setAlpha(0);
        if (!calm) {
          var jn2 = this.nodeById(just);
          this.cameras.main.setZoom(2.6);
          this.cameras.main.centerOn(jn2 ? jn2.x : 640, jn2 ? jn2.y : 360);
          this.flash.setAlpha(1);
        } else {
          this.flash.setAlpha(1);
        }
        this.playReturn(just);
      } else {
        Island.state = 'IDLE';
        this.input.enabled = true;
        this.flash.setAlpha(0);
        if (!Island.store.seenIntro()) {
          this.lucky.entrance(goal.x, goal.y, function () { Island.store.markIntro(); });
        }
      }

      Island.armWatch(7000, function () {
        if (Island.state === 'TRANSITION') self.finishNow();
      });

      var esc = function () {};
      Island.onEscape = esc;
      Island.onConfirm = esc;
      this.events.once('shutdown', function () {
        if (Island.onEscape === esc) Island.onEscape = null;
        if (Island.forceReady) Island.forceReady = null;
      });
    }

    drawWorld() {
      var g = this.add.graphics();
      g.setDepth(0);
      g.fillGradientStyle(P.skyTop, P.skyTop, P.skyBot, P.skyBot);
      g.fillRect(-1800, -1600, 5000, 2100);
      g.fillStyle(P.sea, 1);
      g.fillRect(-1800, 180, 5000, 2200);
      g.fillStyle(P.sand, 1);
      g.fillEllipse(690, 530, 1500, 700);
      g.fillStyle(P.grass, 1);
      g.fillEllipse(690, 510, 1360, 640);
      g.fillStyle(0xC7E6A4, 0.85);
      g.fillEllipse(640, 430, 900, 280);
      g.fillStyle(0xD5EBB4, 1);
      g.fillEllipse(1080, 340, 280, 150);
      g.lineStyle(4, 0xffffff, 0.55);
      g.beginPath();
      g.arc(690, 510, 300, Math.PI * 1.15, Math.PI * 1.55, false);
      g.strokePath();

      this.waves = this.add.graphics().setDepth(1);
      this.drawWaves(0);

      var sun = this.add.circle(150, 108, 46, P.star).setStrokeStyle(4, P.starEdge).setDepth(2);
      Island.ui.decor(this, sun, ['IDLE']);
      this.clouds = [];
      var specs = [[280, 80, 1], [560, 54, 0.7], [860, 96, 1.15], [1140, 70, 0.85]];
      for (var i = 0; i < specs.length; i++) {
        var c = this.add.ellipse(specs[i][0], specs[i][1], 120, 48, 0xffffff, 0.92).setDepth(2);
        c.spd = 18 * specs[i][2];
        this.clouds.push(c);
        Island.ui.decor(this, c, ['IDLE']);
      }

      Island.MAP.far.forEach(function (p) {
        var isle = this.add.ellipse(p.x, p.y, 120, 64, 0x9BB7C9, 0.9).setStrokeStyle(4, P.ink).setDepth(2);
        this.add.ellipse(p.x, p.y - 10, 70, 36, P.grass, 0.7).setDepth(2);
        var lock = this.add.circle(p.x, p.y + 6, 10, P.lockBg).setStrokeStyle(3, P.ink).setDepth(3);
        isle.setInteractive();
        isle.on('pointerdown', function () {
          if (Island.state !== 'IDLE') return;
          Island.sfx.play('press');
          if (!Island.MOTION.calm) {
            isle.setScale(1.08);
            this.tweens.add({ targets: [isle, lock], y: '+=6', yoyo: true, duration: 120 });
          }
        }, this);
      }, this);

      this.trees();
      this.dock();
    }

    drawWaves(t) {
      var g = this.waves;
      if (!g) return;
      g.clear();
      g.lineStyle(3, 0xffffff, 0.6);
      function onSand(x, y) {
        var nx = (x - 690) / 760;
        var ny = (y - 530) / 360;
        return nx * nx + ny * ny < 1;
      }
      for (var k = 0; k < 3; k++) {
        var drawing = false;
        var y0 = 210 + k * 22;
        for (var x = -100; x <= 1500; x += 20) {
          var y = y0 + Math.sin(x * 0.02 + t + k) * 5;
          if (onSand(x, y)) {
            if (drawing) g.strokePath();
            drawing = false;
            continue;
          }
          if (!drawing) {
            g.beginPath();
            g.moveTo(x, y);
            drawing = true;
          } else g.lineTo(x, y);
        }
        if (drawing) g.strokePath();
      }
    }

    trees() {
      var spots = [[470, 560], [700, 600], [930, 560]];
      for (var i = 0; i < spots.length; i++) {
        this.add.rectangle(spots[i][0], spots[i][1] + 16, 14, 36, P.woodDeep).setStrokeStyle(3, P.ink).setDepth(6);
        var crown = this.add.circle(spots[i][0], spots[i][1] - 10, 28, P.sageDeep).setStrokeStyle(4, P.ink).setDepth(7);
        Island.ui.decor(this, crown, ['IDLE']);
      }
    }

    dock() {
      var d = Island.MAP.dock;
      var g = this.add.graphics().setDepth(6);
      g.fillStyle(P.wood, 1);
      g.lineStyle(4, P.ink, 1);
      g.fillRoundedRect(d.x - 70, d.y - 16, 150, 36, 8);
      g.strokeRoundedRect(d.x - 70, d.y - 16, 150, 36, 8);
      g.fillRect(d.x - 40, d.y + 10, 12, 28);
      g.fillRect(d.x + 30, d.y + 10, 12, 28);
    }

    buildPath() {
      var pts = [{ x: Island.MAP.dock.x, y: Island.MAP.dock.y }];
      Island.LEVELS.forEach(function (lv) { pts.push({ x: lv.map.x, y: lv.map.y }); });
      pts.push({ x: Island.MAP.chest.x, y: Island.MAP.chest.y });
      this.paths = [];
      for (var s = 0; s < pts.length - 1; s++) {
        var a = pts[s];
        var b = pts[s + 1];
        var dx = b.x - a.x;
        var dy = b.y - a.y;
        var len = Math.max(1, Math.hypot(dx, dy));
        var n = Math.max(3, Math.floor(len / 26));
        var dots = [];
        var lit = false;
        if (s > 0) {
          var prev = Island.LEVELS[s - 1];
          lit = Island.store.isCleared(prev.id) && this.entry.justCleared !== prev.id;
        }
        for (var i = 1; i < n; i++) {
          var t = i / n;
          var dot = this.add.ellipse(a.x + dx * t, a.y + dy * t, 22, 16, lit ? P.sage : P.sand);
          dot.setStrokeStyle(3, P.ink);
          dot.setDepth(8);
          dots.push(dot);
        }
        this.paths.push(dots);
      }
    }

    lightPath(seg) {
      var dots = this.paths[seg] || [];
      var calm = Island.MOTION.calm;
      dots.forEach(function (d, i) {
        this.time.delayedCall(calm ? 0 : i * 16, function () {
          if (d.scene) d.setFillStyle(P.sage);
        });
      }, this);
      if (!calm && dots.length) Island.sfx.play('path');
    }

    buildNodes(just) {
      var self = this;
      Island.LEVELS.forEach(function (lv, index) {
        var unlocked = index === 0 || Island.store.isCleared(Island.LEVELS[index - 1].id);
        if (index > 0 && Island.LEVELS[index - 1].id === just) unlocked = false;
        var cleared = Island.store.isCleared(lv.id) && lv.id !== just;
        var node = self.makeNode(lv, index, unlocked, cleared);
        self.nodes.push(node);
      });
      this.bobNode = null;
      for (var i = 0; i < this.nodes.length; i++) {
        if (this.nodes[i].unlocked && !this.nodes[i].cleared) { this.bobNode = this.nodes[i]; break; }
      }
    }

    makeNode(lv, index, unlocked, cleared) {
      var c = this.add.container(lv.map.x, lv.map.y).setDepth(20);
      var shadow = this.add.ellipse(0, 58, 96, 22, P.ink, 0.25);
      var disc = this.add.circle(0, 0, 64, unlocked ? P.wood : P.lockBg).setStrokeStyle(4, P.ink);
      var icon = this.add.text(0, -4, lv.icon, {
        fontFamily: Island.EMOJI,
        fontSize: '54px',
        resolution: 2
      }).setOrigin(0.5);
      icon.setVisible(!!unlocked);
      var lock = this.add.graphics();
      lock.fillStyle(P.lock, 1);
      lock.fillRoundedRect(-18, -4, 36, 28, 6);
      lock.lineStyle(4, P.ink, 1);
      lock.strokeRoundedRect(-18, -4, 36, 28, 6);
      lock.beginPath();
      lock.arc(0, -8, 12, Math.PI, 0, false);
      lock.strokePath();
      lock.setVisible(!unlocked);
      var mark = this.add.text(36, -40, '✓', Island.style(28)).setOrigin(0.5).setVisible(!!cleared);
      var pips = [];
      var stars = Island.store.starsOf(lv.id);
      if (!cleared) stars = 0;
      for (var s = 0; s < 3; s++) {
        var pip = this.add.image(-22 + s * 22, 78, 'fx-star').setScale(0.28).setVisible(s < stars);
        pips.push(pip);
      }
      c.add([shadow, disc, icon, lock, mark].concat(pips));
      c.setSize(128, 128);
      c.setInteractive({
        hitArea: Island.hit.circle(c, 66),
        hitAreaCallback: Phaser.Geom.Circle.Contains,
        useHandCursor: true
      });
      c.disc = disc;
      c.icon = icon;
      c.lock = lock;
      c.mark = mark;
      c.pips = pips;
      c.levelId = lv.id;
      c.index = index;
      c.unlocked = !!unlocked;
      c.cleared = !!cleared;
      c._restY = c.y;
      var scene = this;
      c.on('pointerover', function () {
        if (Island.state !== 'IDLE') return;
        Island.sfx.hover('node' + lv.id);
        c.setScale(Island.MOTION.calm ? 1.03 : 1.06);
        if (!Island.MOTION.calm) c.y = c._restY - 4;
      });
      c.on('pointerout', function () {
        c.setScale(1);
        c.y = c._restY;
      });
      c.on('pointerdown', function () {
        if (Island.state !== 'IDLE') return;
        Island.sfx.play('press');
        c.setScale(0.92);
        c.y = c._restY + 4;
      });
      c.on('pointerup', function () {
        c.setScale(1);
        c.y = c._restY;
        if (Island.state !== 'IDLE') return;
        Island.sfx.play('click');
        Island.fx.ring(scene, c.x, c.y);
        if (!Island.store.isUnlocked(index)) {
          Island.sfx.play('wrong');
          if (scene.lucky) scene.lucky.confused();
          if (!Island.MOTION.calm) {
            scene.tweens.add({ targets: lock, angle: 8, yoyo: true, repeat: 2, duration: 60 });
          }
          return;
        }
        scene.enterLevel(c);
      });
      return c;
    }

    revealCleared(node) {
      node.cleared = true;
      node.mark.setVisible(true);
      node.mark.setScale(0);
      var n = Island.store.starsOf(node.levelId);
      Island.fx.tween(this, node.mark, { scaleX: 1, scaleY: 1 }, { dur: 220, ease: 'Back.easeOut' });
      for (var i = 0; i < node.pips.length; i++) {
        node.pips[i].setVisible(i < n);
        if (i < n) Island.fx.pop(this, node.pips[i], 80 + i * 80, 0.28);
      }
    }

    playUnlock(node) {
      var scene = this;
      if (!node) return;
      node.unlocked = true;
      if (Island.MOTION.calm) {
        node.lock.setVisible(false);
        node.disc.setFillStyle(P.wood);
        node.icon.setVisible(true);
        node.icon.setScale(1);
        return;
      }
      Island.sfx.play('unlock');
      scene.tweens.add({
        targets: node.lock,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 120,
        ease: 'Back.easeIn',
        onComplete: function () {
          Island.sfx.play('lock');
          Island.fx.sparks(scene, node.x, node.y, 8);
          node.lock.setVisible(false);
          node.disc.setFillStyle(P.wood);
          node.icon.setVisible(true);
          node.icon.setScale(0);
          Island.fx.tween(scene, node.icon, { scaleX: 1, scaleY: 1 }, { dur: 320, ease: 'Back.easeOut' });
          Island.fx.ring(scene, node.x, node.y);
        }
      });
    }

    buildChest(just) {
      var pos = Island.MAP.chest;
      var c = this.add.container(pos.x, pos.y).setDepth(18);
      var shadow = this.add.ellipse(0, 36, 90, 20, P.ink, 0.25);
      var body = this.add.rectangle(0, 8, 92, 48, P.wood).setStrokeStyle(4, P.ink);
      var lid = this.add.rectangle(0, -18, 100, 28, P.woodDeep).setStrokeStyle(4, P.ink).setOrigin(0.5, 1);
      var medal = this.add.container(0, 0);
      var gem = this.add.circle(0, 0, 22, P.star).setStrokeStyle(4, P.starEdge);
      var star = this.add.image(0, 0, 'fx-star').setScale(0.4);
      medal.add([gem, star]);
      medal.setVisible(false);
      c.add([shadow, body, lid, medal]);
      c.lid = lid;
      c.medal = medal;
      c.body = body;
      this.chest = c;
      var opened = Island.store.badge() && just !== 'turtle';
      if (opened) {
        lid.angle = -110;
        medal.setVisible(true);
        medal.y = -78;
      }
      c.setSize(100, 80);
      c.setInteractive({
        hitArea: Island.hit.rect(c, 100, 80),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true
      });
      var scene = this;
      c.on('pointerdown', function () {
        if (Island.state !== 'IDLE') return;
        Island.sfx.play('press');
        if (Island.store.badge()) {
          Island.sfx.play('click');
          if (!Island.MOTION.calm) {
            scene.tweens.add({ targets: medal, angle: 12, yoyo: true, duration: 120 });
          }
        } else if (!Island.MOTION.calm) {
          scene.tweens.add({ targets: c, x: pos.x + 4, yoyo: true, repeat: 2, duration: 50 });
          Island.sfx.play('wrong');
        }
      });
    }

    openChest(done) {
      var scene = this;
      var c = this.chest;
      var calm = Island.MOTION.calm;
      Island.sfx.play('creak');
      var finish = function () {
        c.lid.angle = -110;
        c.medal.setVisible(true);
        c.medal.y = -78;
        c.medal.setScale(1);
        if (done) done();
      };
      if (calm) {
        this.time.delayedCall(200, finish);
        return;
      }
      Island.fx.glide(this, 1.6, c.x, c.y, 500, 'Cubic.easeInOut', function () {
        scene.tweens.add({
          targets: c,
          x: c.x + 4,
          duration: 60,
          yoyo: true,
          repeat: 2,
          onComplete: function () {
            Island.sfx.play('chord');
            scene.tweens.add({
              targets: c.lid,
              angle: -110,
              duration: 400,
              ease: 'Back.easeOut',
              onComplete: function () {
                Island.fx.sparks(scene, c.x, c.y - 20, 12);
                Island.sfx.play('badge');
                c.medal.setVisible(true);
                c.medal.y = 10;
                c.medal.setScale(0);
                Island.fx.tween(scene, c.medal, { y: -78, scaleX: 1, scaleY: 1 }, {
                  dur: 600,
                  ease: 'Cubic.easeOut',
                  onComplete: function () {
                    scene.time.delayedCall(900, function () {
                      Island.fx.glide(scene, 1, 640, 360, 500, 'Cubic.easeInOut', finish);
                    });
                  }
                });
              }
            });
          }
        });
      });
    }

    buildHud() {
      var title = this.add.container(640, 52);
      var g = this.add.graphics();
      var label = this.add.text(0, -2, '电脑小岛', Island.style(40)).setOrigin(0.5);
      var w = Math.max(280, label.width + 72);
      Island.ui.wood(g, -w / 2, -32, w, 64, P.wood, P.woodDeep, 16);
      title.add([g, label]);
      this.counter = Island.ui.stars(this, 1040, 52);
      this.counter.setCount(Island.store.totalStars());
      this.mute = Island.ui.round(this, 1216, 52, 'speaker', function () {
        if (Island.state !== 'IDLE' && Island.state !== 'PLAY') return;
        var m = Island.sfx.toggle();
        this.mute.setMutedIcon(m);
      }.bind(this), { states: ['IDLE', 'PLAY'] });
      this.mute.setMutedIcon(Island.store.muted());
      this.hud.add([title, this.counter, this.mute]);
      this.title = title;
      if (Island.DEBUG) {
        this._fps = this.add.text(24, 112, '', Island.style(18)).setOrigin(0, 0.5);
        this.hud.add(this._fps);
        this._fpsT = 0;
      }
    }

    goalStand() {
      for (var i = 0; i < Island.LEVELS.length; i++) {
        if (!Island.store.isCleared(Island.LEVELS[i].id)) {
          var n = Island.LEVELS[i];
          return standOf(n.map.x, n.map.y);
        }
      }
      return standOf(Island.MAP.chest.x, Island.MAP.chest.y);
    }

    nodeById(id) {
      for (var i = 0; i < this.nodes.length; i++) {
        if (this.nodes[i].levelId === id) return this.nodes[i];
      }
      return null;
    }

    playReturn(just) {
      var self = this;
      var calm = Island.MOTION.calm;
      var node = this.nodeById(just);
      var index = Island.levelIndex(just);
      if (calm) {
        this.tweens.add({
          targets: this.flash,
          alpha: 0,
          duration: 200,
          onComplete: function () { self.applyUnlock(node, index, true); }
        });
        return;
      }
      this.tweens.add({ targets: this.flash, alpha: 0, duration: 120 });
      Island.sfx.play('whooshOut');
      Island.fx.glide(this, 1, 640, 360, 640, 'Cubic.easeInOut');
      this.time.delayedCall(440, function () {
        if (self._done || !self.sys.isActive()) return;
        self.hud.setAlpha(0);
        Island.fx.tween(self, self.hud, { alpha: 1 }, { dur: 200, ease: 'Quad.easeOut' });
      });
      this.time.delayedCall(640, function () {
        if (self._done || !self.sys.isActive()) return;
        if (node) self.revealCleared(node);
      });
      this.time.delayedCall(800, function () {
        if (self._done || !self.sys.isActive()) return;
        if (index >= 0) self.lightPath(index + 1);
      });
      this.time.delayedCall(1200, function () {
        if (self._done || !self.sys.isActive()) return;
        var next = self.nodes[index + 1];
        if (next) self.playUnlock(next);
      });
      this.time.delayedCall(1500, function () {
        if (self._done || !self.sys.isActive()) return;
        var spot = self.goalStand();
        if (self.lucky) self.lucky.hop(spot.x, spot.y);
      });
      this.time.delayedCall(1960, function () {
        if (self._done || !self.sys.isActive()) return;
        if (just === 'turtle' && Island.store.badge()) {
          self.openChest(function () { self.becomeIdle(); });
        } else {
          self.becomeIdle();
        }
      });
    }

    applyUnlock(node, index, calm) {
      if (node) this.revealCleared(node);
      if (index >= 0) this.lightPath(index + 1);
      var next = this.nodes[index + 1];
      if (next) this.playUnlock(next);
      this.hud.setAlpha(1);
      this.flash.setAlpha(0);
      var spot = this.goalStand();
      if (this.lucky) {
        this.lucky.x = spot.x;
        this.lucky.y = spot.y;
        this.lucky._ground = spot.y;
      }
      if (this.entry.justCleared === 'turtle' && Island.store.badge()) {
        this.openChest(function () {});
      }
      var self = this;
      this.time.delayedCall(calm ? 220 : 400, function () { self.becomeIdle(); });
    }

    becomeIdle() {
      if (this._done || !this.sys.isActive()) return;
      this._done = true;
      Island.clearWatch();
      this.cameras.main.setZoom(1);
      this.cameras.main.centerOn(640, 360);
      this.flash.setAlpha(0);
      this.hud.setAlpha(1);
      this.hudNudge = 0;
      Island.state = 'IDLE';
      this.input.enabled = true;
      for (var i = 0; i < this.nodes.length; i++) {
        if (this.nodes[i].unlocked && !Island.store.isCleared(this.nodes[i].levelId)) {
          this.bobNode = this.nodes[i];
          break;
        }
      }
      if (this.counter) this.counter.setCount(Island.store.totalStars());
    }

    finishNow() {
      if (!this.sys || !this.sys.isActive()) return;
      var just = this.entry.justCleared;
      if (just) {
        var node = this.nodeById(just);
        var index = Island.levelIndex(just);
        if (node && !node.cleared) this.revealCleared(node);
        if (index >= 0) this.lightPath(index + 1);
        var next = this.nodes[index + 1];
        if (next && !next.unlocked) this.playUnlock(next);
        if (Island.store.badge() && this.chest) {
          this.chest.lid.angle = -110;
          this.chest.medal.setVisible(true);
          this.chest.medal.y = -78;
          this.chest.medal.setScale(1);
        }
      }
      this.becomeIdle();
    }

    enterLevel(node) {
      var self = this;
      if (Island.state !== 'IDLE') return;
      Island.state = 'TRANSITION';
      this.input.enabled = false;
      var id = node.levelId;
      var data = { id: id };
      Island.armWatch(3000, function () {
        if (Island.game && Island.game.scene.isActive('Map') && Island.state === 'TRANSITION') {
          Island.game.scene.start('Level', data);
        }
      });
      var go = function () {
        if (!self.sys.isActive()) return;
        self.scene.start('Level', data);
      };
      if (Island.MOTION.calm) {
        this.tweens.add({
          targets: this.flash, alpha: 1, duration: 200,
          onComplete: go
        });
        return;
      }
      Island.fx.tween(this, this.hud, { alpha: 0 }, { dur: 200, ease: 'Quad.easeIn' });
      this.hudNudge = 0;
      var spot = standOf(node.x, node.y);
      if (this.lucky) this.lucky.hop(spot.x, spot.y);
      this.time.delayedCall(280, function () {
        if (!self.sys.isActive() || self._done) return;
        Island.sfx.play('whooshIn');
        Island.fx.glide(self, 2.6, node.x, node.y, 620, 'Cubic.easeInOut');
      });
      this.time.delayedCall(820, function () {
        if (!self.sys.isActive()) return;
        self.tweens.add({
          targets: self.flash,
          alpha: 1,
          duration: 120,
          onComplete: go
        });
      });
    }

    update(time, delta) {
      Island.fx.pin(this);
      if (!Island.MOTION.calm) {
        this.drawWaves(time / 700);
        for (var i = 0; i < this.clouds.length; i++) {
          var c = this.clouds[i];
          c.x += c.spd * delta / 1000;
          if (c.x > 1500) c.x = -160;
        }
        if (this.bobNode && this.bobNode.icon && this.bobNode.icon.visible) {
          this.bobNode.icon.y = -4 + Math.sin(time / 380) * 5;
        }
      }
      if (this._fps && time - this._fpsT > 500) {
        this._fpsT = time;
        this._fps.setText(Math.round(this.game.loop.actualFps) + ' fps');
      }
    }
  };
})();
