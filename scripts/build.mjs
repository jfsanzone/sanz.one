// Build the deployable site into _site/ (sanz.one · Notes):
//   /                 Home: intro, latest writing, work, gear
//   /writing/         Writing list; /writing/<slug>/ is the three-pane reader (sidebar, list, post); /writing/feed.xml
//   /work/            Roles, How I lead, Building, Selected work, About (#about), Contact (#contact)
//   /gear/            Daily carry, the next bag, on the radar
//   /404.html
// Old URLs keep working: /journal/... and /blog/... redirect to /writing/..., /about/ to /work/#about,
// and /journal/feed.xml and /blog/feed.xml are copies of /writing/feed.xml.
// Content: content/posts/*.md (Pages CMS; `draft: true` posts are skipped). Media: media/ copied as-is.
// Assets: site-src/assets -> /assets/. site-src/theme.js and site-src/segue.js are inlined in <head>; site-src/ui.js is /assets/ui.js.
// Placeholders: text marked "To add:" or "Confirm:" is waiting on Jason; never replace it with made-up facts.
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
  writingTitle: 'Writing',
  writingDescription: 'Jason Sanzone on design, AI, EDC and gear, and everything else.',
  writingSubline: 'Notes on design, AI, gear, and everything else.',
  lang: 'en',
};
const SOCIAL = {
  email: 'jason@sanz.one',
  linkedin: 'https://linkedin.com/in/jasonsanzone',
  instagram: 'https://instagram.com/jasonsanzone',
  x: 'https://x.com/jasonsanzone',
};
const ROOT_FILES = ['favicon.svg', 'CNAME', '.nojekyll'];
const EXT = 'target="_blank" rel="noopener noreferrer"';

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
      url: `/writing/${slug}/`,
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

// ---------- icons (16px grid, stroke) ----------
const I = {
  home: '<path d="M3 7.5 8 3.5l5 4V13H3z"/>',
  pen: '<path d="M3 13h3l7-7-3-3-7 7z"/>',
  case: '<rect x="2.5" y="5" width="11" height="8" rx="1.5"/><path d="M6 5V3.5h4V5"/>',
  bag: '<path d="M4 6h8l-.6 7.5H4.6z"/><path d="M6 6V4.5a2 2 0 0 1 4 0V6"/>',
  search: '<circle cx="7" cy="7" r="4"/><path d="m10 10 3 3"/>',
  out: '<path d="M6 3.5h6.5V10M12.5 3.5 4 12"/>',
  menu: '<path d="M2.5 5h11M2.5 8h11M2.5 11h11"/>',
  copy: '<rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 10.5V4.5A1.5 1.5 0 0 1 4.5 3h6"/>',
  mail: '<rect x="2" y="3.5" width="12" height="9" rx="1.5"/><path d="m2.5 4.5 5.5 4 5.5-4"/>',
  rss: '<path d="M3.5 3.5a9 9 0 0 1 9 9M3.5 7.5a5 5 0 0 1 5 5"/><circle cx="4" cy="12" r=".6"/>',
  arrow: '<path d="M3 8h10M9 4l4 4-4 4"/>',
  back: '<path d="M13 8H3M7 4 3 8l4 4"/>',
  sun: '<circle cx="8" cy="8" r="2.8"/><path d="M8 1.8v1.4M8 12.8v1.4M1.8 8h1.4M12.8 8h1.4M3.6 3.6l1 1M11.4 11.4l1 1M3.6 12.4l1-1M11.4 4.6l1-1"/>',
  hash: '<path d="M6 2.5 5 13.5M11 2.5l-1 11M2.5 6h11M2 10h11"/>',
};
const ico = (k) => `<svg class="ico" viewBox="0 0 16 16" aria-hidden="true" focusable="false">${I[k]}</svg>`;
// The Zed Tab Stencil (round5/final/svg/zed-stencil-favicon-*.svg): rust symbol on the charcoal tile, the only rust in a view.
const STENCIL = '<path d="M3 5.5a2.5 2.5 0 0 1 2.5-2.5h13a2.5 2.5 0 0 1 2.5 2.5"/><path d="M3 18.5a2.5 2.5 0 0 0 2.5 2.5h13a2.5 2.5 0 0 0 2.5-2.5"/><path d="M16 9.4L8 14.6"/>';
const tile = (s) => { const i = Math.round(s * 0.62); return `<span class="tile" style="width:${s}px;height:${s}px" aria-hidden="true"><svg viewBox="0 0 24 24" width="${i}" height="${i}" fill="none" stroke="var(--sym)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${STENCIL}</svg></span>`; };
const PH = (t) => `<span class="ph">To add: ${t}</span>`;
const CF = (t) => `<span class="ph">Confirm: ${t}</span>`;

