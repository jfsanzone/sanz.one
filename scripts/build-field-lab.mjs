// Field lab: an unlinked, noindex copy of the whole site with the Studio / Field switch (and the smaller type),
// built under a secret path /<slug>/ only when SZ_LAB_FIELD holds that slug (CI: repository secret of the same
// name). The slug is never committed or printed. Run by scripts/build.mjs after the main build; it only ever
// writes _site/<slug>/, so the main pages' output does not change.
// Sources: site-src/labs/field/ (theme.js, nav.js, landing.html, assets overlay, samples/, icons.mjs); posts and
// media are the main ones (content/posts, media/). Every lab page: noindex/nofollow, no-referrer, no canonical,
// feed, sitemap or /blog redirects; every root-relative URL (links, assets, media, speculation rules, the nav
// script) is rewritten to stay inside /<slug>/; its own localStorage key ("sz-side-lab-field").
// The 3 SAMPLE posts (samples/) are built here only, with their Sample tags; the main build never reads them.
// Photo slot: drop site-src/labs/field/assets/jason-field.(jpg|webp|png) to give the Field About its own photo;
// until then it falls back to the current photo (media/about/jason.*).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { marked } from 'marked';
import { pick as pickIcons } from '../site-src/labs/field/icons.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LAB = path.join(ROOT, 'site-src/labs/field');
const SLUG = (process.env.SZ_LAB_FIELD || '').trim();
if (!SLUG) { console.log('  lab field: no path configured, skipped'); process.exit(0); }
if (!/^[a-z0-9][a-z0-9-]{5,63}$/.test(SLUG) || ['about', 'journal', 'blog', 'assets', 'media'].includes(SLUG)) throw new Error('lab field: invalid path in SZ_LAB_FIELD');
const P = `/${SLUG}`;
const KEY = 'sz-side-lab-field';
const FINAL = path.join(ROOT, '_site', SLUG);
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'sz-lab-field-'));
const POSTS_DIR = path.join(ROOT, 'content/posts');
const SAMPLES_DIR = path.join(LAB, 'samples');
const ICONS = pickIcons();
const once = (s, a, b) => {
  const n = s.split(a).length - 1;
  if (n !== 1) throw new Error(`lab field: expected one "${a.slice(0, 48)}", found ${n}`);
  return s.replace(a, () => b);
};

const SITE = {
  url: 'https://sanz.one',
  name: 'Jason Sanzone',
  journalTitle: 'Journal',
  journalDescription: 'Jason Sanzone on design, AI, EDC and gear, and everything else.',
  journalSubline: 'Notes on design, AI, gear, and everything else.',
  lang: 'en',
};

const ROOT_FILES = ['index.html', 'favicon.svg', 'CNAME', '.nojekyll'];

// ---------- helpers ----------
const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const cdata = (s = '') => '<![CDATA[' + String(s).replace(/]]>/g, ']]]]><![CDATA[>') + ']]>';
const abs = (p) => (/^https?:\/\//i.test(p) ? p : SITE.url + (p.startsWith('/') ? p : '/' + p));

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
function loadPosts(dir = POSTS_DIR, sample = false) {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) => /\.(md|markdown)$/i.test(f));
  const posts = [];
  const seen = new Map();
  for (const f of files) {
    const { data, content } = matter(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (isTrue(data.draft) && !(sample && isTrue(data.sample))) { console.log(`  skip draft: ${f}`); continue; }
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
      coverCredit: data.cover_credit ? String(data.cover_credit).trim() : '',
      date,
      html,
      minutes: readMinutes(html),
      // Studio / Field: which side of the site the post belongs to (default studio); Field posts can carry a
      // location / elevation / weather line (shown in mono).
      side: String(data.side || 'studio').trim().toLowerCase() === 'field' ? 'field' : 'studio',
      sample: sample && isTrue(data.sample),
      field: [data.location, data.elevation, data.weather].filter(Boolean).map((v) => String(v).trim()),
    });
  }
  posts.sort((a, b) => b.date - a.date || a.title.localeCompare(b.title));
  return posts;
}

