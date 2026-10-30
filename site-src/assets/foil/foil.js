/* sanz.one · Foil — moves the light across the holographic page.
   Writes --lx/--ly (0..1) on :root; CSS slides the spectra + satin sheen.
   Fine pointer: follows the cursor (eased). Touch: scroll drift, plus device
   tilt where it needs no permission prompt (not iOS). Reduced motion: static. */
(function () {
  var d = document, root = d.documentElement, w = window;
  var reduce = w.matchMedia('(prefers-reduced-motion: reduce)');
  var fine = w.matchMedia('(hover: hover) and (pointer: fine)');
  var cur = { x: .38, y: .42 }, tgt = { x: .38, y: .42 }, raf = 0;
  var sc = { x: .5, y: .5 }, tl = { x: 0, y: 0 };
  var tiltOK = 'DeviceOrientationEvent' in w && typeof DeviceOrientationEvent.requestPermission !== 'function';
  function set(x, y) { root.style.setProperty('--lx', x.toFixed(4)); root.style.setProperty('--ly', y.toFixed(4)); }
  function tick() {
    cur.x += (tgt.x - cur.x) * .08; cur.y += (tgt.y - cur.y) * .08;
    set(cur.x, cur.y);
    if (Math.abs(tgt.x - cur.x) + Math.abs(tgt.y - cur.y) > .0008) raf = requestAnimationFrame(tick); else raf = 0;
  }
  function go() { if (!raf) raf = requestAnimationFrame(tick); }
  function clamp(v) { return Math.max(0, Math.min(1, v)); }
  function touchTarget() { tgt.x = clamp(sc.x + tl.x); tgt.y = clamp(sc.y + tl.y); go(); }
  function onMove(e) { tgt.x = e.clientX / w.innerWidth; tgt.y = e.clientY / w.innerHeight; go(); }
  function onScroll() {
    var t = w.scrollY / Math.max(1, w.innerHeight);
    sc.x = .5 + .34 * Math.sin(t * 1.7 - .45); sc.y = .5 + .22 * Math.cos(t * 1.3); touchTarget();
  }
  function onTilt(e) {
    if (e.gamma == null) return;
    tl.x = Math.max(-25, Math.min(25, e.gamma)) / 25 * .3;
    tl.y = Math.max(-25, Math.min(25, (e.beta || 45) - 45)) / 25 * .2; touchTarget();
  }
  function mode() {
    w.removeEventListener('pointermove', onMove); w.removeEventListener('scroll', onScroll); w.removeEventListener('deviceorientation', onTilt);
    if (reduce.matches) { cancelAnimationFrame(raf); raf = 0; set(.38, .42); return; }
    if (fine.matches) w.addEventListener('pointermove', onMove, { passive: true });
    else {
      w.addEventListener('scroll', onScroll, { passive: true });
      if (tiltOK) w.addEventListener('deviceorientation', onTilt, { passive: true });
      onScroll();
    }
  }
  set(cur.x, cur.y); mode();
  [reduce, fine].forEach(function (m) { m.addEventListener ? m.addEventListener('change', mode) : m.addListener(mode); });

  // copy email
  var live = d.querySelector('.live');
  d.addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy]'); if (!b) return;
    var v = b.getAttribute('data-copy'), label = b.textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(function () {
      b.textContent = 'Copied'; if (live) live.textContent = 'Email copied';
      setTimeout(function () { b.textContent = label; }, 1600);
    }).catch(function () { location.href = 'mailto:' + v; });
  });

  // refresh the journal list from the feed (static list is the fallback)
  var list = d.getElementById('posts');
  if (list && w.fetch && w.DOMParser) {
    fetch('/journal/feed.xml', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.text() : null; }).then(function (xml) {
      if (!xml) return;
      var doc = new DOMParser().parseFromString(xml, 'application/xml');
      var items = Array.prototype.slice.call(doc.getElementsByTagName('item'), 0, 3);
      if (!items.length) return;
      var txt = function (it, tag) { var n = it.getElementsByTagName(tag)[0]; return n ? n.textContent.trim() : ''; };
      var frag = d.createDocumentFragment();
      items.forEach(function (it) {
        var link = txt(it, 'link'), path = link.replace(/^https?:\/\/[^/]+/, '') || '/journal/';
        var dt = new Date(txt(it, 'pubDate'));
        var li = d.createElement('li'), a = d.createElement('a'); a.className = 'post'; a.href = path;
        var t = d.createElement('time');
        if (!isNaN(dt)) { t.dateTime = dt.toISOString().slice(0, 10); t.textContent = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }); }
        var st = d.createElement('strong'); st.textContent = txt(it, 'title');
        var sp = d.createElement('span'); sp.textContent = txt(it, 'description').replace(/<[^>]+>/g, '');
        a.appendChild(t); a.appendChild(st); a.appendChild(sp); li.appendChild(a); frag.appendChild(li);
      });
      var tmp = d.createElement('ol'); tmp.appendChild(frag.cloneNode(true));
      if (tmp.textContent.replace(/\s+/g, '') === list.textContent.replace(/\s+/g, '')) return;
      list.textContent = ''; list.appendChild(frag);
    }).catch(function () {});
  }
})();
