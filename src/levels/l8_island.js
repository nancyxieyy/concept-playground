/* 五张卡组成重复与分支；每次处理前面一格，跨过石头继续。 */
(function(){
  'use strict';var I=window.Island,K=I.kit;
  I.IMPL.island={create:function(s,cfg){
    var api=s.api,program=[],reps=3,rocks=s.challenge?[1,3,5,6]:[2,4];
    api.placeLucky(140,740,{pose:'point',h:210});
    var robot=s.add.image(260,290,'prop-robot-idle').setDisplaySize(80,110).setDepth(14);
    for(var n=1;n<=6;n++){
      s.add.image(260+n*130,350,'ui-slot-empty').setDisplaySize(115,90).setDepth(8);
      if(rocks.includes(n))s.add.image(260+n*130-65,325,'prop-rock').setDisplaySize(65,65).setDepth(9);
      K.text(s,260+n*130,390,String(n),20);
    }
    var flag=s.add.graphics().setDepth(10);
    flag.lineStyle(7,0x8C6950).lineBetween(1120,230,1120,340);
    flag.fillStyle(0xBFE6CF).fillTriangle(1120,230,1180,250,1120,275);
    K.text(s,640,170,'前面有石头，就跳过那一格');
    var slots=Array.from({length:5},function(_,i){return K.card(s,350+i*170,535,'放这里',null,155,100);});
    var defs=[{id:'repeat',label:'重复后面'},{id:'if',label:'如果前面有石头'},{id:'jump',label:'跳过一格'},{id:'else',label:'不然'},{id:'walk',label:'走一格'}];
    var counter=K.text(s,640,445,'重复 3 次');
    function setRep(delta){if(!api.playable())return;reps=Phaser.Math.Clamp(reps+delta,1,8);counter.setText('重复 '+reps+' 次');s.coach.touch();}
    I.ui.round(s,490,445,'minus',function(){setRep(-1);},{states:['PLAY']});
    I.ui.round(s,790,445,'plus',function(){setRep(1);},{states:['PLAY']});
    function refresh(){slots.forEach(function(o,i){o.label.setText(program[i]?defs.find(function(d){return d.id===program[i];}).label:'放这里');});}
    slots.forEach(function(o,i){K.tap(s,o,function(){program.splice(i,1);refresh();});});
    K.text(s,600,600,'点已放的卡，可以取回',20);
    defs.forEach(function(d,i){
      var c=K.card(s,250+i*164,690,d.label,null,155,100);
      function insert(index){if(program.length>=5){api.say('最多放五张卡','hint');return;}program.splice(index,0,d.id);refresh();}
      I.drag.make(s,c,{hw:77,hh:50,enabled:api.playable,onClick:function(){insert(program.length);},
        targets:function(){return slots.map(function(o,j){return {index:j,x:o.x,y:o.y,magnet:78,obj:o};});},
        onDrop:function(t){insert(Math.min(t.index,program.length));I.drag.park(c,c.home.x,c.home.y);}});
    });
    K.run(s,function(){if(!api.playable())return;
      var result=I.rules.route(program,reps,rocks);api.setSteps(program.length);robot.setPosition(260,290).setTexture('prop-robot-idle');
      K.animate(s,result.trace,function(step){
        if(I.MOTION.calm)robot.setPosition(260+step.pos*130,290);
        else {
          s.tweens.add({targets:robot,x:260+step.pos*130,duration:350});
          if(step.jump)s.tweens.add({targets:robot,y:230,yoyo:true,duration:175});
        }
      },function(){if(result.ok){robot.setTexture('prop-robot-happy');api.win();}else{robot.setTexture('prop-robot-oops');api.miss(result.message);}});
    });
    api.setStep({goal:slots[0],hint:'重复里放两种做法'});
  }};
})();
