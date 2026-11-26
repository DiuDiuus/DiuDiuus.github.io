export function byStartDesc<T extends { data: { start: string } }>(xs: T[]): T[] {
  return [...xs].sort((a, b) => b.data.start.localeCompare(a.data.start));
}

export function byOrder<T extends { data: { order: number } }>(xs: T[]): T[] {
  return [...xs].sort((a, b) => a.data.order - b.data.order);
}

export function featured<T extends { data: { featured?: boolean; order: number } }>(xs: T[]): T[] {
  return byOrder(xs.filter((x) => x.data.featured));
}
