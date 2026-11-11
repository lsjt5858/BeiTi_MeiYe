import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { parse } from "parse5";
import { stringify } from "yaml";
import { brandMedia } from "../src/components/brand-media.mjs";

const workspace = fileURLToPath(new URL("..", import.meta.url));
const astroCli = join(workspace, "node_modules/astro/bin/astro.mjs");
const faqFact = (index, status = "confirmed", extra = {}) => ({
  id: `fixture.faq-${index}`, type: "faq", status, updated_at: "2026-10-01",
  value: { question: `隔离测试问题 ${index}？`, answer: `隔离测试答案 ${index}。` }, ...extra,
});

function createFixture(faqs) {
  // 全部确认记录仅存在于隔离 fixture，不改业务事实卡或草稿。
  const root = realpathSync(mkdtempSync(join(tmpdir(), "beiti-carousel-home-")));
  const put = (file, content) => {
    const target = join(root, file);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  };
  for (const file of [
    "package.json", "astro.config.mjs", "tsconfig.json", "src/env.d.ts",
    "src/pages/index.astro", "src/pages/articles/[slug].astro",
    "src/pages/_shared/InnerPage.astro", "src/pages/_shared/values.ts",
    "src/layouts/SiteLayout.astro", "src/components/PageHeader.astro",
    "src/components/SiteHeader.astro", "src/components/SiteFooter.astro",
    "src/components/site-interactions.mjs", "src/components/brand-media.mjs",
    "src/styles/global.css", "src/lib/content.ts", "src/lib/seo.ts",
  ]) {
    mkdirSync(dirname(join(root, file)), { recursive: true });
    copyFileSync(join(workspace, file), join(root, file));
  }
  symlinkSync(join(workspace, "node_modules"), join(root, "node_modules"), "dir");
  put("client.json", JSON.stringify({
    brand: "贝缇美业", base_url: "", language: "zh-CN", environment: "preview",
    public_pages: [], analytics_endpoint: "",
  }));
  const reference = { id: "fixture.reference", type: "note", status: "confirmed", value: "仅供隔离测试的引用。", updated_at: "2026-10-02" };
  const setFacts = (updatedAt) => put("fact-card.yaml", stringify({ facts: [{ ...reference, updated_at: updatedAt }, ...faqs] }));
  setFacts(reference.updated_at);
  put("drafts/fixture-article.md", `---\n${stringify({
    slug: "fixture-article", title: "隔离测试文章", description: "只用于验证页面日期。",
    question: "如何验证引用更新？", fact_refs: ["fixture.reference"],
    status: "confirmed", updated_at: "2026-10-01",
  })}---\n这段文字仅用于隔离构建回归测试。`);
  return { root, setFacts };
}

function build(root) {
  const result = spawnSync(process.execPath, [astroCli, "build", "--root", root], {
    cwd: root, encoding: "utf8", timeout: 90_000,
    env: { ...process.env, ASTRO_TELEMETRY_DISABLED: "1" },
  });
  assert.equal(result.status, 0, `${result.error?.message ?? ""}\n${result.stdout}\n${result.stderr}`);
  return parse(readFileSync(join(root, "dist/index.html"), "utf8"));
}

const attr = (node, name) => node.attrs?.find((item) => item.name === name)?.value;
const hasClass = (node, name) => (attr(node, "class") ?? "").split(/\s+/).includes(name);
const text = (node) => node.nodeName === "#text" ? node.value : (node.childNodes ?? []).map(text).join("");
function findAll(node, predicate) {
  return [...(predicate(node) ? [node] : []), ...(node.childNodes ?? []).flatMap((child) => findAll(child, predicate))];
}
const homeFaqs = (tree) => findAll(tree, (node) => node.tagName === "details" && (attr(node, "id") ?? "").startsWith("home-faq-"));
function homeArticleTime(tree) {
  const section = findAll(tree, (node) => hasClass(node, "home-articles"))[0];
  assert.ok(section, "真实首页应生成确认文章列表");
  return findAll(section, (node) => node.tagName === "time")[0];
}

test("真实首页绑定首张 caption、保留说明并只展示前四条有效 FAQ", { timeout: 120_000 }, () => {
  const confirmed = [1, 2, 3, 4, 5].map((index) => faqFact(index));
  const { root } = createFixture([faqFact("pending", "pending"), ...confirmed, faqFact("expired", "expired")]);
  const tree = build(root);
  const caption = findAll(tree, (node) => attr(node, "data-slide-caption") !== undefined)[0];
  assert.ok(caption, "首张可见 caption 应提供运行时数据绑定");
  assert.equal(caption.tagName, "span");
  assert.equal(text(caption), brandMedia[0].label);
  const parent = findAll(tree, (node) => hasClass(node, "hero-caption"))[0];
  const note = findAll(parent, (node) => node.tagName === "small")[0];
  assert.equal(text(note), "生成影像仅作品牌美学表达，非真实服务成果");
  assert.equal(attr(homeArticleTime(tree), "datetime"), "2026-10-02");
  const faqs = homeFaqs(tree);
  assert.deepEqual(faqs.map((node) => attr(node, "id")), confirmed.slice(0, 4).map((fact) => `home-faq-${fact.id}`));
  faqs.forEach((node, index) => {
    assert.ok(text(node).includes(confirmed[index].value.question));
    assert.ok(text(node).includes(confirmed[index].value.answer));
    assert.equal(attr(findAll(node, (child) => child.tagName === "time")[0], "datetime"), "2026-10-01");
  });
  assert.doesNotMatch(text(tree), /隔离测试(?:问题|答案) (?:pending|expired|elapsed)/);
});

test("FAQ 未公开且引用事实更新时，真实首页门控和文章日期保持一致", { timeout: 120_000 }, async (t) => {
  const { root, setFacts } = createFixture([
    faqFact("pending", "pending"), faqFact("expired", "expired"),
    faqFact("elapsed", "confirmed", { expires_at: "2000-01-01" }),
  ]);
  const expected = "2026-11-09";
  setFacts(expected);
  const tree = build(root);
  await t.test("没有有效 FAQ 时不生成猜测问答，并保留咨询入口", () => {
    assert.equal(homeFaqs(tree).length, 0, "没有公开 FAQ 时不能生成硬编码问答");
    assert.equal(findAll(tree, (node) => hasClass(node, "home-faq-list")).length, 0);
    assert.doesNotMatch(text(tree), /隔离测试(?:问题|答案) (?:pending|expired|elapsed)/);
    assert.ok(findAll(tree, (node) => node.tagName === "a" && attr(node, "href") === "/contact/").length > 0);
  });
  await t.test("首页文章时间使用引用事实的新日期，与详情及 JSON-LD 一致", () => {
    const homeTime = homeArticleTime(tree);
    assert.equal(attr(homeTime, "datetime"), expected);
    assert.equal(text(homeTime), `更新：${expected}`);
    const detail = parse(readFileSync(join(root, "dist/articles/fixture-article/index.html"), "utf8"));
    const update = findAll(detail, (node) => hasClass(node, "page-update"))[0];
    assert.ok(update);
    const detailTime = findAll(update, (node) => node.tagName === "time")[0];
    assert.equal(attr(detailTime, "datetime"), expected);
    assert.equal(text(detailTime), expected);
    const jsonLd = findAll(detail, (node) => node.tagName === "script" && attr(node, "type") === "application/ld+json")
      .flatMap((node) => JSON.parse(text(node)));
    assert.equal(jsonLd.find((item) => item["@type"] === "Article")?.dateModified, expected);
  });
});
