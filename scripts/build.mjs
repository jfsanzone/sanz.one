// Build the deployable site into _site/:
//   - root files are copied byte-for-byte (favicon.svg, CNAME, .nojekyll); site-src/assets/ goes to /assets/
//   - the menu pages are generated from the templates below, one full-bleed band each, in menu order:
//     / (home, orange), /work/ (cobalt), /about/ (lilac), /notes/ (sky), /journal/ (neutral), /contact/ (volt)
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
// One system for every page (site-src/assets/site.css):
//   - structure: a narrow editorial column, Inter + mono, pure neutrals, whitespace between sections;
//   - surfaces: satin-silver foil and matte-black panels lit by the eased pointer / scroll light (--lx/--ly);
//   - colour: full-bleed section bands in the supplemental palette (cobalt, lilac, sky, volt) with hard edges;
//   - play: Expo Mode on every menu page (site-src/assets/sanz.js);
//   - motion: Framed Drift between pages (site-src/assets/segue.css + site-src/segue.js).
const SOCIAL = {
  email: 'jason@sanz.one',
  linkedin: 'https://linkedin.com/in/jasonsanzone',
  instagram: 'https://instagram.com/jasonsanzone',
  x: 'https://x.com/jasonsanzone',
};
const ROLES = [
  { company: 'ClickFunnels', title: 'VP, Design/Creative', href: 'https://www.clickfunnels.com', host: 'clickfunnels.com', n: '01' },
  { company: 'Overskill', title: 'Co\u2011Founder & Head of Design', href: 'https://www.overskill.com', host: 'overskill.com', n: '02' },
];
const SUBLINE = 'Designing brands, products, and interfaces.';
const BIO_LEDE = "I'm a designer based just north of Atlanta, Georgia. I've spent my career building brands, products, and interfaces, including work for some of the world's most recognizable brands.";
const BIO_REST = `Today I lead design and creative at <a class="sz-u" href="https://www.clickfunnels.com" target="_blank" rel="noopener noreferrer">ClickFunnels</a> and co-founded <a class="sz-u" href="https://www.overskill.com" target="_blank" rel="noopener noreferrer">Overskill</a>, where I head up design. Away from the screen, you'll find me outdoors, tinkering with new tech and AI, or hunting down gear that makes everyday life a little easier.`;
const EXT = 'target="_blank" rel="noopener noreferrer"';

const ARROW_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const OUT_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 17 17 7M8 7h9v9"/></svg>';
const BACK_ICON = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>';

// Menu order, left to right. It drives the segmented nav, the Framed Drift direction (site-src/segue.js: a move to
// a page further left plays backwards) and the footer. Contact is the orange "Get in touch" pill at the far right
// of the header rather than a nav segment.
const PAGES = [
  { key: 'home', href: '/', label: 'Home', n: '00' },
  { key: 'work', href: '/work/', label: 'Work', n: '01', title: 'Currently' },
  { key: 'about', href: '/about/', label: 'About', n: '02', title: 'About' },
  { key: 'notes', href: '/notes/', label: 'Notes', n: '03', title: 'Notes' },
  { key: 'journal', href: '/journal/', label: 'Journal', n: '04', title: 'Journal' },
  { key: 'contact', href: '/contact/', label: 'Get in touch', n: '05', title: 'Get in touch' },
];
const PAGE = Object.fromEntries(PAGES.map((p) => [p.key, p]));
// Top-left segmented nav [ logo | Work | About | Notes | Journal ]. Behaviour lives in site-src/nav.js (inlined right
// after the nav): the page being left is remembered and the thumb slides from it, and the whole page (nav included)
// moves with the Framed Drift page transition (site-src/assets/segue.css).
const NAV_ITEMS = PAGES.filter((p) => p.key !== 'home' && p.key !== 'contact').map((p) => [p.key, p.href, p.label]);
const LOGO_MARK = fs.readFileSync(path.join(ROOT, 'site-src/assets/logo.svg'), 'utf8').trim()
  .replace(/^<svg[^>]*>/, '<svg width="16.1" height="21" viewBox="0 0 105 137" fill="none" aria-hidden="true" focusable="false">')
  .replaceAll('fill="#FA431E"', 'fill="currentColor"');
