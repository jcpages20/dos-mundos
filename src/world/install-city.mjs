import {CityRenderer} from './city-renderer.mjs?huerto=6';

const api=window.DosMundosCityLegacy;
const map=document.getElementById('map');
const make=(tag,className,text)=>{const e=document.createElement(tag);if(className)e.className=className;if(text)e.textContent=text;return e;};
const button=(text,fn,label)=>{const b=make('button','',text);b.type='button';if(label)b.setAttribute('aria-label',label);b.onclick=fn;return b;};
const clock=t=>String(Math.floor(t/60)%24).padStart(2,'0')+':'+String(t%60).padStart(2,'0');
let desiredWalk=false,walk=null,marker=null,originalStyle=null,resizeObserver=null,plan=null,restoreFocus=null,fitWalk=null;

function parkWalk(){
  if(!walk)return;
  resizeObserver?.disconnect();resizeObserver=null;
  fitWalk=null;api.configureViewport(512,448);
  if(marker){marker.replaceWith(map);marker=null;}
  if(originalStyle===null)map.removeAttribute('style');else map.setAttribute('style',originalStyle);
  walk.remove();walk=null;document.body.classList.remove('dm-city-walking');
}
function closeWalk(){desiredWalk=false;parkWalk();document.getElementById('dm-city-pasear')?.focus();}
function openWalk(){
  if(walk||!api.ready||!api.snapshot()?.street)return;desiredWalk=true;
  originalStyle=map.getAttribute('style');marker=document.createComment('native-city-canvas');map.before(marker);
  walk=make('section','dm-city-walk');walk.id='dm-city-walk';walk.setAttribute('aria-label','Paseo por Madrid');
  const head=make('header','dm-city-walk-head'),identity=make('div','dm-city-walk-identity');
  identity.append(make('small','','DOS MUNDOS · MADRID'),make('h2','','Ciudad Lineal'),make('p','dm-city-walk-stats'));
  const tools=make('nav','dm-city-walk-tools');tools.setAttribute('aria-label','Opciones de paseo');
  const menu=button('Menú',()=>{const actions=document.getElementById('dm-city-actions');if(actions)actions.open=!actions.open;});
  menu.onpointerdown=event=>event.stopPropagation();
  tools.append(button('Plano',openPlan),menu,
    button('Volver',closeWalk,'Volver a la vista completa'));
  head.append(identity,tools);
  const stage=make('div','dm-city-walk-stage');stage.append(map);
  const hint=make('p','dm-city-walk-hint','Toca una acera para caminar. El plano te guía hasta cada puerta.');
  const controls=make('div','dm-city-walk-controls'),pad=make('nav','dm-city-walk-pad');pad.setAttribute('aria-label','Caminar por la ciudad');
  for(const [direction,text,dx,dy,label] of [['up','▲',0,-28,'Caminar arriba'],['left','◀',-28,0,'Caminar a la izquierda'],['down','▼',0,28,'Caminar abajo'],['right','▶',28,0,'Caminar a la derecha']]){
    const b=button(text,()=>api.move(dx,dy),label);b.dataset.direction=direction;pad.append(b);
  }
  const context=make('div','dm-city-walk-context');context.append(make('span','','Explora el barrio'),button('Acércate a un lugar',()=>api.interact()));
  controls.append(pad,context);walk.append(head,stage,hint,controls);document.body.append(walk);document.body.classList.add('dm-city-walking');
  const fit=()=>{
    const box=stage.getBoundingClientRect(),size=api.configureViewport(512,512*box.height/Math.max(1,box.width));
    const w=Math.max(1,Math.min(box.width,box.height*size.width/size.height));map.style.width=w+'px';map.style.height=w*size.height/size.width+'px';
  };
  fitWalk=fit;
  resizeObserver=new ResizeObserver(fit);resizeObserver.observe(stage);fit();sync();
}
function closePlan(){
  if(!plan)return;plan.remove();plan=null;restoreFocus?.focus();restoreFocus=null;
}
function goTo(id){
  closePlan();if(api.walkTo(id)){
    if(walk)walk.querySelector('.dm-city-walk-hint').textContent='Caminando hacia la entrada…';
    else map.scrollIntoView({block:'center',behavior:'smooth'});
  }
}
function openPlan(){
  if(plan||!api.ready||!api.snapshot()?.street)return;
  restoreFocus=document.activeElement;
  plan=make('div','dm-city-plan-backdrop');plan.id='dm-city-plan';
  const panel=make('section','dm-city-plan');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','dm-city-plan-title');
  const head=make('header','dm-city-plan-head'),title=make('h2','','Tu barrio, a un paseo');title.id='dm-city-plan-title';
  const close=button('Cerrar',closePlan,'Cerrar plano del barrio');head.append(title,close);
  const intro=make('p','','Elige un lugar para caminar hasta su entrada. El punto dorado indica dónde estás.');
  const c=make('canvas');c.width=api.snapshot().width;c.height=api.snapshot().height;c.setAttribute('aria-label','Plano de Madrid con sus destinos, museo, huerto y tu posición');
  api.drawOverview(c.getContext('2d'));
  const list=make('nav','dm-city-destinations');list.setAttribute('aria-label','Destinos del barrio');
  for(const p of api.entrances())list.append(button(p.name,()=>goTo(p.id),'Caminar hasta '+p.name));
  c.onclick=e=>{
    const r=c.getBoundingClientRect(),x=(e.clientX-r.left)*c.width/r.width,y=(e.clientY-r.top)*c.height/r.height;
    const p=api.entrances().find(p=>x>=p.x-12&&x<=p.x+p.w+12&&y>=p.y-35&&y<=p.y+p.h+35);if(p)goTo(p.id);
  };
  panel.append(head,intro,c,list);plan.append(panel);plan.onclick=e=>{if(e.target===plan)closePlan();};document.body.append(plan);close.focus();
}
function sync(){
  const s=api.snapshot();if(!s)return;
  if(!s.street){closePlan();parkWalk();return;}
  if(desiredWalk&&!walk)openWalk();
  if(walk&&!api.ready){closeWalk();return;}
  if(walk){
    fitWalk?.();
    walk.querySelector('h2').textContent=s.district||'Ciudad Lineal';
    walk.querySelector('.dm-city-walk-stats').textContent=(s.role==='gabi'?'Gabi':'JC')+' · Día '+s.day+' · '+clock(s.time)+' · '+s.money+' €';
    const near=api.nearby(),context=walk.querySelector('.dm-city-walk-context');
    context.querySelector('span').textContent=near?.name||'Madrid, a tu ritmo';
    const action=context.querySelector('button');action.disabled=!near;action.textContent=near?.label||'Acércate a un lugar';
  }
  const badge=document.getElementById('dm33Badge');if(badge&&api.ready)badge.textContent='DOS MUNDOS · PASEOS POR MADRID';
}

