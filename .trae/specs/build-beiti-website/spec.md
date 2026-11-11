# 贝缇美业网站框架规格

## 原因

项目目前只有 README。需要按其中的功能开发可运行、可检查的网站框架，首页参考用户提供的摄影网站风格，品牌名称为“贝缇美业”，完成验证后创建 Git 提交。

## 变更内容

- 使用 Astro 静态生成与少量原生 JavaScript，核心内容直接输出到 HTML。
- 搭建首页、服务概览和详情模板、价格、关于、地点概览和详情模板、FAQ、文章列表和详情模板、联系、隐私说明、条款、404。
- 实现 fact-card.yaml、drafts/*.md、client.json 的数据层与确认状态过滤。
- 实现规范链接、JSON-LD、面包屑、更新时间、robots.txt、sitemap.xml、llms.txt、构建前检查与构建后 geo-audit。
- 实现响应式导航、轮播、FAQ 筛选、咨询需求整理与复制、可选择的数据分析。
- 保留 README 原有全部内容，追加准确的启动和内容维护说明。
- 不包含生产部署、远程推送、收费服务或外部收件系统。

## 影响

- 受影响能力：README 中的网站结构、页面功能、全站功能、内容与数据层、技术特性与构建检查。
- 新文件：package.json、锁文件、Astro 配置、src/、public/、scripts/、tests/、fact-card.yaml、client.json、drafts/。
- 原有文件：只追加 README 使用说明；不回滚现有变更。

## 新增要求

### 要求：品牌与视觉

网站必须以“贝缇美业”为主品牌。参考网站实测为深色导航、整屏轮播、居中大标题、主次按钮、作品展示、品牌介绍和收尾 CTA。

视觉主张：深墨色与暖米白构成主体，低饱和暖金为强调色，用真实感的美业影像、留白和大字营造大气而克制的品牌形象。

内容布局：首页整屏影像轮播 → 咨询方向/已确认服务 → 品牌理念 → 咨询流程 → 已确认内容/FAQ → 咨询 CTA。其他页面统一使用宽阔页头、清晰正文和少量分隔线，不堆砌通用仪表盘卡片。

交互主张：首屏轻量入场、轮播切换、图片悬停与滚动揭示；尊重 prefers-reduced-motion。禁用 JavaScript 时正文、导航和首张影像仍可使用。

图片必须来源于 https://copilot-cn.bytedance.net/api/ide/v1/text_to_image?prompt={URL编码的中文具体摄影提示词}&image_size={合规尺寸}。不得使用空图、随机图库图片或原参考站人物照片。生成图作为品牌视觉，不冒充真实门店、客户成果或团队成员。

#### 场景：查看首页

- 当用户在桌面或手机打开首页；
- 则首屏清楚展示品牌名、占据主体的美业影像和咨询入口，轮播与导航可以键盘操作；
- 则 390px 宽度无横向溢出，按钮至少 44px，文字对比清晰。

### 要求：数据接口与事实门控

client.json 至少包含 brand、base_url、language、environment、public_pages 和 analytics_endpoint。默认 environment 为 preview，base_url 为空。不得虚构实际域名。

fact-card.yaml 使用 facts 数组，每条记录包含 id、type、status、value、updated_at，可含 expires_at。状态支持 unknown、pending、confirmed、conflict、expired。value 可为标量或对象。type 为 brand、service、location、faq、review、contact 等。

业务数据只能来自已确认记录，过期记录不得输出。品牌名称来自用户明确输入；价格、地址、电话、人员资质、营业时间、效果承诺及评价均不预先确认。pending 示例供后续维护和动态模板测试，不出现在公开 HTML 或 JSON-LD。

页面可使用非事实性的品牌标语、一般性咨询提示及用户意向分类，但不能把意向分类表述为已经开设的服务。无业务数据时呈现自然、实用的空状态，引导整理需求。

统一接口由 src/lib/content.ts 或 src/lib/content.mjs 提供，页面开发前确认具体扩展名：

- site：读取 client.json 的配置对象。
- getFact(id)：返回已确认、未过期记录的 value，否则 undefined。
- getServices()：已确认 service 对象；对象字段 id、slug、name、summary、audience、notFor、limits、duration、price、unit、includes、excludes、updatedAt；后续字段为可选。
- getLocations()：已确认 location 对象；id、slug、name、address、hours、transport、booking、mapUrl、updatedAt，可选字段可缺省。
- getFaqs()：已确认 FAQ 对象；id、question、answer、category、updatedAt。
- getReviews()：已确认并具有授权、来源和日期的评价；无记录时不生成 /reviews/、不显示导航与结构化评价。
- getArticles()：已确认草稿且所有事实引用有效并已确认；slug、title、description、question、fact_refs、status、updated_at、body、html；无已确认文章时列表显示空状态，不生成详情。
- getLatestUpdate()：已确认内容的最近更新日期。
- 所有业务实体包含明确的 id，service/location 值来自同一条确认事实。

草稿使用 YAML frontmatter，必需 slug、title、description、question、fact_refs、status、updated_at。缺失引用、重复 slug 或确认内容的夸张承诺/占位符导致构建失败；pending/unknown 内容仅报告检查结果并过滤。

#### 场景：未确认内容

- 当价格、地点或评价仍为 pending；
- 则所有 HTML、JSON-LD、站点地图均不包含其值；
- 当注入有效确认测试数据；
- 则相应服务/地点/文章/评价模板生成、路由正确，事实更新反映在引用页面。

### 要求：页面与入口

常规页面生成 /、/services/、/pricing/、/about/、/locations/、/faq/、/articles/、/contact/、/privacy/、/terms/。动态详情按确认内容生成，未知路径返回 404；缺少授权评价时 /reviews/ 返回 404。服务详情须有适用、不适用、限制、参数与计费字段；地点页支持地图链接且只允许 http(s)；关于页只显示已确认实体/人员/资质。

FAQ 提供编号、锚点、筛选和真实内容。文章模板首段直接回答问题，展示更新时间、相关服务与面包屑。全站提供导航、页脚、跳过导航链接、页面更新时间和键盘焦点。

### 要求：咨询交互与数据分析

默认无真实收件渠道。咨询表单包含姓名/称呼、联系方式、咨询方向、留言、隐私同意与蜜罐。前端校验后生成本地咨询摘要，可复制或下载，不发送、不把个人数据持久化，不显示“预约成功”。提示“需求已整理，尚未发送”，未公布联系方式时告知暂未开放正式预约。只有事实确认的电话/邮箱才能展示通话或邮件链接。

基础分析仅在用户明确选择且配置有效时启用；记录页面访问、咨询意向点击和本地需求整理完成的类别事件，不把本地整理记录当作实际预约或外部提交。不包含表单正文、联系方式或查询字符串；可识别 AI 来源的类别但不保留个人标识。默认预览模式不向外部发送分析。

### 要求：搜索与构建

预览模式全站 noindex，robots 禁止抓取，sitemap 不列出公开页面，canonical 缺实际域名时省略。生产模式必须校验实际 https base_url，并只把 client.json.public_pages 指定、已生成的页面列入 sitemap；未公开路径 noindex。JSON-LD 仅输出已确认数据，严禁虚构评论、LocalBusiness 地址或注册编号。

构建流程：内容检查 → Astro build → geo-audit，门槛 >=80。geo-audit 必须实际扫描构建产物并输出分项结果，失败时退出非零。可选站内搜索不作为本次必需能力；实现 FAQ 筛选满足当前内容规模。

## 修改要求

### 要求：README

原有全部功能描述必须保留。追加安装、启动、预览、构建、测试、事实维护、预览/生产模式、咨询当前边界和图片来源说明。

## 移除要求

无。不存在破坏性迁移。

## 验证与提交

- 对事实过滤、引用缺失、重复草稿、授权评价、占位符与确认内容校验先写有意义的测试，再实现。
- 执行 npm test、npm run check、npm run build，检查实际构建 HTML 与 SEO 文件。
- 独立子 Agent 验证数据/路由/构建规则；浏览器检查桌面与手机首页、轮播、菜单、FAQ、表单和 404。
- 明确图像加载、首屏视觉、交互与无 JS 内容证据；不把静态类型通过等同于浏览器验证。
- 验证通过后提交当前实现、锁文件、规格文件和 README，提交不包含缓存、构建产物、个人表单内容或凭据，不推送。
