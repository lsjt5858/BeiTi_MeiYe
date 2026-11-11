import assert from 'node:assert/strict';
import { setImmediate as nextTurn } from 'node:timers/promises';
import { test } from 'node:test';
import { initializeSite } from '../src/components/site-interactions.mjs';

const endpoint = 'https://analytics.example/events';
const production = {
  environment: 'production',
  baseUrl: 'https://beiti.example/',
  endpoint,
};
const allowedCategories = ['makeup', 'skin', 'nails', 'learning', 'general', 'page'];

class Element extends EventTarget {
  constructor(dataset = {}) {
    super();
    this.dataset = dataset;
    this.disabled = false;
    this.textContent = '';
    this.attributes = new Map();
  }
  setAttribute(name, value) { this.attributes.set(name, value); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  click() { if (!this.disabled) this.dispatchEvent(new Event('click')); }
}

// Only platform boundaries are faked. The real initializer binds every tested callback
// and constructs every payload; fetch records requests and never opens a connection.
function browser(t, {
  configuration = production,
  categories = ['makeup'],
  href = 'https://beiti.example/contact/?name=PRIVATE_NAME&phone=13900000000#PRIVATE_EMAIL',
  referrer = 'https://chatgpt.com/share/PRIVATE_CONVERSATION?prompt=PRIVATE_MESSAGE',
  hasToggle = true,
  hasStatus = true,
} = {}) {
  const toggle = new Element({ ...configuration });
  toggle.disabled = true;
  toggle.textContent = '开启访问分析';
  toggle.setAttribute('aria-pressed', 'false');
  const status = new Element();
  const links = categories.map((analyticsCategory) => new Element({ analyticsCategory }));
  const requests = [];
  const timers = new Map();
  const storageAccesses = [];
  const writes = [];
  const storage = (name) => new Proxy({
    setItem: (...args) => writes.push([name, 'setItem', ...args]),
    removeItem: (...args) => writes.push([name, 'removeItem', ...args]),
    clear: () => writes.push([name, 'clear']),
  }, {
    set(_target, key, value) { writes.push([name, key, value]); return true; },
  });
  const storageDescriptors = Object.fromEntries(['localStorage', 'sessionStorage'].map((name) => [name, {
    configurable: true,
    get() { storageAccesses.push(name); return storage(name); },
    set(value) { writes.push([name, value]); },
  }]));
  const document = Object.defineProperty(Object.assign(new EventTarget(), {
    referrer,
    hidden: false,
    querySelector(selector) {
      if (selector === '[data-analytics-toggle]') return hasToggle ? toggle : null;
      if (selector === '[data-analytics-status]') return hasStatus ? status : null;
      return null;
    },
    querySelectorAll(selector) {
      return selector === '[data-analytics-category]' ? links : [];
    },
  }), 'cookie', {
    get() { storageAccesses.push('cookie'); return ''; },
    set(value) { writes.push(['cookie', value]); },
  });
  const window = Object.defineProperties({
    location: { href },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    setTimeout(callback, delay) {
      const timer = globalThis.setTimeout(() => {
        timers.delete(timer);
        callback();
      }, delay);
      timers.set(timer, delay);
      return timer;
    },
    clearTimeout(timer) {
      globalThis.clearTimeout(timer);
      timers.delete(timer);
    },
  }, storageDescriptors);
  const original = new Map();
  const replace = (name, descriptor) => {
    original.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { configurable: true, ...descriptor });
  };
  replace('document', { value: document });
  replace('window', { value: window });
  for (const [name, descriptor] of Object.entries(storageDescriptors)) replace(name, descriptor);
  replace('fetch', { value: (url, options) => {
    const request = { url, options, settled: false, abortObserved: false };
    request.promise = new Promise((resolve, reject) => {
      const settle = (error) => {
        if (request.settled) return;
        request.settled = true;
        options.signal.removeEventListener('abort', onAbort);
        if (error) reject(error);
        else resolve({ ok: true });
      };
      const onAbort = () => {
        request.abortObserved = true;
        settle(new DOMException('Synthetic fetch aborted', 'AbortError'));
      };
      request.finish = () => settle();
      request.fail = () => settle(new Error('Synthetic offline failure'));
      options.signal.addEventListener('abort', onAbort, { once: true });
      if (options.signal.aborted) onAbort();
    });
    requests.push(request);
    return request.promise;
  } });
  t.after(async () => {
    try {
      requests.forEach((request) => request.finish());
      await nextTurn();
      assert.equal(timers.size, 0, 'the real request finally handler must clear its timers');
      assert.deepEqual(writes, [], 'no storage or cookie writes');
      assert.deepEqual(storageAccesses, [], 'consent must not read persisted identifiers either');
    } finally {
      for (const timer of timers.keys()) globalThis.clearTimeout(timer);
      for (const [name, descriptor] of original) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else Reflect.deleteProperty(globalThis, name);
      }
    }
  });
  initializeSite();
  return { document, toggle, status, links, requests, timers };
}

