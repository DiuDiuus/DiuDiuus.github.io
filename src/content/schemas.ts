import { z } from 'astro/zod';

// Hand-edited YAML: an empty value (`ko:`, `result:`) parses as null and a blank one as "  ".
// Both mean "not filled in", so optional fields fall back instead of breaking the build.
const isBlank = (v: unknown) => v == null || (typeof v === 'string' && v.trim() === '');
const blankToUndefined = (v: unknown) => (isBlank(v) ? undefined : v);
const dropBlankKeys = (v: unknown) =>
  v && typeof v === 'object' && !Array.isArray(v)
    ? Object.fromEntries(Object.entries(v).filter(([, x]) => !isBlank(x)))
    : v;

const required = z.string().trim().min(1);
const optional = z.preprocess(blankToUndefined, z.string().trim().optional());
const list = <T extends z.ZodType>(item: T) => z.preprocess((v) => v ?? [], z.array(item));
/** An `en:`/`ko:` block: blank keys are dropped; an empty `ko:` counts as absent. */
const block = <T extends z.ZodRawShape>(shape: T) => z.preprocess(dropBlankKeys, z.object(shape));
const optionalBlock = <T extends z.ZodRawShape>(shape: T) =>
  z.preprocess(blankToUndefined, block(shape).optional());

const yearMonth = z.string().regex(/^\d{4}-\d{2}$/, 'use "YYYY-MM"');
const link = z.object({ label: required, url: z.url() });
const localized = z.object({ en: required, ko: optional });

export const projectSchema = z.object({
  order: z.number().int(),
  featured: z.boolean().optional(),
  org: required,
  start: yearMonth,
  end: z.preprocess(blankToUndefined, yearMonth.optional()),
  tags: list(z.string()),
  links: list(link),
  en: block({ title: required, summary: required, problem: required, approach: required, result: optional }),
  ko: optionalBlock({ title: optional, summary: optional, problem: optional, approach: optional, result: optional }),
});

export const researchSchema = z.object({
  kind: z.enum(['paper', 'talk']),
  year: z.number().int(),
  authors: required,
  venue: required,
  doi: optional,
  links: list(link),
  en: block({ title: required, summary: optional }),
  ko: optionalBlock({ title: optional, summary: optional }),
});

export const experienceSchema = z.object({
  kind: z.enum(['work', 'education']),
  org: required,
  location: optional,
  start: yearMonth,
  end: z.preprocess(blankToUndefined, yearMonth.optional()),
  projects: list(z.string()),
  en: block({ role: required, org: optional, detail: optional }),
  ko: optionalBlock({ role: optional, org: optional, detail: optional }),
});

export const beyondSchema = z.object({
  kind: z.enum(['value', 'hobby', 'taste']),
  order: z.number().int(),
  en: block({ title: required, detail: optional }),
  ko: optionalBlock({ title: optional, detail: optional }),
});

export const profileSchema = z.object({
  name: localized,
  title: localized,
  affiliation: localized,
  tagline: localized,
  intro: localized,
  now: localized,
  next: localized,
  basedIn: localized,
  focus: localized,
  currentResearch: localized,
  languages: localized,
  skills: z.array(z.string()).min(1),
  interests: z.array(z.string()).min(1),
  email: z.email(),
  links: z.object({
    github: z.preprocess((v) => v ?? '', z.string()),
    linkedin: z.preprocess((v) => v ?? '', z.string()),
    scholar: z.preprocess((v) => v ?? '', z.string()),
  }),
  /** GoatCounter site code (the part before .goatcounter.com); empty = no analytics. */
  analytics: z
    .object({ goatcounter: z.preprocess((v) => v ?? '', z.string().regex(/^[a-z0-9-]*$/, 'letters, digits, hyphens')) })
    .default({ goatcounter: '' }),
});
