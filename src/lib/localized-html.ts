import { parseFragment, serialize, type DefaultTreeAdapterMap } from 'parse5';
import { localizedPath, translate, type Locale } from './i18n.ts';

export function localizeHtml(html: string, locale: Locale): string {
  if (locale === 'zh-CN') return html;
  const fragment = parseFragment(html, { scriptingEnabled: false });
  function visit(node: DefaultTreeAdapterMap['node']) {
    if (node.nodeName === '#text' && 'value' in node) node.value = translate(node.value, locale);
    if ('tagName' in node) {
      if (['script', 'style'].includes(node.tagName)) return;
      for (const attr of node.attrs) {
        if (['href', 'action'].includes(attr.name)) attr.value = localizedPath(attr.value, locale);
        else if (['alt', 'title', 'aria-label', 'aria-roledescription', 'placeholder', 'data-label', 'data-search'].includes(attr.name)) attr.value = translate(attr.value, locale);
      }
      if (['textarea', 'code', 'pre'].includes(node.tagName)) return;
    }
    if ('childNodes' in node) for (const child of node.childNodes) visit(child);
  }
  visit(fragment);
  return serialize(fragment);
}

export function localizedStructuredData(value: unknown, locale: Locale): unknown {
  if (Array.isArray(value)) return value.map(item => localizedStructuredData(item, locale));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [
    key,
    // Names/identifiers of confirmed entities remain the same facts across languages.
    typeof child === 'string' && ['headline', 'description', 'text'].includes(key)
      ? translate(child, locale)
      : key === 'name' && (value as Record<string, unknown>)['@type'] === 'Question' && typeof child === 'string'
        ? translate(child, locale)
        : localizedStructuredData(child, locale),
  ]));
}
