import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { KOREAN_MOBILE, pdfShownText, stripUnicodeRanges } from '../helpers/phone';

const dist = join(__dirname, '../../dist');
const read = (p: string) => readFileSync(join(dist, p), 'utf8');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}
const textFiles = () => walk(dist).filter((f) => /\.(html|css|js|xml|txt|json)$/.test(f));

describe('sidebar and layout', () => {
  it('renders the English home page with the sidebar copy', () => {
    const home = read('index.html');
    expect(home).toContain('<html lang="en"');
    expect(home).toContain('Data Scientist · Integrated M.S./Ph.D. Student');
    expect(home).toContain('href="/cv/Jiwoo_Kim_CV.pdf"');
  });

  it('ships the public CV', () => {
    expect(existsSync(join(dist, 'cv/Jiwoo_Kim_CV.pdf'))).toBe(true);
  });

  it('offers a no-JavaScript fallback for the email button', () => {
    expect(read('index.html')).toContain('<noscript>');
  });
});

const decode = (html: string) =>
  html
    .replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
const contentDir = join(__dirname, '../../src/content');
const yamlFiles = (dir: string) =>
  readdirSync(join(contentDir, dir))
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => parse(readFileSync(join(contentDir, dir, f), 'utf8')));
const count = (s: string, needle: string) => s.split(needle).length - 1;

describe('pages', () => {
  it.each(['', 'projects/', 'research/', 'experience/'])('builds /%s in English and Korean', (p) => {
    expect(read(`${p}index.html`)).toContain('<html lang="en"');
    expect(read(`ko/${p}index.html`)).toContain('<html lang="ko"');
  });

  it('ships a CNAME for the custom domain', () => {
    expect(read('CNAME').trim()).toBe('jiwookim.dev');
  });

  it('has a 404 page', () => {
    expect(existsSync(join(dist, '404.html'))).toBe(true);
  });

  it('hides Beyond Work while it has no content', () => {
    expect(yamlFiles('beyond')).toHaveLength(0);
    expect(existsSync(join(dist, 'beyond'))).toBe(false);
    expect(existsSync(join(dist, 'ko/beyond'))).toBe(false);
    for (const f of walk(dist).filter((f) => f.endsWith('.html'))) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/href="(\/ko)?\/beyond\/"/);
    }
  });

  it('shows projects and experience as closed toggles', () => {
    expect(count(read('projects/index.html'), '<details')).toBe(5);
    expect(count(read('index.html'), '<details')).toBe(3);
    expect(count(read('experience/index.html'), '<details')).toBe(4);
    for (const f of walk(dist).filter((f) => f.endsWith('.html'))) {
      expect(readFileSync(f, 'utf8'), f).not.toContain('<details open');
    }
  });

  it('links the paper DOI', () => {
    expect(read('research/index.html')).toContain('https://doi.org/10.3390/s24248033');
  });

  it('switches language on the same tab', () => {
    expect(read('projects/index.html')).toContain('href="/ko/projects/"');
    expect(read('ko/projects/index.html')).toContain('href="/projects/"');
  });

  it('falls back to English wherever Korean text is missing', () => {
    const pages: Record<string, string> = {
      projects: decode(read('ko/projects/index.html')),
      research: decode(read('ko/research/index.html')),
      experience: decode(read('ko/experience/index.html')),
    };
    for (const [dir, page] of Object.entries(pages)) {
      for (const doc of yamlFiles(dir)) {
        for (const [field, value] of Object.entries(doc.en as Record<string, string>)) {
          const expected = doc.ko?.[field] || value;
          expect(page, `${dir}: ${field}`).toContain(expected);
        }
      }
    }
  });

  it('never renders an empty summary or placeholder copy', () => {
    for (const f of walk(dist).filter((f) => f.endsWith('.html'))) {
      const html = readFileSync(f, 'utf8');
      expect(html, f).not.toMatch(/<span class="s-title"[^>]*>\s*<\/span>/);
      for (const banned of ['Lorem', 'TODO', 'Paper Title', 'Project Title', '…</']) {
        expect(html, `${f}: ${banned}`).not.toContain(banned);
      }
    }
  });
});

describe('privacy', () => {
  it('never exposes a phone number, the plain email, or outdated copy', () => {
    for (const f of textFiles()) {
      const body = stripUnicodeRanges(readFileSync(f, 'utf8'));
      expect(body, `${f} contains a phone number`).not.toMatch(KOREAN_MOBILE);
      for (const banned of ['zioo1004', '@yonsei', 'Becoming a data scientist']) {
        expect(body, `${f} contains ${banned}`).not.toContain(banned);
      }
    }
  });

  it('hides elements marked hidden even when they are buttons', () => {
    const css = walk(dist)
      .filter((f) => f.endsWith('.css'))
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n');
    expect(css).toMatch(/\[hidden\]\{display:none\s*!important\}/);
  });

  it('publishes a small, upright-safe profile photo', () => {
    const jpg = readFileSync(join(dist, 'images/profile.jpg'));
    expect(jpg.length).toBeLessThan(200 * 1024);
    let i = 2;
    while (i < jpg.length && !(jpg[i + 1] >= 0xc0 && jpg[i + 1] <= 0xc3)) i += 2 + jpg.readUInt16BE(i + 2);
    const height = jpg.readUInt16BE(i + 5);
    const width = jpg.readUInt16BE(i + 7);
    expect(Math.max(width, height)).toBeLessThanOrEqual(800);
  });

  it('serves a CV whose text streams carry no phone number', () => {
    const pdf = readFileSync(join(dist, 'cv/Jiwoo_Kim_CV.pdf'));
    const raw = pdf.toString('latin1');
    const texts: string[] = [];
    for (const m of raw.matchAll(/(?<!end)stream\r?\n/g)) {
      const start = m.index! + m[0].length;
      const end = raw.indexOf('endstream', start);
      try {
        texts.push(inflateSync(pdf.subarray(start, end)).toString('latin1'));
      } catch {
        /* not a Flate stream */
      }
    }
    expect(texts.length).toBeGreaterThan(0);
    const shown = texts.map(pdfShownText).join('\n');
    expect(shown).toContain('Greta'); // proves the page text was actually read
    expect(shown).not.toMatch(KOREAN_MOBILE);
  });

  it('publishes a profile photo without EXIF or GPS metadata', () => {
    const jpg = readFileSync(join(dist, 'images/profile.jpg'));
    expect(jpg.includes(Buffer.from('GPS'))).toBe(false);
    expect(jpg.includes(Buffer.from('Exif'))).toBe(false);
  });
});
