// Rasteriza os SVG da marca segundo o manifesto render.json.
// Usa resvg (Rust) porque não depende de Cairo nem de Inkscape instalados.
//
//   npm install @resvg/resvg-js
//   node render.mjs

import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const fonte = join(aqui, '.fonte', 'Inter.ttf');
const tarefas = JSON.parse(readFileSync(join(aqui, 'render.json'), 'utf8'));

for (const [origem, destino, largura] of tarefas) {
  const svg = readFileSync(join(aqui, origem), 'utf8');
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: largura },
    font: { fontFiles: [fonte], loadSystemFonts: true },
    background: 'rgba(0,0,0,0)',
  });
  const png = resvg.render().asPng();
  const saida = resolve(aqui, destino);
  mkdirSync(dirname(saida), { recursive: true });
  writeFileSync(saida, png);
  console.log(`  ${destino}  ${largura}px  ${(png.length / 1024).toFixed(1)} kB`);
}
