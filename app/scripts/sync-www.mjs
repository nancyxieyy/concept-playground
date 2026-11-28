// 只复制运行时资源；根目录仍是网页唯一源文件。
import { cp, mkdir, readFile, rm, stat } from 'node:fs/promises';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(app, '..');
const dest = resolve(app, 'www');
const files = new Set(['index.html', 'src', 'vendor/phaser.min.js',
  'assets/ui-v1/fonts/OFL-NotoSansCJK.txt', 'assets/ui-v1/fonts/OFL-ZCOOLKuaiLe.txt']);
const visited = new Set();

// 跟随入口的 src/href 和 CSS url()/@import；将来引用 core.css 时也会复制。
async function collect(file) {
  if (visited.has(file)) return;
  visited.add(file);
  const source = await readFile(resolve(root, file), 'utf8');
  const refs = /(?:\b(?:src|href)\s*=\s*["']([^"']+)["']|url\(\s*["']?([^\s"')]+)["']?\s*\)|@import\s+["']([^"']+)["'])/gi;
  for (const match of source.matchAll(refs)) {
    const ref = match[1] || match[2] || match[3];
    if (/^(?:data:|blob:|#)/i.test(ref)) continue;
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(ref)) throw new Error(`入口包含非本地资源：${ref}`);
    const clean = decodeURIComponent(ref.split(/[?#]/)[0]);
    const path = resolve(clean.startsWith('/') ? root : dirname(resolve(root, file)), clean.replace(/^\/+/, ''));
    const local = relative(root, path);
    if (!local || local === '..' || local.startsWith('..' + sep)) throw new Error(`资源越出仓库：${ref}`);
    await stat(path); // 缺失引用立即报错，避免带着不完整素材出包。
    files.add(local);
    if (/\.(?:html|css)$/i.test(local)) await collect(local);
  }
}

await collect('index.html');
for (const file of files) await stat(resolve(root, file));
await rm(dest, { recursive: true, force: true });
await mkdir(dest, { recursive: true });
for (const file of [...files].sort()) {
  // src 已整目录复制，无需逐个再拷贝脚本。
  if (file.startsWith('src' + sep)) continue;
  await mkdir(dirname(resolve(dest, file)), { recursive: true });
  await cp(resolve(root, file), resolve(dest, file), { recursive: true });
}
console.log('已同步游戏资源到 app/www。');
