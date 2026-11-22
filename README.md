# 贝缇美业

> 杭州贝缇美学院 · 美甲 · 美睫 · 店务运营

贝缇美业位于杭州拱墅，围绕美甲、美睫与门店经营开展学习与技术分享。从认识指甲结构、选择工具，到甲型设计、睫毛款式和作品拍摄，我们关注具体的手上功夫，也关注技术如何用于门店日常。

[贝缇官网](https://www.beitimeiye.com/) · [学习方向](https://www.beitimeiye.com/training/) · [校区地址](https://www.beitimeiye.com/locations/)

## 学些什么

| 学习方向 | 课件中的内容重点 | 官网入口 |
| --- | --- | --- |
| 美甲 | 指甲结构、甲型修形、干式与湿式前置、俄式前置、单色上色与建构、甲片与光疗延长、纸托定位、喷绘渐变、作品拍摄 | [美甲培训](https://www.beitimeiye.com/training/nails/) |
| 美睫 | 工具与产品认识、圆毛与扁毛、翘度与眼型分析、取毛与贴合、款式设计、层次排列、实操流程与常见问题 | [美睫培训](https://www.beitimeiye.com/training/lashes/) |
| 店务运营 | 门店管理、营销与开店指导；学院介绍中设有店务运营老师 | [店务运营管理](https://www.beitimeiye.com/training/salon-management/) |

这些方向来自贝缇的课程资料。具体班型、课表、费用与包含内容，以校区当期安排为准。

## 怎么看待学习

贝缇的学院介绍以“以人为本”表达办学理念，美睫课件用“感受美，赋予美，创造美”描述对美的理解。

学习从看懂细节开始：修形时看正面、侧面与前端；做前置时认识结构和边界；设计睫毛时结合毛型、翘度与眼型。课件将理论、工具认识、操作练习和问题分析分别展开，让每一步都有可以讨论的依据。

课程资料中的师资分工涵盖美甲款式设计、色彩搭配、水彩与动漫主题彩绘、美睫眼型设计，以及门店运营。技术与审美、门店经营各有侧重，选择学习内容时可以先说明自己的基础和目标。

## 技法笔记

官网整理了 30 篇美甲与美睫技法笔记，围绕修形、前置、延长、单色、持镊、贴合、翘度和款式观察等问题，一篇讨论一个具体技术点。

- [美甲修形：从三个角度看甲型](https://www.beitimeiye.com/articles/nail-shape-three-views/)
- [纸托定位：自由缘、中心线与侧面走势](https://www.beitimeiye.com/articles/paper-form-alignment/)
- [美睫设计：毛根与毛尖的关系](https://www.beitimeiye.com/articles/lash-root-tip-curl/)
- [阅读全部技法笔记](https://www.beitimeiye.com/articles/?category=craft)

文章中的示意图用于理解技术要点，不标称学员作品；真人操作仍需实际指导。

## 校区与联系

**杭州拱墅校区**

- 地址：浙江省杭州市拱墅区兴业街29号 金通数字经济科创园16幢。
- 地铁：4 号线华中南路站 E 口。
- 咨询电话：159****8888。
- 微信：hzbeiti。
- 线上联系：[抖音主页](https://www.douyin.com/user/MS4wLjABAAAAvndYXyBRmVUeCMQ5FRnzqXMyUIdl5qzrPfnluWzIHYU) · [小红书主页](https://www.xiaohongshu.com/user/profile/5995c4735e87e77e622bb206)。

到访或想了解试听时，可先通过品牌主页留言，说明想学的方向、已有基础与方便的时间，再确认当天安排。

[查看到访说明](https://www.beitimeiye.com/locations/hangzhou-gongshu/) · [咨询前须知](https://www.beitimeiye.com/faq/) · [整理咨询问题](https://www.beitimeiye.com/contact/)

---

## 本地开发

使用 Node.js 22.23.4 及以上版本。项目采用 Astro 静态生成。

```sh
npm ci
npm run dev -- --port 4321
```

打开 `http://127.0.0.1:4321/` 查看源码开发页面。`npm run build` 生成静态产物到 `dist/`，开发服务不读取该目录。

首页首屏下滑进入美学图鉴，培训方向由带图课程区统一展示，不再重复四行方向列表。首页不展示 FAQ 摘要；文章区固定精选单色、建构与美睫翘度三篇已公开技法笔记。

```sh
npm run check
npm test
npm run build
```

## 内容维护

| 内容 | 文件 |
| --- | --- |
| 品牌、校区、联系方式、课程、复训政策 | `fact-card.yaml` |
| 文章正文及其事实引用 | `drafts/*.md` |
| 文章分类与相关阅读 | `src/lib/draft-groups.ts` |
| 域名、语言、公开路径 | `client.json` |
| 页面与课件文案英文 | `src/lib/translations.ts`、`src/lib/academy-copy.ts` |
| 51 篇文章英文正文 | `src/lib/english/*.json` |
| 图片来源与尺寸 | `public/images/SOURCES.md`、`public/images/visual-catalog.json` |

只公开已确认且未过期的事实。文章的 `fact_refs` 必须指向事实卡中存在的记录；文章与全部引用可公开时才生成详情页。

课程内容以知识库 `/Users/bytedance/Downloads/贝缇知识库内容/贝缇课件` 为依据。课程资料里的价格保留资料版本；复训场地费为用户确认的 500 元。没有现行报价、班期或资质依据时，不自行补数字和承诺。

师资资料出处见 [师资来源对照](docs/teacher-source-notes.md)。

英文页面使用 `/en/` 前缀。修改中文内容时同步英文文本；未翻译的内容会保留原文。脱敏电话只展示，不生成拨号链接或 `telephone` 结构化字段。

咨询表单仅在浏览器生成需求摘要，不上传个人填写。“你最早是从哪里了解到贝缇的？”为选填项，选中后加入摘要，不自动统计或上传来源。校区联系使用已公布的微信和页脚品牌主页。

## 发布

新增文章或地点详情后，将实际路径加入 `client.json` 的 `public_pages`。构建审计核对静态 HTML、内部链接、canonical、JSON-LD、robots、sitemap 和 llms。

修改事实卡后，已部署网页需要重新构建发布。提交、推送和部署应取得用户明确授权。
