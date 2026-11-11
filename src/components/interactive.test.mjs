import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

const moduleUrl = new URL("./site-interactions.mjs", import.meta.url);

test("轮播与分析的行为模块已经接入公共组件目录", () => {
  assert.ok(existsSync(moduleUrl), "尚未实现公共界面交互模块");
});

if (existsSync(moduleUrl)) {
  const { createCarouselState, initializeSite, analyticsConfiguration, analyticsEvent } = await import(moduleUrl);

  function installBrowserHost(t, window, document) {
    const descriptors = Object.fromEntries(["window", "document"].map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
    Object.defineProperty(globalThis, "window", { configurable: true, value: window });
    Object.defineProperty(globalThis, "document", { configurable: true, value: document });
    t.after(async () => {
      // 等待 fetch 的 Promise 清理链结束，再还原浏览器宿主。
      await new Promise((resolve) => setImmediate(resolve));
      for (const name of ["window", "document"]) {
        if (descriptors[name]) Object.defineProperty(globalThis, name, descriptors[name]);
        else delete globalThis[name];
      }
    });
  }

  // 仅替代浏览器宿主；事件处理、render 和自动播放调度都调用真实 initializeSite。
  function carouselFixture(t, labels = ["光，落在你的美上。", "美，藏在细节里。", "让美，回归日常。"]) {
    const node = (dataset = {}) => {
      const attributes = new Map();
      const classes = new Set();
      const listeners = new Map();
      return {
        dataset, textContent: "", hidden: true,
        classList: {
          toggle(name, active) { active ? classes.add(name) : classes.delete(name); },
          contains(name) { return classes.has(name); },
        },
        setAttribute(name, value) { attributes.set(name, value); },
        getAttribute(name) { return attributes.get(name); },
        addEventListener(name, callback) { listeners.set(name, callback); },
        emit(name, event = {}) { listeners.get(name)?.(event); },
      };
    };
    const slides = labels.map((label) => node({ label }));
    const dots = labels.map(() => node());
    const caption = node();
    // 若回归为 innerHTML 写入，明确失败，而非把标签字符串当成安全文字。
    Object.defineProperty(caption, "innerHTML", { set() { assert.fail("轮播文案只能通过 textContent 写入"); } });
    const count = node();
    const status = node();
    const controls = [node(), node()];
    const prev = node();
    const next = node();
    const pause = node();
    const carousel = node();
    const selectors = new Map([
      ["[data-slide]", slides], ["[data-dot]", dots], ["[data-carousel-controls]", controls],
      ["[data-slide-caption]", [caption]], ["[data-slide-count]", [count]], ["[data-slide-status]", [status]],
      ["[data-prev]", [prev]], ["[data-next]", [next]], ["[data-pause]", [pause]],
    ]);
    carousel.querySelectorAll = (selector) => selectors.get(selector) ?? [];
    carousel.querySelector = (selector) => carousel.querySelectorAll(selector)[0] ?? null;
    const timers = new Map();
    let timerId = 0;
    installBrowserHost(t, {
      matchMedia: () => ({ matches: false, addEventListener() {} }),
      setTimeout(callback, delay) { assert.equal(delay, 7000); timers.set(++timerId, callback); return timerId; },
      clearTimeout(id) { timers.delete(id); },
    }, {
      hidden: false,
      querySelector: () => null,
      querySelectorAll: (selector) => selector === "[data-carousel]" ? [carousel] : [],
      addEventListener() {},
    });
    initializeSite();
    return {
      slides, dots, caption, count, status, controls, prev, next, pause, carousel,
      advance() {
        assert.equal(timers.size, 1, "每次切换应只保留一个自动播放计时器");
        const [id, callback] = timers.entries().next().value;
        timers.delete(id);
        callback();
      },
    };
  }

  test("实际轮播 render 将第三圆点的可见文案、影像、计数和 ARIA 同步", (t) => {
    const fixture = carouselFixture(t);
    fixture.dots[2].emit("click");
    assert.equal(fixture.caption.textContent, "让美，回归日常。");
    assert.equal(fixture.count.textContent, "03");
    assert.equal(fixture.status.textContent, "第 3 张，共 3 张。让美，回归日常。");
    fixture.slides.forEach((slide, index) => {
      assert.equal(slide.classList.contains("is-active"), index === 2);
      assert.equal(slide.getAttribute("aria-hidden"), String(index !== 2));
      assert.equal(fixture.dots[index].getAttribute("aria-current"), String(index === 2));
    });
    fixture.next.emit("click");
    assert.equal(fixture.caption.textContent, "光，落在你的美上。");
    fixture.prev.emit("click");
    assert.equal(fixture.caption.textContent, "让美，回归日常。");
  });

  test("初始和自动播放的 render(false) 更新可见文案，但不触发读屏播报", (t) => {
    const fixture = carouselFixture(t);
    assert.equal(fixture.caption.textContent, "光，落在你的美上。");
    assert.equal(fixture.status.textContent, "");
    assert.ok(fixture.controls.every((control) => !control.hidden));
    for (const [label, count] of [["美，藏在细节里。", "02"], ["让美，回归日常。", "03"], ["光，落在你的美上。", "01"]]) {
      fixture.advance();
      assert.equal(fixture.caption.textContent, label);
      assert.equal(fixture.count.textContent, count);
      assert.equal(fixture.status.textContent, "");
    }
  });

  test("轮播可见文案中的标签按纯文本同步，不解析为 HTML", (t) => {
    const label = '<em data-untrusted="true">测试文字</em>';
    const fixture = carouselFixture(t, ["第一张", "第二张", label]);
    fixture.dots[2].emit("click");
    assert.equal(fixture.caption.textContent, label);
  });

  test("轮播首张可见，前后与圆点循环选择", () => {
    const state = createCarouselState(3);
    assert.equal(state.index, 0);
    state.step(-1);
    assert.equal(state.index, 2);
    state.step(1);
    assert.equal(state.index, 0);
    state.select(1);
    assert.equal(state.index, 1);
    assert.throws(() => state.select(4), RangeError);
  });

  test("悬停、焦点与页面隐藏暂停，用户主动暂停不被恢复覆盖", () => {
    const state = createCarouselState(3);
    assert.equal(state.playing, true);
    state.setBlock("hover", true);
    assert.equal(state.playing, false);
    state.setBlock("focus", true);
    state.setBlock("hover", false);
    assert.equal(state.playing, false);
    state.setBlock("focus", false);
    assert.equal(state.playing, true);
    state.toggle();
    state.setBlock("hidden", true);
    state.setBlock("hidden", false);
    assert.equal(state.playing, false);
  });

  test("减少动态效果默认停止自动播放，仍支持手动切换", () => {
    const state = createCarouselState(3, true);
    assert.equal(state.playing, false);
    state.step(1);
    assert.equal(state.index, 1);
    state.toggle();
    assert.equal(state.playing, false);
  });

  test("分析配置只允许生产环境及有效 HTTPS 站点和收集地址", () => {
    const valid = { environment: "production", base_url: "https://beiti.example", analytics_endpoint: "https://beiti.example/events" };
    assert.ok(analyticsConfiguration(valid));
    assert.equal(analyticsConfiguration({ ...valid, environment: "preview" }), null);
    assert.equal(analyticsConfiguration({ ...valid, analytics_endpoint: "" }), null);
    assert.equal(analyticsConfiguration({ ...valid, analytics_endpoint: "javascript:alert(1)" }), null);
    assert.equal(analyticsConfiguration({ ...valid, base_url: "http://beiti.example" }), null);
    assert.equal(analyticsConfiguration({ ...valid, analytics_endpoint: "https://user:secret@beiti.example/events" }), null);
  });

  test("分析事件只包含分类、页面路径与来源 origin，不保留查询或表单数据", () => {
    const event = analyticsEvent("https://beiti.example/contact/?name=private#message", "https://chatgpt.com/c/private?q=secret", "intent_click", "skin");
    assert.deepEqual(event, {
      event: "intent_click",
      category: "skin",
      path: "/contact/",
      referrer_origin: "https://chatgpt.com",
      source: "ai",
    });
    assert.equal(analyticsEvent("https://beiti.example/", "", "form_body", "secret"), null);
    assert.equal(analyticsEvent("https://beiti.example/", "", "intent_click", "private-contact"), null);
  });

  test("本地摘要事件只保留分类和来源，不表示提交成功或携带个人字段", () => {
    assert.deepEqual(analyticsEvent("https://beiti.example/contact/?name=private#result", "", "inquiry_prepared", "general"), {
      event: "inquiry_prepared", category: "general", path: "/contact/", referrer_origin: "", source: "direct",
    });
    assert.equal(analyticsEvent("https://beiti.example/", "", "inquiry_sent", "general"), null);
  });

  function analyticsFixture(t, config = {}) {
    const toggle = new EventTarget();
    toggle.dataset = {
      environment: "production", baseUrl: "https://beiti.example.invalid",
      endpoint: "https://beiti.example.invalid/events", ...config,
    };
    toggle.setAttribute = () => {};
    const status = { textContent: "" };
    const document = new EventTarget();
    document.referrer = "https://chatgpt.com/c/private?q=secret";
    document.querySelector = (selector) => selector === "[data-analytics-toggle]" ? toggle : selector === "[data-analytics-status]" ? status : null;
    document.querySelectorAll = () => [];
    installBrowserHost(t, {
      matchMedia: () => ({ matches: false, addEventListener() {} }),
      location: { href: "https://beiti.example.invalid/contact/?name=private#result" },
      setTimeout: () => 1, clearTimeout() {},
    }, document);
    const requests = [];
    t.mock.method(globalThis, "fetch", async (url, options) => {
      requests.push({ url, options, payload: JSON.parse(options.body) });
      return { ok: true };
    });
    initializeSite();
    return { toggle, document, requests };
  }

  test("真实 document 绑定仅在用户开启后记录本地摘要，关闭后不再记录", (t) => {
    const { toggle, document, requests } = analyticsFixture(t);
    document.dispatchEvent(new Event("beiti:inquiry-prepared"));
    assert.equal(requests.length, 0);
    toggle.dispatchEvent(new Event("click"));
    assert.equal(requests.length, 1);
    assert.equal(requests[0].payload.event, "page_view");
    document.dispatchEvent(new Event("beiti:inquiry-prepared"));
    assert.equal(requests.length, 2, "本地摘要应经过真实事件监听器及已有 send 门控");
    assert.deepEqual(requests[1].payload, {
      event: "inquiry_prepared", category: "general", path: "/contact/",
      referrer_origin: "https://chatgpt.com", source: "ai",
    });
    assert.equal(requests[1].options.credentials, "omit");
    assert.equal(requests[1].options.referrerPolicy, "no-referrer");
    toggle.dispatchEvent(new Event("click"));
    document.dispatchEvent(new Event("beiti:inquiry-prepared"));
    assert.equal(requests.length, 2);
  });

  test("预览或无有效 endpoint 时，本地摘要事件不会发送", async (t) => {
    for (const config of [{ environment: "preview" }, { endpoint: "" }, { endpoint: "javascript:alert(1)" }]) {
      await t.test(JSON.stringify(config), (t) => {
        const { toggle, document, requests } = analyticsFixture(t, config);
        toggle.dispatchEvent(new Event("click"));
        document.dispatchEvent(new Event("beiti:inquiry-prepared"));
        assert.equal(toggle.disabled, true);
        assert.equal(requests.length, 0);
      });
    }
  });
}
