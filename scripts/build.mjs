// Build the deployable site into _site/:
//   - root files are copied byte-for-byte (favicon.svg, CNAME, .nojekyll); site-src/assets/ goes to /assets/
//   - the menu pages are generated from the templates below, in menu order:
//     / (Index), /work/, /leadership/, /building/, /journal/ (Writing), /about/, /contact/
//   - media/ is copied as-is (Pages CMS uploads land in media/journal)
//   - content/posts/*.md is rendered to /journal/, /journal/<slug>/ and /journal/feed.xml
//   - /blog/... (old URLs) are redirect pages to /journal/...; /blog/feed.xml is a copy of the journal feed
//   - shared CSS, fonts and logo are copied from site-src/assets to /assets/
// Posts with `draft: true` are skipped entirely.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { marked } from 'marked';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '_site');
const POSTS_DIR = path.join(ROOT, 'content/posts');

const SITE = {
  url: 'https://sanz.one',
  name: 'Jason Sanzone',
  journalTitle: 'Journal',
  journalDescription: 'Jason Sanzone on design, AI, EDC and gear, and everything else.',
  journalSubline: 'Notes on design, AI, gear, and everything else.',
  lang: 'en',
};

const ROOT_FILES = ['favicon.svg', 'CNAME', '.nojekyll'];

// ---------- helpers ----------
const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const cdata = (s = '') => '<![CDATA[' + String(s).replace(/]]>/g, ']]]]><![CDATA[>') + ']]>';
const abs = (p) => (/^https?:\/\//i.test(p) ? p : SITE.url + (p.startsWith('/') ? p : '/' + p));
const write = (rel, data) => {
  const f = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, data);
};

function toDate(v, file) {
  if (v instanceof Date && !isNaN(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const s = v.trim();
    const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? s + 'T00:00:00Z' : s);
    if (!isNaN(d)) return d;
  }
  throw new Error(`${file}: missing or invalid "date" (${JSON.stringify(v)})`);
}
// Dates are calendar dates: format in UTC so "2026-09-28" never shifts a day.
const fmtDate = (d) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
const isoDate = (d) => d.toISOString().slice(0, 10);
const shortDate = (d) => d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
// Reading time from the rendered text at ~230 words per minute (at least 1 minute).
const readMinutes = (html) => Math.max(1, Math.round(html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length / 230));

