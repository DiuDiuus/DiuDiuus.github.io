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

describe('CV-derived content', () => {
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
