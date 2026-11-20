// Generează iconițele PNG pentru PWA (fără dependențe): pătrat din linii diagonale.
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

/** pad = marginea (fracțiune din latură) – mai mare pentru iconița „maskable”. */
function render(size, pad) {
  const BG = [0x0b, 0x0d, 0x10];
  const S = 4; // supersampling
  const a = pad, b = 1 - pad, w = (b - a) * 0.075; // grosimea liniei
  const inside = (x, y) => {
    if (x < a || x > b || y < a || y > b) return false;
    if (x < a + w || x > b - w || y < a + w || y > b - w) return true; // contur
    const u = (x - a) / (b - a), v = (y - a) / (b - a);
    for (const k of [0.6, 0.9, 1.2, 1.5]) {
      if (Math.abs(u + v - k) / Math.SQRT2 < (w / (b - a)) / 2) return true; // diagonale
    }
    return false;
  };
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let hit = 0;
      for (let sy = 0; sy < S; sy++)
        for (let sx = 0; sx < S; sx++) if (inside((x + (sx + 0.5) / S) / size, (y + (sy + 0.5) / S) / size)) hit++;
      const t = hit / (S * S);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      for (let i = 0; i < 3; i++) raw[o + i] = Math.round(BG[i] + (255 - BG[i]) * t);
      raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

writeFileSync('public/icon-192.png', render(192, 0.22));
writeFileSync('public/icon-512.png', render(512, 0.22));
writeFileSync('public/icon-maskable-512.png', render(512, 0.3));
writeFileSync('public/apple-touch-icon.png', render(180, 0.22));
console.log('Iconițe generate în public/');
