import { expect, it } from 'vitest';
import { decodeEmail, encodeEmail } from '../../src/lib/email';

it('round-trips an address', () => {
  expect(decodeEmail(encodeEmail('a_b@c.kr'))).toBe('a_b@c.kr');
});

it('hides the address in the encoded form', () => {
  const code = encodeEmail('a_b@c.kr');
  expect(code).not.toContain('@');
  expect(code).not.toContain('a_b');
});
