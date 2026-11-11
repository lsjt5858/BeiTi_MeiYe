import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  INQUIRY_INTERESTS,
  buildInquirySummary,
  getInquiryInterest,
  validateInquiry,
  type InquiryInput,
} from '../src/lib/contact.ts';

const valid: InquiryInput = {
  name: ' 林女士 ',
  contact: ' lin@example.com ',
  interest: '美妆造型',
  message: ' 想先了解适用条件。\r\n请说明费用包含什么。 ',
  privacy: true,
  website: '',
};

test('accepts a valid inquiry and normalizes without mutating input', () => {
  const input = { ...valid };
  const result = validateInquiry(input);
  assert.equal(result.ok, true);
  if (!result.ok) assert.fail('expected a valid inquiry');
  assert.deepEqual(result.value, {
    name: '林女士',
    contact: 'lin@example.com',
    interest: '美妆造型',
    message: '想先了解适用条件。\n请说明费用包含什么。',
    privacy: true,
  });
  assert.deepEqual(input, valid);
});

test('reports all empty required fields, including privacy consent', () => {
  const result = validateInquiry({
    name: ' ', contact: '', interest: '', message: '', privacy: false, website: '',
  });
  assert.equal(result.ok, false);
  if (result.ok) assert.fail('expected field errors');
  assert.deepEqual(Object.keys(result.errors).sort(), ['contact', 'interest', 'message', 'name', 'privacy']);
});

test('accepts mobile, international and fixed-line phone formats', () => {
  for (const contact of ['13800138000', '+86 138 0013 8000', '(010) 1234-5678', '+1 (415) 555-2671']) {
    assert.equal(validateInquiry({ ...valid, contact }).ok, true, contact);
  }
});

test('rejects malformed, short, overly long and multiline contact values', () => {
  for (const contact of ['abc', 'abc@', '@example.com', 'a@b', '123', '+1234567890123456', 'a@example.com\nBcc:x@example.com', 'hello 13800138000', 'https://example.com']) {
    const result = validateInquiry({ ...valid, contact });
    assert.equal(result.ok, false, contact);
    if (!result.ok) assert.ok(result.errors.contact, contact);
  }
});

test('rejects invalid email labels and local dot placement', () => {
  for (const contact of ['a@example..com', 'a@example-.com', '.a@example.com', 'a..b@example.com']) {
    const result = validateInquiry({ ...valid, contact });
    assert.equal(result.ok, false, contact);
    if (!result.ok) assert.ok(result.errors.contact, contact);
  }
  assert.equal(validateInquiry({ ...valid, contact: 'lin.hello+consult@example.com' }).ok, true);
});

test('enforces inclusive length limits for names, contact and messages', () => {
  assert.equal(validateInquiry({ ...valid, name: '林'.repeat(40), message: '好'.repeat(1200) }).ok, true);
  for (const [field, value] of [
    ['name', '林'.repeat(41)],
    ['contact', `${'a'.repeat(69)}@example.com`],
    ['message', '好'.repeat(1201)],
  ] as const) {
    const result = validateInquiry({ ...valid, [field]: value });
    assert.equal(result.ok, false);
    if (!result.ok) assert.ok(result.errors[field]);
  }
});

test('rejects forged interests and consent values', () => {
  assert.equal(validateInquiry({ ...valid, interest: '<script>alert(1)</script>' }).ok, false);
  assert.equal(validateInquiry({ ...valid, privacy: 'true' as unknown as boolean }).ok, false);
});

test('honeypot rejects filled values but permits blank whitespace', () => {
  const result = validateInquiry({ ...valid, website: 'spam.example' });
  assert.equal(result.ok, false);
  if (!result.ok) assert.ok(result.errors.website);
  assert.equal(validateInquiry({ ...valid, website: '  ' }).ok, true);
});

