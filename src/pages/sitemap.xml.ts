import type { APIRoute } from 'astro';
import { loadContent } from '../lib/content.ts';
import { renderSitemap } from '../lib/seo.ts';

export const prerender = true;
// build:done 根据真实 dist HTML 生成最终清单；提前返回安全的空清单。
export const GET: APIRoute = () => new Response(renderSitemap(loadContent(), []), {
  headers: { 'Content-Type': 'application/xml; charset=utf-8' },
});
