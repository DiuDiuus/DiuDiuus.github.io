import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { KOREAN_MOBILE } from '../helpers/phone';

const root = join(__dirname, '../..');

describe('public repository hygiene', () => {
  it('tracks no file that contains a Korean mobile number or its prefix', () => {
    const files = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
      .split('\n')
      .filter((f) => f && existsSync(join(root, f)) && !/\.(pdf|jpe?g|png|woff2?|svg)$/.test(f))
      // the helper's own test uses fictional 1234-5678 numbers on purpose
      .filter((f) => f !== 'tests/unit/phone-helper.test.ts');
    for (const f of files) {
      const text = readFileSync(join(root, f), 'utf8');
      expect(text, f).not.toMatch(KOREAN_MOBILE);
      expect(text, f).not.toMatch(/\+82-1\d/);
      expect(text, f).not.toMatch(/\b01\d-\d{3,4}\b/);
    }
  });

  it('does not git-ignore the build-output tests', () => {
    const r = spawnSync('git', ['check-ignore', '-q', 'tests/dist/site.test.ts'], { cwd: root });
    expect(r.status).toBe(1); // 1 = not ignored
  });
});

describe('deploy workflow', () => {
  const wf = parse(readFileSync(join(root, '.github/workflows/deploy.yml'), 'utf8'));

  it('runs every test suite before building', () => {
    const runs = (wf.jobs.test?.steps ?? []).map((s: { run?: string }) => s.run ?? '');
    expect(runs).toContain('npm ci');
    expect(runs).toContain('npm test');
    expect(runs).toContain('npm run test:dist');
  });

  it('only builds and deploys after the tests pass', () => {
    expect([wf.jobs.build.needs].flat()).toContain('test');
    expect([wf.jobs.deploy.needs].flat()).toContain('build');
  });
});
