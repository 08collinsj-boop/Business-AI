(() => {
  const script = document.currentScript;
  if (!script) return;

  const slug = String(script.dataset.business || '').trim().toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])?$/.test(slug)) {
    console.warn('Colzo widget: a valid data-business slug is required.');
    return;
  }

  const marker = 'business-ai-widget-' + slug;
  if (document.querySelector('[data-business-ai-widget="' + marker + '"]')) return;

  let appOrigin;
  try { appOrigin = new URL(script.src, document.baseURI).origin; }
  catch { return; }

  const label = String(script.dataset.label || 'Chat with us').trim().slice(0, 40) || 'Chat with us';
  const position = script.dataset.position === 'left' ? 'left' : 'right';
  const root = document.createElement('div');
  root.dataset.businessAiWidget = marker;
  const shadow = root.attachShadow ? root.attachShadow({ mode: 'open' }) : root;

  const style = document.createElement('style');
  style.textContent = `
    :host{all:initial}
    *,*::before,*::after{box-sizing:border-box}
    .bai-wrap{position:fixed;${position}:max(18px,env(safe-area-inset-${position}));bottom:max(18px,env(safe-area-inset-bottom));z-index:2147483000;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    .bai-launcher{min-height:54px;display:inline-flex;align-items:center;gap:9px;padding:0 18px 0 12px;border:1px solid #28313d;border-radius:999px;background:#c8ff2e;color:#0b0e14;box-shadow:0 10px 24px rgba(0,0,0,.2);font:700 14px/1 sans-serif;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease}
    .bai-launcher:hover{transform:translateY(-1px);box-shadow:0 17px 42px rgba(0,0,0,.25)}
    .bai-launcher:focus-visible,.bai-close:focus-visible{outline:3px solid #c8ff2e;outline-offset:3px}
    .bai-icon{width:34px;height:34px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.26);border-radius:50%;background:rgba(11,14,20,.12);font-size:16px}
    .bai-panel{position:absolute;${position}:0;bottom:68px;width:min(390px,calc(100vw - 24px));height:min(650px,calc(100vh - 104px));display:grid;grid-template-rows:44px minmax(0,1fr);overflow:hidden;border:1px solid #28313d;border-radius:22px;background:#0b0e14;box-shadow:0 24px 70px rgba(0,0,0,.38);opacity:0;transform:translateY(12px) scale(.98);pointer-events:none;transition:opacity .2s ease,transform .22s cubic-bezier(.2,.75,.25,1)}
    .bai-panel.open{opacity:1;transform:translateY(0) scale(1);pointer-events:auto}
    .bai-panel-head{display:flex;align-items:center;gap:8px;padding:0 9px 0 14px;border-bottom:1px solid #28313d;background:#151a22;color:#f5f7fa}
    .bai-panel-head strong{font:750 11px/1.2 sans-serif;letter-spacing:.01em}
    .bai-panel-head span{margin-left:auto;color:#94a3b8;font:500 9px/1 sans-serif}
    .bai-close{width:44px;height:44px;display:grid;place-items:center;border:0;border-radius:9px;background:transparent;color:#94a3b8;font:700 20px/1 sans-serif;cursor:pointer}
    .bai-close:hover{background:rgba(255,255,255,.06);color:#fff}
    iframe{width:100%;height:100%;border:0;background:#0b0e14}
    @media(max-width:520px){
      .bai-wrap{${position}:max(10px,env(safe-area-inset-${position}));bottom:max(10px,env(safe-area-inset-bottom))}
      .bai-panel{position:fixed;left:8px;right:8px;bottom:76px;width:auto;height:min(680px,calc(100dvh - 92px));border-radius:20px}
      .bai-launcher{min-height:52px;padding-right:15px;font-size:13px}
    }
    @media(prefers-reduced-motion:reduce){.bai-launcher,.bai-panel{transition:none}}
  `;

  const wrap = document.createElement('div');
  wrap.className = 'bai-wrap';

  const panel = document.createElement('section');
  panel.className = 'bai-panel';
  panel.id = marker + '-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Customer assistant');
  panel.setAttribute('aria-hidden', 'true');

  const head = document.createElement('div');
  head.className = 'bai-panel-head';
  const title = document.createElement('strong');
  title.textContent = 'Customer assistant';
  const powered = document.createElement('span');
  powered.textContent = 'Colzo';
  const close = document.createElement('button');
  close.className = 'bai-close';
  close.type = 'button';
  close.setAttribute('aria-label', 'Close customer assistant');
  close.textContent = '×';
  head.append(title, powered, close);

  const frame = document.createElement('iframe');
  frame.title = 'Colzo customer assistant';
  frame.loading = 'lazy';
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  frame.setAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox');
  frame.setAttribute('allow', 'clipboard-write');

  const launcher = document.createElement('button');
  launcher.className = 'bai-launcher';
  launcher.type = 'button';
  launcher.setAttribute('aria-controls', panel.id);
  launcher.setAttribute('aria-expanded', 'false');
  launcher.innerHTML = '<span class="bai-icon" aria-hidden="true">✦</span><span></span>';
  launcher.lastElementChild.textContent = label;

  let loaded = false;
  let open = false;
  const frameUrl = new URL('/customer', appOrigin);
  frameUrl.searchParams.set('business', slug);
  frameUrl.searchParams.set('embed', '1');
  frameUrl.searchParams.set('source', 'website_widget');

  const setOpen = value => {
    open = Boolean(value);
    if (open && !loaded) {
      frame.src = frameUrl.toString();
      loaded = true;
    }
    panel.classList.toggle('open', open);
    panel.setAttribute('aria-hidden', String(!open));
    launcher.setAttribute('aria-expanded', String(open));
    if (open) window.setTimeout(() => close.focus({ preventScroll: true }), 0);
  };

  launcher.addEventListener('click', () => setOpen(!open));
  close.addEventListener('click', () => { setOpen(false); launcher.focus({ preventScroll: true }); });
  document.addEventListener('keydown', event => {
    if (open && event.key === 'Escape') {
      setOpen(false);
      launcher.focus({ preventScroll: true });
    }
  });

  panel.append(head, frame);
  wrap.append(panel, launcher);
  shadow.append(style, wrap);
  (document.body || document.documentElement).append(root);
})();
