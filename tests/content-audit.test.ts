import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildModel } from '../src/lib/content.ts';
import { contentPaths, renderRobots, renderSitemap, renderLlms, serializeJsonLd } from '../src/lib/seo.ts';

const audit = await import('../scripts/geo-audit.ts').catch(() => null);
const model = buildModel({
  site: { brand: '贝缇美业', language: 'zh-CN', environment: 'preview', base_url: '', public_pages: [], analytics_endpoint: '' },
  facts: [{ id: 'brand', type: 'brand', status: 'confirmed', value: '贝缇美业', updated_at: '2026-11-11' }],
}, { now: '2026-11-11' });

function validHtml(title: string, main = '这里是网站框架使用说明。当前页面只展示已确认的事实信息，用户可以从导航查看其他页面并整理自己的咨询需求；本地摘要不会自动发送，不代表预约成功。') {
  return `<!doctype html><html lang="zh-CN"><head><title>${title} | 贝缇美业</title><meta name="description" content="了解网站信息与当前咨询边界。"><meta name="robots" content="noindex, nofollow"><script type="application/ld+json">${serializeJsonLd({ '@context': 'https://schema.org', '@type': 'Organization', name: '贝缇美业' })}</script></head><body><a href="#main">跳到正文</a><nav aria-label="主导航"><a href="/">首页</a><a href="/faq/">常见问题</a></nav><main id="main"><h1>${title}</h1><p>${main}</p><time datetime="2026-11-11">2026-11-11</time></main><footer><a href="/privacy/">隐私说明</a></footer></body></html>`;
}
function fixture(transform?: (html: string, path: string) => string) {
  const root = mkdtempSync(join(tmpdir(), 'beiti-audit-test-'));
  const paths = [...contentPaths(model), '/404/'];
  for (const path of paths) {
    const file = path === '/' ? join(root, 'index.html') : path === '/404/' ? join(root, '404.html') : join(root, path.slice(1), 'index.html');
    mkdirSync(dirname(file), { recursive: true });
    const html = validHtml(path === '/' ? '首页' : path);
    writeFileSync(file, transform ? transform(html, path) : html);
  }
  writeFileSync(join(root, 'robots.txt'), renderRobots(model, paths));
  writeFileSync(join(root, 'sitemap.xml'), renderSitemap(model, paths));
  writeFileSync(join(root, 'llms.txt'), renderLlms(model, paths));
  return root;
}
function inspect(root: string) {
  assert.ok(audit, '真实 dist 审计尚未实现');
  return audit.auditDist(root, model);
}
test('审计真实 HTML 且返回分项评分，完整样本达标', () => {
  const result = inspect(fixture());
  assert.equal(result.ok, true);
  assert.ok(result.score >= 80);
  assert.ok(result.checks.length >= 8);
  assert.equal(result.pages, 11);
});
test('真实内部死链和不存在的 fragment 阻止审计通过', () => {
  for (const href of ['/missing/', '#missing']) {
    const result = inspect(fixture(html => html.replace('href="/faq/"', `href="${href}"`)));
    assert.equal(result.ok, false);
    assert.match(result.errors.join('\n'), /链接|锚点/);
  }
});
test('审计检测 pending 哨兵泄漏，即使其他项目满分也失败', () => {
  const result = inspect(fixture(html => html.replace('</main>', '<p>PENDING_ONLY_NOT_PUBLIC_PRICE</p></main>')));
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /未确认|占位|哨兵/);
});
test('缺标题、description、H1、日期、导航、静态正文会降低实际分数至失败', () => {
  const result = inspect(fixture(() => '<html><head></head><body><div id="app"></div></body></html>'));
  assert.equal(result.ok, false);
  assert.ok(result.score < 80);
});
test('预览 canonical、可索引页面与非空 sitemap 均被拒绝', () => {
  const result = inspect(fixture(html => html.replace('noindex, nofollow', 'index, follow').replace('</head>', '<link rel="canonical" href="https://example.com/"></head>')));
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /SEO|canonical|noindex/);
  const root = fixture();
  writeFileSync(join(root, 'sitemap.xml'), '<urlset><url><loc>https://example.com/</loc></url></urlset>');
  assert.equal(inspect(root).ok, false);
});
test('JSON-LD 不能伪造未确认地址或未经授权的评价', () => {
  const result = inspect(fixture(html => html.replace('</head>', `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'LocalBusiness', name: '贝缇美业', address: '虚构地点', review: { '@type': 'Review', reviewBody: '虚构评价' } })}</script></head>`)));
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /结构化|LocalBusiness|评价/);
});
test('空产物目录无法通过审计，不能返回固定满分', () => {
  const root = mkdtempSync(join(tmpdir(), 'beiti-audit-empty-'));
  const result = inspect(root);
  assert.equal(result.ok, false);
  assert.equal(result.score, 0);
});
test('单独缺标题或存在两个 H1 也必须非零失败', () => {
  for (const transform of [
    (html: string) => html.replace(/<title>.*?<\/title>/, ''),
    (html: string) => html.replace('</main>', '<h1>重复标题</h1></main>'),
  ]) assert.equal(inspect(fixture(transform)).ok, false);
});
test('非哨兵的未确认业务值也不能泄漏到公开 HTML', () => {
  assert.ok(audit);
  const pending = buildModel({
    site: model.site,
    facts: [
      ...model.facts,
      { id: 'private', type: 'location', status: 'pending', value: { slug: 'private-store', name: '尚未授权的海城护理站' }, updated_at: '2026-11-11' },
    ],
  });
  const result = audit.auditDist(fixture(html => html.replace('</main>', '<p>尚未授权的海城护理站</p></main>')), pending);
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /未确认/);
});
test('index.html 别名中的 fragment 也必须实际存在', () => {
  const result = inspect(fixture(html => html.replace('href="/faq/"', 'href="/index.html#missing"')));
  assert.equal(result.ok, false);
});
test('Organization 的对象地址及无 @type 的嵌套评价不能绕过确认检查', () => {
  for (const extra of [
    { address: { '@type': 'PostalAddress', addressLocality: '凭空生成的城区' } },
    { review: { reviewBody: '未经授权的评价正文', datePublished: '2026-11-11' } },
  ]) {
    const result = inspect(fixture(html => html.replace('</head>', `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Organization', name: '贝缇美业', ...extra })}</script></head>`)));
    assert.equal(result.ok, false);
  }
});
test('CLI 审计失败与缺失引用检查均以非零状态退出', () => {
  const root = fixture(html => html.replace('href="/faq/"', 'href="/missing/"'));
  writeFileSync(join(root, 'client.json'), JSON.stringify(model.site));
  writeFileSync(join(root, 'fact-card.yaml'), JSON.stringify({ facts: model.facts }));
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/geo-audit.ts', import.meta.url)), '--root', root, '--dist', root], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /geo-audit.*FAIL/);
  mkdirSync(join(root, 'drafts'));
  writeFileSync(join(root, 'drafts', 'missing.md'), `---\nslug: missing\ntitle: 如何检查？\ndescription: 独立测试。\nquestion: 如何检查？\nfact_refs: [missing]\nstatus: pending\nupdated_at: '2026-11-11'\n---\n未确认内容\n`);
  const checked = spawnSync(process.execPath, [fileURLToPath(new URL('../scripts/content-check.ts', import.meta.url)), '--root', root], { encoding: 'utf8' });
  assert.equal(checked.status, 1);
  assert.match(checked.stderr, /缺失事实引用/);
});
