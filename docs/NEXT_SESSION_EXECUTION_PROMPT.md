# 新会话一键连续执行提示词

下面正文可直接作为新会话第一条消息使用。

---

@DevSpace Local（固定域名）

你现在负责继续开发《我欲飞升》。本次不是重新设计项目，也不是只提出建议，而是要从当前真实稳定恢复点开始，按照项目内已经建立的路线文档，连续实施、测试、修复、验收、打包、逐版本推送，直到本轮所有可执行版本完成，或出现真正无法自行解决的外部阻塞。

## 一、唯一工作区

严格限定：

`D:\我欲飞升`

只允许在该工作区内读取、创建、修改、删除项目文件和执行项目命令。不要修改 C 盘其他项目，不要修改 `D:\我欲飞升` 之外的内容。

该目录当前不是本地 Git checkout。不要在它或父目录执行 `git init`。项目现有发布方式是 `tools/publish-version.cjs` + 已登录 GitHub CLI，对 `Lorenzo-Holmes/magic` 的 `main` 做普通线性提交，禁止 force push。

## 二、首先恢复真实基线

开始后一次性完成，不要逐步询问我是否继续：

1. 打开 `D:\我欲飞升`；
2. 阅读：
   - `README.md`
   - `docs/PROTOTYPE_DESIGN.md`
   - `docs/CONTINUOUS_BUILD.md`
   - `docs/ROADMAP-v1.1.0-v2.0.0.md`
   - `docs/BUILD_PLAN-v1.1.0-v2.0.0.md`
   - `docs/NEXT_SESSION_EXECUTION_PROMPT.md`
3. 检查 `package.json`、`release/`、`dist/`、`tests/`、`tools/` 与最近修改；
4. 检查 `release/push-v1.0.0.json` 以及之后如果已经存在的更高版本发布记录；
5. 使用 `gh api` 获取 `Lorenzo-Holmes/magic` 的 `main` 当前真实 SHA；
6. 如果远端已经比文档中的 `cd7a448f10e66ebd3dea0cfef1cd820472ff3285` 更新，不要回退覆盖；读取现有发布记录并从最新已验证稳定版本继续；
7. 在开始新增功能前运行当前基线完整回归：

```sh
npm test
npm run test:final
npm run build
npm run verify:release
npm run test:browser
```

8. 基线有问题先修复，不能在红色基线上叠新版本。

## 三、本轮版本路线

严格按照 `docs/ROADMAP-v1.1.0-v2.0.0.md` 和 `docs/BUILD_PLAN-v1.1.0-v2.0.0.md` 连续执行：

1. `v1.1.0 灵台焕新`：UI 层级、微动画、重大事件演出、音效反馈；
2. `v1.2.0 本命神兵`：四槽装备、本命兵器、掉落、炼化、进化；
3. `v1.3.0 万法归一`：Build 标签、协同、解释层；
4. `v1.4.0 九州历练`：1～5 秒文字战斗回放，确定性结果与表现分离；
5. `v1.5.0 秘境降临`：短局 Roguelite 秘境；
6. `v1.6.0 宗门时代`：轻量宗门传承和事件；
7. `v1.7.0 天命人生`：出身和宿命事件链；
8. `v1.8.0 灵兽仙缘`：单主灵兽长期进化；
9. `v1.9.0 丹器百艺`：轻量炼丹、服务本命路线的炼器；
10. `v1.10.0 因果天网`：可追溯延迟因果；
11. `v1.11.0 百世回响`：扩展现有轮回的叙事/选择传承，不做永久战力树；
12. `v1.12.0 大道争锋`：由真实行为形成可测试的自创大道；
13. `v2.0.0 我即天道`：世界法则与创世，形成第二阶段正式结局。

不要把已有的轮回道痕、仙界、五槽无限进化、无尽诸天重复实现成“新系统”。

## 四、连续执行规则

本轮必须尽可能一次性执行完成。不要在每一步停下来问“是否继续”“要不要进入下一版本”。只要不存在真正的外部阻塞，就自行分析、实现、测试、修复并继续。

每个小版本必须形成独立绿色恢复点：

`实现 → 测试 → 构建 → release 校验 → 浏览器 QA → 截图人工检查 → REVIEW/ACCEPTANCE → GitHub 推送 → 远端 SHA 核对 → 下一版本`

