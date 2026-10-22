// One dependency-free owner for transient surfaces. Superseded animations never
// run stale dismissal callbacks; reduced motion completes pending exits at once.
export function createSurfaceMotion(root) {
  const view = root.ownerDocument.defaultView;
  const preference = view.matchMedia?.('(prefers-reduced-motion: reduce)');
  let reduced = Boolean(preference?.matches);
  const running = new Map();
  const seen = new WeakSet();
  const selectors = '.cn-work-dialog,.cn-unsaved-sheet,.cn-command-panel';
  const enabled = () => !reduced && !root.hidden && !root.classList.contains('cn-quiet-motion');
  function stop(element, complete = false) {
    const record = running.get(element);
    if (!record) return;
    running.delete(element);
    record.animation.onfinish = record.animation.oncancel = null;
    record.animation.cancel();
    if (complete) record.done?.();
  }
  function cancel(complete = true) { for (const element of [...running.keys()]) stop(element, complete && root.contains(element) && !root.hidden); }
  function animate(element, exiting, done) {
    const style = running.has(element) ? view.getComputedStyle(element) : null;
    const interrupted = style ? { opacity: style.opacity, transform: style.transform } : null;
    stop(element);
    if (!element || !enabled() || element.closest('[hidden]') || typeof element.animate !== 'function') { done?.(); return; }
    const frames = exiting
      ? [{ opacity: 1, transform: 'translate3d(0,0,0) scale(1)' }, { opacity: 0, transform: 'translate3d(0,12px,0) scale(.99)' }]
      : [{ opacity: .5, transform: 'translate3d(0,16px,0) scale(.99)' }, { opacity: 1, transform: 'translate3d(0,0,0) scale(1)' }];
    if (interrupted) frames[0] = interrupted;
    const animation = element.animate(frames, { duration: exiting ? 160 : 260, easing: 'cubic-bezier(.21,.9,.22,1)' });
    const record = { animation, done };
    running.set(element, record);
    animation.onfinish = animation.oncancel = () => {
      if (running.get(element) !== record) return;
      running.delete(element); done?.();
    };
  }
  function enter(element) { seen.add(element); animate(element, false); }
  function leave(element, done) {
    if (!element) { done?.(); return; }
    // Repeated Escape/taps must not restart the same dismissal.
    if (running.get(element)?.done) return;
    animate(element, true, done);
  }
  const preferenceChanged = event => { reduced = event.matches; if (reduced) cancel(); };
  preference?.addEventListener?.('change', preferenceChanged);
  const observer = new view.MutationObserver(records => {
    if (!enabled()) { cancel(); return; }
    for (const record of records) {
      const nodes = record.type === 'childList' ? record.addedNodes : [record.target];
      for (const node of nodes) {
        if (node.nodeType !== 1) continue;
        const surfaces = [...(node.matches(selectors) ? [node] : []), ...node.querySelectorAll(selectors)];
        for (const surface of surfaces) {
          if (!root.contains(surface)) continue;
          if (surface.closest('[hidden]')) { seen.delete(surface); stop(surface); continue; }
          if (!seen.has(surface)) enter(surface);
        }
      }
    }
    // A render or sign-out can remove an animating surface before it finishes.
    for (const element of running.keys()) if (!root.contains(element)) stop(element);
  });
  observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden','class'] });
  return { enter, leave, cancel, disconnect() { cancel(false); observer.disconnect(); preference?.removeEventListener?.('change', preferenceChanged); } };
}
