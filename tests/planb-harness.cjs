/* 模拟绘图对象和时钟，只验证真实玩法回调，不声称替代浏览器渲染。 */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {EventEmitter}=require('node:events');
const root=path.resolve(__dirname,'..');
const source=f=>fs.readFileSync(path.join(root,f),'utf8');
const packContext={window:{}};packContext.Island=packContext.window.Island={};vm.runInNewContext(source('src/pack.js'),packContext);
function load(storage={},search='') {
  const errors=[],copy=[];
  const context=vm.createContext({window:{matchMedia:()=>({matches:true})},location:{search},URLSearchParams,
    console:{error:m=>errors.push(m)},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},
    Phaser:{Scene:class{},Math:{Clamp:(n,a,b)=>Math.max(a,Math.min(b,n))},Geom:{Rectangle:class{},Circle:class{}}}});
  const scripts=[...source('index.html').matchAll(/src="(src\/[^"]+)"/g)].map(m=>m[1]).filter(f=>!['src/pack.js','src/main.js'].includes(f));
  scripts.forEach(f=>vm.runInContext(source(f),context,{filename:f}));
  const I=context.window.Island; I.PACK=packContext.Island.PACK;I.state='PLAY';
  const original=I.assertCopy;I.assertCopy=(label,text,max)=>{copy.push({label,text,max});return original(label,text,max);};
  I.sfx={play(){},hover(){}};
  I.fx=new Proxy({tween(s,obj,props,opt){Object.assign(obj,props);if(opt&&opt.onComplete)opt.onComplete();}}, {get:(o,k)=>o[k]||(()=>{})});
  I.clearWatch=()=>{};I.armWatch=()=>{};
  return {I,errors,copy,context,storage};
}
function sceneFor(env,id,challenge=false) {
  const {I}=env,s=new EventEmitter();s.events=new EventEmitter();s.events.setMaxListeners(0);
  s.objects=[];s.timers=[];s.time={now:1000,delayedCall(ms,fn){const t={at:s.time.now+ms,fn,remove(){this.cancelled=true;}};s.timers.push(t);return t;}};
  s.flush=()=>{let n=0;while(s.timers.length){s.timers.sort((a,b)=>a.at-b.at);let t=s.timers.shift();s.time.now=t.at;if(!t.cancelled)t.fn();if(++n>1000)throw Error('timer loop');}};
  s.sys={isActive:()=>true};s.textures={exists:k=>!!I.PACK[k]};s.input=new EventEmitter();s.input.setMaxListeners(0);s.input.keyboard=new EventEmitter();s.input.setDefaultCursor=()=>{};
  s.tweens={killTweensOf(){},add(spec){if(spec.repeat!==-1&&spec.onComplete)s.time.delayedCall(spec.duration||0,spec.onComplete);return {};}};
  s.cfg=I.LEVELS.find(l=>l.id===id);s.steps=0;s.challenge=challenge;s.locked=false;s.won=false;
  function object(type,x=0,y=0,key) {
    if((type==='image'||type==='nineslice')&&!I.PACK[key])throw Error('missing texture '+key);
    const o=new EventEmitter();Object.assign(o,{scene:s,type,x,y,key,width:100,height:100,scaleX:1,scaleY:1,angle:0,rotation:0,visible:true,list:[],frame:{width:100,height:100}});
    o.setPosition=(x,y)=>{o.x=x;o.y=y;return o;};o.setScale=(x,y=x)=>{o.scaleX=x;o.scaleY=y;return o;};
    o.setSize=(w,h)=>{o.width=w;o.height=h;return o;};o.setDisplaySize=(w,h)=>{o.displayWidth=w;o.displayHeight=h;return o;};
    o.setVisible=v=>{o.visible=v;return o;};o.setText=v=>{o.text=String(v);o.width=Array.from(o.text).length*16;return o;};
    o.setTexture=k=>{if(!I.PACK[k])throw Error('missing texture '+k);o.key=k;return o;};
    o.setAngle=v=>{o.angle=v;return o;};o.setRotation=v=>{o.rotation=v;return o;};
    o.add=list=>{for(const c of Array.isArray(list)?list:[list]){c.parentContainer=o;o.list.push(c);}return o;};
    o.setInteractive=()=>{o.input={};return o;};o.disableInteractive=()=>{o.input=null;return o;};
    o.setDepth=v=>{o.depth=v;return o;};
    o.destroy=()=>{if(!o.scene)return;o.emit('destroy');o.scene=null;o.visible=false;o.list.forEach(c=>c.destroy());};
    o.createGeometryMask=()=>({});
    for(const name of ['setOrigin','setShadow','setAlpha','setTint','clearTint','setFlipX','setColor','setMask','clear','lineStyle','fillStyle','fillRect','fillTriangle','beginPath','moveTo','lineTo','strokePath','strokeRoundedRect','lineBetween'])o[name]=()=>o;
    s.objects.push(o);return o;
  }
  s.add={};for(const type of ['container','image','text','graphics','rectangle','circle','ellipse','zone','nineslice'])s.add[type]=(x,y,key)=>{let o=object(type,x,y,key);if(type==='text')o.setText(key);return o;};
  s.make={graphics:()=>object('graphics')};
  I.checkSceneCopy(s);
  s.hud=s.add.container(0,0);s.flash=s.add.rectangle(640,400);s.task={setText:t=>{I.assertCopy('task',t,15);s.taskText=t;},bump(){}};
  s.hintBtn={setVisible(){}};s.beads={setIndex(){}};
  s.lucky={say:(text,tone)=>{I.assertCopy('bubble',text,12);s.bubble=text;},hint:text=>I.assertCopy('bubble',text,12),nod(){},confused(){},setLook(){},yawn(){},hop(){}};
  s.coach=I.coach.attach(s,s.cfg.tuning);s.api=I.LevelScene.prototype.makeApi.call(s);
  s.win=()=>{if(challenge&&(s.steps>s.cfg.challengeLimit||s.coach.hints||s.coach.misses)){s.rejected=true;return;}s.won=true;I.store.clearLevel(id,s.coach.stars(),s.coach.misses,s.coach.hints,s.steps,challenge);};
  I.IMPL[id].create(s,s.cfg);s.coach.arm();
  s.find=(predicate)=>s.objects.filter(o=>o.scene&&o.visible&&predicate(o));
  s.byLabel=label=>s.find(o=>o.label&&o.label.text===label)[0];
  s.tap=o=>{if(!o)throw Error('missing tap target');const p={worldX:o.x,worldY:o.y};o.emit('pointerdown',p);o.emit('pointerup',p);};
  s.drop=(o,index=0)=>{const st=I.drag.live.find(st=>st.obj===o);if(!st)throw Error('missing drag target');const target=st.opt.targets()[index];if(!target)throw Error('missing slot '+index);if(st.opt.onLift)st.opt.onLift(o);st.opt.onDrop(target,o);};
  s.shutdown=()=>s.events.emit('shutdown');return s;
}
module.exports={load,sceneFor,source};
