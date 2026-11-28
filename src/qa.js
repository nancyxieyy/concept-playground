/* 仅 debug=1&qa=tour：定时巡检，不保存进度，不替玩家操作。 */
(function () {
  'use strict';
  var Island = window.Island;
  if (!Island.QA_TOUR) return;
  var screens = [{ name: 'map', scene: 'Map' }];
  Island.LEVELS.forEach(function (cfg) {
    cfg.tasks.forEach(function (_, i) {
      screens.push({ name: cfg.id + '-r' + (i + 1), scene: 'Level', id: cfg.id, round: i + 1 });
    });
  });
  // 初始画面之后补看文件夹内层和展开后的重复卡。
  screens.push({ name: 'files-r3-works', scene: 'Level', id: 'files', round: 3, view: 'works' });
  screens.push({ name: 'files-r3-draw', scene: 'Level', id: 'files', round: 3, view: 'draw' });
  screens.push({ name: 'turtle-r2-controls', scene: 'Level', id: 'turtle', round: 2, view: 'controls' });
  Island.LEVELS.forEach(function (cfg) {
    screens.push({ name: cfg.id + '-result', scene: 'Level', id: cfg.id, result: true });
  });
  var index = 0;
  Island.qa = {
    screens: screens,
    ready: function (scene) {
      var screen = screens[index];
      scene.input.enabled = false;
      if (scene.coach) scene.coach.armed = false;
      if (screen.result) {
        Island.state = 'MODAL';
        scene.won = true;
        scene.lucky.setLook({ pose: 'cheer', h: 300 });
        scene.lucky.root.setPosition(220, 700);
        scene.showCard(3);
      }
      document.title = 'qa:' + screen.name;
      var timer = scene.time.delayedCall(2500, function () {
        index = (index + 1) % screens.length;
        var next = screens[index];
        scene.scene.start(next.scene, { id: next.id, qaScreen: next });
      });
      scene.events.once('shutdown', function () { timer.remove(); });
    }
  };
})();