// ---------- templates ----------
// Studio / Field: both copies of anything that differs are in the page; CSS shows .sz-s (Studio) or .sz-f (Field)
// from html[data-side] (site-src/theme.js), so switching never re-renders and there is no flash.
const FIELD = {
  place: 'Ball Ground, Georgia',
  coords: '34.34° N, 84.38° W',
  journal: 'Field Notes',
  subline: 'Trips, tools, and notes from the north Georgia woods.',
};
const sides = (studio, field) => `<span class="sz-s">${studio}</span><span class="sz-f">${field}</span>`;
const FOOTER = `<footer class="sz-footer">
    <span class="sz-roles sz-s"><span class="sz-role">VP, Design/Creative, <a class="sz-u" href="https://www.clickfunnels.com" target="_blank" rel="noopener noreferrer">ClickFunnels</a></span><span class="sz-sep" aria-hidden="true">  ·  </span><span class="sz-role">Co-Founder &amp; Head of Design, <a class="sz-u" href="https://www.overskill.com" target="_blank" rel="noopener noreferrer">Overskill</a></span></span>
    <span class="sz-f sz-coords">${FIELD.place}<span aria-hidden="true">  ·  </span>${FIELD.coords}</span>
  </footer>`;

const ARROW_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const BACK_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>';

// Top-left segmented nav on journal + about pages: [ logo | About | Journal ]. The landing page (index.html)
// carries an identical nav (in its shell and its bundled template). Behaviour lives in site-src/nav.js
// (inlined right after the nav): the page being left is remembered and the thumb slides from it, and the
// nav has a fixed view-transition-name so it stays put across pages while only the content crossfades.
const NAV_ITEMS = [['about', '/about/', 'About'], ['journal', '/journal/', sides('Journal', FIELD.journal)]];
// The logo mark is inlined (fill -> currentColor): orange in the nav, #0A0A0A in the highlight's dark copy.
const LOGO_MARK = fs.readFileSync(path.join(ROOT, 'site-src/assets/logo.svg'), 'utf8').trim()
  .replace(/^<svg[^>]*>/, '<svg width="16.1" height="21" viewBox="0 0 105 137" fill="none" aria-hidden="true" focusable="false">')
  .replaceAll('fill="#FA431E"', 'fill="currentColor"');