// Inlined head scripts (block comments stripped, one line).
const inline = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.trim()).join('').trim();
const THEME_JS = inline('site-src/theme.js');
const SEGUE_JS = inline('site-src/segue.js');

// ---------- copy (all from the existing site and posts; see placeholders for what is still missing) ----------
const ROLES = [
  { company: 'ClickFunnels', title: 'VP, Design/Creative', href: 'https://www.clickfunnels.com', host: 'clickfunnels.com' },
  { company: 'Overskill', title: 'Co-founder and head of design', href: 'https://www.overskill.com', host: 'overskill.com', note: 'An AI app builder.' },
];
const cfLink = `<a class="lk" href="${ROLES[0].href}" ${EXT}>ClickFunnels</a>`;
const osLink = `<a class="lk" href="${ROLES[1].href}" ${EXT}>Overskill</a>`;
const SUBLINE = 'Designing brands, products, and interfaces.';
const BIO_LEDE = "I'm a designer based just north of Atlanta, Georgia. I've spent my career building brands, products, and interfaces, including work for some of the world's most recognizable brands.";
const BIO_REST = `Today I lead design and creative at ${cfLink} and co-founded ${osLink}, where I head up design. Away from the screen, you'll find me outdoors, tinkering with new tech and AI, or hunting down gear that makes everyday life a little easier.`;
const PAGE_DESC = 'Jason Sanzone is a designer based just north of Atlanta, Georgia. He leads design and creative at ClickFunnels and co-founded Overskill, where he heads up design.';
// Every principle and Building quote is quoted verbatim from a post (slug).
const PRINCIPLES = [
  ['Judgment', 'Taste is the new bottleneck, and it doesn\u2019t scale with headcount.', 'size-isnt-everything'],
  ['Leverage', 'Use the tools hard, hire only for leverage or judgment you don\u2019t have, and keep the path from idea to shipped short.', 'size-isnt-everything'],
  ['Craft', 'The first version of almost anything is fine. The tenth version is where it starts to feel like someone cared.', 'caring-too-much-is-underrated'],
  ['Shipping', 'Taste is also knowing when to stop polishing and ship.', 'caring-too-much-is-underrated'],
  ['Who I hire for', 'Obsession. Pattern recognition. Zero deference. Delusional optimism. Most people treat those like red flags. They\u2019re more like a stack.', 'the-formula-nobody-puts-on-a-resume'],
];
const BUILDING = [
  ['Building Overskill, I watch things that used to take a sprint get done in an afternoon. When making things gets that cheap, having lots of people who make things stops being the advantage.', 'size-isnt-everything'],
  ['AI can spit out a screen in seconds, and most of it looks fine. Fine is everywhere.', 'caring-too-much-is-underrated'],
  ['AI can do the first draft. It can\u2019t do that stack. That\u2019s still on you.', 'the-formula-nobody-puts-on-a-resume'],
];
// Gear: from Jason's Gear-bot messages (Oct 2026), shown with a Confirm marker until he signs off.
const CARRY = [
  ['Evergoods CTB26', 'The 26L Civic Travel Bag. Worn in. Looking for something smaller.', 'Daily, on the way out'],
  ['Yeti 20oz tumbler', 'Only rides in the bag when it\u2019s empty.', 'Daily carry'],
  ['Roka glasses', 'Glasses, in their case.', 'Daily carry'],
  ['Essentia bottle', 'Water bottle.', 'Daily carry'],
  ['Laptop, 16" or smaller', 'Never both at once.', 'Daily carry'],
];
const NEXT_BAG = ['20\u201328L', 'A bottle pocket each side', 'A 16" sleeve', 'Real admin up front', 'Big uncoated zippers', 'Soft straps'];

