/* Theme before first paint (inlined in <head>). localStorage "sz-theme" holds "light" or "dark"; nothing means Auto,
   which follows the system through the prefers-color-scheme block in site.css. Keep free of line comments: it is inlined. */
(function () {
  try { var t = localStorage.getItem('sz-theme'); if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t); } catch (e) {}
})();
