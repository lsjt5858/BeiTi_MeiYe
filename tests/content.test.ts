import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const content = await import('../src/lib/content.ts').catch(() => null);
const seo = await import('../src/lib/seo.ts').catch(() => null);
const today = '2026-11-11';
const config = {
  brand: '贝缇美业', language: 'zh-CN', environment: 'preview',
  base_url: '', public_pages: [] as string[], analytics_endpoint: '',
};

function fact(id: string, type: string, value: unknown, extra: object = {}) {
  return { id, type, status: 'confirmed', value, updated_at: today, ...extra };
}

function draft(extra: object = {}) {
  return {
    frontmatter: {
      slug: 'consult-guide', title: '如何整理咨询需求？', description: '先记录需求。',
      question: '如何整理咨询需求？', fact_refs: ['brand'], status: 'confirmed',
      updated_at: today, ...extra,
    },
    body: '先记录自己的需求，再查看已确认信息。',
    file: 'consult-guide.md',
  };
}

function build(facts: unknown[] = [fact('brand', 'brand', '贝缇美业')], drafts: unknown[] = [], site = config) {
  assert.ok(content, 'content.ts 数据门控尚未实现');
  return content.buildModel({ site, facts, drafts }, { now: today });
}

test('仅公开 confirmed 且未过期的事实，getFact 返回 value 而非记录', () => {
  const model = build([
    fact('brand', 'brand', '贝缇美业'),
    ...['unknown', 'pending', 'conflict', 'expired'].map(status => fact(status, 'contact', 'PENDING_ONLY_NOT_PUBLIC', { status })),
    fact('old', 'contact', 'EXPIRED_ONLY_NOT_PUBLIC', { expires_at: '2026-11-10' }),
  ]);
  assert.equal(model.getFact('brand'), '贝缇美业');
  for (const id of ['unknown', 'pending', 'conflict', 'expired', 'old', 'missing']) {
    assert.equal(model.getFact(id), undefined);
  }
});

test('有效期当天仍可用，最近更新不包含 pending 或过期记录', () => {
  const model = build([
    fact('brand', 'brand', '贝缇美业', { updated_at: '2026-11-01', expires_at: today }),
    fact('pending', 'contact', 'PENDING_ONLY_NOT_PUBLIC', { status: 'pending', updated_at: '2026-11-09' }),
  ]);
  assert.equal(model.getLatestUpdate(), '2026-11-01');
  assert.equal(model.getFact('brand'), '贝缇美业');
});

test('服务和地点按同一事实解析 id/updatedAt，可选字段给出可渲染默认值', () => {
  const model = build([
    fact('svc', 'service', { slug: 'consult', name: '测试服务' }),
    fact('loc', 'location', { slug: 'store', name: '测试地点' }),
    fact('faq-consult', 'faq', { question: '如何咨询？', answer: '先整理需求。' }),
  ]);
  assert.equal(model.getServices()[0].id, 'svc');
  assert.equal(model.getServices()[0].updatedAt, today);
  assert.deepEqual(model.getServices()[0].includes, []);
  assert.equal(model.getLocations()[0].id, 'loc');
  assert.equal(model.getLocations()[0].address, '');
  assert.equal(model.getFaqs()[0].category, '网站使用');
});

test('业务值中的 id 不能替换事实 id', () => {
  assert.throws(() => build([fact('svc', 'service', { id: 'different', slug: 'consult', name: '测试服务' })]), /id/);
});

test('pending 服务/地点/联系方式不公开', () => {
  const model = build([
    fact('svc', 'service', { slug: 'pending-service', name: 'PENDING_ONLY_NOT_PUBLIC' }, { status: 'pending' }),
    fact('loc', 'location', { slug: 'pending-store', name: 'PENDING_ONLY_NOT_PUBLIC' }, { status: 'pending' }),
    fact('contact.phone', 'contact', 'PENDING_ONLY_NOT_PUBLIC', { status: 'pending' }),
  ]);
  assert.deepEqual(model.getServices(), []);
  assert.deepEqual(model.getLocations(), []);
  assert.equal(model.getFact('contact.phone'), undefined);
});