// ---------- shell ----------
const NAV = [['home', '/', 'Home', 'home'], ['writing', '/writing/', 'Writing', 'pen'], ['work', '/work/', 'Work', 'case'], ['gear', '/gear/', 'Gear', 'bag']];
const ELSEWHERE = [['LinkedIn', SOCIAL.linkedin], ['Instagram', SOCIAL.instagram], ['X', SOCIAL.x]];

function sidebar(current, posts) {
  const nav = NAV.map(([k, href, label, ic]) => `<a href="${href}"${k === current ? ' aria-current="page"' : ''}>${ico(ic)}${label}${k === 'writing' ? `<span class="n">${posts.length}</span>` : ''}</a>`).join('');
  const els = ELSEWHERE.map(([l, u]) => `<a href="${u}" ${EXT}>${ico('out')}${l}</a>`).join('') + `<a href="/writing/feed.xml">${ico('rss')}RSS</a>`;
  return `<aside class="sb" id="sb" aria-label="Site">
  <div class="sb-in">
    <a class="id" href="/" aria-label="Jason Sanzone, home">${tile(26)}<span class="lockup">Jason Sanzone</span></a>
    <button class="srch" type="button" data-cmdk aria-haspopup="dialog">${ico('search')}Search<kbd class="kbd-only">⌘K</kbd></button>
    <nav class="nav" aria-label="Pages">${nav}</nav>
    <div><p class="grp">Elsewhere</p><nav class="nav" aria-label="Elsewhere">${els}</nav></div>
    <div class="sb-foot">
      <button class="mail" type="button" data-copy-email title="Copy email address">${ico('copy')}${SOCIAL.email}<kbd class="kbd-only">C</kbd></button>
      <div class="seg" role="group" aria-label="Theme"><button type="button" data-theme-set="auto" aria-pressed="true">Auto</button><button type="button" data-theme-set="light" aria-pressed="false">Light</button><button type="button" data-theme-set="dark" aria-pressed="false">Dark</button></div>
    </div>
  </div>
</aside>`;
}

const TBAR = `<header class="tbar">
    <a class="id" href="/" aria-label="Jason Sanzone, home" style="display:flex;align-items:center;gap:10px">${tile(28)}<span class="lockup">Jason Sanzone</span></a>
    <span class="acts2"><button class="ib" type="button" data-cmdk aria-label="Search" aria-haspopup="dialog">${ico('search')}</button><button class="ib" type="button" data-menu aria-label="Menu" aria-expanded="false" aria-controls="sb">${ico('menu')}</button></span>
  </header>`;