const inline = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\/\*[\s\S]*?\*\//, '').split('\n').map((l) => l.trim()).join('').trim();
const NAV_JS = inline('site-src/nav.js');
// Light / dark mode: site-src/theme.js is inlined at the top of every <head> (applies the saved or system mode
// before first paint); the toggle sits top right in the floating header.
const THEME_JS = inline('site-src/theme.js');
// Framed Drift direction: site-src/segue.js is inlined as a blocking <head> script (tags a back traverse 'backwards').
const SEGUE_JS = inline('site-src/segue.js');
const SUN_ICON = '<svg class="sz-i-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';
const MOON_ICON = '<svg class="sz-i-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
const themeButton = () => `<button type="button" class="sz-theme" aria-label="Switch to light mode">${SUN_ICON}${MOON_ICON}<span class="sz-theme-live" role="status" aria-live="polite"></span></button><script>window.__szTheme && window.__szTheme.sync();</script>`;

function nav(current) {
  const active = current === 'post' ? 'journal' : current;
  const home = `<a class="sz-seg-item sz-seg-home" data-key="home" href="/" aria-label="Home"${current === 'home' ? ' aria-current="page"' : ''}>${LOGO_MARK}</a>`;
  const items = NAV_ITEMS.map(([key, href, label]) => {
    const aria = current === key ? ' aria-current="page"' : key === active ? ' aria-current="true"' : '';
    return `<a class="sz-seg-item" data-key="${key}" href="${href}"${aria}>${label}</a>`;
  }).join('');
  const ink = `<span class="sz-seg-ink"><span class="sz-seg-ink-home">${LOGO_MARK}</span>${NAV_ITEMS.map(([, , label]) => `<span>${label}</span>`).join('')}</span>`;
  return `<nav class="sz-seg" data-active="${active}" aria-label="Site"><span class="sz-seg-thumb" aria-hidden="true"><span class="sz-seg-p"></span><span class="sz-seg-p"></span><span class="sz-seg-p"></span><span class="sz-seg-win">${ink}</span></span>${home}${items}</nav><script>${NAV_JS}(document.currentScript.previousElementSibling);</script>`;
}

// Speculation rules: every page prerenders the other nav destinations (Chrome/Edge), so a nav click activates an
// already-rendered page. rel=expect (in the head): the page does not paint until it is parsed up to #sz-end, so a
// fast page never paints a half page and Chrome does not skip the cross-document view transition.
const NAV_URLS = PAGES.map((p) => p.href);
function specRules(current, url) {
  const up = '../'.repeat(url.split('/').filter(Boolean).length) || './';
  const urls = NAV_URLS.filter((u) => u !== url).map((u) => up + u.slice(1));
  return `<script type="speculationrules">${JSON.stringify({ prerender: [{ urls, eagerness: 'immediate' }], prefetch: [{ urls, eagerness: 'immediate' }] })}</script>\n`;
}

const copyBtn = (cls = 'sz-btn') => `<button class="${cls}" type="button" data-copy="${SOCIAL.email}">Copy email</button>`;
const socialBtns = (cls) => `<a class="${cls}" href="${SOCIAL.linkedin}" ${EXT}>LinkedIn${OUT_ICON}</a><a class="${cls}" href="${SOCIAL.instagram}" ${EXT}>Instagram${OUT_ICON}</a><a class="${cls}" href="${SOCIAL.x}" ${EXT}>X${OUT_ICON}</a>`;

// The spec sticker on the home band (facts kept exactly as on the Foil landing page).
const STICKER = `<dl class="sticker" aria-label="Spec">
          <div class="st-row st-head"><span class="st-dot" aria-hidden="true"></span><span class="mono">SPEC SHEET / 001</span></div>
          <div class="st-row"><dt>Name</dt><dd>Jason Sanzone</dd></div>
          <div class="st-row"><dt>Role</dt><dd>VP, Design/Creative, ClickFunnels</dd></div>
          <div class="st-row"><dt>Building</dt><dd>Overskill, co&#8209;founder &amp; head of design</dd></div>
          <div class="st-row"><dt>Based</dt><dd>North of Atlanta, GA</dd></div>
          <div class="st-row st-sku"><dt>SKU</dt><dd class="mono">SZ-ONE-JS-26</dd></div>
        </dl>`;
