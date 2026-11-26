import { expect, it } from 'vitest';
import { KOREAN_MOBILE, pdfShownText, stripUnicodeRanges } from '../helpers/phone';

it('recognises Korean mobile numbers in common formats', () => {
  for (const s of ['010-1234-5678', '010 1234 5678', '01012345678', '+82-10-1234-5678', '+82 10 1234 5678', '+82 (0)10-1234-5678']) {
    expect(s).toMatch(KOREAN_MOBILE);
  }
});

it('ignores dates, DOIs and years', () => {
  for (const s of ['03/2021 – Present', '10.3390/s24248033', 'Sensors, 24(24), 8033', '2016-03', 'May 2022 – Jan 2025']) {
    expect(s).not.toMatch(KOREAN_MOBILE);
  }
});

it('strips font unicode ranges', () => {
  expect(stripUnicodeRanges('@font-face{src:x;unicode-range:U+010-1234,U+5678}')).toBe('@font-face{src:x;}');
});

it('reads the shown text of a PDF content stream without kerning', () => {
  expect(pdfShownText('[(+82-10-1234-5678)]TJ/F49 10 Tf [-333(\\005)]TJ [(zio)-28(o1004)]TJ')).toBe('+82-10-1234-5678 \\005 zioo1004');
});