const labNavJs = (js) => once(js, 'var p = a.pathname;', `var p = a.pathname;if (p.slice(0, ${P.length + 1}) !== '${P}/') return null;p = p.slice(${P.length});`);
const NAV_JS = labNavJs(fs.readFileSync(path.join(LAB, 'nav.js'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//, '').split('\n').map((l) => l.trim()).join('').trim());
// Studio / Field: site-src/theme.js is inlined at the top of every <head> (applies the saved side before first
// paint); the Studio | Field switch sits top right, next to the nav in the persistent header.
const labThemeJs = (js) => once(js, "K = 'sz-side'", `K = '${KEY}'`);
const THEME_JS = labThemeJs(fs.readFileSync(path.join(LAB, 'theme.js'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//, '').split('\n').map((l) => l.trim()).join('').trim());
// Switch icons: site-src/labs/field/icons.mjs (PICK), 16px.
// role=switch: "Field mode", checked = Field. The two labels are visual only (the knob slides behind the active one).
// abs: absolutely positioned top right (landing page); on the other pages it is the last item of the header row.
function themeButton(abs = false) {
  return `<button type="button" class="sz-side${abs ? ' sz-side-abs' : ''}" data-icons="${ICONS.id}" role="switch" aria-checked="false" aria-label="Field mode"><span class="sz-side-knob" aria-hidden="true"></span><span class="sz-side-opt sz-side-os" aria-hidden="true">${ICONS.studioSvg}Studio</span><span class="sz-side-opt sz-side-of" aria-hidden="true">${ICONS.fieldSvg}Field</span><span class="sz-side-live" role="status" aria-live="polite"></span></button><script>window.__szTheme && window.__szTheme.sync();</script>`;
}

function nav(current) {
  const active = current === 'post' ? 'journal' : current;
  const home = `<a class="sz-seg-item sz-seg-home" data-key="home" href="${P}/" aria-label="Home">${LOGO_MARK}</a>`;
  const items = NAV_ITEMS.map(([key, href, label]) => {
    const aria = current === key ? ' aria-current="page"' : key === active ? ' aria-current="true"' : '';
    return `<a class="sz-seg-item" data-key="${key}" href="${P}${href}"${aria}>${label}</a>`;
  }).join('');
  const ink = `<span class="sz-seg-ink"><span class="sz-seg-ink-home">${LOGO_MARK}</span>${NAV_ITEMS.map(([, , label]) => `<span>${label}</span>`).join('')}</span>`;
  return `<nav class="sz-seg" data-active="${active}" aria-label="Site"><span class="sz-seg-thumb" aria-hidden="true"><span class="sz-seg-p"></span><span class="sz-seg-p"></span><span class="sz-seg-p"></span><span class="sz-seg-win">${ink}</span></span>${home}${items}</nav><script>${NAV_JS}(document.currentScript.previousElementSibling);</script>`;
}

// Speculation rules: every page prerenders the other nav destinations as soon as it loads (Chrome/Edge), so a
// nav click activates an already-rendered page (landing included, bundle already booted) instead of waiting
// for the network, parsing and booting. Browsers without speculation rules ignore this. The landing page
// carries the same rules (without "/") in its bundled template.
// rel=expect: the page does not paint until it is fully parsed (up to #sz-end). Without it, a fast page could
// paint its first frame with only the nav parsed, which made Chrome skip the cross-document view transition
// (old page "aborted because of invalid state") and then hold the content back for ~0.5s.
const NAV_URLS = ['/', '/about/', '/journal/'];
function specRules(current) {
  const self = { about: '/about/', journal: '/journal/' }[current];
  const urls = NAV_URLS.filter((u) => u !== self).map((u) => P + u);
  return `<script type="speculationrules">${JSON.stringify({ prerender: [{ urls, eagerness: 'immediate' }], prefetch: [{ urls, eagerness: 'immediate' }] })}</script>\n`;
}

function layout({ title, description, url, ogType = 'website', image = '', card: cardType = '', current = '', extraHead = '', body }) {
  const card = cardType || (image ? 'summary_large_image' : 'summary');
  return `<!DOCTYPE html>
<html lang="${SITE.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script>${THEME_JS}</script>
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="noindex, nofollow">
<meta name="referrer" content="no-referrer">
<link rel="icon" type="image/svg+xml" href="${P}/favicon.svg">
<link rel="preload" href="${P}/assets/fonts/geist-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${P}/assets/site.css">
<link rel="expect" href="#sz-end" blocking="render">
${specRules(current)}<meta name="theme-color" content="#121211">
<meta property="og:site_name" content="${esc(SITE.name)}">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
${image ? `<meta property="og:image" content="${esc(abs(P + image))}">\n` : ''}<meta name="twitter:card" content="${card}">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
${image ? `<meta name="twitter:image" content="${esc(abs(P + image))}">\n` : ''}${extraHead}</head>
<body>
<main class="sz-main">
  <header class="sz-top">
    ${nav(current)}
    ${themeButton()}
  </header>
  ${body}
  ${FOOTER}
</main>
<i id="sz-end" hidden></i>
</body>
</html>
`;
}

// Journal index: each post is a full-width rounded card (one link): date + reading time, title, a 2-line
// description, an optional cover thumbnail on the right (stacked on top on small screens) and an arrow.
function postCard(p) {
  const thumb = p.cover ? `<span class="sz-card-thumb"><img src="${esc(P + p.cover)}" alt="" loading="lazy" decoding="async"></span>` : '';
  // Field posts: a mono line with location / elevation / weather, and a SAMPLE tag on mockup posts.
  const field = p.field.length ? `<span class="sz-card-field">${p.field.map(esc).join(' · ')}</span>` : '';
  const sample = p.sample ? '<span class="sz-sample">Sample</span>' : '';
  return `<li><a class="sz-card${p.cover ? ' sz-card-has-thumb' : ''}${p.side === 'field' ? ' sz-card-f' : ''}" href="${P}${p.url}">
        <div class="sz-card-body">
          <div class="sz-card-meta">${sample}<time datetime="${isoDate(p.date)}">${shortDate(p.date)}</time><span aria-hidden="true">·</span><span>${p.minutes} min read</span></div>
          ${field}
          <h2 class="sz-card-title">${esc(p.title)}</h2>
          ${p.description ? `<p class="sz-card-desc">${esc(p.description)}</p>` : ''}
        </div>
        ${thumb}<span class="sz-card-arrow" aria-hidden="true">${ARROW_ICON}<span class="sz-card-arrow-hot">${ARROW_ICON}</span></span>
      </a></li>`;
}

function indexPage(posts) {
  // Both lists are in the page: Studio posts show in Studio mode, Field posts in Field mode.
  const list = (ps, side, empty) => (ps.length
    ? `<ol class="sz-posts sz-${side}" reversed>
      ${ps.map(postCard).join('\n      ')}
    </ol>`
    : `<p class="sz-empty sz-${side}">${empty}</p>`);
  const studio = list(posts.filter((p) => p.side !== 'field'), 's', 'First post coming soon.');
  const field = list(posts.filter((p) => p.side === 'field'), 'f', 'First field notes coming soon.');
  return layout({
    title: `${SITE.journalTitle} · ${SITE.name}`,
    description: SITE.journalDescription,
    url: '/journal/',
    current: 'journal',
    body: `<section class="sz-content">
    <h1 class="sz-h1">${sides(esc(SITE.journalTitle), esc(FIELD.journal))}</h1>
    <p class="sz-sub">${sides(esc(SITE.journalSubline), esc(FIELD.subline))}</p>
    ${studio}
    ${field}
  </section>`,
  });
}

function postPage(p) {
  const desc = p.description || `${p.title}, by ${SITE.name}.`;
  const back = `<a class="sz-back" href="${P}/journal/">${BACK_ICON}<span>${sides(esc(SITE.journalTitle), esc(FIELD.journal))}</span></a>`;
  return layout({
    title: `${p.title} · ${SITE.name}`,
    description: desc,
    url: p.url,
    ogType: 'article',
    current: 'post',
    image: p.cover,
    extraHead: `<meta property="article:published_time" content="${p.date.toISOString()}">\n<meta property="article:author" content="${esc(SITE.name)}">\n`,
    body: `<section class="sz-content">
    ${back}
    <article class="sz-article">
      <header>
        <h1 class="sz-article-title">${esc(p.title)}</h1>
        <p class="sz-article-meta"><time datetime="${isoDate(p.date)}">${fmtDate(p.date)}</time></p>
        ${p.field.length ? `<p class="sz-article-field">${p.field.map(esc).join(' · ')}</p>` : ''}
        ${p.sample ? '<p class="sz-sample-note"><span class="sz-sample">Sample</span> Placeholder post for the Field mockup: not real content.</p>' : ''}
      </header>
      ${p.cover ? `<img class="sz-cover" src="${esc(P + p.cover)}" alt="">` : ''}${p.coverCredit ? `<p class="sz-credit">${esc(p.coverCredit)}</p>` : ''}
      <div class="sz-prose">
${p.html}
      </div>
      <footer class="sz-article-foot">${back}</footer>
    </article>
  </section>`,
  });
}

// ---------- About ----------
const SOCIAL = {
  email: 'jason@sanz.one',
  linkedin: 'https://linkedin.com/in/jasonsanzone',
  instagram: 'https://instagram.com/jasonsanzone',
  x: 'https://x.com/jasonsanzone',
};
const spin = '<animateTransform attributeName="gradientTransform" type="rotate" values="0 .5 .5;360 .5 .5" dur="7s" repeatCount="indefinite"></animateTransform>';
// Icons copied from the landing page (index.html); hover swaps the fill/stroke to the same rotating brand gradient ("Prism").
const TILES = `<nav class="sz-social" aria-label="Social">
        <a class="sz-tile sz-tile-li" href="${SOCIAL.linkedin}" target="_blank" rel="noopener" aria-label="LinkedIn" title="LinkedIn"><svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="gli" x1="0" y1="0" x2="1" y2="1"><stop offset="0.00" stop-color="#6FB6FF"></stop><stop offset="0.50" stop-color="#0A66C2"></stop><stop offset="1.00" stop-color="#3D9BFF"></stop>${spin}</linearGradient></defs><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z"></path></svg></a>
        <a class="sz-tile sz-tile-ig" href="${SOCIAL.instagram}" target="_blank" rel="noopener" aria-label="Instagram" title="Instagram"><svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke-width="1.9" aria-hidden="true"><defs><linearGradient id="gig" x1="0" y1="0" x2="1" y2="1"><stop offset="0.00" stop-color="#FEDA75"></stop><stop offset="0.25" stop-color="#FA7E1E"></stop><stop offset="0.50" stop-color="#D62976"></stop><stop offset="0.75" stop-color="#962FBF"></stop><stop offset="1.00" stop-color="#4F5BD5"></stop>${spin}</linearGradient></defs><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4.2"></circle><circle class="sz-dot" cx="17.4" cy="6.6" r=".6"></circle></svg></a>
        <a class="sz-tile sz-tile-x" href="${SOCIAL.x}" target="_blank" rel="noopener" aria-label="X" title="X"><svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="gx" x1="0" y1="0" x2="1" y2="1"><stop offset="0.00" stop-color="#FFFFFF"></stop><stop offset="0.50" stop-color="#7A7A7A"></stop><stop offset="1.00" stop-color="#FFFFFF"></stop>${spin}</linearGradient></defs><path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.67l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64z"></path></svg></a>
      </nav>`;

// Field About: "Currently carrying" EDC list. PLACEHOLDER items for the mockup.
const CARRY = [
  ['Knife', 'Placeholder: folding knife, ~3 in blade'],
  ['Light', 'Placeholder: EDC flashlight, ~1,000 lm'],
  ['Multi-tool', 'Placeholder: pocket multi-tool'],
  ['Pen', 'Placeholder: brass bolt-action pen'],
  ['Notebook', 'Placeholder: waterproof field notebook'],
];
function aboutPage() {
  // Field photo slot: jason-field.jpg (or .png / .webp; a .webp next to a .jpg/.png is served as the webp source) in
  // the lab assets folder; otherwise the current About photo.
  const has = (f) => fs.existsSync(path.join(LAB, 'assets', f));
  const fieldPhoto = (() => {
    const img = ['jason-field.jpg', 'jason-field.png', 'jason-field.webp'].find(has);
    if (!img) return { src: '/media/about/jason.jpg', webp: '/media/about/jason.webp', own: false };
    return { src: `/assets/${img}`, webp: has('jason-field.webp') && img !== 'jason-field.webp' ? '/assets/jason-field.webp' : '', own: true };
  })();
  const photo = fieldPhoto.src;
  const sources = fieldPhoto.webp ? `<source srcset="${P}${fieldPhoto.webp}" type="image/webp">` : '';
  return layout({
    title: `About · ${SITE.name}`,
    description: 'Jason Sanzone is a designer based just north of Atlanta, Georgia. He leads design and creative at ClickFunnels and co-founded Overskill, where he heads up design.',
    url: '/about/',
    ogType: 'profile',
    image: '/media/about/jason.jpg',
    card: 'summary',
    current: 'about',
    body: `<section class="sz-content sz-about">
    <picture class="sz-s">
      <source srcset="${P}/media/about/jason.webp" type="image/webp">
      <img class="sz-photo" src="${P}/media/about/jason.jpg" alt="Jason Sanzone" width="144" height="144">
    </picture>
    <picture class="sz-f">
      ${sources}
      <img class="sz-photo" src="${P}${photo}" alt="Jason Sanzone outdoors in the snow" width="144" height="144">
    </picture>
    <h1 class="sz-h1">About</h1>
    <p class="sz-bio sz-s">I'm a designer based just north of Atlanta, Georgia. I've spent my career building brands, products, and interfaces, including work for some of the world's most recognizable brands. Today I lead design and creative at <a class="sz-u" href="https://www.clickfunnels.com" target="_blank" rel="noopener noreferrer">ClickFunnels</a> and co-founded <a class="sz-u" href="https://www.overskill.com" target="_blank" rel="noopener noreferrer">Overskill</a>, where I head up design. Away from the screen, you'll find me outdoors, tinkering with new tech and AI, or hunting down gear that makes everyday life a little easier.</p>
    <div class="sz-f">
      <p class="sz-bio">I live just north of Atlanta, near Ball Ground, with the north Georgia mountains right up the road. I get outside when I can, whether that's a camping trip, a long hike or just a day in the woods with a camera. What I really love is being ready for whatever the day calls for: good tools, gear that earns its spot, and knowing exactly what's in my pocket. Field Notes is where I write about all of it.</p>
      <section class="sz-carry" aria-labelledby="sz-carry-h">
        <h2 id="sz-carry-h" class="sz-carry-h">Currently carrying</h2>
        <ul class="sz-carry-list">
${CARRY.map(([k, v]) => `          <li><span class="sz-carry-k">${k}</span><span class="sz-carry-v">${v}</span></li>`).join('\n')}
        </ul>
        <p class="sz-carry-note">Placeholder list for the mockup. The real kit is coming soon.</p>
      </section>
    </div>
    <div class="sz-contact">
      <a class="sz-email" href="mailto:${SOCIAL.email}">${SOCIAL.email}</a>
      ${TILES}
    </div>
  </section>`,
  });
}

// ---------- build ----------
// Root-relative URLs left anywhere in a page (post prose, landing template) are pointed inside the lab too.
const esc_re = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const ROOTREL = new RegExp(`(\\s(?:href|src|poster))="/(?!/)(?!${esc_re(SLUG)}/)`, 'g');
const inLab = (html) => html
  .replace(ROOTREL, `$1="${P}/`)
  .replace(/(\ssrcset)="([^"]*)"/g, (m, a, v) => `${a}="${v.split(',').map((x) => x.trim().replace(new RegExp(`^/(?!/)(?!${esc_re(SLUG)}/)`), `${P}/`)).join(', ')}"`)
  .replace(new RegExp(`url\\((["']?)/(?!/)(?!${esc_re(SLUG)}/)`, 'g'), `url($1${P}/`);
const write = (rel, data) => {
  const f = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, /\.(html|css)$/.test(rel) ? inLab(data) : data);
};

// Landing: the lab's landing.html (shell + JSON-escaped bundled template), with the lab's key, nav paths, switch
// icons, noindex/no-referrer and every root-relative URL inside the lab.
const LAB_CSS = fs.readFileSync(path.join(LAB, 'assets/site.css'), 'utf8');
const LAB_BLOCKS = LAB_CSS.match(/\/\* switcher:start[\s\S]*?\/\* side:end \*\//)[0];
function labLanding() {
  const lines = fs.readFileSync(path.join(LAB, 'landing.html'), 'utf8').split('\n');
  const i = lines.findIndex((l) => l.startsWith('"<!DOCTYPE html>'));
  if (i < 0) throw new Error('lab field: landing template not found');
  const enc = (t) => JSON.stringify(t).replaceAll('</', '<\\u002F');
  const tpl = JSON.parse(lines[i]);
  if (enc(tpl) !== lines[i]) throw new Error('lab field: landing template does not round-trip');
  const button = themeButton(true);
  const fix = (x, isTpl) => {
    x = once(x, "K = 'sz-side'", `K = '${KEY}'`);
    x = labNavJs(x);
    // the switch + side CSS: always the lab's current site.css blocks
    x = once(x, x.match(/\/\* switcher:start[\s\S]*?\/\* side:end \*\//)[0], LAB_BLOCKS);
    x = x.replace(/<button type="button" class="sz-side sz-side-abs"[\s\S]*?<\/button><script>window\.__szTheme && window\.__szTheme\.sync\(\);<\/script>/, () => button);
    if (!x.includes(`data-icons="${ICONS.id}"`)) throw new Error('lab field: landing switch not replaced');
    x = once(x, '<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="robots" content="noindex, nofollow">\n<meta name="referrer" content="no-referrer">');
    if (isTpl) {
      x = once(x, "var u = ['/about/', '/journal/']", `var u = ['${P}/about/', '${P}/journal/']`);
      x = x.replace(/(<script type="speculationrules">)([\s\S]*?)(<\/script>)/g, (m, a, j, b) => {
        const r = JSON.parse(j);
        for (const k of Object.keys(r)) for (const rule of r[k]) if (rule.urls) rule.urls = rule.urls.map((u) => (u.startsWith('/') && !u.startsWith(P + '/') ? P + u : u));
        return a + JSON.stringify(r) + b;
      });
    }
    // JS string paths used by the bundle for its own fonts / textures
    x = x.replace(new RegExp(`(['"])/(?=(?:assets|media)/)`, 'g'), `$1${P}/`);
    return inLab(x);
  };
  const MARK = '\u0000SZ-TEMPLATE\u0000';
  const shell = fix(lines.map((l, k) => (k === i ? MARK : l)).join('\n'), false);
  const t2 = fix(tpl, true);
  return once(shell, MARK, enc(t2));
}

fs.copyFileSync(path.join(ROOT, 'favicon.svg'), path.join(OUT, 'favicon.svg'));
fs.cpSync(path.join(ROOT, 'media'), path.join(OUT, 'media'), { recursive: true, filter: (x) => path.basename(x) !== '.gitkeep' });
// assets: the main ones, then the lab's overlay (site.css, fonts, textures, optional jason-field photo)
fs.cpSync(path.join(ROOT, 'site-src/assets'), path.join(OUT, 'assets'), { recursive: true });
fs.cpSync(path.join(LAB, 'assets'), path.join(OUT, 'assets'), { recursive: true });
for (const f of fs.readdirSync(path.join(OUT, 'assets'))) if (f.endsWith('.css')) write(`assets/${f}`, fs.readFileSync(path.join(OUT, 'assets', f), 'utf8'));
fs.writeFileSync(path.join(OUT, 'index.html'), labLanding());

const real = loadPosts();
const samples = loadPosts(SAMPLES_DIR, true).filter((p) => p.sample);
for (const p of samples) if (real.some((q) => q.slug === p.slug)) throw new Error(`Sample slug "${p.slug}" clashes with a post`);
if (samples.length && fs.existsSync(path.join(SAMPLES_DIR, 'media'))) fs.cpSync(path.join(SAMPLES_DIR, 'media'), path.join(OUT, 'media/samples'), { recursive: true });
const posts = [...real, ...samples].sort((a, b) => b.date - a.date || a.title.localeCompare(b.title));
write('journal/index.html', indexPage(posts));
for (const p of posts) write(`journal/${p.slug}/index.html`, postPage(p));
write('about/index.html', aboutPage());

// Leak checks: no page may link out of the lab to a main page/asset, carry a canonical or feed link, or miss noindex.
const bad = [];
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
for (const f of walk(OUT).filter((x) => x.endsWith('.html'))) {
  const h = fs.readFileSync(f, 'utf8');
  const rel = path.relative(OUT, f);
  if (!h.includes('<meta name="robots" content="noindex, nofollow">')) bad.push(`${rel}: no noindex`);
  if (/rel="canonical"|application\/rss\+xml/.test(h)) bad.push(`${rel}: canonical/feed link`);
  const m = h.match(new RegExp(`\\s(?:href|src)=\\\\?"/(?!/)(?!${esc_re(SLUG)}/)[^"]*`, 'g'));
  if (m) bad.push(`${rel}: ${m.slice(0, 3).join(' ')}`);
}
if (bad.length) throw new Error('lab field: ' + bad.join('; '));

fs.rmSync(FINAL, { recursive: true, force: true });
fs.cpSync(OUT, FINAL, { recursive: true });
fs.rmSync(OUT, { recursive: true, force: true });
console.log(`  lab field: built (${posts.length + 2} pages, ${samples.length} sample, icons ${ICONS.id}, field photo ${fs.existsSync(path.join(LAB, 'assets/jason-field.jpg')) || fs.existsSync(path.join(LAB, 'assets/jason-field.webp')) || fs.existsSync(path.join(LAB, 'assets/jason-field.png')) ? 'own' : 'fallback'})`);
