# Redesign C (top bar · paper · hairlines) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dark sidebar layout with design C on every page: a sticky top bar, a warm paper background, hairline-separated two-column items, and reading-size type. Content stays the same apart from two new pieces of copy.

**Architecture:**
- `Sidebar.astro` and `MobileHeader.astro` merge into one responsive `SiteHeader.astro`. A new `SiteFooter.astro` takes over the email and CV buttons.
- The document scrolls, not `main`.
- `Card.astro` keeps its markup (`article.item > header.item-head + div.body`). CSS alone turns it into a two-column row, so Projects, Experience and Research change together.
- The About view gets a new header block and a compact featured list.
- Life & Values is rearranged with CSS and small markup changes.
- Every change is pinned by a test of the built `dist/` output, in the existing pattern.

**Tech Stack:** Astro 7.4.x, Vitest 5.x (`tests/unit`, `tests/dist`), `astro/zod`, existing fonts (`@fontsource-variable/fraunces`, `@fontsource-variable/dm-sans`, `@fontsource/gowun-batang`, `pretendard`).

**Spec:** `docs/superpowers/specs/2026-11-27-redesign-c-design.md` (approved 2026-11-27). Mockups:
- `docs/superpowers/mockups/2026-11-27-c-compact.html` (approved sizes: About, Projects)
- `docs/superpowers/mockups/2026-11-27-c-pages.html` (Life & Values and phone layouts only; its type is too large, so use the spec's sizes)

## Global Constraints

- **Colours:**
  - bg `#f7f4ef`; fg `#1b2238`; text-secondary `#4a5068`
  - small-text grey `#686c7e` (labels, dates, menu, summaries)
  - lines `#dcd7ce` / `#e3ddd3`; section rule = 1px fg
  - rose `#e895a8`; rose text `#c27387`, only for text ≥18px or hover
  - `#8a8c99` and `#6c7082` must never be used as a text `color`
- **Type:**
  - body 15px
  - About name 34px Fraunces 450; page title 32px Fraunces 450
  - item title 18–19px Fraunces 450 (Gowun Batang on KO)
  - summary 14.5px; details 13–13.5px
  - English small-caps labels 10–10.5px with letter-spacing .16–.18em; Korean labels 12px with no uppercase and no letter-spacing
- **Fonts and names:**
  - Fonts unchanged: Fraunces + DM Sans; Korean Gowun Batang + Pretendard.
  - "Kim" is upright and rose, rendered as `<span class="name-accent">Kim</span>`.
- **Language rules:**
  - The menu, page titles and value keywords stay English on KO pages.
  - All other labels are Korean on KO pages (지금 · 연구 · 다음 · 거주 · 기술 · 언어 · 대표 프로젝트 · 문제 · 접근 · 경력 · 학력).
- **Photo:**
  - `<img src="/images/profile.jpg">` appears on About (EN and KO) only.
  - The og:image meta stays on every page.
- **Never:**
  - a hero sentence
  - numbered items (01, 02…), a script signature, noise texture or a kicker line
  - charts of the person
  - `<details>` toggles
- **Privacy, unchanged:**
  - no phone number anywhere
  - the email is only obfuscated (`data-e`), with a `<noscript>` fallback
  - GoatCounter stays conditional
- **CSS minifier:** write animation properties as longhands. Every CSS assertion runs against `dist/` (minified: hex may be lowercased or shortened, `max-width` becomes `width<=`, ms become s).
- **Tests:** RED→GREEN for every task; `npm test` and `npm run test:dist` must pass before each commit.
- **Commits:** end every commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Anchor links land under the sticky header.** `/projects/#synthetic-data-generation` from About or Experience must show the item's title below the header. Expected: `.item` has `scroll-margin-top` of at least 96px. Pinned in Task 4.
2. **Mid widths (768–1100px) with long titles.** The two-column item must not overflow. The left column shrinks (`minmax(200px, 300px)`), titles keep `overflow-wrap: anywhere`, and the grid collapses to one column at ≤767px. Pinned in Task 4.
3. **Phone header at 375px.** Name, EN·KO and CV fit on one row. The five tabs scroll sideways with no scrollbar band, and the header stays still during page transitions. Pinned in Task 2 and checked in the browser in Task 6.
4. **Email in the footer.** It stays hidden until the script decodes it, `[hidden]` still beats `.btn`, and the `<noscript>` fallback is present on every page. Pinned in Task 2.
5. **Reveal targets.** No-JS, reduced motion and print never hide anything. The new `.featured-row` and `.hobbies li` must be in the script's target list, so they reveal like the rest. Pinned in Task 6.

---

### Task 1: Profile `focus` field and new UI strings

**Files:**
- Modify: `src/content/schemas.ts` (`profileSchema`: add `focus: localized` after `basedIn`)
- Modify: `src/content/profile.yaml` (add `focus: { en: "Graph anomaly detection", ko: "그래프 이상탐지" }` under `main`)
- Modify: `src/i18n/ui.ts`:
  - `en`: `focus: 'Research'`, `projectsSub: 'Data and AI systems built in industry, 2021–2025.'`, `projectCount: '{n} projects'`
  - `ko`: `focus: '연구'`, `projectsSub: '산업 현장에서 만든 데이터·AI 시스템, 2021–2025.'`, `projectCount: '프로젝트 {n}개'`
- Test: `tests/unit/schemas.test.ts`, `tests/unit/i18n.test.ts`

**Interfaces:**
- Produces:
  - `profile.focus: { en: string; ko?: string }` (read with `pick(profile.focus, lang)`)
  - UI keys `'focus' | 'projectsSub' | 'projectCount'`
  - `countLabel(lang: Lang, n: number): string` exported from `src/i18n/ui.ts`, which replaces `{n}` in `t(lang, 'projectCount')`

- [ ] **Step 1: Write the failing tests**
  - `schemas.test.ts` › `describe('research focus')`:
    - `it('requires a short research focus on the profile')`: `profileSchema.safeParse(profileWithoutFocus).success` is `false`.
    - `profileSchema.parse(profile()).focus.en` is `'Graph anomaly detection'`.
  - `i18n.test.ts` › `it('counts projects in each language')`:
    - `countLabel('en', 5)` is `'5 projects'`.
    - `countLabel('ko', 5)` is `'프로젝트 5개'`.
    - `t('ko', 'focus')` is `'연구'`.
- [ ] **Step 2:** Run `npx vitest run tests/unit`. Expected: the 3 new tests FAIL (`focus` is not required, `countLabel` is not exported).
- [ ] **Step 3:** Implement the schema field, the YAML value, the UI keys and `countLabel` as listed above.
- [ ] **Step 4:** Run `npm test`. Expected: all pass. Run `npm run test:dist`. Expected: still 30 passing (nothing is rendered yet).
- [ ] **Step 5:** Commit `feat: research focus on the profile, project count and subtitle strings`.

---

### Task 2: Sticky top bar and footer replace the sidebar (with paper tokens)

**Files:**
- Create: `src/components/SiteHeader.astro`, which takes `{ lang, tab, hasBeyond }` and renders:
  ```html
  <header class="site-header">
    <div class="bar">
      <a class="logo" href={tabPath('about', lang)}>Jiwoo <span class="name-accent">Kim</span></a>
      <Nav .../> <LangToggle .../>
      <a class="btn btn-cv" href="/cv/Jiwoo_Kim_CV.pdf" target="_blank" rel="noopener">CV ↓</a>
    </div>
  </header>
  ```
- Create: `src/components/SiteFooter.astro`, which takes `{ lang, profile }` and renders `<footer class="site-footer">` containing:
  - `<EmailLink>`
  - a CV link
  - GitHub / LinkedIn / Scholar links, each only if set (moved from `Sidebar.astro`)
  - `<span>© Jiwoo Kim</span>`
- Delete: `src/components/Sidebar.astro`, `src/components/MobileHeader.astro`
- Modify: `src/layouts/SiteLayout.astro`. The body becomes `<SiteHeader/><main id="main"><div class="main-inner"><slot/></div></main><SiteFooter/>`, with the `.site` grid wrapper removed. The reveal script stays.
- Modify: `src/styles/global.css`:
  - **Tokens:** replace the `:root` tokens with the Global Constraints colours, keeping the variable names `--bg --fg --muted --line --rose`, plus `--fg-2: #4a5068`, `--line-soft: #e3ddd3`, `--rose-text: #c27387`, `--header-h`. Drop `--sb-*`, `--card`, `--chip` and `--sidebar-w`.
  - **Remove:** the sidebar, `.mh-*` and `.mobile-header` rules, and the phone `::view-transition-group(mobile-header)` rule.
  - **Header:** `.site-header { position: sticky; top: 0; z-index: 10; background: var(--bg); border-bottom: 1px solid var(--line-soft); view-transition-name: site-header; }`. `.bar` is centred, `max-width: 1100px`, `padding: 0 56px`, a flex row, 13px.
  - **Menu:** the current tab is fg with the indicator as a 1.5px rose underline (`position: absolute`), still `view-transition-name: nav-indicator`.
  - **CV button:** a fg pill with bg text.
  - **Phone (≤767px):**
    - The bar wraps into two rows: logo, EN·KO and CV, then the nav at full width.
    - `.site-header .nav { overflow-x: auto; scrollbar-width: none }` and `::-webkit-scrollbar { display: none }`.
- Test: `tests/dist/site.test.ts`

**Interfaces:**
- Consumes: `Nav.astro`, `LangToggle.astro`, `EmailLink.astro` (unchanged props)
- Produces: CSS classes `.site-header`, `.site-footer`, `.logo`, and the custom property `--header-h` (desktop 56px, phone 96px), which Task 4 uses for `scroll-margin-top`

- [ ] **Step 1: Write the failing tests** in `describe('header and footer')`:
  - `it('puts one sticky top bar on every page, with logo, menu, language switch and CV')`. For `index.html`, `projects/index.html`, `ko/research/index.html`, `ko/beyond/index.html` and `404.html`:
    - `count(html, '<header class="site-header"')` is 1.
    - The page contains `class="logo" href="/"` (or `href="/ko/"` on KO).
    - It contains `href="/cv/Jiwoo_Kim_CV.pdf"`.
    - `count(html, 'class="nav-indicator"')` is 1 on every page (`404.html` renders with `tab="about"`).
    - The HTML contains neither `class="sidebar"` nor `mobile-header`.
    - In the CSS: `/\.site-header\{[^}]*position:sticky/` and `/\.site-header\{[^}]*view-transition-name:site-header/`.
  - `it('puts email and CV in a footer on every page, with a no-JS fallback')`. On the same pages:
    - `<footer class="site-footer"` is present.
    - The footer slice contains `data-e=`, `<noscript>`, `/cv/Jiwoo_Kim_CV.pdf` and `© Jiwoo Kim`.
  - `it('uses the paper palette and readable greys')`:
    - The CSS contains `--bg:#f7f4ef` (accept `#F7F4EF`) and `--muted:#686c7e`.
    - The CSS does not match `/[^-]color:#(8a8c99|6c7082)/i`.
  - **Update `'animates page changes…'`:**
    - The `.sidebar` assertion becomes the `.site-header` one.
    - The indicator count becomes 1.
    - The `aria-current` regex is unchanged.
  - **Update `'renders the English home page with the sidebar copy'`:** rename it to `'renders the English home page with the CV link'` and drop its title-copy assertion (Task 3 asserts the title copy in About). It keeps `lang="en"` and the CV href.
  - **Replace `'keeps the phone header still…'`** with `it('keeps the phone tab row swipeable without a scrollbar band')`: the phone media block matches `/\.site-header \.nav\{[^}]*scrollbar-width:none/`, and the CSS contains no `mobile-header`.
- [ ] **Step 2:** Run `npm run test:dist`. Expected: the new and updated tests FAIL. Others may fail too, because sidebar markup still renders.
- [ ] **Step 3:** Implement the components, layout and CSS listed above.
- [ ] **Step 4:** Run `npm test && npm run test:dist`. Expected: all pass.
- [ ] **Step 5:** Commit `feat: sticky top bar and footer replace the sidebar; paper palette`.

---

### Task 3: About page — photo header, four facts, two columns

**Files:**
- Modify: `src/views/AboutView.astro`. Replace the `page-title` and `lead` with:
  ```html
  <section class="intro-head">
    <img class="photo" src="/images/profile.jpg" width="148" height="148" alt={pick(profile.name, lang)} />
    <div>
      {lang === 'ko' && <p class="name-ko">김지우</p>}   <!-- from pick(profile.name,'ko') -->
      <h1 class="name">Jiwoo <span class="name-accent">Kim</span></h1>
      <p class="title">…</p>
      <p class="affiliation">…</p>
      <p class="lead">{intro}</p>
    </div>
  </section>
  ```
  - `.facts` gets four spans in this order: now, **focus**, next, basedIn (labels `t(lang, 'now' | 'focus' | 'next' | 'basedIn')`).
  - Then `<div class="about-cols">`:
    - **Left:** the `.label` "Featured projects" with "See all →", then `FeaturedRow` × 3.
    - **Right:** the Skills `.label` and `.chips`, then the Languages `.label` and `<p>`.
- Create: `src/components/FeaturedRow.astro`, which takes `{ entry: CollectionEntry<'projects'>, lang }` and renders `<a class="featured-row" href={`${tabPath('projects', lang)}#${entry.id}`}>` with `<span class="f-title">`, `<span class="f-when">` (`formatPeriod` years only is fine) and `<span class="f-sum">` (the summary).
- Modify: `src/styles/global.css`:
  - `.intro-head`: grid `148px 1fr`, gap 34px.
  - `.photo`: 148px, rose shadow `8px 8px 0`.
  - `.name`: 34px Fraunces 450.
  - `.facts`: four items, labels as small caps; on KO, the label style from the constraints.
  - `.about-cols`: grid `1fr 300px`, gap 48px; one column at ≤767px.
  - `.featured-row`: the title turns rose-text with `translateX(6px)` only inside `@media (hover: hover)`.
  - **Phone:** photo 96px, facts 2×2.
- Test: `tests/dist/site.test.ts`

**Interfaces:**
- Consumes: `profile.focus` and `t(…'focus')` (Task 1); `.site-header` (Task 2)
- Produces: `FeaturedRow.astro`; classes `.intro-head`, `.about-cols`, `.featured-row`

- [ ] **Step 1: Write the failing tests** in `describe('About')`:
  - `it('opens with the photo, name, title and intro instead of a page title')`:
    - `index.html` contains `<h1 class="name">Jiwoo <span class="name-accent">Kim</span></h1>`, the title copy and the intro copy.
    - It does not contain `<h1 class="page-title">`.
    - `ko/index.html` contains `class="name-ko">김지우<`.
  - `it('shows the photo on About only')`:
    - `<img class="photo" src="/images/profile.jpg"` is present in `index.html` and `ko/index.html`.
    - It is absent from `projects/`, `research/`, `experience/`, `beyond/` and `404.html`.
  - `it('lists four facts, with Research between Now and Next')`:
    - EN: the labels appear in the order Now < Research < Next < Based in, and `Graph anomaly detection` is present.
    - KO: 지금 < 연구 < 다음 < 거주, and `그래프 이상탐지` is present.
  - `it('lists three featured projects that link into the Projects page')`:
    - `count(html, 'class="featured-row"')` is 3 on both languages.
    - `index.html` contains `href="/projects/#synthetic-data-generation"`; `ko/index.html` contains `href="/ko/projects/#synthetic-data-generation"`.
    - `count(index, '<article class="item"')` is 0.
  - **Update `'shows every item fully expanded…'`:** the `index.html` item count expectation goes from 3 to 0 (the featured rows are covered above).
  - **Update `'keeps the menu and page titles in English on Korean pages'`:** drop `ko/index.html` from the `h1` list (its h1 is the name). Keep the menu-label loop for all five pages.
- [ ] **Step 2:** Run `npm run test:dist`. Expected: the new About tests FAIL.
- [ ] **Step 3:** Implement the view, `FeaturedRow` and the CSS as listed.
- [ ] **Step 4:** Run `npm test && npm run test:dist`. Expected: all pass.
- [ ] **Step 5:** Commit `feat: About opens with photo and intro; four facts; featured list and skills side by side`.

---

### Task 4: Two-column hairline items — Projects, Experience, Research

**Files:**
- Modify: `src/views/ProjectsView.astro`. After the `h1.page-title`, add `<p class="page-sub">{t(lang, 'projectsSub')}</p>` and `<div class="label"><span>{countLabel(lang, projects.length)}</span></div>`.
- Modify: `src/styles/global.css`:
  - `h1.page-title`: 32px Fraunces 450, `margin: 36px 0 4px`.
  - `.page-sub`: 14px muted.
  - `.label` (section head): small caps, with a 1px fg bottom border. `:lang(ko) .label` and `:lang(ko) .section-title` get `text-transform: none; letter-spacing: 0; font-size: 12px`.
  - `.section-title` (the Experience h2): the same look as `.label` (keep the element and class).
  - `.item`:
    - `display: grid; grid-template-columns: minmax(200px, 300px) 1fr; gap: 32px; padding: 18px 0 20px`
    - no box: no background, border or radius; `border-bottom: 1px solid var(--line)`
    - `scroll-margin-top: calc(var(--header-h) + 24px)`
  - `.s-title`: 19px Fraunces 450 (`:lang(ko)` Gowun Batang), `overflow-wrap: anywhere`.
  - `.s-meta`: 12px muted.
  - `.s-lead`: 14.5px.
  - `.item dl`: 13px, label column 84px.
  - Chips: outline style (border `#d3ccc1`, transparent background).
  - Hover shift only inside `@media (hover: hover)`.
  - ≤767px: `.item` is one column.
- Test: `tests/dist/site.test.ts`

**Interfaces:**
- Consumes: `countLabel` and the `projectsSub` key (Task 1); `--header-h` (Task 2)
- Produces: final `.item`, `.label` and `.section-title` styles (Task 5 reuses `.label`)

- [ ] **Step 1: Write the failing tests** in `describe('item pages')`:
  - `it('introduces Projects with a subtitle and a live project count')`:
    - EN contains `Data and AI systems built in industry, 2021–2025.` and `5 projects`.
    - KO contains `산업 현장에서 만든 데이터·AI 시스템, 2021–2025.` and `프로젝트 5개`.
    - Neither contains `Newest first`.
  - `it('lays items out as two-column rows divided by hairlines, not boxed cards')`:
    - The CSS matches `/\.item\{[^}]*display:grid/` and `/\.item\{[^}]*grid-template-columns:minmax\(200px,\s*300px\)\s*1fr/`.
    - It does not match `/\.item\{[^}]*background:#fff/`.
    - The phone block matches `/\.item\{[^}]*grid-template-columns:1fr/`.
  - `it('keeps anchored items clear of the sticky header')`: the CSS matches `/\.item\{[^}]*scroll-margin-top:calc\(var\(--header-h\)\s*\+\s*24px\)/`, and `--header-h` is ≥ 56px in the base rule and ≥ 96px in the phone block.
  - `it('writes Korean labels without uppercase or letter-spacing')`: the CSS matches `/:lang\(ko\) \.label[^{]*\{[^}]*text-transform:none/`.
- [ ] **Step 2:** Run `npm run test:dist`. Expected: these FAIL.
- [ ] **Step 3:** Implement as listed.
- [ ] **Step 4:** Run `npm test && npm run test:dist`. Expected: all pass. The existing Experience section, DOI, fallback and no-toggle tests stay green.
- [ ] **Step 5:** Commit `feat: hairline two-column items, Projects subtitle and count, Korean label style`.

---

### Task 5: Life & Values layout

**Files:**
- Modify: `src/views/BeyondView.astro`:
  - Wrap hobbies and tastes in `<div class="beyond-cols">`.
  - Hobbies become `<ul class="hobbies">{hobbies.map(h => <li>{h.title}</li>)}</ul>` instead of chips.
  - Values markup is unchanged (`ul.values > li > span.value-title + span.value-detail`).
- Modify: `src/styles/global.css`:
  - `.values`: `grid-template-columns: repeat(4, 1fr)`, top border 1px fg, cells separated by a 1px `--line` vertical rule. At ≤767px use `repeat(2, 1fr)`.
  - `.value-title`: 22px Fraunces 400 with `::after { content: '.'; color: var(--rose) }`.
  - `.value-detail`: 14px `--fg-2`.
  - Remove the old left rose border on `.values li`.
  - `.beyond-cols`: grid `1fr 1.5fr`, gap 56px; one column at ≤767px.
  - `.hobbies li` and `.tastes` rows: hairline-separated; values in Fraunces 16px (Gowun Batang on KO); `.tastes dt` is the small label.
  - No numbers anywhere.
- Test: `tests/dist/site.test.ts`

**Interfaces:**
- Consumes: `.label` (Task 4)
- Produces: classes `.beyond-cols` and `.hobbies` (Task 6 adds `.hobbies li` to the reveal targets)

- [ ] **Step 1: Write the failing tests** in `describe('Life & Values')`:
  - `it('sets the four values side by side and lists hobbies as rows, not chips')`:
    - The CSS matches `/\.values\{[^}]*grid-template-columns:repeat\(4,\s*1fr\)/` and `/\.value-title:{1,2}after\{[^}]*content:"\."/`.
    - `beyond/index.html` contains `<ul class="hobbies">` and `<div class="beyond-cols">`.
    - Its hobbies section contains no `class="chip"`.
    - The page does not match `/>\s*0[1-9]\s*</` (no numbering).
  - The existing `'lays out Beyond Work without toggles…'` and `'keeps the value keywords in English…'` tests stay unchanged and must stay green.
- [ ] **Step 2:** Run `npm run test:dist`. Expected: FAIL.
- [ ] **Step 3:** Implement as listed.
- [ ] **Step 4:** Run `npm test && npm run test:dist`. Expected: all pass.
- [ ] **Step 5:** Commit `feat: Life & Values as four values side by side, hobbies and tastes as rows`.

---

### Task 6: Reveal targets, browser check against the mockups

**Files:**
- Modify: `src/layouts/SiteLayout.astro`. In the reveal script, the `targets` string becomes `'.item, .featured-row, .values li, .tastes, .hobbies li, .section-title, main .label, main .chips, main .facts'`.
- Modify: `tests/dist/site.test.ts`. In `'marks and reveals items…'`, add `.featured-row` and `.hobbies li` to the target list.
- Remove: any CSS left unused by the old layout (`.sidebar`, `.mh-*`, `.tagline`, `.buttons` if nothing uses it). Keep `.btn`.

**Interfaces:**
- Consumes: classes from Tasks 3–5

- [ ] **Step 1:** Update the reveal test's target list. Run `npm run test:dist`. Expected: FAIL on `.featured-row`.
- [ ] **Step 2:** Update the script's `targets`. Run `npm test && npm run test:dist`. Expected: all pass.
- [ ] **Step 3: Browser check.**
  - Start `astro-preview` (port 4322, the production build).
  - Compare these screens with `docs/superpowers/mockups/2026-11-27-c-compact.html`:
    - About and Projects at 1440×900. About must fit on one screen apart from the footer.
    - `/ko/` and `/ko/beyond/`.
    - 375×812: no horizontal page scroll, no scrollbar band under the tabs.
  - Then:
    - Scroll Projects, click another tab, and confirm the header does not move and the rose underline glides.
    - Open `/projects/#data-integration` and confirm the title is visible below the header.
    - Confirm the email button decodes.
  - Fix anything that differs and re-run the tests.
- [ ] **Step 4:** Commit `feat: reveal the new rows; tidy leftover sidebar styles`.
