import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContent } from '../src/lib/content.ts';

export function checkContent(root: string | URL = new URL('..', import.meta.url)) {
  const model = loadContent(root);
  return {
    facts: model.facts.length,
    services: model.getServices().length,
    locations: model.getLocations().length,
    faqs: model.getFaqs().length,
    reviews: model.getReviews().length,
    articles: model.getArticles().length,
    warnings: model.warnings,
  };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length && (args.length !== 2 || args[0] !== '--root')) throw new Error('用法：node scripts/content-check.ts [--root 根目录]');
    const result = checkContent(args[1]);
    for (const warning of result.warnings) console.log(`[content-check] ${warning}`);
    console.log(`[content-check] PASS ${result.facts} facts；公开 ${result.services} services / ${result.locations} locations / ${result.faqs} FAQs / ${result.reviews} reviews / ${result.articles} articles`);
  } catch (error) {
    console.error(`[content-check] FAIL ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
