import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { stringify } from 'yaml';
import { loadContent } from '../src/lib/content.ts';
import { contentPaths } from '../src/lib/seo.ts';
import { auditDist } from '../scripts/geo-audit.ts';

const workspace = fileURLToPath(new URL('..', import.meta.url));
const astroCli = join(workspace, 'node_modules/astro/bin/astro.mjs');
const baseModel = loadContent(workspace);

function createFixture(production: boolean) {
  const root = mkdtempSync(join(tmpdir(), 'beiti-build-test-'));
  const put = (file: string, value: string) => {
    const target = join(root, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, value);
  };
  for (const file of ['package.json', 'astro.config.mjs', 'tsconfig.json', 'src/env.d.ts', 'src/lib/content.ts', 'src/lib/seo.ts', 'src/pages/robots.txt.ts', 'src/pages/sitemap.xml.ts', 'src/pages/llms.txt.ts']) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    copyFileSync(join(workspace, file), join(root, file));
  }
  symlinkSync(join(workspace, 'node_modules'), join(root, 'node_modules'), 'dir');
  put('client.json', JSON.stringify({
    ...baseModel.site,
    ...(production ? { environment: 'production', base_url: 'https://www.douyin.com', public_pages: ['/', '/faq/', '/services/fixture-service/', '/missing/', '/services/pending-service/'] } : {}),
  }));
  const facts = [...baseModel.facts];
  if (production) facts.push(
    { id: 'fixture.service', type: 'service', status: 'confirmed', value: { slug: 'fixture-service', name: '独立测试服务', effectiveDate: '2026-10-01' }, updated_at: '2026-11-11' },
    { id: 'fixture.location', type: 'location', status: 'confirmed', value: { slug: 'fixture-location', name: '独立测试地点', address: '独立测试地址' }, updated_at: '2026-11-11' },
  );
  put('fact-card.yaml', stringify({ facts }));
  mkdirSync(join(root, 'drafts'));
  for (const draft of baseModel.drafts) put(`drafts/${draft.file}`, `---\n${stringify(draft.frontmatter)}---\n${draft.body}`);
  if (production) put('drafts/fixture.md', `---\nslug: fixture-article\ntitle: 如何阅读测试说明？\ndescription: 独立构建测试说明。\nquestion: 如何阅读测试说明？\nfact_refs: [brand, fixture.service]\nstatus: confirmed\nupdated_at: '2026-11-11'\n---\n先阅读说明，再查看已确认事实。`);
  const html = `<html lang="zh-CN"><head><title>{title}</title><meta name="description" content="独立构建测试说明。" /><meta name="robots" content={seo.noindex ? 'noindex, nofollow' : 'index, follow'} />{seo.canonical && <link rel="canonical" href={seo.canonical} />}<script type="application/ld+json" set:html={serializeJsonLd(organizationJsonLd())} /></head><body><a href="#main">跳到正文</a><nav aria-label="主导航"><a href="/">首页</a><a href="/faq/">常见问题</a></nav><main id="main"><h1>{title}</h1><p>这里是独立构建测试使用的页面，仅用于验证静态生成、事实门控、生产环境与预览环境的搜索规则。咨询摘要只在本地整理，不自动发送，不代表预约成功；业务事实只在确认后提供公开说明。</p><time datetime="2026-11-11">2026-11-11</time></main><footer><a href="/privacy/">隐私说明</a></footer></body></html>`;
  const frontmatter = (imports: string, paths = '') => `---\nimport { getPageSeo, serializeJsonLd, organizationJsonLd } from ${JSON.stringify(imports)};\n${paths}\nconst title = Astro.params.slug || Astro.url.pathname;\nconst seo = getPageSeo(Astro.url.pathname);\n---\n${html}`;
  for (const path of [...contentPaths(baseModel), '/404/']) put(`src/pages/${path === '/' ? 'index' : path.slice(1, -1)}.astro`, frontmatter('../lib/seo.ts'));
  for (const [route, getter] of [['services', 'getServices'], ['locations', 'getLocations'], ['articles', 'getArticles']]) {
    put(`src/pages/${route}/[slug].astro`, frontmatter('../../lib/seo.ts', `import { ${getter} } from '../../lib/content.ts';\nexport function getStaticPaths() { return ${getter}().map(item => ({params: {slug: item.slug}})); }`));
  }
  return root;
}
function build(root: string) {
  const result = spawnSync(process.execPath, [astroCli, 'build', '--root', root], {
    cwd: root, encoding: 'utf8', timeout: 90_000,
    env: { ...process.env, npm_config_cache: '/tmp/beiti-npm-cache' },
  });
  assert.equal(result.status, 0, `${result.error?.message ?? ''}\n${result.stdout}\n${result.stderr}`);
  return join(root, 'dist');
}

test('Astro 7 独立预览构建生成真实 SEO 文件，不生成 pending 详情', { timeout: 120_000 }, () => {
  const root = createFixture(false);
  const output = build(root);
  assert.ok(existsSync(join(output, 'index.html')));
  assert.match(readFileSync(join(output, 'index.html'), 'utf8'), /noindex/);
  assert.doesNotMatch(readFileSync(join(output, 'index.html'), 'utf8'), /rel="canonical"|PENDING_ONLY_NOT_PUBLIC/);
  assert.match(readFileSync(join(output, 'robots.txt'), 'utf8'), /Disallow: \//);
  assert.doesNotMatch(readFileSync(join(output, 'sitemap.xml'), 'utf8'), /<url>/);
  assert.equal(existsSync(join(output, 'services/pending-service/index.html')), false);
  assert.equal(existsSync(join(output, 'locations/pending-location/index.html')), false);
  assert.equal(existsSync(join(output, 'articles/consultation-guide/index.html')), false);
  const result = auditDist(output, loadContent(root));
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.pages, 11);
});

test('Astro 7 独立生产构建按确认模型生成详情，sitemap 只列实际且指定公开的路径', { timeout: 120_000 }, () => {
  const root = createFixture(true);
  const output = build(root);
  assert.ok(existsSync(join(output, 'services/fixture-service/index.html')));
  assert.ok(existsSync(join(output, 'locations/fixture-location/index.html')));
  assert.ok(existsSync(join(output, 'articles/fixture-article/index.html')));
  assert.equal(existsSync(join(output, 'services/pending-service/index.html')), false);
  const sitemap = readFileSync(join(output, 'sitemap.xml'), 'utf8');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.deepEqual(urls, ['https://www.douyin.com/', 'https://www.douyin.com/faq/', 'https://www.douyin.com/services/fixture-service/']);
  assert.match(readFileSync(join(output, 'locations/fixture-location/index.html'), 'utf8'), /noindex/);
  assert.doesNotMatch(readFileSync(join(output, 'services/fixture-service/index.html'), 'utf8'), /noindex/);
  assert.match(readFileSync(join(output, 'services/fixture-service/index.html'), 'utf8'), /href="https:\/\/www\.douyin\.com\/services\/fixture-service\/"/);
  const result = auditDist(output, loadContent(root));
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.pages, 14);
});
