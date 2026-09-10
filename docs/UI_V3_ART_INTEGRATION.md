# 已生成美术：切片交付与接入交接

## 当前真实状态

已对本次聊天中的 13 张生成图片进行定点裁切、透明通道处理、相邻图标碎片清理和移动端 WebP 压缩。输出 82 个图像文件及 manifest.json / manifest.js，资源包共 84 项。图片字节合计 2,424,078；ZIP 为 2,444,398 bytes。

2026-09-11 续接：用户已将原 ZIP 保存到项目根目录；固定大小、SHA-256、内部清单均校验通过，并已原子导入 assets/ui-v3。五个窗口和共用表现层现已使用独立美术，实际运行验证见 UI_V3_ART_ACCEPTANCE.md。以下传输阻塞描述保留为历史，不再是当前阻塞。

ZIP：wo-yu-fei-sheng-ui-v3-art-assets.zip。
SHA-256：66735b5f54192936ef4f1f74e80b4abe8fd5d7f4782e313db7c48e99f7126c68。

浏览器传输在 ChatGPT 页面的权限/安全检查处失败。该失败不影响已有项目文件读写，但不能改用另一条认证路径获取聊天附件来绕过它。用户将 ZIP 保存到项目根目录后，运行 tools/import-ui-v3-art.cjs 校验并导入。

## 目录与窗口映射

| 窗口/控件 | 素材逻辑 ID | 实现要求 |
|---|---|---|
| CaveWindow | scene.cave、prop.platform / forge / gate / beast / astrolabe | 背景和建筑坐标共用画布变换，热点落在建筑上；删除原来的金色字章占位 |
| CharacterWindow | scene.character、character.dao | 替换内联 SVG 人物，四槽保留现有真实装备；人物素材不表示已经实现动态换装 |
| BaggageWindow | panel.paper / scroll / drawer、item.* | 保留真实分类、库存、费用与动作，行数随库存变化；不把图集整张铺进背包 |
| WorldMapWindow | scene.world、icon.marker / marker-active / lock | 节点定位根据新地图构图单独校对，背景和节点同时缩放/移动；不再只压缩节点 Y 值 |
| ForgeWindow | scene.forge、prop.furnace、fx.fire | 替换 CSS 炉体，材料区不得被底部配方遮住；视效不再次发放奖励 |
| 突破/渡劫 | scene.breakthrough、fx.ring / cloud | 境界名由 HTML 绘制，动画可跳过，reduced-motion 保留结果 |
| 日志/旧信息窗 | scene.library、panel.drawer / header / button | 正文字号和长文阅读优先，旧功能入口全部保留 |
| 底栏与常用入口 | icon.cave / world / bag / character / forge / beast / settings / audio / back | 不把生成图标上的装饰当成点击范围；实际触控至少 44 CSS px |

82 个图像分为 6 个场景、1 个人物、8 个场景物件、13 个导航/状态图标、42 个物品图标、8 个面板切片和 4 个特效。物品图标有意采用类别共用，不代表游戏每一件装备都有独占立绘；映射表必须按真实 item ID 建立。

每个图像的源文件名、源 SHA-256、源尺寸、裁切矩形、输出尺寸、alpha、pivot、字节数和输出 SHA-256 位于包内 assets/ui-v3/manifest.json。部分面板附建议 slice 值，仍需实际九切渲染检查。manifest.js 是为 file:// 模式准备的数据对象，导入器不会执行它。

## 恢复后的执行顺序

1. 先检查根目录 ZIP 是否存在，再运行 `node tools/import-ui-v3-art.cjs --check`；成功后运行不带 --check 的同一脚本。文件缺失时不要重复浏览器权限尝试。
2. 在当前 preview/ui-v3-functional-20260910 分支完成资源注册及五窗口模板/样式更新。保持引擎规则、revision、自动存档和原两项存档键不变。
3. 将旧图所有引用替换后再从生产白名单退役旧图。新美术约 2.42 MB，不能同时带入全部旧画与生成原图后声称满足现有 3 MB 发布门槛。先测实际最终 ZIP；不得为通过测试静默放宽尺寸断言。
4. 恢复教学批注和一致的菜单入口；原角色槽位详情、地图镜头和突破表现分别测试，不以旧管理弹窗存在代替新功能完成。
5. 先运行 V3 定向单测和 browser-v3-quick，打开实际五屏截图审视。验证按钮命中、320×568 短屏、长物品名、素材加载失败、滚动末尾、34px 模拟底部安全区和减少动态效果。
6. 最后重建并执行 verify:release、完整浏览器 QA；新增美术不能引用旧 ZIP 的通过报告。未经用户确认不把 userVisualApproval 改为 true，不自动覆盖 main。

## 导入工具行为

工具先核对固定 ZIP 大小和 SHA-256，再核对中央目录、本地目录、文件白名单、CRC、每个图像 SHA-256 和清单。所有验证结束后才写临时目录，再原子移动到 assets/ui-v3。拒绝目录穿越、符号链接、未知路径、重复文件、异常体积和覆盖既有不同美术。重复导入完全相同的包仅返回 already-installed-identical。

导入仅安装资源，不修改源码、浏览器配置、用户存档或 Git 分支，也不会自动将候选美术声明为正式发布。
