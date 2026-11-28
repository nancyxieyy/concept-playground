/* 色板、尺寸、字体和全局状态。动画都走 Island.fx，以便统一降级。 */
(function () {
  'use strict';
  var Island = window.Island = window.Island || {};
  var params = new URLSearchParams(location.search);
  var reduce = false;
  try {
    reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { reduce = false; }

  Island.params = params;
  Island.MOTION = { calm: reduce || params.get('calm') === '1' };
  Island.DEBUG = params.get('debug') === '1';
  Island.FONT = 'ZK, "PingFang SC", "Microsoft YaHei", sans-serif';
  Island.BODY = 'NotoSC, "PingFang SC", "Microsoft YaHei", sans-serif';
  Island.state = 'BOOT';
  Island.DESIGN = { w: 1280, h: 800 };
  Island.ZOOM_MAX = 1.6;

  Island.PAL = {
    ink: 0x4A3222,
    inkCss: '#4A3222',
    sub: '#8C6950',
    orange: 0xF08A24,
    orangeDeep: 0xC46A12,
    orangeHot: 0xF59B3D,
    sage: 0x8FB58A,
    sageDeep: 0x5E8A5A,
    wood: 0xA8703F,
    woodDeep: 0x7A4E2A,
    cream: 0xFFF4E0,
    creamCss: '#FFF4E0',
    hint: 0xFFE9A8,
    skyTop: 0x7EC4EE,
    skyBot: 0xCFEAFB,
    grass: 0xB5D98A,
    grassDeep: 0x8FB58A,
    sea: 0x6FC1D6,
    sand: 0xF2D9A0,
    star: 0xFFD34D,
    starEdge: 0xC98A12,
    fur: 0xD9894A,
    ear: 0xF6C9A0,
    cheek: 0xF6A58F,
    scarf: 0x8FB58A,
    lock: 0xB8A898,
    lockBg: 0xE8DCCB,
    shadow: 0x4A3222,
    select: 0x7EC4EE
  };

  Island.style = function (size, color, stroke) {
    var o = {
      fontFamily: Island.FONT,
      fontSize: size + 'px',
      color: color || '#4A3222',
      resolution: 2,
      align: 'center'
    };
    if (stroke === true) {
      o.stroke = '#4A3222';
      o.strokeThickness = 6;
    }
    return o;
  };

  Island.bodyStyle = function (size, color) {
    return {
      fontFamily: Island.BODY,
      fontStyle: 'bold',
      fontSize: size + 'px',
      color: color || '#4A3222',
      resolution: 2,
      align: 'center'
    };
  };

  Island.chars = function (s) {
    return Array.from(String(s || '')).length;
  };

  Island.assertCopy = function (label, text, max) {
    var n = Island.chars(text);
    if (n > max) {
      console.error('[文案超长] ' + label + ' ' + n + '/' + max + ' ' + text);
    }
    return n <= max;
  };

  Island.allow = function (state) {
    return Island.state === state;
  };

  // 容器的命中检测会把指针再加半个宽高，区域要跟着放到同一套坐标里。
  Island.hit = {
    circle: function (obj, r) {
      return new Phaser.Geom.Circle(obj.displayOriginX || 0, obj.displayOriginY || 0, r);
    },
    rect: function (obj, w, h) {
      var ox = obj.displayOriginX || 0;
      var oy = obj.displayOriginY || 0;
      return new Phaser.Geom.Rectangle(ox - w / 2, oy - h / 2, w, h);
    }
  };
})();
