/* 小岛地图。镜头最多推到 1.6 倍，避免把 1280 宽的背景拉糊。 */
(function () {
  'use strict';
  var Island = window.Island;

  var NODE = [
    { x: 262, y: 496 },
    { x: 500, y: 502 },
    { x: 754, y: 431 },
    { x: 995, y: 397 }
  ];
  var BLURB = ['第 1 关 · 鼠标三招', '第 2 关 · 文件夹', '第 3 关 · 顺序', '第 4 关 · 重复'];
  var CARD = [
    { x: 210, y: 248 },
    { x: 390, y: 248 },
    { x: 430, y: 200 },
    { x: 620, y: 188 }
  ];
  var SEG = [
    [[262, 500], [380, 505], [420, 505], [500, 505]],
    [[500, 505], [610, 505], [640, 440], [754, 436]],
    [[754, 436], [860, 436], [900, 402], [995, 400]],
    [[995, 400], [1060, 370], [1040, 300], [1025, 262]]
  ];
  var CHEST = { x: 1025, y: 249, nx: 1025, ny: 287 };

  function bez(p, t) {
    var m = 1 - t;
    return {
      x: m * m * m * p[0][0] + 3 * m * m * t * p[1][0] + 3 * m * t * t * p[2][0] + t * t * t * p[3][0],
      y: m * m * m * p[0][1] + 3 * m * m * t * p[1][1] + 3 * m * t * t * p[2][1] + t * t * t * p[3][1]
    };
  }

  function feet(i) {
    // 站在圆台旁，避免对位后的圆牌被 Lucky 遮住。
    return { x: NODE[i].x - 120, y: NODE[i].y + 14 };
  }

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
      Island.fx.placeCam(this.cameras.main, 640, 400, 1);
      Island.layout.background(this, 'bg-map');

      this.segments = [];
      this.buildPath(just);
      this.nodes = [];
      this.buildNodes(just);
      this.buildChest();
      this.buildHud();

      var goal = this.goalFeet();
      var start = goal;
      if (just) {
        var ji = Island.levelIndex(just);
        if (ji >= 0) start = feet(ji);
      }
      if (!just && !Island.store.seenIntro()) start = { x: -180, y: goal.y };
      this.lucky = new Island.Lucky(this, start.x, start.y, { h: 160, pose: 'wave' });

      this.input.topOnly = true;
      Island.forceReady = function () { self.finishNow(); };

      if (just) {
        Island.state = 'TRANSITION';
        this.input.enabled = false;
        this.hud.setAlpha(0);
        if (this.card) this.card.setVisible(false);
        if (!calm) {
          var jn = this.nodeById(just);
          Island.fx.placeCam(this.cameras.main, jn ? jn.x : 640, jn ? jn.y : 400, 1.6);
          this.flash.setAlpha(1);
        }
        this.playReturn(just);
      } else {
        Island.state = 'IDLE';
        this.input.enabled = true;
        this.flash.setAlpha(0);
        this.refreshCard();
        if (!Island.store.seenIntro()) {
          this.lucky.entrance(goal.x, goal.y, function () { Island.store.markIntro(); });
        }
      }

      Island.armWatch(8000, function () {
        if (Island.state === 'TRANSITION' && !self._ceremony) self.finishNow();
      });
      var esc = function () {};
      Island.onEscape = esc;
      Island.onConfirm = function () {
        if (self._ceremony && self._take) self._take();
      };
      if (Island.QA_TOUR) {
        this.input.enabled = false;
        this.time.delayedCall(220, function () { Island.qa.ready(self); });
      }
      this.events.once('shutdown', function () {
        if (Island.onEscape === esc) Island.onEscape = null;
        Island.forceReady = null;
      });
    }

    buildPath(just) {
      var hold = just ? Island.levelIndex(just) : -1;
      for (var s = 0; s < SEG.length; s++) {
        var dots = [];
        var on = s < this.litCount() && s !== hold;
        for (var k = 1; k <= 8; k++) {
          var p = bez(SEG[s], k / 9);
          var dot = this.add.image(p.x, p.y, on ? 'ui-path-dot-lit' : 'ui-path-dot-dim');
          dot.setDisplaySize(on ? 22 : 14, on ? 22 : 14);
          dot.setDepth(4);
          if (!on) dot.setAlpha(0.8);
          dots.push(dot);
        }
        this.segments.push(dots);
      }
    }

    litCount() {
      var n = 0;
      for (var i = 0; i < Island.LEVELS.length; i++) {
        if (!Island.store.isCleared(Island.LEVELS[i].id)) break;
        n += 1;
      }
      return n;
    }

    lightPath(index) {
      var dots = this.segments[index];
      if (!dots) return;
      dots.forEach(function (dot, i) {
        var show = function () {
          dot.setTexture('ui-path-dot-lit');
          dot.setDisplaySize(22, 22);
          dot.setAlpha(1);
        };
        if (Island.MOTION.calm) show();
        else dot.scene.time.delayedCall(i * 40, show);
      });
      Island.sfx.play('path');
    }

    buildNodes(just) {
      var self = this;
      Island.LEVELS.forEach(function (level, i) {
        var spec = NODE[i];
        var unlocked = Island.store.isUnlocked(i);
        var cleared = Island.store.isCleared(level.id);
        if (just === level.id) cleared = false;
        var c = self.add.container(spec.x, spec.y).setDepth(8);
        var halo = self.add.image(0, 0, 'ui-halo-cool').setDisplaySize(132, 132).setAlpha(0.5);
        var face = self.add.image(0, 4, unlocked && !cleared ? 'ui-node-play' : cleared ? 'ui-node-done' : 'ui-node-lock');
        face.setDisplaySize(108, 110);
        var num = self.add.text(0, -2, String(i + 1), Island.style(36, unlocked && !cleared ? '#FFFFFF' : '#7A4E2A')).setOrigin(0.5);
        if (unlocked && !cleared) num.setShadow(0, 2, '#4A8FB0', 0, true, true);
        var mark = self.add.image(0, -2, 'icon-check-white').setDisplaySize(40, 40);
        mark._bsx = mark.scaleX;
        mark._bsy = mark.scaleY;
        var stars = [];
        for (var s = 0; s < 3; s++) {
          var star = self.add.image((s - 1) * 22, -62, 'prop-star-lit').setDisplaySize(s === 1 ? 28 : 22, s === 1 ? 28 : 22);
          stars.push(star);
        }
        c.add([halo, face, num, mark].concat(stars));
        c.setSize(140, 120);
        c.levelId = level.id;
        c.index = i;
        c.face = face;
        c.num = num;
        c.mark = mark;
        c.halo = halo;
        c.stars = stars;
        // 圆牌底边 4 + 55，挂签半高 23，中间留 10。
        c.tag = Island.ui.nametag(self, spec.x, spec.y + 92, level.name, 'peach');
        c.tag.setDepth(8);
        self.paintNode(c, unlocked, cleared);
        c.setInteractive({
          hitArea: Island.hit.rect(c, 140, 110),
          hitAreaCallback: Phaser.Geom.Rectangle.Contains,
          useHandCursor: true
        });
        c.on('pointerover', function () {
          if (Island.state !== 'IDLE') return;
          Island.sfx.hover('node' + i);
          if (!Island.MOTION.calm) c.y = spec.y - 4;
        });
        c.on('pointerout', function () { c.y = spec.y; });
        c.on('pointerdown', function () {
          if (Island.state !== 'IDLE') return;
          Island.sfx.play('press');
          c.y = spec.y + 4;
          c._down = true;
        });
        c.on('pointerup', function () {
          if (!c._down) return;
          c._down = false;
          c.y = spec.y;
          if (Island.state !== 'IDLE') return;
          if (!Island.store.isUnlocked(i)) {
            Island.sfx.play('wrong');
            if (self.lucky) self.lucky.confused();
            if (!Island.MOTION.calm) {
              self.tweens.add({ targets: c, x: spec.x + 6, yoyo: true, repeat: 2, duration: 50, onComplete: function () { c.x = spec.x; } });
            }
            return;
          }
          Island.sfx.play('click');
          self.enterLevel(c);
        });
        self.nodes.push(c);
      });
    }

    paintNode(node, unlocked, cleared) {
      var stars = Island.store.starsOf(node.levelId);
      node.unlocked = unlocked;
      node.cleared = cleared;
      node.halo.setVisible(unlocked && !cleared);
      node.face.setTexture(cleared ? 'ui-node-done' : unlocked ? 'ui-node-play' : 'ui-node-lock');
      node.num.setVisible(!cleared);
      node.num.setColor(unlocked && !cleared ? '#FFFFFF' : '#7A4E2A');
      node.mark.setVisible(!!cleared);
      node.stars.forEach(function (star, i) {
        star.setVisible(!!cleared);
        star.setTexture(i < stars ? 'prop-star-lit' : 'prop-star-dim');
        var h = i === 1 ? 28 : 22;
        star.setDisplaySize(h, h);
        star._bsx = star.scaleX;
        star._bsy = star.scaleY;
      });
      node.tag.setKind('peach');
    }

    revealCleared(node) {
      var stars = Island.store.starsOf(node.levelId);
      this.paintNode(node, true, true);
      if (!Island.MOTION.calm) {
        node.mark.setScale(0);
        Island.fx.tween(this, node.mark, { scaleX: node.mark._bsx || 1, scaleY: node.mark._bsy || 1 }, { dur: 280, ease: 'Back.easeOut' });
        node.stars.forEach(function (star, i) {
          var sx = star._bsx || star.scaleX;
          var sy = star._bsy || star.scaleY;
          star.setScale(0);
          Island.fx.tween(node.scene, star, { scaleX: sx, scaleY: sy }, { dur: 220, delay: 80 + i * 70, ease: 'Back.easeOut' });
        });
      }
      if (!stars) {
        node.stars.forEach(function (star) { star.setTexture('prop-star-dim'); });
      }
    }

    playUnlock(node) {
      if (!node) return;
      var self = this;
      node.unlocked = true;
      Island.sfx.play('unlock');
      var pop = function () {
        self.paintNode(node, true, false);
        if (!Island.MOTION.calm) {
          node.setScale(0.4);
          Island.fx.tween(self, node, { scaleX: 1, scaleY: 1 }, { dur: 320, ease: 'Back.easeOut' });
        }
        if (self.fresh) self.fresh.destroy();
        self.fresh = Island.ui.tag(self, node.x + 78, node.y - 20, '新关卡！', 'mint');
        self.fresh.setDepth(12);
      };
      if (Island.MOTION.calm) pop();
      else {
        this.tweens.add({
          targets: node,
          scaleX: 1.2,
          scaleY: 1.2,
          duration: 120,
          ease: 'Back.easeIn',
          onComplete: pop
        });
      }
    }

    buildChest() {
      var self = this;
      var open = Island.store.badge();
      var img = this.add.image(CHEST.x, CHEST.y - 36, open ? 'prop-chest-open' : 'prop-chest-closed').setDepth(6);
      img.setDisplaySize(open ? 150 : 144, open ? 168 : 130);
      var lock = this.add.container(CHEST.nx, CHEST.ny).setDepth(8);
      var face = this.add.image(0, 4, 'ui-node-lock').setDisplaySize(96, 96);
      var icon = this.add.image(0, 0, 'icon-lock').setDisplaySize(34, 34);
      lock.add([face, icon]);
      lock.setSize(96, 96);
      lock.setVisible(!open);
      lock.setInteractive({
        hitArea: Island.hit.rect(lock, 96, 96),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true
      });
      lock.on('pointerdown', function () {
        if (Island.state !== 'IDLE') return;
        Island.sfx.play('wrong');
        if (!Island.MOTION.calm) self.tweens.add({ targets: lock, x: CHEST.nx + 5, yoyo: true, repeat: 2, duration: 45, onComplete: function () { lock.x = CHEST.nx; } });
      });
      img.setInteractive({ useHandCursor: true });
      img.on('pointerdown', function () {
        if (Island.state !== 'IDLE') return;
        Island.sfx.play('press');
        if (open) Island.fx.sparks(self, img.x, img.y - 20, 6);
      });
      this.chest = img;
      this.chestLock = lock;
    }

    buildHud() {
      this.counter = Island.ui.beans(this, 74, 52);
      this.counter.setCount(Island.store.totalStars());
      var title = Island.ui.nametag(this, 640, 52, '电脑小岛', 'peach', 'icon-persimmon', { font: 34, height: 64 });
      this.mute = Island.ui.round(this, 1224, 52, 'speaker', function () {
        if (Island.state !== 'IDLE' && Island.state !== 'PLAY' && Island.state !== 'MODAL') return;
        this.mute.setMutedIcon(Island.sfx.toggle());
      }.bind(this), { states: ['IDLE', 'PLAY', 'MODAL'] });
      this.mute.setMutedIcon(Island.store.muted());
      this.hud.add([this.counter, title, this.mute]);
      Island.layout.watch(this, function (rect) {
        this.counter.alignLeft(rect.left + 24);
        this.counter.y = rect.top + 52;
        title.setPosition(rect.centerX, rect.top + 52);
        this.mute.setHomePosition(rect.right - 56, rect.top + 52);
      });
      if (Island.DEBUG && !Island.QA_TOUR) {
        this._fps = this.add.text(24, 112, '', Island.style(18, '#4A3222')).setOrigin(0, 0.5);
        this.hud.add(this._fps);
        this._fpsT = 0;
      }
    }

    refreshCard() {
      if (this.card) this.card.destroy();
      var i = 0;
      for (; i < Island.LEVELS.length; i++) {
        if (!Island.store.isCleared(Island.LEVELS[i].id)) break;
      }
      if (i >= Island.LEVELS.length) return;
      if (!Island.store.isUnlocked(i)) return;
      var self = this;
      var pos = CARD[i];
      var card = this.add.container(pos.x, pos.y).setDepth(20);
      var panel = Island.ui.slice(this, 'ui-panel-9slice', 0, 0, 330, 200, 48);
      var title = this.add.text(-130, -62, Island.LEVELS[i].name, Island.style(40)).setOrigin(0, 0.5);
      var sub = this.add.text(-128, -12, BLURB[i], Island.bodyStyle(21, '#8C6950')).setOrigin(0, 0.5);
      var go = Island.ui.button(this, -70, 52, 150, 66, '出发', function () {
        self.enterLevel(self.nodes[i]);
      }, { states: ['IDLE'], font: 30 });
      card.add([panel, title, sub, go]);
      this.hud.add(card);
      this.card = card;
    }

    goalFeet() {
      for (var i = 0; i < Island.LEVELS.length; i++) {
        if (!Island.store.isCleared(Island.LEVELS[i].id)) return feet(i);
      }
      return { x: CHEST.x - 70, y: CHEST.y + 20 };
    }

    nodeById(id) {
      for (var i = 0; i < this.nodes.length; i++) if (this.nodes[i].levelId === id) return this.nodes[i];
      return null;
    }

    currentNode() {
      for (var i = 0; i < this.nodes.length; i++) {
        if (this.nodes[i].unlocked && !Island.store.isCleared(this.nodes[i].levelId)) return this.nodes[i];
      }
      return null;
    }

    enterLevel(node) {
      var self = this;
      if (!node || Island.state !== 'IDLE') return;
      Island.state = 'TRANSITION';
      this.input.enabled = false;
      var data = { id: node.levelId };
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
        this.tweens.add({ targets: this.flash, alpha: 1, duration: 200, onComplete: go });
        return;
      }
      Island.fx.tween(this, this.hud, { alpha: 0 }, { dur: 200, ease: 'Quad.easeIn' });
      var spot = feet(node.index);
      if (this.lucky) this.lucky.hop(spot.x, spot.y);
      this.time.delayedCall(280, function () {
        if (!self.sys.isActive()) return;
        Island.sfx.play('whooshIn');
        Island.fx.glide(self, 1.6, node.x, node.y, 620, 'Cubic.easeInOut');
      });
      this.time.delayedCall(820, function () {
        if (!self.sys.isActive()) return;
        self.tweens.add({ targets: self.flash, alpha: 1, duration: 120, onComplete: go });
      });
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
          onComplete: function () { self.applyUnlock(node, index); }
        });
        return;
      }
      this.tweens.add({ targets: this.flash, alpha: 0, duration: 120 });
      Island.sfx.play('whooshOut');
      Island.fx.glide(this, 1, 640, 400, 640, 'Cubic.easeInOut');
      this.time.delayedCall(640, function () {
        if (!self.sys.isActive()) return;
        self.hud.setAlpha(0);
        Island.fx.tween(self, self.hud, { alpha: 1 }, { dur: 200, ease: 'Quad.easeOut' });
        if (node) self.revealCleared(node);
      });
      this.time.delayedCall(1000, function () {
        if (!self.sys.isActive()) return;
        if (index >= 0) self.lightPath(index);
      });
      this.time.delayedCall(1400, function () {
        if (!self.sys.isActive()) return;
        var next = self.nodes[index + 1];
        if (next && !next.cleared) self.playUnlock(next);
      });
      this.time.delayedCall(1600, function () {
        if (!self.sys.isActive()) return;
        if (self.lucky) self.lucky.hop(self.goalFeet().x, self.goalFeet().y);
      });
      this.time.delayedCall(2100, function () {
        if (!self.sys.isActive()) return;
        if (just === 'turtle' && Island.store.badge()) self.openCeremony();
        else self.becomeIdle();
      });
    }

    applyUnlock(node, index) {
      if (node) this.revealCleared(node);
      if (index >= 0) this.lightPath(index);
      var next = this.nodes[index + 1];
      if (next && !next.cleared) this.playUnlock(next);
      this.hud.setAlpha(1);
      this.flash.setAlpha(0);
      var spot = this.goalFeet();
      if (this.lucky) this.lucky.root.setPosition(spot.x, spot.y);
      if (this.entry.justCleared === 'turtle' && Island.store.badge()) this.openCeremony();
      else this.becomeIdle();
    }

    openCeremony() {
      var self = this;
      this._ceremony = true;
      Island.state = 'MODAL';
      this.input.enabled = true;
      if (this.card) this.card.setVisible(false);
      this.chest.setTexture('prop-chest-open');
      this.chest.setDisplaySize(150, 168);
      this.chest.setVisible(false);
      this.chestLock.setVisible(false);
      this.nodes.forEach(function (n) {
        n.setVisible(false);
        if (n.tag) n.tag.setVisible(false);
      });
      this.segments.forEach(function (seg) { seg.forEach(function (d) { d.setVisible(false); }); });
      Island.fx.placeCam(this.cameras.main, CHEST.x, CHEST.y + 80, Island.MOTION.calm ? 1 : 1.45);
      var layer = this.add.container(0, 0).setDepth(1200);
      var scrim = this.add.rectangle(640, 400, 1800, 1200, 0xE7F6FB, 0.35);
      var rays = this.add.image(640, 300, 'ui-rays').setDisplaySize(640, 640).setAlpha(0.55);
      var badge = this.add.image(640, 250, 'prop-badge-island').setDisplaySize(180, 228);
      var name = Island.ui.nametag(this, 640, 390, '电脑小岛岛主', 'peach', 'icon-persimmon', { font: 34, height: 64 });
      var line = Island.ui.tag(this, 640, 456, '4 关全通，小岛是你的了！', 'cream');
      var chest = this.add.image(640, 600, 'prop-chest-open').setDisplaySize(230, 250);
      var btn = Island.ui.button(this, 1080, 730, 220, 72, '收下徽章', function () { self._take(); }, { states: ['MODAL'] });
      layer.add([scrim, rays, chest, badge, name, line, btn]);
      this.hud.add(layer);
      if (this.lucky) {
        this.hud.add(this.lucky.root);
        this.lucky.root.setPosition(230, 700);
        this.lucky.setLook({ pose: 'clap', h: 300 });
        this.lucky.happy();
      }
      if (!Island.MOTION.calm) {
        badge.y = 360;
        badge.setScale(0.2);
        Island.fx.tween(this, badge, { y: 250, scaleX: 1, scaleY: 1 }, { dur: 600, ease: 'Cubic.easeOut' });
        this.tweens.add({ targets: rays, angle: 360, duration: 8000, repeat: -1 });
      }
      Island.sfx.play('chord');
      this._take = function () {
        if (!self._ceremony) return;
        self._ceremony = false;
        layer.destroy();
        self.becomeIdle();
      };
    }

    becomeIdle() {
      if (this._done || !this.sys.isActive()) return;
      this._done = true;
      Island.clearWatch();
      Island.fx.placeCam(this.cameras.main, 640, 400, 1);
      this.flash.setAlpha(0);
      this.hud.setAlpha(1);
      Island.state = 'IDLE';
      this.input.enabled = true;
      if (this.counter) this.counter.setCount(Island.store.totalStars());
      var spot = this.goalFeet();
      if (this.lucky) {
        if (this.lucky.root.parentContainer) this.lucky.root.parentContainer.remove(this.lucky.root);
        this.add.existing(this.lucky.root);
        this.lucky.root.setDepth(40);
        this.lucky.setLook({ pose: 'wave', h: 160, flip: false });
        this.lucky.root.setPosition(spot.x, spot.y);
        this.lucky.idle();
      }
      this.nodes.forEach(function (n) {
        n.setVisible(true);
        if (n.tag) n.tag.setVisible(true);
      });
      this.segments.forEach(function (seg) { seg.forEach(function (d) { d.setVisible(true); }); });
      if (this.chest) this.chest.setVisible(true);
      this.refreshCard();
      this.bobNode = this.currentNode();
    }

    finishNow() {
      if (!this.sys || !this.sys.isActive() || this._ceremony) return;
      var just = this.entry.justCleared;
      if (just) {
        var node = this.nodeById(just);
        var index = Island.levelIndex(just);
        if (node && !node.cleared) this.revealCleared(node);
        if (index >= 0) this.lightPath(index);
        var next = this.nodes[index + 1];
        if (next && !next.unlocked) this.playUnlock(next);
        if (Island.store.badge()) {
          this.chest.setTexture('prop-chest-open');
          this.chestLock.setVisible(false);
        }
      }
      this.becomeIdle();
    }

    update(time) {
      Island.fx.pin(this);
      if (this.bobNode && this.bobNode.halo && this.bobNode.halo.visible && !Island.MOTION.calm) {
        var s = 1 + Math.sin(time / 280) * 0.08;
        this.bobNode.halo.setScale(s);
      }
      if (this._fps && time - this._fpsT > 500) {
        this._fpsT = time;
        this._fps.setText(Math.round(this.game.loop.actualFps) + ' fps');
      }
    }
  };
})();
