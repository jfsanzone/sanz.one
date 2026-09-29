// Build the deployable site into _site/:
//   - root landing files are copied byte-for-byte (index.html, favicon.svg, CNAME, .nojekyll)
//   - media/ is copied as-is (Pages CMS uploads land in media/journal)
//   - content/posts/*.md is rendered to /journal/, /journal/<slug>/ and /journal/feed.xml
//   - /about/ is generated from the template below
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

const ROOT_FILES = ['index.html', 'favicon.svg', 'CNAME', '.nojekyll'];

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
    posts.push({
      file: f,
      slug,
      url: `/journal/${slug}/`,
      title: String(data.title).trim(),
      description: data.description ? String(data.description).trim() : '',
      cover: data.cover ? String(data.cover).trim() : '',
      date,
      html: marked.parse(content, { gfm: true }),
    });
  }
  posts.sort((a, b) => b.date - a.date || a.title.localeCompare(b.title));
  return posts;
}

// ---------- templates ----------
const FOOTER = `<footer class="sz-footer">
    <span class="sz-roles"><span class="sz-role">VP, Design/Creative, <a class="sz-u" href="https://www.clickfunnels.com" target="_blank" rel="noopener noreferrer">ClickFunnels</a></span><span class="sz-sep" aria-hidden="true">  ·  </span><span class="sz-role">Co-Founder &amp; Head of Design, <a class="sz-u" href="https://www.overskill.com" target="_blank" rel="noopener noreferrer">Overskill</a></span></span>
  </footer>`;

const BACK_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>';

// Top-left segmented nav on journal + about pages: [ logo | About | Journal ]. The landing page (index.html)
// carries an identical nav (in its shell and its bundled template). Behaviour lives in site-src/nav.js
// (inlined right after the nav): the page being left is remembered and the thumb slides from it, and the
// nav has a fixed view-transition-name so it stays put across pages while only the content crossfades.
const NAV_ITEMS = [['about', '/about/', 'About'], ['journal', '/journal/', 'Journal']];
// The logo mark is inlined (fill -> currentColor): orange in the nav, #0A0A0A in the highlight's dark copy.
const LOGO_MARK = fs.readFileSync(path.join(ROOT, 'site-src/assets/logo.svg'), 'utf8').trim()
  .replace(/^<svg[^>]*>/, '<svg width="16.1" height="21" viewBox="0 0 105 137" fill="none" aria-hidden="true" focusable="false">')
  .replaceAll('fill="#FA431E"', 'fill="currentColor"');
