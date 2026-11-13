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
旧路径 `beiti-portrait.jpg`、`beiti-detail.jpg`、`beiti-ritual.jpg` 已分别用上述
真图的完整二进制副本覆盖；网页只引用 `generated` 文件，不保留灰色占位素材。

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