function cmdk(posts) {
  let n = 0;
  const item = (g, inner, attrs) => `<${attrs.href ? 'a' : 'button type="button"'} class="cmdk-i" id="cmdk-${n++}" role="option" aria-selected="false" data-g="${g}"${attrs.href ? ` href="${attrs.href}"` : ''}${attrs.ext ? ` ${EXT}` : ''}${attrs.act ? ` data-act="${attrs.act}"` : ''}${attrs.label ? ` data-label="${attrs.label}"` : ''}${attrs.k ? ` data-k="${esc(attrs.k)}"` : ''}>${inner}</${attrs.href ? 'a' : 'button'}>`;
  const group = (g, label, items) => `<p class="cmdk-g" data-g="${g}" role="presentation">${label}</p>${items.join('')}`;
  const pages = NAV.map(([k, href, label, ic]) => item('p', `${ico(ic)}${label}`, { href, k: k === 'home' ? 'start index' : k === 'work' ? 'clickfunnels overskill leadership building' : k === 'gear' ? 'edc carry bag' : 'blog journal posts' }));
  const writing = posts.map((p) => item('w', `${ico('pen')}${esc(p.title)}<span class="x">${shortDate(p.date)}</span>`, { href: p.url, k: p.description }));
  const work = [['How I lead', '/work/#lead', 'principles leadership'], ['Building at Overskill', '/work/#building', 'ai'], ['About', '/work/#about', 'bio'], ['Contact', '/work/#contact', 'email reach']]
    .map(([l, href, k]) => item('k', `${ico('hash')}${l}`, { href, k }));
  const actions = [
    item('a', `${ico('copy')}Copy email address<kbd class="kbd-only">C</kbd>`, { act: 'copy', k: SOCIAL.email + ' contact' }),
    item('a', `${ico('mail')}Email me`, { href: 'mailto:' + SOCIAL.email, k: 'contact' }),
    item('a', `${ico('sun')}Theme: Auto`, { act: 'theme:auto', label: 'Auto', k: 'system mode' }),
    item('a', `${ico('sun')}Theme: Light`, { act: 'theme:light', label: 'Light', k: 'mode' }),
    item('a', `${ico('sun')}Theme: Dark`, { act: 'theme:dark', label: 'Dark', k: 'mode night' }),
    item('a', `${ico('rss')}RSS feed`, { href: '/writing/feed.xml', k: 'subscribe' }),
  ];
  const elsewhere = ELSEWHERE.map(([l, u]) => item('e', `${ico('out')}${l}`, { href: u, ext: true, k: 'social' }));
  return `<dialog class="cmdk" id="cmdk" aria-label="Search and commands">
  <div class="cmdk-q">${ico('search')}<input type="text" placeholder="Search pages, writing and actions" aria-label="Search" role="combobox" aria-expanded="true" aria-controls="cmdk-l" aria-autocomplete="list" autocomplete="off" spellcheck="false"><kbd>Esc</kbd></div>
  <div class="cmdk-l" id="cmdk-l" role="listbox" aria-label="Results">
    ${group('p', 'Pages', pages)}${group('w', 'Writing', writing)}${group('k', 'Work', work)}${group('a', 'Actions', actions)}${group('e', 'Elsewhere', elsewhere)}
    <p class="cmdk-none" hidden>No results</p>
  </div>
  <div class="cmdk-f"><span><kbd>↑</kbd><kbd>↓</kbd> to move</span><span><kbd>↵</kbd> to open</span></div>
</dialog>`;
}

// Prerender the other top pages as soon as a page loads (instant switches, and the segue plays on a ready page);
// prerender a post when its link is hovered. Document rules (selectors, not URLs) so this works under any base path.
function specRules() {
  return `<script type="speculationrules">${JSON.stringify({ prerender: [{ where: { selector_matches: '.sb .nav[aria-label=Pages] a:not([aria-current])' }, eagerness: 'immediate' }, { where: { selector_matches: '.li, a.row, .next' }, eagerness: 'moderate' }] })}</script>`;
}

