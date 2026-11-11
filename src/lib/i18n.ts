import { english } from './translations.ts';

export const locales = ['zh-CN', 'en'] as const;
export type Locale = typeof locales[number];
export const basePages = ['/', '/services/', '/pricing/', '/about/', '/locations/', '/faq/', '/articles/', '/contact/', '/privacy/', '/terms/'];

export function localeFromPath(path: string): Locale {
  return /^\/en(?:\/|$)/.test(path) ? 'en' : 'zh-CN';
}
export function documentLocale(doc?: { documentElement?: { lang?: string } }): Locale {
  return doc?.documentElement?.lang === 'en' ? 'en' : 'zh-CN';
}
export function sourcePath(path: string): string {
  return path.replace(/^\/en(?=\/|$)/, '') || '/';
}
export function localizedPath(href: string, locale: Locale): string {
  if (!href.startsWith('/') || href.startsWith('//')) return href;
  const match = /^([^?#]*)(.*)$/.exec(href)!;
  const path = sourcePath(match[1]);
  if (!(path === '/' || /^\/(?:services|pricing|about|locations|faq|articles|contact|privacy|terms|reviews|404)(?:\/|$)/.test(path))) return href;
  return `${locale === 'en' ? '/en' : ''}${path}${match[2]}`;
}
const phrases = Object.keys(english).sort((a, b) => b.length - a.length);
const composite = new RegExp(phrases.map(value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');

export function translate(text: string, locale: Locale): string {
  if (locale === 'zh-CN') return text;
  const trimmed = text.trim();
  if (Object.hasOwn(english, trimmed)) return text.replace(trimmed, () => english[trimmed]);
  const special = trimmed
    .replace(/^(\d+) 个已确认问题$/, '$1 confirmed questions')
    .replace(/^找到 (\d+) 个问题$/, '$1 questions found')
    .replace(/^尚未整理，请检查以下 (\d+) 处填写。信息没有发送。$/, 'Not prepared. Please check $1 fields. Nothing has been sent.')
    .replace(/^第 (\d+) 张，共 (\d+) 张。/, 'Slide $1 of $2. ')
    .replace(/^查看第 (\d+) 张：/, 'View slide $1: ')
    .replace(/^直达问题 (\d+)：/, 'Go to question $1: ');
  const result = special.replace(composite, value => english[value]);
  // Preserve new, untranslated facts in their original language rather than guessing a translation.
  return /\p{Script=Han}/u.test(result) ? text : text.replace(trimmed, () => result);
}
