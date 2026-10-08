/* sanz.one light / dark mode (inlined into <head> of every page, not served as a file).
   The two palettes live in site-src/assets/site.css (theme block, [data-theme="dark"|"light"] on <html>); the
   landing page (index.html) carries copies of that block, of this script and of the toggle button. Until the
   visitor uses the toggle, the mode follows the system (prefers-color-scheme, live). The toggle stores an
   explicit choice in localStorage ("sz-theme") that then wins. It is applied here, before first paint, so there
   is no flash. Every page also re-reads it when it is shown (pagereveal, pageshow, prerenderingchange): a page
   prerendered before the mode was changed picks the new one up when it is activated, before its first frame.
   The landing page swaps its whole <html> element when the bundle unpacks; window and document survive that
   swap, so this script runs once (window.__szTheme) and a MutationObserver puts data-theme straight back on the
   new <html>. Clicking the toggle (.sz-theme, any page) flips the mode; colours ease over 250ms
   (html.sz-theming, skipped with reduced motion), and the new mode is announced in the button's visually hidden
   live region. Keep this file free of // comments and backslashes: it is inlined as a single line (and
   JSON-escaped in the landing template). */
(function () {
  var W = window, d = document, K = 'sz-theme';
  var C = { dark: '#121211', light: '#F6F6F3' };
  var S = W.__szTheme;
  if (S) { S.apply(S.read()); return; }
  var cur = '', tm = 0;
  var mq = W.matchMedia ? W.matchMedia('(prefers-color-scheme: light)') : null;
  var rm = function () { return !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches); };
  var saved = function () { var t = null; try { t = localStorage.getItem(K); } catch (e) {} return t === 'dark' || t === 'light' ? t : null; };
  var read = function () { return saved() || (mq && mq.matches ? 'light' : 'dark'); };
  var sync = function () {
    var b = d.querySelectorAll('.sz-theme'), l = 'Switch to ' + (cur === 'dark' ? 'light' : 'dark') + ' mode', i;
    for (i = 0; i < b.length; i++) if (b[i].getAttribute('aria-label') !== l) b[i].setAttribute('aria-label', l);
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
  if (mq && mq.addEventListener) mq.addEventListener('change', function () { if (!saved()) apply(read(), true); });
  d.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('.sz-theme') : null;
    if (!b) return;
    var t = cur === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(K, t); } catch (x) {}
    apply(t, true);
    var l = b.querySelector('.sz-theme-live');
    if (l) l.textContent = (t === 'dark' ? 'Dark' : 'Light') + ' mode';
  });
  if (W.MutationObserver) new MutationObserver(function () { if (d.documentElement.getAttribute('data-theme') !== cur) apply(cur); }).observe(d, { childList: true });
  W.__szTheme = { read: read, apply: apply, sync: sync };
  apply(read());
})();
