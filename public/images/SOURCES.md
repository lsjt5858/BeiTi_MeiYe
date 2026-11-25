# 贝缇美业品牌生成影像

这三张图片仅用于品牌美学表达，不代表真实门店、员工、客户成果或在售产品。

唯一来源为 `https://copilot-cn.bytedance.net/api/ide/v1/text_to_image`。
通过宿主合法鉴权的原生 `GenerateImage` 工具调用同一后端接口生成，
不是从外部图库下载。原始中文摄影提示词、尺寸参数及完整 URL 的确定性计算
保存在 `src/components/brand-media.mjs`，`generationUrl` 使用 `encodeURIComponent(prompt)`。

| 网页引用的冻结原图 | 生成记录 ID | 尺寸参数 |
| --- | --- | --- |
| beiti-hero-generated.jpg | portrait | landscape_16_9 |
| beiti-detail-generated.jpg | detail | landscape_16_9 |
| beiti-ritual-generated.jpg | ritual | landscape_16_9 |

三张均已检查为 2560 x 1440 JPEG，并逐张查看实际摄影内容。
未经鉴权直接请求 URL 会返回灰色提示图片，不能以 HTTP 200 判定生成成功。
首页和文章统一引用表中的三张原图，不保留内容完全相同的旧文件名副本。

可在项目根目录打印准确来源 URL：

```sh
node --input-type=module -e 'import {brandMedia} from "./src/components/brand-media.mjs"; for (const image of brandMedia) console.log(image.src, image.generationUrl)'
```

网页优先加载本地冻结原图，避免在每次访问时重新生成或等待外部图像接口。

## 培训与细节影像（2026-11-13）

经用户指定，从已生成并查看的“贝缇美业-培训与细节影像-20261113”选图包导入 60 张原图，按六个系列各保留 10 张。原始文件仍保留在用户的选图包中，不进行移动或删除。

| 网站目录 | 系列 | 原图数量 |
| --- | --- | --- |
| `training/nails/` | 美甲培训 | 10 |
| `training/lashes/` | 美睫培训 | 10 |
| `training/salon-management/` | 店务运营培训 | 10 |
| `gallery/nails/` | 美甲细节 | 10 |
| `gallery/lashes/` | 美睫细节 | 10 |
| `gallery/japanese-nails/` | 日式美甲 | 10 |

每组文件以 `01`～`10` 编号：`01.jpg` 是完整 2560×1440 JPEG 原图；`01-960.webp`（960×540）和 `01-1600.webp`（1600×900）用于响应式加载。图片原图、对应系列、中英文标题、原始文件名和 SHA-256 记录在 `visual-catalog.json`。来源仍为宿主 `GenerateImage` 调用同一 `text_to_image` 后端，未重新生成或下载外部图库。

新增图片用于品牌概念和学习方向展示，不代表真实课堂、员工、门店或客户成果。美睫练习图中的器具细节不能代替专业操作指导。页面保留概念影像说明，不将图片作为已确认课程、资质、评价或营业事实。弹窗查看完整原图；无 JavaScript 或不支持 dialog 时，图片链接仍可直接打开原图。

## 技法文章配图

摄影图来自知识库 `官网摄影配图30张/`，放在 `technique/`；概念图来自 `去除.md文档AI味并重构文案/`，放在 `technique/diagrams/`。摄影图压缩为1600×900，概念图为1400×1050，原始文件保留在知识库。

概念图按中文概念对应文章，不能按文件排序配对：

| 文章 slug | 概念图源文件 |
| --- | --- |
| nail-shape-three-views | 甲型观察.png |
| nail-structure-before-prep | 前置认知.png |
| dry-wet-nail-prep | 干湿前置.png |
| russian-prep-safe-pocket | 前置边界.png |
| nail-tool-maintenance | 工具养护.png |
| solid-color-even-coating | 单色观察.png |
| nail-color-clean-margins | 边缘控制.png |
| nail-structure-light-reflection | 建构光圈.png |
| tips-vs-gel-extension | 延长选择.png |
| paper-form-alignment | 纸托定位.png |
| shallow-tips-position | 浅贴比例.png |
| almond-oval-tips | 甲型收口.png |
| square-tube-c-curve | 方管横弧.png |
| extension-gel-bubbles | 气泡记录.png |
| airbrush-soft-gradient | 渐变过渡.png |
| round-flat-lash-selection | 圆扁毛型.png |
| lash-curl-jbcd | 翘度认知.png |
| lash-root-tip-curl | 根尖关系.png |
| lash-tweezer-support | 持镊支撑.png |
| lash-straight-line-view | 毛向观察.png |
| lash-adhesion-ab-points | 贴合观察.png |
| lash-glue-working-time | 胶水节奏.png |
| lash-root-gaps-shape | 连接排错.png |
| lash-contour-framework-fill | 框架填充.png |
| lash-length-point-map | 长度地图.png |
| tassel-lash-layer-spacing | 流苏层次.png |
| manga-lash-column-three-lines | 漫画三线.png |
| fox-lash-tail-flow | 狐系毛向.png |
| natural-lashes-space-color | 自然留白.png |
| lash-design-open-eye-review | 多角复盘.png |

