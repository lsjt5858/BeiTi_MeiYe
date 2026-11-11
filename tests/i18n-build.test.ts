import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, symlinkSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { parse } from 'parse5';
import { stringify } from 'yaml';
import { loadContent } from '../src/lib/content.ts';
import { auditDist } from '../scripts/geo-audit.ts';

test('real bilingual build has reciprocal language links, translated UI and gated dynamic content', { timeout: 120_000 }, () => {
  const workspace = fileURLToPath(new URL('..', import.meta.url));
  const root = mkdtempSync(join(realpathSync('/tmp'), 'beiti-i18n-build-'));
  for (const file of ['src', 'public', 'drafts', 'package.json', 'astro.config.mjs', 'tsconfig.json']) cpSync(join(workspace, file), join(root, file), { recursive: true });
  symlinkSync(join(workspace, 'node_modules'), join(root, 'node_modules'), 'dir');
  const base = loadContent(workspace);
  const paths = [...base.site.public_pages, '/services/language-fixture/', '/articles/language-fixture/'];
  writeFileSync(join(root, 'client.json'), JSON.stringify({ ...base.site, languages: ['zh-CN', 'en'], public_pages: paths }));
  writeFileSync(join(root, 'fact-card.yaml'), stringify({ facts: [
    ...base.facts,
    { id: 'fixture.service', type: 'service', status: 'confirmed', value: { slug: 'language-fixture', name: '语言测试护理' }, updated_at: '2026-11-11' },
    { id: 'fixture.location', type: 'location', status: 'confirmed', value: { slug: 'language-fixture', name: '语言测试地点', address: '语言测试地址' }, updated_at: '2026-11-11' },
  ] }));
  mkdirSync(join(root, 'drafts'), { recursive: true });
  writeFileSync(join(root, 'drafts/language-fixture.md'), "---\nslug: language-fixture\ntitle: 语言测试文章\ndescription: 未翻译内容保留原文。\nquestion: 如何阅读原文？\nfact_refs: [brand, fixture.service]\nstatus: confirmed\nupdated_at: '2026-11-11'\n---\n未翻译正文在不同语言页面中仍保留原文，不改写事实。");
  const result = spawnSync(process.execPath, [join(workspace, 'node_modules/astro/bin/astro.mjs'), 'build', '--root', root], {
    cwd: root, encoding: 'utf8', timeout: 90_000, env: { ...process.env, npm_config_cache: '/tmp/beiti-npm-cache' },
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const dist = join(root, 'dist');
  const report = auditDist(dist, loadContent(root));
  assert.equal(report.ok, true, JSON.stringify(report));
  const read = (path: string) => readFileSync(join(dist, path.slice(1), 'index.html'), 'utf8');
  for (const path of paths) {
    const zh = read(path);
    const en = read(`/en${path}`);
    assert.match(en, /<html lang="en"/);
    assert.match(zh, /<html lang="zh-CN"/);
    const zhUrl = `${base.site.base_url}${path}`;
    const enUrl = `${base.site.base_url}/en${path}`;
    for (const html of [zh, en]) {
      assert.ok(html.includes(`hreflang="zh-CN" href="${zhUrl}"`));
      assert.ok(html.includes(`hreflang="en" href="${enUrl}"`));
      assert.ok(html.includes(`hreflang="x-default" href="${zhUrl}"`));
      assert.doesNotMatch(html, /noindex, nofollow|PENDING_ONLY_NOT_PUBLIC/);
    }
    assert.ok(en.includes(`rel="canonical" href="${enUrl}"`));
  }
  const contact = read('/en/contact/');
  assert.match(contact, /Tell us what you want to know/);
  assert.match(contact, /<option\b[^>]*value="美妆造型"[^>]*>Makeup &amp; styling/);
  assert.match(contact, /maxlength="11"/);
  assert.match(contact, /<fieldset[^>]+disabled/);
  assert.match(contact, /<noscript>/);
  assert.match(read('/en/faq/'), /data-search="How do I prepare an inquiry/);
  assert.match(read('/en/articles/language-fixture/'), /未翻译正文/);
  assert.match(read('/en/locations/language-fixture/'), /noindex, nofollow/);
  assert.equal(existsSync(join(dist, 'en/services/pending-service/index.html')), false);
  const siteMap = readFileSync(join(dist, 'sitemap.xml'), 'utf8');
  assert.doesNotMatch(siteMap, /locations\/language-fixture|404|pending/);
  assert.equal([...siteMap.matchAll(/<loc>/g)].length, paths.length * 2);
  const headings: string[] = [];
  function walk(node: any) {
    if (node.tagName === 'title') headings.push(node.childNodes.map((child: any) => child.value ?? '').join(''));
    for (const child of node.childNodes ?? []) walk(child);
  }
  for (const path of ['/', '/en/', '/articles/language-fixture/', '/en/articles/language-fixture/']) walk(parse(read(path)));
  assert.equal(new Set(headings).size, headings.length);
});
