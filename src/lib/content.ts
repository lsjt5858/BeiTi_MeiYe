import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { Marked } from 'marked';

export type Status = 'unknown' | 'pending' | 'confirmed' | 'conflict' | 'expired';
export type FactValue = string | number | boolean | null | Record<string, unknown> | unknown[];
export interface SiteConfig {
  brand: string;
  base_url: string;
  language: string;
  environment: 'preview' | 'production';
  public_pages: string[];
  analytics_endpoint: string;
}
export interface FactRecord {
  id: string;
  type: string;
  status: Status;
  value: FactValue;
  updated_at: string;
  expires_at?: string;
}
export interface ServiceRecord {
  id: string;
  slug: string;
  name: string;
  summary: string;
  audience: string[];
  notFor: string[];
  limits: string[];
  duration: string;
  price?: string | number;
  effectiveDate?: string;
  unit: string;
  includes: string[];
  excludes: string[];
  updatedAt: string;
}
export interface LocationRecord {
  id: string;
  slug: string;
  name: string;
  address: string;
  hours: string;
  transport: string;
  booking: string;
  mapUrl: string;
  updatedAt: string;
}
export interface FaqRecord {
  id: string;
  question: string;
  answer: string;
  category: string;
  updatedAt: string;
}
export interface ReviewRecord {
  id: string;
  author: string;
  text: string;
  authorized: true;
  source: string;
  date: string;
  rating?: number;
  updatedAt: string;
}
export interface ArticleFrontmatter {
  slug: string;
  title: string;
  description: string;
  question: string;
  fact_refs: string[];
  status: Status;
  updated_at: string;
  expires_at?: string;
}
export interface DraftRecord {
  file: string;
  frontmatter: ArticleFrontmatter;
  body: string;
}
export interface ArticleRecord extends ArticleFrontmatter {
  id: string;
  updatedAt: string;
  frontmatter: ArticleFrontmatter;
  body: string;
  html: string;
}
export interface ContentModel {
  site: SiteConfig;
  facts: FactRecord[];
  drafts: DraftRecord[];
  warnings: string[];
  getFact<T = FactValue>(id: string): T | undefined;
  getServices(): ServiceRecord[];
  getLocations(): LocationRecord[];
  getFaqs(): FaqRecord[];
  getReviews(): ReviewRecord[];
  getArticles(): ArticleRecord[];
  getLatestUpdate(): string;
}
export interface ModelInput {
  site: unknown;
  facts: unknown[];
  drafts?: unknown[];
}
export interface ModelOptions { now?: string | Date }

