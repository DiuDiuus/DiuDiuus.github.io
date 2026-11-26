import { expect, it } from 'vitest';
import { formatPeriod } from '../../src/lib/dates';

it('formats periods in English', () => {
  expect(formatPeriod('2022-05', '2025-01', 'en')).toBe('May 2022 – Jan 2025');
  expect(formatPeriod('2021-03', undefined, 'en')).toBe('Mar 2021 – Present');
});

it('formats periods in Korean', () => {
  expect(formatPeriod('2022-05', '2025-01', 'ko')).toBe('2022.05 – 2025.01');
  expect(formatPeriod('2021-03', undefined, 'ko')).toBe('2021.03 – 현재');
});