function layout({ title, description, url, current, posts, body, list = '', reader = false, ogType = 'website', image = '/media/about/jason.jpg', noindex = false, extraHead = '' }) {
  return `<!DOCTYPE html>
<html lang="${SITE.lang}" data-email="${SOCIAL.email}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script>${THEME_JS}</script>
<script>${SEGUE_JS}</script>
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex">\n' : `<link rel="canonical" href="${esc(abs(url))}">\n`}<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="alternate" type="application/rss+xml" title="${esc(SITE.name)} · ${SITE.writingTitle}" href="/writing/feed.xml">
<link rel="preload" href="/assets/fonts/archivo-latin-wght.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/bigshoulders-800-caps.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/site.css">
<link rel="stylesheet" href="/assets/segue.css">
<link rel="expect" href="#sz-end" blocking="render">
${specRules()}
<meta name="theme-color" content="#ECECE8" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0B0C0A" media="(prefers-color-scheme: dark)">
<meta property="og:site_name" content="${esc(SITE.name)}">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(abs(url))}">
<meta property="og:image" content="${esc(abs(image))}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(abs(image))}">
${extraHead}</head>
<body>
<a class="sr skip" href="#main">Skip to content</a>
<div class="app${list ? ' r3' : ''}">
${sidebar(current, posts)}
${list}<div class="pane">
  ${TBAR}
  <main id="main" class="${reader ? 'read' : 'main'}">
${body}
  </main>
</div>
</div>
${cmdk(posts)}
<p class="toast" role="status" aria-live="polite"></p>
<script src="/assets/ui.js" defer></script>
<i id="sz-end" hidden></i>
</body>
</html>
`;
}

const footer = () => `<footer class="ft"><span>Just north of Atlanta, Georgia. Email is the fastest way to reach me: <a class="lk" href="mailto:${SOCIAL.email}">${SOCIAL.email}</a></span><span class="soc">${ELSEWHERE.map(([l, u]) => `<a href="${u}" ${EXT}>${l}</a>`).join('')}<a href="/writing/feed.xml">RSS</a></span></footer>`;
const secH = (id, label, link = '') => `<h2 class="sec-h" id="${id}">${label}${link}</h2>`;
const postRow = (p) => `<a class="row" href="${p.url}"><b>${esc(p.title)}</b><span class="d"><time datetime="${isoDate(p.date)}">${shortDate(p.date)}</time></span>${p.description ? `<p>${esc(p.description)}</p>` : ''}</a>`;
const carryTable = (rows) => `<div class="tbl"><table class="spec gear"><thead><tr><th>Item</th><th>Note</th><th>Status</th></tr></thead><tbody>${rows.map(([n, v, s]) => `<tr><td>${esc(n)}</td><td>${esc(v)}</td><td>${esc(s)}</td></tr>`).join('')}</tbody></table></div>`;

// ---------- pages ----------
function homePage(posts) {
  return layout({
    title: `${SITE.name} · Design, writing and gear`,
    description: PAGE_DESC,
    url: '/',
    current: 'home',
    posts,
    ogType: 'profile',
    body: `<div class="col">
<h1 class="sr">Jason Sanzone</h1>
<p class="intro">${SUBLINE} <span class="t2">${ROLES[0].title} at ${ROLES[0].company}. Co-founder and head of design at ${ROLES[1].company}, an AI app builder.</span></p>
<div class="acts"><a class="btn pri" href="mailto:${SOCIAL.email}">Email me</a>${posts[0] ? `<a class="btn" href="${posts[0].url}">Read the latest</a>` : ''}</div>
<section class="sec" aria-labelledby="h-writing">${secH('h-writing', 'Writing', '<a class="lk" href="/writing/">All writing</a>')}${posts.slice(0, 3).map(postRow).join('') || '<p class="empty">No posts yet.</p>'}</section>
<section class="sec" aria-labelledby="h-work">${secH('h-work', 'Work', '<a class="lk" href="/work/#lead">How I lead</a>')}
<a class="row" href="/work/#roles"><b>${ROLES[0].company}</b><span class="d">${PH('since')}</span><p>${ROLES[0].title}. ${PH('team size and scope')}</p></a>
<a class="row" href="/work/#roles"><b>${ROLES[1].company}</b><span class="d">${PH('since')}</span><p>${ROLES[1].title}. ${ROLES[1].note}</p></a>
<a class="row" href="/work/#selected"><b>Selected work</b><span class="d"></span><p>${PH('up to three case studies: problem, decision, outcome')}</p></a></section>
<section class="sec" aria-labelledby="h-gear">${secH('h-gear', 'Gear', '<a class="lk" href="/gear/">Everything I carry</a>')}${carryTable(CARRY)}<p class="sec-p" style="margin:10px 0 0;font-size:13.5px">${CF('current carry, Oct 2026')}</p></section>
${footer()}
</div>`,
  });
}

