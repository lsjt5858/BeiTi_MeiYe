import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildModel, loadContent } from '../src/lib/content.ts';
import { contentPaths, pageSeo, renderLlms, renderRobots, renderSitemap } from '../src/lib/seo.ts';
import { localizedPath } from '../src/lib/i18n.ts';

const origin = 'https://www.beitimeiye.com';
const publicPages = ['/', '/services/', '/pricing/', '/about/', '/locations/', '/faq/', '/articles/', '/contact/', '/privacy/', '/terms/'];

// Evaluate path specificity independently from the generator, including exact-path exceptions.
function canCrawl(robots: string, path: string): boolean {
  const matches = robots.split('\n').flatMap(line => {
    const rule = /^(Allow|Disallow):\s*(.+)$/.exec(line);
    if (!rule) return [];
    const exact = rule[2].endsWith('$');
    const prefix = exact ? rule[2].slice(0, -1) : rule[2];
    return (exact ? path === prefix : path.startsWith(prefix))
      ? [{ length: prefix.length, allowed: rule[1] === 'Allow' }] : [];
  }).sort((a, b) => b.length - a.length || Number(b.allowed) - Number(a.allowed));
  return matches[0]?.allowed ?? true;
}

test('正式配置向搜索引擎开放十个现有页面，使用可公开访问的品牌域名', () => {
  const model = loadContent(new URL('..', import.meta.url));
  assert.equal(model.site.environment, 'production');
  assert.equal(model.site.base_url, origin);
  assert.deepEqual([...model.site.public_pages].sort(), [...publicPages].sort());
  for (const path of publicPages) {
    assert.deepEqual(pageSeo(model, path), { canonical: `${origin}${path}`, noindex: false });
  }
  assert.equal(pageSeo(model, '/404/').noindex, true);
  assert.equal(pageSeo(model, '/services/pending-service/').noindex, true);
  const sitemap = renderSitemap(model, contentPaths(model));
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.deepEqual(urls.sort(), [...publicPages, ...publicPages.map(path => localizedPath(path, 'en'))].map(path => `${origin}${path}`).sort());
  assert.doesNotMatch(sitemap, /pending|reviews|404|localhost/);
  const llms = renderLlms(model, contentPaths(model));
  for (const path of publicPages) assert.ok(llms.includes(`${origin}${path}`));
  assert.doesNotMatch(llms, /不可索引的预览网站/);
});

test('通用 robots 允许公开网页及渲染资源，同时保留未公开页面的限制', () => {
  const model = buildModel({
    site: { brand: '贝缇美业', language: 'zh-CN', environment: 'production', base_url: origin, public_pages: ['/', '/faq/', '/services/public-service/'], analytics_endpoint: '' },
    facts: [], drafts: [],
  });
  const robots = renderRobots(model, [...publicPages, '/services/public-service/', '/services/private-service/', '/404/']);
  assert.match(robots, /^User-agent: \*$/m);
  assert.doesNotMatch(robots, /^Disallow: \/$/m, '公开首页时不应再使用全站禁止抓取');
  for (const path of ['/', '/faq/', '/services/public-service/', '/_astro/page.css', '/_astro/page.js', '/images/beiti-hero-generated.jpg', '/sitemap.xml', '/llms.txt']) {
    assert.equal(canCrawl(robots, path), true, `${path} 应可被通用爬虫抓取`);
  }
  for (const path of ['/contact/', '/services/', '/services/private-service/', '/services/public-service/unpublished/', '/404/']) {
    assert.equal(canCrawl(robots, path), false, `${path} 未被指定公开`);
  }
  assert.match(robots, /^Sitemap: https:\/\/www\.beitimeiye\.com\/sitemap\.xml$/m);
});

test('sitemap 路由在预览服务器也显示正式配置的公开清单', async () => {
  const { GET } = await import('../src/pages/sitemap.xml.ts');
  const response = await GET({} as Parameters<typeof GET>[0]);
  const sitemap = await response.text();
  assert.equal(response.status, 200);
  assert.equal([...sitemap.matchAll(/<loc>/g)].length, publicPages.length * 2);
  assert.ok(sitemap.includes(`${origin}/`));
});
