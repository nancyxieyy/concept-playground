/* 启动游戏、键盘和转场看门狗。大人组合键重载当前页面以应用开关。 */
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

  function startGame() {
    var game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game',
      width: Island.DESIGN.w * Island.renderScale,
      height: Island.DESIGN.h * Island.renderScale,
      backgroundColor: '#8FD0EA',
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
  }

  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('40px ZK', '电脑小岛'),
      document.fonts.load('400 28px NotoSC', '电脑小岛'),
      document.fonts.load('700 28px NotoSC', '电脑小岛')
    ]).then(startGame).catch(startGame);
  } else {
    startGame();
  }

  window.addEventListener('pointerdown', function () { Island.sfx.unlock(); }, true);
  window.addEventListener('keydown', onKey, true);

  function toggleParam(name, value) {
    var url = new URL(location.href);
    if (url.searchParams.get(name) === value) url.searchParams.delete(name);
    else url.searchParams.set(name, value);
    location.replace(url.href);
  }

  function onKey(e) {
    Island.sfx.unlock();
    // Option 会改变 e.key 的字符；物理键位在 Mac 上仍然稳定。
    if (e.shiftKey && e.altKey && !e.metaKey && !e.ctrlKey) {
      var switches = { KeyU: ['unlock', 'all'], KeyC: ['calm', '1'], KeyD: ['debug', '1'] };
      var option = switches[e.code];
      if (option) {
        e.preventDefault();
        if (!e.repeat) toggleParam(option[0], option[1]);
        return;
      }
    }
    if (Island.QA_TOUR) return;
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