function slugFromFile(file) {
  return path.basename(file, path.extname(file))
    .replace(/^\d{4}-\d{2}-\d{2}-/, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const isTrue = (v) => v === true || v === 'true';

// ---------- load posts ----------
function loadPosts() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  const files = fs.readdirSync(POSTS_DIR).filter((f) => /\.(md|markdown)$/i.test(f));
  const posts = [];
  const seen = new Map();
  for (const f of files) {
    const { data, content } = matter(fs.readFileSync(path.join(POSTS_DIR, f), 'utf8'));
    if (isTrue(data.draft)) { console.log(`  skip draft: ${f}`); continue; }
    if (!data.title || !String(data.title).trim()) throw new Error(`${f}: missing "title"`);
    const slug = slugFromFile(f);
    if (!slug) throw new Error(`${f}: could not derive a slug from the filename`);
    if (seen.has(slug)) throw new Error(`Duplicate slug "${slug}": ${seen.get(slug)} and ${f}`);
    seen.set(slug, f);
    const date = toDate(data.date, f);
    const html = marked.parse(content, { gfm: true });
    posts.push({
      file: f,
      slug,
      url: `/journal/${slug}/`,
      title: String(data.title).trim(),
      description: data.description ? String(data.description).trim() : '',
      cover: data.cover ? String(data.cover).trim() : '',
      date,
      html,
      minutes: readMinutes(html),
    });
  }
  posts.sort((a, b) => b.date - a.date || a.title.localeCompare(b.title));
  return posts;
}

// ---------- templates ----------
// One system for every page (site-src/assets/site.css), modelled on an editorial product-launch layout:
//   - surface: one blue (#041EAA) full-bleed on every page, module panels in a lighter tone (#1830B1) inside full
//     hairline boxes, pure neutrals for text (white / #F2F2F2) and pills (#FFFFFF, #0A0A0A); orange only on the S mark;
//   - structure: a fixed left mono index nav with dots (a Menu sheet under 900px), mono kicker labels, pill buttons,
//     margin Notes, a faint fine grid behind everything;
//   - motion: Framed Drift between pages (site-src/assets/segue.css + site-src/segue.js), in menu order.
const SOCIAL = {
  email: 'jason@sanz.one',
  linkedin: 'https://linkedin.com/in/jasonsanzone',
  instagram: 'https://instagram.com/jasonsanzone',
  x: 'https://x.com/jasonsanzone',
};
const ROLES = [
  { key: 'cf', company: 'ClickFunnels', title: 'VP, Design/Creative', href: 'https://www.clickfunnels.com', host: 'clickfunnels.com', n: '01' },
  { key: 'os', company: 'Overskill', title: 'Co\u2011Founder & Head of Design', href: 'https://www.overskill.com', host: 'overskill.com', n: '02' },
];
const SUBLINE = 'Designing brands, products, and interfaces.';
const BIO_LEDE = "I'm a designer based just north of Atlanta, Georgia. I've spent my career building brands, products, and interfaces, including work for some of the world's most recognizable brands.";
const EXT = 'target="_blank" rel="noopener noreferrer"';
const BIO_REST = `Today I lead design and creative at <a class="vp-u" href="https://www.clickfunnels.com" ${EXT}>ClickFunnels</a> and co-founded <a class="vp-u" href="https://www.overskill.com" ${EXT}>Overskill</a>, where I head up design. Away from the screen, you'll find me outdoors, tinkering with new tech and AI, or hunting down gear that makes everyday life a little easier.`;
const PAGE_DESC = 'Jason Sanzone is a designer based just north of Atlanta, Georgia. He leads design and creative at ClickFunnels and co-founded Overskill, where he heads up design.';

const ARROW_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const OUT_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 17 17 7M8 7h9v9"/></svg>';
const BACK_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>';

// Menu order, top to bottom. It drives the index nav, the Framed Drift direction (site-src/segue.js: a move to a page
// higher in the list plays backwards), the Next link at the bottom of each page and the footer.
const PAGES = [
  { key: 'home', href: '/', label: 'Index', n: '00' },
  { key: 'work', href: '/work/', label: 'Work', n: '01' },
  { key: 'leadership', href: '/leadership/', label: 'Leadership', n: '02' },
  { key: 'building', href: '/building/', label: 'Building', n: '03' },
  { key: 'journal', href: '/journal/', label: 'Writing', n: '04' },
  { key: 'about', href: '/about/', label: 'About', n: '05' },
  { key: 'contact', href: '/contact/', label: 'Contact', n: '06' },
];
const PAGE = Object.fromEntries(PAGES.map((p) => [p.key, p]));
const S_MARK = fs.readFileSync(path.join(ROOT, 'site-src/assets/logo.svg'), 'utf8').trim()
  .replace(/^<svg[^>]*>/, '<svg class="vp-s" width="11" height="14" viewBox="0 0 105 137" fill="none" aria-hidden="true" focusable="false">');
const inline = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\/\*[\s\S]*?\*\//, '').split('\n').map((l) => l.trim()).join('').trim();
// Framed Drift direction: site-src/segue.js is inlined as a blocking <head> script.
const SEGUE_JS = inline('site-src/segue.js');
// Copy-email buttons and the mobile Menu (Escape closes it, a click outside closes it). No // comments or backslashes.
const UI_JS = "(function(d){d.addEventListener('click',function(e){var t=e.target&&e.target.closest?e.target.closest('[data-copy]'):null;if(t){var v=t.getAttribute('data-copy'),l=d.querySelector('.vp-live'),done=function(){t.textContent='Copied';if(l)l.textContent='Email copied';setTimeout(function(){t.textContent='Copy email';},1600);};if(navigator.clipboard){navigator.clipboard.writeText(v).then(done,function(){location.href='mailto:'+v;});}else{location.href='mailto:'+v;}}var m=d.querySelector('.vp-menu[open]');if(m&&!m.contains(e.target))m.removeAttribute('open');});d.addEventListener('keydown',function(e){var m=d.querySelector('.vp-menu[open]');if(e.key==='Escape'&&m){m.removeAttribute('open');var s=m.querySelector('summary');if(s)s.focus();}});})(document);";

const activeKey = (current) => (current === 'post' ? 'journal' : current);
function indexList(current) {
  const active = activeKey(current);
  return `<ol>${PAGES.map((p) => {
    const aria = current === p.key ? ' aria-current="page"' : p.key === active ? ' aria-current="true"' : '';
    return `<li><a href="${p.href}"${aria}><span class="vp-dot" aria-hidden="true"></span><span class="vp-n">${p.n}</span><span class="vp-l">${esc(p.label)}</span></a></li>`;
  }).join('')}</ol>`;
}
const indexNav = (current) => `<nav class="vp-index" aria-label="Site">${indexList(current)}</nav>`;
function menu(current) {
  const a = PAGE[activeKey(current)] || PAGE.home;
  return `<details class="vp-menu">
    <summary class="vp-pill vp-pill-dark"><span class="vp-menu-now mono" aria-hidden="true">${a.n} ${esc(a.label)}</span><span class="vp-menu-l">Menu</span></summary>
    <nav class="vp-menu-panel" aria-label="Site">${indexList(current)}</nav>
  </details>`;
}

// Speculation rules: every page prerenders the other menu destinations (Chrome/Edge), so a click activates an
// already-rendered page. rel=expect (in the head): the page does not paint until it is parsed up to #sz-end, so a
// fast page never paints a half page and Chrome does not skip the cross-document view transition.
const NAV_URLS = PAGES.map((p) => p.href);
function specRules(current, url) {
  const up = '../'.repeat(url.split('/').filter(Boolean).length) || './';
  const urls = NAV_URLS.filter((u) => u !== url).map((u) => up + u.slice(1));
  return `<script type="speculationrules">${JSON.stringify({ prerender: [{ urls, eagerness: 'immediate' }], prefetch: [{ urls, eagerness: 'immediate' }] })}</script>\n`;
}

// ---------- building blocks ----------
const kick = (t, dot = false) => `<p class="vp-kick">${dot ? '<span class="vp-dot" aria-hidden="true"></span>' : ''}${t}</p>`;
const pill = (href, label, kind = 'dark', ext = false) => `<a class="vp-pill vp-pill-${kind}" href="${href}"${ext ? ' ' + EXT : ''}>${label}${ext ? OUT_ICON : ARROW_ICON}</a>`;
const copyBtn = () => `<button class="vp-pill vp-pill-light" type="button" data-copy="${SOCIAL.email}">Copy email</button>`;
const socialPills = () => `<a class="vp-pill vp-pill-dark" href="${SOCIAL.linkedin}" ${EXT}>LinkedIn${OUT_ICON}</a><a class="vp-pill vp-pill-dark" href="${SOCIAL.instagram}" ${EXT}>Instagram${OUT_ICON}</a><a class="vp-pill vp-pill-dark" href="${SOCIAL.x}" ${EXT}>X${OUT_ICON}</a>`;
// A placeholder is a dashed hairline box with a "To add" tag: visibly not real content yet.
const ph = (label, text, cls = '') => `<div class="vp-mod vp-ph${cls}">
        <p class="vp-kick">${esc(label)}<span class="vp-tag">To add</span></p>
        <p class="vp-ph-t">[Jason to add: ${esc(text)}]</p>
      </div>`;
const pageHead = (key, title, lede = '', extra = '') => {
  const p = PAGE[key];
  return `<header class="vp-head">
      ${kick(`${p.n}<span class="vp-sep" aria-hidden="true">/</span>${esc(p.label)}`, true)}
      <h1>${title}</h1>
      ${lede ? `<p class="vp-lede">${lede}</p>` : ''}${extra}
    </header>`;
};
const sec = (id, label, inner) => `<section class="vp-sec" aria-labelledby="s-${id}">
      <h2 class="vp-kick" id="s-${id}">${esc(label)}</h2>
      ${inner}
    </section>`;
const notes = (items) => `<aside class="vp-notes" aria-label="Notes">
      <p class="vp-kick">Notes</p>
      <ol>${items.map((t, i) => `<li><span class="vp-n">[${i + 1}]</span><span>${t}</span></li>`).join('')}</ol>
    </aside>`;
function nextLink(key) {
  const i = PAGES.findIndex((p) => p.key === key), nx = PAGES[i + 1];
  if (!nx) return '';
  return `<a class="vp-next" href="${nx.href}"><span class="vp-kick">Next</span><span class="vp-next-t"><span class="vp-n">${nx.n}</span>${esc(nx.label)}</span>${ARROW_ICON}</a>`;
}
const FOOTER = `<footer class="vp-foot">
  <p class="vp-foot-id">${S_MARK}<span>&copy; ${new Date().getFullYear()} ${esc(SITE.name)}</span></p>
  <nav class="vp-foot-links" aria-label="Elsewhere"><a href="mailto:${SOCIAL.email}">${SOCIAL.email}</a><a href="${SOCIAL.linkedin}" ${EXT}>LinkedIn</a><a href="${SOCIAL.instagram}" ${EXT}>Instagram</a><a href="${SOCIAL.x}" ${EXT}>X</a><a href="/journal/feed.xml">RSS</a></nav>
</footer>`;

function layout({ title, description, url, ogType = 'website', image = '', card: cardType = '', current = '', extraHead = '', body, aside = '', next = true }) {
  const card = cardType || (image ? 'summary_large_image' : 'summary');
  return `<!DOCTYPE html>
<html lang="${SITE.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<script>${SEGUE_JS}</script>
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(abs(url))}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="alternate" type="application/rss+xml" title="${esc(SITE.name)} · ${esc(SITE.journalTitle)}" href="/journal/feed.xml">
<link rel="preload" href="/assets/fonts/inter-latin-wght.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/site.css">
<link rel="stylesheet" href="/assets/segue.css">
<link rel="expect" href="#sz-end" blocking="render">
${specRules(current, url)}<meta name="theme-color" content="#041EAA">
<meta name="color-scheme" content="dark">
<meta property="og:site_name" content="${esc(SITE.name)}">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(abs(url))}">
${image ? `<meta property="og:image" content="${esc(abs(image))}">\n` : ''}<meta name="twitter:card" content="${card}">
<meta name="twitter:site" content="@jasonsanzone">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
${image ? `<meta name="twitter:image" content="${esc(abs(image))}">\n` : ''}${extraHead}</head>
<body class="vp-on-${current || 'page'}">
<a class="vp-skip" href="#content">Skip to content</a>
<header class="vp-top">
  <a class="vp-brand sz-seg-home" href="/"${current === 'home' ? ' aria-current="page"' : ''}>${S_MARK}<span class="vp-brand-n">${esc(SITE.name)}</span><span class="vp-brand-t mono">VP Design</span></a>
  <div class="vp-top-r">
    <a class="vp-pill vp-pill-light vp-top-cta" href="/contact/"${current === 'contact' ? ' aria-current="page"' : ''}>Get in touch</a>
    ${menu(current)}
  </div>
</header>
${indexNav(current)}
<main class="vp-main" id="content">
  <div class="vp-grid${aside ? ' vp-has-notes' : ''}">
    <div class="vp-body">
    ${body}
    </div>
    ${aside}
  </div>
  ${next ? nextLink(current) : ''}
</main>
${FOOTER}
<p class="vp-live" role="status" aria-live="polite"></p>
<script>${UI_JS}</script>
<i id="sz-end" hidden></i>
</body>
</html>
`;
}

// ---------- pages ----------
const cfLink = `<a class="vp-u" href="${ROLES[0].href}" ${EXT}>ClickFunnels</a>`;
const osLink = `<a class="vp-u" href="${ROLES[1].href}" ${EXT}>Overskill</a>`;

// / Index: positioning, the two roles, an At a glance strip waiting on real numbers, and a contents grid.
function homePage(posts) {
  const latest = posts[0];
  const ENTRY = {
    work: 'VP, Design/Creative at ClickFunnels. Co-founder and head of design at Overskill.',
    leadership: 'Taste is the new bottleneck, and it doesn\u2019t scale with headcount.',
    building: 'Designing Overskill, an AI app builder.',
    journal: latest ? `Latest: ${latest.title}` : SITE.journalSubline,
    about: 'A designer based just north of Atlanta, Georgia.',
    contact: SOCIAL.email,
  };
  const entries = PAGES.filter((p) => p.key !== 'home').map((p) => `<a class="vp-mod vp-entry" href="${p.href}">
          <span class="vp-kick"><span class="vp-n">${p.n}</span>${esc(p.label)}</span>
          <span class="vp-entry-s">${esc(ENTRY[p.key])}</span>
          <span class="vp-entry-go" aria-hidden="true">${ARROW_ICON}</span>
        </a>`).join('\n        ');
  return layout({
    title: `${SITE.name} · ${SUBLINE.replace(/\.$/, '')}`,
    description: PAGE_DESC,
    url: '/',
    image: '/media/about/jason.jpg',
    card: 'summary',
    current: 'home',
    body: `<header class="vp-head vp-head-home">
      ${kick(`${esc(SITE.name)}<span class="vp-sep" aria-hidden="true">/</span>North of Atlanta, GA`, true)}
      <h1>${esc(SUBLINE)}</h1>
      <p class="vp-lede">VP, Design/Creative at ${cfLink}. Co-founder and head of design at ${osLink}, an AI app builder.</p>
      <div class="vp-pills">${pill('/work/', 'See the work', 'light')}${pill('/journal/', 'Read the writing')}</div>
    </header>
    ${sec('glance', 'At a glance', `<div class="vp-mods vp-cols-3">
      ${ph('Years', 'years leading design')}
      ${ph('Team', 'team size you lead')}
      ${ph('Result', 'one headline result, e.g. a metric you moved')}
    </div>`)}
    ${sec('contents', 'Contents', `<div class="vp-mods vp-cols-3">
        ${entries}
      </div>`)}`,
    aside: notes([
      `${esc(ROLES[0].company)}: <a class="vp-u" href="${ROLES[0].href}" ${EXT}>${ROLES[0].host}</a>`,
      `${esc(ROLES[1].company)}: <a class="vp-u" href="${ROLES[1].href}" ${EXT}>${ROLES[1].host}</a>`,
      'Bracketed boxes marked To add are waiting on real numbers.',
    ]),
  });
}

// /work/: the two roles, selected work (placeholders until the case studies exist), earlier work.
function workPage() {
  const roles = ROLES.map((r) => `<div class="vp-mod vp-role">
        <p class="vp-kick"><span class="vp-n">Role ${r.n}</span>${esc(r.host)}</p>
        <h3 class="vp-h3">${esc(r.company)}</h3>
        <p class="vp-role-t">${esc(r.title)}</p>
        ${r.key === 'os' ? '<p class="vp-body-t">An AI app builder. I co-founded it and head up design.</p>' : '<p class="vp-body-t">I lead design and creative.</p>'}
        <div class="vp-pills">${pill(r.href, esc(r.host), 'dark', true)}</div>
      </div>`).join('\n      ');
  return layout({
    title: `Work · ${SITE.name}`,
    description: PAGE_DESC,
    url: '/work/',
    current: 'work',
    body: `${pageHead('work', 'Two roles, one practice.', `Today I lead design and creative at ${cfLink} and co-founded ${osLink}, where I head up design.`)}
    ${sec('roles', 'Currently', `<div class="vp-mods vp-cols-2">
      ${roles}
    </div>`)}
    ${sec('selected', 'Selected work', `<div class="vp-mods vp-cols-3">
      ${ph('Case study 01', 'problem, decision, outcome')}
      ${ph('Case study 02', 'problem, decision, outcome')}
      ${ph('Case study 03', 'problem, decision, outcome')}
    </div>`)}
    ${sec('earlier', 'Earlier', `<div class="vp-mods vp-cols-2">
      <div class="vp-mod">
        <p class="vp-kick">Career</p>
        <p class="vp-body-t vp-big">Brands, products, and interfaces, including work for some of the world\u2019s most recognizable brands.</p>
      </div>
      ${ph('Brands', 'brands you can name publicly')}
    </div>`)}`,
    aside: notes([
      'Overskill is an AI app builder.',
      'Each case study will read problem, decision, outcome.',
    ]),
  });
}

// /leadership/: principles quoted verbatim from the posts, each linking to its post, then scope placeholders.
const PRINCIPLES = [
  ['Judgment', 'Taste is the new bottleneck, and it doesn\u2019t scale with headcount.', 'size-isnt-everything'],
  ['Leverage', 'Use the tools hard, hire only for leverage or judgment you don\u2019t have, and keep the path from idea to shipped short.', 'size-isnt-everything'],
  ['Craft', 'The first version of almost anything is fine. The tenth version is where it starts to feel like someone cared.', 'caring-too-much-is-underrated'],
  ['Shipping', 'Taste is also knowing when to stop polishing and ship.', 'caring-too-much-is-underrated'],
  ['Who I hire for', 'Obsession. Pattern recognition. Zero deference. Delusional optimism. They\u2019re more like a stack.', 'the-formula-nobody-puts-on-a-resume'],
];
const quoteMod = (label, q, p, cls = '') => `<figure class="vp-mod vp-quote${cls}">
        <p class="vp-kick">${esc(label)}</p>
        <blockquote><p>${esc(q)}</p></blockquote>
        ${p ? `<figcaption><a class="vp-pill vp-pill-dark" href="${p.url}">${esc(p.title)}${ARROW_ICON}</a></figcaption>` : ''}
      </figure>`;
function leadershipPage(posts) {
  const bySlug = new Map(posts.map((p) => [p.slug, p]));
  const mods = PRINCIPLES.map(([l, q, s], i) => quoteMod(l, q, bySlug.get(s), i === 0 ? ' vp-span-2' : '')).join('\n      ');
  return layout({
    title: `Leadership · ${SITE.name}`,
    description: 'How Jason Sanzone leads design: judgment, leverage, craft, and shipping.',
    url: '/leadership/',
    current: 'leadership',
    body: `${pageHead('leadership', 'How I lead design.', 'Small teams with good tools and good taste are about to beat the big ones.')}
    ${sec('principles', 'Principles', `<div class="vp-mods vp-cols-2">
      ${mods}
    </div>`)}
    ${sec('scope', 'The team', `<div class="vp-mods vp-cols-2">
      ${ph('Scope', 'team size, disciplines on the team, and who you report to')}
      ${ph('How the team works', 'critique, rituals, hiring bar')}
    </div>`)}`,
    aside: notes([
      'Every principle is quoted from a post in Writing.',
      'Lede: from Size Isn\u2019t Everything.',
    ]),
  });
}

// /building/: Overskill and AI, in his own words, plus product placeholders.
function buildingPage(posts) {
  const bySlug = new Map(posts.map((p) => [p.slug, p]));
  return layout({
    title: `Building · ${SITE.name}`,
    description: 'Jason Sanzone co-founded Overskill, an AI app builder, where he heads up design.',
    url: '/building/',
    current: 'building',
    body: `${pageHead('building', 'Building with AI at Overskill.', `I co-founded ${osLink}, an AI app builder, where I head up design.`, `
      <div class="vp-pills">${pill(ROLES[1].href, 'overskill.com', 'light', true)}</div>`)}
    ${sec('speed', 'In practice', `<div class="vp-mods vp-cols-2">
      ${quoteMod('Speed', 'Building Overskill, I watch things that used to take a sprint get done in an afternoon. When making things gets that cheap, having lots of people who make things stops being the advantage.', bySlug.get('size-isnt-everything'), ' vp-span-2')}
      ${quoteMod('Fine vs. good', 'AI can spit out a screen in seconds, and most of it looks fine. Fine is everywhere.', bySlug.get('caring-too-much-is-underrated'))}
      ${quoteMod('What stays human', 'AI can do the first draft. It can\u2019t do that stack. That\u2019s still on you.', bySlug.get('the-formula-nobody-puts-on-a-resume'))}
    </div>`)}
    ${sec('product', 'The product', `<div class="vp-mods vp-cols-2">
      ${ph('Product', 'Overskill product screenshots', ' vp-span-2 vp-ph-shot')}
      ${ph('Milestone', 'an Overskill milestone you can share, e.g. launch date or users', ' vp-span-2')}
    </div>`)}`,
    aside: notes([
      `Overskill: <a class="vp-u" href="${ROLES[1].href}" ${EXT}>overskill.com</a>`,
      'Quotes are from the posts in Writing.',
    ]),
  });
}

// /journal/ (Writing): the post list.
function postCard(p) {
  return `<li><a class="vp-mod vp-post" href="${p.url}">
        <span class="vp-kick"><time datetime="${isoDate(p.date)}">${shortDate(p.date)}</time><span class="vp-sep" aria-hidden="true">/</span>${p.minutes} min read</span>
        <h2 class="vp-post-t">${esc(p.title)}</h2>
        ${p.description ? `<span class="vp-body-t">${esc(p.description)}</span>` : ''}
        <span class="vp-entry-go" aria-hidden="true">${ARROW_ICON}</span>
      </a></li>`;
}
function indexPage(posts) {
  return layout({
    title: `Writing · ${SITE.name}`,
    description: SITE.journalDescription,
    url: '/journal/',
    current: 'journal',
    body: `${pageHead('journal', 'Writing.', esc(SITE.journalSubline), `
      <div class="vp-pills"><a class="vp-pill vp-pill-dark" href="/journal/feed.xml">RSS feed</a></div>`)}
    <section class="vp-sec" aria-label="Posts">
      ${posts.length ? `<ol class="vp-posts" reversed>
      ${posts.map(postCard).join('\n      ')}
      </ol>` : '<p class="vp-body-t">First post coming soon.</p>'}
    </section>`,
    aside: notes([`${posts.length} post${posts.length === 1 ? '' : 's'}, newest first.`, 'Subscribe with the RSS feed.']),
  });
}

function postPage(p) {
  const desc = p.description || `${p.title}, by ${SITE.name}.`;
  const back = `<a class="vp-pill vp-pill-dark vp-back" href="/journal/">${BACK_ICON}<span>Writing</span></a>`;
  return layout({
    title: `${p.title} · ${SITE.name}`,
    description: desc,
    url: p.url,
    ogType: 'article',
    current: 'post',
    image: p.cover,
    extraHead: `<meta property="article:published_time" content="${p.date.toISOString()}">\n<meta property="article:author" content="${esc(SITE.name)}">\n`,
    body: `<article class="vp-article">
      <header class="vp-head">
        ${back}
        ${kick(`04<span class="vp-sep" aria-hidden="true">/</span>Writing<span class="vp-sep" aria-hidden="true">/</span><time datetime="${isoDate(p.date)}">${fmtDate(p.date)}</time><span class="vp-sep" aria-hidden="true">/</span>${p.minutes} min read`, true)}
        <h1>${esc(p.title)}</h1>
        ${p.description ? `<p class="vp-lede">${esc(p.description)}</p>` : ''}
      </header>
      ${p.cover ? `<img class="vp-cover" src="${esc(p.cover)}" alt="">` : ''}
      <div class="vp-prose">
${p.html}
      </div>
      <footer class="vp-pills vp-article-foot">${back}<a class="vp-pill vp-pill-light" href="/contact/">Get in touch${ARROW_ICON}</a></footer>
    </article>`,
    next: false,
  });
}

function feed(posts) {
  const items = posts.slice(0, 50).map((p) => {
    const html = p.html.replace(/(\s(?:href|src))="\/(?!\/)/g, `$1="${SITE.url}/`);
    return `    <item>
      <title>${esc(p.title)}</title>
      <link>${abs(p.url)}</link>
      <guid isPermaLink="true">${abs(p.url)}</guid>
      <pubDate>${p.date.toUTCString()}</pubDate>
${p.description ? `      <description>${esc(p.description)}</description>\n` : ''}      <content:encoded>${cdata(html)}</content:encoded>
    </item>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${esc(SITE.name)} · ${esc(SITE.journalTitle)}</title>
    <link>${SITE.url}/journal/</link>
    <description>${esc(SITE.journalDescription)}</description>
    <language>en-us</language>
${posts.length ? `    <lastBuildDate>${posts[0].date.toUTCString()}</lastBuildDate>\n` : ''}    <atom:link href="${SITE.url}/journal/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}

// /about/: the existing bio, word for word, beside the photo.
const PHOTO = `<picture>
          <source srcset="/media/about/jason.webp" type="image/webp">
          <img src="/media/about/jason.jpg" alt="Jason Sanzone" width="480" height="480" decoding="async">
        </picture>`;
function aboutPage() {
  return layout({
    title: `About · ${SITE.name}`,
    description: PAGE_DESC,
    url: '/about/',
    ogType: 'profile',
    image: '/media/about/jason.jpg',
    card: 'summary',
    current: 'about',
    body: `${pageHead('about', 'About.')}
    <div class="vp-about">
      <div class="vp-mod vp-photo">${PHOTO}</div>
      <div class="vp-about-t">
        <p class="vp-lede">${esc(BIO_LEDE)}</p>
        <p class="vp-body-t">${BIO_REST}</p>
      </div>
    </div>`,
    aside: notes(['Based just north of Atlanta, Georgia.']),
  });
}

// /contact/: the email, a copy button, socials.
function contactPage() {
  return layout({
    title: `Contact · ${SITE.name}`,
    description: PAGE_DESC,
    url: '/contact/',
    current: 'contact',
    next: false,
    body: `${pageHead('contact', 'Get in touch.')}
    <div class="vp-mod vp-contact">
      <p class="vp-kick">Email</p>
      <a class="vp-email" href="mailto:${SOCIAL.email}">${SOCIAL.email}</a>
      <div class="vp-pills">${copyBtn()}${socialPills()}</div>
    </div>`,
    aside: notes(['Email is the fastest way to reach me.']),
  });
}

// ---------- Redirects ----------
function redirectPage(to) {
  const url = abs(to);
  return `<!DOCTYPE html>
<html lang="${SITE.lang}">
<head>
<meta charset="utf-8">
<title>Moved to ${esc(url)}</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${esc(url)}">
<meta http-equiv="refresh" content="0; url=${esc(to)}">
<script>${SEGUE_JS}</script>
<script>location.replace(${JSON.stringify(to)} + location.search + location.hash);</script>
<link rel="stylesheet" href="/assets/site.css">
<link rel="stylesheet" href="/assets/segue.css">
<style>body{background:#041EAA;color:#F2F2F2;font:15px Inter,system-ui,sans-serif;padding:28px}a{color:#fff}</style>
</head>
<body>
<p>This page has moved to <a href="${esc(to)}">${esc(url)}</a>.</p>
</body>
</html>
`;
}

// ---------- build ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

for (const f of ROOT_FILES) {
  const src = path.join(ROOT, f);
  if (!fs.existsSync(src)) throw new Error(`Missing root file: ${f}`);
  fs.copyFileSync(src, path.join(OUT, f));
}
if (fs.existsSync(path.join(ROOT, 'media'))) fs.cpSync(path.join(ROOT, 'media'), path.join(OUT, 'media'), { recursive: true, filter: (s) => path.basename(s) !== '.gitkeep' });
fs.cpSync(path.join(ROOT, 'site-src/assets'), path.join(OUT, 'assets'), { recursive: true });

const posts = loadPosts();
write('journal/index.html', indexPage(posts));
for (const p of posts) write(`journal/${p.slug}/index.html`, postPage(p));
const feedXml = feed(posts);
write('journal/feed.xml', feedXml);

// Old /blog URLs (GitHub Pages has no server-side redirects)
write('blog/index.html', redirectPage('/journal/'));
for (const p of posts) write(`blog/${p.slug}/index.html`, redirectPage(p.url));
write('blog/feed.xml', feedXml);
write('index.html', homePage(posts));
write('work/index.html', workPage());
write('leadership/index.html', leadershipPage(posts));
write('building/index.html', buildingPage(posts));
write('about/index.html', aboutPage());
write('contact/index.html', contactPage());

console.log(`Built ${posts.length} post(s) into ${path.relative(ROOT, OUT)}/`);
