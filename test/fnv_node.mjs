// Checks lib/nxpack.js's FNV against the SDK's (a 64-bit loop with BigInt, basis 1469598103934665603).
// Usage: node test/fnv_node.mjs
import { Fnv64 } from '../lib/nxpack.js';

const BASIS = 1469598103934665603n;
const PRIME = 1099511628211n;
const reference = (data) => {
  let h = BASIS;
  for (const b of data) {
    h = ((h ^ BigInt(b)) * PRIME) & 0xffffffffffffffffn;
  }
  return h;
};
let bad = 0;
for (const size of [0, 1, 7, 255, 4096, 100003]) {
  const data = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    data[i] = (i * 2654435761 + size) >>> 24;
  }
  const split = Math.floor(size / 3);
  const ours = new Fnv64().update(data.subarray(0, split)).update(data.subarray(split)).value();
  if (ours !== reference(data)) {
    console.log(`size ${size}: ${ours.toString(16)} != ${reference(data).toString(16)}`);
    bad++;
  }
}
console.log(bad ? `${bad} sizes wrong` : 'FNV matches the SDK on every size');
process.exit(bad ? 1 : 0);
