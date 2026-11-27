import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import {
  experienceSchema,
  profileSchema,
  projectSchema,
  researchSchema,
} from '../../src/content/schemas';

const root = join(__dirname, '../../src/content');
const load = (dir: string) =>
  readdirSync(join(root, dir))
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => ({ file: f, raw: readFileSync(join(root, dir, f), 'utf8') }));

const validProject = {
  order: 1,
  org: 'Greta Inc.',
  start: '2022-05',
  tags: [],
  links: [],
  en: { title: 'T', summary: 'S', problem: 'P', approach: 'A' },
};

describe('content files match their schemas', () => {
  it.each(load('projects'))('projects/$file', ({ raw }) => {
    expect(() => projectSchema.parse(parse(raw))).not.toThrow();
  });
  it.each(load('research'))('research/$file', ({ raw }) => {
    expect(() => researchSchema.parse(parse(raw))).not.toThrow();
  });
  it.each(load('experience'))('experience/$file', ({ raw }) => {
    expect(() => experienceSchema.parse(parse(raw))).not.toThrow();
  });
  it('profile.yaml', () => {
    const doc = parse(readFileSync(join(root, 'profile.yaml'), 'utf8'));
    expect(() => profileSchema.parse(doc.main)).not.toThrow();
  });
});

describe('schema rules', () => {
  it('requires an English title on projects', () => {
    expect(projectSchema.safeParse({ ...validProject, en: { summary: 'x' } }).success).toBe(false);
  });
  it('requires YYYY-MM dates', () => {
    expect(projectSchema.safeParse({ ...validProject, start: '2022-5' }).success).toBe(false);
    expect(projectSchema.safeParse(validProject).success).toBe(true);
  });
});

describe('blank fields written by hand', () => {
  it('treats an empty ko: block as missing', () => {
    const r = projectSchema.parse({ ...validProject, ko: null });
    expect(r.ko).toBeUndefined();
  });
  it('treats empty or blank Korean fields as missing', () => {
    const r = projectSchema.parse({ ...validProject, ko: { title: null, summary: '   ', problem: '문제' } });
    expect(r.ko).toEqual({ problem: '문제' });
  });
  it('treats an empty optional English field as missing', () => {
    const r = projectSchema.parse({ ...validProject, en: { ...validProject.en, result: null } });
    expect(r.en.result).toBeUndefined();
  });
  it('rejects a whitespace-only English title', () => {
    expect(projectSchema.safeParse({ ...validProject, en: { ...validProject.en, title: '   ' } }).success).toBe(false);
  });
  it('treats empty lists as empty', () => {
    const r = projectSchema.parse({ ...validProject, tags: null, links: null });
    expect(r.tags).toEqual([]);
    expect(r.links).toEqual([]);
  });
  it('applies the same rules to research, experience and profile text', () => {
    expect(researchSchema.parse({ kind: 'paper', year: 2024, authors: 'A', venue: 'V', links: null, en: { title: 'T', summary: '' }, ko: null }).en.summary).toBeUndefined();
    expect(experienceSchema.parse({ kind: 'work', org: 'O', start: '2022-05', projects: null, en: { role: 'R' }, ko: { role: ' ', org: null } }).ko).toEqual({});
  });
});

describe('analytics setting', () => {
  const profile = () => parse(readFileSync(join(root, 'profile.yaml'), 'utf8')).main;
  it('defaults to no analytics', () => {
    const { analytics, ...rest } = profile();
    expect(profileSchema.parse(rest).analytics.goatcounter).toBe('');
  });
  it('accepts a GoatCounter site code', () => {
    expect(profileSchema.parse({ ...profile(), analytics: { goatcounter: 'jiwoo-kim' } }).analytics.goatcounter).toBe('jiwoo-kim');
  });
  it('rejects codes that could break the script URL', () => {
    expect(profileSchema.safeParse({ ...profile(), analytics: { goatcounter: 'x.evil.com/"' } }).success).toBe(false);
  });
});

describe('CV-derived content', () => {
  it('uses the CV project names as titles', () => {
    const cvTitles = [
      'Synthetic Data Generation',
      'Data Integration',
      'Financial Early Warning System',
      'Semiconductor Market Risk Index',
      'Medical Research Recommendation',
    ];
    for (const { file, raw } of load('projects')) {
      const title: string = parse(raw).en.title;
      expect(cvTitles.some((t) => title.startsWith(t)), `${file}: ${title}`).toBe(true);
    }
  });

  const projects = load('projects').map(({ raw }) => projectSchema.parse(parse(raw)));
  it('has five projects, three of them featured', () => {
    expect(projects).toHaveLength(5);
    expect(projects.filter((p) => p.featured)).toHaveLength(3);
  });
  it('contains no placeholder or outdated copy', () => {
    const all = ['projects', 'research', 'experience']
      .flatMap((d) => load(d).map((f) => f.raw))
      .concat(readFileSync(join(root, 'profile.yaml'), 'utf8'))
      .join('\n');
    for (const banned of ['Lorem', 'TODO', '…', 'Becoming a data scientist']) {
      expect(all).not.toContain(banned);
    }
  });
});
