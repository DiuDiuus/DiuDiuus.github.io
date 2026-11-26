// Usage: node scripts/strip-exif.mjs <in.jpg> <out.jpg>
// Removes APP1..APP15 metadata (EXIF, XMP, …) from a JPEG, keeping APP0 (JFIF).
// Refuses photos whose EXIF Orientation is not 1: without that tag they would show sideways.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function exifOrientation(app1) {
  if (app1.toString('latin1', 0, 6) !== 'Exif\0\0') return 1;
  const tiff = app1.subarray(6);
  const le = tiff.toString('latin1', 0, 2) === 'II';
  const u16 = (o) => (le ? tiff.readUInt16LE(o) : tiff.readUInt16BE(o));
  const u32 = (o) => (le ? tiff.readUInt32LE(o) : tiff.readUInt32BE(o));
  const ifd = u32(4);
  const entries = u16(ifd);
  for (let k = 0; k < entries; k++) {
    const e = ifd + 2 + k * 12;
    if (u16(e) === 0x0112) return u16(e + 8);
  }
  return 1;
}

export function stripExif(src) {
  if (src[0] !== 0xff || src[1] !== 0xd8) throw new Error('not a JPEG');
  const parts = [src.subarray(0, 2)];
  let i = 2;
  while (i < src.length) {
    if (src[i] !== 0xff) throw new Error(`bad marker at ${i}`);
    const marker = src[i + 1];
    if (marker === 0xda) {
      parts.push(src.subarray(i)); // start of scan: copy the rest untouched
      break;
    }
    const len = src.readUInt16BE(i + 2);
    if (marker === 0xe1) {
      const orientation = exifOrientation(src.subarray(i + 4, i + 2 + len));
      if (orientation !== 1) {
        throw new Error(
          `EXIF orientation is ${orientation}: rotate the photo upright first (e.g. open it in Preview, rotate, and export), then run this again.`,
        );
      }
    }
    if (!(marker >= 0xe1 && marker <= 0xef)) parts.push(src.subarray(i, i + 2 + len));
    i += 2 + len;
  }
  return Buffer.concat(parts);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [, , input, output] = process.argv;
  if (!input || !output) {
    console.error('Usage: node scripts/strip-exif.mjs <in.jpg> <out.jpg>');
    process.exit(1);
  }
  writeFileSync(output, stripExif(readFileSync(input)));
}
