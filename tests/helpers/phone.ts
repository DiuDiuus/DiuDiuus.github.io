/** Any Korean mobile number, domestic or with the +82 country code, with dashes, dots, spaces or nothing between groups. */
export const KOREAN_MOBILE = /(?:\+82[\s.-]*\(?0?\)?[\s.-]*1\d|\b01\d)[\s.)-]*\d{3,4}[\s.-]*\d{4}\b/;

/** Drop CSS @font-face unicode-range lists, whose hex code points look like digits. */
export const stripUnicodeRanges = (css: string) => css.replace(/unicode-range:[^;}]*/g, '');

/** Text shown by a PDF content stream: the strings inside each TJ/Tj, without kerning numbers. */
export function pdfShownText(stream: string): string {
  const arrays = stream.match(/\[(?:[^\]\\]|\\.)*\]\s*TJ|\((?:[^)\\]|\\.)*\)\s*Tj/g) ?? [];
  return arrays
    .map((op) => (op.match(/\((?:[^)\\]|\\.)*\)/g) ?? []).map((s) => s.slice(1, -1)).join(''))
    .join(' ');
}
