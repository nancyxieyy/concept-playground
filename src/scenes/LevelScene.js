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
      this.stand = { x: 180, y: 700 };
      var calm = Island.MOTION.calm;
      var cam = this.cameras.main;
      Island.fx.placeCam(cam, 640, 400, calm ? 1 : 1.12);
      this.paint(cfg.bg);
      Island.ui.stage(this);
      this.flash.setAlpha(calm ? 0 : 1);

      this.task = Island.ui.task(this);
      this.task.setText(cfg.tasks[0]);
      this.beads = Island.ui.beads(this, cfg.tasks.length);
      this.home = Island.ui.round(this, 56, 52, 'back', function () { self.exitHome(); }, { states: ['PLAY'] });
      this.hintBtn = Island.ui.round(this, 1144, 52, 'hint', function () {
        if (self.coach) self.coach.useHint();
      }, { states: ['PLAY'] });
      this.mute = Island.ui.round(this, 1224, 52, 'speaker', function () {
        if (Island.state === 'TRANSITION') return;
        var m = Island.sfx.toggle();
        self.mute.setMutedIcon(m);
      }, { states: ['IDLE', 'PLAY', 'MODAL'] });
      this.mute.setMutedIcon(Island.store.muted());
      this.counter = Island.ui.beans(this, 1040, 52);
      this.counter.setCount(Math.max(0, Island.store.totalStars()));
      this.hud.add([this.task, this.beads, this.home, this.hintBtn, this.counter, this.mute]);
      Island.layout.watch(this, function (rect) {
        this.home.setHomePosition(rect.left + 56, rect.top + 52);
        this.beads.setPosition(rect.left + 104, rect.top + 52);
        this.mute.setHomePosition(rect.right - 56, rect.top + 52);
        this.hintBtn.setHomePosition(rect.right - 136, rect.top + 52);
        this.counter.setPosition(rect.right - 240, rect.top + 52);
        this.task.setPosition(rect.centerX, rect.top + 78);
      });

      this.lucky = new Island.Lucky(this, -200, this.stand.y, { h: 250, pose: 'point' });
      this.coach = Island.coach.attach(this, cfg.tuning);
      this.api = this.makeApi();
      Island.IMPL[cfg.id].create(this, cfg);
      this.impl = Island.IMPL[cfg.id];

      if (!calm) {
        Island.fx.glide(this, 1, 640, 400, 380, 'Cubic.easeOut');
        this.tweens.add({ targets: this.flash, alpha: 0, duration: 140 });
      } else {
        this.tweens.add({ targets: this.flash, alpha: 0, duration: 200 });
      }
      // 入场位移作用在任务牌内部，resize 重摆外层不会被旧 tween 拉回。
      var taskParts = this.task.list.slice();
      if (!calm) taskParts.forEach(function (part) {
        var y = part.y;
        part.y -= 118;
        Island.fx.tween(self, part, { y: y }, { dur: 300, delay: 60, ease: 'Back.easeOut' });
      });

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
          Island.fx.placeCam(cam, 640, 400, 1);
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
        setTask: function (text) {
          scene.task.setText(text);
          var i = cfg.tasks.indexOf(text);
          if (i >= 0 && scene.beads) scene.beads.setIndex(i);
        },
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
          if (scene.lucky) scene.lucky.nod();
        },
        say: function (text, tone) { if (scene.lucky) scene.lucky.say(text, tone); },
        placeLucky: function (x, y, look) {
          scene.stand = { x: x, y: y };
          if (look && scene.lucky) scene.lucky.setLook(look);
        },
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
        this.lucky.setLook({ pose: 'cheer', h: 300 });
        this.lucky.root.setPosition(220, 700);
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
      var card = Island.ui.concept(this, this.cfg, stars, function () { self.leave(true); }, function () {
        self.scene.restart({ id: self.cfg.id });
      });
      this._continue = function () { self.leave(true); };
      if (Island.MOTION.calm || !card.slots) {
        this.counter.setCount(total);
        return;
      }
      card.slots.forEach(function (star, i) {
        if (!star._earned) return;
        self.time.delayedCall(860 + i * 300, function () {
          if (!alive(self) || !star.scene) return;
          var tx = self.counter.x - card.root.x;
          var ty = self.counter.y - card.root.y;
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
      Island.fx.glide(this, 1.12, 640, 400, 260, 'Cubic.easeIn');
      this.tweens.add({ targets: this.flash, alpha: 1, duration: 260, onComplete: go });
    }

    paint(name) {
      var key = name === 'porch' ? 'bg-l1' : name === 'storage' ? 'bg-l2' : name === 'hall' ? 'bg-l3' : 'bg-l4';
      Island.layout.background(this, key);
    }

    update(time, delta) {
      Island.fx.pin(this);
      Island.drag.update();
      if (this.coach) this.coach.update(time);
      if (this.impl && this.impl.update) this.impl.update(time, delta);
      if (this._fps && time - this._fpsT > 500) {
        this._fpsT = time;
        this._fps.setText(Math.round(this.game.loop.actualFps) + ' fps');
      }
    }
  };
})();
