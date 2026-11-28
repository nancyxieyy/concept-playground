/* 玩法使用设计坐标，画布像素密度和窗口可见范围在这里换算。 */
(function () {
  'use strict';
  var Island = window.Island;
  // 限制为 2 倍，避免高密度屏上的像素开销无限增长。
  Island.renderScale = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

  Island.layout = {
    visibleRect: function (scene) {
      var canvas = scene.game.canvas.getBoundingClientRect();
      var parent = scene.game.canvas.parentElement.getBoundingClientRect();
      var w = Island.DESIGN.w;
      var h = Island.DESIGN.h;
      var left = Math.max(0, parent.left, canvas.left);
      var top = Math.max(0, parent.top, canvas.top);
      var right = Math.min(window.innerWidth, parent.right, canvas.right);
      var bottom = Math.min(window.innerHeight, parent.bottom, canvas.bottom);
      var x = Math.max(0, (left - canvas.left) * w / canvas.width);
      var y = Math.max(0, (top - canvas.top) * h / canvas.height);
      var r = Math.min(w, (right - canvas.left) * w / canvas.width);
      var b = Math.min(h, (bottom - canvas.top) * h / canvas.height);
      return { left: x, top: y, right: r, bottom: b, centerX: (x + r) / 2, centerY: (y + b) / 2 };
    },

    watch: function (scene, apply) {
      function layout() { apply.call(scene, Island.layout.visibleRect(scene)); }
      scene.scale.on('resize', layout);
      scene.events.once('shutdown', function () { scene.scale.off('resize', layout); });
      layout();
    },

    background: function (scene, key) {
      // 沿用打包图片，直接打开本地文件时也不需要额外读取素材。
      scene.game.canvas.parentElement.style.setProperty('--scene-background', 'url("' + Island.PACK[key] + '")');
      return scene.add.image(0, 0, key).setOrigin(0, 0)
        .setDisplaySize(Island.DESIGN.w, Island.DESIGN.h).setDepth(0);
    }
  };
})();
