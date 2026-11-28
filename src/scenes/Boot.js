/* 生成程序画出来的纹理，然后进入地图。 */
(function () {
  'use strict';
  var Island = window.Island;

  Island.BootScene = class extends Phaser.Scene {
    constructor() { super('Boot'); }
    create() {
      Island.fx.textures(this);
      Island.Lucky.textures(this);
      this.scene.start('Map', {});
    }
  };
})();
