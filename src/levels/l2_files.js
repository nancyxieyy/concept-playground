/* 文件后缀、整夹搬家与同名路径。 */
(function () {
  'use strict';
  var I=window.Island,K=I.kit;
  I.IMPL.files={create:function (s,cfg) {
    var api=s.api, round=0, objects=[], counts=[0,0], chosenPath=[], folderItems=[];
    api.placeLucky(140,730,{pose:'carry',h:220});
    function keep(o) {objects.push(o);return o;}
    function clean() { objects.forEach(function(o){o.destroy();});objects=[]; }
    function folder(x,y,label) {return keep(K.card(s,x,y,label,'prop-crate-peach',210,150));}
    function bind(c,targets,drop,count) {
      I.drag.make(s,c,{hw:c.width/2,hh:c.height/2,enabled:function(){return api.playable();},targets:targets,
        onDrop:function(t){if(count) api.count();drop(t);},
        onReject:function(){if(count) api.count();return api.miss('再看看文件名');}});
    }
    function sort() {
      round=1; api.setTask(cfg.tasks[0]);
      var boxes=[folder(430,550,'画画 · png'),folder(720,550,'音乐 · mp3'),folder(1010,550,'作品 · txt/html')];
      var files=[['小猫.png',0],['生日歌.mp3',1],['我的故事.txt',2],['接星星.html',2]], left=4;
      files.forEach(function(d,i) {
        // 所有文件同一张空白卡，不从颜色或图案泄露类别。
        var c=keep(K.card(s,380+i*200,280,d[0],null,180,110));
        bind(c,function(){return boxes.map(function(b,j){return {id:j,x:b.x,y:b.y,obj:b,magnet:95};});},function(t){
          if(t.id!==d[1]) {I.drag.park(c,c.home.x,c.home.y);api.miss('看看文件名末尾');return;}
          c.destroy(); api.good(t.x,t.y); if(--left===0) move();
        },false);
      });
      api.setStep({goal:boxes[0],hint:'看看文件名末尾'});
    }
    function move() {
      clean(); round=2;api.resetSteps();api.setTask(cfg.tasks[1]);
      keep(K.text(s,640,180,'每个文件夹里，都有三个文件'));
      var destination=folder(1030,500,'我的作品');
      var folders=[folder(400,300,'画画'),folder(700,300,'音乐')];
      var tally=keep(K.text(s,1030,630,'已搬 0 / 6'));
      folderItems=[[],[]];
      function moved(group,indices) {
        indices.forEach(function(i){var c=folderItems[group][i];if(!c.moved){c.moved=true;c.setVisible(false).disableInteractive();counts[group]++;}});
        folders[group].label.setText((group?'音乐':'画画')+' · '+(3-counts[group]));
        if(counts[group]===3) folders[group].setVisible(false).disableInteractive();
        tally.setText('已搬 '+(counts[0]+counts[1])+' / 6');api.good(destination.x,destination.y);
        if(counts[0]+counts[1]===6) pathRound();
      }
      function target(){return [{id:'all',x:destination.x,y:destination.y,magnet:110,obj:destination}];}
      folders.forEach(function(f,g){
        bind(f,target,function(){moved(g,[0,1,2]);I.drag.park(f,f.home.x,f.home.y);},true);
        ['小猫','花园','旅行'].forEach(function(name,i){
          var c=keep(K.card(s,320+g*310+(i%2)*145,470+Math.floor(i/2)*135,name+(g?'.mp3':'.png'),null,135,100));
          folderItems[g].push(c);bind(c,target,function(){moved(g,[i]);},true);
        });
      });
      api.setStep({goal:folders[0],hint:'整夹也能搬走'});
    }
    function pathRound(){clean();round=3;api.setTask(s.challenge?'找到旅行文件夹里的小猫':cfg.tasks[2]);chosenPath=[];view();}
    function view() {
      clean();
      keep(K.text(s,640,180,s.challenge?'同名文件在不同文件夹里':'作品 › 相册 › 小猫.png'));
      keep(K.text(s,640,240,'现在：'+(s.challenge?(chosenPath[chosenPath.length-1]||'桌面'):['桌面'].concat(chosenPath).join(' › '))));
      var options=chosenPath.length===0?['作品','练习']:chosenPath.length===1?['相册','草稿']:s.challenge&&chosenPath.length===2?['旅行','备份']:['小猫.png'];
      options.forEach(function(name,i){
        var c=folder(520+i*240,420,name);
        if(name==='小猫.png') {
          c.list[1].setTexture('prop-file-cat');
          K.tap(s,c,function(){
            if(I.rules.sequence(chosenPath,s.challenge?['作品','相册','旅行']:['作品','相册'])) api.win();
            else {api.miss('同名，也要看路线');chosenPath=[];view();}
          });
        } else K.tap(s,c,function(){chosenPath.push(name);view();});
      });
      keep(I.ui.button(s,800,660,180,60,'上一层',function(){if(!api.playable())return;chosenPath.pop();view();},{kind:'secondary',states:['PLAY']}));
      api.setStep({goal:objects[2],hint:'名字相同，路线不同'});
    }
    sort();
  }};
})();