当前版本未通过前，不允许把下一版本功能混进当前版本提交。

每个版本完成后都必须：

- 更新 `package.json`；
- 更新 README 当前版本说明；
- 更新 `docs/PROTOTYPE_DESIGN.md` 当前规则；
- 新建 `docs/REVIEW-vX.Y.Z.md`；
- 新建 `docs/ACCEPTANCE-vX.Y.Z.md`；
- 生成 `release/wo-yu-fei-sheng-vX.Y.Z.zip`；
- 生成/更新 build report 和 acceptance JSON；
- 使用现有 `tools/publish-version.cjs` 推送；
- 记录并核对真实远端 commit SHA。

## 五、每版固定测试

至少执行：

```sh
npm test
npm run test:final
npm run build
npm run verify:release
npm run test:browser
```

新增系统必须增加对应单元/状态机测试，而不是只依赖浏览器手点。

浏览器必须覆盖至少：

- 320 / 360 / 390 / 430 / 768 / 1280 px；
- 首世主线；
- 第二世道痕继承；
- 仙界序章与五槽进化；
- 当前版本新增系统；
- 刷新恢复；
- 导入/导出；
- reduced-motion；
- 无控制台错误；
- 无意外外部网络请求。

## 六、产品边界

继续保持：

- 手机竖屏优先；
- 文字修仙为主体；
- 爽点来自反吞旧敌、Build 成型、突破、装备进化、飞升和规则变化；
- 平常克制、重大节点才强反馈；
- 完全离线；
- 资源优先 CSS / SVG / Web Audio；
- 生产包内部目标 < 3 MB、平台硬上限 < 10 MB；
- 不加入运行时第三方依赖。

禁止主动加入：

- 签到、邮箱、每日任务；
- 广告、付费抽卡；
- 十几个装备栏；
- 装备耐久和强化 +N；
- 多重冗余货币；
- 重型 3D/Live2D；
- 外部 CDN、字体或音频依赖；
- 为了“看起来内容多”而增加无意义菜单。

## 七、关键技术要求

1. 所有随机必须可复现，render/打开面板/动画不能消耗游戏 RNG；
2. 战斗先结算，再回放表现事件；
3. 新模块优先拆分，不继续让 `app.js` / `engine.js` 无限膨胀；
4. 新生产文件必须同步加入生产白名单和构建校验；
5. 所有新状态必须有刷新恢复、重复点击保护、非法输入验证；
6. 新存档版本必须保留 v1～v5 旧档迁移，不伪造旧档从未记录的历史；
7. 轮回册与本世存档继续分离；
8. 无尽内容必须限制日志、背包、因果和历史记录长度，不能让 localStorage 无限增长；
9. `prefers-reduced-motion` 关闭动画时不能影响任何结算；
10. 音频失败不能阻塞游戏。

## 八、GitHub 发布

每个版本发布前先读取远端真实 SHA：

```sh
gh api repos/Lorenzo-Holmes/magic/git/ref/heads/main --jq .object.sha
```

然后使用：

```sh
node tools/publish-version.cjs <expected-parent-sha> "feat: wo-yu-fei-sheng vX.Y.Z"
```

禁止 force push。远端在构建期间发生移动时停止该次发布，重新审查差异后再继续，不能覆盖别人更新。

## 九、Cloudflare

中间每个小版本只要求 GitHub 形成线性恢复点，不需要反复部署线上。

本轮最后一个完整绿色版本完成并推送后，再执行：

```sh
npm run build
npm run deploy
```

然后对线上版本做真实浏览器 smoke，确认首页、开局、修炼、突破和当前新增核心系统可操作。

## 十、完成后的最终汇报

最终不要只说“完成”。请给出：

- 实际完成到哪个版本；
- 每个已发布版本的 GitHub commit SHA；
- 最新 ZIP 路径与 SHA-256；
- 单元测试数量；
- 压力仿真实际结果；
- 浏览器 QA 结果；
- 最新 Cloudflare 部署结果；
- 仍未完成的版本及真实原因（如有）；
- 下一次恢复所需的唯一入口文档。

如果中途遇到代码、测试、布局、迁移、包体等问题，自行修复，不要停下来征求我授权。只有 DevSpace、GitHub、Cloudflare 权限等真正外部阻塞才停止，并且必须停在最后一个已经远端验证的绿色版本。
