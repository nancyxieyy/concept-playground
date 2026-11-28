/* 从当前入口加载的脚本提取中文字符串，供字体子集与文案检查使用。 */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const scripts=[...html.matchAll(/src="(src\/[^"]+)"/g)].map(m=>m[1]).filter(f=>!f.endsWith('/pack.js'));
const lines=new Set(['电脑小岛','请打开 JavaScript 后再玩。']);
// 同时识别注释和字符串，避免把开发注释放进字体文本。
const tokens=/\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g;
for(const file of scripts){
  const source=fs.readFileSync(path.join(root,file),'utf8');
  for(const m of source.matchAll(tokens)){
    if(m[0].startsWith('/'))continue;
    let value;try{value=vm.runInNewContext(m[0]);}catch{continue;}
    if(typeof value!=='string'||!/[\u3400-\u9fff]/.test(value))continue;
    // 这两条仅供开发日志使用。
    if(value.includes('文案超长')||value.includes('素材没有载入')||value.includes('视觉'))continue;
    value.split('\n').filter(Boolean).forEach(v=>lines.add(v));
  }
}
for(let n=1;n<=8;n++){
  for(const stage of ['热身','基础','挑战','选做'])lines.add('第 '+n+' 关 · '+stage);
  lines.add('重复 '+n+' 次');lines.add(n+' 次');lines.add('第 '+n+' 天');
}
for(let n=0;n<=6;n++)lines.add('已搬 '+n+' / 6');
for(const name of ['开门热身','搬家小队','机器人出门','机器人修 bug','看天气出门','乌龟画画','乌龟省步数','小岛大挑战'])lines.add(name+' · 过关');
lines.add('小岛大挑战·选做');
for(const folder of ['作品','练习'])for(const sub of ['相册','草稿'])lines.add('现在：桌面 › '+folder+' › '+sub);
for(const piece of [' · 过关','已搬 ','现在：','第 ',' 天',' 次','次','重复 ',' 关 · ','·选做','本轮 ',' 步 · 目标 ',' 步'])lines.delete(piece);
for(const name of ['小猫','花园','旅行'])for(const ext of ['png','mp3'])lines.add(name+'.'+ext);
for(const name of ['画画','音乐'])for(let n=0;n<=3;n++)lines.add(name+' · '+n);
for(const name of ['桌面','作品','练习','相册','草稿','旅行','备份'])lines.add('现在：'+name);
for(const name of ['作品','练习'])lines.add('现在：桌面 › '+name);
for(let n=0;n<=8;n++)for(const target of [1,2,4,5,6,8])lines.add('本轮 '+n+' 步 · 目标 '+target+' 步');
const output=[...lines].join('\n')+'\n';
if(require.main===module)fs.writeFileSync(path.join(root,'docs/planb-copy.txt'),output);
module.exports={output};
