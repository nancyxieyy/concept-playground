const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const files = {'bg-map-island8':'bg/map-island8-1280x800.jpg','bg-l8':'bg/l8-hill-1280x800.jpg'};
for (const name of ['sun','rain','umbrella','sunhat','bug','rock']) files['prop-'+name] = 'props/'+name+'.png';
let pack = fs.readFileSync(path.join(root,'src/pack.js'),'utf8').split('\n/* planb-assets */')[0].trimEnd();
const data = {};
for (const [key, file] of Object.entries(files)) {
  const target = path.join(root,'assets/ui-v1',file);
  if (!fs.existsSync(target)) fs.copyFileSync(path.join(root,'.codex-work/planB-assets',file),target);
  data[key] = 'data:image/'+(file.endsWith('.jpg')?'jpeg':'png')+';base64,'+fs.readFileSync(target).toString('base64');
}
fs.writeFileSync(path.join(root,'src/pack.js'),pack+'\n/* planb-assets */\nObject.assign(Island.PACK, '+JSON.stringify(data)+');\n');
