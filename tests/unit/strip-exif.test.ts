import { expect, it } from 'vitest';
import { stripExif } from '../../scripts/strip-exif.mjs';

/** Minimal JPEG: SOI, APP1 Exif with one IFD entry (Orientation), SOS, data, EOI. */
function jpegWithOrientation(orientation: number): Buffer {
  const tiff = Buffer.from([
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, // big-endian TIFF header, IFD at 8
    0x00, 0x01, // 1 entry
    0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, orientation, 0x00, 0x00, // Orientation SHORT
    0x00, 0x00, 0x00, 0x00, // next IFD
  ]);
  const payload = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), tiff]);
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1]), Buffer.from([0, payload.length + 2]), payload]);
  const sos = Buffer.from([0xff, 0xda, 0x00, 0x02, 0x11, 0x22, 0xff, 0xd9]);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app1, sos]);
}

it('removes EXIF from an upright photo', () => {
  const out = stripExif(jpegWithOrientation(1));
  expect(out.includes(Buffer.from('Exif'))).toBe(false);
  expect(out.subarray(-2)).toEqual(Buffer.from([0xff, 0xd9]));
});

it('refuses a photo that relies on EXIF rotation', () => {
  expect(() => stripExif(jpegWithOrientation(6))).toThrow(/rotate/i);
});
