# 任务

- [x] 1. 检查现有目录、README、参考站视觉与运行环境，写好规格和文件分工。
- [x] 2. 数据与构建基础：实现 Astro 配置、依赖、事实卡片/草稿加载、确认门控、内容校验、SEO 文件与 geo-audit；先验证关键规则测试的失败，再实现并通过测试。
- [x] 3. 品牌首页与公共界面：实现全站布局、导航、页脚、基础样式、生成影像、轮播、响应式与无障碍交互。
- [x] 4. 内页与咨询流程：实现服务、价格、关于、地点、FAQ、文章、咨询、隐私、条款和 404，使用统一数据层，无数据时不虚构内容。
- [x] 5. 集成检查与准确文档：接通数据层和页面，安装依赖，执行测试/类型/构建/审计，保留 README 内容并追加使用说明。
  - [x] 5.1 补齐关于页的已确认实体、团队与资质展示模板，未确认记录继续隐藏，使用确认/未确认夹具验证实际 HTML。
- [x] 6. 独立验收：子 Agent 检查事实规则、实际静态产物与动态模板；浏览器核验桌面/手机视觉、轮播、菜单、FAQ、咨询与 404，修复发现的问题。
  - [x] 6.1 修复轮播切图时说明未同步的问题，并回归上一张、下一张、圆点与自动播放。
  - [x] 6.2 补验分析在配置有效时的同意/撤销分支及本地需求整理完成事件，确认不发送表单内容。
  - [x] 6.3 隔离临时构建的 Astro/Vite 缓存，消除共享依赖目录导致的并发构建冲突，并重跑全量检查。
- [x] 7. 完成记录与 Git 提交：完成 checklist，追加一次 progress 总结，检查变更并创建新提交，确认工作区状态。

# 任务依赖与文件所有权

- 2、3、4 在统一接口约定下可并行。
- 数据 Agent 独占 package.json、package-lock.json、配置、src/lib/content.*、src/lib/seo.*、fact-card.yaml、client.json、drafts/、scripts/、tests/content*、src/pages/robots.txt.*、src/pages/sitemap.xml.*、src/pages/llms.txt.*。
- 视觉 Agent 独占 src/layouts/、src/components/、src/styles/、src/pages/index.astro、public/；不得修改数据与内页文件。
- 内页 Agent 独占 src/pages/ 中除首页与 SEO 文件以外的文件、src/lib/contact.*、tests/contact*；不得修改布局与数据文件。
- 集成 Agent 在 2、3、4 完成后处理接口不一致、README 和联调问题。
- 验证 Agent 不与实现 Agent 同时写相同文件；报告缺陷后交回对应实现 Agent。
- 5 依赖 2、3、4；6 依赖 5；7 依赖 6。
