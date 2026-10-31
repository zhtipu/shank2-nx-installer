// Writes the build's entry of release/manifest.json for a release of shank2-nx, with the page's own code: the NRO's
// SHA-256 and size, the fingerprints of the game, and the deko3d shaders made from your package (the shaders' names
// come from the deko3d_glsl.bin the native chain made for the tested NRO: port/out/renut_switch_release/sd/, its
// table). Check first that the NRO was tested with those shaders.
// Usage: node test/release_node.mjs <game package or folder> <shank2.nro> <tested deko3d_glsl.bin> --version <x.y.z>
//                                   [--write]
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { chosenOnDisk, loadModules, root } from './node_files.mjs';
import { findGame, lzxStep } from '../lib/installer.js';
import { readXexImage } from '../lib/xex.js';
import { buildDeko3dPackage, shank2Containers, SHANK2_DEKO3D_PASSES } from '../lib/deko3d.js';
import { Fnv64, planPack } from '../lib/nxpack.js';

const ARCHIVE = 'data-360/data-360.zip';
const args = process.argv.slice(2);
const take = (flag) => {
  const at = args.indexOf(flag);
  return at >= 0 ? args.splice(at, 2)[1] : null;
};
const write = args.includes('--write');
const version = take('--version');
const [input, nroPath, testedPath] = args.filter((a) => a !== '--write');
if (!input || !nroPath || !testedPath || !version) {
  console.error('usage: node test/release_node.mjs <game> <shank2.nro> <tested deko3d_glsl.bin> --version <x.y.z> [--write]');
  process.exit(1);
}
const sha = (b) => createHash('sha256').update(b).digest('hex');

// The names in a deko3d_glsl.bin's table (tools/deko3d_shader_package.py's layout: 32-byte header, then 56-byte
// entries from the table offset, u64 hash and u32 stage at +20).
function packageNames(bytes) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = v.getUint32(8, true);
  const table = v.getUint32(16, true);
  const names = [];
  for (let i = 0; i < count; i++) {
    const e = table + i * 56;
    const hash = v.getBigUint64(e, true).toString(16).toUpperCase().padStart(16, '0');
    names.push(`${v.getUint32(e + 20, true) === 4 ? 'ps' : 'vs'}_${hash}`);
  }
  return names.sort();
}

const { game } = await findGame(chosenOnDisk([input]));
if (!game) {
  throw new Error(`the game was not found in ${input}`);
}
const modules = await loadModules();
const xexFile = game.files.find((f) => f.path.toLowerCase() === 'default.xex');
const xex = await xexFile.read(0, xexFile.size);
const { image } = await readXexImage(xex, lzxStep(modules.lzx));

const archive = game.files.find((f) => f.path.toLowerCase() === ARCHIVE);
const unique = new Map();
for (const c of await shank2Containers(archive)) {
  unique.set(sha(c.bytes), c);
}
const names = packageNames(new Uint8Array(fs.readFileSync(testedPath)));
console.log(`${unique.size} containers; ${names.length} shaders in the tested package`);
const { package: pkg } = await buildDeko3dPackage([...unique.values()], names, SHANK2_DEKO3D_PASSES, modules,
  fs.readFileSync(path.join(root, 'renut_shader_common.h')), (s) => console.log('  ' + s));

const plan = planPack(game.files);
const fnv = new Fnv64();
for (const item of plan.items) {
  for (let o = 0; o < item.file.size; o += 16 << 20) {
    fnv.update(await item.file.read(o, Math.min(16 << 20, item.file.size - o)));
  }
}
const nro = fs.readFileSync(nroPath);
const entry = {
  edition: 'Xbox Live Arcade',
  version,
  xex_sha256: sha(xex),
  image_sha256: sha(image),
  nro: 'shank2.nro',
  nro_sha256: sha(nro),
  nro_size: nro.length,
  game_files: plan.items.length,
  game_bytes: game.files.reduce((sum, f) => sum + f.size, 0),
  game_data_fnv: fnv.value().toString(16).padStart(16, '0'),
  deko3d: {
    archive: ARCHIVE,
    passes: SHANK2_DEKO3D_PASSES,
    shaders: names,
    containers_sha256: [...unique.keys()].sort(),
    package_sha256: sha(pkg),
  },
};
console.log(JSON.stringify({ ...entry, deko3d: { ...entry.deko3d, shaders: `${names.length} names`,
  containers_sha256: `${unique.size} hashes` } }, null, 2));
if (write) {
  fs.writeFileSync(path.join(root, 'release/manifest.json'), JSON.stringify({ version: 1, builds: [entry] }, null, 2) + '\n');
  fs.writeFileSync(path.join(root, 'release/deko3d_glsl.test.bin'), pkg);
  console.log('written release/manifest.json (and release/deko3d_glsl.test.bin, the package this makes: for tests)');
}