const statuses = new Set(['unknown', 'pending', 'confirmed', 'conflict', 'expired']);
export const placeholderPattern = /PENDING_ONLY_NOT_PUBLIC|EXPIRED_ONLY_NOT_PUBLIC|\bTODO\b|\bTBD\b|\bFIXME\b|待确认|待填写|示例(?:地址|电话|价格|邮箱)|占位(?:符)?|\bx{3,}\b|\{\{[^}]*\}\}/i;
export const exaggeratedPattern = /(?:100\s*[%％]\s*(?:有效|成功|安全|满意))|(?:保证|确保|绝对)(?:[^。！!\n]{0,8})(?:有效|无风险|成功|治愈)|永久有效|全网第一|包治百病|零风险|百分之百(?:有效|成功|安全)/i;
// Astro 7 将服务端模块移动到 .astro/.prerender；不能据打包后的 import.meta.url 找事实根目录。
declare const __BEITI_CONTENT_ROOT__: string | undefined;
const defaultRoot = typeof __BEITI_CONTENT_ROOT__ !== 'undefined'
  ? __BEITI_CONTENT_ROOT__
  : fileURLToPath(new URL('../../', import.meta.url));

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} 必须是对象`);
  return value as Record<string, unknown>;
}
function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} 必须是非空字符串`);
  return value.trim();
}
export function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function dateValue(value: unknown, label: string): string {
  if (!isValidDate(value)) throw new Error(`${label} 必须是有效 ISO 日期 YYYY-MM-DD`);
  return value;
}
function statusValue(value: unknown, label: string): Status {
  if (!statuses.has(String(value))) throw new Error(`${label} status 状态无效`);
  return value as Status;
}
export function normalizePath(path: string): string {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || /[?#\\\s]/.test(path) || /(?:^|\/)\.{1,2}(?:\/|$)/.test(path) || /%2[ef]|%5c/i.test(path)) {
    throw new Error(`公开页面路径无效：${path}`);
  }
  return path === '/' || /\.[a-z0-9]+$/i.test(path) ? path : `${path.replace(/\/+$/, '')}/`;
}
export function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch { return false; }
}
export function validateBaseUrl(value: string): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('production base_url 必须是真实 HTTPS 域名'); }
  const host = url.hostname.toLowerCase();
  const reserved = /(^|\.)(?:example|localhost|invalid|test|local|internal)(?:\.|$)/.test(host);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/' || (url.port && url.port !== '443') || reserved || !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(host)) {
    throw new Error('production base_url 必须是无路径、无凭据的真实 HTTPS 公共域名，不能使用占位域名');
  }
  return url.origin;
}
export function validateSite(input: unknown): SiteConfig {
  const value = object(input, 'client.json');
  const brand = requiredString(value.brand, 'brand');
  const language = requiredString(value.language, 'language');
  if (!['preview', 'production'].includes(String(value.environment))) throw new Error('environment 只能是 preview 或 production');
  if (typeof value.base_url !== 'string') throw new Error('base_url 必须是字符串');
  if (!Array.isArray(value.public_pages) || value.public_pages.some(path => typeof path !== 'string')) throw new Error('public_pages 必须是路径数组');
  if (typeof value.analytics_endpoint !== 'string') throw new Error('analytics_endpoint 必须是字符串');
  if (value.analytics_endpoint && (!isHttpUrl(value.analytics_endpoint) || !value.analytics_endpoint.startsWith('https:'))) throw new Error('analytics_endpoint 必须为空或 HTTPS URL');
  // 预览模式也不接受假域名；生产域名由配置维护者核对归属，本地检查不访问外网。
  const base_url = value.base_url ? validateBaseUrl(value.base_url) : '';
  if (value.environment === 'production' && !base_url) validateBaseUrl('');
  return {
    brand, language, base_url, environment: value.environment as SiteConfig['environment'],
    public_pages: [...new Set(value.public_pages.map(normalizePath))],
    analytics_endpoint: value.analytics_endpoint,
  };
}
function slugValue(value: unknown, label: string): string {
  const slug = requiredString(value, `${label}.slug`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`${label}.slug 只能使用小写字母、数字和连字符`);
  return slug;
}
function text(value: unknown): string {
  return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : '';
}
function list(value: unknown, label: string): string[] {
  if (value === undefined || value === null) return [];
  if (typeof value === 'string') return value ? [value] : [];
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) throw new Error(`${label} 必须是字符串或字符串数组`);
  return [...value];
}
function inspectText(value: unknown, label: string, publishable: boolean, warnings: string[]) {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  for (const [pattern, issue] of [[placeholderPattern, '占位符'], [exaggeratedPattern, '夸张承诺']] as const) {
    if (pattern.test(serialized)) {
      const message = `${label} 含${issue}`;
      if (publishable) throw new Error(message);
      warnings.push(`${message}（未公开）`);
    }
  }
}
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}
function safeMarkdown(body: string): string {
  const markdown = new Marked({
    async: false,
    renderer: {
      html({ text: raw }) { return escapeHtml(raw); },
      link({ href, title, tokens }) {
        const label = this.parser.parseInline(tokens);
        if (!/^(https?:\/\/|\/(?!\/)|#|mailto:|tel:)/i.test(href) || /[\u0000-\u0020\\]/.test(href)) return label;
        return `<a href="${escapeHtml(href)}"${title ? ` title="${escapeHtml(title)}"` : ''}>${label}</a>`;
      },
      image({ href, text: alt }) {
        if (!/^(https?:\/\/|\/(?!\/))/i.test(href) || /[\u0000-\u0020\\]/.test(href)) return escapeHtml(alt);
        return `<img src="${escapeHtml(href)}" alt="${escapeHtml(alt)}" loading="lazy">`;
      },
    },
  });
  return markdown.parse(body, { async: false });
}

/** 纯模型构建入口：fixture 无需修改根目录，日期可注入。 */
export function buildModel(input: ModelInput, options: ModelOptions = {}): ContentModel {
  const config = validateSite(input.site);
  const now = dateValue(options.now instanceof Date ? options.now.toISOString().slice(0, 10) : options.now ?? new Date().toISOString().slice(0, 10), 'now');
  if (!Array.isArray(input.facts)) throw new Error('facts 必须是数组');
  const warnings: string[] = [];
  const ids = new Set<string>();
  const slugs = new Set<string>();
  const facts: FactRecord[] = input.facts.map(raw => {
    const value = object(raw, 'fact');
    const id = requiredString(value.id, 'fact.id');
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(id)) throw new Error(`fact.id 无效：${id}`);
    if (ids.has(id)) throw new Error(`重复 fact id：${id}`);
    ids.add(id);
    const type = requiredString(value.type, `${id}.type`);
    const status = statusValue(value.status, id);
    const updated_at = dateValue(value.updated_at, `${id}.updated_at`);
    const expires_at = value.expires_at === undefined ? undefined : dateValue(value.expires_at, `${id}.expires_at`);
    if (!Object.hasOwn(value, 'value')) throw new Error(`${id}.value 缺失`);
    if (value.value === undefined || (typeof value.value === 'number' && !Number.isFinite(value.value))) throw new Error(`${id}.value 无效`);
    if (['service', 'location'].includes(type)) {
      const publishable = status === 'confirmed' && (!expires_at || expires_at >= now);
      const hasObject = !!value.value && typeof value.value === 'object' && !Array.isArray(value.value);
      if (publishable || hasObject) {
        const entity = object(value.value, `${id}.value`);
        if (publishable) requiredString(entity.name, `${id}.name`);
        if (entity.id !== undefined && entity.id !== id) throw new Error(`${id}.value.id 与事实 id 不一致`);
        if (publishable || entity.slug !== undefined) {
          const slug = slugValue(entity.slug, id);
          const key = `${type}/${slug}`;
          if (slugs.has(key)) throw new Error(`重复 ${type} slug：${slug}`);
          slugs.add(key);
        }
      }
    }
    return { id, type, status, value: value.value as FactValue, updated_at, ...(expires_at ? { expires_at } : {}) };
  });
  const available = (item: { status: Status; expires_at?: string }) => item.status === 'confirmed' && (!item.expires_at || item.expires_at >= now);
  const publicFacts = new Map<string, FactRecord>();
  for (const item of facts) {
    const publishable = available(item);
    inspectText(item.value, item.id, publishable, warnings);
    if (!publishable) {
      warnings.push(`${item.id}：${item.status}${item.expires_at && item.expires_at < now ? '，已过期' : ''}（未公开）`);
      continue;
    }
    if (item.type === 'review') {
      const review = object(item.value, `${item.id}.value`);
      const source = text(review.source).trim();
      if (review.authorized !== true || !source || !isValidDate(review.date) || review.date > now) {
        warnings.push(`${item.id}：缺少明确授权、来源或有效评价日期（未公开）`);
        continue;
      }
      if (/^[a-z][a-z0-9+.-]*:/i.test(source) && !isHttpUrl(source)) throw new Error(`${item.id} 评价来源链接无效`);
      requiredString(review.text, `${item.id}.text`);
      if (review.rating !== undefined && (typeof review.rating !== 'number' || review.rating < 1 || review.rating > 5)) throw new Error(`${item.id}.rating 必须在 1–5 之间`);
    }
    publicFacts.set(item.id, item);
  }
  const byType = (type: string) => [...publicFacts.values()].filter(item => item.type === type);
  const services = byType('service').map(item => {
    const value = object(item.value, item.id);
    if (value.price !== undefined && typeof value.price !== 'string' && typeof value.price !== 'number') throw new Error(`${item.id}.price 必须是字符串或数字`);
    return {
      id: item.id, slug: slugValue(value.slug, item.id), name: requiredString(value.name, `${item.id}.name`),
      summary: text(value.summary), audience: list(value.audience, `${item.id}.audience`),
      notFor: list(value.notFor, `${item.id}.notFor`), limits: list(value.limits, `${item.id}.limits`),
      duration: text(value.duration), ...(value.price !== undefined ? { price: value.price } : {}),
      ...(value.effectiveDate === undefined ? {} : { effectiveDate: dateValue(value.effectiveDate, `${item.id}.effectiveDate`) }),
      unit: text(value.unit), includes: list(value.includes, `${item.id}.includes`),
      excludes: list(value.excludes, `${item.id}.excludes`), updatedAt: item.updated_at,
    } satisfies ServiceRecord;
  });
  const locations = byType('location').map(item => {
    const value = object(item.value, item.id);
    const mapUrl = text(value.mapUrl);
    if (mapUrl && !isHttpUrl(mapUrl)) throw new Error(`${item.id}.mapUrl 地图链接只允许 http(s)`);
    return {
      id: item.id, slug: slugValue(value.slug, item.id), name: requiredString(value.name, `${item.id}.name`),
      address: text(value.address), hours: text(value.hours), transport: text(value.transport),
      booking: text(value.booking), mapUrl, updatedAt: item.updated_at,
    } satisfies LocationRecord;
  });
  const faqs = byType('faq').map(item => {
    const value = object(item.value, item.id);
    return {
      id: item.id, question: requiredString(value.question, `${item.id}.question`),
      answer: requiredString(value.answer, `${item.id}.answer`), category: text(value.category) || '网站使用',
      updatedAt: item.updated_at,
    } satisfies FaqRecord;
  });
  const reviews = byType('review').map(item => {
    const value = object(item.value, item.id);
    return {
      id: item.id, author: text(value.author) || '已授权用户', text: text(value.text),
      authorized: true as const, source: text(value.source), date: text(value.date),
      ...(typeof value.rating === 'number' ? { rating: value.rating } : {}), updatedAt: item.updated_at,
    } satisfies ReviewRecord;
  });
  const draftSlugs = new Set<string>();
  const drafts: DraftRecord[] = (input.drafts ?? []).map(raw => {
    const value = object(raw, 'draft');
    const fm = object(value.frontmatter, 'draft.frontmatter');
    const slug = slugValue(fm.slug, 'draft');
    if (draftSlugs.has(slug)) throw new Error(`重复 draft slug：${slug}`);
    draftSlugs.add(slug);
    if (!Array.isArray(fm.fact_refs) || fm.fact_refs.some(ref => typeof ref !== 'string')) throw new Error(`${slug}.fact_refs 必须是事实 id 数组`);
    for (const ref of fm.fact_refs) if (!ids.has(ref)) throw new Error(`${slug} 缺失事实引用：${ref}`);
    const frontmatter: ArticleFrontmatter = {
      slug, title: requiredString(fm.title, `${slug}.title`),
      description: requiredString(fm.description, `${slug}.description`),
      question: requiredString(fm.question, `${slug}.question`), fact_refs: [...fm.fact_refs],
      status: statusValue(fm.status, slug), updated_at: dateValue(fm.updated_at, `${slug}.updated_at`),
      ...(fm.expires_at === undefined ? {} : { expires_at: dateValue(fm.expires_at, `${slug}.expires_at`) }),
    };
    if (typeof value.body !== 'string') throw new Error(`${slug}.body 必须是字符串`);
    return { file: text(value.file) || `${slug}.md`, frontmatter, body: value.body };
  });
  const articles: ArticleRecord[] = [];
  for (const item of drafts) {
    const fm = item.frontmatter;
    // 已确认文字即使引用暂未确认，也不能通过占位符/夸张承诺检查。
    inspectText({ title: fm.title, description: fm.description, question: fm.question, body: item.body }, item.file, available(fm), warnings);
    if (!available(fm) || fm.fact_refs.some(ref => !publicFacts.has(ref))) {
      warnings.push(`${item.file}：草稿未确认、已过期或引用事实未公开（未公开）`);
      continue;
    }
    const updatedAt = [fm.updated_at, ...fm.fact_refs.map(ref => publicFacts.get(ref)!.updated_at)].sort().at(-1)!;
    articles.push({ ...fm, id: fm.slug, updatedAt, frontmatter: fm, body: item.body, html: safeMarkdown(item.body) });
  }
  articles.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.slug.localeCompare(b.slug));
  const latest = [...publicFacts.values()].map(item => item.updated_at).concat(articles.map(item => item.updatedAt)).sort().at(-1) ?? '';
  return {
    site: config, facts, drafts, warnings,
    getFact<T = FactValue>(id: string): T | undefined { return publicFacts.get(id)?.value as T | undefined; },
    getServices: () => structuredClone(services), getLocations: () => structuredClone(locations),
    getFaqs: () => structuredClone(faqs), getReviews: () => structuredClone(reviews),
    getArticles: () => structuredClone(articles), getLatestUpdate: () => latest,
  };
}

