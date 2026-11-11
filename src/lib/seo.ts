import { readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContent, normalizePath, type ContentModel } from './content.ts';

const staticPaths = ['/', '/services/', '/pricing/', '/about/', '/locations/', '/faq/', '/articles/', '/contact/', '/privacy/', '/terms/'];

export function contentPaths(model: ContentModel): string[] {
  return [
    ...staticPaths,
    ...model.getServices().map(item => `/services/${item.slug}/`),
    ...model.getLocations().map(item => `/locations/${item.slug}/`),
    ...model.getArticles().map(item => `/articles/${item.slug}/`),
    ...(model.getReviews().length ? ['/reviews/'] : []),
  ];
}

export function pageSeo(model: ContentModel, path: string): { canonical?: string; noindex: boolean } {
  const normalized = normalizePath(path);
  const noindex = model.site.environment !== 'production' || !model.site.public_pages.includes(normalized) || normalized === '/404/';
  return {
    ...(model.site.base_url ? { canonical: `${model.site.base_url}${normalized}` } : {}),
    noindex,
  };
}

/** 保持布局约定的三个参数；title/description 由布局负责输出和转义。 */
export function getPageSeo(path: string, _title?: string, _description?: string) {
  return pageSeo(loadContent(), path);
}

export function organizationFor(model: ContentModel): Record<string, unknown> {
  const brand = model.getFact<string>('brand');
  if (typeof brand !== 'string' || !brand) return {};
  const phone = model.getFact<string>('contact.phone');
  const email = model.getFact<string>('contact.email');
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: brand,
    ...(model.site.base_url ? { url: model.site.base_url } : {}),
    ...(typeof phone === 'string' && phone ? { telephone: phone } : {}),
    ...(typeof email === 'string' && email ? { email } : {}),
  };
}
export function organizationJsonLd() { return organizationFor(loadContent()); }

/** 防止 HTML script 提前结束及 JS 行分隔符；序列化结果仍可 JSON.parse。 */
export function serializeJsonLd(data: unknown): string {
  return (JSON.stringify(data) ?? 'null')
    .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
function xmlEscape(value: string): string {
  return value.replace(/[<>&"']/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[char]!);
}
export function publishedPaths(model: ContentModel, generatedPaths: string[]): string[] {
  if (model.site.environment !== 'production') return [];
  const generated = new Set(generatedPaths.map(normalizePath).filter(path => path !== '/404/'));
  return model.site.public_pages.filter(path => generated.has(path)).sort();
}
export function renderSitemap(model: ContentModel, generatedPaths: string[]): string {
  const updated = model.getLatestUpdate();
  const entries = publishedPaths(model, generatedPaths).map(path =>
    `  <url><loc>${xmlEscape(`${model.site.base_url}${path}`)}</loc>${updated ? `<lastmod>${updated}</lastmod>` : ''}</url>`,
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;
}
export function renderRobots(model: ContentModel, generatedPaths = contentPaths(model)): string {
  if (model.site.environment !== 'production') return 'User-agent: *\nDisallow: /\n';
  const publicPaths = publishedPaths(model, generatedPaths);
  const privatePaths = generatedPaths.map(normalizePath).filter(path => !publicPaths.includes(path));
  // 精确匹配 $，防止允许 /services/ 时顺带允许未公开的动态详情。
  return [
    'User-agent: *', 'Disallow: /',
    ...privatePaths.filter(path => path !== '/').map(path => `Disallow: ${path}`),
    ...publicPaths.map(path => `Allow: ${path}$`),
    `Sitemap: ${model.site.base_url}/sitemap.xml`, '',
  ].join('\n');
}
export function renderLlms(model: ContentModel, generatedPaths: string[]): string {
  if (model.site.environment !== 'production') return `# ${model.site.brand}\n\n> 当前为不可索引的预览网站，没有公开页面清单。此文件不保证被任何模型采用。\n`;
  const paths = publishedPaths(model, generatedPaths);
  return [
    `# ${model.site.brand}`, '',
    '> 以下仅列出已生成且指定公开的页面；页面内容以已确认事实为准。此文件不保证被任何模型采用。', '',
    '## 页面', ...paths.map(path => `- [${path}](${model.site.base_url}${path})`), '',
  ].join('\n');
}

/** Astro build:done 和审计共用真实产物路径，不以模板存在冒充已生成。 */
export function readDistPagePaths(root: string | URL): string[] {
  const directory = root instanceof URL ? fileURLToPath(root) : resolve(root);
  const paths: string[] = [];
  function visit(current: string) {
    for (const item of readdirSync(current, { withFileTypes: true })) {
      const filename = join(current, item.name);
      if (item.isDirectory()) visit(filename);
      else if (item.isFile() && item.name.endsWith('.html')) {
        const path = relative(directory, filename).split(sep).join('/');
        paths.push(path === 'index.html' ? '/' : path.endsWith('/index.html') ? `/${path.slice(0, -10)}` : `/${path.replace(/\.html$/, '')}/`);
      }
    }
  }
  visit(directory);
  return paths.sort();
}