const FOOTER = `<footer class="sz-foot">
  <div class="sz-wrap">
    <div class="sz-foot-grid">
      <div class="sz-foot-id">
        <a class="sz-foot-mark" href="/" aria-label="Home">${LOGO_MARK}</a>
        <p><strong>${esc(SITE.name)}</strong><br>${esc(ROLES[0].title)}, ${esc(ROLES[0].company)}<br>${esc(ROLES[1].title)}, ${esc(ROLES[1].company)}</p>
      </div>
      <nav class="sz-foot-col" aria-label="Footer"><span class="sz-label">Site</span>${PAGES.map((p) => `<a href="${p.href}">${esc(p.label)}</a>`).join('')}<a href="/journal/feed.xml">RSS</a></nav>
      <nav class="sz-foot-col" aria-label="Elsewhere"><span class="sz-label">Elsewhere</span><a href="${SOCIAL.linkedin}" ${EXT}>LinkedIn</a><a href="${SOCIAL.instagram}" ${EXT}>Instagram</a><a href="${SOCIAL.x}" ${EXT}>X</a></nav>
    </div>
    <div class="sz-foot-base"><span class="mono">SZ-ONE-JS-26</span><span>&copy; ${new Date().getFullYear()} ${esc(SITE.name)}</span></div>
  </div>
</footer>`;

const EXPO_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M12 2.8 20 7.4v9.2L12 21.2 4 16.6V7.4z"/><path d="M4 7.4 12 12l8-4.6M12 12v9.2"/></svg>';
const EXPO_BTN = `<button class="ed-expo-btn" type="button" aria-pressed="false" aria-label="Enter Expo Mode" title="Expo Mode (Shift)">
  ${EXPO_ICON}
  <span class="ed-expo-label">Expo Mode</span>
</button>
`;

// expo: the body is one band (.ed-sec) wrapped in the ribbon Expo Mode folds onto its floor (site-src/assets/sanz.js).
function layout({ title, description, url, ogType = 'website', image = '', card: cardType = '', current = '', extraHead = '', body, expo = false }) {
  const card = cardType || (image ? 'summary_large_image' : 'summary');
  return `<!DOCTYPE html>
<html lang="${SITE.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<script>${THEME_JS}</script>
<script>${SEGUE_JS}</script>
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(abs(url))}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="alternate" type="application/rss+xml" title="${esc(SITE.name)} · ${esc(SITE.journalTitle)}" href="/journal/feed.xml">
<link rel="preload" href="/assets/fonts/inter-latin-wght.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/site.css">
<link rel="stylesheet" href="/assets/segue.css">
<script defer src="/assets/sanz.js"></script>
<link rel="expect" href="#sz-end" blocking="render">
${specRules(current, url)}<meta name="theme-color" content="#0A0A0A">
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
<body class="sz-on-${current || 'page'}">
<a class="sz-skip" href="#content">Skip to content</a>
<header class="sz-top">
  ${nav(current)}
  <div class="sz-top-r">
    ${themeButton()}
    <a class="sz-btn sz-btn-pri sz-top-cta" href="/contact/"${current === 'contact' ? ' aria-current="page"' : ''}>Get in touch</a>
  </div>
</header>
<main class="sz-main" id="content">
${expo ? `<div id="ed-host">\n<div class="ed-ribbon" id="ribbon">\n${body}\n</div>\n</div>` : body}
</main>
${FOOTER}
${expo ? EXPO_BTN : ''}<p class="sz-live" role="status" aria-live="polite"></p>
<i id="sz-end" hidden></i>
</body>
</html>
`;
}

// Post cards (journal index): date + reading time, title, a 2-line description, optional cover, arrow.
function postCard(p, h = 'h2') {
  const thumb = p.cover ? `<span class="sz-card-thumb"><img src="${esc(p.cover)}" alt="" loading="lazy" decoding="async"></span>` : '';
  return `<li><a class="sz-card${p.cover ? ' sz-card-has-thumb' : ''}" href="${p.url}">
        <span class="sz-card-body">
          <span class="sz-card-meta"><time datetime="${isoDate(p.date)}">${shortDate(p.date)}</time><span aria-hidden="true">·</span><span>${p.minutes} min read</span></span>
          <${h} class="sz-card-title">${esc(p.title)}</${h}>
          ${p.description ? `<span class="sz-card-desc">${esc(p.description)}</span>` : ''}
        </span>
        ${thumb}<span class="sz-card-arrow" aria-hidden="true">${ARROW_ICON}</span>
      </a></li>`;
}
const postList = (posts, h) => posts.length
  ? `<ol class="sz-posts" reversed>
      ${posts.map((p) => postCard(p, h)).join('\n      ')}
    </ol>`
  : `<p class="sz-empty">First post coming soon.</p>`;

