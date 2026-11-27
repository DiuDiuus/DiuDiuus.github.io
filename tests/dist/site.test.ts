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

  it('uses the chosen typefaces and an upright "Kim"', () => {
    const css = walk(dist)
      .filter((f) => f.endsWith('.css'))
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n');
    for (const family of ['Fraunces Variable', 'DM Sans Variable', 'Gowun Batang', 'Pretendard Variable']) {
      expect(css, family).toContain(family);
    }
    for (const old of ['Instrument Serif', 'Inter Variable', 'Noto Serif KR']) {
      expect(css, old).not.toContain(old);
    }
    for (const page of ['index.html', 'ko/index.html']) {
      const html = read(page);
      expect(html, page).not.toContain('<i>Kim</i>');
      expect(html, page).toContain('<span class="name-accent">Kim</span>');
    }
  });

  it('animates page changes with view transitions, except for reduced motion', () => {
    const css = walk(dist)
      .filter((f) => f.endsWith('.css'))
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n');
    expect(css).toMatch(/@view-transition\{navigation:auto\}/);
    expect(css).toMatch(/@media \(prefers-reduced-motion:reduce\)\{@view-transition\{navigation:none\}/);
    expect(css).toMatch(/\.sidebar\{[^}]*view-transition-name:sidebar/);
    expect(css).toMatch(/\.nav-indicator\{[^}]*view-transition-name:nav-indicator/);
    // noticeable: the new page slides in for at least 0.4s, and the menu marker glides for at least 0.4s
    // durations may be minified to seconds (".52s") or kept in ms
    const ms = (re: RegExp) => {
      const m = css.match(re);
      return m ? Number(m[1]) * (m[2] === 's' ? 1000 : 1) : 0;
    };
    expect(ms(/::view-transition-new\(root\)\{animation:([\d.]+)(ms|s)/)).toBeGreaterThanOrEqual(400);
    expect(ms(/::view-transition-group\(nav-indicator\)\{animation-duration:([\d.]+)(ms|s)/)).toBeGreaterThanOrEqual(400);
    expect(css).toMatch(/@keyframes vt-in\{(0%|from)\{[^}]*translateX?\(\d+px/);
    for (const page of ['index.html', 'projects/index.html', 'ko/beyond/index.html']) {
      const html = read(page);
      // one indicator per menu (sidebar + mobile header), inside the current tab's link only
      expect(count(html, 'class="nav-indicator"'), page).toBe(2);
      expect(html, page).toMatch(/aria-current="page"[^>]*>[^<]*<span class="nav-indicator"/);
    }
  });

  it('reveals content like the approved mockup: rises in over ~0.7s, one after another', () => {
    const css = walk(dist)
      .filter((f) => f.endsWith('.css'))
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n');
    // time-based (not scrubbed by scroll distance), so it is visible on short pages and in every browser
    expect(css).not.toContain('animation-timeline');
    const block = css.match(/@media screen and \(prefers-reduced-motion:no-preference\)\{([\s\S]*?\})\}/);
    expect(block, 'motion-guarded reveal block').not.toBeNull();
    // only elements the script marked are hidden, and only until they are shown
    expect(block![1]).toMatch(/\.reveal:not\(\.in\)\{opacity:0/);
    const inRule = block![1].match(/\.reveal\.in\{([^}]*)\}/);
    expect(inRule, '.reveal.in rule').not.toBeNull();
    expect(inRule![1]).toMatch(/animation-name:reveal-up/);
    const dur = inRule![1].match(/animation-duration:([\d.]+)(ms|s)/);
    expect(Number(dur![1]) * (dur![2] === 's' ? 1000 : 1)).toBeGreaterThanOrEqual(500);
    expect(inRule![1]).toMatch(/animation-delay:var\(--reveal-delay/);
    expect(css).toMatch(/@keyframes reveal-up\{(0%|from)\{[^}]*opacity:0/);
    // nothing else ever starts invisible
    expect(css.replace(block![0], '')).not.toMatch(/\.(item|reveal)[^{]*\{[^}]*opacity:0/);
  });

  it('marks and reveals items with a small script that does nothing without support or with reduced motion', () => {
    for (const page of ['index.html', 'projects/index.html', 'experience/index.html', 'ko/beyond/index.html', '404.html']) {
      const html = read(page);
      const script = html.match(/<script>([^<]*IntersectionObserver[^<]*)<\/script>/);
      expect(script, page).not.toBeNull();
      const js = script![1];
      expect(js).toMatch(/['"]IntersectionObserver['"]\s*in\s*window/);
      expect(js).toMatch(/prefers-reduced-motion:\s*reduce/);
      for (const target of ['.item', '.values li', '.tastes', '.section-title', 'main .label', 'main .chips', 'main .facts']) {
        expect(js, target).toContain(target);
      }
      // staggered like the mockup (70ms steps, capped) and each element revealed once
      expect(js).toMatch(/--reveal-delay/);
      expect(js).toMatch(/unobserve/);
      // tags inside a card rise with their card, not a second time on their own
      expect(js).toMatch(/parentElement\.closest\(/);
    }
  });

  it('keeps the phone header still during page transitions and hides its tab scrollbar', () => {
    const css = walk(dist)
      .filter((f) => f.endsWith('.css'))
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n');
    // the minifier may write the query as (max-width:767px) or (width<=767px)
    const phone = (css.match(/@media \((?:max-width:767px|width<=767px)\)\{([\s\S]*?)\}\s*(?=@|$)/g) ?? []).join('\n');
    // the header scrolls with the page, so morphing its position makes it fly in from above
    expect(phone).toMatch(/::view-transition-group\(mobile-header\)\{animation:none/);
    expect(phone).toMatch(/\.mobile-header \.nav-indicator\{[^}]*view-transition-name:none/);
    // the horizontally scrollable tab row must not show a scrollbar band
    expect(phone).toMatch(/\.mobile-header \.nav\{[^}]*scrollbar-width:none/);
  });

  it('loads GoatCounter only when a site code is configured', () => {
    const profile = parse(readFileSync(join(contentDir, 'profile.yaml'), 'utf8')).main;
    const code: string = profile.analytics?.goatcounter ?? '';
    for (const page of ['index.html', 'ko/projects/index.html', '404.html']) {
      const html = read(page);
      if (code) {
        expect(html, page).toContain(`data-goatcounter="https://${code}.goatcounter.com/count"`);
        expect(html, page).toContain('src="//gc.zgo.at/count.js"');
      } else {
        expect(html, page).not.toContain('goatcounter');
      }
    }
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

  it('is addressed at the free github.io site (no custom domain yet)', () => {
    expect(existsSync(join(dist, 'CNAME'))).toBe(false);
    expect(read('index.html')).toContain('<link rel="canonical" href="https://diudiuus.github.io/"');
    expect(read('ko/projects/index.html')).toContain('content="https://diudiuus.github.io/images/profile.jpg"');
    for (const f of textFiles()) {
      expect(readFileSync(f, 'utf8'), f).not.toContain('jiwookim.dev');
    }
  });

  it('has a 404 page', () => {
    expect(existsSync(join(dist, '404.html'))).toBe(true);
  });

  it('shows Beyond Work exactly when it has content', () => {
    const hasContent = yamlFiles('beyond').length > 0;
    expect(existsSync(join(dist, 'beyond/index.html'))).toBe(hasContent);
    expect(existsSync(join(dist, 'ko/beyond/index.html'))).toBe(hasContent);
    if (hasContent) {
      expect(read('index.html')).toContain('href="/beyond/"');
      expect(read('ko/index.html')).toContain('href="/ko/beyond/"');
    } else {
      for (const f of walk(dist).filter((f) => f.endsWith('.html'))) {
        expect(readFileSync(f, 'utf8'), f).not.toMatch(/href="(\/ko)?\/beyond\/"/);
      }
    }
  });

  it('lays out Beyond Work without toggles: values, hobbies, tastes', () => {
    const docs = yamlFiles('beyond');
    expect(docs.filter((d) => d.kind === 'value')).toHaveLength(4);
    expect(docs.filter((d) => d.kind === 'hobby')).toHaveLength(3);
    expect(docs.filter((d) => d.kind === 'taste')).toHaveLength(4);
    for (const [path, lang] of [['beyond/index.html', 'en'], ['ko/beyond/index.html', 'ko']] as const) {
      const page = decode(read(path));
      expect(page, path).not.toContain('<details');
      for (const d of docs) {
        const text = { ...d.en, ...(lang === 'ko' ? d.ko : {}) };
        expect(page, `${path}: ${text.title}`).toContain(text.title);
        if (text.detail) expect(page, `${path}: ${text.detail}`).toContain(text.detail);
      }
    }
  });

  it('shows every item fully expanded, with no toggles', () => {
    expect(count(read('projects/index.html'), '<article class="item"')).toBe(5);
    expect(count(read('index.html'), '<article class="item"')).toBe(3);
    expect(count(read('experience/index.html'), '<article class="item"')).toBe(4);
    expect(decode(read('projects/index.html'))).toContain('Sensitive tabular and time-series data could not be shared freely');
    for (const f of walk(dist).filter((f) => f.endsWith('.html'))) {
      const html = readFileSync(f, 'utf8');
      expect(html, f).not.toContain('<details');
      expect(html, f).not.toContain('class="plus"');
    }
  });

  it('splits the Experience page into Experience and Education sections', () => {
    const docs = yamlFiles('experience');
    for (const [path, lang, work, edu] of [
      ['experience/index.html', 'en', 'Experience', 'Education'],
      ['ko/experience/index.html', 'ko', '경력', '학력'],
    ] as const) {
      const page = decode(read(path));
      const workAt = page.indexOf(`<h2 class="section-title">${work}</h2>`);
      const eduAt = page.indexOf(`<h2 class="section-title">${edu}</h2>`);
      expect(workAt, `${path}: ${work} heading`).toBeGreaterThan(-1);
      expect(eduAt, `${path}: ${edu} heading`).toBeGreaterThan(workAt);
      for (const d of docs) {
        const role: string = (lang === 'ko' && d.ko?.role) || d.en.role;
        const at = page.indexOf(role);
        expect(at, `${path}: ${role}`).toBeGreaterThan(-1);
        if (d.kind === 'work') expect(at, `${role} under ${work}`).toBeLessThan(eduAt);
        else expect(at, `${role} under ${edu}`).toBeGreaterThan(eduAt);
      }
    }
  });

  it('keeps the value keywords in English on the Korean page', () => {
    const page = decode(read('ko/beyond/index.html'));
    for (const word of ['Depth', 'Breadth', 'Curiosity', 'Communication']) {
      expect(page).toMatch(new RegExp(`<span class="value-title">\\s*${word}\\s*</span>`));
    }
    for (const word of ['깊이', '확장', '호기심', '소통']) {
      expect(page).not.toMatch(new RegExp(`<span class="value-title">\\s*${word}\\s*</span>`));
    }
  });

  it('keeps the menu and page titles in English on Korean pages', () => {
    const tabs: [string, string][] = [
      ['ko/index.html', 'About'],
      ['ko/projects/index.html', 'Projects'],
      ['ko/research/index.html', 'Research'],
      ['ko/experience/index.html', 'Experience & Education'],
      ['ko/beyond/index.html', 'Life & Values'],
    ];
    for (const [path, h1] of tabs) {
      const page = decode(read(path));
      expect(page, path).toContain(`<h1 class="page-title">${h1}</h1>`);
      for (const label of ['About', 'Projects', 'Research', 'Experience', 'Life & Values']) {
        expect(page, `${path} menu: ${label}`).toMatch(new RegExp(`href="/ko/[a-z/]*"[^>]*>\\s*${label}\\s*(<span class="nav-indicator"[^>]*></span>\\s*)?</a>`));
      }
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
      ...(existsSync(join(dist, 'ko/beyond/index.html')) ? { beyond: decode(read('ko/beyond/index.html')) } : {}),
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
