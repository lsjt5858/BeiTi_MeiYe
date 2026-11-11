export function safeSlug(value: string): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || value.length > 100) {
    throw new Error(`Unsafe page slug: ${value}`);
  }
  return value;
}

export function safeHttpUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value) || /[\u0000-\u0020\u007f]/.test(value)) return undefined;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

export function textItems(value: unknown): string[] {
  const items = Array.isArray(value) ? value : [value];
  return items.filter((item): item is string => typeof item === 'string' && !!item.trim());
}

export function formatValue(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return textItems(value).join('；');
}
