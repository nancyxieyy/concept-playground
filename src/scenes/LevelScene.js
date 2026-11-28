/* 关卡外壳：背景、任务牌、Lucky、结算和返回地图。玩法在 levels 里。 */
(function () {
  'use strict';
  var Island = window.Island;
  var P = Island.PAL;

  function alive(scene) {
    return !!(scene && scene.sys && scene.sys.isActive());
  }

  Island.LevelScene = class extends Phaser.Scene {
    constructor() { super('Level'); }

    init(data) {
      this.levelId = data && data.id;
      this.cfg = null;
      var list = Island.LEVELS;
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === this.levelId) this.cfg = list[i];
      }
    }

    create() {
      var self = this;
      var cfg = this.cfg;
      Island.clearWatch();
      if (!cfg || !Island.IMPL[cfg.id]) {
        this.scene.start('Map', {});
        return;
      }
      Island.state = 'TRANSITION';
      this.input.enabled = false;
      this.input.topOnly = true;
      this.won = false;
      this.locked = false;
      this._left = false;
      this.stand = { x: 220, y: 590 };
      var calm = Island.MOTION.calm;
      var cam = this.cameras.main;
      if (!calm) cam.setZoom(1.5);
      cam.centerOn(640, 360);
      this.paint(cfg.bg);
      Island.ui.stage(this);
      this.flash.setAlpha(calm ? 0 : 1);

      this.task = Island.ui.task(this, 640, -80);
      this.task.setText(cfg.tasks[0]);
      this.home = Island.ui.round(this, 56, 56, 'home', function () { self.exitHome(); }, { states: ['PLAY'] });
      this.hintBtn = Island.ui.round(this, 1100, 56, 'hint', function () {
        if (self.coach) self.coach.useHint();
      }, { states: ['PLAY'] });
      this.mute = Island.ui.round(this, 1216, 56, 'speaker', function () {
        if (Island.state === 'TRANSITION') return;
        var m = Island.sfx.toggle();
        self.mute.setMutedIcon(m);
      }, { states: ['IDLE', 'PLAY', 'MODAL'] });
      this.mute.setMutedIcon(Island.store.muted());
      this.counter = Island.ui.stars(this, 980, 56);
      this.counter.setCount(Math.max(0, Island.store.totalStars()));
      this.counter.setVisible(false);
      this.hud.add([this.task, this.home, this.hintBtn, this.counter, this.mute]);

      this.lucky = new Island.Lucky(this, -200, this.stand.y, 0.65);
      this.coach = Island.coach.attach(this, cfg.tuning);
      this.api = this.makeApi();
      Island.IMPL[cfg.id].create(this, cfg);
      this.impl = Island.IMPL[cfg.id];

      if (!calm) {
        Island.fx.glide(this, 1, 640, 360, 380, 'Cubic.easeOut');
        this.tweens.add({ targets: this.flash, alpha: 0, duration: 140 });
      } else {
        this.tweens.add({ targets: this.flash, alpha: 0, duration: 200 });
      }
      Island.fx.tween(this, this.task, { y: 48 }, { dur: 300, delay: 60, ease: 'Back.easeOut' });

      this.time.delayedCall(calm ? 40 : 160, function () {
        if (!alive(self)) return;
        self.lucky.entrance(self.stand.x, self.stand.y);
      });
      this.time.delayedCall(calm ? 220 : 380, function () {
        if (!alive(self)) return;
        Island.state = 'PLAY';
        self.input.enabled = true;
        self.coach.arm();
      });

      var esc = function () { self.exitHome(); };
      var confirm = function () {
        if (Island.state === 'MODAL' && self._continue) self._continue();
        else if (Island.state === 'PLAY' && self.api.onRun) self.api.onRun();
      };
      Island.onEscape = esc;
      Island.onConfirm = confirm;
      Island.forceReady = function () {
        if (Island.state === 'TRANSITION' && alive(self)) {
          Island.state = 'PLAY';
          self.input.enabled = true;
          cam.setZoom(1);
          cam.centerOn(640, 360);
          self.flash.setAlpha(0);
        }
      };
      Island.armWatch(4000, function () {
        if (Island.state === 'TRANSITION' && Island.forceReady) Island.forceReady();
      });
      this.events.once('shutdown', function () {
        if (Island.onEscape === esc) Island.onEscape = null;
        if (Island.onConfirm === confirm) Island.onConfirm = null;
        Island.onArrow = null;
        if (self.impl && self.impl.destroy) self.impl.destroy();
      });

      if (Island.DEBUG) {
        this._fps = this.add.text(24, 112, '', Island.style(18)).setOrigin(0, 0.5);
        this.hud.add(this._fps);
        this._fpsT = 0;
      }
    }

    makeApi() {
      var scene = this;
      var cfg = this.cfg;
      return {
        onRun: null,
        playable: function () {
          return Island.state === 'PLAY' && !scene.won && !scene.locked;
        },
        setTask: function (text) { scene.task.setText(text); },
        setStep: function (opt) {
          opt = opt || {};
          scene.coach.goal = opt.goal || null;
          scene.coach.hintLine = opt.hint || '';
          scene.coach.demo = opt.demo || null;
          scene.coach.touch();
        },
        miss: function (text) { return scene.coach.miss(text); },
        good: function (x, y) {
          scene.coach.streak = 0;
          scene.coach.touch();
          Island.sfx.play('ok');
          Island.fx.stars(scene, x, y, 8);
          scene.task.bump();
          if (scene.lucky) scene.lucky.happy();
        },
        say: function (text, tone) { if (scene.lucky) scene.lucky.say(text, tone); },
        placeLucky: function (x, y) { scene.stand = { x: x, y: y }; },
        intro: function (list) {
          list.forEach(function (o, i) {
            if (!o) return;
            var sx = o.scaleX || 1;
            o._bsx = o._bsx || sx;
            o._bsy = o._bsy || o.scaleY || 1;
            Island.fx.pop(scene, o, 80 + i * 40, o._bsx || 1);
          });
        },
        win: function () { scene.win(); }
      };
    }

    win() {
      if (this.won) return;
      this.won = true;
      var stars = this.coach.stars();
      Island.store.clearLevel(this.cfg.id, stars, this.coach.misses, this.coach.hints);
      Island.state = 'MODAL';
      this.input.enabled = true;
      Island.sfx.play('win');
      Island.fx.confetti(this, 640, 240);
      if (this.lucky) {
        this.lucky.setScale(0.9);
        this.lucky.base = 0.9;
        this.lucky.happy();
      }
      this.task.bump();
      var self = this;
      this.time.delayedCall(Island.MOTION.calm ? 40 : 240, function () {
        if (!alive(self)) return;
        self.showCard(stars);
      });
    }

    showCard(stars) {
      var self = this;
      this.home.setVisible(false);
      this.hintBtn.setVisible(false);
      this.task.setVisible(false);
      this.counter.setVisible(true);
      var total = Island.store.totalStars();
      var shown = Math.max(0, total - stars);
      this.counter.setCount(shown);
      var card = Island.ui.concept(this, this.cfg, stars, function () { self.leave(true); });
      this._continue = function () { self.leave(true); };
      if (Island.MOTION.calm || !card.slots) {
        this.counter.setCount(total);
        return;
      }
      card.slots.forEach(function (star, i) {
        self.time.delayedCall(860 + i * 300, function () {
          if (!alive(self) || !star.scene) return;
          var tx = self.counter.x - 640;
          var ty = self.counter.y - 340;
          Island.fx.tween(self, star, { x: tx, y: ty }, {
            dur: 600,
            ease: 'Cubic.easeIn',
            onComplete: function () {
              star.setVisible(false);
              shown += 1;
              self.counter.setCount(shown);
              self.counter.bump();
            }
          });
        });
      });
    }

    exitHome() {
      if (Island.state !== 'PLAY' || this.won) return;
      this.leave(false);
    }

    leave(cleared) {
      if (this._left) return;
      if (!alive(this)) return;
      this._left = true;
      Island.state = 'TRANSITION';
      this.input.enabled = false;
      var data = { from: this.cfg.id, justCleared: cleared ? this.cfg.id : null };
      var self = this;
      Island.armWatch(3000, function () {
        if (Island.game && Island.game.scene.isActive('Level')) {
          Island.game.scene.start('Map', data);
        }
      });
      var go = function () {
        if (!alive(self)) return;
        self.scene.start('Map', data);
      };
      Island.sfx.play('whooshOut');
      if (Island.MOTION.calm) {
        this.tweens.add({ targets: this.flash, alpha: 1, duration: 200, onComplete: go });
        return;
      }
      Island.fx.glide(this, 0.8, 640, 360, 260, 'Cubic.easeIn');
      this.tweens.add({ targets: this.flash, alpha: 1, duration: 260, onComplete: go });
    }

    paint(name) {
      var g = this.add.graphics().setDepth(0);
      if (name === 'porch') this.paintPorch(g);
      else if (name === 'storage') this.paintStorage(g);
      else if (name === 'hall') this.paintHall(g);
      else this.paintBeach(g);
      this.addClouds();
    }

    paintPorch(g) {
      g.fillGradientStyle(P.skyTop, P.skyTop, P.skyBot, P.skyBot);
      g.fillRect(-1600, -1400, 4600, 1900);
      g.fillStyle(0xE7C89A, 1);
      g.fillRect(-1600, 470, 4600, 1600);
      g.fillStyle(0xF3DCB4, 1);
      g.fillRect(-1600, 470, 4600, 10);
      g.lineStyle(3, P.woodDeep, 0.35);
      for (var x = -200; x < 1500; x += 48) {
        g.beginPath();
        g.moveTo(x, 480);
        g.lineTo(x, 900);
        g.strokePath();
      }
      g.fillStyle(P.cream, 1);
      g.fillRoundedRect(760, 120, 620, 390, 18);
      g.lineStyle(4, P.ink, 1);
      g.strokeRoundedRect(760, 120, 620, 390, 18);
      g.fillStyle(P.wood, 1);
      g.fillRect(760, 150, 18, 340);
      var win = this.add.circle(900, 250, 36, P.skyBot).setStrokeStyle(4, P.ink).setDepth(2);
      Island.ui.decor(this, win, ['PLAY']);
    }

    paintStorage(g) {
      g.fillGradientStyle(0xF6E2C0, 0xF6E2C0, 0xE7C89A, 0xE7C89A);
      g.fillRect(-1600, -1400, 4600, 3200);
      g.fillStyle(P.woodDeep, 1);
      g.fillRect(-200, 250, 1500, 18);
      g.fillStyle(P.wood, 1);
      g.fillRect(180, 268, 16, 80);
      g.fillRect(1080, 268, 16, 80);
      g.fillStyle(0xC4A574, 1);
      g.fillRect(-1600, 500, 4600, 1400);
      g.fillStyle(0xE7C89A, 1);
      g.fillRect(-1600, 500, 4600, 8);
    }

    paintHall(g) {
      g.fillStyle(P.cream, 1);
      g.fillRect(-1600, -1400, 4600, 2000);
      g.fillStyle(P.skyBot, 1);
      g.fillRect(-1600, 430, 4600, 1400);
      var light = true;
      for (var y = 440; y < 820; y += 52) {
        light = !light;
        for (var x = -40; x < 1400; x += 52) {
          light = !light;
          g.fillStyle(light ? P.cream : 0xD5E3EA, 1);
          g.fillRect(x, y, 52, 52);
        }
      }
      g.lineStyle(3, P.ink, 0.2);
      g.strokeRect(-40, 430, 1400, 400);
      var sink = this.add.ellipse(1040, 360, 120, 64, 0xD5E3EA).setStrokeStyle(4, P.ink).setDepth(2);
      this.add.rectangle(1040, 300, 16, 50, P.lock).setStrokeStyle(3, P.ink).setDepth(2);
      Island.ui.decor(this, sink, ['PLAY']);
    }

    paintBeach(g) {
      g.fillGradientStyle(P.skyTop, P.skyTop, P.skyBot, P.skyBot);
      g.fillRect(-1600, -1400, 4600, 1750);
      g.fillStyle(P.sea, 1);
      g.fillRect(-1600, 150, 4600, 220);
      g.fillStyle(P.sand, 1);
      g.fillRect(-1600, 300, 4600, 1700);
      g.fillStyle(0xF7E6BE, 1);
      g.fillRect(-1600, 300, 4600, 12);
      g.lineStyle(3, 0xffffff, 0.65);
      g.beginPath();
      g.moveTo(-100, 200);
      for (var x = -100; x < 1500; x += 24) g.lineTo(x, 200 + Math.sin(x * 0.05) * 6);
      g.strokePath();
      this.add.rectangle(1120, 430, 16, 70, P.woodDeep).setStrokeStyle(3, P.ink).setDepth(2);
      var palm = this.add.circle(1120, 380, 36, P.sageDeep).setStrokeStyle(4, P.ink).setDepth(3);
      Island.ui.decor(this, palm, ['PLAY']);
    }

    addClouds() {
      var a = this.add.ellipse(240, 120, 100, 40, 0xffffff, 0.85).setDepth(1);
      var b = this.add.ellipse(980, 90, 130, 46, 0xffffff, 0.8).setDepth(1);
      Island.ui.decor(this, a, ['PLAY']);
      Island.ui.decor(this, b, ['PLAY']);
      this._clouds = [a, b];
    }

    update(time, delta) {
      Island.fx.pin(this);
      Island.drag.update();
      if (this.coach) this.coach.update(time);
      if (this.impl && this.impl.update) this.impl.update(time, delta);
      if (!Island.MOTION.calm && this._clouds) {
        this._clouds[0].x += delta * 0.012;
        this._clouds[1].x += delta * 0.008;
        if (this._clouds[0].x > 1400) this._clouds[0].x = -80;
        if (this._clouds[1].x > 1400) this._clouds[1].x = -80;
      }
      if (this._fps && time - this._fpsT > 500) {
        this._fpsT = time;
        this._fps.setText(Math.round(this.game.loop.actualFps) + ' fps');
      }
    }
  };
})();
