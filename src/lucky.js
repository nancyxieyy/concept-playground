/* Lucky 由部件拼成。状态切换前先停掉自己的补间，再把部件复位。 */
(function () {
  'use strict';
  var Island = window.Island;
  var P = Island.PAL;

  function blob(scene, key, w, h, color, opt) {
    opt = opt || {};
    var pad = 8;
    var g = scene.make.graphics({ add: false });
    var cx = w / 2 + pad;
    var cy = h / 2 + pad;
    g.fillStyle(color, opt.alpha == null ? 1 : opt.alpha);
    if (opt.stroke !== false) g.lineStyle(4, P.ink, 1);
    g.fillEllipse(cx, cy, w, h);
    if (opt.stroke !== false) g.strokeEllipse(cx, cy, w, h);
    if (opt.highlight !== false) {
      g.fillStyle(0xffffff, 0.33);
      g.fillEllipse(cx - w * 0.16, cy - h * 0.2, Math.max(6, w * 0.32), Math.max(6, h * 0.26));
    }
    g.generateTexture(key, w + pad * 2, h + pad * 2);
    g.destroy();
  }

  function Lucky(scene, x, y, scale) {
    Phaser.GameObjects.Container.call(this, scene, x, y);
    this.base = scale || 1;
    this.mode = 'idle';
    this._ground = y;
    scene.add.existing(this);
    this.setDepth(40);
    this.setScale(this.base);

    this.rig = scene.add.container(0, 0);
    this.add(this.rig);

    this.tail = scene.add.image(-35, -62, 'lk-tail').setOrigin(1, 0.5);
    this.body = scene.add.image(0, -70, 'lk-body');
    this.belly = scene.add.image(0, -62, 'lk-belly');
    this.footL = scene.add.image(-26, -8, 'lk-foot');
    this.footR = scene.add.image(26, -8, 'lk-foot');
    this.scarf = scene.add.image(0, -118, 'lk-scarf');
    this.pendant = scene.add.image(18, -100, 'lk-pend');
    this.pawL = scene.add.image(-40, -46, 'lk-paw').setOrigin(0.7, 0.3);
    this.pawR = scene.add.image(40, -46, 'lk-paw').setOrigin(0.3, 0.3);

    this.head = scene.add.container(0, -158);
    this.headMain = scene.add.image(0, 0, 'lk-head');
    this.muzzle = scene.add.image(0, 16, 'lk-muzzle');
    this.brow = scene.add.image(0, -20, 'lk-brow');
    this.cheekL = scene.add.image(-44, 12, 'lk-cheek').setAlpha(0.85);
    this.cheekR = scene.add.image(44, 12, 'lk-cheek').setAlpha(0.85);
    this.earL = scene.add.image(-50, -18, 'lk-ear').setOrigin(0.5, 0.92);
    this.earR = scene.add.image(50, -18, 'lk-ear').setOrigin(0.5, 0.92);
    this.eyeL = scene.add.image(-28, -4, 'lk-eye');
    this.eyeR = scene.add.image(28, -4, 'lk-eye');
    this.happyL = scene.add.image(-28, -4, 'lk-happy').setVisible(false);
    this.happyR = scene.add.image(28, -4, 'lk-happy').setVisible(false);
    this.nose = scene.add.image(0, 8, 'lk-nose');
    this.mouth = scene.add.image(0, 22, 'lk-smile');
    this.head.add([
      this.earL, this.earR, this.headMain, this.brow, this.muzzle,
      this.cheekL, this.cheekR, this.eyeL, this.eyeR, this.happyL, this.happyR,
      this.nose, this.mouth
    ]);

    this.rig.add([
      this.tail, this.footL, this.footR, this.body, this.belly,
      this.scarf, this.pendant, this.pawL, this.pawR, this.head
    ]);

    this.shadow = scene.add.ellipse(x, y + 4, 120 * scale, 28 * scale, P.ink, 0.25);
    this.shadow.setDepth(12);

    var self = this;
    this._sync = function () {
      if (!self.scene || !self.shadow) return;
      self.shadow.setPosition(self.x, self.y + 4);
      var lift = Math.max(0, (self._ground || self.y) - self.y);
      var s = 1 - Math.min(0.35, lift / 180);
      self.shadow.setScale(s, s);
      if (self.bubble && self.bubble.visible) {
        self.bubble.setPosition(self.x, self.y - (self.base * 240 + 46));
      }
    };
    scene.events.on('update', this._sync);
    this.on('destroy', function () {
      scene.events.off('update', self._sync);
      if (self.shadow) self.shadow.destroy();
      if (self.bubble) self.bubble.destroy();
    });
    this.bubble = Island.ui.bubble(scene);
    this.idle();
  }

  Lucky.prototype = Object.create(Phaser.GameObjects.Container.prototype);
  Lucky.prototype.constructor = Lucky;

  Lucky.textures = function (scene) {
    if (scene.textures.exists('lk-body')) return;
    blob(scene, 'lk-body', 104, 120, P.fur);
    blob(scene, 'lk-belly', 64, 84, P.cream);
    blob(scene, 'lk-head', 132, 112, P.fur);
    blob(scene, 'lk-muzzle', 76, 54, P.cream);
    blob(scene, 'lk-brow', 20, 50, 0xffffff, { stroke: false });
    blob(scene, 'lk-cheek', 20, 20, P.cheek, { stroke: false, highlight: false });
    blob(scene, 'lk-foot', 34, 22, P.cream);
    blob(scene, 'lk-tail', 34, 22, P.fur);
    blob(scene, 'lk-paw', 28, 20, P.fur);
    blob(scene, 'lk-eye', 14, 14, P.ink, { stroke: false, highlight: false });
    blob(scene, 'lk-nose', 18, 12, P.ink, { stroke: false, highlight: false });
    blob(scene, 'lk-pend', 18, 18, P.orange);

    var g = scene.make.graphics({ add: false });
    g.fillStyle(P.scarf, 1);
    g.lineStyle(4, P.ink, 1);
    g.fillRoundedRect(4, 8, 108, 24, 12);
    g.strokeRoundedRect(4, 8, 108, 24, 12);
    g.generateTexture('lk-scarf', 116, 40);
    g.destroy();

    var ear = scene.make.graphics({ add: false });
    ear.fillStyle(P.fur, 1);
    ear.lineStyle(4, P.ink, 1);
    ear.beginPath();
    ear.moveTo(28, 8);
    ear.lineTo(48, 58);
    ear.lineTo(8, 58);
    ear.closePath();
    ear.fillPath();
    ear.strokePath();
    ear.fillStyle(P.ear, 1);
    ear.fillTriangle(28, 20, 40, 52, 16, 52);
    ear.generateTexture('lk-ear', 56, 68);
    ear.destroy();

    var smile = scene.make.graphics({ add: false });
    smile.lineStyle(4, P.ink, 1);
    smile.beginPath();
    smile.arc(20, 10, 12, 0.15 * Math.PI, 0.85 * Math.PI, false);
    smile.strokePath();
    smile.generateTexture('lk-smile', 40, 28);
    smile.destroy();

    var open = scene.make.graphics({ add: false });
    open.fillStyle(P.ink, 1);
    open.fillEllipse(20, 14, 26, 18);
    open.fillStyle(P.cheek, 1);
    open.fillEllipse(20, 18, 14, 8);
    open.generateTexture('lk-open', 40, 28);
    open.destroy();

    var flat = scene.make.graphics({ add: false });
    flat.lineStyle(4, P.ink, 1);
    flat.beginPath();
    flat.moveTo(8, 14);
    flat.lineTo(32, 14);
    flat.strokePath();
    flat.generateTexture('lk-flat', 40, 28);
    flat.destroy();

    var happy = scene.make.graphics({ add: false });
    happy.lineStyle(4, P.ink, 1);
    happy.beginPath();
    happy.arc(12, 16, 8, Math.PI * 1.15, Math.PI * 1.85, false);
    happy.strokePath();
    happy.generateTexture('lk-happy', 24, 24);
    happy.destroy();
  };

  Lucky.prototype.parts = function () {
    return [
      this.rig, this.tail, this.head, this.earL, this.earR, this.eyeL, this.eyeR,
      this.pawL, this.pawR, this.pendant, this.mouth, this.body
    ];
  };

  Lucky.prototype.killAnims = function () {
    var scene = this.scene;
    if (!scene) return;
    this.parts().forEach(function (p) { scene.tweens.killTweensOf(p); });
    scene.tweens.killTweensOf(this);
  };

  Lucky.prototype.resetParts = function () {
    this.rig.setScale(1);
    this.rig.setAngle(0);
    this.tail.setAngle(0);
    this.head.setAngle(0);
    this.earL.setAngle(0);
    this.earR.setAngle(0);
    this.eyeL.setScale(1);
    this.eyeR.setScale(1);
    this.pawL.setAngle(0);
    this.pawR.setAngle(0);
    this.eyeL.setVisible(true);
    this.eyeR.setVisible(true);
    this.happyL.setVisible(false);
    this.happyR.setVisible(false);
    this.mouth.setTexture('lk-smile');
  };

  Lucky.prototype.idle = function () {
    var scene = this.scene;
    if (!scene) return;
    this.killAnims();
    this.resetParts();
    this.mode = 'idle';
    var self = this;
    if (Island.MOTION.calm) return;
    scene.tweens.add({
      targets: this.rig,
      scaleY: 1.03,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    scene.tweens.add({
      targets: this.tail,
      angle: 12,
      duration: 250,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    scene.tweens.add({
      targets: this.pendant,
      angle: 8,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    var blink = function () {
      if (!self.scene || self.mode !== 'idle') return;
      scene.tweens.add({
        targets: [self.eyeL, self.eyeR],
        scaleY: 0.1,
        duration: 55,
        yoyo: true,
        onComplete: function () {
          if (!self.scene || self.mode !== 'idle') return;
          scene.time.delayedCall(3000 + Math.random() * 2000, blink);
        }
      });
    };
    scene.time.delayedCall(800, blink);
    var ear = function () {
      if (!self.scene || self.mode !== 'idle') return;
      scene.tweens.add({
        targets: [self.earL, self.earR],
        angle: 10,
        duration: 120,
        yoyo: true,
        onComplete: function () {
          if (!self.scene || self.mode !== 'idle') return;
          scene.time.delayedCall(8000 + Math.random() * 4000, ear);
        }
      });
    };
    scene.time.delayedCall(2000, ear);
  };

  Lucky.prototype.face = function (kind) {
    var happy = kind === 'happy';
    this.eyeL.setVisible(!happy);
    this.eyeR.setVisible(!happy);
    this.happyL.setVisible(happy);
    this.happyR.setVisible(happy);
    this.mouth.setTexture(kind === 'happy' ? 'lk-open' : kind === 'flat' ? 'lk-flat' : 'lk-smile');
  };

  Lucky.prototype.say = function (text, tone, hold) {
    if (!text || !this.bubble) return;
    var y = this.y - (this.base * 240 + 46);
    this.bubble.show(this.x, y, text, tone || 'talk', hold || 1500);
  };

  Lucky.prototype.nod = function (done) {
    var scene = this.scene;
    if (!scene || Island.MOTION.calm) { if (done) done(); return; }
    scene.tweens.add({
      targets: this.head,
      angle: 12,
      duration: 160,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: function () { if (done) done(); }
    });
  };

  Lucky.prototype.squat = function (done) {
    var scene = this.scene;
    if (!scene) { if (done) done(); return; }
    if (Island.MOTION.calm) { if (done) done(); return; }
    this.rig.setScale(1.12, 0.88);
    Island.fx.tween(scene, this.rig, { scaleX: 1, scaleY: 1 }, {
      dur: 160, ease: 'Back.easeOut', onComplete: done
    });
  };

  Lucky.prototype.hop = function (x, y, done) {
    var scene = this.scene;
    if (!scene) { if (done) done(); return; }
    if (Math.hypot(x - this.x, y - this.y) < 6) {
      this.squat(done);
      return;
    }
    if (Island.MOTION.calm) {
      this.x = x;
      this.y = y;
      this._ground = y;
      if (done) done();
      return;
    }
    this.killAnims();
    this.mode = 'hop';
    var self = this;
    var x0 = this.x;
    var y0 = this.y;
    var proxy = { t: 0 };
    scene.tweens.add({
      targets: proxy,
      t: 1,
      duration: 280,
      onUpdate: function () {
        var t = proxy.t;
        self.x = x0 + (x - x0) * t;
        self.y = y0 + (y - y0) * t - Math.sin(t * Math.PI) * 40;
        if (t < 0.5) self.rig.setScale(0.94, 1.08);
        else self.rig.setScale(1.12, 0.9);
      },
      onComplete: function () {
        if (!self.scene) return;
        self.x = x;
        self.y = y;
        self._ground = y;
        self.rig.setScale(1.15, 0.85);
        Island.fx.tween(scene, self.rig, { scaleX: 1, scaleY: 1 }, {
          dur: 140,
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
    var self = this;
    if (Island.MOTION.calm) {
      this.x = x;
      this.y = y;
      this._ground = y;
      this.idle();
      if (done) done();
      return;
    }
    var mid = { x: this.x + (x - this.x) * 0.55, y: y };
    this.hop(mid.x, mid.y, function () {
      self.hop(x, y, function () { self.nod(done); });
    });
  };

  Lucky.prototype.happy = function () {
    var scene = this.scene;
    if (!scene) return;
    this.killAnims();
    this.resetParts();
    this.mode = 'happy';
    this.face('happy');
    var self = this;
    if (Island.MOTION.calm) {
      scene.time.delayedCall(400, function () { if (self.mode === 'happy') self.idle(); });
      return;
    }
    var ground = this.y;
    this._ground = ground;
    scene.tweens.add({
      targets: this.tail,
      angle: 20,
      duration: 100,
      yoyo: true,
      repeat: 4,
      ease: 'Sine.easeInOut'
    });
    this.rig.setScale(1.1, 0.88);
    scene.tweens.add({
      targets: this,
      y: ground - 60,
      duration: 220,
      ease: 'Quad.easeOut',
      onUpdate: function () { self.rig.setScale(0.92, 1.12); },
      onComplete: function () {
        scene.tweens.add({
          targets: self,
          y: ground,
          duration: 200,
          ease: 'Quad.easeIn',
          onComplete: function () {
            self.rig.setScale(1.1, 0.88);
            Island.fx.tween(scene, self.rig, { scaleX: 1, scaleY: 1 }, {
              dur: 120,
              ease: 'Back.easeOut',
              onComplete: function () {
                scene.time.delayedCall(700, function () {
                  if (self.mode === 'happy') self.idle();
                });
              }
            });
          }
        });
      }
    });
  };

  Lucky.prototype.confused = function () {
    var scene = this.scene;
    if (!scene) return;
    this.killAnims();
    this.resetParts();
    this.mode = 'confused';
    this.face('flat');
    var self = this;
    if (!Island.MOTION.calm) {
      scene.tweens.add({ targets: this.head, angle: 12, duration: 180, ease: 'Back.easeOut' });
      scene.tweens.add({ targets: this.earR, angle: 22, duration: 180, ease: 'Back.easeOut' });
      this.eyeL.setScale(0.85);
      this.eyeR.setScale(0.85);
    }
    this.say('？', 'ask', 900);
    scene.time.delayedCall(1200, function () {
      if (self.mode === 'confused') self.idle();
    });
  };

  Lucky.prototype.hint = function (text) {
    var scene = this.scene;
    if (!scene) return;
    this.killAnims();
    this.resetParts();
    this.mode = 'hint';
    var self = this;
    if (!Island.MOTION.calm) {
      scene.tweens.add({ targets: this.pawR, angle: -30, duration: 180, ease: 'Back.easeOut' });
    }
    if (text) this.say(text, 'hint', 1800);
    scene.time.delayedCall(1800, function () {
      if (self.mode === 'hint') self.idle();
    });
  };

  Lucky.prototype.yawn = function () {
    var scene = this.scene;
    if (!scene || this.mode === 'happy') return;
    this.mouth.setTexture('lk-open');
    if (Island.MOTION.calm) return;
    scene.tweens.add({
      targets: [this.eyeL, this.eyeR],
      scaleY: 0.25,
      duration: 180,
      yoyo: true,
      hold: 280,
      onComplete: function () {}
    });
  };

  Island.Lucky = Lucky;
})();