/** 同步磁盘入口，支持临时 fixture 根目录及 URL。 */
export function loadContent(root: string | URL = defaultRoot, options: ModelOptions = {}): ContentModel {
  const directory = root instanceof URL ? fileURLToPath(root) : resolve(root);
  const site = JSON.parse(readFileSync(join(directory, 'client.json'), 'utf8'));
  const card = object(parseYaml(readFileSync(join(directory, 'fact-card.yaml'), 'utf8')), 'fact-card.yaml');
  if (!Array.isArray(card.facts)) throw new Error('fact-card.yaml.facts 必须是数组');
  const draftsDirectory = join(directory, 'drafts');
  const drafts = existsSync(draftsDirectory) ? readdirSync(draftsDirectory).filter(file => file.endsWith('.md')).sort().map(file => {
    const raw = readFileSync(join(draftsDirectory, file), 'utf8').replace(/^\uFEFF/, '');
    const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/.exec(raw);
    if (!match) throw new Error(`${file} 缺少 YAML frontmatter`);
    return { file, frontmatter: parseYaml(match[1]!), body: match[2]!.trim() };
  }) : [];
  return buildModel({ site, facts: card.facts, drafts }, options);
}

export const site = validateSite(JSON.parse(readFileSync(join(defaultRoot, 'client.json'), 'utf8')));
let defaultModel: ContentModel | undefined;
function current() { return defaultModel ??= loadContent(defaultRoot); }
export const getFact = <T = FactValue>(id: string) => current().getFact<T>(id);
export const getServices = () => current().getServices();
export const getLocations = () => current().getLocations();
export const getFaqs = () => current().getFaqs();
export const getReviews = () => current().getReviews();
export const getArticles = () => current().getArticles();
export const getLatestUpdate = () => current().getLatestUpdate();
