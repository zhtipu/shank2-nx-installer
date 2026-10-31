// Reads entries of a zip file in place: Shank 2 keeps its shaders (shaders/*.fxc) inside data-360/data-360.zip.
// Only what that archive uses: no zip64, entries stored (0) or deflated (8), inflated with the browser's (and Node's)
// DecompressionStream. file: { size, read(offset, length) -> Uint8Array }.

function u16(b, o) {
  return b[o] | (b[o + 1] << 8);
}

function u32(b, o) {
  return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
}

async function inflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

// The central directory: [{ name, method, compressedSize, size, localOffset }].
export async function zipEntries(file) {
  const tailSize = Math.min(file.size, 22 + 0xffff);
  const tail = await file.read(file.size - tailSize, tailSize);
  let eocd = -1;
  for (let o = tail.length - 22; o >= 0; o--) {
    if (u32(tail, o) === 0x06054b50) {
      eocd = o;
      break;
    }
  }
  if (eocd < 0) {
    throw new Error('not a zip file');
  }
  const count = u16(tail, eocd + 10);
  const dirSize = u32(tail, eocd + 12);
  const dirOffset = u32(tail, eocd + 16);
  const dir = await file.read(dirOffset, dirSize);
  const entries = [];
  let o = 0;
  for (let i = 0; i < count; i++) {
    if (u32(dir, o) !== 0x02014b50) {
      throw new Error('damaged zip directory');
    }
    const nameLength = u16(dir, o + 28);
    entries.push({
      method: u16(dir, o + 10),
      compressedSize: u32(dir, o + 20),
      size: u32(dir, o + 24),
      localOffset: u32(dir, o + 42),
      name: new TextDecoder().decode(dir.subarray(o + 46, o + 46 + nameLength)),
    });
    o += 46 + nameLength + u16(dir, o + 30) + u16(dir, o + 32);
  }
  return entries;
}

// One entry's bytes.
export async function zipRead(file, entry) {
  const header = await file.read(entry.localOffset, 30);
  if (u32(header, 0) !== 0x04034b50) {
    throw new Error(`damaged zip entry ${entry.name}`);
  }
  const start = entry.localOffset + 30 + u16(header, 26) + u16(header, 28);
  const raw = await file.read(start, entry.compressedSize);
  if (entry.method === 0) {
    return raw;
  }
  if (entry.method !== 8) {
    throw new Error(`zip entry ${entry.name}: compression ${entry.method} is not supported`);
  }
  const bytes = await inflateRaw(raw);
  if (bytes.length !== entry.size) {
    throw new Error(`damaged zip entry ${entry.name}`);
  }
  return bytes;
}
