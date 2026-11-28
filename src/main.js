/* 启动游戏、键盘和转场看门狗。不改地址栏，不跳页面。 */
(function () {
  'use strict';
  var Island = window.Island;

  Island.armWatch = function (ms, fn) {
    clearTimeout(Island._watch);
    Island._watch = setTimeout(fn, ms || 3000);
  };
  Island.clearWatch = function () {
    clearTimeout(Island._watch);
  };

  Island.sfx.setMuted(Island.store.muted());

  var game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: 1280,
    height: 720,
    backgroundColor: '#3A2618',
    banner: false,
    disableContextMenu: true,
    audio: { noAudio: true },
    fps: { target: 60 },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [Island.BootScene, Island.MapScene, Island.LevelScene]
  });
  Island.game = game;

  window.addEventListener('pointerdown', function () { Island.sfx.unlock(); }, true);
  window.addEventListener('keydown', onKey, true);

  function onKey(e) {
    Island.sfx.unlock();
    if (e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey && (e.key === 'r' || e.key === 'R') && !e.repeat) {
      e.preventDefault();
      Island.store.reset();
      location.reload();
      return;
    }
    if (e.repeat) return;
    if (Island.state === 'TRANSITION') return;
    if (e.key === 'Escape') {
      e.preventDefault();
      if (Island.onEscape) Island.onEscape();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (Island.onConfirm) Island.onConfirm();
    } else if (Island.onArrow && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      Island.onArrow(e.key);
    }
  }
})();
