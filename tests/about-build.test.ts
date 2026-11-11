import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { parse as parseHtml } from 'parse5';
import { stringify } from 'yaml';
import { loadContent, type FactRecord } from '../src/lib/content.ts';
import { auditDist } from '../scripts/geo-audit.ts';

const workspace = fileURLToPath(new URL('..', import.meta.url));
const base = loadContent(workspace);
const fact = (id: string, value: FactRecord['value'], extra: Partial<FactRecord> = {}): FactRecord => ({
  id, type: id, status: 'confirmed', value, updated_at: '2026-11-11', ...extra,
});

function buildAbout(facts: FactRecord[]) {
  // Copy the actual application, not a mirror template; all writes stay in a canonical temp root.
  const root = mkdtempSync(join(realpathSync('/tmp'), 'beiti-about-build-'));
  for (const file of ['package.json', 'astro.config.mjs', 'tsconfig.json', 'src', 'public', 'drafts']) {
    cpSync(join(workspace, file), join(root, file), { recursive: true });
  }
  symlinkSync(join(workspace, 'node_modules'), join(root, 'node_modules'), 'dir');
  writeFileSync(join(root, 'client.json'), JSON.stringify(base.site));
  writeFileSync(join(root, 'fact-card.yaml'), stringify({ facts: [...base.facts, ...facts] }));
  mkdirSync(join(root, '.astro'), { recursive: true });
  const result = spawnSync(process.execPath, [join(workspace, 'node_modules/astro/bin/astro.mjs'), 'build', '--root', root], {
    cwd: root, encoding: 'utf8', timeout: 90_000,
    env: { ...process.env, npm_config_cache: '/tmp/beiti-npm-cache' },
  });
  assert.equal(result.status, 0, `${result.error?.message ?? ''}\n${result.stdout}\n${result.stderr}`);
  const html = readFileSync(join(root, 'dist/about/index.html'), 'utf8');
  const audit = auditDist(join(root, 'dist'), loadContent(root));
  assert.equal(audit.ok, true, JSON.stringify(audit));
  console.log(`[about-build] ${root}: geo-audit ${audit.score}/100, ${audit.pages} actual pages`);
  return html;
}

function elements(html: string) {
  const result: { tagName: string; attrs: { name: string; value: string }[] }[] = [];
  function walk(node: any) {
    if (node.tagName) result.push(node);
    for (const child of node.childNodes ?? []) walk(child);
  }
  walk(parseHtml(html));
  return result;
}

