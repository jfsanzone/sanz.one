/* sanz.one interface: theme switch, copy email, command menu (⌘K / Ctrl+K / "/"), the "C" shortcut and the mobile menu.
   Every control here is also a plain link or button in the page, so nothing depends on this file to work. */
(() => {
  const d = document, root = d.documentElement;
  const toastEl = d.querySelector('.toast');
  let toastT;
  const toast = (msg) => {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('on'), 1600);
  };

  // Theme: Auto (nothing stored) / Light / Dark, saved in localStorage "sz-theme".
  const current = () => { try { return localStorage.getItem('sz-theme') || 'auto'; } catch (e) { return 'auto'; } };
  const paint = (t) => d.querySelectorAll('[data-theme-set]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeSet === t)));
  const setTheme = (t) => {
    try { t === 'auto' ? localStorage.removeItem('sz-theme') : localStorage.setItem('sz-theme', t); } catch (e) {}
    t === 'auto' ? root.removeAttribute('data-theme') : root.setAttribute('data-theme', t);
    paint(t);
  };
  paint(current());
  d.addEventListener('click', (e) => {
    const b = e.target.closest('[data-theme-set]');
    if (b) setTheme(b.dataset.themeSet);
  });
  addEventListener('storage', (e) => { if (e.key === 'sz-theme') setTheme(current()); });

  // Copy email.
  const email = root.dataset.email || 'jason@sanz.one';
  const copyEmail = async () => {
    try { await navigator.clipboard.writeText(email); toast('Email copied'); }
    catch (e) { location.href = 'mailto:' + email; }
  };
  d.addEventListener('click', (e) => {
    const b = e.target.closest('[data-copy-email]');
    if (b) { e.preventDefault(); copyEmail(); }
  });

  // Mobile menu.
  const menuBtn = d.querySelector('[data-menu]');
  const setMenu = (open) => {
    d.body.classList.toggle('menu-open', open);
    if (menuBtn) menuBtn.setAttribute('aria-expanded', String(open));
  };
  if (menuBtn) menuBtn.addEventListener('click', () => setMenu(!d.body.classList.contains('menu-open')));
  d.querySelectorAll('.sb a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('pageshow', () => setMenu(false));

  // Command menu.
  const dlg = d.getElementById('cmdk');
  const input = dlg && dlg.querySelector('input');
  const items = dlg ? [...dlg.querySelectorAll('.cmdk-i')] : [];
  const groups = dlg ? [...dlg.querySelectorAll('.cmdk-g')] : [];
  const none = dlg && dlg.querySelector('.cmdk-none');
  let shown = items, sel = 0;
  const select = (i) => {
    if (!shown.length) return;
    sel = (i + shown.length) % shown.length;
    items.forEach((el) => el.setAttribute('aria-selected', 'false'));
    const el = shown[sel];
    el.setAttribute('aria-selected', 'true');
    if (input) input.setAttribute('aria-activedescendant', el.id);
    el.scrollIntoView({ block: 'nearest' });
  };
  const filter = () => {
    const q = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    shown = items.filter((el) => {
      const hay = (el.textContent + ' ' + (el.dataset.k || '')).toLowerCase();
      const ok = q.every((w) => hay.includes(w));
      el.hidden = !ok;
      return ok;
    });
    groups.forEach((g) => { g.hidden = !items.some((el) => el.dataset.g === g.dataset.g && !el.hidden); });
    if (none) none.hidden = shown.length > 0;
    select(0);
  };
  const open = () => {
    if (!dlg || dlg.open) return;
    setMenu(false);
    input.value = '';
    filter();
    dlg.showModal();
    input.focus();
  };
  const run = (el) => {
    if (!el) return;
    const act = el.dataset.act;
    if (act) {
      dlg.close();
      if (act === 'copy') copyEmail();
      else if (act.startsWith('theme:')) { setTheme(act.slice(6)); toast('Theme: ' + el.dataset.label); }
      return;
    }
    if (el.href) { dlg.close(); location.href = el.href; }
  };
  if (dlg) {
    input.addEventListener('input', filter);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); select(sel + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); select(sel - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); run(shown[sel]); }
    });
    items.forEach((el) => {
      el.addEventListener('mousemove', () => { const i = shown.indexOf(el); if (i !== sel) select(i); });
      el.addEventListener('click', (e) => { if (el.dataset.act) { e.preventDefault(); run(el); } else dlg.close(); });
    });
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    d.querySelectorAll('[data-cmdk]').forEach((b) => b.addEventListener('click', open));
  }

  const typing = (t) => t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
  d.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      dlg && dlg.open ? dlg.close() : open();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey || typing(e.target) || (dlg && dlg.open)) return;
    if (e.key === '/') { e.preventDefault(); open(); }
    else if (e.key === 'c' || e.key === 'C') { if (!getSelection().toString()) { e.preventDefault(); copyEmail(); } }
    else if (e.key === 'Escape') setMenu(false);
  });
})();
