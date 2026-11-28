/* 拖拽：按下先有反馈，超过 6 像素才算拖，松手吸附或弹回。 */
(function () {
  'use strict';
  var Island = window.Island;
  var live = [];

  function nearest(list, x, y) {
    var best = null;
    var bestD = Infinity;
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (t.accept === false) continue;
      var magnet = t.magnet || 64;
      var d = Math.hypot(t.x - x, t.y - y);
      if (d <= magnet && d < bestD) {
        best = t;
        bestD = d;
      }
    }
    return best;
  }

  Island.drag = {
    live: live,
    busy: false,
    just: false,
    make: function (scene, obj, opt) {
      opt = opt || {};
      obj._bsx = obj.scaleX || 1;
      obj._bsy = obj.scaleY || 1;
      obj._homeX = obj.x;
      obj._homeY = obj.y;
      var hw = opt.hw || 60;
      var hh = opt.hh || 50;
      var hit = opt.hit || Island.hit.rect(obj, hw * 2, hh * 2);
      if (opt.circle) {
        obj.setInteractive({
          hitArea: Island.hit.circle(obj, opt.circle),
          hitAreaCallback: Phaser.Geom.Circle.Contains,
          useHandCursor: true
        });
      } else {
        obj.setInteractive({
          hitArea: hit,
          hitAreaCallback: Phaser.Geom.Rectangle.Contains,
          useHandCursor: true
        });
      }
      var st = {
        scene: scene,
        obj: obj,
        opt: opt,
        down: false,
        dragging: false,
        sx: 0,
        sy: 0,
        tx: obj.x,
        ty: obj.y,
        ox: obj.x,
        oy: obj.y,
        px: obj.x,
        travel: 0,
        hot: null,
        step: function () {}
      };

      function targets() {
        var list = opt.targets ? opt.targets() : [];
        return list || [];
      }

      function breathe(on) {
        var list = targets();
        for (var i = 0; i < list.length; i++) {
          var t = list[i];
          if (!t.obj) continue;
          scene.tweens.killTweensOf(t.obj);
          if (on && !Island.MOTION.calm) {
            scene.tweens.add({
              targets: t.obj,
              scaleX: (t.obj._bsx || t.obj.scaleX || 1) * 1.04,
              scaleY: (t.obj._bsy || t.obj.scaleY || 1) * 1.04,
              duration: 360,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut'
            });
          } else if (t.obj._bsx) {
            t.obj.setScale(t.obj._bsx, t.obj._bsy);
          }
        }
      }

      obj.on('pointerover', function () {
        if (Island.state !== 'PLAY' || st.dragging) return;
        Island.sfx.hover(opt.key || 'drag');
        if (!Island.MOTION.calm) obj.y = obj._homeY - 4;
        obj.setScale(obj._bsx * (Island.MOTION.calm ? 1.03 : 1.06), obj._bsy * (Island.MOTION.calm ? 1.03 : 1.06));
      });
      obj.on('pointerout', function () {
        if (st.dragging || st.down) return;
        obj.y = obj._homeY;
        obj.setScale(obj._bsx, obj._bsy);
      });
      obj.on('pointerdown', function (p) {
        if (Island.state !== 'PLAY' || scene.locked || scene.won || (opt.enabled && !opt.enabled())) return;
        if (Island.DEBUG) Island._inAt = performance.now();
        Island.sfx.play('press');
        obj.setScale(obj._bsx * 0.92, obj._bsy * 0.92);
        if (Island.DEBUG && Island._inAt) {
          var t0 = Island._inAt;
          Island._inAt = 0;
          requestAnimationFrame(function () {
            console.log('pointerdown → 视觉 ' + (performance.now() - t0).toFixed(1) + 'ms');
          });
        }
        st.down = true;
        st.dragging = false;
        st.sx = p.worldX;
        st.sy = p.worldY;
        st.ox = obj._homeX;
        st.oy = obj._homeY;
        st.tx = obj.x;
        st.ty = obj.y;
        st.px = obj.x;
        st.py = obj.y;
        st.travel = 0;
        st.hot = null;
      });

      st.onMove = function (p) {
        if (!st.down) return;
        var dx = p.worldX - st.sx;
        var dy = p.worldY - st.sy;
        if (!st.dragging && dx * dx + dy * dy >= 36) {
          st.dragging = true;
          Island.drag.busy = true;
          obj._depth0 = obj.depth || 0;
          obj.setDepth(200);
          Island.sfx.play('lift');
          var grab = Island.PACK && Island.PACK['ui-cursor-grab'];
          scene.input.setDefaultCursor(grab ? 'url("' + grab + '") 16 16, grabbing' : 'grabbing');
          if (obj.input) obj.input.cursor = 'grabbing';
          if (scene.coach && scene.coach.hints && !scene.challenge) breathe(true);
          if (opt.onLift) opt.onLift(obj);
        }
        if (!st.dragging) return;
        st.tx = p.worldX;
        st.ty = p.worldY - 20;
      };
      st.onUp = function (p) {
        if (!st.down) return;
        st.down = false;
        scene.input.setDefaultCursor('default');
        if (obj.input) obj.input.cursor = 'pointer';
        breathe(false);
        if (!st.dragging) {
          obj.setScale(obj._bsx, obj._bsy);
          obj.y = st.oy;
          Island.sfx.play('click');
          Island.fx.ring(scene, p.worldX, p.worldY);
          if (opt.onClick) opt.onClick(obj, p);
          return;
        }
        st.dragging = false;
        Island.drag.just = true;
        Island.drag.busy = true;
        scene.time.delayedCall(40, function () {
          Island.drag.just = false;
          Island.drag.busy = false;
        });
        obj.setDepth(obj._depth0 || 20);
        var hitTarget = nearest(targets(), obj.x, obj.y);
        obj.rotation = 0;
        if (hitTarget) {
          Island.sfx.play('drop');
          var land = function () {
            if (opt.onDrop) opt.onDrop(hitTarget, obj);
          };
          if (Island.MOTION.calm) {
            obj.x = hitTarget.x;
            obj.y = hitTarget.y;
            obj.setScale(obj._bsx, obj._bsy);
            land();
            return;
          }
          Island.fx.tween(scene, obj, { x: hitTarget.x, y: hitTarget.y, scaleX: obj._bsx, scaleY: obj._bsy }, {
            dur: 220,
            ease: 'Back.easeOut',
            onComplete: function () {
              obj.setScale(obj._bsx * 1.06, obj._bsy * 0.85);
              Island.fx.tween(scene, obj, { scaleX: obj._bsx, scaleY: obj._bsy }, { dur: 120, ease: 'Back.easeOut' });
              Island.fx.dust(scene, hitTarget.x, hitTarget.y + 20);
              if (hitTarget.obj && !Island.MOTION.calm) {
                hitTarget.obj.setScale((hitTarget.obj._bsx || 1) * 1.06, (hitTarget.obj._bsy || 1) * 1.06);
                Island.fx.tween(scene, hitTarget.obj, {
                  scaleX: hitTarget.obj._bsx || 1,
                  scaleY: hitTarget.obj._bsy || 1
                }, { dur: 140, ease: 'Back.easeOut' });
              }
              land();
            }
          });
        } else {
          var home = { x: st.ox, y: st.oy };
          var kind = opt.onReject ? opt.onReject(obj) : null;
          if (kind === 'demo') {
            obj.setScale(obj._bsx, obj._bsy);
            return;
          }
          Island.fx.shakeBack(scene, obj, home, function () {
            obj.setScale(obj._bsx, obj._bsy);
            obj.rotation = 0;
          });
        }
      };

      scene.input.on('pointermove', st.onMove);
      scene.input.on('pointerup', st.onUp);
      function dropListeners() {
        if (st._gone) return;
        st._gone = true;
        if (scene.input) {
          scene.input.off('pointermove', st.onMove);
          scene.input.off('pointerup', st.onUp);
        }
        var i = live.indexOf(st);
        if (i >= 0) live.splice(i, 1);
      }
      scene.events.once('shutdown', function () {
        dropListeners();
        Island.drag.busy = false;
        Island.drag.just = false;
        scene.input.setDefaultCursor('default');
      });
      obj.once('destroy', dropListeners);

      st.step = function () {
        if (!st.dragging) return;
        var k = Island.MOTION.calm ? 1 : 0.35;
        var nx = obj.x + (st.tx - obj.x) * k;
        var ny = obj.y + (st.ty - obj.y) * k;
        var vx = nx - st.px;
        st.travel += Math.hypot(nx - obj.x, ny - obj.y);
        if (st.travel > 48) {
          st.travel = 0;
          Island.sfx.play('tick');
        }
        obj.x = nx;
        obj.y = ny;
        if (!Island.MOTION.calm) {
          var stretch = Math.min(0.15, Math.abs(vx) * 0.02);
          obj.setScale(obj._bsx * (1.12 + stretch), obj._bsy * Math.max(0.9, 1.12 - stretch));
          obj.rotation = Phaser.Math.Clamp(vx * 0.02, -0.1, 0.1);
        } else {
          obj.setScale(obj._bsx * 1.04, obj._bsy * 1.04);
        }
        st.px = nx;
        var list = targets();
        var hot = nearest(list, obj.x, obj.y);
        if (hot !== st.hot) {
          if (st.hot && st.hot.obj) st.hot.obj.setScale(st.hot.obj._bsx || 1, st.hot.obj._bsy || 1);
          st.hot = hot;
          if (hot) {
            Island.sfx.play('magnet');
            if (hot.obj) hot.obj.setScale((hot.obj._bsx || 1) * 1.08, (hot.obj._bsy || 1) * 1.08);
          }
          if (opt.onHoverTarget) opt.onHoverTarget(hot);
        }
      };
      live.push(st);
      scene.events.once('shutdown', function () {
        var i = live.indexOf(st);
        if (i >= 0) live.splice(i, 1);
      });
      return st;
    },

    park: function (obj, x, y) {
      obj.setPosition(x, y);
      obj._homeX = x;
      obj._homeY = y;
      obj.rotation = 0;
    },

    update: function () {
      for (var i = 0; i < live.length; i++) live[i].step();
    }
  };
})();
