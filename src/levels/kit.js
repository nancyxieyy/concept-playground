/* 新关复用现有面板、卡片、拖放及运行按钮。 */
(function () {
  'use strict';
  var I = window.Island;
  I.kit = {
    text: function (s,x,y,line,size) { I.assertCopy('step',line,20); return s.add.text(x,y,line,I.bodyStyle(size || 24)).setOrigin(0.5).setDepth(18); },
    card: function (s,x,y,label,key,w,h) {
      I.assertCopy('card',label,20);
      w=w||150; h=h||120;
      var c=s.add.container(x,y).setDepth(18).setSize(w,h);
      c.add(s.add.image(0,0,'ui-card-blank').setDisplaySize(w,h));
      if(key) c.add(s.add.image(0,-18,key).setDisplaySize(62,62));
      c.label=s.add.text(0,key? h/2-24:0,label,I.bodyStyle(22)).setOrigin(0.5);
      c.add(c.label); c.home={x:x,y:y}; return c;
    },
    tap: function (s,obj,fn) {
      obj.setInteractive({hitArea:I.hit.rect(obj,obj.width,obj.height),hitAreaCallback:Phaser.Geom.Rectangle.Contains,useHandCursor:true});
      obj.on('pointerup',function () { if(s.api.playable() && !I.drag.busy && !I.drag.just) {s.coach.touch(); fn();} });
    },
    run: function (s,fn) {
      s.api.onRun=fn;
      return I.ui.button(s,1080,690,180,72,'运行',fn,{states:['PLAY']}).setDepth(25);
    },
    animate: function (s,items,step,done) {
      s.locked=true;
      var n=0;
      function next() {
        if(!s.sys.isActive()) return;
        if(n===items.length) {s.locked=false;done();return;}
        step(items[n],n++); I.sfx.play('step');
        s.time.delayedCall(I.MOTION.calm?120:420,next);
      }
      next();
    },
    choices: function (s,defs,onPick,y) {
      return defs.map(function (d,i) {
        var c=I.kit.card(s,640+(i-(defs.length-1)/2)*168,y||540,d.label,d.key);
        I.kit.tap(s,c,function () {onPick(d,c);}); return c;
      });
    }
  };
})();