## 课件师资照片

用户授权将知识库课件中的老师照片用于官网师资介绍。以下图片从原始课件对应介绍页提取，裁去背景后转为 WebP，未生成或改画人物。照片和同页介绍成对保存；没有姓名的课件照片只显示原职务。

| 网站图片 | 原文件与页码 | 裁剪后尺寸 | SHA-256 |
| --- | --- | --- | --- |
| `team/yuanyuan-2025.webp` | `2025美睫全科班.pptx` 第2页自我介绍，`ppt/media/image8.png` | 334×502 | `9af1ba4a463fcc1eb02975613f096aab644c3870d4000c26642bcbbc150847cb` |
| `team/nail-teaching-2025.webp` | `贝缇基础强化班2025.pdf` 第7页，`IM39.jpg` | 540×720 | `fa0bd1d0a5db9312fa62867687324e58895c25db72349d1c32e5a261a1a37269` |
| `team/salon-management-2025.webp` | 同上第8页，`IM42.jpg` | 540×720 | `b3f0db1d8ebcdc0b4fa814e0727696ad5b10478d03bb9934c50a3c33c68425f7` |
| `team/lash-director-2025.webp` | 同上第9页，`IM45.jpg` | 540×720 | `7bd57199373b0d902999a87948add5ebfb961308a0189cc65c6a731d02b75990` |
| `team/nail-art-instructor-2025.webp` | 同上第10页，`IM48.jpg` | 540×720 | `fe2446997877dd1d5405f0075cc0943c10437cffd10aa9fa1c1af656296c2454` |

完整图文对应及裁剪坐标见 `docs/teacher-source-notes.md`。用户确认安妮老师管理美甲方向，但没有指明课件中哪张照片是安妮，未据此为任何照片猜配姓名。

## 课程介绍影像（2026-11-26）

经用户指定，从贝缇官方小红书账号「A贝缇杭州美甲培训」的课程介绍笔记
（`https://www.xiaohongshu.com/explore/67790b35000000001300ef25`，2025-07-17 发布）
下载课堂与课程海报原图，转为本地冻结 WebP，放在 `course/`。原图共 13 张，
10 张下载成功，其中 1 张含与现行班型口径不一致的旧宣传文字（30-day course）未采用，
实际采用 5 张。图片为机构自有发布内容，无平台水印。

| 网站图片 | 内容 | 尺寸 | SHA-256 |
| --- | --- | --- | --- |
| `course/beiti-nail-fundamental-12day-poster.webp` | 美甲小全科 12 天课程海报（DAY1-12 大纲，含底部横幅原图） | 1080x1439 | `7d4fb77313b40c1889b931bd6c60f100b2ef1aefcc2d34569d35738fe2dbb6b3` |
| `course/beiti-nail-master-25day-poster.webp` | 美甲大师班 25 天课程海报（DAY1-25 大纲，含底部横幅原图） | 1080x1439 | `bb0aca47f43a2a0fd918655564e5ae6050836886e3dbd9bbb5b0e27cd599676d` |
| `course/beiti-graduation-group-photo.webp` | 结业合影与结业证书 | 1620x1080 | `ff4d0c5f4e7a283e7d00fbe00d882781bf30323f962e4488a9429b760d1cc786` |
| `course/beiti-lash-styles-grid.webp` | 美睫款式九宫格（狐系、漫画、婴儿弯等） | 1080x1080 | `08d4808a1509072d251ff4a6cc262de628c517458dcc8aaab9f2cfee002897cd` |
| `course/beiti-nail-works-grid.webp` | 长款延长甲作品六宫格 | 1080x1440 | `5424306330561e9468201356a19808f6d2ed60b6a87bc14d0482a5eb5eda2199` |

两张课程海报按官方笔记原图完整使用（1080x1439，未经裁剪），底部横幅包含
「免费送所有材料」「免费复学」「两年内免费复训（复训收500场地费）」「无任何隐形消费」
「小班制教学模式」等官方课程表述。海报内的价格信息不作为网站报价依据；
带价格水印的作品图未采用。
