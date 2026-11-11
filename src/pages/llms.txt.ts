import type { APIRoute } from 'astro';
import { loadContent } from '../lib/content.ts';
import { contentPaths, renderLlms } from '../lib/seo.ts';

export const prerender = true;
export const GET: APIRoute = () => {
  const model = loadContent();
  return new Response(renderLlms(model, contentPaths(model)), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
