// Builds the shank2-nx.zip package from the player's own copy of the game.
//
// The game comes as its Xbox Live Arcade content package (an STFS volume, read in place) or as a folder it was
// extracted into. The zip holds the Switch build (shank2.nro) and its licenses, the game's shaders made from its own
// files (deko3d_glsl.bin, the deko3d renderer's GLSL) and the game files as the asset pack the console mounts
// (game_root.nxpack + .nxidx). The settings file, shank2.toml, is the player's: the game runs without one, so an
// update never replaces it.

import { readXexImage } from './xex.js';
import { CONTENT_GAME, StfsPackage, readStfsHeader } from './stfs.js';
import { buildDeko3dPackage, shank2Containers } from './deko3d.js';
import { Fnv64, packChunks, packIndex, planPack } from './nxpack.js';
import { ZipWriter, zipSize } from './zip.js';
import { t } from './i18n.js';

const CHUNK = 16 * 1024 * 1024;
const ROOT = 'shank2-nx';
const NRO = 'shank2.nro';
const TITLE_ID = 0x5841120c;
const ARCHIVE = 'data-360/data-360.zip';
// files whose header is read to find the package in a chosen folder (packages have no extension)
const MAX_CANDIDATES = 256;

async function sha256(bytes) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return [...digest].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function* chunksOf(file) {
  for (let offset = 0; offset < file.size; offset += CHUNK) {
    yield await file.read(offset, Math.min(CHUNK, file.size - offset));
  }
}

function baseName(path) {
  return path.slice(path.lastIndexOf('/') + 1);
}

// The LZX step of readXexImage, done by libmspack compiled to WebAssembly.
export function lzxStep(lzx) {
  return async (compressed, bits, size) => {
    lzx.FS.writeFile('/image.lzx', compressed);
    const rc = lzx.callMain(['/image.lzx', '/image.bin', String(bits), String(size)]);
    if (rc) {
      throw new Error(`LZX decompression failed (${rc})`);
    }
    const out = lzx.FS.readFile('/image.bin');
    lzx.FS.unlink('/image.lzx');
    lzx.FS.unlink('/image.bin');
    return out;
  };
}

// Where the program is downloaded from. Its SHA-256 is part of the address, so every version is a different address
// and a copy kept by the browser is never mistaken for a newer one.
export function programPath(build) {
  return `./release/${build.nro}?sha256=${build.nro_sha256}`;
}

// Sorts out what the player chose: files ([{ path, size, read }]) from the "Package file" button (the chosen files) or
// from the "Folder" button (every file under the folder, path relative to it).
// Returns { game, others }: game = { kind: 'package' | 'folder', name, size, files } or null; others = the names of
// content packages of other games.
export async function findGame(chosen) {
  // An extracted game: the shallowest default.xex names its folder, and every file in that folder is a game file.
  const executables = chosen
    .filter((f) => baseName(f.path).toLowerCase() === 'default.xex')
    .sort((a, b) => a.path.split('/').length - b.path.split('/').length);
  let game = null;
  let rest = chosen;
  if (executables.length) {
    const prefix = executables[0].path.slice(0, -'default.xex'.length);
    const files = chosen
      .filter((f) => f.path.startsWith(prefix))
      .map((f) => ({ ...f, path: f.path.slice(prefix.length) }));
    game = {
      kind: 'folder',
      name: prefix ? baseName(prefix.slice(0, -1)) : '',
      size: files.reduce((sum, f) => sum + f.size, 0),
      files,
    };
    rest = chosen.filter((f) => !f.path.startsWith(prefix));
  }
  const candidates = rest
    .filter((f) => f.size >= 0xa000 && !baseName(f.path).includes('.'))
    .sort((a, b) => Number(!a.path.toUpperCase().includes('5841120C')) -
      Number(!b.path.toUpperCase().includes('5841120C')))
    .slice(0, MAX_CANDIDATES);
  const others = [];
  for (const file of candidates) {
    const header = readStfsHeader(await file.read(0, 0x600));
    if (!header) {
      continue;
    }
    if (header.titleId !== TITLE_ID) {
      others.push(header.displayName || baseName(file.path));
    } else if (header.contentType === CONTENT_GAME && !game) {
      const pkg = await StfsPackage.open(file);
      game = { kind: 'package', name: baseName(file.path), size: file.size, files: pkg.files() };
    }
  }
  return { game, others };
}

// Identifies the build of this game: by the SHA-256 of default.xex, or, for an executable another tool rebuilt
// (decrypted or decompressed), by the SHA-256 of its decompressed image.
// Returns { xex, xexHash, build (null when there is none) }.
export async function identifyGame(files, manifest, decompressLzx = null) {
  const xexFile = files.find((f) => f.path.toLowerCase() === 'default.xex');
  if (!xexFile) {
    const error = new Error(t('noGame'));
    error.code = 'noGame';
    throw error;
  }
  const xex = await xexFile.read(0, xexFile.size);
  const xexHash = await sha256(xex);
  let build = manifest.builds.find((b) => b.xex_sha256 === xexHash) || null;
  if (!build && decompressLzx) {
    try {
      const { image } = await readXexImage(xex, decompressLzx);
      const imageHash = await sha256(image);
      build = manifest.builds.find((b) => b.image_sha256 === imageHash) || null;
    } catch {
      // not a readable executable: unsupported
    }
  }
  return { xex, xexHash, build };
}

