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
const allCss = () =>
  walk(dist)
    .filter((f) => f.endsWith('.css'))
    .map((f) => readFileSync(f, 'utf8'))
    .join('\n');
/** The bodies of the phone media blocks only (brace-counted, so later desktop rules never leak in). */
const phoneCss = (css: string) => {
  const out: string[] = [];
  const open = /@media \((?:max-width:767px|width<=767px)\)\{/g;
  for (let m = open.exec(css); m; m = open.exec(css)) {
    let depth = 1;
    let i = open.lastIndex;
    for (; i < css.length && depth > 0; i++) depth += css[i] === '{' ? 1 : css[i] === '}' ? -1 : 0;
    out.push(css.slice(open.lastIndex, i - 1));
  }
  return out.join('\n');
};

describe('sidebar and layout', () => {
  it('renders the English home page with the CV link', () => {
    const home = read('index.html');
    expect(home).toContain('<html lang="en"');
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
    expect(css).toMatch(/\.site-header\{[^}]*view-transition-name:site-header/);
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
      // one menu per page, so one indicator, inside the current tab's link only
      expect(count(html, 'class="nav-indicator"'), page).toBe(1);
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
      for (const target of ['.item', '.featured-row', '.values li', '.tastes', '.hobbies li', '.section-title', 'main .label', 'main .chips', 'main .facts']) {
        expect(js, target).toContain(target);
      }
      // staggered like the mockup (70ms steps, capped) and each element revealed once
      expect(js).toMatch(/--reveal-delay/);
      expect(js).toMatch(/unobserve/);
      // tags inside a card rise with their card, not a second time on their own
      expect(js).toMatch(/parentElement\.closest\(/);
    }
  });

  it('keeps the phone tab row swipeable without a scrollbar band', () => {
    const css = allCss();
    expect(phoneCss(css)).toMatch(/\.site-header \.nav\{[^}]*scrollbar-width:none/);
    // the scrolling tab row clips anything below its box, so the current-tab underline sits inside it
    expect(phoneCss(css)).toMatch(/\.site-header \.nav-indicator\{[^}]*bottom:0/);
    expect(css).not.toContain('mobile-header');
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

describe('header and footer', () => {
  const pages: [string, string][] = [
    ['index.html', '/'],
    ['projects/index.html', '/'],
    ['ko/research/index.html', '/ko/'],
    ['ko/beyond/index.html', '/ko/'],
    ['404.html', '/'],
  ];

  it('puts one sticky top bar on every page, with logo, menu, language switch and CV', () => {
    for (const [page, home] of pages) {
      const html = read(page);
      expect(count(html, '<header class="site-header"'), page).toBe(1);
      expect(html, page).toContain(`class="logo" href="${home}"`);
      expect(html, page).toContain('class="lang-toggle"');
      expect(html, page).toContain('href="/cv/Jiwoo_Kim_CV.pdf"');
      expect(count(html, 'class="nav-indicator"'), page).toBe(1);
      expect(html, page).not.toContain('class="sidebar"');
      expect(html, page).not.toContain('mobile-header');
    }
    const css = allCss();
    expect(css).toMatch(/\.site-header\{[^}]*position:sticky/);
    expect(css).toMatch(/\.site-header\{[^}]*view-transition-name:site-header/);
  });

  it('puts email and CV in a footer on every page, with a no-JS fallback', () => {
    for (const [page] of pages) {
      const html = read(page);
      const at = html.indexOf('<footer class="site-footer"');
      expect(at, page).toBeGreaterThan(-1);
      const footer = html.slice(at);
      expect(footer, page).toContain('data-e=');
      expect(footer, page).toContain('<noscript>');
      expect(footer, page).toContain('/cv/Jiwoo_Kim_CV.pdf');
      expect(footer, page).toContain('© Jiwoo Kim');
    }
  });

  it('keeps the footer at the bottom of short pages', () => {
    const css = allCss();
    expect(css).toMatch(/body\{[^}]*min-height:100dvh/);
    expect(css).toMatch(/body\{[^}]*flex-direction:column/);
    expect(css).toMatch(/main\{[^}]*flex:1/);
  });

  it('keeps keyboard focus and anchor jumps clear of the sticky header', () => {
    expect(allCss()).toMatch(/html\{[^}]*scroll-padding-top:calc\(var\(--header-h\)\s*\+\s*8px\)/);
  });

  it('draws a focus ring that stands out on the paper background', () => {
    expect(allCss()).toMatch(/:focus-visible\{[^}]*outline:[^;}]*var\(--fg\)/);
  });

  it('brings the current tab into view on phones and keeps its focus ring inside the tab row', () => {
    for (const page of ['beyond/index.html', 'ko/experience/index.html']) {
      const html = read(page);
      const at = html.indexOf('<header class="site-header"');
      const header = html.slice(at, html.indexOf('</header>', at));
      const script = (header.match(/<script>([\s\S]*?)<\/script>/) ?? [])[1] ?? '';
      expect(script, page).toContain('aria-current');
      expect(script, page).toContain('scrollLeft');
    }
    expect(phoneCss(allCss())).toMatch(/\.site-header \.nav a[^{]*\{[^}]*outline-offset:-/);
  });

  it('uses the paper palette and readable greys', () => {
    const css = allCss();
    expect(css).toMatch(/--bg:#f7f4ef/i);
    expect(css).toMatch(/--muted:#686c7e/i);
    expect(css).not.toMatch(/[^-]color:#(8a8c99|6c7082)/i);
  });
});

describe('About', () => {
  const profile = () => parse(readFileSync(join(contentDir, 'profile.yaml'), 'utf8')).main;
  const factsOf = (html: string) => {
    const at = html.indexOf('<div class="facts">');
    return html.slice(at, html.indexOf('</div>', at));
  };

  it('opens with the photo, name, title and intro instead of a page title', () => {
    const home = read('index.html');
    expect(home).toContain('<h1 class="name">Jiwoo <span class="name-accent">Kim</span></h1>');
    expect(decode(home)).toContain(profile().title.en);
    expect(decode(home)).toContain(profile().intro.en);
    expect(home).not.toContain('<h1 class="page-title">');
    expect(read('ko/index.html')).toContain('class="name-ko">김지우<');
  });

  it('shows the photo on About only', () => {
    const img = '<img class="photo" src="/images/profile.jpg"';
    for (const page of ['index.html', 'ko/index.html']) expect(read(page), page).toContain(img);
    for (const page of ['projects/index.html', 'research/index.html', 'experience/index.html', 'beyond/index.html', '404.html']) {
      expect(read(page), page).not.toContain(img);
    }
  });

  it('lists four facts, with Research between Now and Next', () => {
    for (const [page, labels, focus] of [
      ['index.html', ['Now', 'Research', 'Next', 'Based in'], 'Graph anomaly detection'],
      ['ko/index.html', ['지금', '연구', '다음', '거주'], '그래프 이상탐지'],
    ] as const) {
      const facts = decode(factsOf(read(page)));
      const at = labels.map((l) => facts.indexOf(`<b>${l}</b>`));
      expect(at.every((i) => i > -1), `${page}: ${at}`).toBe(true);
      expect([...at].sort((a, b) => a - b), page).toEqual(at);
      expect(facts, page).toContain(focus);
    }
  });

  it('lines the four facts up in two equal columns on phones', () => {
    expect(phoneCss(allCss())).toMatch(/\.facts\{[^}]*grid-template-columns:repeat\(2,\s*minmax\(0(px)?,\s*1fr\)\)/);
  });

  it('lets the phone facts grid win over the base facts rule', () => {
    const css = allCss();
    const base = css.search(/\.facts\{[^}]*display:flex/);
    const phone = css.search(/\.facts\{[^}]*grid-template-columns:repeat\(2/);
    expect(base).toBeGreaterThan(-1);
    expect(phone, 'phone .facts must come after the base rule').toBeGreaterThan(base);
  });

  it('lists three featured projects that link into the Projects page', () => {
    for (const [page, base] of [['index.html', '/projects/'], ['ko/index.html', '/ko/projects/']] as const) {
      const html = read(page);
      expect(count(html, 'class="featured-row"'), page).toBe(3);
      expect(html, page).toContain(`href="${base}#synthetic-data-generation"`);
      expect(count(html, '<article class="item"'), page).toBe(0);
    }
  });
});

describe('item pages', () => {
  it('introduces Projects with a subtitle and a live project count', () => {
    const n = yamlFiles('projects').length;
    const en = decode(read('projects/index.html'));
    const ko = decode(read('ko/projects/index.html'));
    expect(en).toContain('Data and AI systems built in industry, 2021–2025.');
    expect(en).toContain(`${n} projects`);
    expect(ko).toContain('산업 현장에서 만든 데이터·AI 시스템, 2021–2025.');
    expect(ko).toContain(`프로젝트 ${n}개`);
    for (const page of [en, ko]) expect(page).not.toContain('Newest first');
  });

  it('lays items out as two-column rows divided by hairlines, not boxed cards', () => {
    const css = allCss();
    expect(css).toMatch(/\.item\{[^}]*display:grid/);
    expect(css).toMatch(/\.item\{[^}]*grid-template-columns:minmax\(200px,\s*300px\)\s*1fr/);
    expect(css).not.toMatch(/\.item\{[^}]*background:#fff/);
    expect(phoneCss(css)).toMatch(/\.item\{[^}]*grid-template-columns:1fr/);
  });

  it('keeps anchored items clear of the sticky header', () => {
    const css = allCss();
    expect(css).toMatch(/\.item\{[^}]*scroll-margin-top:calc\(var\(--header-h\)\s*\+\s*24px\)/);
    const base = Number((css.match(/:root\{[^}]*--header-h:(\d+)px/) ?? [])[1] ?? 0);
    const phone = Number((phoneCss(css).match(/--header-h:(\d+)px/) ?? [])[1] ?? 0);
    expect(base).toBeGreaterThanOrEqual(56);
    expect(phone).toBeGreaterThanOrEqual(96);
  });

  it('writes Korean labels without uppercase or letter-spacing', () => {
    expect(allCss()).toMatch(/:lang\(ko\) \.label[^{]*\{[^}]*text-transform:none/);
  });
});

describe('Life & Values', () => {
  it('fits the values on narrow phones without sideways scrolling', () => {
    const css = allCss();
    expect(phoneCss(css)).toMatch(/\.values\{[^}]*grid-template-columns:repeat\(2,\s*minmax\(0(px)?,\s*1fr\)\)/);
    expect(css).toMatch(/@media \((?:max-width:360px|width<=360px)\)\{[^@]*\.values\{[^}]*grid-template-columns:1fr/);
    expect(css).toMatch(/\.value-title\{[^}]*overflow-wrap:anywhere/);
  });

  it('sets the four values side by side and lists hobbies as rows, not chips', () => {
    const css = allCss();
    expect(css).toMatch(/\.values\{[^}]*grid-template-columns:repeat\(4,\s*1fr\)/);
    expect(css).toMatch(/\.value-title:{1,2}after\{[^}]*content:"\."/);
    for (const page of ['beyond/index.html', 'ko/beyond/index.html']) {
      const html = read(page);
      expect(html, page).toContain('<ul class="hobbies">');
      expect(html, page).toContain('<div class="beyond-cols">');
      expect(html, page).not.toContain('class="chip"');
      expect(html, page).not.toMatch(/>\s*0[1-9]\s*</);
    }
  });
});

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
    expect(count(read('index.html'), '<article class="item"')).toBe(0); // About lists compact featured rows instead
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
      ['ko/index.html', ''], // About's h1 is the name; its menu is still checked below
      ['ko/projects/index.html', 'Projects'],
      ['ko/research/index.html', 'Research'],
      ['ko/experience/index.html', 'Experience & Education'],
      ['ko/beyond/index.html', 'Life & Values'],
    ];
    for (const [path, h1] of tabs) {
      const page = decode(read(path));
      if (h1) expect(page, path).toContain(`<h1 class="page-title">${h1}</h1>`);
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
