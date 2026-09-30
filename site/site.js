(()=>{const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;const header=document.querySelector('[data-header]');const setHeader=()=>header?.classList.toggle('scrolled',window.scrollY>18);setHeader();addEventListener('scroll',setHeader,{passive:true});const reveals=[...document.querySelectorAll('.reveal')];if(reduce){reveals.forEach(el=>el.classList.add('visible'));}else{const io=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){entry.target.classList.add('visible');io.unobserve(entry.target);}}},{threshold:.14,rootMargin:'0px 0px -30px'});reveals.forEach(el=>io.observe(el));}const canvas=document.getElementById('ambientParticles');if(!canvas||reduce)return;const ctx=canvas.getContext('2d');let width=0,height=0,dpr=1,particles=[];const reset=()=>{dpr=Math.min(devicePixelRatio||1,2);width=innerWidth;height=innerHeight;canvas.width=Math.floor(width*dpr);canvas.height=Math.floor(height*dpr);canvas.style.width=width+'px';canvas.style.height=height+'px';ctx.setTransform(dpr,0,0,dpr,0,0);const count=Math.min(55,Math.max(24,Math.floor(width/26)));particles=Array.from({length:count},()=>({x:Math.random()*width,y:Math.random()*height,r:.35+Math.random()*1.05,v:.06+Math.random()*.18,a:.12+Math.random()*.38,phase:Math.random()*Math.PI*2}));};let t=0;const draw=()=>{t+=.008;ctx.clearRect(0,0,width,height);for(const p of particles){p.y-=p.v;if(p.y<-10){p.y=height+10;p.x=Math.random()*width;}const alpha=p.a*(.65+.35*Math.sin(t*2+p.phase));ctx.beginPath();ctx.fillStyle=`rgba(89,181,255,${alpha})`;ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();}requestAnimationFrame(draw);};reset();addEventListener('resize',reset,{passive:true});draw();})();
(()=>{
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine=window.matchMedia('(pointer: fine)').matches;
  if(reduce||!fine)return;
  const root=document.documentElement;
  let x=innerWidth*.72,y=innerHeight*.14,raf=0;
  const paint=()=>{root.style.setProperty('--pointer-x',`${x}px`);root.style.setProperty('--pointer-y',`${y}px`);raf=0;};
  addEventListener('pointermove',event=>{x=event.clientX;y=event.clientY;if(!raf)raf=requestAnimationFrame(paint);},{passive:true});
  paint();
  const stage=document.querySelector('.product-stage');
  if(!stage)return;
  const reset=()=>{stage.style.setProperty('--stage-rx','0deg');stage.style.setProperty('--stage-ry','0deg');stage.style.setProperty('--stage-x','0px');stage.style.setProperty('--stage-y','0px');};
  stage.addEventListener('pointermove',event=>{const r=stage.getBoundingClientRect();const nx=Math.max(-.5,Math.min(.5,(event.clientX-r.left)/r.width-.5));const ny=Math.max(-.5,Math.min(.5,(event.clientY-r.top)/r.height-.5));stage.style.setProperty('--stage-ry',`${nx*3.2}deg`);stage.style.setProperty('--stage-rx',`${ny*-2.4}deg`);stage.style.setProperty('--stage-x',`${nx*4}px`);stage.style.setProperty('--stage-y',`${ny*3}px`);},{passive:true});
  stage.addEventListener('pointerleave',reset,{passive:true});
})();
