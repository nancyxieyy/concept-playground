/* Lucky 用整张图。呼吸、跳跃、挤压都作用在整张上，不做眨眼。 */
(function () {
  'use strict';
  var Island = window.Island;
  var POSE = {
    wave: 'lucky-wave',
    point: 'lucky-point',
    cheer: 'lucky-cheer',
    think: 'lucky-thinking',
    carry: 'lucky-carry-box',
    focus: 'lucky-focused',
    clap: 'lucky-clap',
    walk: 'lucky-walk',
    sleepy: 'lucky-sleepy',
    raise: 'lucky-raise-hand',
    ok: 'lucky-its-ok',
    happy: 'lucky-happy'
  };

  function Lucky(scene, x, y, opt) {
    if (typeof opt === 'number') opt = { h: Math.round(240 * opt) };
    opt = opt || {};
    this.scene = scene;
    this.h = opt.h || 160;
    this.home = opt.pose || 'wave';
    this.flip = !!opt.flip;
    this.mode = 'idle';
    this.root = scene.add.container(x, y).setDepth(40);
    this.shadow = scene.add.ellipse(0, 6, this.h * 0.46, this.h * 0.08, 0x4A3222, 0.25);
    this.sprite = scene.add.image(0, 0, POSE[this.home] || 'lucky-wave');
    this.sprite.setOrigin(0.5, 1);
    this.root.add([this.shadow, this.sprite]);
    this.apply(this.home);
    this.idle();
  }

  Lucky.prototype.apply = function (name) {
    var key = POSE[name] || POSE.wave;
    if (this.sprite.texture.key !== key && this.scene.textures.exists(key)) this.sprite.setTexture(key);
    var frame = this.sprite.frame;
    var w = this.h * (frame.width / frame.height);
    this.sprite.setDisplaySize(w, this.h);
    this.sprite.setFlipX(this.flip);
    this.sprite.setOrigin(0.5, 1);
    this.baseSX = this.sprite.scaleX;
    this.baseSY = this.sprite.scaleY;
    this.shadow.setSize(w * 0.62, this.h * 0.08);
    this.shadow.y = 4;
  };

  Lucky.prototype.squash = function (mx, my) {
    this.sprite.setScale(this.baseSX * mx, this.baseSY * my);
  };

  Lucky.prototype.setLook = function (opt) {
    opt = opt || {};
    if (opt.h) this.h = opt.h;
    if (opt.pose) this.home = opt.pose;
    if (opt.flip != null) this.flip = !!opt.flip;
    this._token = (this._token || 0) + 1;
    this.scene.tweens.killTweensOf(this.sprite);
    this.mode = 'idle';
    this.apply(this.home);
  };

  Lucky.prototype.kill = function () {
    this._token = (this._token || 0) + 1;
    this.scene.tweens.killTweensOf(this.root);
    this.scene.tweens.killTweensOf(this.sprite);
    this.scene.tweens.killTweensOf(this.shadow);
  };

  Lucky.prototype.later = function (ms, mode, fn) {
    var token = this._token || 0;
    var self = this;
    this.scene.time.delayedCall(ms, function () {
      if (!self.scene || self._token !== token || self.mode !== mode) return;
      fn();
    });
  };

  Lucky.prototype.idle = function () {
    this.kill();
    this.mode = 'idle';
    this.apply(this.home);
    this.sprite.setScale(this.baseSX, this.baseSY);
    this.sprite.angle = 0;
    this.root.angle = 0;
    if (Island.MOTION.calm) return;
    this.scene.tweens.add({
      targets: this.sprite,
      scaleY: this.baseSY * 1.03,
      scaleX: this.baseSX * 0.985,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  };

  Lucky.prototype.hop = function (x, y, done) {
    var self = this;
    this.kill();
    this.mode = 'walk';
    this.apply('walk');
    var fromX = this.root.x;
    var fromY = this.root.y;
    var proxy = { t: 0 };
    this.scene.tweens.add({
      targets: proxy,
      t: 1,
      duration: Island.MOTION.calm ? 150 : 420,
      ease: 'Quad.easeInOut',
      onUpdate: function () {
        var t = proxy.t;
        self.root.x = fromX + (x - fromX) * t;
        var base = fromY + (y - fromY) * t;
        var arc = Island.MOTION.calm ? 0 : Math.sin(t * Math.PI) * 46;
        self.root.y = base - arc;
        self.shadow.scaleX = 1 - arc / 120;
      },
      onComplete: function () {
        self.root.setPosition(x, y);
        self.squash(1.12, 0.88);
        Island.fx.tween(self.scene, self.sprite, { scaleX: self.baseSX, scaleY: self.baseSY }, {
          dur: 120,
          ease: 'Back.easeOut',
          onComplete: function () {
            self.idle();
            if (done) done();
          }
        });
      }
    });
  };

  Lucky.prototype.entrance = function (x, y, done) {
    this.root.x = Math.min(this.root.x, -160);
    this.hop(x, y, done);
  };

  Lucky.prototype.happy = function () {
    var self = this;
    this.kill();
    this.mode = 'cheer';
    this.apply('cheer');
    if (Island.MOTION.calm) {
      this.later(400, 'cheer', function () { self.idle(); });
      return;
    }
    var y = this.root.y;
    this.squash(1.08, 0.9);
    this.scene.tweens.add({
      targets: this.root,
      y: y - 60,
      duration: 220,
      ease: 'Quad.easeOut',
      yoyo: true,
      hold: 40,
      onComplete: function () {
        self.root.y = y;
        self.squash(1.12, 0.86);
        Island.fx.tween(self.scene, self.sprite, { scaleX: self.baseSX, scaleY: self.baseSY }, {
          dur: 140,
          ease: 'Back.easeOut',
          onComplete: function () { self.idle(); }
        });
      }
    });
  };

  Lucky.prototype.confused = function () {
    var self = this;
    this.kill();
    this.mode = 'think';
    this.apply('think');
    if (!Island.MOTION.calm) {
      this.sprite.angle = 8;
      Island.fx.tween(this.scene, this.sprite, { angle: 0 }, { dur: 500, ease: 'Sine.easeInOut' });
    }
    this.later(1200, 'think', function () { self.idle(); });
  };

  Lucky.prototype.hint = function (text) {
    this.kill();
    this.mode = 'raise';
    this.apply('raise');
    if (text) this.say(text, 'hint', 1800);
    var self = this;
    this.later(1800, 'raise', function () { self.idle(); });
  };

  Lucky.prototype.yawn = function () {
    this.kill();
    this.mode = 'sleepy';
    this.apply('sleepy');
    var self = this;
    this.later(1400, 'sleepy', function () { self.idle(); });
  };

  Lucky.prototype.nod = function () {
    if (Island.MOTION.calm) return;
    this.scene.tweens.add({ targets: this.sprite, angle: 8, yoyo: true, duration: 120 });
  };

  Lucky.prototype.say = function (text, tone) {
    if (!text) return;
    if (this.bubble) this.bubble.destroy();
    var hint = tone === 'hint';
    var b = Island.ui.bubble(this.scene, text, hint);
    b.y = -this.h - 62;
    this.root.add(b);
    this.bubble = b;
    Island.fx.tween(this.scene, b, { scaleX: 1, scaleY: 1 }, { dur: 200, ease: 'Back.easeOut' });
    var self = this;
    this.scene.time.delayedCall(1600, function () {
      if (self.bubble !== b) return;
      Island.fx.tween(self.scene, b, { scaleX: 0, scaleY: 0 }, {
        dur: 140,
        onComplete: function () { b.destroy(); if (self.bubble === b) self.bubble = null; }
      });
    });
  };

  Object.defineProperty(Lucky.prototype, 'x', {
    get: function () { return this.root.x; },
    set: function (v) { this.root.x = v; }
  });
  Object.defineProperty(Lucky.prototype, 'y', {
    get: function () { return this.root.y; },
    set: function (v) { this.root.y = v; }
  });

  Lucky.prototype.setScale = function (s) {
    this.root.setScale(s);
  };

  Island.Lucky = Lucky;
  Island.Lucky.textures = function () {};
})();
