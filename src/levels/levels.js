/* 八关文案和坐标。改字只改这里。 */
(function () {
  'use strict';
  var Island = window.Island;
  Island.IMPL = Island.IMPL || {};

  Island.LEVELS = [
    {
      id: 'door',
      name: '开门热身',
      accent: '#F08A24',
      icon: '🚪',
      map: { x: 360, y: 560 },
      bg: 'porch',
      tasks: ['让门打开', '让门打开', '让门打开'],
      concept: { name: '鼠标键盘', line: '单击选中·双击打开·拖动搬走' },
      bubbles: { single: '要点两下哦', door: '门在那边' },
      hints: { star: '点一下星星', gift: '快点两下：咚咚！', key: '把钥匙拖到门上' },
      tuning: { dblMs: 400, magnet: 80, idleHintMs: 20000, wrongToHint: 2, wrongToDemo: 3 }
    },
    {
      id: 'files',
      name: '搬家小队',
      accent: '#8FB58A',
      icon: '📦',
      map: { x: 560, y: 450 },
      bg: 'storage',
      tasks: ['把文件放进对的箱子', '用最少的拖放，全搬走', '找到相册里的小猫'],
      concept: { name: '文件夹和路径', line: '文件夹像书包，路径是一层层的路线' },
      bubbles: {
        music: '它该去「音乐」',
        draw: '它该去「画画」',
        works: '它该去「作品」',
        seek: '跟着箱子走啦',
        layer: '不是这一层'
      },
      hints: { sort: '看看文件名末尾', move: '画画放进作品', path: '按牌子一层层开' },
      tuning: { dblMs: 400, magnet: 110, idleHintMs: 20000, wrongToHint: 2, wrongToDemo: 3 }
    },
    {
      id: 'robot',
      name: '机器人出门',
      accent: '#7EC4EE',
      icon: '🤖',
      map: { x: 820, y: 510 },
      bg: 'hall',
      tasks: ['帮机器人穿鞋', '帮机器人刷牙'],
      concept: { name: '顺序', line: '每一步排好，才能做对' },
      bubbles: {
        socks: '袜子套在鞋外面啦',
        lace: '鞋带系早啦',
        order: '顺序还不对',
        paste: '没开盖，挤到手上啦',
        empty: '先放卡片',
        hint: '先拿牙刷试试'
      },
      hints: { shoe: '先穿袜子哦', brush: '先拿牙刷试试' },
      tuning: { magnet: 72, idleHintMs: 20000, wrongToHint: 2, wrongToDemo: 3 }
    },
    {
      id: 'turtle',
      name: '乌龟画画',
      accent: '#F2D9A0',
      icon: '🐢',
      map: { x: 1020, y: 400 },
      bg: 'beach',
      tasks: ['画一个正方形', '只用一张卡画三角形'],
      concept: { name: '重复', line: '同样的事，说「重复几次」就够' },
      bubbles: { tired: '手好酸…用重复吧', close: '差一点，再数数', more: '再放几张', empty: '先放卡片' },
      hints: { square: '前进右转交替', tri: '转三次，刚好一圈' },
      tuning: { magnet: 70, idleHintMs: 20000, wrongToHint: 2, wrongToDemo: 3 }
    }
  ];

  function extra(id, name, bg, tasks, concept, line) {
    return { id: id, name: name, bg: bg, tasks: tasks,
      concept: { name: concept, line: line }, bubbles: {}, hints: {},
      tuning: { magnet: 70, idleHintMs: 20000, wrongToHint: 2, wrongToDemo: 3 } };
  }
  Island.LEVELS.splice(3, 0,
    extra('debug', '机器人修 bug', 'hall', ['点出错的那一步'], '找错', '先看哪里不对，再改那一步'),
    extra('weather', '看天气出门', 'porch', ['按天气选东西'], '如果…就…', '不同的天气，选不同的东西'));
  Island.LEVELS.push(
    extra('turtlePlus', '乌龟省步数', 'beach', ['它少画了一边', '画一个六边形'], '重复与规律', '转完一圈，图形就合上了'),
    extra('island', '小岛大挑战', 'hill', ['用最少的卡走到旗子'], '一起用', '排好顺序，看路，再重复'));
  var centers = [[268,512],[431,522],[603,522],[752,462],[934,458],[1025,358],[1027,246],[1013,150]];
  var standard = [6,2,4,2,2,1,1,5];
  Island.LEVELS.forEach(function (level, i) {
    level.map = { x: centers[i][0], y: centers[i][1] };
    level.standard = standard[i];
    level.challenge = true;
    level.challengeLimit = standard[i];
    level.stage = i < 2 ? '热身' : i < 6 ? '基础' : '挑战';
    level.optional = i === 7;
  });
  Island.LEVELS[0].challengeLimit = 8;
  Island.LEVELS[2].challengeLimit = 5;

  Island.MAP = {
    dock: { x: 200, y: 640 },
    chest: { x: 1100, y: 300 },
    far: [
      { x: 120, y: 150 },
      { x: 390, y: 118 },
      { x: 690, y: 96 },
      { x: 980, y: 124 },
      { x: 1210, y: 168 }
    ]
  };

  Island.LEVELS.forEach(function (level) {
    level.tasks.forEach(function (text, i) {
      Island.assertCopy(level.id + '.task' + i, text, 15);
    });
    Island.assertCopy(level.id + '.concept', level.concept.line, 20);
    Object.keys(level.bubbles).forEach(function (k) {
      Island.assertCopy(level.id + '.bubble.' + k, level.bubbles[k], 12);
    });
    Object.keys(level.hints).forEach(function (k) {
      Island.assertCopy(level.id + '.hint.' + k, level.hints[k], 12);
    });
  });

  Island.levelIndex = function (id) {
    for (var i = 0; i < Island.LEVELS.length; i++) {
      if (Island.LEVELS[i].id === id) return i;
    }
    return -1;
  };
})();
