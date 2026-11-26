import type { Lang } from '../i18n/utils';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMonth(ym: string, lang: Lang): string {
  const [year, month] = ym.split('-');
  return lang === 'ko' ? `${year}.${month}` : `${MONTHS[Number(month) - 1]} ${year}`;
}

/** `start`/`end` are "YYYY-MM"; a missing `end` means the role is ongoing. */
export function formatPeriod(start: string, end: string | undefined, lang: Lang): string {
  const to = end ? formatMonth(end, lang) : lang === 'ko' ? '현재' : 'Present';
  return `${formatMonth(start, lang)} – ${to}`;
}
