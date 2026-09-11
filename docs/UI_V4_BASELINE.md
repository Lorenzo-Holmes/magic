# UI V4 · 本轮执行基线

原任务：《我欲飞升_前端实施清单_UIV4_v1.1.md》，用户要求开始按清单执行。

工作目录 `D:\我欲飞升`。开始时分支 `design/practice-focus-20260911`，HEAD `14afd1cb692aab778a5c649289f62064dc6ae099`，package 3.0.2。
新工作分支：`feat/ui-v4-unified`。本轮未创建 DevSpace Goal，不存在 goalRef。
开始时唯一未跟踪文件 `docs/CULTIVATION_REDESIGN_V4.md`，不得覆盖或纳入自动提交。未暂存与已暂存源码差异为空。
本地 main/origin/main 跟踪引用均为 f353cd7；未 fetch，不将其写为远端实时版本。

## 当前批次

先完成 UI-00→01→02→03；P0 范围包含仙界低对比文字、新旧两套导航、主题和控件。
UI-04 需先确认资源字节。Windows 目前无 assets/ui-v4，只有 dao-body.webp 一张人物；聊天中生成的其他图尚未导入。四张配对坐姿亦未提供。不得提前填写四角色已完成。
后续任务依赖不满足时可准备不依赖素材的代码，但不能跳过入库验收、用户视觉确认或擅自发布。

## 现场证据与可重复数据

`node tools/ui-v4-acceptance.cjs --baseline` 从原引擎合法行动生成固定 seed 的样本，覆盖普通修行、五槽进化、创世与四个功能页。
输出在 `output/ui-v4-foundation/before-*`；记录源码摘要、状态摘要、同视口截图、文字最终 color/background/opacity。after 使用完全相同生成函数。
测试浏览器是隔离临时上下文，不读取或写入用户正在使用的浏览器存档。

## 数据与构建冻结项

保留 FSEngine.transition、revision、persist、两个原存档键；凡界四槽与仙界五槽不合并。
不引入 React/Vue/CDN，不添加资源、职业、装备级别或收益规则。
ZIP <3,000,000，生产原始文件 <10,000,000。修改后重新构建、校验，同包测试；旧 3.0.2 通过数不算本轮证据。
GitHub push/main 与 Cloudflare deploy 本轮未授权，不执行。