function writingPage(posts) {
  return layout({
    title: `${SITE.writingTitle} · ${SITE.name}`,
    description: SITE.writingDescription,
    url: '/writing/',
    current: 'writing',
    posts,
    body: `<div class="col">
<h1 class="ph1">Writing</h1>
<p class="sub">${SITE.writingSubline}</p>
<div class="acts"><a class="btn" href="/writing/feed.xml">${ico('rss')}RSS feed</a></div>
<section class="sec" aria-label="Posts">${posts.map(postRow).join('') || '<p class="empty">No posts yet.</p>'}</section>
${footer()}
</div>`,
  });
}

function listPane(posts, current) {
  return `<section class="list" aria-label="All writing">
  <div class="list-h">Writing<span>${posts.length} post${posts.length === 1 ? '' : 's'}</span></div>
  ${posts.map((p) => `<a class="li" href="${p.url}"${p.slug === current ? ' aria-current="page"' : ''}><b>${esc(p.title)}</b>${p.description ? `<p>${esc(p.description)}</p>` : ''}<p class="d">${shortDate(p.date)} · ${p.minutes} min read</p></a>`).join('\n  ')}
</section>
`;
}

function postPage(p, i, posts) {
  const next = posts.length > 1 ? posts[(i + 1) % posts.length] : null;
  const ld = { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.title, description: p.description || undefined, datePublished: isoDate(p.date), url: abs(p.url), author: { '@type': 'Person', name: SITE.name, url: SITE.url }, image: p.cover ? abs(p.cover) : undefined };
  return layout({
    title: `${p.title} · ${SITE.name}`,
    description: p.description || SITE.writingDescription,
    url: p.url,
    current: 'writing',
    posts,
    reader: true,
    ogType: 'article',
    image: p.cover || '/media/about/jason.jpg',
    list: listPane(posts, p.slug),
    extraHead: `<meta property="article:published_time" content="${isoDate(p.date)}">\n<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>\n`,
    body: `<article>
<a class="back" href="/writing/">${ico('back')}Writing</a>
<p class="meta"><time datetime="${isoDate(p.date)}">${fmtDate(p.date)}</time><span aria-hidden="true">·</span><span>${p.minutes} min read</span></p>
<h1>${esc(p.title)}</h1>
${p.description ? `<p class="dek">${esc(p.description)}</p>` : ''}
${p.cover ? `<img class="cover" src="${esc(p.cover)}" alt="" decoding="async">` : ''}
<div class="prose">
${p.html}
</div>
${next ? `<a class="next" href="${next.url}"><span><small>Next</small><b>${esc(next.title)}</b></span>${ico('arrow')}</a>` : ''}
</article>`,
  });
}

