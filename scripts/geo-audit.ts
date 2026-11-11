import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse, type DefaultTreeAdapterMap } from 'parse5';
import { loadContent, isValidDate, exaggeratedPattern, type ContentModel } from '../src/lib/content.ts';
import { contentPaths, pageSeo, publishedPaths, readDistPagePaths, renderRobots, renderSitemap, renderLlms } from '../src/lib/seo.ts';

type Node = DefaultTreeAdapterMap['node'];
type Element = DefaultTreeAdapterMap['element'];
export interface AuditCheck {
  name: string;
  weight: number;
  passed: number;
  total: number;
  score: number;
  issues: string[];
}
export interface AuditResult {
  ok: boolean;
  score: number;
  pages: number;
  checks: AuditCheck[];
  errors: string[];
}

function children(node: Node): Node[] { return 'childNodes' in node ? node.childNodes : []; }
function elements(node: Node): Element[] {
  const result: Element[] = [];
  function walk(current: Node) {
    if ('tagName' in current) result.push(current);
    for (const child of children(current)) walk(child);
  }
  walk(node);
  return result;
}
function attribute(node: Element, name: string): string | undefined { return node.attrs.find(attr => attr.name === name)?.value; }
function text(node: Node): string {
  if (node.nodeName === '#text') return (node as DefaultTreeAdapterMap['textNode']).value;
  if ('tagName' in node && ['script', 'style', 'noscript', 'template'].includes(node.tagName)) return '';
  return children(node).map(text).join('');
}
function rawText(node: Node): string {
  return node.nodeName === '#text' ? (node as DefaultTreeAdapterMap['textNode']).value : children(node).map(rawText).join('');
}
function htmlFile(root: string, path: string): string {
  if (path === '/') return join(root, 'index.html');
  if (path === '/404/' && existsSync(join(root, '404.html'))) return join(root, '404.html');
  const directory = join(root, path.slice(1), 'index.html');
  if (existsSync(directory)) return directory;
  return join(root, `${path.slice(1).replace(/\/$/, '')}.html`);
}
function jsonObjects(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.flatMap(jsonObjects);
  if (!value || typeof value !== 'object') return [];
  const object = value as Record<string, unknown>;
  return [object, ...Object.values(object).flatMap(jsonObjects)];
}
function factStrings(model: ContentModel): Set<string> {
  const values = new Set<string>();
  function walk(value: unknown) {
    if (typeof value === 'string') values.add(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') Object.values(value).forEach(walk);
  }
  for (const fact of model.facts) walk(model.getFact(fact.id));
  return values;
}

/** 只读真实 dist；分项实际断言、关键安全失败与总分阈值同时生效。 */
export function auditDist(distRoot: string | URL, model: ContentModel, options: { minScore?: number } = {}): AuditResult {
  const root = distRoot instanceof URL ? fileURLToPath(distRoot) : resolve(distRoot);
  const minScore = options.minScore ?? 80;
  const checks: AuditCheck[] = [
    { name: '页面与内部链接', weight: 15, passed: 0, total: 0, score: 0, issues: [] },
    { name: '标题与描述', weight: 10, passed: 0, total: 0, score: 0, issues: [] },
    { name: '单一 H1', weight: 10, passed: 0, total: 0, score: 0, issues: [] },
    { name: '可验证更新日期', weight: 10, passed: 0, total: 0, score: 0, issues: [] },
    { name: '导航与语义入口', weight: 10, passed: 0, total: 0, score: 0, issues: [] },
    { name: '静态正文', weight: 10, passed: 0, total: 0, score: 0, issues: [] },
    { name: '页面 SEO', weight: 10, passed: 0, total: 0, score: 0, issues: [] },
    { name: '已确认结构化数据', weight: 10, passed: 0, total: 0, score: 0, issues: [] },
    { name: '事实泄漏与内容质量', weight: 10, passed: 0, total: 0, score: 0, issues: [] },
    { name: 'robots / sitemap / llms', weight: 5, passed: 0, total: 0, score: 0, issues: [] },
  ];
  const errors: string[] = [];
  function check(index: number, passed: boolean, issue: string, critical = false) {
    const item = checks[index]!;
    item.total++;
    if (passed) item.passed++;
    else {
      item.issues.push(issue);
      if (critical) errors.push(issue);
    }
  }
  if (!existsSync(root) || !statSync(root).isDirectory()) return { ok: false, score: 0, pages: 0, checks, errors: ['dist 目录不存在'] };
  const paths = readDistPagePaths(root);
  if (!paths.length) return { ok: false, score: 0, pages: 0, checks, errors: ['dist 没有真实 HTML 页面'] };
  const documents = new Map(paths.map(path => {
    const raw = readFileSync(htmlFile(root, path), 'utf8');
    const nodes = elements(parse(raw));
    return [path, { raw, nodes, ids: new Set(nodes.map(node => attribute(node, 'id')).filter(Boolean)) }] as const;
  }));
  for (const path of [...contentPaths(model), '/404/']) {
    check(0, documents.has(path), `${path} 应生成但缺少 HTML`, true);
  }
  if (!model.getReviews().length) check(0, !documents.has('/reviews/'), '/reviews/ 没有授权评价却生成了页面', true);
  // 防止过滤逻辑出错后生成不在确认模型中的详情页面。
  const expected = new Set(contentPaths(model));
  for (const path of paths) {
    if (/^\/(?:services|locations|articles)\/[^/]+\/$/.test(path)) check(0, expected.has(path), `${path} 生成了未确认实体详情`, true);
  }
  const knownStrings = factStrings(model);
  const unpublishedStrings = new Set<string>();
  function collectUnpublished(value: unknown) {
    if (typeof value === 'string' && value.length >= 6 && !isValidDate(value) && !knownStrings.has(value)) unpublishedStrings.add(value);
    else if (Array.isArray(value)) value.forEach(collectUnpublished);
    else if (value && typeof value === 'object') Object.values(value).forEach(collectUnpublished);
  }
  for (const fact of model.facts) if (model.getFact(fact.id) === undefined) collectUnpublished(fact.value);
  for (const draft of model.drafts) if (!model.getArticles().some(article => article.slug === draft.frontmatter.slug)) collectUnpublished(draft.body);
  const pageTitles = new Set<string>();
  const base = model.site.base_url || 'https://beiti-audit.invalid';
  const baseHost = new URL(base).host;
  for (const [path, document] of documents) {
    const { nodes, raw } = document;
    const byTag = (tag: string) => nodes.filter(node => node.tagName === tag);
    const titles = byTag('title');
    const title = titles[0] ? text(titles[0]).trim() : '';
    check(1, titles.length === 1 && !!title && !pageTitles.has(title), `${path} title 缺失、为空或重复`, true);
    pageTitles.add(title);
    const descriptions = byTag('meta').filter(node => attribute(node, 'name')?.toLowerCase() === 'description');
    check(1, descriptions.length === 1 && !!attribute(descriptions[0]!, 'content')?.trim(), `${path} description 缺失或为空`, true);
    const headings = byTag('h1');
    check(2, headings.length === 1 && !!text(headings[0]!).trim(), `${path} 必须有且仅有一个非空 H1`, true);
    const times = byTag('time');
    const article = model.getArticles().find(item => `/articles/${item.slug}/` === path);
    const service = model.getServices().find(item => `/services/${item.slug}/` === path);
    const location = model.getLocations().find(item => `/locations/${item.slug}/` === path);
    const updated = article?.updatedAt ?? service?.updatedAt ?? location?.updatedAt ?? model.getLatestUpdate();
    check(3, times.length > 0 && times.every(node => isValidDate(attribute(node, 'datetime'))) && (!updated || times.some(node => attribute(node, 'datetime') === updated)), `${path} 缺少合法、同步事实的更新日期`, true);
    const mains = byTag('main');
    const skipLink = byTag('a').some(node => {
      const href = attribute(node, 'href');
      return href?.startsWith('#') && mains.some(main => attribute(main, 'id') === href.slice(1));
    });
    check(4, byTag('nav').length > 0 && byTag('footer').length > 0 && mains.length === 1 && skipLink, `${path} 缺少导航、页脚、main 或跳过导航入口`, true);
    check(5, mains.length === 1 && text(mains[0]!).replace(/\s/g, '').length >= 60, `${path} 核心静态正文不足或依赖脚本`, true);
    const robots = byTag('meta').filter(node => attribute(node, 'name')?.toLowerCase() === 'robots');
    const noindex = robots.some(node => /\bnoindex\b/i.test(attribute(node, 'content') ?? ''));
    const seo = pageSeo(model, path);
    const canonicals = byTag('link').filter(node => attribute(node, 'rel')?.toLowerCase().split(/\s+/).includes('canonical'));
    const canonical = canonicals[0] ? attribute(canonicals[0], 'href') : undefined;
    check(6, robots.length === 1 && noindex === seo.noindex && (seo.canonical ? canonicals.length === 1 && canonical === seo.canonical : canonicals.length === 0), `${path} SEO noindex/canonical 与站点环境不一致`, true);
    const html = byTag('html')[0];
    check(6, !!html && attribute(html, 'lang') === model.site.language, `${path} SEO html lang 与配置不一致`);
    check(8, !/PENDING_ONLY_NOT_PUBLIC|EXPIRED_ONLY_NOT_PUBLIC|\bTODO\b|\bTBD\b|\bFIXME\b|\bx{3,}\b|\{\{[^}]+\}\}/i.test(raw), `${path} 含未确认哨兵或占位符`, true);
    check(8, !exaggeratedPattern.test(mains.map(text).join('')), `${path} 含夸张效果承诺`, true);
    const exposedContent = `${html ? text(html) : ''}\n${byTag('script').filter(node => attribute(node, 'type') === 'application/ld+json').map(rawText).join('')}`;
    check(8, ![...unpublishedStrings].some(value => exposedContent.includes(value)), `${path} 泄漏未确认或已过期内容`, true);

    const linked = nodes.filter(node => (node.tagName === 'a' && attribute(node, 'href') !== undefined) || (['img', 'script', 'source'].includes(node.tagName) && attribute(node, 'src') !== undefined) || (node.tagName === 'link' && !attribute(node, 'rel')?.split(/\s+/).includes('canonical') && attribute(node, 'href') !== undefined));
    for (const node of linked) {
      const href = attribute(node, ['img', 'script', 'source'].includes(node.tagName) ? 'src' : 'href')!;
      if (/^(?:mailto:|tel:)/i.test(href)) continue;
      if (/^(?:javascript:|vbscript:|data:)/i.test(href)) {
        check(0, false, `${path} 含危险链接协议`, true);
        continue;
      }
      let target: URL;
      try { target = new URL(href, `${base}${path}`); } catch { check(0, false, `${path} 非法内部链接：${href}`, true); continue; }
      if (target.host !== baseHost) continue;
      let pathname: string;
      try { pathname = decodeURIComponent(target.pathname); } catch { check(0, false, `${path} 无效链接编码：${href}`, true); continue; }
      const linkedPath = pathname === '/' || pathname === '/index.html' ? '/' : pathname.endsWith('.html') ? `/${pathname.slice(1, -5).replace(/\/index$/, '')}/` : pathname.endsWith('/') ? pathname : `${pathname}/`;
      const targetDocument = documents.get(linkedPath);
      let destination = resolve(root, `.${pathname}`);
      if (existsSync(destination) && statSync(destination).isDirectory()) destination = join(destination, 'index.html');
      const insideRoot = !relative(root, destination).split(sep).includes('..');
      const valid = insideRoot && (targetDocument !== undefined || existsSync(destination));
      check(0, valid, `${path} 内部链接不存在：${href}`, true);
      if (valid && target.hash && targetDocument) {
        let fragment = '';
        try { fragment = decodeURIComponent(target.hash.slice(1)); } catch { /* Invalid fragment stays unmatched. */ }
        check(0, targetDocument.ids.has(fragment), `${path} 内部链接锚点不存在：${href}`, true);
      }
    }
    const jsonScripts = byTag('script').filter(node => attribute(node, 'type')?.toLowerCase() === 'application/ld+json');
    let hasOrganization = false;
    for (const script of jsonScripts) {
      let data: unknown;
      try { data = JSON.parse(rawText(script)); } catch { check(7, false, `${path} 结构化 JSON-LD 无法解析`, true); continue; }
      check(7, !!data && typeof data === 'object', `${path} 结构化 JSON-LD 不是对象`, true);
      for (const entity of jsonObjects(data)) {
        const types = Array.isArray(entity['@type']) ? entity['@type'] : [entity['@type']];
        if (types.includes('Organization')) {
          hasOrganization = true;
          check(7, entity.name === model.getFact('brand'), `${path} Organization 品牌并非确认事实`, true);
        }
        if (types.includes('LocalBusiness')) {
          const matched = model.getLocations().find(location => entity.name === location.name);
          check(7, !!matched, `${path} LocalBusiness 没有确认地点`, true);
        }
        if (types.includes('Service')) check(7, model.getServices().some(service => service.name === entity.name), `${path} Service 没有确认服务`, true);
        if (types.includes('Article')) check(7, model.getArticles().some(article => article.title === (entity.headline ?? entity.name)), `${path} Article 没有确认文章`, true);
        if (types.includes('FAQPage')) {
          const entries = Array.isArray(entity.mainEntity) ? entity.mainEntity : [];
          check(7, entries.length > 0 && entries.every(entry => {
            if (!entry || typeof entry !== 'object') return false;
            const question = entry as Record<string, unknown>;
            const answer = question.acceptedAnswer as Record<string, unknown> | undefined;
            return model.getFaqs().some(faq => question.name === faq.question && answer?.text === faq.answer);
          }), `${path} FAQPage 包含未确认问答`, true);
        }
        if (types.includes('Review')) check(7, model.getReviews().some(review => review.text === entity.reviewBody && review.date === entity.datePublished), `${path} 结构化评价没有授权与可追溯日期`, true);
        if (entity.review !== undefined) {
          const reviews = Array.isArray(entity.review) ? entity.review : [entity.review];
          check(7, reviews.length > 0 && reviews.every(value => {
            if (!value || typeof value !== 'object') return false;
            const entry = value as Record<string, unknown>;
            return model.getReviews().some(review => entry.reviewBody === review.text && entry.datePublished === review.date);
          }), `${path} 嵌套结构化评价没有授权与可追溯日期`, true);
        }
        if (entity.aggregateRating !== undefined) check(7, false, `${path} aggregateRating 尚无确认的独立汇总事实`, true);
        for (const key of ['telephone', 'email', 'streetAddress', 'addressLocality', 'addressRegion', 'addressCountry', 'postalCode', 'openingHours', 'legalName', 'taxID', 'vatID', 'foundingDate', 'award']) {
          if (entity[key] !== undefined) {
            const values = Array.isArray(entity[key]) ? entity[key] : [entity[key]];
            check(7, values.every(value => typeof value === 'string' && knownStrings.has(value)), `${path} 结构化 ${key} 不属于确认事实`, true);
          }
        }
        if (typeof entity.address === 'string') check(7, knownStrings.has(entity.address), `${path} 结构化地址未确认`, true);
      }
    }
    check(7, hasOrganization || model.getFact('brand') === undefined, `${path} 缺少确认品牌的 Organization JSON-LD`);
  }
  const robotsFile = join(root, 'robots.txt');
  check(9, existsSync(robotsFile) && readFileSync(robotsFile, 'utf8').trim() === renderRobots(model, paths).trim(), 'robots.txt 与环境及公开页面不一致', true);
  const sitemapFile = join(root, 'sitemap.xml');
  const sitemap = existsSync(sitemapFile) ? readFileSync(sitemapFile, 'utf8') : '';
  const locs = [...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)].map(match => match[1]);
  const expectedLocs = publishedPaths(model, paths).map(path => `${model.site.base_url}${path}`);
  check(9, /<urlset\b/.test(sitemap) && JSON.stringify(locs.sort()) === JSON.stringify(expectedLocs.sort()) && sitemap.trim() === renderSitemap(model, paths).trim(), 'sitemap.xml 包含未公开、未生成路径或缺少有效清单', true);
  const llmsFile = join(root, 'llms.txt');
  const llms = existsSync(llmsFile) ? readFileSync(llmsFile, 'utf8') : '';
  check(9, !!llms && llms.trim() === renderLlms(model, paths).trim(), 'llms.txt 缺失或泄漏未公开内容', true);
  for (const item of checks) item.score = item.total ? item.weight * item.passed / item.total : 0;
  const score = Math.round(checks.reduce((sum, item) => sum + item.score, 0) * 100) / 100;
  if (score < minScore) errors.push(`geo-audit 得分 ${score} < ${minScore}`);
  return { ok: !errors.length && score >= minScore, score, pages: paths.length, checks, errors: [...new Set(errors)] };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    let root = fileURLToPath(new URL('..', import.meta.url));
    let dist: string | undefined;
    for (let index = 0; index < args.length; index += 2) {
      if (!['--root', '--dist'].includes(args[index]!) || !args[index + 1]) throw new Error('用法：node scripts/geo-audit.ts [--root 内容根目录] [--dist 产物目录]');
      if (args[index] === '--root') root = resolve(args[index + 1]!);
      else dist = resolve(args[index + 1]!);
    }
    const result = auditDist(dist ?? join(root, 'dist'), loadContent(root));
    for (const check of result.checks) {
      console.log(`[geo-audit] ${check.name}: ${check.score.toFixed(2)}/${check.weight} (${check.passed}/${check.total})`);
      for (const issue of check.issues) console.log(`  - ${issue}`);
    }
    console.log(`[geo-audit] ${result.ok ? 'PASS' : 'FAIL'} ${result.score}/100，门槛 >=80，真实 HTML ${result.pages} 页`);
    if (!result.ok) {
      for (const error of result.errors) console.error(`[geo-audit] ${error}`);
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`[geo-audit] FAIL ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
