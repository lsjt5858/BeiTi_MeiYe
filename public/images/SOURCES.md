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
