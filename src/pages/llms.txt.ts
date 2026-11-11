import type { APIRoute } from 'astro';
import { loadContent } from '../lib/content.ts';
import { contentPaths, renderLlms } from '../lib/seo.ts';

export const prerender = true;
export const GET: APIRoute = () => {
  const model = loadContent();
  const paths = contentPaths(model);
  return new Response(renderLlms(model, paths), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
