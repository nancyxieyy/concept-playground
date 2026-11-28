const {test}=require('node:test'),assert=require('node:assert/strict');
const {load,sceneFor,source}=require('./planb-harness.cjs');
function clean(e,s){assert.deepEqual(e.errors,[]);assert.ok(s.won,'必须通关');if(s.challenge)assert.equal(s.coach.stars(),3);s.shutdown();assert.equal(e.I.drag.live.length,0);}
test('星级采用新规则：第三星按提示和步数，第二星按失误加提示',()=>{
 const {I}=load(),f=I.rules.stars;
 assert.equal(f(0,0,6,6),3);assert.equal(f(2,0,6,6),3);assert.equal(f(0,0,7,6),2);assert.equal(f(0,1,6,6),2);assert.equal(f(2,1,6,6),1);
});
test('旧进度迁移、顺序锁、七关宝箱与永久金星',()=>{
 const storage={'island2:v1':JSON.stringify({badge:true,muted:true,levels:Object.fromEntries(['door','files','robot','turtle'].map(id=>[id,{cleared:true,stars:3}]))})};
 const {I}=load(storage);assert.ok(I.store.isCleared('turtle'));assert.equal(I.store.badge(),false);assert.equal(I.store.muted(),true);
 assert.equal(I.store.isUnlocked(3),true);assert.equal(I.store.isUnlocked(5),false);
 ['debug','weather','turtlePlus'].forEach(id=>I.store.clearLevel(id,2,0,0,1,false));
 assert.equal(I.store.badge(),true);assert.equal(I.store.isCleared('island'),false);assert.ok(I.store.isUnlocked(7));
 I.store.clearLevel('robot',3,0,0,5,true);I.store.clearLevel('robot',1,4,2,8,false);
 assert.equal(I.store.goldOf('robot'),true);assert.equal(I.store.starsOf('robot'),3);
 const again=load(storage).I;assert.equal(again.store.goldOf('robot'),true);again.store.reset();assert.equal(load(storage).I.store.isCleared('door'),false);
 assert.ok(storage['island2:v1']);
});
test('损坏存档与未知关可安全回退',()=>{
 assert.equal(load({'island2:v2':'bad'}).I.store.totalStars(),0);
 const {I}=load({'island2:v2':JSON.stringify({levels:{door:{cleared:true,stars:100},unknown:{cleared:true,stars:9}}})});
 assert.equal(I.store.totalStars(),3);assert.equal(I.store.isUnlocked(8),false);
});
for(const challenge of [false,true])test('第1关：开门'+(challenge?'与 Shift 金星':''),()=>{
 const e=load(),s=sceneFor(e,'door',challenge);
 s.find(o=>o.key==='prop-star-dim').forEach(o=>s.tap(o));
 const gift=s.find(o=>o.key==='prop-gift-closed')[0];s.tap(gift);s.time.now+=100;s.tap(gift);
 s.drop(s.find(o=>o.key==='prop-key')[0]);s.flush();
 if(challenge){s.input.keyboard.emit('keydown',{key:'H',shiftKey:true});s.input.keyboard.emit('keydown',{key:'I',shiftKey:true});}
 clean(e,s);
});
for(const individual of [false,true])test('第2关：后缀分类、'+(individual?'六次逐个':'两次整夹')+'搬家、同名路径',()=>{
 const e=load(),s=sceneFor(e,'files');
 [['小猫.png',0],['生日歌.mp3',1],['我的故事.txt',2],['接星星.html',2]].forEach(([name,i])=>s.drop(s.byLabel(name),i));
 if(individual)for(const ext of ['png','mp3'])for(const name of ['小猫','花园','旅行'])s.drop(s.byLabel(name+'.'+ext));
 else {s.drop(s.byLabel('画画'));s.drop(s.byLabel('音乐'));}
 assert.equal(s.steps,individual?6:2);
 s.tap(s.byLabel('作品'));s.tap(s.byLabel('相册'));s.tap(s.byLabel('小猫.png'));
 assert.equal(s.coach.stars(),individual?2:3);clean(e,s);
});
test('第2关：走错同名路径不会通关，仍能返回找到目标',()=>{
 const e=load(),s=sceneFor(e,'files');
 [['小猫.png',0],['生日歌.mp3',1],['我的故事.txt',2],['接星星.html',2]].forEach(([name,i])=>s.drop(s.byLabel(name),i));
 s.drop(s.byLabel('画画'));s.drop(s.byLabel('音乐'));
 s.tap(s.byLabel('练习'));s.tap(s.byLabel('相册'));s.tap(s.byLabel('小猫.png'));assert.equal(s.won,false);assert.equal(s.coach.misses,1);
 s.tap(s.byLabel('作品'));s.tap(s.byLabel('相册'));s.tap(s.byLabel('小猫.png'));clean(e,s);
});
for(const challenge of [false,true])test('第3关：'+(challenge?'五张刷牙卡排除干扰':'穿鞋、缺格与刷牙'),()=>{
 const e=load(),s=sceneFor(e,'robot',challenge);
 function place(kinds){kinds.forEach(k=>{const o=s.find(o=>o.kind===k&&o.slotIndex==null)[0];s.drop(o);});}
 if(!challenge){place(['sock','shoe','lace']);s.api.onRun();s.flush();place(['brush','paste','teeth']);s.api.onRun();s.flush();assert.equal(s.coach.misses,0);}
 place(challenge?['brush','cap','paste','teeth','rinse']:['brush','cap','paste','teeth']);s.api.onRun();s.flush();assert.equal(s.steps,challenge?5:4);clean(e,s);
});
for(const challenge of [false,true])test('第4关：运行观察后改两处'+(challenge?'挑战':''),()=>{
 const e=load(),s=sceneFor(e,'debug',challenge);s.api.onRun();s.flush();assert.equal(s.coach.misses,0);
 const pairs=challenge?[['戴书包','背书包'],['钻窗户','出门']]:[['戴袜子','穿袜子'],['关门','开门']];
 for(const [bad,good]of pairs){s.tap(s.byLabel(bad));s.tap(s.find(o=>o.label&&o.label.text===good).at(-1));}
 s.api.onRun();s.flush();assert.equal(s.steps,2);clean(e,s);
});
for(const challenge of [false,true])test('第5关：两格选择用于连续天气'+(challenge?'挑战':''),()=>{
 const e=load(),s=sceneFor(e,'weather',challenge);s.drop(s.byLabel('拿伞'),0);s.drop(s.byLabel('戴帽子'),1);s.api.onRun();s.flush();assert.equal(s.steps,2);clean(e,s);
});
for(const challenge of [false,true])test('第6关：'+(challenge?'八边形挑战':'八张正方形到一张三角形'),()=>{
 const e=load(),s=sceneFor(e,'turtle',challenge),I=e.I;
 if(!challenge){for(const k of ['F','R','F','R','F','R','F','R'])s.drop(s.find(o=>o.tray&&o.kind===k)[0]);s.api.onRun();s.flush();}
 s.drop(s.find(o=>o.tray&&o.kind==='L')[0]);
 if(challenge){for(let i=0;i<5;i++)I.onArrow('ArrowUp');I.onArrow('ArrowLeft');I.onArrow('ArrowLeft');}else I.onArrow('ArrowRight');
 s.api.onRun();s.flush();assert.equal(s.steps,1);clean(e,s);
});
for(const challenge of [false,true])test('第7关：'+(challenge?'八边形选做':'补正方形、六边形独立推导'),()=>{
 const e=load(),s=sceneFor(e,'turtlePlus',challenge),I=e.I;
 if(!challenge){I.onArrow('ArrowUp');s.api.onRun();s.flush();assert.equal(s.won,false);}
 s.drop(s.byLabel('重复'));
 for(let n=0;n<(challenge?5:3);n++)I.onArrow('ArrowUp');I.onArrow('ArrowLeft');if(challenge)I.onArrow('ArrowLeft');
 s.api.onRun();s.flush();assert.equal(s.steps,1);clean(e,s);
});
for(const challenge of [false,true])test('第8关：五张卡、重复六次按石头选做法'+(challenge?'变路挑战':''),()=>{
 const e=load(),s=sceneFor(e,'island',challenge);
 for(const label of ['重复后面','如果前面有石头','跳过一格','不然','走一格']){
   const o=s.byLabel(label),st=e.I.drag.live.find(st=>st.obj===o);st.opt.onClick();
 }
 const plus=s.find(o=>o._key==='plus')[0];for(let i=0;i<3;i++)s.tap(plus);
 s.api.onRun();s.flush();assert.equal(s.steps,5);clean(e,s);
});
test('第8关不能靠纯走或纯跳绕过条件；缺卡和超步都失败',()=>{
 const {I}=load(),rocks=[2,5],f=I.rules.route;
 assert.equal(f(['repeat','walk'],6,rocks).ok,false);assert.equal(f(['repeat','jump'],6,rocks).ok,false);
 assert.equal(f(['repeat','if','jump','else','walk'],5,rocks).ok,false);
 assert.equal(f(['repeat','if','jump','else','walk'],7,rocks).ok,false);
 assert.equal(f(['if','jump','else'],6,rocks).ok,false);
 assert.equal(f(['walk','walk','walk','walk','walk','walk'],6,[]).ok,false);
});
test('挑战不会给提示、自动演示或发呆线索；普通自动提示计数',()=>{
 const e=load(),s=sceneFor(e,'robot',true);s.coach.useHint();s.coach.miss('再试试');s.coach.miss('再试试');s.coach.miss('再试试');s.coach.update(999999);assert.equal(s.coach.hints,0);s.shutdown();
 const normal=sceneFor(e,'robot');normal.coach.update(999999);assert.equal(normal.coach.hints,1);normal.shutdown();
});
test('动态中文全部经过长度与禁用词校验',()=>{
 const e=load();for(const cfg of e.I.LEVELS){const s=sceneFor(e,cfg.id);s.shutdown();}
 for(const {text,max}of e.copy){assert.ok(Array.from(String(text)).length<=max,text);assert.doesNotMatch(String(text),/变量|函数|事件|碰撞|状态|游戏循环|坐标|保存数据|输入输出/);}
 assert.deepEqual(e.errors,[]);
});
test('第2关挑战：三层同名路径且两次整夹拿金星',()=>{
 const e=load(),s=sceneFor(e,'files',true);
 [['小猫.png',0],['生日歌.mp3',1],['我的故事.txt',2],['接星星.html',2]].forEach(([name,i])=>s.drop(s.byLabel(name),i));
 s.drop(s.byLabel('画画'));s.drop(s.byLabel('音乐'));
 for(const name of ['作品','相册','旅行','小猫.png'])s.tap(s.byLabel(name));
 assert.ok(e.I.store.goldOf('files'));clean(e,s);
});
test('天气两格放反：所有天都执行，不能提前通关；调整可继续',()=>{
 const e=load(),s=sceneFor(e,'weather');s.drop(s.byLabel('拿伞'),1);s.drop(s.byLabel('戴帽子'),0);s.api.onRun();s.flush();assert.equal(s.won,false);assert.equal(s.coach.misses,1);
 const umbrella=s.find(o=>o.label&&o.label.text==='拿伞'&&o.home.y===670)[0];
 const hat=s.find(o=>o.label&&o.label.text==='戴帽子'&&o.home.y===670)[0];
 s.drop(umbrella,0);s.drop(hat,1);s.api.onRun();s.flush();clean(e,s);
});
test('八边形未调对不通关，挑战有失误不能拿金星',()=>{
 const e=load(),s=sceneFor(e,'turtlePlus',true);s.drop(s.byLabel('重复'));s.api.onRun();s.flush();assert.equal(s.won,false);
 for(let i=0;i<5;i++)e.I.onArrow('ArrowUp');e.I.onArrow('ArrowLeft');e.I.onArrow('ArrowLeft');s.api.onRun();s.flush();
 assert.equal(s.rejected,true);assert.equal(e.I.store.goldOf('turtlePlus'),false);s.shutdown();
});
test('存储读写被禁止仍可通关，刷新不伪称持久化',()=>{
 const e=load();e.context.localStorage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};
 require('node:vm').runInContext(source('src/store.js'),e.context);
 e.I.store.clearLevel('door',3,0,0,6);assert.ok(e.I.store.isCleared('door'));
});
test('离线素材已打包，文案清单可重建且禁用词不出现',()=>{
 const fs=require('node:fs'),path=require('node:path'),e=load();
 for(const key of ['bg-map-island8','bg-l8','prop-sun','prop-rain','prop-bug','prop-rock','prop-sunhat','prop-umbrella'])assert.match(e.I.PACK[key],/^data:image\//);
 const generated=require('../scripts/planb-copy.cjs').output;
 assert.equal(source('docs/planb-copy.txt'),generated);
 for(const line of generated.trim().split('\n')){
  assert.ok(e.I.assertCopy('manifest',line,20),line);
  assert.doesNotMatch(line,/变量|函数|事件|碰撞|状态|游戏循环|坐标|保存数据|输入输出|服务器|代理|密钥/);
 }
 const chars=new Set(generated);
 for(const cfg of e.I.LEVELS){const s=sceneFor(e,cfg.id,true);s.shutdown();}
 for(const {text}of e.copy)for(const ch of String(text))if(/[\u3400-\u9fff]/.test(ch))assert.ok(chars.has(ch),'缺字 '+ch);
});
test('第8关两条路都无法用固定走跳短循环绕过条件',()=>{
 const {I}=load();
 for(const rocks of [[2,4],[1,3,5,6]]){
  for(let length=1;length<=4;length++)for(let bits=0;bits<2**length;bits++){
   const body=Array.from({length},(_,i)=>(bits>>i)&1?'jump':'walk');
   for(let reps=1;reps<=8;reps++)assert.equal(I.rules.route(['repeat',...body],reps,rocks).ok,false);
  }
  assert.ok(I.rules.route(['repeat','if','jump','else','walk'],6,rocks).ok);
 }
});
test('真实结算外壳保存成绩、显示挑战按钮，重复通关不重复发星豆',()=>{
 const e=load(),s=sceneFor(e,'weather'),I=e.I;
 s.home=s.add.container(0,0);s.hintBtn=s.add.container(0,0);s.task=s.add.container(0,0);s.task.bump=()=>{};
 s.counter=I.ui.beans(s,1040,52);s.lucky.root=s.add.container(0,0);s.lucky.happy=()=>{};
 s.scene={restart:data=>{s.restarted=data;}};s.leave=()=>{};
 s.showCard=stars=>I.LevelScene.prototype.showCard.call(s,stars);
 I.store.clearLevel('weather',3,0,0,2);s.steps=2;
 I.LevelScene.prototype.win.call(s);s.flush();
 assert.equal(s.starGain,0);assert.equal(I.state,'MODAL');
 assert.ok(s.find(o=>o.text==='本轮 2 步 · 目标 2 步').length);
 s.tap(s.find(o=>o._key==='挑战')[0]);assert.equal(s.restarted.challenge,true);assert.equal(s.restarted.id,'weather');
 assert.deepEqual(e.errors,[]);s.shutdown();
});
test('真实结算外壳拒绝超预算挑战并重新开始，不损伤普通成绩',()=>{
 const e=load(),s=sceneFor(e,'debug',true),I=e.I;
 I.store.clearLevel('debug',3,0,0,2);s.steps=3;s.scene={restart:data=>{s.restarted=data;}};
 I.LevelScene.prototype.win.call(s);s.flush();
 assert.equal(s.won,false);assert.ok(s.restarted.challenge);assert.equal(I.store.goldOf('debug'),false);assert.equal(I.store.starsOf('debug'),3);s.shutdown();
});
