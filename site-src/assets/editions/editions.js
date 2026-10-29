/* sanz.one · Editions landing page: graph, nav state, journal refresh, Expo Mode (CSS 3D). */
(function () {
  'use strict';
  var d = document, W = window, root = d.documentElement;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var mqReduce = W.matchMedia('(prefers-reduced-motion: reduce)');
  var mqSmall = W.matchMedia('(max-width: 767px), (hover: none) and (pointer: coarse)');
  var SVGNS = 'http://www.w3.org/2000/svg';
  var host = $('#ed-host'), ribbon = $('#ribbon');
  var live = $('.ed-live');
  function svgEl(tag, attrs, parent) {
    var e = d.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  /* ---------------- network graph (real topics only) ---------------- */
  function buildGraph(svg) {
    var seed = 7;
    var rnd = function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    var core = { x: 500, y: 410 };
    var hubs = [
      { id: 'design', label: 'Design', x: 290, y: 255, href: '#work', n: 18 },
      { id: 'brands', label: 'Brands', x: 125, y: 125, href: '#work', n: 12 },
      { id: 'products', label: 'Products', x: 150, y: 500, href: '#work', n: 14 },
      { id: 'interfaces', label: 'Interfaces', x: 360, y: 665, href: '#work', n: 16 },
      { id: 'cf', label: 'ClickFunnels', x: 545, y: 110, href: 'https://www.clickfunnels.com', n: 14, ext: 1 },
      { id: 'ai', label: 'AI', x: 715, y: 235, href: '/journal/', n: 20 },
      { id: 'overskill', label: 'Overskill', x: 880, y: 395, href: 'https://www.overskill.com', n: 14, ext: 1 },
      { id: 'journal', label: 'Journal', x: 660, y: 610, href: '/journal/', n: 16 },
      { id: 'gear', label: 'Gear & EDC', x: 880, y: 700, href: '/about/', n: 12 }
    ];
    var by = {}; hubs.forEach(function (h) { by[h.id] = h; });
    var links = [['design', 'brands'], ['design', 'products'], ['design', 'interfaces'], ['design', 'cf'], ['cf', 'brands'], ['overskill', 'ai'], ['overskill', 'products'], ['journal', 'ai'], ['journal', 'gear'], ['journal', 'design'], ['interfaces', 'products']];
    var gE = svgEl('g', {}, svg), gL = svgEl('g', {}, svg), gH = svgEl('g', {}, svg);
    hubs.forEach(function (h) {
      svgEl('line', { x1: core.x, y1: core.y, x2: h.x, y2: h.y, 'class': 'g-edge' }, gE);
      for (var i = 0; i < h.n; i++) {
        var a = rnd() * Math.PI * 2, r = 34 + rnd() * 105;
        var x = h.x + Math.cos(a) * r, y = h.y + Math.sin(a) * r * .9;
        x = Math.max(8, Math.min(992, x)); y = Math.max(8, Math.min(800, y));
        svgEl('line', { x1: h.x, y1: h.y, x2: x, y2: y, 'class': 'g-edge' }, gE);
        if (rnd() < .2) svgEl('rect', { x: x - 6, y: y - 4.5, width: 12, height: 9, 'class': 'g-tile' }, gL);
        else svgEl('circle', { cx: x, cy: y, r: 1.4 + rnd() * 1.2, 'class': 'g-leaf' }, gL);
      }
    });
    links.forEach(function (l) { var a = by[l[0]], b = by[l[1]]; svgEl('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, 'class': 'g-edge g-edge-hub' }, gE); });
    var TONES = ['orange', 'volt', 'lilac', 'sky'];
    hubs.forEach(function (h, hi) {
      var a = svgEl('a', { href: h.href, 'class': 'g-hub t-' + TONES[hi % TONES.length] }, gH);
      if (h.ext) { a.setAttribute('target', '_blank'); a.setAttribute('rel', 'noopener noreferrer'); }
      svgEl('circle', { cx: h.x, cy: h.y, r: 11, 'class': 'g-ring' }, a);
      svgEl('circle', { cx: h.x, cy: h.y, r: 5 }, a);
      var left = h.x > 760;
      var t = svgEl('text', { x: left ? h.x - 14 : h.x + 14, y: h.y - 9, 'text-anchor': left ? 'end' : 'start' }, a);
      t.textContent = h.label;
      if (h.ext) { var ts = svgEl('tspan', { dx: 4 }, t); ts.textContent = '↗'; }
    });
    var c = svgEl('g', { 'class': 'g-core' }, gH);
    svgEl('circle', { cx: core.x, cy: core.y, r: 6 }, c);
    var ct = svgEl('text', { x: core.x + 14, y: core.y + 5 }, c); ct.textContent = 'Jason Sanzone';
  }
  var graph = $('.ed-graph-svg');
  if (graph) buildGraph(graph);

  /* ---------------- contact popover + copy ---------------- */
  var pill = $('.ed-pill'), pop = $('#ed-email-pop');
  if (pill && pop) {
    pill.addEventListener('click', function () {
      var open = pop.hasAttribute('hidden');
      if (open) pop.removeAttribute('hidden'); else pop.setAttribute('hidden', '');
      pill.setAttribute('aria-expanded', String(open));
    });
    d.addEventListener('click', function (e) { if (!pop.hasAttribute('hidden') && !e.target.closest('.ed-contact-pop')) { pop.setAttribute('hidden', ''); pill.setAttribute('aria-expanded', 'false'); } });
  }
  d.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy]'); if (!b) return;
    var txt = b.getAttribute('data-copy'), old = b.textContent;
    var done = function () { b.textContent = 'Copied'; live.textContent = 'Email copied'; setTimeout(function () { b.textContent = old; }, 1400); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { W.location.href = 'mailto:' + txt; });
    else W.location.href = 'mailto:' + txt;
  });

  /* ---------------- section geometry, bar + index state ---------------- */
  // field → [fill, text]; text is always ink #0A0A0A or fog #F2F2F2 (AA-checked)
  var INK = '#0A0A0A', FOG = '#F2F2F2';
  var FIELD = { orange: ['#FA431E', INK], light: ['#F3F3F3', INK], white: ['#FFFFFF', INK], ink: [INK, FOG], lilac: ['#BBA6FF', INK], cobalt: ['#2B3BFF', FOG], volt: ['#D4FF3A', INK], sky: ['#7BD8FF', INK] };
  var HEXF = {}; Object.keys(FIELD).forEach(function (k) { HEXF[FIELD[k][0]] = k; });
  var sections = $$('.ed-sec', ribbon), blocks = [];
  var indexNav = $('.ed-index'), idxLinks = $$('.ed-index a');
  function measure() {
    blocks = $$(':scope > *', ribbon).map(function (el) {
      var f = el.getAttribute('data-field'), f2 = f;
      if (!f) { var cs = el.getAttribute('style') || ''; var m = cs.match(/--a:(#\w+);--b:(#\w+)/); if (m) { f = HEXF[m[1].toUpperCase()]; f2 = HEXF[m[2].toUpperCase()]; } }
      return { el: el, top: el.offsetTop, h: el.offsetHeight, f: f || 'orange', f2: f2 || 'orange', id: el.id };
    });
  }
  function fieldAt(v) {
    for (var i = 0; i < blocks.length; i++) { var b = blocks[i]; if (v >= b.top && v < b.top + b.h) return v < b.top + b.h / 2 ? b.f : b.f2; }
    return 'orange';
  }
  function secAt(v) {
    var cur = sections[0];
    for (var i = 0; i < sections.length; i++) if (sections[i].offsetTop <= v) cur = sections[i];
    return cur;
  }
  var expo = null; // expo controller state
  function updateChrome() {
    var s = W.scrollY, vh = W.innerHeight;
    var probe = expo ? s + expo.Y + 160 : s + vh * .4;
    var sec = secAt(probe);
    idxLinks.forEach(function (a) { var on = a.getAttribute('data-sec') === sec.id; a.classList.toggle('is-active', on); if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    if (expo) return;
    var bar = FIELD[fieldAt(s + 26)], mid = FIELD[fieldAt(s + vh / 2)], low = FIELD[fieldAt(s + vh - 34)];
    root.style.setProperty('--bar-bg', bar[0]); root.style.setProperty('--bar-fg', bar[1]); root.style.setProperty('--bar-pill', bar[1] === INK ? FOG : INK);
    indexNav.style.setProperty('--idx-fg', mid[1]);
    var btn = $('.ed-expo-btn');
    btn.style.setProperty('--idx-fg', low[1]);
    btn.style.setProperty('--idx-line', low[1] === FOG ? 'rgba(242,242,242,.4)' : 'rgba(10,10,10,.28)');
    btn.style.setProperty('--idx-bg', low[1] === FOG ? 'rgba(242,242,242,.08)' : 'rgba(255,255,255,.14)');
    var theme = $('meta[name="theme-color"]'); if (theme) theme.setAttribute('content', bar[0]);
    indexNav.classList.toggle('is-on', s > vh * .55);
  }
  measure(); updateChrome();
  var ticking = false;
  W.addEventListener('scroll', function () { if (ticking) return; ticking = true; requestAnimationFrame(function () { ticking = false; if (expo) expo.frame(); updateChrome(); }); }, { passive: true });
  // Resize: iOS fires resize whenever the URL bar shows/hides (height only). In Expo we ignore
  // height-only changes and rebuild the scene in place on a real width change (rotation).
  var rzT = 0;
  W.addEventListener('resize', function () {
    clearTimeout(rzT);
    rzT = setTimeout(function () {
      if (expo) { if (root.clientWidth !== expo.vw || mqSmall.matches !== expo.small) rebuildExpo(); return; }
      measure(); updateChrome();
    }, 120);
  });
  W.addEventListener('load', function () { measure(); updateChrome(); });

  /* in-page anchors: work in both modes */
  d.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]'); if (!a || a.closest('[inert]')) return;
    var id = a.getAttribute('href').slice(1), el = id && d.getElementById(id);
    if (!el || !ribbon.contains(el)) return;
    e.preventDefault();
    var sec = el.closest('.ed-sec') || el;
    var top = sec.offsetTop + host.offsetTop;
    if (expo) top = sec.offsetTop + host.offsetTop - expo.Y + 30;
    W.scrollTo({ top: Math.max(0, top), behavior: (mqReduce.matches || expo) ? 'auto' : 'smooth' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });

  /* ---------------- journal: refresh from RSS ---------------- */
  (function refreshPosts() {
    var list = $('#ed-posts'); if (!list || !W.fetch || !W.DOMParser) return;
    fetch('/journal/feed.xml', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.text() : null; }).then(function (xml) {
      if (!xml) return;
      var doc = new DOMParser().parseFromString(xml, 'application/xml');
      var items = Array.prototype.slice.call(doc.getElementsByTagName('item'), 0, 3);
      if (!items.length) return;
      var txt = function (it, tag) { var n = it.getElementsByTagName(tag)[0]; return n ? n.textContent.trim() : ''; };
      var frag = d.createDocumentFragment();
      items.forEach(function (it) {
        var link = txt(it, 'link'), path = link.replace(/^https?:\/\/[^/]+/, '') || '/journal/';
        var dt = new Date(txt(it, 'pubDate'));
        var li = d.createElement('li'), a = d.createElement('a'); a.className = 'ed-post'; a.href = path;
        var t = d.createElement('time');
        if (!isNaN(dt)) { t.dateTime = dt.toISOString().slice(0, 10); t.textContent = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }); }
        var st = d.createElement('strong'); st.textContent = txt(it, 'title');
        var sp = d.createElement('span'); sp.textContent = txt(it, 'description').replace(/<[^>]+>/g, '');
        var em = d.createElement('em'); em.textContent = 'Read';
        a.appendChild(t); a.appendChild(st); a.appendChild(sp); a.appendChild(em); li.appendChild(a); frag.appendChild(li);
      });
      var tmp = d.createElement('ol'); tmp.appendChild(frag.cloneNode(true));
      if (tmp.textContent.replace(/\s+/g, '') === list.textContent.replace(/\s+/g, '')) return;
      list.textContent = ''; list.appendChild(frag); measure();
    }).catch(function () {});
  })();

  /* ================= EXPO MODE =================
     Pure CSS 3D (perspective + preserve-3d), no WebGL / canvas.
     stage (fixed, perspective) > world (translate+scale) > floor (rotateX θ, origin top)
       floor > clip (overflow hidden) > inner (rails + the real ribbon, translated by -v0)
       floor > hinge1 (above the floor, rotateX -δ) > [clip > inert clone] + hinge2 > ...
     Each hinge strip shows the slice of the page just before the previous one, so the
     strips stay contiguous and the far end of the ribbon bends up toward vertical.
     At t = 0 every angle is 0 and scale is 1, so the 3D scene is pixel-identical to the
     flat page; entering/leaving just animates t. */
  var CFG = { theta: 58, bend: 62, n: 8, h: 130, scale: .6, yFlat: .34, yExpo: .38, persp: 1500, dur: 950, M: 150, grid: 2400 };
  // Phones / touch: gentler tilt, shallow 3-strip curve (3 clones instead of 8), less zoom-out, slim rails, little decoration.
  var CFG_M = { theta: 42, bend: 30, n: 3, h: 170, scale: .8, yFlat: .3, yExpo: .24, persp: 1000, dur: 800, M: 26, grid: 500, mobile: true };
  var btn = $('.ed-expo-btn');
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function buildRails(inner, H, M) {
    ['l', 'r'].forEach(function (side) {
      var r = d.createElement('div'); r.className = 'ed-rail ed-rail-' + side; r.setAttribute('aria-hidden', 'true'); r.style.width = M + 'px';
      for (var v = 100; v < H; v += 100) {
        if (v % 500 === 0) { var s = d.createElement('span'); s.style.top = v + 'px'; s.textContent = v; r.appendChild(s); }
        else { var i = d.createElement('i'); i.style.top = v + 'px'; r.appendChild(i); }
      }
      inner.appendChild(r);
    });
  }
  function wire(kind, css, spin) {
    var w = d.createElement('div'); w.className = 'ed-wire' + (spin ? ' ed-wire-spin' : ''); w.style.cssText = css; w.setAttribute('aria-hidden', 'true');
    var s = svgEl('svg', { viewBox: '-100 -100 200 200', width: '100%', height: '100%', fill: 'none', stroke: 'currentColor', 'stroke-width': '.8' }, w);
    var i;
    if (kind === 'torus') { for (i = 0; i < 14; i++) svgEl('ellipse', { cx: 0, cy: 0, rx: 92, ry: 30, transform: 'rotate(' + (i * 180 / 14) + ')' }, s); svgEl('circle', { cx: 0, cy: 0, r: 30 }, s); }
    else if (kind === 'cube') { svgEl('path', { d: 'M-50-20 0-48 50-20 0 8z M-50-20v60L0 68V8 M50-20v60L0 68 M-50 40 0 12 50 40 M0-48v60' }, s); for (i = -40; i <= 40; i += 20) svgEl('path', { d: 'M' + (-50) + ' ' + (i + 2) + ' 0 ' + (i + 30) + ' 50 ' + (i + 2) }, s); }
    else { for (i = 1; i <= 5; i++) svgEl('circle', { cx: 0, cy: 0, r: i * 18 }, s); svgEl('path', { d: 'M-100 0H100M0-100V100' }, s); }
    return w;
  }

  function enterExpo(instant) {
    if (expo) return;
    measure();
    var small = mqSmall.matches, C = small ? CFG_M : CFG;
    var s = W.scrollY, vw = root.clientWidth, vh = W.innerHeight;
    var Wd = ribbon.offsetWidth, H = ribbon.offsetHeight, M = C.M;
    var Y = Math.round(vh * C.yFlat), Hf = Math.round(vh * 1.7);
    host.style.height = H + 'px';
    ribbon.style.width = Wd + 'px';

    var stage = d.createElement('div'); stage.className = 'ed-stage' + (small ? ' ed-m' : ''); stage.style.perspective = C.persp + 'px';
    var bg = d.createElement('div'); bg.className = 'ed-stage-bg'; stage.appendChild(bg);
    var world = d.createElement('div'); world.className = 'ed-world'; world.style.width = Wd + 'px'; stage.appendChild(world);
    var floor = d.createElement('div'); floor.className = 'ed-floor'; floor.style.width = Wd + 'px'; floor.style.height = Hf + 'px'; world.appendChild(floor);
    var grid = d.createElement('div'); grid.className = 'ed-gridplane'; grid.style.cssText = 'left:' + (-C.grid) + 'px;top:' + (-600) + 'px;width:' + (Wd + 2 * C.grid) + 'px;height:' + (Hf + 1400) + 'px;transform:translateZ(-60px)';
    floor.appendChild(grid);
    var clip = d.createElement('div'); clip.className = 'ed-clip'; clip.style.cssText = 'left:' + (-M) + 'px;width:' + (Wd + 2 * M) + 'px;height:' + Hf + 'px';
    floor.appendChild(clip);
    var inner = d.createElement('div'); inner.className = 'ed-inner'; inner.style.width = (Wd + 2 * M) + 'px'; inner.style.height = H + 'px';
    buildRails(inner, H, M);
    ribbon.style.margin = '0 ' + M + 'px';
    clip.appendChild(inner);
    inner.insertBefore(ribbon, inner.firstChild);

    // hinge chain of inert clones
    var hinges = [], parent = floor;
    for (var k = 1; k <= C.n; k++) {
      var hg = d.createElement('div'); hg.className = 'ed-hinge'; hg.style.width = Wd + 'px'; hg.style.height = C.h + 'px';
      var hc = d.createElement('div'); hc.className = 'ed-clip'; hc.style.cssText = 'left:' + (-M) + 'px;width:' + (Wd + 2 * M) + 'px;height:' + (C.h + 2) + 'px'; // 2px overlap hides seams
      var cl = inner.cloneNode(true); cl.setAttribute('aria-hidden', 'true'); cl.setAttribute('inert', ''); cl.inert = true;
      $$('[id]', cl).forEach(function (n) { n.removeAttribute('id'); });
      hc.appendChild(cl); hg.appendChild(hc); parent.appendChild(hg);
      hinges.push({ el: hg, inner: cl }); parent = hg;
    }
    // blueprint decoration in the space around the ribbon
    var formulas;
    if (small) {
      stage.appendChild(wire('cube', 'right:5%;top:9%;width:64px;height:64px', false));
      formulas = [['θ = ' + C.theta + '°', 'left:5%;top:11%']];
    } else {
      stage.appendChild(wire('torus', 'right:2%;top:16%;width:240px;height:240px', true));
      stage.appendChild(wire('cube', 'left:3%;bottom:16%;width:180px;height:180px', false));
      stage.appendChild(wire('target', 'right:6%;bottom:8%;width:150px;height:150px', true));
      formulas = [['θ = ' + C.theta + '°', 'left:16%;top:22%'], ['z(v) = (v − v₀) · sin θ', 'right:18%;top:12%'], ['Δv = ' + C.h + 'px × ' + C.n, 'left:12%;top:58%'], ['W = ' + Wd + 'px', 'right:9%;top:52%']];
    }
    formulas.forEach(function (f) {
      var e = d.createElement('div'); e.className = 'ed-formula'; e.style.cssText = f[1]; e.textContent = f[0]; e.setAttribute('aria-hidden', 'true'); stage.appendChild(e);
    });
    var annot = svgEl('svg', { 'class': 'ed-annot', 'aria-hidden': 'true' });
    d.body.appendChild(stage); d.body.appendChild(annot);
    root.classList.add('ed-expo');
    indexNav.style.setProperty('--idx-fg', FOG);
    btn.style.setProperty('--idx-fg', FOG); btn.style.setProperty('--idx-line', 'rgba(242,242,242,.4)'); btn.style.setProperty('--idx-bg', 'rgba(10,10,10,.5)');
    btn.setAttribute('aria-pressed', 'true'); btn.setAttribute('aria-label', 'Exit Expo Mode'); $('.ed-expo-label', btn).textContent = 'Back';
    live.textContent = small ? 'Expo Mode on. Tap Back to return.' : 'Expo Mode on. Press Escape or Shift to go back.';

    expo = { stage: stage, world: world, floor: floor, inner: inner, hinges: hinges, annot: annot, Y: Y, Hf: Hf, Wd: Wd, vw: vw, vh: vh, t: 0, anim: 0, C: C, small: small };
    expo.apply = function () {
      var t = expo.t, sc = lerp(1, C.scale, t);
      var wy = lerp(Y, vh * C.yExpo, t), wx = (vw - Wd) / 2; // vh frozen at entry: URL-bar resizes don't move the scene
      world.style.transform = 'translate3d(' + wx + 'px,' + wy + 'px,0) scale(' + sc + ')';
      floor.style.transform = 'rotateX(' + (C.theta * t) + 'deg)';
      var dl = (C.bend / C.n) * t;
      for (var i = 0; i < hinges.length; i++) hinges[i].el.style.transform = 'rotateX(' + (-dl) + 'deg)';
      stage.style.setProperty('--expo-t', t.toFixed(3)); annot.style.setProperty('--expo-t', t.toFixed(3));
      expo.frame();
    };
    expo.frame = function () {
      var v0 = W.scrollY + Y;
      inner.style.transform = 'translate3d(0,' + (-v0) + 'px,0)';
      for (var i = 0; i < hinges.length; i++) hinges[i].inner.style.transform = 'translate3d(0,' + (-(v0 - (i + 1) * C.h)) + 'px,0)';
      if (!small || expo.anim) { drawAnnotations(v0); return; }
      // phones: callouts would be re-laid out every scroll frame; hide while moving, redraw once settled
      if (!expo.annDirty) { expo.annDirty = true; annot.style.visibility = 'hidden'; }
      var me = expo; clearTimeout(me.annT);
      me.annT = setTimeout(function () { if (expo !== me) return; expo.annDirty = false; drawAnnotations(W.scrollY + Y); annot.style.visibility = ''; }, 140);
    };
    if (instant) { expo.t = 1; expo.apply(); } else animate(1);
  }

  function drawAnnotations(v0) {
    var a = expo.annot; while (a.firstChild) a.removeChild(a.firstChild);
    if (expo.t < .6) return;
    var vw = root.clientWidth, vh = W.innerHeight, lo = v0, hi = v0 + expo.Hf * .7;
    // right-hand callouts: panel corner → floating label
    var used = [], CT = ['sky', 'volt', 'lilac', 'orange'], small = expo.small;
    $$('.ed-panel[data-annot]', ribbon).forEach(function (p, pi) {
      if (small && used.length) return;
      var tone = 't-' + CT[pi % CT.length];
      var sec = p.closest('.ed-sec'), top = sec.offsetTop + p.offsetTop;
      if (top < lo || top > hi) return;
      var r = p.getBoundingClientRect();
      if (r.top < 70 || r.top > vh - 60) return;
      if (small) {
        if (r.top < 110 || r.top > vh * .7) return;
        used.push(r.top);
        var gm = svgEl('g', { 'class': 'a-pill ' + tone }, a), mx = r.left + 4, my = r.top - 34;
        var tm = svgEl('text', { x: mx + 12, y: my + 4 }, gm); tm.textContent = p.getAttribute('data-annot');
        var mw = tm.getComputedTextLength ? tm.getComputedTextLength() + 24 : 160;
        gm.insertBefore(svgEl('rect', { x: mx, y: my - 12, width: mw, height: 24, rx: 12 }), tm);
        svgEl('path', { d: 'M' + (mx + 12) + ' ' + (my + 12) + ' V' + r.top }, a);
        svgEl('circle', { cx: mx + 12, cy: r.top, r: 3, 'class': tone }, a);
        return;
      }
      var lx = vw - 36, ly = r.top - 18;
      for (var i = 0; i < used.length; i++) if (Math.abs(used[i] - ly) < 40) return;
      used.push(ly);
      var g = svgEl('g', { 'class': 'a-pill ' + tone }, a);
      var tx = svgEl('text', { x: lx - 12, y: ly + 4, 'text-anchor': 'end' }, g); tx.textContent = p.getAttribute('data-annot');
      var bw = tx.getComputedTextLength ? tx.getComputedTextLength() + 24 : 200;
      g.insertBefore(svgEl('rect', { x: lx - bw, y: ly - 13, width: bw, height: 26, rx: 13 }), tx);
      svgEl('path', { d: 'M' + (lx - bw) + ' ' + ly + ' H' + (r.right + 30) + ' L' + r.right + ' ' + r.top }, a);
      svgEl('circle', { cx: r.right, cy: r.top, r: 3.5, 'class': tone }, a);
      // dimension label along the near edge of the panel
      var dim = svgEl('text', { x: r.left, y: r.bottom + 18, 'class': 'a-dim' }, a); dim.textContent = '↔ ' + p.offsetWidth + ' px';
    });
    // left: active index item → section title
    var act = !expo.small && $('.ed-index a.is-active');
    if (act) {
      var sec = $('#' + act.getAttribute('data-sec'));
      var title = sec && $('.ed-title, .ed-word-big', sec);
      if (title) {
        var tt = sec.offsetTop + (title.offsetTop || 0);
        var ar = act.getBoundingClientRect(), tr = title.getBoundingClientRect();
        if (tt >= lo - 200 && tt <= hi && tr.top > 60 && tr.top < vh - 40) {
          var x1 = ar.right + 6, y1 = ar.top + ar.height / 2, x2 = tr.left - 10, y2 = tr.top + tr.height / 2;
          svgEl('path', { d: 'M' + x1 + ' ' + y1 + ' C' + (x1 + 120) + ' ' + y1 + ' ' + (x2 - 140) + ' ' + y2 + ' ' + x2 + ' ' + y2 }, a);
          svgEl('circle', { cx: x2, cy: y2, r: 3 }, a);
          var lab = svgEl('text', { x: Math.max(x1 + 130, x2 - 220), y: y2 - 12 }, a); lab.textContent = act.textContent.trim();
        }
      }
    }
  }

  function animate(to, cb) {
    cancelAnimationFrame(expo.anim);
    expo.anim = 0;
    if (mqReduce.matches) { expo.t = to; expo.apply(); if (cb) cb(); return; }
    var from = expo.t, start = performance.now(), dur = expo.C.dur * Math.abs(to - from);
    expo.anim = -1;
    (function step(now) {
      var k = Math.min(1, (now - start) / Math.max(1, dur));
      expo.t = lerp(from, to, ease(k)); expo.apply();
      if (k < 1) expo.anim = requestAnimationFrame(step); else { expo.anim = 0; expo.apply(); if (cb) cb(); }
    })(start);
  }

  function exitExpo(instant) {
    if (!expo) return;
    var e = expo;
    var finish = function () {
      var s = W.scrollY;
      host.insertBefore(ribbon, host.firstChild);
      ribbon.style.width = ''; ribbon.style.margin = ''; host.style.height = '';
      clearTimeout(e.annT); e.stage.remove(); e.annot.remove();
      root.classList.remove('ed-expo');
      expo = null;
      W.scrollTo(0, s);
      btn.setAttribute('aria-pressed', 'false'); btn.setAttribute('aria-label', 'Enter Expo Mode'); $('.ed-expo-label', btn).textContent = 'Expo Mode';
      live.textContent = 'Expo Mode off.';
      measure(); updateChrome();
    };
    if (instant) { cancelAnimationFrame(e.anim); finish(); } else animate(0, finish);
  }
  function toggleExpo() { if (expo) exitExpo(); else enterExpo(); }
  // rotation / real width change while in Expo: rebuild in place at full tilt, keep scroll position
  function rebuildExpo() { if (!expo) return; cancelAnimationFrame(expo.anim); var on = expo.t > .5; exitExpo(true); if (on) enterExpo(true); else { measure(); updateChrome(); } }
  W.sanzExpo = { enter: enterExpo, exit: exitExpo, toggle: toggleExpo, cfg: CFG, cfgMobile: CFG_M, get on() { return !!expo; }, get mobile() { return !!(expo && expo.small); } };

  btn.addEventListener('click', function () { toggleExpo(); });
  // A lone Shift press toggles; Escape exits.
  var shiftArmed = false;
  var editable = function (el) { return el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)); };
  d.addEventListener('keydown', function (e) {
    if (e.key === 'Shift') { shiftArmed = !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey; return; }
    shiftArmed = false;
    if (e.key === 'Escape' && expo) exitExpo();
  });
  d.addEventListener('keyup', function (e) {
    if (e.key !== 'Shift' || !shiftArmed) return;
    shiftArmed = false;
    if (editable(d.activeElement) || mqSmall.matches) return;
    toggleExpo();
  });
  d.addEventListener('mousedown', function () { shiftArmed = false; }, true);
  W.addEventListener('blur', function () { shiftArmed = false; });
})();
