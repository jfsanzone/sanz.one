/* sanz.one segmented nav controller (inlined, not served as a file).
   Used by scripts/build.mjs (about/journal/posts: script right after the nav) and pasted into index.html
   (landing shell + bundled template). Clicking any same-origin link to /, /about/ or /journal/... starts
   the highlight sliding right away and stores {from, to, click time} ("sz-seg-from"). When the page is swapped out
   (pageswap) it adds how far the slide got (plus one frame: the old page is captured on its next frame); the next
   page resumes the slide from there on its first frame, so it runs once and does not jump (it only pauses while
   the browser swaps pages). Without pageswap, the resume point is the time since the click. The slide animates transforms only (see site.css: three pill pieces plus a window holding the
   dark label copy, counter-transformed), so it runs on the compositor and keeps moving while the page is busy.
   The easing is sampled into keyframes because the dark copy's counter-scale is not linear. It is an ease-out
   (cubic-bezier(.2,.8,.2,1), 400ms): the highlight visibly moves on the very next frame after the click.
   With cross-document View Transitions the nav has a fixed view-transition-name and no animation, so it
   stays put; the page itself is not snapshotted. The pages prerender each other (speculation rules), so a
   prerendered page waits for activation (prerenderingchange) before reading the stored slide, and then fades
   its content in (opacity, 200ms) since its own load fade-in already ran while it was hidden.
   The landing shell hands the slide on to the bundled template through window.__szNav (window survives the
   bundle's document swap); a nav that is no longer in the document does nothing. A skipped view transition
   (e.g. a quick second navigation) rejects its promises; those are caught to keep the console clean. Chrome
   sometimes skips a transition before the new page can see it (pagereveal has no viewTransition), so those
   rejections are silenced by name and message ("Transition was ...") in an unhandledrejection listener.
   Keep this file free of // comments and backslashes: it is inlined as a single line (and JSON-escaped in the landing template). */
(function (n) {
  if (!n) return;
  var W = window, K = 'sz-seg-from', D = 400, c = n.getAttribute('data-active');
  var th = n.querySelector('.sz-seg-thumb');
  var els = [].slice.call(th.querySelectorAll('.sz-seg-p')).concat([th.querySelector('.sz-seg-win'), th.querySelector('.sz-seg-ink')]);
  var L = 38, M = 81, G = { home: [3, 41], about: [41, 122], journal: [122, 203] };
  var rm = function () { return W.matchMedia('(prefers-reduced-motion: reduce)').matches; };
  var now = function () { return performance.timeOrigin + performance.now(); };
  var set = function (k) { n.setAttribute('data-active', k); };
  var keyOf = function (a) {
    if (!a || a.origin !== location.origin) return null;
    var p = a.pathname;
    if (p === '/' || p === '/index.html') return 'home';
    if (p === '/about' || p === '/about/') return 'about';
    return p === '/journal' || p.slice(0, 9) === '/journal/' ? 'journal' : null;
  };
  var bz = function (u, p, q) { var v = 1 - u; return 3 * v * v * u * p + 3 * v * u * u * q + u * u * u; };
  var ez = function (t) {
    var lo = 0, hi = 1, u = t;
    for (var i = 0; i < 24; i++) { u = (lo + hi) / 2; if (bz(u, 0.2, 0.2) < t) lo = u; else hi = u; }
    return bz(u, 0.8, 1);
  };
  var tf = function (a, b) {
    var s = (b - a) / M;
    return ['translateX(' + a + 'px)', 'translateX(' + (a + b - L) / 2 + 'px)', 'translateX(' + (b - L) + 'px)',
      'translateX(' + a + 'px) scaleX(' + s + ')', 'scaleX(' + 1 / s + ') translateX(' + -a + 'px)'];
  };
  var run = null, anims = [];
  var stop = function () { for (var i = 0; i < anims.length; i++) anims[i].cancel(); anims = []; run = null; };
  var at = function () {
    if (!run || !anims.length) return G[n.getAttribute('data-active')] || G[c];
    var p = (anims[0].currentTime || 0) / D;
    if (!(p < 1)) return run.B;
    var e = ez(Math.max(0, p));
    return [run.A[0] + (run.B[0] - run.A[0]) * e, run.A[1] + (run.B[1] - run.A[1]) * e];
  };
  var slide = function (A, B, st, ct) {
    stop();
    if (!th.animate || (A[0] === B[0] && A[1] === B[1])) return;
    var N = 30, kf = [[], [], [], [], []], j;
    for (var k = 0; k <= N; k++) {
      var e = ez(k / N), x = tf(A[0] + (B[0] - A[0]) * e, A[1] + (B[1] - A[1]) * e);
      for (j = 0; j < 5; j++) kf[j].push({ transform: x[j] });
    }
    run = { A: A, B: B };
    for (j = 0; j < 5; j++) {
      var an = els[j].animate(kf[j], { duration: D, easing: 'linear' });
      if (st != null) an.startTime = st; else an.currentTime = ct || 0;
      anims.push(an);
    }
  };
  var init = function (pre) {
    if (!n.isConnected) return;
    if (pre === true && !rm()) {
      var m = document.getElementById('dc-root');
      m = m ? [m] : document.querySelectorAll('.sz-main > :not(.sz-top)');
      for (var i = 0; i < m.length; i++) if (m[i].animate) m[i].animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' });
    }
    var h = W.__szNav, s = h && h.s, st = h && h.a ? h.a.startTime : null;
    W.__szNav = null;
    if (!s || s.t !== c) {
      s = null; st = null;
      try { s = JSON.parse(sessionStorage.getItem(K)); sessionStorage.removeItem(K); } catch (e) { s = null; }
    }
    var e = s ? (s.e != null ? s.e : now() - s.t0) : D;
    if (s && s.t === c && s.f !== c && G[s.f] && !rm() && e < D && now() - s.t0 < 10000) {
      slide(G[s.f], G[c], st, e);
      W.__szNav = { s: s, a: anims[0] };
    }
  };
  if (document.prerendering) document.addEventListener('prerenderingchange', function () { init(true); }, { once: true }); else init();
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest ? e.target.closest('a[href]') : null;
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    var k = keyOf(a);
    if (!k || k === c || !n.isConnected) return;
    try { sessionStorage.setItem(K, JSON.stringify({ f: c, t: k, t0: now() })); } catch (err) {}
    if (rm()) return;
    var A = at();
    set(k);
    slide(A, G[k], null, 0);
  });
  W.addEventListener('pageshow', function (e) { if (e.persisted) { stop(); set(c); } });
  var quiet = function (e) { var v = e.viewTransition, f = function () {}; if (v) { v.ready.catch(f); v.finished.catch(f); if (v.updateCallbackDone) v.updateCallbackDone.catch(f); } };
  W.addEventListener('pageswap', function (ev) {
    quiet(ev);
    if (!run || !anims.length || !n.isConnected) return;
    try {
      var s = JSON.parse(sessionStorage.getItem(K));
      if (s && s.f === c) { s.e = Math.min(D, Math.max(anims[0].currentTime || 0, now() - s.t0 + 16)); sessionStorage.setItem(K, JSON.stringify(s)); }
    } catch (x) {}
  });
  W.addEventListener('pagereveal', quiet);
  W.addEventListener('unhandledrejection', function (e) {
    var r = e.reason, m = r && String(r.message);
    if (r && (r.name === 'AbortError' || r.name === 'InvalidStateError') && m.indexOf('Transition was ') === 0) e.preventDefault();
  });
})
