/* 同一条选择，连续用在几天的天气上。 */
(function(){
  'use strict';var I=window.Island,K=I.kit;
  I.IMPL.weather={create:function(s,cfg){
    var api=s.api,values=[null,null],selected=null,days=s.challenge?[true,false,true,false]:[false,true,true];
    api.placeLucky(160,730,{pose:'point',h:220});
    var weather=s.add.image(640,245,'prop-sun').setDisplaySize(120,120);
    var robot=s.add.image(790,300,'prop-robot-idle').setDisplaySize(130,180);
    var item=s.add.image(900,300,'prop-umbrella').setDisplaySize(90,90).setVisible(false);
    var dayText=K.text(s,640,160,'试一试每一天');
    var results=days.map(function(r,i){return s.add.image(480+i*105,340,r?'prop-rain':'prop-sun').setDisplaySize(55,55);});
    K.text(s,440,405,'如果下雨，就');K.text(s,800,405,'不然，就');
    var slots=[K.card(s,440,490,'放这里',null,240,110),K.card(s,800,490,'放这里',null,240,110)];
    function place(kind,index){values[index]=kind;slots[index].label.setText(kind==='umbrella'?'拿伞':'戴帽子');slots[index].list[0].setTint(0xBFE6CF);api.count();}
    slots.forEach(function(c,i){K.tap(s,c,function(){if(selected)place(selected,i);});});
    [{id:'umbrella',label:'拿伞'},{id:'sunhat',label:'戴帽子'}].forEach(function(d,i){
      var c=K.card(s,450+i*300,670,d.label,'prop-'+d.id,170,130);
      I.drag.make(s,c,{hw:85,hh:65,enabled:api.playable,onClick:function(){selected=d.id;},
        targets:function(){return slots.map(function(o,j){return {index:j,x:o.x,y:o.y,obj:o,magnet:100};});},
        onDrop:function(t){place(d.id,t.index);I.drag.park(c,c.home.x,c.home.y);},onReject:function(){return null;}});
    });
    K.run(s,function(){
      if(!api.playable())return;if(values.some(function(v){return !v;})){api.say('两格都放好','hint');return;}
      var outcomes=I.rules.weather(values,days);
      K.animate(s,days,function(r,i){
        dayText.setText('第 '+(i+1)+' 天');weather.setTexture(r?'prop-rain':'prop-sun');
        item.setTexture('prop-'+values[r?0:1]).setVisible(true);
        robot.setTexture(outcomes[i]?'prop-robot-happy':'prop-robot-oops');
        results[i].setTint(outcomes[i]?0xBFE6CF:0xFFE9A8);
        if(!outcomes[i])api.say(r?'雨把帽子淋湿啦':'晴天戴帽更方便','hint');
      },function(){if(outcomes.every(Boolean))api.win();else api.miss('再看看两种天气');});
    });
    api.setStep({goal:slots[0],hint:'下雨时需要什么'});
  }};
})();
