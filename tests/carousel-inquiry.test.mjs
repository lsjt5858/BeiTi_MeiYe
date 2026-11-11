import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import ts from "typescript";

test("真实咨询脚本只在校验成功且本地摘要已显示后发无数据事件", () => {
  const sourceUrl = new URL("../src/pages/contact.astro", import.meta.url);
  const source = readFileSync(sourceUrl, "utf8").match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  assert.ok(source, "应能执行咨询页面的真实客户端脚本");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const element = (id) => Object.assign(new EventTarget(), {
    id, value: "", checked: false, hidden: true, textContent: "", disabled: true,
    focus() {}, removeAttribute() {}, setAttribute() {}, replaceChildren() {}, append() {},
  });
  const ids = [
    "contact-form", "contact-fields", "contact-organize", "contact-name", "contact-contact",
    "contact-interest", "contact-message", "contact-consent", "contact-website",
    "contact-error-summary", "contact-error-list", "contact-errors", "contact-result",
    "inquiry-summary", "copy-summary", "download-summary", "copy-status",
    "copy-fallback-area", "copy-fallback", "message-count",
  ];
  const nodes = new Map(ids.map((id) => [`#${id}`, element(id)]));
  const document = new EventTarget();
  document.querySelector = (selector) => nodes.get(selector) ?? null;
  document.createElement = (tag) => element(tag);
  const events = [];
  document.addEventListener("beiti:inquiry-prepared", (event) => {
    assert.equal(nodes.get("#contact-result").hidden, false, "事件触发前结果必须可见");
    assert.ok(nodes.get("#inquiry-summary").textContent.includes("只用于隔离测试"));
    assert.equal("detail" in event, false, "事件不携带表单数据");
    events.push(event);
  });
  runInNewContext(compiled, {
    require: createRequire(sourceUrl), exports: {}, document, Event, URLSearchParams,
    window: { location: { search: "" }, addEventListener() {} },
  });
  const form = nodes.get("#contact-form");
  form.dispatchEvent(new Event("submit", { cancelable: true }));
  assert.equal(events.length, 0, "空表单校验失败不得报告本地摘要已生成");
  assert.equal(nodes.get("#contact-result").hidden, true);
  nodes.get("#contact-name").value = "隔离测试";
  nodes.get("#contact-contact").value = "private@example.invalid";
  nodes.get("#contact-interest").value = "美妆造型";
  nodes.get("#contact-message").value = "只用于隔离测试，不发往收件方。";
  nodes.get("#contact-consent").checked = true;
  form.dispatchEvent(new Event("submit", { cancelable: true }));
  assert.equal(nodes.get("#contact-result").hidden, false);
  assert.equal(events.length, 1, "成功生成并显示本地摘要后应恰好触发一次");
  nodes.get("#contact-consent").checked = false;
  form.dispatchEvent(new Event("submit", { cancelable: true }));
  assert.equal(events.length, 1, "撤回表单隐私同意后的校验失败不得触发事件");
  assert.equal(nodes.get("#contact-result").hidden, true);
});
