// Shank 2: runs the page's deko3d chain (lib/deko3d.js) over shader containers dumped on disk (shank2-nx's
// port/tools/shank2_dump_shaders.py output) and compares each shader's GLSL with the native chain's (glsl_opt).
// Usage: node test/shank2_compare_node.mjs <dump folder> <native glsl_opt folder> [--passes a,b,c] [--diff <folder>]
import fs from 'node:fs';
import path from 'node:path';
import { loadModules, root } from './node_files.mjs';
import { buildDeko3dPackage } from '../lib/deko3d.js';

const args = process.argv.slice(2);
const take = (flag) => {
  const at = args.indexOf(flag);
  return at >= 0 ? args.splice(at, 2)[1] : null;
};
const passes = take('--passes');
const diffDir = take('--diff');
const [dump, reference] = args;
const containers = fs.readdirSync(dump).filter((f) => /^(vs|ps)_[0-9a-f]{16}\.bin$/i.test(f)).sort()
  .map((f) => ({ stage: f.slice(0, 2), bytes: new Uint8Array(fs.readFileSync(path.join(dump, f))) }));
const dumped = new Set(fs.readdirSync(dump).map((f) => f.slice(0, -4).toUpperCase().replace(/^(VS|PS)/, (s) => s.toLowerCase())));
const names = fs.readdirSync(reference).filter((f) => /^(vs|ps)_[0-9A-F]{16}\.glsl$/.test(f)).map((f) => f.slice(0, -5))
  .filter((n) => dumped.has(n)).sort();
console.log(`${containers.length} containers, ${names.length} shaders to compare`);
const modules = await loadModules();
const common = fs.readFileSync(path.join(root, 'renut_shader_common.h'));
const { shaders } = await buildDeko3dPackage(containers, names, passes, modules, common, (s) => console.log('  ' + s));
const different = [];
for (const s of shaders) {
  if (fs.readFileSync(path.join(reference, s.name + '.glsl'), 'utf8') !== s.glsl) {
    different.push(s.name);
    if (diffDir) {
      fs.mkdirSync(diffDir, { recursive: true });
      fs.writeFileSync(path.join(diffDir, s.name + '.glsl'), s.glsl);
    }
  }
}
console.log(`${shaders.length - different.length} of ${shaders.length} identical; different: ${different.join(', ')}`);
