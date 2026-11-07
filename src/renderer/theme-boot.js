// Applies the saved theme before the page paints, so a light-theme user never sees a dark flash.
(function () {
  let pref = 'dark';
  try { pref = localStorage.getItem('sk-theme') || 'dark'; } catch (_) {}
  const light = pref === 'light' || (pref === 'auto' && matchMedia('(prefers-color-scheme: light)').matches);
  document.documentElement.dataset.theme = light ? 'light' : 'dark';
})();