// One band per menu page, all built the same way: a full-bleed colour field (hard edges, at least a screen tall
// so every page transition moves a whole colour), the numbered section head with the page title as h1, the page's
// content, and a link on to the next page in menu order. The bands are .ed-sec so Expo Mode can fold them.
const EXT_FIELD = { home: 'orange', work: 'cobalt', about: 'lilac', notes: 'sky', journal: 'page', contact: 'volt' };
const pageHead = (num, title, sub = '', extra = '') => `<header class="ed-head">
      <span class="ed-num mono">${num}</span>
      <h1 class="ed-title">${title}</h1>
      ${sub ? `<p class="ed-sub">${sub}</p>` : ''}${extra}
    </header>`;
function nextLink(key) {
  const i = PAGES.findIndex((p) => p.key === key), nx = PAGES[i + 1];
  if (!nx) return '';
  return `<a class="sz-next" href="${nx.href}"><span class="mono">${nx.n}</span><span class="sz-next-t">${esc(nx.title || nx.label)}</span>${ARROW_ICON}</a>`;
}
const band = (key, inner, cls = '') => {
  const f = EXT_FIELD[key];
  return `<section class="ed-sec sz-page${f === 'page' ? '' : ` band band-${f}`}${cls}" id="${key}" data-field="${f}">
  <div class="sz-wrap">
    ${inner}
    ${key === 'home' ? '' : nextLink(key)}
  </div>
</section>`;
};