test('unknown 业务可以没有尚未知晓的值与字段，过滤而不虚构默认实体', () => {
  const model = build([
    fact('unknown-service', 'service', null, { status: 'unknown' }),
    fact('unknown-location', 'location', {}, { status: 'unknown' }),
  ]);
  assert.deepEqual(model.getServices(), []);
  assert.deepEqual(model.getLocations(), []);
});

test('所有草稿包括 pending 的缺失事实引用均导致失败', () => {
  for (const status of ['pending', 'confirmed']) {
    assert.throws(() => build(undefined, [draft({ status, fact_refs: ['missing'] })]), /missing|引用/);
  }
});

test('所有草稿的重复 slug 导致失败', () => {
  assert.throws(() => build(undefined, [draft(), draft({ status: 'pending' })]), /slug|重复/);
});

test('同类事实的重复 slug、重复 id 和路径穿越导致失败', () => {
  assert.throws(() => build([fact('a', 'service', { slug: 'same', name: '甲' }), fact('b', 'service', { slug: 'same', name: '乙' })]), /slug|重复/);
  assert.throws(() => build([fact('a', 'brand', '甲'), fact('a', 'brand', '乙')]), /id|重复/);
  assert.throws(() => build(undefined, [draft({ slug: '../../escape' })]), /slug/);
});

test('确认草稿引用 pending/expired 事实时过滤，不发布 HTML', () => {
  const model = build([
    fact('brand', 'brand', '贝缇美业', { status: 'pending' }),
  ], [draft()]);
  assert.deepEqual(model.getArticles(), []);
});

test('已确认文章同步提供 body/html/frontmatter/id 与更新日期', () => {
  const model = build(undefined, [{ ...draft(), body: '**先记录需求**，再咨询。' }]);
  const article = model.getArticles()[0];
  assert.equal(article.id, 'consult-guide');
  assert.equal(article.updatedAt, today);
  assert.equal(article.frontmatter.status, 'confirmed');
  assert.match(article.html, /<strong>先记录需求<\/strong>/);
  assert.equal(article.body, '**先记录需求**，再咨询。');
  assert.ok(!('then' in model.getArticles()));
});

test('pending 草稿的占位符只报告和过滤', () => {
  const model = build(undefined, [{ ...draft({ status: 'pending' }), body: 'PENDING_ONLY_NOT_PUBLIC TODO 待确认' }]);
  assert.deepEqual(model.getArticles(), []);
  assert.ok(model.warnings.length > 0);
});

test('已确认事实与文章的占位符阻止构建', () => {
  for (const value of ['PENDING_ONLY_NOT_PUBLIC', 'TODO', '待确认', '示例地址', '联系电话：xxx']) {
    assert.throws(() => build([fact('brand', 'brand', value)]), /占位/);
    assert.throws(() => build(undefined, [{ ...draft(), body: value }]), /占位/);
  }
});

test('已确认内容的夸张效果承诺阻止构建', () => {
  for (const value of ['100%有效', '保证无风险', '永久有效', '全网第一', '包治百病']) {
    assert.throws(() => build([fact('claim', 'contact', value)]), /夸张|承诺/);
    assert.throws(() => build(undefined, [{ ...draft(), body: value }]), /夸张|承诺/);
  }
});

test('评价只有明确授权、合法来源与日期时发布', () => {
  const base = { author: '已授权用户', text: '咨询说明清楚。', source: 'https://www.douyin.com/', date: '2026-11-01' };
  const model = build([
    fact('yes', 'review', { ...base, authorized: true }),
    fact('no', 'review', { ...base, authorized: false }),
    fact('missing-source', 'review', { ...base, authorized: true, source: '' }),
    fact('missing-date', 'review', { ...base, authorized: true, date: '' }),
    fact('invalid-date', 'review', { ...base, authorized: true, date: '2026-02-30' }),
    fact('future-date', 'review', { ...base, authorized: true, date: '2027-01-01' }),
  ]);
  assert.deepEqual(model.getReviews().map(review => review.id), ['yes']);
  for (const id of ['no', 'missing-source', 'missing-date', 'invalid-date', 'future-date']) {
    assert.equal(model.getFact(id), undefined);
  }
});

