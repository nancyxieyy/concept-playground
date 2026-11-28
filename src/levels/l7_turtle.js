/* 改一个数补正方形，再独立画六边形；八边形是自选挑战。 */
(function(){
  'use strict';var I=window.Island,K=I.kit;
  I.IMPL.turtlePlus={create:function(s,cfg){
    var api=s.api,round=s.challenge?2:1,reps=3,deg=90,placed=!s.challenge;
    var angles=[45,60,90,120,150],target=s.challenge?8:4;
    api.placeLucky(140,730,{pose:'point',h:220});
    var ink=s.add.graphics().setDepth(8);
    var turtle=s.add.image(590,230,'prop-turtle').setDisplaySize(80,85).setDepth(12);
    var panel=I.ui.panel(s,610,600,660,200).setDepth(10);
    var rep=K.text(s,610,560,'3 次',32),turn=K.text(s,610,640,'90°',32);
    var label=K.text(s,390,560,'重复'),label2=K.text(s,390,640,'右转');
    var controls=[panel,rep,turn,label,label2];
    function change(which,direction){
      if(!api.playable()||!placed)return;
      if(which==='rep') reps=Phaser.Math.Clamp(reps+direction,1,8);
      else deg=angles[Phaser.Math.Clamp(angles.indexOf(deg)+direction,0,angles.length-1)];
      if(round===1)api.count();
      rep.setText(reps+' 次');turn.setText(deg+'°');s.coach.touch();
    }
    [[490,560,'minus','rep',-1],[745,560,'plus','rep',1],[490,640,'minus','deg',-1],[745,640,'plus','deg',1]].forEach(function(a){
      controls.push(I.ui.round(s,a[0],a[1],a[2],function(){change(a[3],a[4]);},{states:['PLAY']}).setDepth(18));
    });
    var slot=K.card(s,640,460,'放一张卡',null,190,90).setVisible(false);
    var card=K.card(s,290,400,'重复','icon-play',150,120).setVisible(false);
    function visibility(){controls.forEach(function(o){o.setVisible(placed);});slot.setVisible(!placed);card.setVisible(!placed);}
    I.drag.make(s,card,{hw:75,hh:60,enabled:function(){return !placed;},targets:function(){return [{x:slot.x,y:slot.y,magnet:90,obj:slot}];},onDrop:function(){placed=true;api.setSteps(1);visibility();}});
    function draw(done){
      ink.clear();var x=590,y=230,a=0,len=target===8?62:82;
      turtle.setPosition(x,y);var steps=Array.from({length:reps},function(_,i){return i;});
      K.animate(s,steps,function(){
        var nx=x+Math.cos(a)*len,ny=y+Math.sin(a)*len;
        ink.lineStyle(10,0xA8703F,1).beginPath().moveTo(x,y).lineTo(nx,ny).strokePath();
        turtle.setPosition(nx,ny).setAngle(a*180/Math.PI);x=nx;y=ny;a+=deg*Math.PI/180;
      },done);
    }
    function next(){round=2;target=6;reps=3;deg=90;placed=false;api.resetSteps();api.setTask(cfg.tasks[1]);
      rep.setText('3 次');turn.setText('90°');ink.clear();visibility();api.setStep({});s.hintBtn.setVisible(false);
    }
    K.run(s,function(){if(!api.playable())return;if(!placed){api.say('先放卡片','hint');return;}
      draw(function(){
        if(I.rules.polygon(reps,deg,target)){
          if(round===1){api.good(turtle.x,turtle.y);next();}else api.win();
        }else api.miss('看看哪里没合上');
      });
    });
    if(s.challenge){api.setTask('只用一张卡画八边形');visibility();}
    else {
      // 初始缺边图清楚呈现，不让孩子为题目本身承担一次失误。
      ink.lineStyle(10,0xA8703F,1).beginPath().moveTo(590,230).lineTo(672,230).lineTo(672,312).lineTo(590,312).strokePath();
      turtle.setPosition(590,312);api.setStep({goal:rep,hint:'还差哪一条边'});
    }
    I.onArrow=function(key){if(!api.playable())return;change(key==='ArrowUp'||key==='ArrowDown'?'rep':'deg',key==='ArrowUp'||key==='ArrowRight'?1:-1);};
  },destroy:function(){I.onArrow=null;}};
})();