const NAV_JS = fs.readFileSync(path.join(ROOT, 'site-src/nav.js'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//, '').split('\n').map((l) => l.trim()).join('').trim();
function nav(current) {
  const active = current === 'post' ? 'journal' : current;
  const home = `<a class="sz-seg-item sz-seg-home" data-key="home" href="/" aria-label="Home">${LOGO_MARK}</a>`;
  const items = NAV_ITEMS.map(([key, href, label]) => {
    const aria = current === key ? ' aria-current="page"' : key === active ? ' aria-current="true"' : '';
    return `<a class="sz-seg-item" data-key="${key}" href="${href}"${aria}>${label}</a>`;
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
  const urls = NAV_URLS.filter((u) => u !== self);
  return `<script type="speculationrules">${JSON.stringify({ prerender: [{ urls, eagerness: 'immediate' }], prefetch: [{ urls, eagerness: 'immediate' }] })}</script>\n`;
}

function layout({ title, description, url, ogType = 'website', image = '', card: cardType = '', current = '', extraHead = '', body }) {
  const card = cardType || (image ? 'summary_large_image' : 'summary');
  return `<!DOCTYPE html>
<html lang="${SITE.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(abs(url))}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="alternate" type="application/rss+xml" title="${esc(SITE.name)} · ${esc(SITE.journalTitle)}" href="/journal/feed.xml">
<link rel="preload" href="/assets/fonts/geist-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/site.css">
<link rel="expect" href="#sz-end" blocking="render">
${specRules(current)}<meta name="theme-color" content="#0A0A0A">
<meta property="og:site_name" content="${esc(SITE.name)}">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(abs(url))}">
${image ? `<meta property="og:image" content="${esc(abs(image))}">\n` : ''}<meta name="twitter:card" content="${card}">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
${image ? `<meta name="twitter:image" content="${esc(abs(image))}">\n` : ''}${extraHead}</head>
<body>
<main class="sz-main">
  <header class="sz-top">
    ${nav(current)}
  </header>
  ${body}
  ${FOOTER}
</main>
<i id="sz-end" hidden></i>
</body>
</html>
`;
}

function indexPage(posts) {
  const list = posts.length
    ? `<ol class="sz-posts" reversed>
${posts.map((p) => `      <li><a class="sz-post-link" href="${p.url}"><span class="sz-post-title">${esc(p.title)}</span><time class="sz-post-date" datetime="${isoDate(p.date)}">${fmtDate(p.date)}</time>${p.description ? `<p class="sz-post-desc">${esc(p.description)}</p>` : ''}</a></li>`).join('\n')}
    </ol>`
    : `<p class="sz-empty">First post coming soon.</p>`;
  return layout({
    title: `${SITE.journalTitle} · ${SITE.name}`,
    description: SITE.journalDescription,
    url: '/journal/',
    current: 'journal',
    body: `<section class="sz-content">
    <h1 class="sz-h1">${esc(SITE.journalTitle)}</h1>
    <p class="sz-sub">${esc(SITE.journalSubline)}</p>
    ${list}
  </section>`,
  });
}

function postPage(p) {
  const desc = p.description || `${p.title}, by ${SITE.name}.`;
  const back = `<a class="sz-back" href="/journal/">${BACK_ICON}<span>${esc(SITE.journalTitle)}</span></a>`;
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
      </header>
      ${p.cover ? `<img class="sz-cover" src="${esc(p.cover)}" alt="">` : ''}
      <div class="sz-prose">
${p.html}
      </div>
      <footer class="sz-article-foot">${back}</footer>
    </article>
  </section>`,
  });
}

function feed(posts) {
  const items = posts.slice(0, 50).map((p) => {
    // Make root-relative links/images absolute for feed readers.
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

function aboutPage() {
  const photo = '/media/about/jason.jpg';
  return layout({
    title: `About · ${SITE.name}`,
    description: 'Jason Sanzone is a designer based just north of Atlanta, Georgia. He leads design and creative at ClickFunnels and co-founded Overskill, where he heads up design.',
    url: '/about/',
    ogType: 'profile',
    image: photo,
    card: 'summary',
    current: 'about',
    body: `<section class="sz-content sz-about">
    <picture>
      <source srcset="/media/about/jason.webp" type="image/webp">
      <img class="sz-photo" src="${photo}" alt="Jason Sanzone" width="144" height="144">
    </picture>
    <h1 class="sz-h1">About</h1>
    <p class="sz-bio">I'm a designer based just north of Atlanta, Georgia. I've spent my career building brands, products, and interfaces, including work for some of the world's most recognizable brands. Today I lead design and creative at <a class="sz-u" href="https://www.clickfunnels.com" target="_blank" rel="noopener noreferrer">ClickFunnels</a> and co-founded <a class="sz-u" href="https://www.overskill.com" target="_blank" rel="noopener noreferrer">Overskill</a>, where I head up design. Away from the screen, you'll find me outdoors, tinkering with new tech and AI, or hunting down gear that makes everyday life a little easier.</p>
    <div class="sz-contact">
      <a class="sz-email" href="mailto:${SOCIAL.email}">${SOCIAL.email}</a>
      ${TILES}
    </div>
  </section>`,
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
<script>location.replace(${JSON.stringify(to)} + location.search + location.hash);</script>
<style>html,body{background:#0A0A0A;color:#8A8A8A;font:15px system-ui,sans-serif}a{color:#F2F2F2}</style>
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
write('about/index.html', aboutPage());

console.log(`Built ${posts.length} post(s) into ${path.relative(ROOT, OUT)}/`);
