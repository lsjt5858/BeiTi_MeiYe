import type { APIRoute } from 'astro';
import { loadContent } from '../lib/content.ts';
import { contentPaths, renderSitemap } from '../lib/seo.ts';

export const prerender = true;
// 开发服务器使用确认模型提供清单；build:done 再按真实 dist HTML 校正最终产物。
export const GET: APIRoute = () => {
  const model = loadContent();
  const paths = contentPaths(model);
  return new Response(renderSitemap(model, paths), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
