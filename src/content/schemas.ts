import { z } from 'astro/zod';

const yearMonth = z.string().regex(/^\d{4}-\d{2}$/, 'use "YYYY-MM"');
const link = z.object({ label: z.string().min(1), url: z.url() });
const localized = z.object({ en: z.string().min(1), ko: z.string().optional() });

const projectText = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  problem: z.string().min(1),
  approach: z.string().min(1),
  result: z.string().optional(),
});

export const projectSchema = z.object({
  order: z.number().int(),
  featured: z.boolean().optional(),
  org: z.string().min(1),
  start: yearMonth,
  end: yearMonth.optional(),
  tags: z.array(z.string()).default([]),
  links: z.array(link).default([]),
  en: projectText,
  ko: projectText.partial().optional(),
});

const researchText = z.object({ title: z.string().min(1), summary: z.string().optional() });

export const researchSchema = z.object({
  kind: z.enum(['paper', 'talk']),
  year: z.number().int(),
  authors: z.string().min(1),
  venue: z.string().min(1),
  doi: z.string().optional(),
  links: z.array(link).default([]),
  en: researchText,
  ko: researchText.partial().optional(),
});

const experienceText = z.object({
  role: z.string().min(1),
  org: z.string().optional(),
  detail: z.string().optional(),
});

export const experienceSchema = z.object({
  kind: z.enum(['work', 'education']),
  org: z.string().min(1),
  location: z.string().optional(),
  start: yearMonth,
  end: yearMonth.optional(),
  projects: z.array(z.string()).default([]),
  en: experienceText,
  ko: experienceText.partial().optional(),
});

const beyondText = z.object({ title: z.string().min(1), detail: z.string().optional() });

export const beyondSchema = z.object({
  kind: z.enum(['value', 'hobby', 'taste']),
  order: z.number().int(),
  en: beyondText,
  ko: beyondText.partial().optional(),
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
  currentResearch: localized,
  languages: localized,
  skills: z.array(z.string()).min(1),
  interests: z.array(z.string()).min(1),
  email: z.email(),
  links: z.object({
    github: z.string().default(''),
    linkedin: z.string().default(''),
    scholar: z.string().default(''),
  }),
});
