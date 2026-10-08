/* sanz.one colour themes (inlined into <head> of every page, not served as a file).
   Palettes live in site-src/assets/site.css (theme block, [data-theme="..."] on <html>); the landing page
   (index.html) carries copies of that block, of this script and of the switcher button. The choice is stored in
   localStorage ("sz-theme") and applied here, before first paint, so there is no flash. Every page also
   re-reads it when it is shown (pagereveal, pageshow, prerenderingchange): a page prerendered before the theme
   was changed picks the new one up when it is activated, before its first frame. The landing page swaps its
   whole <html> element when the bundle unpacks; window and document survive that swap, so this script runs
   once (window.__szTheme) and a MutationObserver puts data-theme straight back on the new <html>.
   Clicking the paintbrush (.sz-theme, any page) moves to the next palette; colours ease over 250ms
   (html.sz-theming, skipped with reduced motion). The palette name is never shown; it is announced to screen
   readers through the button's visually hidden live region (.sz-theme-live). Keep this file free of // comments and backslashes: it is
   inlined as a single line (and JSON-escaped in the landing template). */
(function () {
  var W = window, d = document, K = 'sz-theme';
  var T = ['ember', 'slime', 'ink', 'sage'];
  var N = { ember: 'Ember', slime: 'Slime', ink: 'Ink', sage: 'Sage' };
  var C = { ember: '#0A0A0A', slime: '#0A1A10', ink: '#1A1B26', sage: '#2D353B' };
  var S = W.__szTheme;
  if (S) { S.apply(S.read()); return; }
  var cur = '', tm = 0;
  var rm = function () { return !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches); };
  var read = function () { var t = null; try { t = localStorage.getItem(K); } catch (e) {} return T.indexOf(t) < 0 ? T[0] : t; };
  var sync = function () {
    var m = d.querySelector('meta[name="theme-color"]');
    if (m) m.setAttribute('content', C[cur]);
  };
  var apply = function (t, anim) {
    var r = d.documentElement;
    if (anim && !rm()) {
      r.classList.add('sz-theming');
      clearTimeout(tm);
      tm = setTimeout(function () { d.documentElement.classList.remove('sz-theming'); }, 320);
    }
    cur = t;
    if (r.getAttribute('data-theme') !== t) r.setAttribute('data-theme', t);
    sync();
  };
  var re = function () { var t = read(); if (t !== cur || d.documentElement.getAttribute('data-theme') !== t) apply(t); };
  d.addEventListener('prerenderingchange', re);
  W.addEventListener('pagereveal', re);
  W.addEventListener('pageshow', re);
  W.addEventListener('storage', function (e) { if (e.key === K) apply(read(), true); });
  d.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('.sz-theme') : null;
    if (!b) return;
    var t = T[(T.indexOf(cur) + 1) % T.length];
    try { localStorage.setItem(K, t); } catch (x) {}
    apply(t, true);
    var l = b.querySelector('.sz-theme-live');
    if (l) l.textContent = 'Colour theme: ' + N[t];
  });
  if (W.MutationObserver) new MutationObserver(function () { if (d.documentElement.getAttribute('data-theme') !== cur) apply(cur); }).observe(d, { childList: true });
  W.__szTheme = { read: read, apply: apply, sync: sync };
  apply(read());
})();
