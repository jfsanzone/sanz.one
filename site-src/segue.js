/* Framed Drift direction (inlined as a blocking script in <head> of every page, not served as a file).
   The move plays forwards when you go deeper in the menu and backwards when you go back:
   - a history traverse (Back / Forward) to a lower entry index is "back";
   - any other navigation compares the menu positions of the page left and the page shown, in menu order
     home 0, work 1, leadership 2, building 3, journal 4, a journal post 4.5, about 5, contact 6: moving to a lower position is "back".
     The page left comes from navigation.activation.from (Navigation API) or, without it, from the URL this script
     stores in sessionStorage ("sz-vt") on pageswap.
   "back" tags the view transition 'backwards', and site-src/assets/segue.css plays the mirrored move. Paths are read
   relative to the home link in the header (.sz-seg-home), so this also works under a base path. Without view transitions or types it
   does nothing; every step is guarded, and an unknown page plays forwards.
   Keep this file free of // comments and backslashes: it is inlined as a single line. */
(function (W) {
  var K = 'sz-vt', R = { home: 0, work: 1, leadership: 2, building: 3, journal: 4, about: 5, contact: 6 };
  var rank = function (u) {
    try {
      var h = document.querySelector('.sz-seg-home'), b = h ? h.pathname : '/', p = new URL(u, location.href).pathname;
      if (p.indexOf(b) !== 0) return null;
      var s = p.slice(b.length).replace(/index[.]html$/, '').split('/'), k = s[0] || 'home';
      if (!Object.prototype.hasOwnProperty.call(R, k)) return null;
      return k === 'journal' && s[1] ? 4.5 : R[k];
    } catch (e) { return null; }
  };
  W.addEventListener('pageswap', function () {
    try { sessionStorage.setItem(K, JSON.stringify({ u: location.href, t: Date.now() })); } catch (e) {}
  });
  W.addEventListener('pagereveal', function (e) {
    var v = e.viewTransition, s = null, back = false;
    try { s = JSON.parse(sessionStorage.getItem(K)); sessionStorage.removeItem(K); } catch (x) { s = null; }
    if (!v || !v.types || typeof v.types.add !== 'function') return;
    try {
      var n = W.navigation, a = n && n.activation;
      if (a && a.navigationType === 'traverse' && a.entry && a.from) back = a.entry.index < a.from.index;
      else {
        var from = a && a.from && a.from.url ? a.from.url : (s && s.u && Date.now() - s.t < 10000 ? s.u : null);
        var f = from ? rank(from) : null, t = rank(location.href);
        back = f != null && t != null && t < f;
      }
      if (back) v.types.add('backwards');
    } catch (x) {}
  });
})(window);
