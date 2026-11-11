import type { APIRoute } from 'astro';
import { loadContent } from '../lib/content.ts';
import { renderRobots } from '../lib/seo.ts';

export const prerender = true;
export const GET: APIRoute = () => new Response(renderRobots(loadContent()), {
  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
});