function payload(request, event, category, {
  path = '/contact/',
  referrer_origin = 'https://chatgpt.com',
  source = 'ai',
} = {}) {
  assert.equal(request.url, endpoint);
  assert.equal(request.options.method, 'POST');
  assert.deepEqual(request.options.headers, { 'Content-Type': 'application/json' });
  assert.equal(request.options.credentials, 'omit');
  assert.equal(request.options.referrerPolicy, 'no-referrer');
  assert.ok(request.options.signal instanceof AbortSignal);
  assert.deepEqual(JSON.parse(request.options.body), { event, category, path, referrer_origin, source });
  assert.doesNotMatch(request.options.body, /PRIVATE_|13900000000|[?#]|prompt=|name=|phone=/);
}

test('initializeSite analytics consent branches', { concurrency: false }, async (t) => {
  await t.test('production stays silent until the bound toggle receives explicit consent', async (t) => {
    const page = browser(t);
    assert.equal(page.toggle.disabled, false);
    assert.equal(page.toggle.getAttribute('aria-pressed'), 'false');
    assert.match(page.status.textContent, /默认关闭/);
    page.links[0].click();
    await nextTurn();
    assert.equal(page.requests.length, 0);
    assert.equal(page.timers.size, 0);

    page.toggle.click();
    await nextTurn();
    assert.equal(page.requests.length, 1, 'one opt-in produces exactly one page_view');
    assert.equal(page.toggle.getAttribute('aria-pressed'), 'true');
    assert.equal(page.toggle.textContent, '关闭访问分析');
    assert.match(page.status.textContent, /已开启/);
    payload(page.requests[0], 'page_view', 'page');
  });

  await t.test('only allowlisted intent categories send after consent', async (t) => {
    const denied = ['unknown', 'MAKEUP', 'PRIVATE_NAME', ''];
    const page = browser(t, { categories: [...allowedCategories, ...denied] });
    page.links.forEach((link) => link.click());
    await nextTurn();
    assert.equal(page.requests.length, 0);
    page.toggle.click();
    page.links.forEach((link) => link.click());
    await nextTurn();
    assert.equal(page.requests.length, 1 + allowedCategories.length);
    allowedCategories.forEach((category, index) => payload(page.requests[index + 1], 'intent_click', category));
    assert.equal(new Set(page.requests.map((request) => request.options.signal)).size, page.requests.length);
  });

  await t.test('local inquiry preparation sends a safe conversion only while opted in', async (t) => {
    const page = browser(t);
    const prepared = () => page.document.dispatchEvent(new Event('beiti:inquiry-prepared'));
    prepared();
    await nextTurn();
    assert.equal(page.requests.length, 0, 'preparing an inquiry is not itself analytics consent');
    page.toggle.click();
    assert.equal(page.requests.length, 1);
    prepared();
    await nextTurn();
    assert.equal(page.requests.length, 2);
    payload(page.requests[1], 'inquiry_prepared', 'general');
    page.toggle.click();
    await nextTurn();
    prepared();
    page.links[0].click();
    await nextTurn();
    assert.equal(page.requests.length, 2, 'withdrawal blocks conversion and intent events');
    assert.equal(page.timers.size, 0);
  });

  await t.test('withdrawal aborts every pending request and blocks later clicks', async (t) => {
    const page = browser(t);
    page.toggle.click();
    page.links[0].click();
    assert.equal(page.requests.length, 2);
    assert.equal(page.timers.size, 2);
    page.requests.forEach((request) => assert.equal(request.options.signal.aborted, false));
    page.toggle.click();
    page.requests.forEach((request) => {
      assert.equal(request.options.signal.aborted, true);
      assert.equal(request.abortObserved, true, 'fetch observes cancellation, not only a changed flag');
    });
    await nextTurn();
    assert.equal(page.timers.size, 0);
    assert.equal(page.toggle.getAttribute('aria-pressed'), 'false');
    assert.equal(page.toggle.textContent, '开启访问分析');
    assert.match(page.status.textContent, /已关闭/);
    page.links[0].click();
    await nextTurn();
    assert.equal(page.requests.length, 2, 'clicking after withdrawal adds zero requests');
    page.toggle.click();
    assert.equal(page.requests.length, 3, 'explicit reconsent creates one fresh page_view');
    assert.equal(page.requests[2].options.signal.aborted, false);
    payload(page.requests[2], 'page_view', 'page');
  });

  await t.test('resolved and rejected fetches release timers without changing consent', async (t) => {
    const page = browser(t);
    page.toggle.click();
    page.requests[0].finish();
    await nextTurn();
    assert.equal(page.timers.size, 0);
    page.links[0].click();
    page.requests[1].fail();
    await nextTurn();
    assert.equal(page.timers.size, 0);
    assert.equal(page.toggle.getAttribute('aria-pressed'), 'true');
    page.links[0].click();
    assert.equal(page.requests.length, 3);
    page.toggle.click();
    await nextTurn();
    assert.equal(page.requests[0].options.signal.aborted, false, 'completed requests left the pending set');
    assert.equal(page.requests[1].options.signal.aborted, false, 'failed requests left the pending set');
    assert.equal(page.requests[2].options.signal.aborted, true);
  });

  await t.test('the real four-second timeout aborts a nonresponding fetch', { timeout: 10_000 }, async (t) => {
    const page = browser(t);
    page.toggle.click();
    assert.deepEqual([...page.timers.values()], [4000]);
    await page.requests[0].promise.catch(() => {});
    await nextTurn();
    assert.equal(page.requests[0].options.signal.aborted, true);
    assert.equal(page.requests[0].abortObserved, true);
    assert.equal(page.timers.size, 0);
  });

  await t.test('preview disables analytics even with a valid HTTPS endpoint', async (t) => {
    const page = browser(t, { configuration: { ...production, environment: 'preview' } });
    assert.equal(page.toggle.disabled, true);
    assert.match(page.status.textContent, /未启用/);
    // Dispatch deliberately bypasses native disabled-button suppression to test the callback guard too.
    page.toggle.dispatchEvent(new Event('click'));
    page.links[0].click();
    page.document.dispatchEvent(new Event('beiti:inquiry-prepared'));
    await nextTurn();
    assert.equal(page.requests.length, 0);
    assert.equal(page.timers.size, 0);
    assert.equal(page.toggle.getAttribute('aria-pressed'), 'false');
  });

  for (const [name, overrides] of [
    ['missing endpoint', { endpoint: '' }],
    ['malformed endpoint', { endpoint: 'not a URL' }],
    ['HTTP endpoint', { endpoint: 'http://analytics.example/events' }],
    ['script endpoint', { endpoint: 'javascript:alert(1)' }],
    ['relative endpoint', { endpoint: '/events' }],
    ['protocol-relative endpoint', { endpoint: '//analytics.example/events' }],
    ['endpoint username', { endpoint: 'https://user@analytics.example/events' }],
    ['endpoint password', { endpoint: 'https://user:secret@analytics.example/events' }],
    ['endpoint query', { endpoint: `${endpoint}?email=PRIVATE_EMAIL` }],
    ['endpoint fragment', { endpoint: `${endpoint}#PRIVATE_EMAIL` }],
    ['missing base URL', { baseUrl: '' }],
    ['HTTP base URL', { baseUrl: 'http://beiti.example/' }],
    ['base URL credentials', { baseUrl: 'https://user:secret@beiti.example/' }],
    ['unknown environment', { environment: 'development' }],
  ]) {
    await t.test(`${name} fails closed in the real listener`, async (t) => {
      const page = browser(t, { configuration: { ...production, ...overrides } });
      assert.equal(page.toggle.disabled, true);
      assert.match(page.status.textContent, /未启用/);
      page.toggle.dispatchEvent(new Event('click'));
      page.links[0].click();
      page.document.dispatchEvent(new Event('beiti:inquiry-prepared'));
      await nextTurn();
      assert.equal(page.requests.length, 0);
      assert.equal(page.timers.size, 0);
      assert.equal(page.toggle.getAttribute('aria-pressed'), 'false');
    });
  }

  for (const [name, referrer, expected] of [
    ['direct', '', { referrer_origin: '', source: 'direct' }],
    ['ordinary referral', 'https://referral.example/PRIVATE_PATH?email=PRIVATE_EMAIL', {
      referrer_origin: 'https://referral.example', source: 'referral',
    }],
    ['non-HTTP referral', 'data:text/plain,PRIVATE_MESSAGE', { referrer_origin: '', source: 'direct' }],
  ]) {
    await t.test(`${name} sends only the reduced source fields`, (t) => {
      const page = browser(t, { referrer });
      page.toggle.click();
      assert.equal(page.requests.length, 1);
      payload(page.requests[0], 'page_view', 'page', expected);
    });
  }

  await t.test('a fresh page does not inherit an earlier page opt-in', async (t) => {
    await t.test('first page opts in', (t) => {
      const page = browser(t);
      page.toggle.click();
      assert.equal(page.requests.length, 1);
    });
    await t.test('next page starts closed', async (t) => {
      const page = browser(t);
      page.links[0].click();
      await nextTurn();
      assert.equal(page.toggle.getAttribute('aria-pressed'), 'false');
      assert.equal(page.requests.length, 0);
    });
  });

  await t.test('missing toggle or status does not create unsolicited requests', async (t) => {
    await t.test('missing toggle', async (t) => {
      const page = browser(t, { hasToggle: false });
      page.links[0].click();
      await nextTurn();
      assert.equal(page.requests.length, 0);
      assert.equal(page.timers.size, 0);
    });
    await t.test('missing status still permits explicit opt-in', (t) => {
      const page = browser(t, { hasStatus: false });
      page.toggle.click();
      assert.equal(page.requests.length, 1);
      payload(page.requests[0], 'page_view', 'page');
    });
  });
});
