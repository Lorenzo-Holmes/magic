# v1.11.0 水墨视觉素材

- 用途：用户确认的「国风水墨＋鎏金」首页山水。
- 生成方式：内置 imagegen；未使用 CLI/API 回退。
- 交付：`assets/ink-landscape.svg`，1536 × 1024，自包含 SVG 内嵌 WebP；无外部资源请求。WebP 编码质量 0.86，像素尺寸不变，编码数据 185,164 字节。
- 样式：`src/visual-theme.css`；首页墨青山水与朱砂印、鎏金主操作、暖纸事件卷轴、境界印章、三类行动图标、统一弹窗与窄屏间距。
- 图片仅作装饰，空替代文本；章节、标题、叙事与按钮均为可访问的真实 HTML。
- 视觉层不修改存档 schema、规则、RNG 或行动结算。保留系统减少动态设置。

## 最终生成提示词

Use case: stylized-concept. Asset type: illustrated hero background for a Chinese cultivation game titled 我欲飞升. Create a refined traditional Chinese ink-wash shanshui landscape with understated gold accents. Panoramic 1536x1024 composition: left half spacious deep ink-teal atmospheric mist with subtle distant mountains, intentionally low detail and low contrast to accommodate large cream Chinese typography overlaid later; right half richly textured steep layered mountains, twisted pine silhouette, tiny lone robed swordsman standing on a rocky cliff near lower right-center, gazing toward a pale antique-gold moon in upper-right. Hand-painted wet ink on fine rice paper, flowing brushwork, dry brush rocky texture, drifting cloud sea, airy depth, nuanced desaturated jade and midnight teal, gold moonlight delicately tracing a few ridge edges. Immersive quiet xianxia, elegant and restrained, visually sophisticated. Overall dark ink-green palette matching #081a1d and #21423e; cream/gold accents matching #dfc185. All four edges fade into deep dark ink teal. No text, no letters, no symbols, no signature, no frames, no logo, no UI, no watermark. Avoid flat vector shapes, polygons, cartoon, 3D, neon, oversaturated colors. This is only the landscape art, not a screenshot.
