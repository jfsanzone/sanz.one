/* sanz.one Studio / Field switch (inlined into <head> of every page, not served as a file).
   Two sides of the site: Studio (design, AI, product; the dark look) and Field (outdoors, camping, gear; a warm
   canvas look with its own type and copy). data-side="studio"|"field" on <html> drives everything in CSS: the
   palette, fonts and texture (site.css side block), and which copy shows (.sz-s = Studio only, .sz-f = Field
   only). data-theme stays "dark" so the Studio palette is the base. The choice is stored in localStorage
   ("sz-side", default Studio) and applied here before first paint, so there is no flash; every page re-reads it
   when shown (pagereveal, pageshow, prerenderingchange) and across tabs (storage). The landing page swaps its
   whole <html> element when the bundle unpacks; window and document survive, so this runs once (window.__szTheme)
   and a MutationObserver puts the attributes back. The switch (.sz-side, role=switch, aria-checked = Field) flips
   the side inside a same-document View Transition (a quick wipe, html.sz-vt names the root for it); without View
   Transitions colours ease over 250ms (html.sz-theming); reduced motion switches instantly. Keep this file free
   of // comments and backslashes: it is inlined as a single line (and JSON-escaped in the landing template). */
(function () {
  var W = window, d = document, K = 'sz-side';
  var C = { studio: '#121211', field: '#E9E2D3' };
  var S = W.__szTheme;
  if (S) { S.apply(S.read()); return; }
  var cur = '', tm = 0;
  var rm = function () { return !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches); };
  var read = function () { var t = null; try { t = localStorage.getItem(K); } catch (e) {} return t === 'field' ? 'field' : 'studio'; };
  var sync = function () {
    var b = d.querySelectorAll('.sz-side'), on = cur === 'field' ? 'true' : 'false', i;
    for (i = 0; i < b.length; i++) if (b[i].getAttribute('aria-checked') !== on) b[i].setAttribute('aria-checked', on);
    var m = d.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', C[cur]);
  };
  var set = function (t) {
    var r = d.documentElement;
    cur = t;
    if (r.getAttribute('data-side') !== t) r.setAttribute('data-side', t);
    if (r.getAttribute('data-theme') !== 'dark') r.setAttribute('data-theme', 'dark');
    sync();
  };
  var apply = function (t, anim) {
    var r = d.documentElement;
    if (anim && !rm()) {
      if (d.startViewTransition) {
        r.classList.add('sz-vt');
        var v = d.startViewTransition(function () { set(t); });
        var f = function () { d.documentElement.classList.remove('sz-vt'); };
        v.finished.then(f, f);
        return;
      }
      r.classList.add('sz-theming');
      clearTimeout(tm);
      tm = setTimeout(function () { d.documentElement.classList.remove('sz-theming'); }, 320);
    }
    set(t);
  };
  var re = function () { var t = read(); if (t !== cur || d.documentElement.getAttribute('data-side') !== t) apply(t); };
  d.addEventListener('prerenderingchange', re);
  W.addEventListener('pagereveal', re);
  W.addEventListener('pageshow', re);
  W.addEventListener('storage', function (e) { if (e.key === K) apply(read(), true); });
  d.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('.sz-side') : null;
    if (!b) return;
    var t = cur === 'field' ? 'studio' : 'field';
    try { localStorage.setItem(K, t); } catch (x) {}
    apply(t, true);
    var l = b.querySelector('.sz-side-live');
    if (l) l.textContent = (t === 'field' ? 'Field' : 'Studio') + ' mode';
  });
  if (W.MutationObserver) new MutationObserver(function () { var r = d.documentElement; if (r.getAttribute('data-side') !== cur || r.getAttribute('data-theme') !== 'dark') set(cur); }).observe(d, { childList: true });
  W.__szTheme = { read: read, apply: apply, sync: sync };
  apply(read());
})();
