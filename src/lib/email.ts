const reverse = (s: string) => s.split('').reverse().join('');

/** Base64 of the reversed address: keeps the plain address out of the HTML. */
export function encodeEmail(addr: string): string {
  return btoa(reverse(addr));
}

export function decodeEmail(code: string): string {
  return reverse(atob(code));
}
