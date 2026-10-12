/* Colzo brand visual layer must be inserted after legacy premium UI assets. */
(() => {
  document.body.classList.add('colzo-interface');
  document.documentElement.dataset.productUi = 'colzo';
  const id = 'colzo-visual-layout-v1';
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = '/assets/colzo-interface.css?v=20261012-dashboard-v1';
  document.head.appendChild(link);
})();
