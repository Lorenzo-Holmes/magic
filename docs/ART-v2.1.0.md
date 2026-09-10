# v2.1.0 美术记录

生成方式：内置 imagegen。两幅独立原创场景均使用文本提示直接生成；没有复制参考项目美术，也没有采用用户提供人物的具体脸貌。交付中的标题、地图地名和按钮全部为 HTML，可选择、可点击。

| 用途 | 正式文件 | 原稿 |
| --- | --- | --- |
| 草庐与打坐剪影 | assets/art/retreat-v2.1.webp | output/imagegen/retreat-v2.1-original.png |
| 六地山海舆图 | assets/art/atlas-v2.1.webp | output/imagegen/atlas-v2.1-original.png |

原稿保留在本地；正式文件为原分辨率 WebP 编码，质量 0.8。转换仅压缩，不裁剪或重绘；页面以 CSS 适配不同视口。WebP 共 760,562 字节，随离线包加载，不依赖图片服务器。

## 草庐最终提示词

Use case: stylized-concept. Asset type: production illustration for a Chinese cultivation game, not a UI mockup. Create a landscape 1536x1024 traditional Chinese ink-and-wash painting on warm aged xuan paper. In a humble mountain retreat, a small anonymous cultivator with tied hair sits cross-legged meditating on a weathered stone at the center lower third. The person is an entirely dark ink silhouette with loose robe and no facial detail or gender emphasis. A gnarled pine frames one side, a modest wooden shelter and stone steps suggest a place to return to, distant mist mountains dissolve into unpainted paper. Dry brush edges, spare human-looking calligraphic strokes, restrained mineral green and old ochre, asymmetrical literati landscape composition. Keep much of the upper half quiet and low contrast. Calm, worn, grounded, book-illustration quality. No text, no calligraphy characters, no logo, no watermark, no icons, no interface, no magic circles, no glow, no golden geometric rings, no glossy render, no photorealism, no anime face, no ornate fantasy palace. This is an actual scene artwork used behind HTML controls.

## 山海图最终提示词

Use case: stylized-concept. Asset type: production exploration map illustration for an offline Chinese cultivation game; no interface or labels. Landscape 1536x1024. Draw a coherent hand-painted Chinese shan-shui regional travel map on warm unpainted xuan paper, oblique aerial viewpoint with legible footpaths and river connections. Six clearly separated landmarks: southwest dense black-pine woodland with a small cave; southeast reed marsh and a weathered ferry jetty; central-left modest mountain village and market huts; northwest tall grey broken sword-like peaks with stone steps; northeast ruined monastery with broken red walls; east a rust-red canyon with a hanging bridge. Small empty central clearing and winding paths connect the six places, with plenty of cream paper between mountain masses. Each landmark should feel like a place to explore, with human scale, not an icon. Traditional dry ink brush, mineral jade washes, muted grey, old ochre and restrained vermilion, rough fibre texture, sparse old travel-journal illustration. Organic irregular linework, little shadows, no 3D rendering, no glossy game assets. No text, no Chinese characters, no labels, no lettering, no grid, no UI panels, no border, no compass icon, no watermark, no neon, no glowing magic, no decorative golden circles.

## 视觉取舍

温灰纸色、深墨文字、少量旧金与朱印。人物无脸部与性别细节，采用盘膝打坐的黑色剪影。去除发光法阵和满屏粒子，场景保持静态；保留用户操作后的文字反馈和已有可跳过战斗回放。