// The deko3d renderer's shaders: deko3d_glsl.bin, which the NRO reads beside itself, made from the effect files in
// data-360/data-360.zip (lib/deko3d.js) and checked against the build's manifest entry ("deko3d": { archive, passes,
// shaders, containers_sha256, package_sha256 }).
// modules: { renutHlsl, dxc, spirvCross }; renutCommon: Renut's shader_common.h.
export async function makeDeko3dPackage(files, build, modules, renutCommon, log = () => {}) {
  const archivePath = (build.deko3d.archive || ARCHIVE).toLowerCase();
  const archive = files.find((f) => f.path.toLowerCase() === archivePath);
  if (!archive) {
    throw new Error(t('shaderMissing', { name: build.deko3d.archive || ARCHIVE }));
  }
  const wanted = new Set(build.deko3d.containers_sha256);
  const containers = [];
  const found = new Set();
  for (const c of await shank2Containers(archive)) {
    const hash = await sha256(c.bytes);
    if (wanted.has(hash) && !found.has(hash)) {
      found.add(hash);
      containers.push(c);
    }
  }
  if (found.size !== wanted.size) {
    throw new Error(t('deko3dContainers', { found: found.size, wanted: wanted.size }));
  }
  log(t('deko3dShaders', { count: build.deko3d.shaders.length }));
  const { package: pkg } = await buildDeko3dPackage(containers, build.deko3d.shaders, build.deko3d.passes, modules,
    renutCommon);
  const hash = await sha256(pkg);
  if (hash !== build.deko3d.package_sha256) {
    throw new Error(t('deko3dMismatch', { hash }));
  }
  log(t('deko3dReady'));
  return pkg;
}

// chosen: findGame(); release: { manifest, nro: Uint8Array, licenses: Uint8Array (release/LICENSES.txt),
// renutShaderCommon: Uint8Array }
// modules: { lzx, renutHlsl, dxc, spirvCross } instantiated Emscripten modules (one object each)
// sink: { write(Uint8Array), close() } receiving the zip file
// onSize(bytes) is called with the exact size of the zip before the first byte is written.
// update: only the program, its licenses and the shaders, for a folder already on the SD card.
export async function createPackage(chosen, release, modules, sink, log = () => {}, progress = () => {},
  onSize = () => {}, { update = false } = {}) {
  const { game } = chosen;
  if (!game) {
    throw new Error(t('noGame'));
  }
  const { xexHash, build } = await identifyGame(game.files, release.manifest, lzxStep(modules.lzx));
  if (!build) {
    throw new Error(t('notSupportedYet', { hash: xexHash }));
  }
  log(t('logBuild', { version: build.version }));
  if (update) {
    log(t('logUpdate'));
  }

  // a folder the game was only partly extracted into would make a package that does not start
  if (!update && game.files.length < build.game_files) {
    throw new Error(t('incompleteError', { count: game.files.length, expected: build.game_files }));
  }

  // The shaders first: they are the step most likely to stop the package, and nothing is written before them.
  const deko3d = await makeDeko3dPackage(game.files, build, modules, release.renutShaderCommon, log);

  const gameBytes = update ? 0 : game.files.reduce((sum, f) => sum + f.size, 0);
  let plan = null;
  let packSize = 0;
  if (!update) {
    plan = planPack(game.files);
    packSize = plan.packSize;
  }
  const total = gameBytes + packSize || 1;
  let done = 0;
  const onChunk = (chunk) => {
    done += chunk.length;
    progress(done / total);
  };

  // The pack header and its index carry the checksum of all the game data: a first reading of the files.
  let dataChecksum = 0n;
  let gameIndex = null;
  if (!update) {
    log(t('checksumming', { count: plan.items.length }));
    const fnv = new Fnv64();
    for (const item of plan.items) {
      for await (const chunk of chunksOf(item.file)) {
        fnv.update(chunk);
        onChunk(chunk);
      }
    }
    dataChecksum = fnv.value();
    const identical = plan.items.length === build.game_files && gameBytes === build.game_bytes &&
      dataChecksum.toString(16).padStart(16, '0') === build.game_data_fnv;
    log(t(identical ? 'gameIdentical' : 'gameDifferent'));
    gameIndex = packIndex(plan, dataChecksum);
  }

  const entries = [
    { path: `${ROOT}/${NRO}`, size: release.nro.length },
    { path: `${ROOT}/LICENSES.txt`, size: release.licenses.length },
    { path: `${ROOT}/deko3d_glsl.bin`, size: deko3d.length },
    ...(update ? [] : [
      { path: `${ROOT}/game_root.nxidx`, size: gameIndex.length },
      { path: `${ROOT}/game_root.nxpack`, size: packSize },
    ]),
  ];
  onSize(zipSize(entries));
  log(t('packing'));
  const zip = new ZipWriter(sink);
  await zip.addBytes(`${ROOT}/${NRO}`, release.nro);
  await zip.addBytes(`${ROOT}/LICENSES.txt`, release.licenses);
  await zip.addBytes(`${ROOT}/deko3d_glsl.bin`, deko3d);
  if (!update) {
    await zip.addBytes(`${ROOT}/game_root.nxidx`, gameIndex);
    await zip.addFile(`${ROOT}/game_root.nxpack`, packSize, packChunks(plan, dataChecksum, (item) => chunksOf(item.file)),
      onChunk);
  }
  await zip.finish();
  progress(1);
  log(t('done'));
  return { version: build.version, update };
}
