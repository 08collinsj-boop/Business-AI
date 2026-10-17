// Native WAAPI keeps the established motion system dependency-free. Only
// transform/opacity animate; no layout measurements or perpetual frame loop.
export function createSurfaceMotion(root) {
  const view = root.ownerDocument.defaultView;
  const preference = view.matchMedia?.('(prefers-reduced-motion: reduce)');
  let reduced = Boolean(preference?.matches);
  const running = new Set();
  const seen = new WeakSet();
  const selectors = '.cn-work-dialog,.cn-unsaved-sheet,.cn-command-panel';
  function cancel() {
    for (const animation of running) animation.cancel();
    running.clear();
  }
  function enter(element) {
    if (reduced || root.classList.contains('cn-quiet-motion') || element.closest('[hidden]') || typeof element.animate !== 'function') return;
    const animation = element.animate([
      { opacity: .5, transform: 'translate3d(0,20px,0) scale(.99)' },
      { opacity: 1, transform: 'translate3d(0,0,0) scale(1)' }
    ], { duration: 300, easing: 'cubic-bezier(.21,.9,.22,1)' });
    running.add(animation);
    animation.onfinish = animation.oncancel = () => running.delete(animation);
  }
  const preferenceChanged = event => { reduced = event.matches; if (reduced) cancel(); };
  preference?.addEventListener?.('change', preferenceChanged);
  const observer = new view.MutationObserver(records => {
    if (root.classList.contains('cn-quiet-motion') || root.hidden) { cancel(); return; }
    for (const record of records) {
      const nodes = record.type === 'childList' ? record.addedNodes : [record.target];
      for (const node of nodes) {
        if (node.nodeType !== 1) continue;
        const surfaces = [...(node.matches(selectors) ? [node] : []), ...node.querySelectorAll(selectors)];
        for (const surface of surfaces) {
          if (surface.closest('[hidden]')) { seen.delete(surface); continue; }
          if (!seen.has(surface)) { seen.add(surface); enter(surface); }
        }
      }
    }
  });
  observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden','class'] });
  return { enter, cancel, disconnect() { cancel(); observer.disconnect(); preference?.removeEventListener?.('change', preferenceChanged); } };
}
