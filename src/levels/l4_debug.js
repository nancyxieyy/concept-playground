/* 先运行笑话程序，再点出并替换两处错误。 */
(function(){
  'use strict';var I=window.Island,K=I.kit;
  I.IMPL.debug={create:function(s,cfg){
    var api=s.api,selected=-1,observed=false,choices=[];
    api.placeLucky(160,730,{pose:'point',h:220});
    var good=['穿袜子','穿鞋','系鞋带','背书包','开门','出门'];
    var program=s.challenge?['穿袜子','穿鞋','系鞋带','戴书包','开门','钻窗户']:['戴袜子','穿鞋','系鞋带','背书包','关门','出门'];
    var robot=s.add.image(640,280,'prop-robot-idle').setDisplaySize(150,200);
    s.add.image(750,260,'prop-bug').setDisplaySize(60,60);
    var acting=K.text(s,640,165,'先运行，看看哪里不对');
    var cards=program.map(function(label,i){var c=K.card(s,215+i*170,460,label,null,155,110);K.tap(s,c,function(){
      if(!observed){api.say('先运行看看','hint');return;}
      selected=i;cards.forEach(function(o,j){o.list[0].setTint(j===i?0xBFE6CF:0xFFFFFF);});
      choices.forEach(function(o){o.destroy();});
      var options=[good[i],program[i]===good[i]?'倒着走':program[i]];
      if(i%2) options.reverse();
      choices=K.choices(s,options.map(function(v){return {label:v};}),function(d){
        if(selected<0)return;
        api.count();program[selected]=d.label;cards[selected].label.setText(d.label);
        choices.forEach(function(o){o.destroy();});choices=[];selected=-1;
      },610);
    });return c;});
    K.run(s,function(){
      if(!api.playable())return;
      choices.forEach(function(o){o.destroy();});choices=[];
      K.animate(s,program,function(label,i){
        acting.setText(label);robot.setTexture(label===good[i]?'prop-robot-idle':'prop-robot-oops');
        cards.forEach(function(o,j){o.list[0].setTint(j===i?0x6FB7D6:0xFFFFFF);});
        if(label!==good[i]) api.say(label==='戴袜子'?'袜子戴到头上啦':label==='关门'?'门关上，出不去啦':'这一步好奇怪','hint');
      },function(){
        cards.forEach(function(o){o.list[0].clearTint();});
        if(I.rules.sequence(program,good)){robot.setTexture('prop-robot-happy');api.win();}
        else {if(observed)api.miss('再看哪里不对');observed=true;acting.setText('点一张卡，再选新的做法');}
      });
    });
    api.setStep({goal:cards[0],hint:'看动作和物品'});
  }};
})();
