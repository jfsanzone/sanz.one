// Build the deployable site into _site/:
//   - root landing files are copied byte-for-byte (index.html, favicon.svg, CNAME, .nojekyll)
//   - media/ is copied as-is (Pages CMS uploads land in media/blog)
//   - content/posts/*.md is rendered to /blog, /blog/<slug>/ and /blog/feed.xml
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
  blogTitle: 'Writing',
  blogDescription: 'Jason Sanzone on design, AI, EDC and gear, and everything else.',
  blogSubline: 'Notes on design, AI, gear, and everything else.',
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
      url: `/blog/${slug}/`,
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

function layout({ title, description, url, ogType = 'website', image = '', extraHead = '', body }) {
  const card = image ? 'summary_large_image' : 'summary';
  return `<!DOCTYPE html>
<html lang="${SITE.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(abs(url))}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="alternate" type="application/rss+xml" title="${esc(SITE.name)} — ${esc(SITE.blogTitle)}" href="/blog/feed.xml">
<link rel="preload" href="/blog/assets/fonts/geist-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/blog/assets/blog.css">
<meta name="theme-color" content="#0A0A0A">
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
  <a class="sz-logo" href="/" aria-label="Jason Sanzone, home"><img src="/blog/assets/logo.svg" alt="Sanzone" width="31" height="40"></a>
  ${body}
  ${FOOTER}
</main>
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
    title: `${SITE.blogTitle} — ${SITE.name}`,
    description: SITE.blogDescription,
    url: '/blog/',
    body: `<section class="sz-content">
    <h1 class="sz-h1">${esc(SITE.blogTitle)}</h1>
    <p class="sz-sub">${esc(SITE.blogSubline)}</p>
    ${list}
  </section>`,
  });
}

function postPage(p) {
  const desc = p.description || `${p.title}, by ${SITE.name}.`;
  const back = `<a class="sz-back" href="/blog/">${BACK_ICON}<span>${esc(SITE.blogTitle)}</span></a>`;
  return layout({
    title: `${p.title} — ${SITE.name}`,
    description: desc,
    url: p.url,
    ogType: 'article',
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
    <title>${esc(SITE.name)} — ${esc(SITE.blogTitle)}</title>
    <link>${SITE.url}/blog/</link>
    <description>${esc(SITE.blogDescription)}</description>
    <language>en-us</language>
${posts.length ? `    <lastBuildDate>${posts[0].date.toUTCString()}</lastBuildDate>\n` : ''}    <atom:link href="${SITE.url}/blog/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
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
fs.cpSync(path.join(ROOT, 'blog-src/assets'), path.join(OUT, 'blog/assets'), { recursive: true });

const posts = loadPosts();
write('blog/index.html', indexPage(posts));
for (const p of posts) write(`blog/${p.slug}/index.html`, postPage(p));
write('blog/feed.xml', feed(posts));

console.log(`Built ${posts.length} post(s) into ${path.relative(ROOT, OUT)}/`);
