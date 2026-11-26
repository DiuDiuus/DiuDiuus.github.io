export type Lang = 'en' | 'ko';
export const LANGS: Lang[] = ['en', 'ko'];

export type Tab = 'about' | 'projects' | 'research' | 'experience' | 'beyond';
export const TABS: Tab[] = ['about', 'projects', 'research', 'experience', 'beyond'];

/** Korean text falls back to English field by field; empty Korean strings count as missing. */
export function locText<T extends object>(en: T, ko: Partial<T> | undefined, lang: Lang): T {
  if (lang === 'en' || !ko) return en;
  const merged = { ...en };
  for (const [key, value] of Object.entries(ko)) {
    if (value === undefined || value === null || value === '') continue;
    (merged as Record<string, unknown>)[key] = value;
  }
  return merged;
}

export function tabPath(tab: Tab, lang: Lang): string {
  const prefix = lang === 'ko' ? '/ko' : '';
  return tab === 'about' ? `${prefix}/` : `${prefix}/${tab}/`;
}

export function langFromPath(pathname: string): Lang {
  return pathname === '/ko' || pathname.startsWith('/ko/') ? 'ko' : 'en';
}

export function switchLangPath(pathname: string, to: Lang): string {
  const rest = langFromPath(pathname) === 'ko' ? pathname.slice(3) || '/' : pathname;
  const normalized = rest.startsWith('/') ? rest : `/${rest}`;
  return to === 'ko' ? (normalized === '/' ? '/ko/' : `/ko${normalized}`) : normalized;
}
