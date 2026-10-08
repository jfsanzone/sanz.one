/* sanz.one Field lab: side (Studio / Field) and mode (light / dark), inlined into <head> of every page.
   Two independent choices on <html>: data-side="studio"|"field" (copy, fonts, texture; .sz-s / .sz-f show per side)
   and data-theme="light"|"dark" (palette). Side is stored in localStorage K (default Studio); mode in K + "-mode"
   (default: the system preference, followed live until the visitor picks one). Both are applied here before first
   paint, so no combination flashes; every page re-reads them when shown (pagereveal, pageshow,
   prerenderingchange) and across tabs (storage). The landing page swaps its whole <html> element when the bundle
   unpacks; window and document survive, so this runs once (window.__szTheme) and a MutationObserver puts the
   attributes back. Controls: .sz-side (role=switch, aria-checked = Field) flips the side inside a same-document
   View Transition (a wipe; html.sz-vt names the root); .sz-mode flips light/dark with a crossfade (html.sz-vt
   plus sz-vt-fade) and its aria-label says what it switches to. Without View Transitions colours ease over
   250ms (html.sz-theming); reduced motion switches instantly. Keep this file free of line comments and
   backslashes: it is inlined as a single line (and JSON-escaped in the landing template). */
(function () {
  var W = window, d = document, K = 'sz-side', KM = K + '-mode';
  var C = { studio: { dark: '#121211', light: '#F6F6F3' }, field: { light: '#E9E2D3', dark: '#16140F' } };
  var S = W.__szTheme;
  if (S) { S.apply(); return; }
  var side = '', mode = '', tm = 0;
  var mq = W.matchMedia ? W.matchMedia('(prefers-color-scheme: light)') : null;
  var rm = function () { return !!(W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches); };
  var get = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var put = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  var readSide = function () { return get(K) === 'field' ? 'field' : 'studio'; };
  var readMode = function () { var m = get(KM); return m === 'light' || m === 'dark' ? m : (mq && mq.matches ? 'light' : 'dark'); };
  var sync = function () {
    var b = d.querySelectorAll('.sz-side'), i, on = side === 'field' ? 'true' : 'false';
    for (i = 0; i < b.length; i++) if (b[i].getAttribute('aria-checked') !== on) b[i].setAttribute('aria-checked', on);
    var lab = mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    b = d.querySelectorAll('.sz-mode');
    for (i = 0; i < b.length; i++) if (b[i].getAttribute('aria-label') !== lab) b[i].setAttribute('aria-label', lab);
    var m = d.querySelector('meta[name="theme-color"]');
    if (m && side && mode) m.setAttribute('content', C[side][mode]);
  };
  var set = function (s, m) {
    var r = d.documentElement;
    side = s; mode = m;
    if (r.getAttribute('data-side') !== s) r.setAttribute('data-side', s);
    if (r.getAttribute('data-theme') !== m) r.setAttribute('data-theme', m);
    sync();
  };
  var apply = function (s, m, anim) {
    var r = d.documentElement;
    s = s || readSide(); m = m || readMode();
    if (anim && !rm()) {
      if (d.startViewTransition) {
        r.classList.add('sz-vt');
        if (anim === 'fade') r.classList.add('sz-vt-fade');
        var v = d.startViewTransition(function () { set(s, m); });
        var f = function () { d.documentElement.classList.remove('sz-vt', 'sz-vt-fade'); };
        v.finished.then(f, f);
        return;
      }
      r.classList.add('sz-theming');
      clearTimeout(tm);
      tm = setTimeout(function () { d.documentElement.classList.remove('sz-theming'); }, 320);
    }
    set(s, m);
  };
  var re = function () {
    var s = readSide(), m = readMode(), r = d.documentElement;
    if (s !== side || m !== mode || r.getAttribute('data-side') !== s || r.getAttribute('data-theme') !== m) apply(s, m);
  };
  d.addEventListener('prerenderingchange', re);
  W.addEventListener('pagereveal', re);
  W.addEventListener('pageshow', re);
  W.addEventListener('storage', function (e) { if (e.key === K || e.key === KM) apply(readSide(), readMode(), e.key === K ? 'wipe' : 'fade'); });
  if (mq) {
    var sys = function () { if (!get(KM)) apply(side, readMode(), 'fade'); };
    if (mq.addEventListener) mq.addEventListener('change', sys); else if (mq.addListener) mq.addListener(sys);
  }
  var say = function (b, t) { var l = b.querySelector('.sz-side-live'); if (l) l.textContent = t; };
  d.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target : null;
    var b = t ? t.closest('.sz-side') : null;
    if (b) {
      var s = side === 'field' ? 'studio' : 'field';
      put(K, s);
      apply(s, mode, 'wipe');
      say(b, (s === 'field' ? 'Field' : 'Studio') + ' mode');
      return;
    }
    b = t ? t.closest('.sz-mode') : null;
    if (b) {
      var m = mode === 'dark' ? 'light' : 'dark';
      put(KM, m);
      apply(side, m, 'fade');
      say(b, (m === 'dark' ? 'Dark' : 'Light') + ' mode');
    }
  });
  if (W.MutationObserver) new MutationObserver(function () { var r = d.documentElement; if (r.getAttribute('data-side') !== side || r.getAttribute('data-theme') !== mode) set(side, mode); }).observe(d, { childList: true });
  W.__szTheme = { read: readSide, apply: apply, sync: sync };
  apply();
})();