if(api&&map){
  const toolbar=make('div','dm-city-toolbar'),intro=make('div');intro.append(make('small','','EL BARRIO DE SIEMPRE, CON MÁS VIDA'),make('strong','','Paseos por Madrid'));
  const tools=make('div','dm-city-toolbar-tools');
  const walkButton=button('Pasear',openWalk);walkButton.id='dm-city-pasear';walkButton.disabled=true;
  const planButton=button('Plano del barrio',openPlan);planButton.id='dm-city-plan-button';planButton.disabled=true;
  const classic=button('Vista anterior',()=>{api.setEnabled(!api.enabled);classic.textContent=api.enabled?'Vista anterior':'Vista renovada';classic.setAttribute('aria-pressed',String(!api.enabled));});
  classic.id='dm-city-classic';classic.hidden=true;classic.setAttribute('aria-pressed','false');
  tools.append(walkButton,planButton,classic);toolbar.append(intro,tools);map.closest('.worldWrap').before(toolbar);
  map.setAttribute('aria-label','Madrid: toca una calle para caminar o una fachada para entrar');
  window.DosMundosCity=Object.freeze({getSnapshot:()=>{const s=api.snapshot();return s?{...s,ready:api.ready,enabled:api.enabled,view:walk?'walk':'normal',plan:!!plan}:null;}});
  window.addEventListener('dos-mundos:city-state',sync);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&(plan||walk)){
      event.preventDefault();event.stopImmediatePropagation();if(plan)closePlan();else closeWalk();
    }else if(plan&&event.key.startsWith('Arrow')){
      event.stopImmediatePropagation();
    }else if(event.key==='Tab'&&plan){
      const controls=[...plan.querySelectorAll('button')],first=controls[0],last=controls.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
  },true);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)closePlan();});
  setInterval(sync,350);
  const retry=button('Reintentar gráficos',()=>load());retry.hidden=true;tools.append(retry);
  async function load(){
    let timeout;retry.disabled=true;
    try{
      const renderer=new CityRenderer();
      await Promise.race([renderer.load(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('La ciudad tarda en cargar. Puedes seguir en la vista anterior.')),14000);})]);
      api.install(renderer);if(!api.ready)throw new Error('Se conserva la vista anterior de Madrid.');
      document.body.classList.add('dm-city-renewed');walkButton.disabled=false;planButton.disabled=false;classic.hidden=false;retry.hidden=true;
      intro.querySelector('strong').textContent='Paseos por Madrid';intro.querySelector('small').textContent='EL BARRIO DE SIEMPRE, CON MÁS VIDA';sync();
    }catch(error){
      intro.querySelector('strong').textContent='Madrid sigue disponible';
      intro.querySelector('small').textContent='Vista anterior · recursos nuevos sin cargar';retry.hidden=false;
      console.warn('Madrid:',error);
    }finally{clearTimeout(timeout);retry.disabled=false;}
  }
  await load();
}