test('地图链接只允许 http(s)', () => {
  assert.throws(() => build([fact('loc', 'location', { slug: 'store', name: '测试地点', mapUrl: 'javascript:alert(1)' })]), /链接|mapUrl/);
});

test('无效状态、非法真实日期与必需元数据导致失败', () => {
  assert.throws(() => build([fact('brand', 'brand', '贝缇美业', { status: 'yes' })]), /status|状态/);
  assert.throws(() => build([fact('brand', 'brand', '贝缇美业', { updated_at: '2026-02-30' })]), /日期/);
  assert.throws(() => build(undefined, [draft({ question: '' })]), /question/);
});

test('原始 Markdown HTML 不能变成可执行脚本', () => {
  const model = build(undefined, [{ ...draft(), body: '先整理需求。\n\n<script>alert(1)</script>' }]);
  assert.doesNotMatch(model.getArticles()[0].html, /<script>/i);
});

test('Markdown 事件属性转义，javascript/data 链接和图片被拒绝', () => {
  const body = '先整理需求。\n\n<img src=x onerror=alert(1)>\n\n[危险](javascript:alert%281%29)\n\n[危险](data:text/html,bad)\n\n![危险](data:image/svg+xml,bad)\n\n[网站](/faq/)';
  const html = build(undefined, [{ ...draft(), body }]).getArticles()[0].html;
  assert.doesNotMatch(html, /<img[^>]*onerror|(?:href|src)="(?:javascript|data):/i);
  assert.match(html, /&lt;img/);
  assert.match(html, /href="\/faq\/"/);
});

test('服务生效日期只能来自同一确认事实，不用更新日期冒充', () => {
  const model = build([
    fact('a', 'service', { slug: 'a', name: '甲', effectiveDate: '2026-10-01' }),
    fact('b', 'service', { slug: 'b', name: '乙' }),
  ]);
  assert.equal(model.getServices()[0].effectiveDate, '2026-10-01');
  assert.equal(model.getServices()[1].effectiveDate, undefined);
  assert.throws(() => build([fact('bad', 'service', { slug: 'bad', name: '丙', effectiveDate: '2026-02-30' })]), /日期/);
});

test('过期文章不发布，引用事实更新反映到文章 updatedAt', () => {
  const model = build([fact('brand', 'brand', '贝缇美业')], [
    draft({ slug: 'old', expires_at: '2026-11-10' }),
    draft({ updated_at: '2026-10-01' }),
  ]);
  assert.equal(model.getArticles().length, 1);
  assert.equal(model.getArticles()[0].updatedAt, today);
  assert.equal(model.getArticles()[0].updated_at, '2026-10-01');
});

test('loadContent 可以从独立临时根加载，不修改仓库事实', () => {
  assert.ok(content, 'content.ts 加载器尚未实现');
  const root = mkdtempSync(join(tmpdir(), 'beiti-content-test-'));
  mkdirSync(join(root, 'drafts'));
  writeFileSync(join(root, 'client.json'), JSON.stringify(config));
  writeFileSync(join(root, 'fact-card.yaml'), `facts:\n  - id: brand\n    type: brand\n    status: confirmed\n    value: 贝缇美业\n    updated_at: ${today}\n`);
  writeFileSync(join(root, 'drafts', 'sample.md'), `---\nslug: sample\ntitle: 如何整理需求？\ndescription: 先记录需求。\nquestion: 如何整理需求？\nfact_refs: [brand]\nstatus: pending\nupdated_at: ${today}\n---\n待确认\n`);
  const model = content.loadContent(root, { now: today });
  assert.equal(model.getFact('brand'), '贝缇美业');
  assert.deepEqual(model.getArticles(), []);
});

test('生产只接受真实格式的 HTTPS 公共域名', () => {
  for (const base_url of ['', 'http://www.douyin.com', 'https://example.com', 'https://localhost', 'https://127.0.0.1', 'https://brand.test', 'https://www.douyin.com/path', 'https://user:pass@www.douyin.com']) {
    assert.throws(() => build(undefined, [], { ...config, environment: 'production', base_url }), /域名|base_url|HTTPS/);
  }
  assert.doesNotThrow(() => build(undefined, [], { ...config, environment: 'production', base_url: 'https://www.douyin.com' }));
});

test('预览 SEO 全 noindex，无假 canonical，robots disallow、sitemap 为空', () => {
  assert.ok(seo, 'seo.ts 尚未实现');
  const model = build();
  assert.deepEqual(seo.pageSeo(model, '/'), { noindex: true });
  assert.match(seo.renderRobots(model), /Disallow: \//);
  assert.doesNotMatch(seo.renderSitemap(model, ['/', '/faq/']), /<url>/);
});

test('生产 sitemap 仅含 public_pages 与实际生成路径交集，未公开路径 noindex', () => {
  assert.ok(seo, 'seo.ts 尚未实现');
  const model = build(undefined, [], { ...config, environment: 'production', base_url: 'https://www.douyin.com', public_pages: ['/', '/faq/', '/missing/'] });
  const xml = seo.renderSitemap(model, ['/', '/faq/', '/contact/', '/404/']);
  assert.match(xml, /https:\/\/www\.douyin\.com\/faq\//);
  assert.doesNotMatch(xml, /missing|contact|404/);
  assert.equal(seo.pageSeo(model, '/contact/').noindex, true);
  assert.equal(seo.pageSeo(model, '/faq/').canonical, 'https://www.douyin.com/faq/');
  assert.equal(seo.pageSeo(model, '/faq/').noindex, false);
  assert.match(seo.renderRobots(model), /Disallow: \/contact\//);
  assert.match(seo.renderLlms(model, ['/', '/faq/']), /\/faq\//);
});

test('SEO 不让未确认业务进入 Organization，JSON-LD 安全转义 script 终结符', () => {
  assert.ok(seo, 'seo.ts 尚未实现');
  const model = build([
    fact('brand', 'brand', '贝缇美业'),
    fact('contact.phone', 'contact', 'PENDING_ONLY_NOT_PUBLIC', { status: 'pending' }),
  ]);
  const organization = seo.organizationFor(model);
  assert.equal(organization.name, '贝缇美业');
  assert.equal(organization['@type'], 'Organization');
  assert.equal(organization.telephone, undefined);
  const serialized = seo.serializeJsonLd({ name: '</script><script>alert(1)</script>', value: '\u2028\u2029' });
  assert.doesNotMatch(serialized, /<\/script>|[\u2028\u2029]/);
  assert.equal(JSON.parse(serialized).name, '</script><script>alert(1)</script>');
});

test('根目录种子只公开品牌与网站操作 FAQ，至少两个合法 pending 草稿', () => {
  assert.ok(content, 'content.ts 加载器尚未实现');
  const model = content.loadContent(new URL('..', import.meta.url));
  assert.equal(model.site.brand, '贝缇美业');
  assert.equal(model.site.environment, 'preview');
  assert.equal(model.site.base_url, '');
  assert.deepEqual(model.getServices(), []);
  assert.deepEqual(model.getLocations(), []);
  assert.deepEqual(model.getReviews(), []);
  assert.deepEqual(model.getArticles(), []);
  assert.deepEqual(model.getFaqs().map(faq => faq.id), ['faq-consult', 'faq-pricing', 'faq-privacy']);
  assert.ok(model.drafts.filter(item => item.frontmatter.status === 'pending').length >= 2);
});
