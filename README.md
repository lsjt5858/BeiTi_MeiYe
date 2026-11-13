# BeiTi_MeiYe

> 网站框架与功能列表

## 目录

1. [核心设计原则](#核心设计原则)
2. [内容与数据层](#内容与数据层)
3. [网站结构（信息架构）](#网站结构信息架构)
4. [页面功能](#页面功能)
5. [全站功能](#全站功能)
6. [技术特性](#技术特性)
7. [构建与部署特性](#构建与部署特性)

## 核心设计原则

1. **基于“事实卡片”（Fact-Card）驱动**：价格、地址、课程、政策等数据应统一从 `fact-card.yaml` 文件中读取。仅“已确认”的事实才会呈现在公开页面上。
2. **内容以原生 HTML 呈现**：采用静态站点生成 (SSG) 或服务器端渲染 (SSR) 技术，确保核心内容不依赖客户端 JavaScript 即可加载。
3. **一页一问题**：每个页面或文章应针对一个真实的用户问题，并在首段直接给出结论。
4. **明确边界**：每个服务页面都应界定“适用人群 / 不适用人群 / 限制条件”。
5. **无内容，不建页**：若无相关评价或注册编号，则不应创建对应的评价页面或展示注册编号。

## 内容与数据层

### 数据来源

```text
fact-card.yaml  ──►  事实信息：价格、地址、课程、政策等
drafts/*.md     ──►  文章页面（包含元数据：slug、标题、描述、问题、事实引用、状态）
client.json     ──►  品牌名称、基础 URL (base_url)、语言、站点环境
```

### 确认与发布规则

- 事实状态：`unknown`（未知）/ `pending`（待处理）/ `confirmed`（已确认）/ `conflict`（冲突）/ `expired`（已过期）；仅渲染“已确认”项。
- 草稿 `status`：仅 `confirmed`（已确认）状态的草稿会被发布。
- 若引用的事实编号缺失，构建过程将失败。

## 网站结构（信息架构）

```text
/                         首页
/services/                服务/产品概览
/services/{slug}/         具体服务/课程/产品页面
/training/                美业培训方向概览
/training/nails/          美甲学习方向
/training/lashes/         美睫学习方向
/training/salon-management/ 店务运营学习方向
/gallery/                 美学图鉴概览
/gallery/nails/           美甲细节
/gallery/lashes/          美睫细节
/gallery/japanese-nails/  日式美甲
/pricing/                 价格信息
/about/                   关于我们/团队介绍
/locations/               地点概览
/locations/{slug}/        具体地点页面
/faq/                     常见问题解答 (FAQ)
/reviews/                 用户评价（仅在获得授权时提供）
/articles/                文章列表
/articles/{slug}/         文章详情
/contact/                 联系方式与预约
/robots.txt  /sitemap.xml  /llms.txt (可选)
/privacy/  /terms/        隐私政策与服务条款（按需提供）
```

## 页面功能

| 页面 | 核心内容 | 功能特性 |
| --- | --- | --- |
| **首页** | 品牌名称、标语、核心服务、适用对象、事实概览、联系方式 | 事实概览组件；核心服务卡片；行动号召 (CTA)（咨询/预约）；最新文章 |
| **服务/产品页面** | 内容详情、目标受众、时间安排、价格、条件限制、常见问题 | 参数表格；价格区块；“不适用人群”板块；相关常见问题/文章；结构化数据 |
| **价格页面** | 价格、计费单位、包含/不包含项目、生效日期 | 价格对比表；评论日期；计费规则展示 |
| **关于/团队** | 实体信息、人员、资质、机构概况 | 人员卡片；资质展示；组织（Organization）结构化数据 |
| **地点页面** | 名称、地址、营业时间、交通方式、预订规则 | 地图标记或导航链接；按 ID 区分不同地点；本地企业（LocalBusiness）结构化数据 |
| **常见问题 (FAQ)** | 真实问题及直接解答 | 问题编号；锚点链接；FAQ 页面（FAQPage）结构化数据；可选筛选功能 |
| **评论页面** | 经授权且可追溯的评论 | 来源与日期展示；若无评论则不生成该页面 |
| **文章页面** | 以用户问题为标题，提供直接解答、讨论、行业标准及真实案例 | 文章模板；最后更新日期；相关服务链接；文章（Article）结构化数据；面包屑导航 |
| **联系/预订页面** | 联系方式、预订流程 | 咨询/预订表单；“点击通话”或地图交互追踪；防垃圾信息机制 |

## 全站功能

### 导航与内容维护

- **导航**：顶部导航栏、页脚及面包屑导航。
- **页面更新日期**：基于事实卡片或草稿更新自动生成。
- **事实一致性**：全站事实采用单一来源；更新内容同步至全站。

### 体验与数据分析

- **响应式设计与无障碍访问**：移动端优先；图片包含替代文本 (alt text)；关键媒体内容配有文字描述。
- **站内搜索**：可选功能，适用于内容量较大的站点。
- **基础数据分析**：追踪访问量、表单提交情况及流量来源（含 AI 对话来源追踪）。

## 技术特性

| 功能 | 描述 |
| --- | --- |
| 静态生成 / SSR（服务端渲染） | 内容直接嵌入 HTML 中 |
| `robots.txt` | 仅允许抓取经客户确认的内容 |
| `sitemap.xml` | 自动生成，仅包含客户指定的页面 |
| 规范链接 (Canonical) | 指向客户的实际域名 |
| JSON-LD | 各类实体的结构化数据；仅在存在真实评论时包含评论数据 |
| `llms.txt` | 可选配置（​​不保证被用于引用） |
| Noindex 控制 | 用于临时页面或草稿页面 |
| 状态码与重定向 | 符合 200/301/404 标准，无死链 |
| 审计集成 | 构建后执行 `geo-audit`（地理审计），阈值设定为 `>= 80` |

## 构建与部署特性

1. **构建前检查**：识别并标记占位符、未确认的事实、重复的草稿以及夸张表述。

## 本地开发与内容维护

本节说明当前实现；前文保留为网站功能目标，不代表全部业务数据已经确认，也不代表网站已部署或接入预约系统。

全站顶部导航在滚动时固定，内页与锚点按导航高度预留空间；首页保留整屏影像。咨询表单及 FAQ 筛选框使用 12px 圆角，咨询必填字段采用图标与 `*` 标记，并保留读屏提示和原有校验规则。输入提示同时提供中文和英文。

“探索美业”现接入“美业培训”和“美学图鉴”。首页方向列表为“美甲培训 / 美睫培训 / 店务运营管理 / 视频美学”，保留英文副标题；第四项附“赠送课程内容”，从事实卡片 `course.video-aesthetics.gift` 读取已确认文案。课程内容和安排使用待补充说明。首页增加“一张大图＋两张小图”的细节精选区，以及左右交替的培训方向区；原三张首页轮播保留。培训页保留前三个方向，咨询选项同时增加“视频美学”；图鉴分为美甲细节、美睫细节、日式美甲，每组提供 10 张美学影像。当前不提供美妆、护肤咨询；相关图片仍保留作视觉素材，后续可继续补充内容。培训方向页不代表已开班或可报名，课期、费用和地点继续按事实卡片确认后提供。

### 安装与运行

项目根目录为 `/Users/bytedance/zimeiti/BeiTi_MeiYe`。使用 Astro 7.4.10 静态生成、TypeScript 与少量原生浏览器 JavaScript。`package.json` 要求 Node.js `>=22.23.4`、npm `>=9.6.5`；本轮使用 Node.js `v26.5.0`、npm `11.17.0`。请先选择满足要求的 Node.js，再在项目根目录执行一次安装：

```sh
npm_config_cache=/tmp/beiti-npm-cache npm ci
```

安装使用 `package-lock.json` 锁定依赖；当前依赖已安装，不需要在运行中的开发服务器旁重复安装。所有下列 npm 命令都将缓存限定在临时目录，不修改全局 npm 配置。

本地开发：

```sh
npm_config_cache=/tmp/beiti-npm-cache npm run dev -- --host 0.0.0.0 --ignore-lock
```

默认访问 `http://localhost:4321/`，实际端口以终端输出为准。`0.0.0.0` 允许局域网访问，请仅在可信网络使用；只需本机访问时可把 host 改为 `127.0.0.1`。Astro 7 在 Agent 环境可能自动转入后台；此处 `--ignore-lock` 保持前台进程供 TRAE 跟踪，也会跳过实例锁，因此**已有服务器时不要再次启动**。结束自己启动的前台进程可使用终端 Ctrl+C。

TRAE Run 按钮配置保存在 `.trae/environments/run.json`，默认动作 `beiti-web`（贝缇美业）使用上述精确命令并打开本地预览。该命令已有当前请求的 HTTP 200、正确页面标题与品牌 H1 证据；保存配置不另起服务器。开发工具栏通过 `astro.config.mjs` 的 `devToolbar.enabled: false` 关闭，配置热重载由 Astro 管理。

构建、检查和测试：

```sh
npm_config_cache=/tmp/beiti-npm-cache npm test
npm_config_cache=/tmp/beiti-npm-cache npm run check
npm_config_cache=/tmp/beiti-npm-cache npm run build
```

- `npm test` 使用 Node 原生测试运行器，覆盖事实门控、草稿引用、SEO、真实临时目录构建、静态审计、咨询校验与首页方向映射、关于页确认资料/非法形状/安全渲染、轮播状态和分析边界；关于页测试复制真实应用源码到 `/private/tmp` 构建，不用镜像模板，不把测试确认数据写入根事实卡片。它不替代浏览器视觉与交互验收。
- `npm run check` 先执行内容检查，再执行 `astro check` 的 Astro/TypeScript 诊断。
- `npm run build` 顺序执行内容检查、Astro 静态构建、真实 `dist` 的 `geo-audit`。审计逐项检查页面/内部链接、标题描述、H1、日期、语义入口、静态正文、SEO、已确认 JSON-LD、事实泄漏与搜索文件；总分须 `>=80`，关键失败即使达到分数也会非零退出。
- 可单独运行 `npm_config_cache=/tmp/beiti-npm-cache npm run content-check` 或 `npm_config_cache=/tmp/beiti-npm-cache npm run geo-audit`；后者要求已有当前构建产物。
- 当前 pending 哨兵与草稿会产生“未公开”检查提示，这是保留样例的预期结果，不能通过改为 confirmed 来消除提示。

Astro 与 Vite 的可写缓存分别保存在项目自己的 `.astro/cache/` 和 `.astro/vite/`，均不提交。临时构建即使复用已安装的依赖，也使用自己的缓存目录，避免并行测试和本地预览相互覆盖缓存。

构建产物位于 `dist/`。需要另行检查构建后的页面时，在没有占用相应端口的实例情况下执行：

```sh
npm_config_cache=/tmp/beiti-npm-cache npm run preview -- --host 127.0.0.1 --port 4322 --ignore-lock
```

构建预览访问 `http://localhost:4322/`（以实际输出为准）。这条预览命令的参数已通过 Astro CLI help 核对，但本轮没有启动额外预览进程。静态构建成功不代表部署成功；当前没有执行任何生产部署。

### 目录与真实入口

```text
client.json                 品牌、语言、预览/生产模式、公开路径与可选分析配置
fact-card.yaml              唯一业务事实来源：facts 数组
drafts/*.md                 带 YAML frontmatter 的文章草稿
src/lib/content.ts          事实/草稿加载、确认过滤、字段和引用校验
src/lib/seo.ts              canonical、JSON-LD、搜索文件和公开路径规则
src/lib/contact.ts          咨询白名单、字段校验、纯文本摘要
src/pages/                  首页、常规内页、动态服务/地点/文章/评价及 SEO 文件
src/pages/training/         培训概览与三个学习方向页面
src/pages/gallery/          图鉴概览与三个风格系列页面
src/lib/visual-catalog.ts   中英文影像与学习方向元数据
src/lib/visual-routes.ts    培训/图鉴路径与编辑内容更新时间
src/components/Visual*.astro 图片、介绍与原图弹窗组件
src/components/HomeVisuals.astro 首页图鉴与培训精选区
src/components/visual-interactions.mjs 图鉴筛选、原图弹窗及键盘操作
src/pages/_shared/          共用内页布局、安全值处理、about.ts 资料类型过滤
src/layouts/                全站 HTML head、导航与页脚集成
src/components/             公共组件、品牌图片元数据与交互脚本
src/styles/global.css       公共视觉与响应式样式
src/styles/visuals.css       培训、图鉴和首页精选区的图文排版
public/images/              冻结摄影 JPEG 和 SOURCES.md 来源说明
public/images/training/     美甲、美睫、店务运营，各 10 张原图及响应式 WebP
public/images/gallery/      美甲、美睫、日式美甲，各 10 张原图及响应式 WebP
public/images/visual-catalog.json 图片来源、原始文件名、标题及 SHA-256
scripts/content-check.ts    构建前内容检查
scripts/geo-audit.ts        只读构建产物的静态审计
tests/                      数据、构建、审计与咨询回归测试
.trae/environments/run.json TRAE Run 动作
dist/                       静态产物（忽略，不提交）
```

原有固定页面为 `/`、`/services/`、`/pricing/`、`/about/`、`/locations/`、`/faq/`、`/articles/`、`/contact/`、`/privacy/`、`/terms/`；新增 `/training/`、`/training/nails/`、`/training/lashes/`、`/training/salon-management/`、`/gallery/`、`/gallery/nails/`、`/gallery/lashes/`、`/gallery/japanese-nails/`，合计 18 个正式中文页面及其英文版本，另有 `404.html` 与 `robots.txt`、`sitemap.xml`、`llms.txt`。服务、地点、文章详情按可公开内容生成；没有授权评价时不生成 `/reviews/`，也不展示评价导航。未生成路径的 HTTP 404 还取决于所用静态托管的正确配置。

### 事实维护：先核实，再发布

`fact-card.yaml` 顶层必须为 `facts` 数组。每项必需 `id`、`type`、`status`、`value`、`updated_at`，可选 `expires_at`；日期必须是有效的 `YYYY-MM-DD`。只公开 `confirmed` 且没有过期的记录，`expires_at` 当天仍有效。`unknown`、`pending`、`conflict`、`expired` 均不公开。

以下是**待核实样例**，不是报价或已开设服务；如需试用，可追加到事实数组，必须保持 `pending`，不要替换现有记录：

```yaml
  - id: sample.service
    type: service
    status: pending
    value:
      slug: sample-service
      name: 示例服务（未核实，不公开）
      summary: PENDING_ONLY_NOT_PUBLIC_SAMPLE_SUMMARY
      audience: [样例适用条件]
      notFor: [样例不适用条件]
      limits: [样例限制]
      duration: PENDING_ONLY_NOT_PUBLIC_SAMPLE_DURATION
      price: PENDING_ONLY_NOT_PUBLIC_SAMPLE_PRICE
      unit: PENDING_ONLY_NOT_PUBLIC_SAMPLE_UNIT
      effectiveDate: '2026-11-11'
      includes: [样例包含项目]
      excludes: [样例不包含项目]
    updated_at: '2026-11-11'
```

字段来自现有源码，不使用 `effective_date`、`not_for` 等未接通名称：

- `service.value`：必需 `slug`、`name`；可选 `summary`、`audience`、`notFor`、`limits`、`duration`、`price`（字符串或数字，0 不被当作缺失）、`unit`、`effectiveDate`、`includes`、`excludes`。列表字段接受字符串或字符串数组；价格页与服务详情使用同一 `effectiveDate`，缺失时显示尚未确认，绝不拿 `updated_at` 冒充价格生效日期。
- `location.value`：必需 `slug`、`name`；可选 `address`、`hours`、`transport`、`booking`、`mapUrl`。地图链接仅允许明确的 HTTP(S)，页面拒绝带凭据链接，不自动推断坐标或门店信息。
- `faq.value`：必需 `question`、`answer`；可选 `category`，缺省为“网站使用”。首页和 FAQ 页读取同一确认数据；FAQ 的 JSON-LD 使用同一问题和答案，搜索只是本地筛选。
- `review.value`：需 `text`、明确 `authorized: true`、非空 `source`、有效且非未来的 `date`；可选 `author`、`rating`（1–5）。状态 confirmed 不能代替授权，缺少授权/来源/日期仍不公开。不要编造评价或汇总评分。
- 联系渠道按固定事实 ID 读取：`contact.phone`、`contact.email`，`type: contact`，`value` 为字符串。只显示已确认且格式有效的电话/邮箱，不从示例或咨询输入提取联系方式。

ID 必须唯一；service/location 同类 `slug` 不得重复，只使用小写英文字母、数字与连字符。如果填写 `value.id`，它必须与顶层事实 ID 一致；渲染时 `updatedAt` 来自顶层 `updated_at`。关于页已接入下述实体、团队、资质与登记资料模板；当前根事实卡片没有这些已确认资料，因此仍显示自然空态。

确认业务信息需要客户核实内容、适用条件、有效期与公开授权后再修改状态，不是技术检查替客户确认。确认内容中的占位符、缺失引用、重复 slug、非法日期及被规则识别的夸张承诺会阻止构建；自动检查不是业务真实性认证。维护后重新执行 test/check/build 并查看真实页面，不要仅改数据而沿用旧 `dist`。开发服务器的数据模块有缓存，事实修改后如页面未更新，应通过自己管理的开发会话重新加载数据，再以新构建为准。

### 关于页资料 schema

`src/pages/about.astro` 经 `src/pages/_shared/about.ts` 的 typed helper，仅读取 `getFact('organization')`、`getFact('team')`、`getFact('qualifications')`、`getFact('registration')` 返回的已确认、未过期值，不绕过事实门控。固定 ID 与 `value` 形状约定如下：

| 事实 ID / 推荐 type | value 形状 | 必需字段 | 可选字段 |
| --- | --- | --- | --- |
| `organization` / `organization` | 对象 | `name`（非空字符串） | `legalName`、`description`、`website` |
| `team` / `team` | 对象数组 | 每位成员的 `name`（非空字符串） | `role`、`bio`、`status`、`expires_at` |
| `qualifications` / `qualifications` | 对象数组 | 每项的 `name`（非空字符串） | `issuer`、`date`、`sourceUrl`、`status`、`expires_at` |
| `registration` / `registration` | 对象 | `number`（非空字符串） | `label`、`authority`、`sourceUrl` |

文本字段只接受字符串，空白、对象/数组等非法形状不被转换成业务文字；无有效必需字段的对象或成员忽略。成员未填写 `status` 时继承外层确认资格；显式填写时只能为 `confirmed`，pending/unknown/conflict/expired 或非法状态均隐藏。成员 `expires_at` 必须是有效日期且未过期，当天仍有效；无效日期也隐藏。实体和登记对象若包含 `status`/`expires_at`，同样只允许进一步限制外层确认资格。

资质的可选 `date` 必须为有效 `YYYY-MM-DD`，填了无效日期会忽略该项；未填不推断日期。`website`/`sourceUrl` 只允许完整 HTTP(S)，拒绝 javascript/data、协议相对、带凭据或控制字符的 URL；非法链接不生成 DOM 链接，仍可保留合法文本资料。姓名、角色、介绍、资质与编号均使用 Astro 普通文本表达式转义，不使用原始 HTML 或 `set:html`；不支持以生成图充当真实员工照片。

以下四条仅说明结构，**全部保持 pending**，不是已经核实的实体、团队、证书或注册号。如确需新增，追加到现有 `facts` 数组；不要重复已有 ID，不要直接确认示例：

```yaml
  - id: organization
    type: organization
    status: pending
    value:
      name: PENDING_ONLY_NOT_PUBLIC_ORGANIZATION
      legalName: PENDING_ONLY_NOT_PUBLIC_LEGAL_NAME
      description: PENDING_ONLY_NOT_PUBLIC_ORGANIZATION_DESCRIPTION
    updated_at: '2026-11-11'
  - id: team
    type: team
    status: pending
    value:
      - name: PENDING_ONLY_NOT_PUBLIC_TEAM_MEMBER
        role: PENDING_ONLY_NOT_PUBLIC_ROLE
        bio: PENDING_ONLY_NOT_PUBLIC_BIO
        status: pending
    updated_at: '2026-11-11'
  - id: qualifications
    type: qualifications
    status: pending
    value:
      - name: PENDING_ONLY_NOT_PUBLIC_QUALIFICATION
        issuer: PENDING_ONLY_NOT_PUBLIC_ISSUER
        date: '2026-11-11'
        status: pending
    updated_at: '2026-11-11'
  - id: registration
    type: registration
    status: pending
    value:
      number: PENDING_ONLY_NOT_PUBLIC_REGISTRATION
      label: 登记编号
      authority: PENDING_ONLY_NOT_PUBLIC_AUTHORITY
    updated_at: '2026-11-11'
```

没有有效资料时继续说明尚无可公开信息；有资料时按确认值生成实体介绍、简洁团队文本行、资质来源与登记信息，不再永久显示“没有团队/资质”。不存在有效 `registration.number` 时不生成编号栏，也不推断编号。这些资料目前仅用于关于页可见内容，不自动扩展 Organization JSON-LD 的企业字段。

### 草稿维护

文章必须位于 `drafts/` 的 `.md` 文件，并有完整 YAML frontmatter。以下同样仅是 `pending` 样例，文件名可以不同，但 `slug` 必须全局唯一；`brand` 为现有事实 ID：

```markdown
---
slug: sample-guide
title: 如何记录希望了解的问题？
description: 待核实的文章样例，不公开。
question: 如何记录希望了解的问题？
fact_refs: [brand]
status: pending
updated_at: '2026-11-11'
---
先记录问题，再核对已确认信息。这是未发布的维护样例。
```

必需字段为 `slug`、`title`、`description`、`question`、`fact_refs`（事实 ID 数组）、`status`、`updated_at`；可选 `expires_at`。所有草稿的引用必须存在，即使 pending 的缺失引用也会让检查失败。只有草稿本身 confirmed、未过期且全部引用事实可公开时才生成详情；文章更新时间取草稿日期和引用事实日期的最新值。

文章正文由作者在首段直接回答 `question`，不能认为模板会自动生成答案。原始 Markdown HTML 会转义，危险协议链接/图片会过滤；不要依赖内嵌脚本。相关服务和地点链接通过 `fact_refs` 匹配同一事实 ID。现有三个草稿仍是 pending，没有公开文章详情。

### 预览、生产确认与 public_pages

当前 `client.json` 的真实配置为：

```json
{
  "brand": "贝缇美业",
  "base_url": "https://www.beitimeiye.com",
  "language": "zh-CN",
  "languages": ["zh-CN", "en"],
  "environment": "production",
  "public_pages": [
    "/", "/services/", "/pricing/", "/about/", "/locations/",
    "/faq/", "/articles/", "/contact/", "/privacy/", "/terms/",
    "/training/", "/training/nails/", "/training/lashes/", "/training/salon-management/",
    "/gallery/", "/gallery/nails/", "/gallery/lashes/", "/gallery/japanese-nails/"
  ],
  "analytics_endpoint": ""
}
```

正式配置开放全部 18 个固定页面（原有 10 个和新增 8 个培训/图鉴页面），以已可匿名访问的品牌域名 `https://www.beitimeiye.com` 作为 canonical 和 sitemap 的统一来源。公开页面输出 `index, follow`，并允许搜索结果展示完整文字摘要、大图与视频预览；是否收录、展示或被 AI 引用由对应平台决定。

`robots.txt` 使用 `User-agent: *` 与 `Allow: /`，通用规则适用于遵守 robots 的搜索及 AI 爬虫，同时允许抓取 CSS、JS、图片、`sitemap.xml` 和 `llms.txt`。未指定公开的已生成页面仍单独禁止抓取；404 不进入 sitemap，未确认业务事实与草稿继续不发布。正式 sitemap 列出 18 个固定页面及其英文版本，共 36 个实际生成页面的 HTTPS URL 和更新时间，`llms.txt` 提供同一公开页面清单。新增培训/图鉴与首页精选内容的初始日期为 2026-11-13，后续修改时维护 `src/lib/visual-routes.ts` 中的日期，页面与 sitemap 共同使用。开发服务器也会显示正式配置下的 sitemap，最终构建再根据真实 HTML 产物校正清单。

若需要把整个站点改回未公开预览，使用以下配置：

```json
{
  "brand": "贝缇美业",
  "base_url": "",
  "language": "zh-CN",
  "environment": "preview",
  "public_pages": [],
  "analytics_endpoint": ""
}
```

预览模式下，全站 `noindex, nofollow`，`robots.txt` 禁止抓取，`sitemap.xml` 没有 URL 条目，`llms.txt` 说明尚无公开清单；缺少实际域名时省略 canonical、OG URL 和绝对 OG 图片 URL。不使用虚构域名。标题、描述、语言、品牌 Organization 和确认 FAQ 数据仍直接输出到 HTML。

生产配置必须先由客户确认实际 HTTPS 公共域名及归属，再设置 `base_url` 和 `environment: "production"`。域名校验拒绝 HTTP、localhost、IP、example/test 等占位域名，以及路径、查询、凭据、非标准端口；它只验证格式，不证明域名归属，也不部署网站。`brand` 与已确认的 `brand` 事实应保持一致。

`public_pages` 是明确的页面路径列表，例如 `["/", "/faq/"]` 表示只公开首页与 FAQ；当前范围为上述 18 个固定页面。路径不能含查询、片段或穿越；目录路径会规范化为尾斜杠形式。生产 sitemap/llms 只取“指定公开路径 ∩ 实际生成路径”；写入 `/reviews/` 或不存在的详情不会使其生成。未指定页面仍可能存在于 `dist`，但保持 noindex；robots 在允许通用资源的同时禁止未公开的已生成页面，必要时用精确 Allow 覆盖未公开父目录，不能用这些规则替代访问控制。404 不进入公开清单。新增确认后的服务、地点或文章详情时，需将对应路径加入 `public_pages` 才会进入公开清单。

生产前重新 test/check/build，并逐项核对 `dist` 的 HTML、canonical、JSON-LD、robots、sitemap、llms 和图片。构建会把确认后的内容写进静态 HTML；运行时改 YAML 不会更新已部署文件。修改配置后需要重新部署才会对线上生效；带 Vercel 登录保护的预览地址不作为收录入口，正式域名必须允许匿名访问，且不能附加 `X-Robots-Tag: noindex`。这里不包含自动部署、真实交易或预约确认。

分析默认为关闭。只有生产模式、有效 HTTPS `analytics_endpoint` 且用户在当前页面明确开启时才发送 `page_view`/`intent_click`/`inquiry_prepared` 分类事件；`inquiry_prepared` 仅表示校验成功并已显示本地咨询摘要，不代表真实发送、收件或预约成功，触发事件不携带表单字段。发送内容包括事件、类别、当前路径、来源 origin 与来源类别，不包括查询字符串、完整来源 URL、姓名、联系方式或留言；同意不跨页面持久化。采集接入仍需单独核实服务端处理与隐私政策，不是匿名性保证。

### 中英文页面与语言切换

`language: "zh-CN"` 是默认语言；`languages: ["zh-CN", "en"]` 开启中英文。中文页面保留原地址，英文页面使用 `/en/` 前缀，例如 `/faq/` 与 `/en/faq/`。右上角语言菜单在桌面、平板、手机均可使用，支持键盘和 Escape 关闭，切换后停留在相同页面。咨询页只保留白名单意向参数，不会把姓名、手机号或留言写进切换链接；页面切换不会保存表单，切换前可自行复制咨询内容。

现有固定页面、导航、页脚、FAQ、表单校验与本地摘要均提供英文。翻译字典位于 `src/lib/translations.ts`（基础文案由 `en-copy.ts` 提供），在服务端渲染为 HTML；不调用外部翻译服务，也不依赖浏览器翻译。表单选项值与 11 位数字手机号码校验规则保持一致，用户输入原样保留。新发布的业务内容如无对应英文翻译，会保留原文，需维护者补充核实过的翻译。

公开页面的中英文版本各有 canonical，并通过 `hreflang="zh-CN"`、`hreflang="en"` 与 `x-default` 关联。英文版本继承中文原页面的公开状态，`public_pages` 无需重复添加 `/en/` 路径；未确认详情不会因语言切换而生成。sitemap/llms 仅列实际生成且指定公开的版本。移除 `languages` 或改为 `["zh-CN"]` 会关闭英文路由和菜单。

### 咨询当前边界

首页方向是咨询意向，不是服务目录。URL 参数采用精确白名单映射：`nails → 美甲培训`、`lashes → 美睫培训`、`management → 店务运营管理`、`video → 视频美学`、`learning → 课程了解`；上述中文名称及“其他咨询”也可使用。旧的 `makeup`、`skin` 与“美妆造型 / 肌肤护理 / 护理咨询 / 美甲美睫”不再自动选择，表单保留“请选择您想了解的方向”占位，避免把旧需求解释为其他业务。语言切换保留有效意向代码；其他查询值不会反映为 HTML 或自动填入姓名、联系方式、留言。

表单校验称呼、11 位数字手机号码、意向、留言、隐私同意及蜜罐，仅生成纯文本摘要，使用 `textContent` 显示。手机字段的输入和粘贴会清理非数字并限制最多 11 位，最终校验要求恰好 11 位；不接受邮箱、固定电话格式、国家码或其他字符，也不据位数保证号码真实可用。摘要始终提示“需求已整理，尚未发送”；没有收件方收到咨询，不创建预约、不付款、不产生预约成功凭证。当前网站电话/邮箱仍是 pending，所以正式预约暂未开放。

个人填写不发送到服务器，也不写入 localStorage/cookie 等持久存储；修改、清空、撤销隐私同意会移除页面旧摘要。复制由用户选择后写入系统剪贴板，下载保存本地文本，两者含个人信息，清空本页不能撤回这些副本。自动复制不可用时提供手动复制区。禁用 JavaScript 时表单保持禁用，正文与手动记录说明仍可阅读，防止意外 POST。

### 图片来源与使用边界

首页原轮播与品牌理念区块继续引用三个本地冻结 JPEG：

- `public/images/beiti-hero-generated.jpg`：美容人像主视觉。
- `public/images/beiti-detail-generated.jpg`：美甲、丝缎与花的细节摄影。
- `public/images/beiti-ritual-generated.jpg`：护理静物与暖光意境。

三张实际文件均为 `2560 × 1440` JPEG，已逐张检查摄影内容；不是空图或灰色鉴权提示图。来源为宿主合法鉴权的原生 `GenerateImage` 调用 `https://copilot-cn.bytedance.net/api/ide/v1/text_to_image`。中文提示词、`landscape_16_9` 尺寸和由 `encodeURIComponent(prompt)` 生成的准确 URL 保存在 `src/components/brand-media.mjs`，生成记录说明见 `public/images/SOURCES.md`。

网页使用 `frozen: true` 的本地源，不在访问时重试外部生成；未经鉴权访问生成 URL 可能返回灰图，不能把 HTTP 200 当成真实生成成功。旧 `beiti-portrait.jpg`、`beiti-detail.jpg`、`beiti-ritual.jpg` 分别保留为三张真图的字节相同副本，网页不引用这些旧路径。

新增培训与图鉴使用用户指定选图包中的 60 张独立原图。`public/images/training/` 和 `public/images/gallery/` 按系列各分成三个子目录，每组 10 张；2560×1440 JPEG 原图按 `01.jpg`～`10.jpg` 保留，同名 `-960.webp` 与 `-1600.webp` 为响应式缩略版。来源、原文件名、主题、中英文标题和原图 SHA-256 保存于 `public/images/visual-catalog.json`，页面内容由 `src/lib/visual-catalog.ts` 统一读取。原始选图包不修改。

图鉴概览可按美甲、美睫、日式美甲筛选，图片支持原图弹窗、左右切换、Escape 关闭及焦点恢复；无 JavaScript 时仍显示静态内容，并可直接打开原图。培训页面包含学习方向、适用与不适用说明及十图影像组。点击咨询只进入本地需求整理流程，不会生成报名、预约或课程承诺。中英文新页面对应切换，canonical、hreflang、robots、sitemap 与 llms 同步接入。

生成影像仅用于品牌美学表达，非真实门店、员工、客户成果、在售产品或资质证明。OG 图片复用第一张冻结图，实际域名存在时生成绝对 URL，尺寸/alt 来自对应元数据；本地预览没有实际域名时不输出绝对 OG 图片 URL。替换素材时请同步文件、尺寸、alt、元数据与来源说明，勿以生成图充当确认业务事实。
