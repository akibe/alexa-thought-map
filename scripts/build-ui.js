import { build } from 'vite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const output = new URL('web/dist/', root);
await mkdir(output, { recursive: true });
for (const name of ['map', 'simulator', 'sandbox']) {
  const built = await build({
    configFile: false, root: fileURLToPath(root), logLevel: 'warn',
    build: { write: false, minify: true, target: 'es2022', lib: { entry: fileURLToPath(new URL(`web/${name}.js`, root)), formats: ['es'], fileName: name },
      rolldownOptions: { output: { codeSplitting: false } } }
  });
  const chunks = (Array.isArray(built) ? built : [built]).flatMap(result => result.output);
  assert.equal(chunks.length, 1, 'Each UI must bundle to one inline script.');
  const chunk = chunks[0];
  assert.equal(chunk.type, 'chunk');
  assert.equal(chunk.imports.length, 0, 'No external imports are allowed.');
  // Rolldown can retain self-chunk metadata after replacing its imports with promises.
  assert(chunk.dynamicImports.every(name => name === chunk.fileName) && !/\bimport\s*\(/.test(chunk.code), 'No external dynamic imports are allowed.');
  const template = await readFile(new URL(`web/${name}.html`, root), 'utf8');
  const css = name === 'sandbox' ? '' : await readFile(new URL(`web/${name}.css`, root), 'utf8');
  assert(!/<\/style/i.test(css), 'Unexpected style terminator.');
  const html = template.replace('<!-- STYLE -->', `<style>${css}</style>`).replace('<!-- SCRIPT -->', () => `<script type="module">${chunk.code.replace(/<\/script/gi, '<\\/script')}</script>`);
  assert(!html.includes('<!-- SCRIPT -->'));
  await writeFile(new URL(`${name}.html`, output), html);
  console.log(`Built web/dist/${name}.html (${Buffer.byteLength(html)} bytes)`);
}
