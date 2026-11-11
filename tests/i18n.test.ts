import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateInquiry, buildInquirySummary } from '../src/lib/contact.ts';
const i18n = await import('../src/lib/i18n.ts').catch(() => null);
const html = await import('../src/lib/localized-html.ts').catch(() => null);

test('language paths preserve the current page and use Chinese as the default', () => {
  assert.ok(i18n, 'language helpers must exist');
  assert.equal(i18n.localeFromPath('/en/faq/'), 'en');
  assert.equal(i18n.localeFromPath('/enquiries/'), 'zh-CN');
  assert.equal(i18n.localizedPath('/faq/?interest=skin#faq-2', 'en'), '/en/faq/?interest=skin#faq-2');
  assert.equal(i18n.localizedPath('/en/contact/', 'zh-CN'), '/contact/');
  assert.equal(i18n.localizedPath('/en/', 'en'), '/en/');
  assert.equal(i18n.localizedPath('/images/photo.jpg', 'en'), '/images/photo.jpg');
  assert.equal(i18n.localizedPath('https://example.com/en/', 'en'), 'https://example.com/en/');
});

test('English HTML translates copy and local links without changing input values, scripts or user content', () => {
  assert.ok(html, 'server translation must exist');
  const output = html.localizeHtml('<h1>把想了解的，说清楚。</h1><a href="/contact/?interest=nails">聊聊你的需求</a><option value="美妆造型">美妆造型</option><textarea>用户留言</textarea><script>const label="您的称呼";</script><noscript><p>搜索筛选需要 JavaScript。</p></noscript>', 'en');
  assert.match(output, /Tell us what you want to know/);
  assert.match(output, /href="\/en\/contact\/\?interest=nails"/);
  assert.match(output, /value="美妆造型">Makeup &amp; styling/);
  assert.match(output, /<textarea>用户留言<\/textarea>/);
  assert.match(output, /const label="您的称呼"/);
  assert.match(output, /Filtering requires JavaScript/);
});

test('English inquiry validation and summary translate labels while preserving personal text', () => {
  const invalid = validateInquiry({ name: '', contact: '123', interest: '', message: '', privacy: false, website: '' }, 'en');
  assert.equal(invalid.ok, false);
  if (!invalid.ok) assert.match(invalid.errors.contact!, /11 digits/);
  const result = validateInquiry({ name: '张三', contact: '13800138000', interest: 'nails', message: '请保留我的中文留言。', privacy: true, website: '' }, 'en');
  assert.equal(result.ok, true);
  if (result.ok) {
    const summary = buildInquirySummary(result.value, 'en');
    assert.match(summary, /Prepared locally, not sent/);
    assert.match(summary, /Name: 张三/);
    assert.match(summary, /Interest: Nails & lashes/);
    assert.match(summary, /请保留我的中文留言。/);
  }
});
