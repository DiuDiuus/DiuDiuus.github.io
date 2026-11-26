import { expect, it } from 'vitest';
import { byOrder, byStartDesc, featured } from '../../src/lib/sort';
import { pick } from '../../src/i18n/utils';

it('sorts by start month, newest first', () => {
  const xs = ['2021-01', '2022-05', '2016-03', '2021-03'].map((start) => ({ data: { start } }));
  expect(byStartDesc(xs).map((x) => x.data.start)).toEqual(['2022-05', '2021-03', '2021-01', '2016-03']);
});

it('sorts by order ascending', () => {
  const xs = [3, 1, 2].map((order) => ({ data: { order } }));
  expect(byOrder(xs).map((x) => x.data.order)).toEqual([1, 2, 3]);
});

it('keeps only featured items, in order', () => {
  const xs = [
    { data: { order: 3, featured: true } },
    { data: { order: 1 } },
    { data: { order: 2, featured: true } },
  ];
  expect(featured(xs).map((x) => x.data.order)).toEqual([2, 3]);
});

it('picks a localized string with English fallback', () => {
  expect(pick({ en: 'Seoul', ko: '서울' }, 'ko')).toBe('서울');
  expect(pick({ en: 'Seoul' }, 'ko')).toBe('Seoul');
  expect(pick({ en: 'Seoul', ko: '' }, 'ko')).toBe('Seoul');
  expect(pick({ en: 'Seoul', ko: '서울' }, 'en')).toBe('Seoul');
});