test('real about page renders confirmed entity, team, qualifications and registration safely', { timeout: 120_000 }, () => {
  const html = buildAbout([
    fact('organization', { name: 'ABOUT_CONFIRMED_ENTITY', legalName: 'ABOUT_CONFIRMED_LEGAL', description: '实体资料的独立测试说明。', website: 'javascript:alert(1)' }),
    fact('team', [
      { name: 'ABOUT_CONFIRMED_PERSON', role: 'ABOUT_CONFIRMED_ROLE', bio: '<script id="about-injected">alert(1)</script>', status: 'confirmed' },
      { name: 'ABOUT_INHERITED_PERSON', role: 'ABOUT_INHERITED_ROLE' },
      { name: 'ABOUT_MEMBER_PENDING', status: 'pending' },
      { name: 'ABOUT_MEMBER_EXPIRED', expires_at: '2026-01-01' },
      { name: 'ABOUT_MEMBER_BAD_DATE', expires_at: '2026-02-30' },
      { name: 'ABOUT_MEMBER_BAD_STATUS', status: true },
      { name: { text: 'ABOUT_MEMBER_BAD_SHAPE' } },
      'ABOUT_MEMBER_NOT_OBJECT',
    ]),
    fact('qualifications', [
      { name: 'ABOUT_CONFIRMED_QUALIFICATION', issuer: 'ABOUT_CONFIRMED_ISSUER', date: '2026-10-01', sourceUrl: 'https://www.douyin.com/' },
      { name: 'ABOUT_UNSAFE_SOURCE', sourceUrl: 'https://user:secret@www.douyin.com/' },
      { name: 'ABOUT_QUALIFICATION_PENDING', status: 'pending' },
      { name: 'ABOUT_QUALIFICATION_EXPIRED', expires_at: '2026-01-01' },
      { name: 'ABOUT_QUALIFICATION_BAD_DATE', date: '2026-02-30' },
      { name: ['ABOUT_QUALIFICATION_BAD_SHAPE'] },
    ]),
    fact('registration', { number: 'ABOUT_REG_CONFIRMED_001', label: '登记信息', authority: 'ABOUT_CONFIRMED_AUTHORITY', sourceUrl: 'https://www.douyin.com/' }),
  ]);
  for (const value of ['ABOUT_CONFIRMED_ENTITY', 'ABOUT_CONFIRMED_LEGAL', 'ABOUT_CONFIRMED_PERSON', 'ABOUT_CONFIRMED_ROLE', 'ABOUT_INHERITED_PERSON', 'ABOUT_INHERITED_ROLE', 'ABOUT_CONFIRMED_QUALIFICATION', 'ABOUT_CONFIRMED_ISSUER', 'ABOUT_REG_CONFIRMED_001', 'ABOUT_CONFIRMED_AUTHORITY']) {
    assert.ok(html.includes(value), `${value} must exist in generated HTML`);
  }
  for (const value of ['ABOUT_MEMBER_PENDING', 'ABOUT_MEMBER_EXPIRED', 'ABOUT_MEMBER_BAD_DATE', 'ABOUT_MEMBER_BAD_STATUS', 'ABOUT_MEMBER_BAD_SHAPE', 'ABOUT_MEMBER_NOT_OBJECT', 'ABOUT_QUALIFICATION_PENDING', 'ABOUT_QUALIFICATION_EXPIRED', 'ABOUT_QUALIFICATION_BAD_DATE', 'ABOUT_QUALIFICATION_BAD_SHAPE']) {
    assert.ok(!html.includes(value), `${value} must remain hidden`);
  }
  assert.match(html, /datetime="2026-10-01"/);
  assert.match(html, /&lt;script id=(?:&quot;|")about-injected(?:&quot;|")&gt;/);
  const nodes = elements(html);
  assert.ok(!nodes.some((node) => node.attrs.some((attr) => attr.name === 'id' && attr.value === 'about-injected')));
  assert.ok(!nodes.some((node) => node.attrs.some((attr) => /^on/i.test(attr.name))));
  assert.ok(!nodes.some((node) => node.attrs.some((attr) => ['href', 'src'].includes(attr.name) && /javascript:|user:secret/i.test(attr.value))));
  assert.ok(nodes.some((node) => node.tagName === 'a' && node.attrs.some((attr) => attr.name === 'href' && attr.value === 'https://www.douyin.com/')));
  assert.doesNotMatch(html, /目前没有可公开的已确认团队介绍、人员资质或注册信息/);
});

test('real about page hides unavailable outer facts and retains the honest empty state', { timeout: 120_000 }, () => {
  const html = buildAbout([
    fact('organization', { name: 'ABOUT_OUTER_PENDING' }, { status: 'pending' }),
    fact('team', [{ name: 'ABOUT_OUTER_EXPIRED' }], { expires_at: '2026-01-01' }),
    fact('qualifications', [{ name: 'ABOUT_OUTER_CONFLICT' }], { status: 'conflict' }),
    fact('registration', { number: 'ABOUT_OUTER_UNKNOWN' }, { status: 'unknown' }),
  ]);
  assert.doesNotMatch(html, /ABOUT_OUTER_/);
  assert.match(html, /目前没有可公开的已确认/);
  assert.doesNotMatch(html, /<dt[^>]*>登记编号<\/dt>/);
});

test('real about page ignores malformed confirmed shapes instead of inventing entries', { timeout: 120_000 }, () => {
  const html = buildAbout([
    fact('organization', [{ name: 'ABOUT_BAD_ORGANIZATION' }]),
    fact('team', { name: 'ABOUT_BAD_TEAM' }),
    fact('qualifications', [null, false, { name: 123 }, { name: 'ABOUT_HIDDEN_QUALIFICATION', status: 'unknown' }]),
    fact('registration', { number: { value: 'ABOUT_BAD_REGISTRATION' } }),
  ]);
  assert.doesNotMatch(html, /ABOUT_BAD_|ABOUT_HIDDEN_/);
  assert.match(html, /目前没有可公开的已确认/);
});