function workPage(posts) {
  const bySlug = new Map(posts.map((p) => [p.slug, p]));
  const src = (slug) => { const p = bySlug.get(slug); return p ? `<a href="${p.url}">From ${esc(p.title)}</a>` : ''; };
  return layout({
    title: `Work · ${SITE.name}`,
    description: PAGE_DESC,
    url: '/work/',
    current: 'work',
    posts,
    ogType: 'profile',
    body: `<div class="col">
<h1 class="ph1">Work</h1>
<p class="sub">Today I lead design and creative at ${cfLink} and co-founded ${osLink}, where I head up design.</p>
<section class="sec" aria-labelledby="roles">${secH('roles', 'Roles')}
<a class="row" href="${ROLES[0].href}" ${EXT}><b>${ROLES[0].company}</b><span class="d">${PH('since')}</span><p>${ROLES[0].title}. ${PH('team size, disciplines and who you report to')}</p></a>
<a class="row" href="${ROLES[1].href}" ${EXT}><b>${ROLES[1].company}</b><span class="d">${PH('since')}</span><p>${ROLES[1].title}. ${ROLES[1].note}</p></a></section>
<section class="sec" aria-labelledby="lead">${secH('lead', 'How I lead')}<p class="sec-p">Each one is quoted from a post in Writing.</p>
<dl class="pr">${PRINCIPLES.map(([l, q, s]) => `<dt>${esc(l)}</dt><dd><p>${esc(q)}</p>${src(s)}</dd>`).join('')}</dl></section>
<section class="sec" aria-labelledby="building">${secH('building', 'Building at Overskill', `<a class="lk" href="${ROLES[1].href}" ${EXT}>overskill.com</a>`)}
<div style="padding:0 4px">${BUILDING.map(([q, s]) => `<figure class="q"><blockquote><p>${esc(q)}</p></blockquote><figcaption>${src(s)}</figcaption></figure>`).join('')}
<div class="cols2" style="margin-top:10px"><div class="panel"><b>The product</b><p>${PH('Overskill product screenshots')}</p></div><div class="panel"><b>Milestone</b><p>${PH('an Overskill milestone you can share, like a launch date')}</p></div></div></div></section>
<section class="sec" aria-labelledby="selected">${secH('selected', 'Selected work')}
<div style="padding:0 4px"><div class="panel"><b>Case study 1</b><p>${PH('problem, decision, outcome')}</p></div><div class="panel"><b>Case study 2</b><p>${PH('problem, decision, outcome')}</p></div><div class="panel"><b>Case study 3</b><p>${PH('problem, decision, outcome')}</p></div><div class="panel"><b>Brands</b><p>${PH('brands you can name publicly')}</p></div></div></section>
<section class="sec" aria-labelledby="about">${secH('about', 'About')}
<div class="about"><picture><source srcset="/media/about/jason.webp" type="image/webp"><img src="/media/about/jason.jpg" alt="Jason Sanzone" width="120" height="120" loading="lazy" decoding="async"></picture><div><p>${BIO_LEDE}</p><p>${BIO_REST}</p></div></div></section>
<section class="sec" aria-labelledby="contact">${secH('contact', 'Contact')}<p class="sec-p">Email is the fastest way to reach me.</p>
<div class="contact"><a class="btn pri" href="mailto:${SOCIAL.email}">${SOCIAL.email}</a><button class="btn" type="button" data-copy-email>${ico('copy')}Copy</button>${ELSEWHERE.map(([l, u]) => `<a class="btn" href="${u}" ${EXT}>${l}</a>`).join('')}</div></section>
${footer()}
</div>`,
  });
}

function gearPage(posts) {
  return layout({
    title: `Gear · ${SITE.name}`,
    description: 'What Jason Sanzone carries every day, the bag he wants next, and what is on his radar.',
    url: '/gear/',
    current: 'gear',
    posts,
    body: `<div class="col">
<h1 class="ph1">Gear</h1>
<p class="sub">What I carry, what I'm replacing, and what's on my radar. ${CF('current carry, Oct 2026')}</p>
<section class="sec" aria-labelledby="carry">${secH('carry', 'Daily carry')}${carryTable(CARRY)}</section>
<section class="sec" aria-labelledby="next">${secH('next', 'The next bag')}<p class="sec-p">The CTB26 is on the way out.</p>
<div class="tbl"><table class="spec kv"><tbody><tr><td>Want</td><td>${NEXT_BAG.map(esc).join(', ')}</td></tr><tr><td>Considering</td><td>Pioneer Duration, Panda</td></tr><tr><td>Leaning</td><td>Duration ${CF('still leaning Duration?')}</td></tr></tbody></table></div></section>
<section class="sec" aria-labelledby="radar">${secH('radar', 'On my radar')}<p class="sec-p">Buck 797 Range Ops Pro. ${CF('did you buy it?')}</p>
<div class="tbl"><table class="spec kv"><tbody><tr><td>Blade</td><td>3.38" 154CM reverse tanto</td></tr><tr><td>Lock</td><td>Crossbar lock</td></tr><tr><td>Weight</td><td>3.6 oz</td></tr><tr><td>Made in</td><td>USA</td></tr></tbody></table></div></section>
<section class="sec" aria-labelledby="photos">${secH('photos', 'Photos')}<p class="sec-p">${PH('photos of the carry')}</p></section>
${footer()}
</div>`,
  });
}

