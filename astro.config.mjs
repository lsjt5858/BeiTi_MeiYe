import { defineConfig } from 'astro/config';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { loadContent } from './src/lib/content.ts';
import { readDistPagePaths, renderSitemap, renderRobots, renderLlms } from './src/lib/seo.ts';

export default defineConfig({
  output: 'static',
  // Isolated test builds share installed dependencies, but must never share mutable caches.
  cacheDir: './.astro/cache',
  devToolbar: { enabled: false },
  trailingSlash: 'always',
  build: { format: 'directory' },
  vite: {
    cacheDir: fileURLToPath(new URL('./.astro/vite/', import.meta.url)),
    define: {
      __BEITI_CONTENT_ROOT__: JSON.stringify(fileURLToPath(new URL('.', import.meta.url))),
    },
  },
  integrations: [{
    name: 'beiti-confirmed-seo',
    hooks: {
      'astro:build:done': ({ dir }) => {
        const model = loadContent();
        const paths = readDistPagePaths(dir);
        const output = fileURLToPath(dir);
        writeFileSync(join(output, 'sitemap.xml'), renderSitemap(model, paths));
        writeFileSync(join(output, 'robots.txt'), renderRobots(model, paths));
        writeFileSync(join(output, 'llms.txt'), renderLlms(model, paths));
      },
    },
  }],
});
