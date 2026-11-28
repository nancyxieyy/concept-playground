# 电脑小岛 · Mac App

面向 Apple 芯片、macOS 12 及以上。此阶段使用 Tauri 2，只生成 `.app` 和 `.dmg`，不配置发布签名、公证或自动更新。游戏界面和玩法沿用仓库根目录。

## 准备与构建

在 Mac 上预先安装 Node.js（建议受支持的 LTS，至少 18）、npm、Rust stable 与 Xcode Command Line Tools；制作 DMG 需要 Mac 图形桌面环境。开发工具自身支持的 macOS 版本可能高于应用最低运行版本，应在较新系统上构建，再到 macOS 12 验收。以下命令由 Na 运行，本轮没有安装任何依赖。

从仓库根目录依次运行；已有 Command Line Tools 时跳过第一条：

```sh
xcode-select --install
rustup target add aarch64-apple-darwin
cd app
npm install
sh scripts/make-icons.sh
npm run build:mac
```

产物位于 `app/src-tauri/target/aarch64-apple-darwin/release/bundle/macos/电脑小岛.app` 和同级 `dmg/` 目录。首次构建会获取依赖；生成的 App 运行时使用包内资源。构建时不要设置签名、公证相关环境变量；工程没有配置签名身份。Apple 芯片构建工具可能自动附加运行所需的 ad-hoc 签名，这不等于 Developer ID 签名或公证。

依赖声明限制在 Tauri 稳定 2.x 主版本：npm `^2.0.0`、Cargo `2`，由首次安装和构建解析当时可用的稳定版本。本轮未联网核对最新补丁号，也未生成锁文件；成功后保留并提交 `app/package-lock.json` 和 `app/src-tauri/Cargo.lock`，让后续构建使用同一批版本。图标也请随代码提交。

图标脚本使用现有 `badge-island.png`，为非方形原图补奶油色边后调用 `npx --no-install tauri icon`。没有新增画稿。请在生成后检查 Dock 图标的小尺寸清晰度。

在 `app/` 运行 `npm run dev` 可开发预览；修改根目录文件后重新运行该命令同步。`npm run sync` 可以单独更新 `app/www/`。直接调用 Tauri CLI 前必须先同步；推荐始终使用 npm 脚本。

## 首次打开未签名 App

打开 DMG，把 App 拖入「应用程序」，再打开。如果系统阻止，在「系统设置 → 隐私与安全性 → 仍要打开」确认。macOS 12 对应入口名为「系统偏好设置 → 安全性与隐私 → 通用」。只对自己构建或已确认来源的这个 App 操作，不需要关闭系统全局安全检查。

## 大人开关与存档

孩子画面上没有新增按钮。Option 就是 Mac 键盘上的 Alt。

| 按键 | 效果 |
| --- | --- |
| Shift+R | 清除进度并刷新 |
| Shift+Option+U | 切换全部解锁；不增加星星或通关记录 |
| Shift+Option+C | 切换安静模式，减少动态效果，保留声音 |
| Shift+Option+D | 切换帧率显示；不会打开开发者工具 |

后三个按键切换当前页面的网址参数并重载；未完成关卡重新开始，已完成进度保留。再按一次关闭，普通刷新后仍有效，彻底退出 App 再启动回默认入口。开启系统「减少动态效果」后，关闭 C 参数也不会强行恢复动态效果。网页的 `?reset=1`、`?unlock=all`、`?calm=1`、`?debug=1` 继续有效。

存档仍使用 `localStorage` 的 `island2:v1`，通关、静音切换时立即写入。固定 identifier 和本地来源、非隐私模式是 WKWebView 保留数据的前提；本工程采用这些配置，不在退出或普通刷新时清理存档。Cmd+R 若被系统菜单处理为刷新，仍应读取同一份进度；若当前发布版菜单不提供刷新，可退出重开检查。**本轮只验证了读写逻辑，实际 WKWebView 退出重开与 Cmd+R 持久化尚未验证。**

`com.siliconaiedu.computer-island` 目前是占位标识，待 Na 确认。正式使用后不要随意更换，否则可能进入另一份数据目录。App 和原网页不共享存档；清理应用数据也会丢失进度。

## 打包范围与权限

`sync-www.mjs` 每次重建 `app/www/`，复制 `index.html`、`src/`、本地 Phaser、入口引用的字体及其 OFL 授权文件。图片已经在 `src/pack.js`，不重复带原图目录。脚本跟随 HTML 和 CSS 的本地引用，缺文件或引用外部资源就报错。当前入口不使用 `core.css`，因此没有打进去；以后入口引用它时会自动包含。根目录文件不移动。

只有主窗口的 `core:default` 权限，没有额外插件、业务命令或远程能力。CSP 只允许本地内容，图片、字体和媒体额外允许 `data:`/`blob:`，样式允许内联；不使用 `unsafe-eval`。配置中的 schema 地址仅供开发工具识别配置，不是游戏加载资源。发布版禁用开发者工具和缩放快捷键，绿色窗口按钮可用于全屏。

## 验证

离线回归在仓库根目录运行：

```sh
node --test tests/m1-layout.test.cjs tests/m2-app.test.cjs
```

出包后按 [M2 验证记录](../docs/m2-verification.md) 验收，重点是断网通关四关、字体音效、两关后刷新及重启、拖出窗口后松手、双击礼物与文件夹。还需测启动 3 秒、App 不超过 40MB、最小窗口和全屏。后续签名见 [SIGNING.md](SIGNING.md)，iPad 路线见 [IPAD.md](IPAD.md)。
