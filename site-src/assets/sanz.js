/* sanz.one · one script for every page.
   1. Light: eases --lx/--ly (0..1) on :root; the foil, satin and matte-black surfaces in site.css slide their
      soft highlights with it. Fine pointer: follows the cursor. Touch: drifts with scroll, plus device tilt
      where no permission prompt is needed (not iOS). Reduced motion: a fixed light.
   2. Copy email: any [data-copy] button copies its value (falls back to mailto:), announced in .sz-live.
   3. Expo Mode (every menu page, needs #ribbon): ported from the Editions experiment. Pure CSS 3D, no
      WebGL/canvas. Shift toggles, Escape exits, the bottom-left button works everywhere. */
(function () {
  'use strict';
  var d = document, W = window, root = d.documentElement;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var mqReduce = W.matchMedia('(prefers-reduced-motion: reduce)');
  var mqSmall = W.matchMedia('(max-width: 767px), (hover: none) and (pointer: coarse)');
  var fine = W.matchMedia('(hover: hover) and (pointer: fine)');
  var live = $('.sz-live');
  var on = function (m, f) { if (m.addEventListener) m.addEventListener('change', f); else m.addListener(f); };

  /* ---------------- 1. light ---------------- */
  (function () {
    var cur = { x: .38, y: .42 }, tgt = { x: .38, y: .42 }, raf = 0, sc = { x: .5, y: .5 }, tl = { x: 0, y: 0 };
    var tiltOK = 'DeviceOrientationEvent' in W && typeof DeviceOrientationEvent.requestPermission !== 'function';
    var set = function (x, y) { root.style.setProperty('--lx', x.toFixed(4)); root.style.setProperty('--ly', y.toFixed(4)); };
    var tick = function () {
      cur.x += (tgt.x - cur.x) * .08; cur.y += (tgt.y - cur.y) * .08; set(cur.x, cur.y);
      raf = Math.abs(tgt.x - cur.x) + Math.abs(tgt.y - cur.y) > .0008 ? requestAnimationFrame(tick) : 0;
    };
    var go = function () { if (!raf) raf = requestAnimationFrame(tick); };
    var clamp = function (v) { return Math.max(0, Math.min(1, v)); };
    var touchTarget = function () { tgt.x = clamp(sc.x + tl.x); tgt.y = clamp(sc.y + tl.y); go(); };
    var onMove = function (e) { tgt.x = e.clientX / W.innerWidth; tgt.y = e.clientY / W.innerHeight; go(); };
    var onScroll = function () { var t = W.scrollY / Math.max(1, W.innerHeight); sc.x = .5 + .34 * Math.sin(t * 1.7 - .45); sc.y = .5 + .22 * Math.cos(t * 1.3); touchTarget(); };
    var onTilt = function (e) {
      if (e.gamma == null) return;
      tl.x = Math.max(-25, Math.min(25, e.gamma)) / 25 * .3;
      tl.y = Math.max(-25, Math.min(25, (e.beta || 45) - 45)) / 25 * .2; touchTarget();
    };
    var mode = function () {
      W.removeEventListener('pointermove', onMove); W.removeEventListener('scroll', onScroll); W.removeEventListener('deviceorientation', onTilt);
      if (mqReduce.matches) { cancelAnimationFrame(raf); raf = 0; set(.38, .42); return; }
      if (fine.matches) W.addEventListener('pointermove', onMove, { passive: true });
      else { W.addEventListener('scroll', onScroll, { passive: true }); if (tiltOK) W.addEventListener('deviceorientation', onTilt, { passive: true }); onScroll(); }
    };
    set(cur.x, cur.y); mode(); on(mqReduce, mode); on(fine, mode);
  })();

  /* ---------------- 2. copy email ---------------- */
  d.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-copy]'); if (!b) return;
    var v = b.getAttribute('data-copy'), label = b.getAttribute('data-label') || b.textContent;
    b.setAttribute('data-label', label);
    var done = function () { b.textContent = 'Copied'; if (live) live.textContent = 'Email copied'; setTimeout(function () { b.textContent = label; }, 1600); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(v).then(done, function () { W.location.href = 'mailto:' + v; });
    else W.location.href = 'mailto:' + v;
  });

  /* ---------------- 3. Expo Mode ---------------- */
  var host = $('#ed-host'), ribbon = $('#ribbon'), btn = $('.ed-expo-btn');
  if (!host || !ribbon || !btn) return;
  var SVGNS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs, parent) {
    var e = d.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  var expo = null;

  /* in-page anchors: work in both modes */
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a || a.closest('[inert]')) return;
    var id = a.getAttribute('href').slice(1), el = id && d.getElementById(id);
    if (!el || !ribbon.contains(el)) return;
    e.preventDefault();
    var sec = el.closest('.ed-sec') || el;
    var top = sec.offsetTop + host.offsetTop;
    if (expo) top = sec.offsetTop + host.offsetTop - expo.Y + 30;
    W.scrollTo({ top: Math.max(0, top), behavior: (mqReduce.matches || expo) ? 'auto' : 'smooth' });
    if (history.replaceState) history.replaceState(null, '', '#' + id);
  });
  var ticking = false;
  W.addEventListener('scroll', function () { if (!expo || ticking) return; ticking = true; requestAnimationFrame(function () { ticking = false; if (expo) expo.frame(); }); }, { passive: true });
  var rzT = 0;
  W.addEventListener('resize', function () {
    clearTimeout(rzT);
    rzT = setTimeout(function () { if (expo && (root.clientWidth !== expo.vw || mqSmall.matches !== expo.small)) rebuildExpo(); }, 120);
  });
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
    var used = [], CT = ['sky', 'volt', 'lilac', 'orange'], small = expo.small;
    $$('[data-annot]', ribbon).forEach(function (p, pi) {
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
      var dim = svgEl('text', { x: r.left, y: r.bottom + 18, 'class': 'a-dim' }, a); dim.textContent = '\u2194 ' + p.offsetWidth + ' px';
    });
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
    };
    if (instant) { cancelAnimationFrame(e.anim); finish(); } else animate(0, finish);
  }
  function toggleExpo() { if (expo) exitExpo(); else enterExpo(); }
  // rotation / real width change while in Expo: rebuild in place at full tilt, keep scroll position
  function rebuildExpo() { if (!expo) return; cancelAnimationFrame(expo.anim); var on = expo.t > .5; exitExpo(true); if (on) enterExpo(true); }
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
