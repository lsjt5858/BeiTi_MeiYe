import assert from 'node:assert/strict';
import { test } from 'node:test';
import { safeSlug, safeHttpUrl, textItems, formatValue } from '../src/pages/_shared/values.ts';

test('safe slugs are route segments, never traversal or encoded separators', () => {
  assert.equal(safeSlug('makeup-01'), 'makeup-01');
  for (const slug of ['../contact', '/contact', 'a%2fb', 'a?x=1', 'a#b', 'a b', '', 'a\\b', '.', '__proto__']) {
    assert.throws(() => safeSlug(slug), /slug/);
  }
});

test('map and channel URLs only permit explicit HTTP(S) without embedded credentials', () => {
  assert.equal(safeHttpUrl('https://maps.example.com/?q=a&b=2'), 'https://maps.example.com/?q=a&b=2');
  assert.equal(safeHttpUrl('http://maps.example.com/'), 'http://maps.example.com/');
  for (const value of ['javascript:alert(1)', 'data:text/html,hello', '//evil.example/', '/maps/', 'https://user:secret@example.com', 'https://exa\nmple.com', undefined, {}]) {
    assert.equal(safeHttpUrl(value), undefined);
  }
});

test('optional facts remain absent and zero prices remain visible', () => {
  assert.deepEqual(textItems(['第一项', '', '第二项']), ['第一项', '第二项']);
  assert.deepEqual(textItems('已确认文字'), ['已确认文字']);
  assert.deepEqual(textItems(undefined), []);
  assert.equal(formatValue(0), '0');
  assert.equal(formatValue(undefined), '');
  assert.equal(formatValue({ unknown: 'not a fact' }), '');
});