test('rejects single-line control characters and unsupported message controls', () => {
  assert.equal(validateInquiry({ ...valid, name: '林\n女士' }).ok, false);
  assert.equal(validateInquiry({ ...valid, name: '林\u0000女士' }).ok, false);
  assert.equal(validateInquiry({ ...valid, message: '文字\u0000文字' }).ok, false);
});

test('only explicitly allowed interests can be prefilled from a URL', () => {
  assert.equal(getInquiryInterest('美妆造型'), '美妆造型');
  assert.equal(getInquiryInterest('其他咨询'), '其他咨询');
  assert.equal(getInquiryInterest('<img src=x onerror=alert(1)>'), '');
  assert.equal(getInquiryInterest('美妆造型\n'), '');
  assert.equal(getInquiryInterest(null), '');
});

const homepageInterests = [
  ['makeup', '美妆造型'],
  ['skin', '护理咨询'],
  ['nails', '美甲美睫'],
  ['learning', '课程了解'],
] as const;

for (const [code, expected] of homepageInterests) {
  test(`homepage interest=${code} prefills a selectable Chinese intention and summary`, () => {
    const query = new URLSearchParams(`interest=${code}`);
    const interest = getInquiryInterest(query.get('interest'));
    assert.equal(interest, expected);
    assert.ok(INQUIRY_INTERESTS.some((option) => option === interest));
    const result = validateInquiry({ ...valid, interest });
    if (!result.ok) assert.fail(`homepage intention ${code} must validate`);
    assert.match(buildInquirySummary(result.value), new RegExp(`咨询意向：${expected}`));
  });
}

test('all homepage query codes are covered by the contact integration contract', () => {
  const homepage = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
  const codes = [...homepage.matchAll(/interest: "([a-z]+)"/g)].map((match) => match[1]);
  assert.deepEqual(codes, homepageInterests.map(([code]) => code));
  const contactPage = readFileSync(new URL('../src/pages/contact.astro', import.meta.url), 'utf8');
  assert.match(contactPage, /interest\.value = getInquiryInterest\(new URLSearchParams\(window\.location\.search\)\.get\('interest'\)\)/);
  assert.match(contactPage, /output\.textContent = summary/);
  assert.doesNotMatch(contactPage, /\.innerHTML\s*=/);
});

test('legacy Chinese intentions remain selectable without changing their values', () => {
  for (const interest of ['美妆造型', '护理咨询', '课程了解', '其他咨询']) {
    assert.equal(getInquiryInterest(interest), interest);
    assert.ok(INQUIRY_INTERESTS.some((option) => option === interest));
  }
});

test('query code lookup rejects HTML, prototype names, partial and altered codes', () => {
  for (const value of ['<img src=x onerror=alert(1)>', '__proto__', 'constructor', 'toString', 'MAKEUP', ' makeup', 'skin\n', 'nails<script>', 'learning/other', 'makeup%00', '', null]) {
    assert.equal(getInquiryInterest(value), '', String(value));
  }
});

test('summary states local-only status and contains normalized plain text', () => {
  const result = validateInquiry(valid);
  if (!result.ok) assert.fail('expected a valid inquiry');
  const summary = buildInquirySummary(result.value);
  assert.match(summary, /需求已整理，尚未发送/);
  assert.match(summary, /称呼：林女士/);
  assert.match(summary, /联系方式：lin@example.com/);
  assert.match(summary, /咨询意向：美妆造型/);
  assert.match(summary, /请说明费用包含什么。/);
  assert.match(summary, /不代表预约/);
  assert.doesNotMatch(summary, /预约成功|发送成功|已提交|spam\.example/);
});

test('summary preserves untrusted content as literal text, not an HTML fragment', () => {
  const result = validateInquiry({ ...valid, message: '<img src=x onerror=alert(1)>' });
  if (!result.ok) assert.fail('plain text content should be valid');
  assert.ok(buildInquirySummary(result.value).includes('<img src=x onerror=alert(1)>'));
});
