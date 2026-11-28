/* 把打包好的图片放进纹理，再进入地图。 */
(function () {
  'use strict';
  var Island = window.Island;

  Island.BootScene = class extends Phaser.Scene {
    constructor() { super('Boot'); }

    create() {
      Island.fx.textures(this);
      var scene = this;
      var pack = Island.PACK || {};
      var keys = Object.keys(pack);
      var left = keys.length;
      function done() {
        if (--left <= 0) scene.scene.start('Map', {});
      }
      if (!left) {
        this.scene.start('Map', {});
        return;
      }
      keys.forEach(function (key) {
        var img = new Image();
        img.onload = function () {
          if (!scene.textures.exists(key)) scene.textures.addImage(key, img);
          done();
        };
        img.onerror = function () {
          console.error('素材没有载入：' + key);
          done();
        };
        img.src = pack[key];
      });
    }
  };
})();