function indexPage(posts) {
  return layout({
    title: `${SITE.journalTitle} · ${SITE.name}`,
    description: SITE.journalDescription,
    url: '/journal/',
    current: 'journal',
    expo: true,
    body: band('journal', `${pageHead(PAGE.journal.n, esc(SITE.journalTitle), esc(SITE.journalSubline), `
      <div class="sz-btns"><a class="sz-btn sz-btn-line" href="/journal/feed.xml">RSS feed</a></div>`)}
    <div data-annot="Latest from the journal">${postList(posts)}</div>`),
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
    body: `<section class="sz-sec sz-post">
  <div class="sz-wrap sz-col">
    ${back}
    <article class="sz-article">
      <header>
        <p class="sz-card-meta"><time datetime="${isoDate(p.date)}">${fmtDate(p.date)}</time><span aria-hidden="true">·</span><span>${p.minutes} min read</span></p>
        <h1 class="sz-article-title">${esc(p.title)}</h1>
        ${p.description ? `<p class="sz-article-desc">${esc(p.description)}</p>` : ''}
      </header>
      ${p.cover ? `<img class="sz-cover" src="${esc(p.cover)}" alt="">` : ''}
      <div class="sz-prose">
${p.html}
      </div>
      <footer class="sz-article-foot">${back}<a class="sz-btn sz-btn-pri" href="/contact/">Get in touch</a></footer>
    </article>
  </div>
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
const PHOTO = `<picture>
          <source srcset="/media/about/jason.webp" type="image/webp">
          <img src="/media/about/jason.jpg" alt="Jason Sanzone" width="480" height="480" decoding="async">
        </picture>`;

const PAGE_DESC = 'Jason Sanzone is a designer based just north of Atlanta, Georgia. He leads design and creative at ClickFunnels and co-founded Overskill, where he heads up design.';

// /about/ (lilac): the landing About and the old About page merged; the roles live on /work/, the email on /contact/.
function aboutPage() {
  return layout({
    title: `About · ${SITE.name}`,
    description: PAGE_DESC,
    url: '/about/',
    ogType: 'profile',
    image: '/media/about/jason.jpg',
    card: 'summary',
    current: 'about',
    expo: true,
    body: band('about', `<div class="sz-about-grid">
      <div class="sz-photo" data-annot="Jason Sanzone">${PHOTO}</div>
      <div>
        ${pageHead(PAGE.about.n, 'About')}
        <p class="sz-lede">${esc(BIO_LEDE)}</p>
        <p class="sz-body">${BIO_REST}</p>
      </div>
    </div>`),
  });
}

// /work/ (cobalt): Currently, the two roles on satin-silver cards with matte-black labels.
function workPage() {
  return layout({
    title: `Currently · ${SITE.name}`,
    description: PAGE_DESC,
    url: '/work/',
    current: 'work',
    expo: true,
    body: band('work', `${pageHead(PAGE.work.n, 'Currently', 'Two roles, one practice.')}
    <div class="roles" data-annot="Two roles, one practice">
      ${ROLES.map((r) => `<a class="satin role" href="${r.href}" ${EXT}>
        <span class="label role-label"><span class="mono">Role ${r.n}</span><span class="mono">${esc(r.host)}</span></span>
        <span class="role-co">${esc(r.company)}</span>
        <span class="role-t">${esc(r.title)}</span>
        <span class="role-go" aria-hidden="true">${OUT_ICON}</span>
      </a>`).join('\n      ')}
    </div>`),
  });
}

// /notes/ (sky): lines quoted verbatim from the posts, each linking to its post.
const QUOTES = [
  ['Taste is the new bottleneck, and it doesn\'t scale with headcount.', 'size-isnt-everything'],
  ['AI can do the first draft. It can\'t do that stack. That\'s still on you.', 'the-formula-nobody-puts-on-a-resume'],
  ['Fine is everywhere.', 'caring-too-much-is-underrated'],
  ['The next great companies will look tiny. The big ones will look surprised.', 'size-isnt-everything'],
];
function notesPage(posts) {
  const bySlug = new Map(posts.map((p) => [p.slug, p]));
  const quotes = QUOTES.filter(([, s]) => bySlug.has(s)).map(([q, s]) => {
    const p = bySlug.get(s);
    return `<figure class="note"><blockquote><p>${esc(q)}</p></blockquote><figcaption><a href="${p.url}">${esc(p.title)}${ARROW_ICON}</a></figcaption></figure>`;
  }).join('\n      ');
  return layout({
    title: `Notes · ${SITE.name}`,
    description: SITE.journalDescription,
    url: '/notes/',
    current: 'notes',
    expo: true,
    body: band('notes', `${pageHead(PAGE.notes.n, 'Notes', 'Pulled from the posts.')}
    <div class="notes" data-annot="Pulled from the posts">
      ${quotes}
    </div>`),
  });
}

// /contact/ (volt): the email on a matte-black panel, copy button and socials.
function contactPage() {
  return layout({
    title: `Get in touch · ${SITE.name}`,
    description: PAGE_DESC,
    url: '/contact/',
    current: 'contact',
    expo: true,
    body: band('contact', `${pageHead(PAGE.contact.n, 'Get in touch')}
    <div class="panel contact-panel" data-annot="Say hello">
      <span class="mono hp-k">Say hello</span>
      <a class="contact-email" href="mailto:${SOCIAL.email}">${SOCIAL.email}</a>
      <div class="sz-btns">${copyBtn('sz-btn sz-btn-pri')}${socialBtns('sz-btn sz-btn-ghost')}</div>
    </div>`),
  });
}

// / (orange): the hero is a band like every other page: numbered head, the name as h1, the subline, then the spec
// sticker and one entry card per menu page, each in that page's colour.
const ENTRY_SUB = {
  work: 'Two roles, one practice.',
  about: "I'm a designer based just north of Atlanta, Georgia.",
  notes: 'Pulled from the posts.',
  journal: SITE.journalSubline,
  contact: SOCIAL.email,
};
function homePage() {
  const entries = PAGES.filter((p) => p.key !== 'home').map((p) => `<a class="entry entry-${EXT_FIELD[p.key]}" href="${p.href}">
        <span class="mono entry-n">${p.n}</span>
        <span class="entry-t">${esc(p.title)}</span>
        <span class="entry-s">${esc(ENTRY_SUB[p.key])}</span>
        <span class="entry-go" aria-hidden="true">${ARROW_ICON}</span>
      </a>`).join('\n      ');
  return layout({
    title: `${SITE.name} · ${SUBLINE.replace(/\.$/, '')}`,
    description: PAGE_DESC,
    url: '/',
    image: '/media/about/jason.jpg',
    card: 'summary',
    current: 'home',
    expo: true,
    body: band('home', `${pageHead('Designer · North of Atlanta, GA', esc(SITE.name), esc(SUBLINE))}
    <div class="entries">
      <div class="entry-spec" data-annot="Spec sheet">${STICKER}</div>
      ${entries}
    </div>`, ' sz-home'),
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
<script>${THEME_JS}</script>
<script>${SEGUE_JS}</script>
<script>location.replace(${JSON.stringify(to)} + location.search + location.hash);</script>
<link rel="stylesheet" href="/assets/site.css">
<link rel="stylesheet" href="/assets/segue.css">
<style>body{color:var(--muted);font:15px Inter,system-ui,sans-serif;padding:28px}</style>
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
write('index.html', homePage());
write('work/index.html', workPage());
write('about/index.html', aboutPage());
write('notes/index.html', notesPage(posts));
write('contact/index.html', contactPage());

console.log(`Built ${posts.length} post(s) into ${path.relative(ROOT, OUT)}/`);
