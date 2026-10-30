/* Framed Drift direction (inlined as a blocking script in <head> of every page, not served as a file).
   On a cross-document view transition, a history traverse to a lower entry index is "back": tag the
   transition 'backwards' so site-src/assets/segue.css plays the mirrored move. Without view transitions,
   types or the Navigation API it does nothing and the move plays forwards.
   Keep this file free of // comments and backslashes: it is inlined as a single line. */
(function (W) {
  W.addEventListener('pagereveal', function (e) {
    var v = e.viewTransition, n = W.navigation, a = n && n.activation;
    if (!v || !v.types || typeof v.types.add !== 'function' || !a || a.navigationType !== 'traverse' || !a.entry || !a.from) return;
    if (a.entry.index < a.from.index) v.types.add('backwards');
  });
})(window);
