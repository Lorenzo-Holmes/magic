# UI V4 共享层迁移表

本批次范围 UI-01/02/03；其它窗口逐页迁移尚未完成，不宣称所有 CSS 已退役。

| 原规则 / 构造 | 新归属 | 状态与退役条件 |
| --- | --- | --- |
| UI3.renderHud 中的四项模板 | src/ui/navigation.js | 已委托；兼容类 v3-hud 仅供旧 QA 与布局选择器 |
| FSWorkbench.navigation(left) 字形模板 | 同一 navigation.js | 已委托，不再拼“修/游/器/人” |
| app.js 两套游戏外壳 | route-model.js + shell.js | 已统一容器；保留 V3 window 渲染器及旧章节内容模板 |
| practice-focus 只针对导航的灰度与私有背景 | navigation.css | 已删除，导航始终为同一暗玉材质 |
| 仙界浅底/浅字、整按钮 opacity | legacy-adapter.css + buttons.css | P0 适配；仙界独立组件逐项移出后退役对应选择器 |
| 全局 --paper 同时作字体和纸色 | 新 light/dark 语义 token | 新控件不再使用歧义变量；旧玩法面板仍须逐页清理 |
| FSWorkbench 右侧 state.log 手记 | components.journal(context) | 改为页内折叠册；仙界 journal/创世 history/凡界 log 分离 |
| 纸面 dialog 从舞台继承颜色 | dialog.ui-dialog[data-surface=light] | 原 dialog 与原焦点逻辑不变，仅固定表面 |
| 地图节点/装备槽/修炼圆主动作 | 保留原空间控件 | 不统一拉成矩形按钮；后续 UI-06～09 检查素材与状态 |

加载顺序：原样式→practice.css→tokens/theme/typography/panels/buttons/layout/navigation→legacy-adapter。
新代码不得新增无范围的 color:white 或在文件尾堆叠全局 !important。

## 对初始色值的实测校准

初始浅面板禁用字 #6A655A 在凹槽底 #E3DECF 上仅 4.31:1；改成 #656054。
浅色动作 #486A61 在该底面仅 4.45:1；保留基础玉色但动作语义改为 #45665E。
深面板禁用字在动作底面的最低值不足 4.5；调整为 #9CAAA1。
这是针对真实控件表面的校准，不改变 4.5:1 验收阈值。单测直接读取实际 CSS 变量，浏览器另验最终计算颜色、透明度和表面。
