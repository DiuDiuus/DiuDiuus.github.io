// Usage: node scripts/strip-exif.mjs <in.jpg> <out.jpg>
// Removes APP1 (EXIF/XMP) and other APPn metadata segments except APP0 (JFIF) from a JPEG.
import { readFileSync, writeFileSync } from 'node:fs';

const [, , input, output] = process.argv;
const src = readFileSync(input);
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
  const isMetadata = marker >= 0xe1 && marker <= 0xef; // APP1..APP15
  if (!isMetadata) parts.push(src.subarray(i, i + 2 + len));
  i += 2 + len;
}
writeFileSync(output, Buffer.concat(parts));
