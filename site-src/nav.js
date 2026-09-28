/* sanz.one segmented nav controller (inlined, not served as a file).
   Used by scripts/build.mjs (about/journal/posts: script right after the nav) and pasted into index.html
   (landing shell + bundled template). Clicking any same-origin link to /, /about/ or /journal/... starts
   the highlight sliding right away and stores {from, to, start time} ("sz-seg-from"); the next page replays the
   rest of that slide with the Web Animations API, its start time pinned to the click (wall clock), so it
   runs once, continuously, across the navigation (even while the new page is still render-blocked).
   With cross-document View Transitions the nav has a fixed view-transition-name and no animation, so it
   stays put while only the content crossfades. The highlight is a clipped layer with dark copies of the
   labels (see site.css), so only its clip-path needs animating. The landing shell hands the slide on to the bundled
   template through window.__szNav (window survives the bundle's document swap). A skipped view transition
   (e.g. a quick second navigation) rejects its promises; those are caught to keep the console clean.
   Keep this file free of // comments: it is inlined as a single line. */
(function (n) {
  if (!n) return;
  var W = window, K = 'sz-seg-from', D = 450, c = n.getAttribute('data-active');
  var th = n.querySelector('.sz-seg-thumb');
  var rm = function () { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; };
  var now = function () { return performance.timeOrigin + performance.now(); };
  var set = function (k) { n.setAttribute('data-active', k); };
  var cs = function () { return getComputedStyle(th).clipPath; };
  var keyOf = function (a) {
    if (!a || a.origin !== location.origin) return null;
    var p = a.pathname;
    if (p === '/' || p === '/index.html') return 'home';
    if (p === '/about' || p === '/about/') return 'about';
    return p === '/journal' || p.slice(0, 9) === '/journal/' ? 'journal' : null;
  };
  var s = W.__szNav;
  W.__szNav = null;
  if (!s || s.t !== c) {
    s = null;
    try { s = JSON.parse(sessionStorage.getItem(K)); sessionStorage.removeItem(K); } catch (e) { s = null; }
  }
  if (s && s.t === c && s.f !== c && !rm() && th.animate && n.querySelector('[data-key="' + s.f + '"]') && now() - s.t0 < D) {
    th.style.transition = 'none';
    set(s.f); var A = cs(); set(c); var B = cs();
    th.style.transition = '';
    var o = { duration: D, easing: 'cubic-bezier(.65,0,.2,1)' }, t = s.t0 - performance.timeOrigin;
    th.animate([{ clipPath: A }, { clipPath: B }], o).startTime = t;
    W.__szNav = s;
  }
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    var k = keyOf(a);
    if (!k || k === c) return;
    try { sessionStorage.setItem(K, JSON.stringify({ f: c, t: k, t0: now() })); } catch (err) {}
    if (!rm()) set(k);
  });
  W.addEventListener('pageshow', function (e) { if (e.persisted) set(c); });
  var quiet = function (e) { var v = e.viewTransition, f = function () {}; if (v) { v.ready.catch(f); v.finished.catch(f); } };
  W.addEventListener('pageswap', quiet);
  W.addEventListener('pagereveal', quiet);
})