function notFoundPage(posts) {
  return layout({
    title: `Not found · ${SITE.name}`,
    description: 'This page does not exist.',
    url: '/404.html',
    current: '',
    posts,
    noindex: true,
    body: `<div class="col">
<h1 class="ph1">Not found</h1>
<p class="sub">That page doesn't exist. Press <kbd>⌘K</kbd> to search, or head home.</p>
<div class="acts"><a class="btn pri" href="/">Home</a><a class="btn" href="/writing/">Writing</a></div>
</div>`,
  });
}

// ---------- feed + redirects ----------
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
    <title>${esc(SITE.name)} · ${SITE.writingTitle}</title>
    <link>${SITE.url}/writing/</link>
    <description>${esc(SITE.writingDescription)}</description>
    <language>en-us</language>
${posts.length ? `    <lastBuildDate>${posts[0].date.toUTCString()}</lastBuildDate>\n` : ''}    <atom:link href="${SITE.url}/writing/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}

// GitHub Pages has no server-side redirects: these pages forward instantly (keeping ?query and #hash).
// Targets are written relative to the redirect page, so they also work when the site is served under a base path.
function redirectPage(from, to) {
  const url = abs(to);
  const [toPath, toHash = ''] = to.split('#');
  const depth = from.split('/').filter(Boolean).length;
  const rel = ('../'.repeat(depth) + toPath.replace(/^\//, '')) || './';
  return `<!DOCTYPE html>
<html lang="${SITE.lang}">
<head>
<meta charset="utf-8">
<title>Moved to ${esc(url)}</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${esc(url)}">
<meta http-equiv="refresh" content="0; url=${esc(rel + (toHash ? '#' + toHash : ''))}">
<script>${THEME_JS}</script>
<script>location.replace(${JSON.stringify(rel)} + location.search + (location.hash || ${JSON.stringify(toHash ? '#' + toHash : '')}));</script>
<link rel="stylesheet" href="${'../'.repeat(depth)}assets/site.css">
</head>
<body style="padding:28px;color:var(--tx2)">
<p>This page has moved to <a class="lk" href="${esc(rel + (toHash ? '#' + toHash : ''))}">${esc(url)}</a>.</p>
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
fs.copyFileSync(path.join(ROOT, 'site-src/ui.js'), path.join(OUT, 'assets/ui.js'));

const posts = loadPosts();
write('index.html', homePage(posts));
write('writing/index.html', writingPage(posts));
posts.forEach((p, i) => write(`writing/${p.slug}/index.html`, postPage(p, i, posts)));
write('work/index.html', workPage(posts));
write('gear/index.html', gearPage(posts));
write('404.html', notFoundPage(posts));
const feedXml = feed(posts);
write('writing/feed.xml', feedXml);

// Old URLs
for (const base of ['journal', 'blog']) {
  write(`${base}/index.html`, redirectPage(`/${base}/`, '/writing/'));
  for (const p of posts) write(`${base}/${p.slug}/index.html`, redirectPage(`/${base}/${p.slug}/`, p.url));
  write(`${base}/feed.xml`, feedXml);
}
write('about/index.html', redirectPage('/about/', '/work/#about'));

console.log(`Built ${posts.length} post(s) into ${path.relative(ROOT, OUT)}/`);
