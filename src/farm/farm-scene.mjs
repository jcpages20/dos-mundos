import {FARM,contains} from './farm-map.mjs';
import {FarmRenderer} from './farm-renderer.mjs';
import {cropStatus,timeRemaining,EXPANSION_PRICE} from './farm-model.mjs';
import {canStand,clearSegment,distance,findPath,moveSafely,nearestApproach} from '../engine/navigation.mjs';

const el=(tag,css='',text='')=>{const e=document.createElement(tag);e.className=css;if(text)e.textContent=text;return e;};
export class FarmScene{
  constructor(api){
    this.api=api;this.data=api.snapshot();this.actor={...FARM.spawn,role:api.role,moving:false,pose:'stand'};
    this.key=`dos-mundos-huerto-rpg-v1:${api.role}:${encodeURIComponent(this.data.name)}`;
    this.seed='basil';this.path=[];this.held=new Set();this.abort=new AbortController();this.target=null;this.queue=[];this.ready=false;this.disposed=false;
    try{const saved=JSON.parse(localStorage.getItem(this.key));
      if(saved?.version===1){
        if(saved.position&&canStand(saved.position,FARM)&&!contains(saved.position,FARM.exit))Object.assign(this.actor,saved.position,{role:api.role,pose:'stand',moving:false});
        if(Object.hasOwn(this.data.catalog,saved.seed))this.seed=saved.seed;
      }
    }catch{/* Do not normalize or replace previous game namespaces. */}
  }
  button(label,fn,css=''){const b=el('button',css,label);b.type='button';b.addEventListener('click',fn,{signal:this.abort.signal});return b;}
  async mount(){
    this.root=el('section','dm-farm-scene');this.root.id='dm-farm-scene';this.root.setAttribute('aria-label','Huerto Comunitario: jardín de cultivo');
    const head=el('header','dm-farm-header'),identity=el('div','dm-farm-identity');
    identity.append(el('small','','DOS MUNDOS · TIERRA Y CALMA'),el('h1','','Nuestro huerto'));
    const tools=el('nav','dm-farm-head-tools');
    this.plan=this.button('Plano',()=>{if(!this.ready)return;this.renderer.overview=!this.renderer.overview;this.plan.textContent=this.renderer.overview?'Seguir':'Plano';this.plan.setAttribute('aria-pressed',String(this.renderer.overview));});
    this.plan.setAttribute('aria-pressed','false');tools.append(this.plan,this.button('Semillas',()=>this.catalog()),this.button('Calle',()=>this.api.exit()));
    this.stats=el('p','dm-farm-stats');head.append(identity,tools,this.stats);
    const stage=el('div','dm-farm-stage');this.canvas=el('canvas');this.canvas.id='dm-farm-canvas';this.canvas.tabIndex=0;
    this.canvas.setAttribute('aria-label','Toca el suelo para caminar o una parcela para acercarte');stage.append(this.canvas);
    const routes=el('nav','dm-farm-routes');routes.setAttribute('aria-label','Recorrer el huerto');
    for(const [label,object] of [['Cultivos',FARM.plots[0]],['Semillero',FARM.objects[1]],['Pozo',FARM.objects[3]],['Compost',FARM.objects[6]]]){
      const b=this.button(label,()=>this.approach(object));b.setAttribute('aria-label','Ir a '+label);routes.append(b);
    }
    this.message=el('p','dm-farm-message','Preparando la tierra, las plantas y las herramientas…');this.message.setAttribute('role','status');
    const footer=el('footer','dm-farm-controls'),pad=el('nav','dm-farm-pad');pad.setAttribute('aria-label','Caminar por el huerto');
    for(const [direction,glyph] of [['up','▲'],['left','◀︎'],['down','▼'],['right','▶︎']]){
      const b=this.button(glyph,()=>{});b.dataset.direction=direction;b.setAttribute('aria-label','Caminar '+{up:'arriba',left:'izquierda',down:'abajo',right:'derecha'}[direction]);
      b.addEventListener('pointerdown',event=>{event.preventDefault();if(!this.ready||this.menu)return;b.setPointerCapture(event.pointerId);this.cancel();this.held.add(direction);},{signal:this.abort.signal});
      for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>this.held.delete(direction),{signal:this.abort.signal});pad.append(b);
    }
    const context=el('div','dm-farm-context');this.context=el('strong');this.detail=el('span');
    this.primary=this.button('Preparando…',()=>this.primaryAction(),'dm-farm-primary');
    context.append(this.context,this.detail,this.primary,this.button('Opciones',()=>this.options(),'dm-farm-options'));
    footer.append(pad,context);this.root.append(head,stage,routes,this.message,footer);document.body.append(this.root);document.body.classList.add('dm-farm-active');
    this.api.pause();this.renderer=new FarmRenderer(this.canvas);
    this.canvas.addEventListener('pointerdown',event=>this.tap(event),{signal:this.abort.signal});
    document.addEventListener('keydown',event=>this.keyEvent(event,true),{capture:true,signal:this.abort.signal});
    document.addEventListener('keyup',event=>this.keyEvent(event,false),{capture:true,signal:this.abort.signal});
    window.addEventListener('blur',()=>this.held.clear(),{signal:this.abort.signal});
    document.addEventListener('visibilitychange',()=>{this.held.clear();if(document.hidden)this.save();},{signal:this.abort.signal});
    let timeout;try{await Promise.race([this.renderer.load(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('El huerto está tardando en cargar. La vista anterior sigue disponible.')),18000);})]);}finally{clearTimeout(timeout);}
    if(this.disposed)return;this.ready=true;this.feedback('Tu huerto de siempre, con espacio para crecer. Elige semillas y toca una parcela.');this.previous=performance.now();
    const tick=now=>{if(this.disposed)return;this.update(Math.min(.05,(now-this.previous)/1000),now);this.previous=now;if(!this.disposed)this.frame=requestAnimationFrame(tick);};
    this.update(0,this.previous);this.frame=requestAnimationFrame(tick);
  }
  feedback(text){this.message.textContent=text;}
  cancel(){this.queue=[];this.working=null;this.pending=null;this.path=[];this.held.clear();}
  walk(point){if(!this.ready||this.menu)return;this.cancel();this.target=null;const path=findPath(this.actor,point,FARM);
    if(!path){this.feedback('Camina por los senderos; las parcelas y los muebles tienen colisiones.');return;}this.path=path;}
  tap(event){if(!this.ready||this.menu)return;event.preventDefault();const p=this.renderer.worldPoint(event);
    const target=[...FARM.targets].reverse().find(o=>contains(p,o));if(target)this.approach(target);else this.walk(p);}
  approach(target,action=null,keepQueue=false){
    if(!this.ready)return;if(!keepQueue)this.cancel();this.held.clear();this.working=null;
    const route=nearestApproach(this.actor,target,FARM);if(!route){this.feedback('Prueba a acercarte por un sendero libre.');return;}
    this.target=target;this.path=route.path;this.pending=()=>{this.actor.face=route.point.face||'up';this.target=target;if(action)this.perform(action);};
    this.feedback('Caminando hacia '+target.name.toLowerCase()+'…');
  }
  primaryAction(){
    if(!this.ready||this.menu)return;if(this.working){this.cancel();this.feedback('Puedes seguir recorriendo el huerto.');return;}
    const t=this.target;if(!t){if(distance(this.actor,FARM.spawn)<65)this.api.exit();return;}
    if(this.path.length||Math.min(...t.approaches.map(p=>distance(this.actor,p)))>40){this.approach(t,'primary');return;}
    if(t.action==='catalog'){this.catalog();return;}
    if(t.action==='watering'){this.tasks('water');return;}
    if(t.action==='fertilizer'){this.tasks('fertilize');return;}
    if(t.action==='guide'){this.guide();return;}
    const plant=this.data.plants[t.index],status=cropStatus(plant,this.data.catalog);
    this.perform(t.index>=this.data.plants.length?'expand':!plant?'plant':status?.ready?'harvest':'water');
  }
  perform(type){
    if(type==='primary'){this.primaryAction();return;}
    const target=this.target;if(!target||target.action!=='plot')return;
    const latest=this.api.snapshot(),plant=latest.plants[target.index];
    const result=this.api.act(type,target.index,this.seed,plant?.planted);this.feedback(result.message);this.data=this.api.snapshot();
    if(!result.ok){this.queue=[];return;}
    this.path=[];this.working={type,started:performance.now(),duration:type==='harvest'?2100:1500,message:result.message,plot:target.index};this.save();
  }
  keyEvent(event,pressed){
    if(this.disposed||this.paused||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName))return;
    const d={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',a:'left',s:'down',d:'right'};
    if(d[event.key]){event.preventDefault();event.stopImmediatePropagation();if(!this.ready||this.menu)return;
      if(pressed){this.cancel();this.held.add(d[event.key]);}else this.held.delete(d[event.key]);}
    else if(pressed&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();if(this.menu)this.closeMenu();else if(this.working)this.cancel();else this.api.exit();}
    else if(pressed&&event.key==='Tab'&&this.menu){
      const bs=[...this.menu.querySelectorAll('button')],first=bs[0],last=bs.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }else if(pressed&&['Enter',' '].includes(event.key)&&!event.target.closest('button,a,summary')){event.preventDefault();event.stopImmediatePropagation();this.primaryAction();}
  }
  update(dt,now){
    if(this.disposed||this.paused)return;
    if(!this.api.open){this.destroy();return;}
    if(this.working&&now-this.working.started>=this.working.duration){
      const text=this.working.message;this.working=null;this.feedback(text);
      if(this.queue.length){const next=this.queue.shift();this.approach(next,'water',true);}
    }
    const before={...this.actor};
    if(!this.menu&&!this.working){
      let dx=Number(this.held.has('right'))-Number(this.held.has('left')),dy=Number(this.held.has('down'))-Number(this.held.has('up'));
      if(dx||dy){const len=Math.hypot(dx,dy);dx/=len;dy/=len;Object.assign(this.actor,moveSafely(this.actor,dx*dt*145,dy*dt*145,FARM));this.actor.face=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';}
      else if(this.path.length){
        const p=this.path[0],len=distance(this.actor,p),step=Math.min(len,dt*174);
        if(len>.1){dx=(p.x-this.actor.x)/len;dy=(p.y-this.actor.y)/len;Object.assign(this.actor,moveSafely(this.actor,dx*step,dy*step,FARM));this.actor.face=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';}
        if(distance(this.actor,p)<1.5&&clearSegment(this.actor,p,FARM)){Object.assign(this.actor,p);this.path.shift();}
        else if(len>2&&distance(before,this.actor)<.01){this.path=[];this.pending=null;this.feedback('Ese camino está ocupado. Toca un sendero libre.');}
      }
      if(!this.path.length&&this.pending){const fn=this.pending;this.pending=null;fn();}
      if(contains(this.actor,FARM.exit)){this.api.exit();return;}
    }
    this.actor.moving=distance(before,this.actor)>.05&&!this.working;
    if(!this.path.length&&!this.working){
      const nearest=FARM.targets.flatMap(object=>object.approaches.map(p=>({object,d:distance(p,this.actor)}))).filter(p=>p.d<41).sort((a,b)=>a.d-b.d)[0];
      this.target=nearest?.object||null;
    }
    if(!this.synced||now-this.synced>400){this.data=this.api.snapshot();this.synced=now;this.syncUI();}
    if(!this.data)return;if(this.data.role!==this.actor.role){this.api.exit();return;}
    this.syncContext();this.renderer.render(this.actor,this.data,this.target,this.working,now);
    if(this.actor.moving&&now-(this.lastSaved||0)>1500){this.save();this.lastSaved=now;}
  }
  syncUI(){
    const d=this.data,time=String(Math.floor(d.time/60)%24).padStart(2,'0')+':'+String(d.time%60).padStart(2,'0');
    this.stats.textContent=(d.role==='gabi'?'Gabi':'JC')+' · '+d.money+' € · '+d.plants.length+'/12 parcelas · '+d.harvests+' cosechas · '+time;
  }
  syncContext(){
    const t=this.target;this.context.textContent=t?.name||'Un rato entre plantas';let label='Explora el huerto',detail='';
    if(this.working){label='Seguir caminando';detail={plant:'Sembrando…',water:'Regando…',harvest:'Recogiendo la cosecha…',fertilize:'Cuidando la tierra…',expand:'Preparando la parcela…'}[this.working.type];}
    else if(t?.action==='plot'){
      const plant=this.data.plants[t.index],s=cropStatus(plant,this.data.catalog);
      if(t.index>=this.data.plants.length){label=t.index===this.data.plants.length?'Ampliar · '+EXPANSION_PRICE+' €':'Amplía la parcela '+(this.data.plants.length+1);detail='Espacio para nuevos cultivos';}
      else if(!plant){label='Sembrar '+this.data.catalog[this.seed].name+' · '+this.data.catalog[this.seed].cost+' €';detail='Parcela vacía · Semilla elegida';}
      else if(s?.unknown){label='Cultivo anterior';detail='Se conserva su guardado';}
      else{label=s.ready?'Cosechar · +'+s.earnings+' €':'Regar · 10 min';detail=s.name+' · '+s.growth+'% · Salud '+s.health+'/100 · '+timeRemaining(s.remaining);}
    }else if(t){label={catalog:'Elegir semillas',watering:'Cuidar los cultivos',fertilizer:'Abonar una parcela',guide:'Vida en el huerto'}[t.action];detail=t.description;}
    else if(distance(this.actor,FARM.spawn)<65)label='Salir a Madrid';
    this.detail.textContent=detail;this.primary.textContent=label;this.primary.disabled=!this.ready||(!t&&!this.working&&distance(this.actor,FARM.spawn)>=65);
  }
  openMenu(title){
    this.closeMenu();this.held.clear();this.menu=el('section','dm-farm-menu');this.menu.setAttribute('role','dialog');this.menu.setAttribute('aria-modal','true');this.menu.setAttribute('aria-label',title);
    const close=this.button('Cerrar',()=>this.closeMenu());this.menu.append(el('h2','',title),close);this.root.append(this.menu);close.focus();return this.menu;
  }
  closeMenu(){this.menu?.remove();this.menu=null;}
  catalog(){
    if(!this.ready)return;const menu=this.openMenu('Semillas del huerto');
    menu.append(el('p','','Elige una semilla. Su precio se cobra al sembrar, junto a una parcela vacía. Los tiempos son reales y el crecimiento continúa al cerrar el juego.'));
    for(const [id,cfg] of Object.entries(this.data.catalog)){
      const card=el('article','dm-farm-seed');const image=el('canvas');image.width=104;image.height=94;image.setAttribute('aria-label',cfg.name);
      const g=image.getContext('2d');g.imageSmoothingEnabled=false;this.renderer.sprite(g,'crops',id+'-3',52,89,80);
      const b=this.button('Elegir '+cfg.name,()=>{this.seed=id;this.save();this.closeMenu();this.feedback('Semilla elegida: '+cfg.name+'. Acércate a una parcela vacía para sembrar.');});
      card.append(image,el('strong','',cfg.name),el('p','',cfg.cost+' € · '+cfg.hours+' h reales · Cosecha hasta '+cfg.yield+' €'),b);menu.append(card);
    }
  }
  tasks(type){
    const menu=this.openMenu(type==='water'?'Agua para tus plantas':'Cuidar con compost');
    const plants=FARM.plots.filter(p=>this.data.plants[p.index]);
    if(!plants.length)menu.append(el('p','','Primero siembra una parcela. Tus cultivos aparecerán aquí.'));
    for(const p of plants){const s=cropStatus(this.data.plants[p.index],this.data.catalog);
      menu.append(this.button(p.name+' · '+s.name+' · Salud '+s.health+'/100',()=>{this.closeMenu();this.approach(p,type);}));}
    if(type==='water'&&plants.length)menu.append(this.button('Ronda de riego',()=>{this.closeMenu();this.cancel();this.queue=plants.slice(1);this.approach(plants[0],'water',true);}));
  }
  guide(){const menu=this.openMenu('La vida en el huerto');menu.append(el('p','','Siembra, cuida y cosecha. Puedes ampliar de cuatro a doce parcelas. Las plantas conservan sus tiempos y siguen creciendo mientras estás fuera.'),el('p','','Tras 18 horas sin agua empiezan a perder salud. Regar cuesta 10 minutos del juego y recupera salud; el compost cuesta 3 € y recupera 20.'),el('p','','Cosechar vende el cultivo al precio correspondiente a su salud, suma una cosecha a tu historial y deja la tierra lista para volver a sembrar.'));}
  options(){
    if(!this.ready)return;const menu=this.openMenu('Tu rincón de cultivo');
    menu.append(this.button('Cómo cuidar el huerto',()=>this.guide()),this.button('Regar cultivos',()=>this.tasks('water')),this.button('Aplicar compost',()=>this.tasks('fertilize')),
      this.button('Ampliar el huerto · 25 €',()=>{this.closeMenu();const p=FARM.plots[this.data.plants.length];if(p)this.approach(p,'expand');else this.feedback('Ya están preparadas las doce parcelas.');}),
      this.button('Actividades anteriores',()=>this.showClassic()),this.button('Salir a Madrid',()=>this.api.exit()));
  }
  showClassic(){this.closeMenu();this.paused=true;this.held.clear();this.root.hidden=true;this.api.resume();document.body.classList.remove('dm-farm-active');
    this.returnButton=this.button('Volver al huerto',()=>{this.returnButton.remove();this.paused=false;this.root.hidden=false;this.api.pause();document.body.classList.add('dm-farm-active');this.data=this.api.snapshot();this.renderer.resize();this.previous=performance.now();},'dm-farm-return');document.body.append(this.returnButton);}
  save(){
    const p=canStand(this.actor,FARM)&&!contains(this.actor,FARM.exit)?{x:this.actor.x,y:this.actor.y,face:this.actor.face}:FARM.spawn;
    try{localStorage.setItem(this.key,JSON.stringify({version:1,position:p,seed:this.seed}));}catch{/* Crop/economy storage is handled and rolled back by the native adapter. */}
  }
  destroy(){if(this.disposed)return;this.disposed=true;this.save();cancelAnimationFrame(this.frame);this.abort.abort();this.renderer?.destroy();this.root?.remove();this.returnButton?.remove();document.body.classList.remove('dm-farm-active');}
  snapshot(){return {ready:this.ready,role:this.actor.role,position:{x:this.actor.x,y:this.actor.y},face:this.actor.face,walking:!!this.path.length,target:this.target?.id||null,working:this.working?.type||null,seed:this.seed,origin:{x:this.data.x,y:this.data.y},plants:this.data.plants,harvests:this.data.harvests};}
}
