// Progressive touch gestures. Explicit controls remain the primary accessible
// path; no edge gestures, form inputs, mouse drags or native vertical scroll.
export function createGestureNavigation(root, actions = {}) {
  const view = root.ownerDocument.defaultView;
  let gesture = null, suppressedHandle = null, suppressUntil = 0;
  function reset() {
    if (gesture?.surface) gesture.surface.style.transform = '';
    if (gesture?.handle?.hasPointerCapture?.(gesture.id)) gesture.handle.releasePointerCapture(gesture.id);
    gesture = null;
  }
  function down(event) {
    reset();
    if (root.hidden || event.pointerType !== 'touch' || event.isPrimary === false || event.clientX < 24 || event.clientX > view.innerWidth - 24) return;
    const target = event.target;
    const handle = target.closest('[data-cn-drag-handle]');
    if (!handle && target.closest('button,a,input,textarea,select,[contenteditable],label')) return;
    const mode = handle ? 'sheet' : target.closest('.cn-work-calendar') ? 'calendar' : target.closest('.cn-record-inspector') ? 'back' : '';
    if (!mode || (mode === 'sheet' && actions.canDismiss?.() === false)) return;
    gesture = { mode, id: event.pointerId, x: event.clientX, y: event.clientY, time: view.performance.now(), surface: handle?.querySelector('span'), handle };
    if(handle?.setPointerCapture)try{handle.setPointerCapture(event.pointerId)}catch{};
  }
  function move(event) {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    if (gesture.mode !== 'sheet') {
      // Once native scrolling wins, a later diagonal move cannot navigate.
      if (Math.abs(dy) > 24 && Math.abs(dy) > Math.abs(dx)) reset();
      return;
    }
    if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) { reset(); return; }
    if (gesture.surface && !root.classList.contains('cn-quiet-motion') && !view.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
      gesture.surface.style.transform = `translate3d(0,${Math.min(8,Math.max(0,dy)/12)}px,0) scaleX(${1+Math.min(100,Math.max(0,dy))/300})`;
  }
  function up(event) {
    if (!gesture || event.pointerId !== gesture.id) return;
    const g = gesture, dx = event.clientX - g.x, dy = event.clientY - g.y;
    reset();
    if (root.hidden || view.performance.now() - g.time > 900) return;
    if (g.mode === 'sheet') {
      if(Math.abs(dy)>8||Math.abs(dx)>8){suppressedHandle=g.handle;suppressUntil=view.performance.now()+400}
      if (dy > 80 && Math.abs(dx) < 45 && actions.canDismiss?.() !== false) actions.onDismiss?.(g.handle);
    } else if (Math.abs(dx) > 80 && Math.abs(dy) < 40) {
      if (g.mode === 'calendar') actions.onCalendar?.(dx < 0 ? 1 : -1);
      else if (dx > 0) actions.onBack?.();
    }
  }
  const click = event => { if(suppressedHandle?.contains(event.target) && view.performance.now()<suppressUntil){event.preventDefault();event.stopImmediatePropagation();suppressedHandle=null} };
  root.addEventListener('click', click, true);
  root.addEventListener('pointerdown', down, { passive: true });
  root.addEventListener('pointermove', move, { passive: true });
  root.addEventListener('pointerup', up, { passive: true });
  root.addEventListener('pointercancel', reset);
  return { cancel: reset, disconnect() {
    reset(); root.removeEventListener('click',click,true);root.removeEventListener('pointerdown', down); root.removeEventListener('pointermove', move);
    root.removeEventListener('pointerup', up); root.removeEventListener('pointercancel', reset);
  } };
}

// Animate only the visual copy of a verified KPI change. The actual number is
// always in the accessibility tree. No zero-to-value animation on first paint.
export function createKpiMotion(root) {
  const view = root.ownerDocument.defaultView;
  const preference = view.matchMedia?.('(prefers-reduced-motion: reduce)');
  const running = new Map();
  function cancel() {
    for (const [element, run] of running) {
      view.cancelAnimationFrame(run.frame); run.visual.remove(); element.style.opacity = run.opacity;
    }
    running.clear();
  }
  function capture() {
    return { screen: root.dataset.screen, values: new Map([...root.querySelectorAll('[data-cn-kpi]')].map(element => [element.dataset.cnKpi, Number(element.textContent)])) };
  }
  function update(before) {
    cancel();
    if (!before || before.screen !== root.dataset.screen || root.hidden || preference?.matches || root.classList.contains('cn-quiet-motion') || !view.requestAnimationFrame) return;
    for (const element of root.querySelectorAll('[data-cn-kpi]')) {
      const from = before.values.get(element.dataset.cnKpi), to = Number(element.textContent);
      if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from < 0 || to < 0 || from === to) continue;
      const visual = root.ownerDocument.createElement('span');
      visual.dataset.cnKpiVisual = ''; visual.setAttribute('aria-hidden','true');
      visual.className = 'cn-kpi-visual'; visual.textContent = String(from);
      const font=view.getComputedStyle(element);
      Object.assign(visual.style,{left:`${element.offsetLeft}px`,top:`${element.offsetTop}px`,font:font.font,letterSpacing:font.letterSpacing,lineHeight:font.lineHeight});
      element.after(visual);
      const run = { frame: 0, visual, opacity: element.style.opacity }; element.style.opacity = '0'; running.set(element, run);
      const start = view.performance.now();
      const tick = now => {
        if (running.get(element) !== run) return;
        if (!root.contains(element) || root.hidden || preference?.matches || root.classList.contains('cn-quiet-motion')) { cancel(); return; }
        const progress = Math.min(1, Math.max(0, (now - start) / 240));
        visual.textContent = String(Math.round(from + (to - from) * (1 - (1-progress)**3)));
        if (progress === 1) { visual.remove(); element.style.opacity = run.opacity; running.delete(element); }
        else run.frame = view.requestAnimationFrame(tick);
      };
      run.frame = view.requestAnimationFrame(tick);
    }
  }
  const changed = () => { if (preference.matches) cancel(); };
  preference?.addEventListener?.('change', changed);
  return { capture, update, cancel, disconnect() { cancel(); preference?.removeEventListener?.('change', changed); } };
}
