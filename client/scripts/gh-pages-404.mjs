import { copyFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const index = join(dist, 'index.html');
const fallback = join(dist, '404.html');

if (!existsSync(index)) {
  console.error('gh-pages-404: dist/index.html missing — run vite build first');
  process.exit(1);
}
copyFileSync(index, fallback);
console.log('gh-pages-404: copied index.html → 404.html (SPA refresh on GitHub Pages)');
