# M2 实现与验证记录

日期：2026-11-28（北京时间）。工作分支：`codex/m2-tauri-app`。任务边界：只写当前仓库的代码与配置，不联网、不安装、不构建、不提交、不推送，不写仓库外的个人上下文库。记录与交接留在本文件，未做外部沉淀或同步。

## 实现与取舍

Tauri 2 外壳放在 `app/`，使用固定 identifier、非隐私窗口、1280×800 默认尺寸与 960×600 最小尺寸。只保留 `core:default` 权限，不添加插件或业务命令；本地 CSP、禁用缩放快捷键与开发者工具都在配置中。版本使用稳定 2.x 范围，未联网声称某个补丁版本为最新。

根目录继续是唯一网页源文件。同步脚本收集入口及样式引用，复制完整 `src/` 和本地 Phaser，图片使用现有内嵌包，字体保留 OFL 授权。避免把未引用原图和旧课页打入 App。图标原图为 204×259，脚本补为方形再交给 Tauri CLI 生成，不拉伸或重画；实际生成由 Na 执行。

大人快捷键使用 `KeyboardEvent.code`，避免 Mac Option 键改变字符导致失效。通过切换原有网址参数重载，让所有场景统一应用开关；代价是当前未完成关卡重新开始。存档逻辑沿用 `island2:v1`，解锁不写通关记录，普通刷新不清档。固定 identifier 是数据连续性的前提，正式使用前需确认占位标识。

WebKit 兼容小修：显式等待含中文样本文字的三种字体；手势里恢复 suspended/interrupted 音频并处理异步拒绝；画布禁用触摸默认操作；拖拽跟随原指针，画布外松手或失焦时取消；双击第一次点击用空状态标记，避免启动初期被当成第二次点击。双击仍使用原有游戏时间阈值，未改玩法、文案和风格。

## 已验证

`node --test tests/m1-layout.test.cjs tests/m2-app.test.cjs`：17 项通过，其中原 M1 10 项、M2 7 项。M2 覆盖重载后的两关进度和静音、Cmd+R/Shift+R 分支、Mac Option 特殊字符、按键连发、网址参数兼容、字体成功与失败启动、音频恢复失败重试、拖拽取消和监听释放、资源同步一致性及旧产物清理。

测试使用 Node 中的浏览器与 Phaser 替身，存储重载是共享内存数据模拟，不能据此声称 WKWebView 已经通过。实际执行了资源同步，所有入口文件和字体可在 `app/www/` 找到；生成目录已忽略。

补充检查：JavaScript 语法、三份 JSON 格式、图标脚本 Shell 语法与 `git diff --check` 通过。同步目录约 11MB，不代表最终 App 体积。当前 Python 不带 `tomllib`，且没有 Cargo，因此 Cargo 清单仅人工检查，未通过工具解析或编译；Tauri schema 也尚未校验。

## 验收状态

| 项目 | 状态与边界 |
| --- | --- |
| 代码回归、资源同步 | 通过上述离线检查 |
| 权限、窗口、CSP、最低系统版本 | 配置已完成；Tauri schema 和实际构建尚未验证 |
| 图标、Apple 芯片 App/DMG 产物 | 未验证；依赖安装、图标生成和构建由 Na 执行 |
| 断网启动、通关四关、无外部请求 | 未验证真实 App 运行；源代码与入口资源已检查为本地 |
| 启动 3 秒、App ≤40MB | 未验证，尚无原生构建产物 |
| WKWebView 进度跨重启与 Cmd+R 保留 | 未验证；目前只有存档代码回归，不能替代真机 |
| 缩放禁用、全屏、最小窗口与 Retina | 未验证实际 App；M1 几何回归仍通过 |
| 字体、首次点击音效、拖放、双击 | 完成代码检查与小修；真实 WebKit/WKWebView 未验证 |
| 根目录双击和本地网页打开 | 入口结构与引用未破坏；真实浏览器回归未验证 |

当前环境没有 Rust、Tauri CLI、Playwright 或 Playwright WebKit；遵守任务要求未安装，也未用其他渠道获取。游戏路由技能所指的 Phaser 专项技能未安装，本轮以仓库现有 Phaser 代码为检查依据。

## Na 接手验证

1. 按 [app/README.md](../app/README.md) 顺序准备依赖、生成图标并构建。记录解析出的版本，保留锁文件；打开 App 后断网，测四关操作和 3 秒启动目标，测窗口缩放、绿色按钮全屏及 Cmd +/-。用 `du -sh "app/src-tauri/target/aarch64-apple-darwin/release/bundle/macos/电脑小岛.app"` 查看体积。
2. 正常通关前两关，记下星数，按 Cmd+R，再完全退出 App 重开，确认进度与静音设置保留。测试 U/C/D 的开关和再按关闭，最后测试 Shift+R（此步会清掉测试进度）。首次点星听音效，试后台返回后发声，拖出窗口再松手，双击礼物与文件夹；根目录两种网页打开方式各回归一次。

## 文件清单

新增：`.gitignore`；`app/package.json`；`app/scripts/sync-www.mjs`、`make-icons.sh`；`app/src-tauri/Cargo.toml`、`build.rs`、`src/main.rs`、`src/lib.rs`、`tauri.conf.json`、`capabilities/default.json`、`icons/README.md`；`app/README.md`、`SIGNING.md`、`IPAD.md`；`tests/m2-app.test.cjs`；本记录。

修改：根 `README.md`、`index.html`；`src/main.js`、`src/sfx.js`、`src/drag.js`、`src/levels/l1_door.js`、`src/levels/l2_files.js`。
