/* 补间、火花、光环。减少动效时，位移和缩放直接落到终值，淡入不超过 150ms。 */
(function () {
  'use strict';
  var Island = window.Island;
  var MOVE = { x: 1, y: 1, scale: 1, scaleX: 1, scaleY: 1, angle: 1, rotation: 1 };

  function alive(scene) {
    if (!scene || !scene.sys || !scene.sys.settings) return false;
    var st = scene.sys.settings.status;
    return st === 4 || st === 5 || st === 6;
  }

  function tween(scene, target, props, opts) {
    opts = opts || {};
    if (!alive(scene) || !target) return null;
    var dur = opts.dur == null ? 200 : opts.dur;
    var ease = opts.ease || 'Quad.easeOut';
    var done = function () { if (opts.onComplete) opts.onComplete(); };

    var cfg = {
      targets: target,
      duration: dur,
      ease: ease,
      delay: opts.delay || 0,
      yoyo: !!opts.yoyo,
      repeat: opts.repeat || 0,
      onComplete: done
    };
    if (Island.MOTION.calm) {
      Object.keys(props).forEach(function (k) {
        if (!MOVE[k]) return;
        if (k === 'scale') target.setScale(props.scale);
        else target[k] = props[k];
      });
      var rest = {};
      Object.keys(props).forEach(function (k) { if (!MOVE[k]) rest[k] = props[k]; });
      if (!Object.keys(rest).length) {
        if (opts.onComplete) scene.time.delayedCall(16, done);
        return null;
      }
      Object.keys(rest).forEach(function (k) { cfg[k] = rest[k]; });
      cfg.duration = Math.min(dur, 150);
      cfg.ease = 'Linear';
      cfg.delay = Math.min(opts.delay || 0, 40);
      cfg.yoyo = false;
      cfg.repeat = 0;
      return scene.tweens.add(cfg);
    }
    Object.keys(props).forEach(function (k) { cfg[k] = props[k]; });
    return scene.tweens.add(cfg);
  }

  function camCenter(cam) {
    return {
      x: cam.scrollX + cam.width * 0.5,
      y: cam.scrollY + cam.height * 0.5
    };
  }

  function clampZoom(z) {
    var maxZ = Island.ZOOM_MAX || 1.6;
    if (z > maxZ) z = maxZ;
    if (z < 1) z = 1;
    return z;
  }

  function clampCenter(cam, x, y, z) {
    var W = Island.DESIGN.w;
    var H = Island.DESIGN.h;
    var vw = cam.width / z;
    var vh = cam.height / z;
    return {
      x: vw >= W ? W / 2 : Math.max(vw / 2, Math.min(W - vw / 2, x)),
      y: vh >= H ? H / 2 : Math.max(vh / 2, Math.min(H - vh / 2, y))
    };
  }

  function placeCam(cam, x, y, z) {
    z = clampZoom(z);
    var c = clampCenter(cam, x, y, z);
    cam.setZoom(z);
    cam.centerOn(c.x, c.y);
  }

  function glide(scene, zoom, cx, cy, dur, ease, onDone) {
    if (!scene || !scene.cameras) return;
    var cam = scene.cameras.main;
    zoom = clampZoom(zoom);
    var mid = { x: Island.DESIGN.w / 2, y: Island.DESIGN.h / 2 };
    if (Island.MOTION.calm) {
      placeCam(cam, mid.x, mid.y, 1);
      if (scene.time) scene.time.delayedCall(Math.min(dur || 150, 150), function () { if (onDone) onDone(); });
      return;
    }
    var fromZ = cam.zoom || 1;
    var from = camCenter(cam);
    var state = { zoom: fromZ };
    scene.tweens.add({
      targets: state,
      zoom: zoom,
      duration: dur,
      ease: ease || 'Cubic.easeInOut',
      onUpdate: function (tween) {
        var p = tween && typeof tween.progress === 'number' ? tween.progress : 1;
        var z = clampZoom(state.zoom);
        var c = clampCenter(cam, from.x + (cx - from.x) * p, from.y + (cy - from.y) * p, z);
        cam.setZoom(z);
        cam.centerOn(c.x, c.y);
      },
      onComplete: function () {
        if (!scene.sys || !scene.sys.isActive()) return;
        placeCam(cam, cx, cy, zoom);
        if (onDone) onDone();
      }
    });
  }

  function pin(scene) {
    if (!scene.hud) return;
    var cam = scene.cameras.main;
    var z = cam.zoom || 1;
    var left = cam.scrollX + cam.width * 0.5 * (1 - 1 / z);
    var top = cam.scrollY + cam.height * 0.5 * (1 - 1 / z);
    scene.hud.setScale(1 / z);
    scene.hud.x = left;
    scene.hud.y = top + (scene.hudNudge || 0) / z;
    if (scene.flash) {
      scene.flash.setScale(1 / z);
      scene.flash.x = cam.scrollX + cam.width * 0.5;
      scene.flash.y = cam.scrollY + cam.height * 0.5;
    }
  }

  function burst(scene, x, y, key, n, opt) {
    if (!alive(scene) || Island.MOTION.calm) return;
    opt = opt || {};
    for (var i = 0; i < n; i++) {
      var s = scene.add.image(x, y, key);
      s.setDepth(opt.depth || 80);
      var a = Math.random() * Math.PI * 2;
      var d = (opt.min || 40) + Math.random() * ((opt.max || 100) - (opt.min || 40));
      var tint = opt.tint;
      if (tint) s.setTint(tint);
      s.setScale(opt.scale || 1);
      scene.tweens.add({
        targets: s,
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d + (opt.grav || 0),
        alpha: 0,
        angle: (Math.random() * 180 - 90),
        duration: opt.dur || 500,
        ease: 'Quad.easeOut',
        onComplete: function () { s.destroy(); }
      });
    }
  }

  Island.fx = {
    tween: tween,
    glide: glide,
    pin: pin,
    camCenter: camCenter,
    placeCam: placeCam,

    textures: function (scene) {
      function g() { return scene.make.graphics({ add: false }); }
      var star = g();
      var pts = [];
      for (var i = 0; i < 10; i++) {
        var a = -Math.PI / 2 + i * Math.PI / 5;
        var r = i % 2 === 0 ? 28 : 12;
        pts.push(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
      }
      star.fillStyle(0xFFD34D, 1);
      star.lineStyle(4, 0xC98A12, 1);
      star.beginPath();
      star.moveTo(pts[0], pts[1]);
      for (var p = 2; p < pts.length; p += 2) star.lineTo(pts[p], pts[p + 1]);
      star.closePath();
      star.fillPath();
      star.strokePath();
      star.generateTexture('fx-star', 64, 64);
      star.destroy();

      var spark = g();
      spark.fillStyle(0xFFF4E0, 1);
      spark.fillCircle(8, 8, 5);
      spark.generateTexture('fx-spark', 16, 16);
      spark.destroy();

      var dust = g();
      dust.fillStyle(0xC4A574, 1);
      dust.fillEllipse(10, 8, 16, 10);
      dust.generateTexture('fx-dust', 20, 16);
      dust.destroy();

      var conf = g();
      conf.fillStyle(0xF08A24, 1);
      conf.fillRoundedRect(0, 0, 14, 10, 2);
      conf.generateTexture('fx-conf', 14, 10);
      conf.destroy();

      var dot = g();
      dot.fillStyle(0xFFFFFF, 1);
      dot.fillCircle(6, 6, 5);
      dot.generateTexture('fx-dot', 12, 12);
      dot.destroy();
    },

    ring: function (scene, x, y) {
      if (!alive(scene) || Island.MOTION.calm) return;
      var c = scene.add.circle(x, y, 10, 0xFFF4E0, 0);
      c.setStrokeStyle(4, 0xFFF4E0, 0.85);
      c.setDepth(90);
      scene.tweens.add({
        targets: c,
        scaleX: 4,
        scaleY: 4,
        alpha: 0,
        duration: 220,
        ease: 'Quad.easeOut',
        onComplete: function () { c.destroy(); }
      });
    },

    sparks: function (scene, x, y, n) {
      burst(scene, x, y, 'fx-spark', n || 5, { min: 20, max: 54, dur: 280, scale: 1 });
    },

    stars: function (scene, x, y, n) {
      var key = scene.textures.exists('prop-star-lit') ? 'prop-star-lit' : 'fx-star';
      burst(scene, x, y, key, n || 8, { min: 50, max: 110, dur: 500, scale: key === 'prop-star-lit' ? 0.16 : 0.45 });
    },

    dust: function (scene, x, y) {
      burst(scene, x, y, 'fx-dust', 6, { min: 16, max: 46, dur: 600, grav: 18, scale: 1 });
    },

    confetti: function (scene, x, y) {
      if (!alive(scene) || Island.MOTION.calm) return;
      var colors = [0xF08A24, 0xBFE6CF, 0xFFE3D3, 0x6FB7D6, 0xF7CF6B, 0xF6A96B, 0x8FB58A];
      for (var i = 0; i < 30; i++) {
        var s = scene.add.image(x, y, 'fx-conf');
        s.setTint(colors[i % colors.length]);
        s.setDepth(120);
        s.setAngle(Math.random() * 360);
        var dx = (Math.random() - 0.5) * 520;
        scene.tweens.add({
          targets: s,
          x: x + dx,
          y: y + 80 + Math.random() * 280,
          angle: s.angle + (Math.random() * 240 - 120),
          alpha: 0,
          duration: 600 + Math.random() * 300,
          ease: 'Quad.easeOut',
          delay: Math.random() * 80,
          onComplete: function () { s.destroy(); }
        });
      }
    },

    halo: function (scene, obj) {
      if (!alive(scene) || !obj || !obj.getBounds) return null;
      var b = obj.getBounds();
      var ring = scene.textures.exists('ui-halo-yellow')
        ? scene.add.image(b.centerX, b.centerY, 'ui-halo-yellow').setDisplaySize(Math.max(180, b.width + 36), Math.max(180, b.height + 36))
        : scene.add.ellipse(b.centerX, b.centerY, Math.max(80, b.width + 28), Math.max(80, b.height + 28)).setStrokeStyle(8, 0xFFE9A8, 1).setFillStyle(0xFFE9A8, 0.18);
      ring.setDepth((obj.depth || 10) + 1);
      var sx = ring.scaleX || 1;
      var sy = ring.scaleY || 1;
      if (Island.MOTION.calm) {
        scene.time.delayedCall(1200, function () { ring.destroy(); });
        return ring;
      }
      scene.tweens.add({
        targets: ring,
        scaleX: sx * 1.15,
        scaleY: sy * 1.15,
        duration: 400,
        yoyo: true,
        repeat: 2,
        ease: 'Sine.easeInOut',
        onComplete: function () { ring.destroy(); }
      });
      return ring;
    },

    blink: function (scene, obj) {
      if (!alive(scene) || !obj) return;
      if (Island.MOTION.calm) {
        obj.setAlpha(1);
        return;
      }
      var start = obj.alpha == null ? 1 : obj.alpha;
      scene.tweens.add({
        targets: obj,
        alpha: 0.4,
        duration: 350,
        yoyo: true,
        repeat: 2,
        ease: 'Sine.easeInOut',
        onComplete: function () { obj.setAlpha(start || 1); }
      });
    },

    shakeBack: function (scene, obj, home, onDone) {
      if (!alive(scene) || !obj) { if (onDone) onDone(); return; }
      home = home || { x: obj.x, y: obj.y };
      if (Island.MOTION.calm) {
        obj.x = home.x;
        obj.y = home.y;
        obj.setScale(obj._bsx || 1, obj._bsy || 1);
        if (onDone) onDone();
        return;
      }
      var steps = [10, -10, 8];
      var i = 0;
      var next = function () {
        if (!alive(scene)) return;
        if (i >= steps.length) {
          tween(scene, obj, { x: home.x, y: home.y }, {
            dur: 380,
            ease: 'Back.easeOut',
            onComplete: onDone
          });
          return;
        }
        var dx = steps[i++];
        tween(scene, obj, { x: home.x + dx }, { dur: 70, ease: 'Sine.easeInOut', onComplete: next });
      };
      next();
    },

    pop: function (scene, obj, delay, base) {
      if (!obj) return;
      var bx = obj._bsx != null ? obj._bsx : (obj.scaleX > 0.01 ? obj.scaleX : (base || 1));
      var by = obj._bsy != null ? obj._bsy : (obj.scaleY > 0.01 ? obj.scaleY : (base || 1));
      obj.setScale(0);
      tween(scene, obj, { scaleX: bx, scaleY: by }, {
        dur: 240,
        delay: delay || 0,
        ease: 'Back.easeOut'
      });
    },

    screenOf: function (scene, x, y) {
      var cam = scene.cameras.main;
      var z = cam.zoom || 1;
      return {
        x: (x - (cam.scrollX + cam.width * 0.5)) * z + cam.width * 0.5,
        y: (y - (cam.scrollY + cam.height * 0.5)) * z + cam.height * 0.5
      };
    }
  };
})();
