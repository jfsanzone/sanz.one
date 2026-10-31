/* Quiet segue direction (inlined as a blocking script in <head> of every page).
   Moving down the sidebar order plays forwards; moving up it, or a Back traverse, tags the view transition
   'backwards' so site-src/assets/segue.css mirrors the small drift. Order: home 0, writing 1, a post 1.5, work 2, gear 3.
   The page left comes from navigation.activation.from (Navigation API) or, without it, the URL stored in sessionStorage
   ("sz-vt") on pageswap. Paths are read relative to the home link (a.id), so this also works under a base path. Unknown pages play forwards. Keep this file free of line comments and backslashes: it is inlined. */
(function (W) {
  var K = 'sz-vt', R = { home: 0, writing: 1, work: 2, gear: 3 };
  var rank = function (u) {
    try {
      var h = document.querySelector('a.id'), b = h ? h.pathname : '/', p = new URL(u, location.href).pathname;
      if (p.indexOf(b) !== 0) return null;
      var s = p.slice(b.length).replace(/index[.]html$/, '').split('/'), k = s[0] || 'home';
      if (!Object.prototype.hasOwnProperty.call(R, k)) return null;
      return k === 'writing' && s[1] ? 1.5 : R[k];
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
