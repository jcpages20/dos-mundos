import {MAPS,contains,encodePosition} from './outdoor-maps.mjs';
import {OutdoorRenderer} from './outdoor-renderer.mjs';
import {canStand,clearSegment,distance,findPath,moveSafely,nearestApproach} from '../engine/navigation.mjs';
const el=(tag,css='',text='')=>{const e=document.createElement(tag);e.className=css;if(text)e.textContent=text;return e;};
export class OutdoorScene{
  constructor(api){
    this.api=api;this.data=api.snapshot();this.map=MAPS[this.data.room];this.actor={...this.map.spawn,role:api.role,pose:'stand',moving:false};
    this.key=`dos-mundos-exteriores-rpg-v1:${this.map.id}:${api.role}:${encodeURIComponent(this.data.name)}`;
    this.path=[];this.held=new Set();this.abort=new AbortController();this.ready=false;this.disposed=false;this.target=null;
    try{const s=JSON.parse(localStorage.getItem(this.key));if(s?.version===1&&canStand(s.position,this.map)&&!contains(s.position,this.map.exit))Object.assign(this.actor,s.position,{role:api.role,pose:'stand',moving:false});}catch{/* Independent position-only save; no migration. */}
  }
  button(text,fn,css=''){const b=el('button',css,text);b.type='button';b.addEventListener('click',fn,{signal:this.abort.signal});return b;}
  async mount(){
    const map=this.map;this.root=el('section','dm-outdoor-scene');this.root.id='dm-outdoor-scene';this.root.dataset.place=map.id;this.root.setAttribute('aria-label',map.title);
    const head=el('header','dm-outdoor-header'),name=el('div','dm-outdoor-name');name.append(el('small','','DOS MUNDOS · MADRID'),el('h1','',map.title));
    const tools=el('nav','dm-outdoor-tools');
    this.plan=this.button('Plano',()=>{if(!this.ready)return;this.renderer.overview=!this.renderer.overview;this.plan.textContent=this.renderer.overview?'Acercar':'Plano';this.plan.setAttribute('aria-pressed',String(this.renderer.overview));});this.plan.setAttribute('aria-pressed','false');
    tools.append(this.plan,this.button('Opciones',()=>this.options()),this.button('Calle',()=>this.api.exit()));this.stats=el('p','dm-outdoor-stats');head.append(name,tools,this.stats);
    this.canvas=el('canvas');this.canvas.id='dm-outdoor-canvas';this.canvas.tabIndex=0;this.canvas.setAttribute('aria-label','Toca el suelo para caminar, un banco para sentarte o una persona para conversar');
    const stage=el('div','dm-outdoor-stage');stage.append(this.canvas);const routes=el('nav','dm-outdoor-routes');routes.setAttribute('aria-label','Rincones de '+map.title);
    const ids=map.id==='park'?['palace','lake','exercise','lake-bench']:['clock','fountain','music','terrace-west'];
    const labels=map.id==='park'?['Cristal','Estanque','Deporte','Bancos']:['Reloj','Fuente','Música','Terraza'];
    ids.forEach((id,i)=>{const b=this.button(labels[i],()=>this.approach(map.targets.find(o=>o.id===id)));b.setAttribute('aria-label','Ir a '+labels[i]);routes.append(b);});
    this.message=el('p','dm-outdoor-message','Preparando los paseos y los rincones de Madrid…');this.message.setAttribute('role','status');
    const footer=el('footer','dm-outdoor-controls'),pad=el('nav','dm-outdoor-pad');pad.setAttribute('aria-label','Caminar');
    for(const [direction,glyph] of [['up','▲'],['left','◀'],['down','▼'],['right','▶']]){
      const b=this.button(glyph,()=>{});b.dataset.direction=direction;b.setAttribute('aria-label','Caminar '+{up:'arriba',left:'izquierda',down:'abajo',right:'derecha'}[direction]);
      b.addEventListener('pointerdown',e=>{e.preventDefault();if(!this.ready||this.menu)return;b.setPointerCapture(e.pointerId);this.cancelWalk();this.stand();this.held.add(direction);},{signal:this.abort.signal});
      for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,()=>this.held.delete(direction),{signal:this.abort.signal});pad.append(b);
    }
    const context=el('div','dm-outdoor-context');this.context=el('strong');this.detail=el('span');this.primary=this.button('Explora Madrid',()=>this.primaryAction(),'dm-outdoor-primary');
    context.append(this.context,this.detail,this.primary);footer.append(pad,context);this.root.append(head,stage,routes,this.message,footer);document.body.append(this.root);document.body.classList.add('dm-outdoor-active');
    this.api.pause();this.renderer=new OutdoorRenderer(this.canvas,map);this.canvas.focus({preventScroll:true});
    this.canvas.addEventListener('pointerdown',e=>this.tap(e),{signal:this.abort.signal});
    for(const [type,on] of [['keydown',true],['keyup',false]])document.addEventListener(type,e=>this.keyEvent(e,on),{capture:true,signal:this.abort.signal});
    window.addEventListener('blur',()=>this.held.clear(),{signal:this.abort.signal});document.addEventListener('visibilitychange',()=>{this.held.clear();if(document.hidden)this.save();},{signal:this.abort.signal});
    let timeout;try{await Promise.race([this.renderer.load(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('No se pudieron cargar los nuevos escenarios.')),18000);})]);}finally{clearTimeout(timeout);}
    if(this.disposed)return;this.ready=true;this.feedback(map.subtitle+'. Toca un rincón para acercarte.');this.previous=performance.now();
    const tick=now=>{if(this.disposed)return;this.update(Math.min(.05,(now-this.previous)/1000),now);this.previous=now;if(!this.disposed)this.frame=requestAnimationFrame(tick);};this.update(0,this.previous);this.frame=requestAnimationFrame(tick);
  }
  feedback(text){this.message.textContent=text;}
  cancelWalk(){this.path=[];this.pending=null;this.held.clear();}
  stand(){if(this.actor.pose!=='sit')return;Object.assign(this.actor,this.returnPoint||this.map.spawn,{pose:'stand',moving:false});this.returnPoint=null;this.save();this.feedback('Te has levantado. Puedes seguir paseando.');}
  walk(point){
    if(!this.ready||this.menu)return;this.cancelWalk();this.stand();this.target=null;
    if(!canStand(point,this.map)){this.feedback('Busca un camino libre; el agua, las fachadas y los muebles tienen colisiones.');return;}
    const path=findPath(this.actor,point,this.map);if(path)this.path=path;else this.feedback('Prueba otro sendero para llegar a ese rincón.');
  }
  tap(e){if(!this.ready||this.menu)return;e.preventDefault();this.canvas.focus({preventScroll:true});const p=this.renderer.worldPoint(e);
    const person=this.data.people.map((data,i)=>({...this.map.people[i%this.map.people.length],...data})).find(q=>Math.hypot(p.x-q.x,p.y-(q.y-23))<27);
    if(person){this.approachPerson(person);return;}const object=[...this.map.targets].reverse().find(o=>contains(p,o));if(object)this.approach(object);else this.walk(p);
  }
  approach(target,action=null){
    if(!this.ready||!target||this.menu)return;this.cancelWalk();this.stand();const route=nearestApproach(this.actor,target,this.map);
    if(!route){this.feedback('Ese rincón no tiene un acceso libre.');return;}this.target=target;this.path=route.path;
    this.pending=()=>{this.target=target;this.actor.face=route.point.face||'up';this.feedback(target.description||target.name+'. Elige una actividad para disfrutar de este rincón.');if(action)this.perform(action);};
    this.feedback('Caminando hacia '+target.name.toLowerCase()+'…');
  }
  approachPerson(person){
    const point={x:person.x,y:person.y+40};this.approach({id:'person-'+person.index,name:person.name,action:'person',person,approaches:[point]},'person');
  }
  primaryAction(){
    if(!this.ready||this.menu)return;if(this.actor.pose==='sit'){this.stand();return;}
    const t=this.target;if(!t){this.activities();return;}
    if(this.path.length||Math.min(...t.approaches.map(p=>distance(this.actor,p)))>43){this.approach(t,t.action);return;}this.perform(t.action);
  }
  perform(action){
    if(this.menu)return;const t=this.target;if(!t)return;
    if(action==='exit'){this.api.exit();return;}if(action==='person'){this.talk(t.person);return;}
    if(action==='look'){this.feedback(t.description);return;}
    if(this.actor.pose==='sit')return;
    const result=this.api.act(action);this.data=this.api.snapshot();this.feedback(result.message);
    if(result.ok&&t.seats){this.returnPoint={x:this.actor.x,y:this.actor.y,face:this.actor.face};Object.assign(this.actor,t.seats[this.actor.role==='gabi'?1:0],{pose:'sit',moving:false});}
    this.save();
  }
  update(dt,now){
    if(this.disposed||this.paused)return;if(!this.api.open||this.api.room!==this.map.id){this.destroy();return;}
    if(this.talking&&document.getElementById('relationshipBox')?.classList.contains('hidden'))this.closeMenu();
    const before={...this.actor};if(!this.menu&&this.actor.pose==='stand'){
      let dx=Number(this.held.has('right'))-Number(this.held.has('left')),dy=Number(this.held.has('down'))-Number(this.held.has('up'));
      if(dx||dy){const len=Math.hypot(dx,dy);dx/=len;dy/=len;Object.assign(this.actor,moveSafely(this.actor,dx*dt*175,dy*dt*175,this.map));this.actor.face=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';}
      else if(this.path.length){const p=this.path[0],len=distance(this.actor,p),step=Math.min(len,dt*225);
        if(len>.1){dx=(p.x-this.actor.x)/len;dy=(p.y-this.actor.y)/len;Object.assign(this.actor,moveSafely(this.actor,dx*step,dy*step,this.map));this.actor.face=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';}
        if(distance(this.actor,p)<1.5&&clearSegment(this.actor,p,this.map)){Object.assign(this.actor,p);this.path.shift();}
        else if(len>2&&distance(before,this.actor)<.01){this.cancelWalk();this.feedback('Busca otro camino libre.');}
      }
      if(!this.path.length&&this.pending){const fn=this.pending;this.pending=null;fn();}
      if(contains(this.actor,this.map.exit)){this.api.exit();return;}
    }
    this.actor.moving=distance(before,this.actor)>.05&&this.actor.pose==='stand';
    if(!this.path.length&&!this.pending&&this.actor.pose==='stand'&&!this.menu){
      const close=this.map.targets.flatMap(object=>object.approaches.map(p=>({object,d:distance(this.actor,p)}))).filter(q=>q.d<44).sort((a,b)=>a.d-b.d)[0];
      if(!this.target?.person)this.target=close?.object||null;
    }
    this.api.position({...encodePosition(this.actor,this.map),face:this.actor.face});
    if(!this.synced||now-this.synced>400){this.data=this.api.snapshot();this.synced=now;this.syncUI();}
    if(this.data.role!==this.actor.role){this.api.exit();return;}
    this.syncContext();this.renderer.render(this.actor,this.data,this.target,now);if(this.actor.moving&&now-(this.lastSaved||0)>1500){this.save();this.lastSaved=now;}
  }
  syncUI(){const d=this.data,time=String(Math.floor(d.time/60)%24).padStart(2,'0')+':'+String(d.time%60).padStart(2,'0');this.stats.textContent=(d.role==='gabi'?'Gabi':'JC')+' · '+time+' · '+d.money+' € · Energía '+Math.round(d.energy)+'/100'+(d.peer?' · Estáis juntos':'');}
  syncContext(){
    const t=this.target;this.context.textContent=t?.name||this.map.subtitle;
    const item=this.api.actions().find(a=>a.id===t?.action);this.detail.textContent=this.actor.pose==='sit'?'Un rato para disfrutar de Madrid':item?item.minutes+' min'+(item.xp?' · +'+item.xp+' XP':''):'Toca para caminar · flechas para moverte';
    this.primary.textContent=this.actor.pose==='sit'?'Levantarse':t?({look:'Mirar de cerca',person:'Hablar con '+t.person?.name,exit:'Salir a Madrid'}[t.action]||item?.title||'Explorar'):'Actividades';this.primary.disabled=!this.ready;
  }
  keyEvent(e,on){
    if(this.disposed||this.paused||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||!this.root.contains(e.target))return;
    const dir={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',a:'left',s:'down',d:'right'}[e.key];
    if(dir){e.preventDefault();e.stopImmediatePropagation();if(this.menu||!this.ready)return;if(on){this.path=[];this.pending=null;this.stand();this.held.add(dir);}else this.held.delete(dir);}
    else if(on&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(this.menu)this.closeMenu();else if(this.actor.pose==='sit')this.stand();else this.api.exit();}
    else if(on&&e.key==='Tab'&&this.menu){const buttons=[...this.menu.querySelectorAll('button:not(:disabled),a,input')],first=buttons[0],last=buttons.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
    else if(on&&['Enter',' '].includes(e.key)&&e.target===this.canvas){e.preventDefault();e.stopImmediatePropagation();this.primaryAction();}
  }
  openMenu(title){this.closeMenu();this.held.clear();this.menu=el('section','dm-outdoor-menu');this.menu.setAttribute('role','dialog');this.menu.setAttribute('aria-modal','true');this.menu.setAttribute('aria-label',title);
    const close=this.button('Cerrar',()=>this.closeMenu());this.menu.append(el('h2','',title),close);this.root.append(this.menu);close.focus();return this.menu;}
  closeMenu(){if(this.talking){this.api.closeTalk();const box=document.getElementById('relationshipBox');if(box&&this.relationMarker?.parentNode)this.relationMarker.replaceWith(box);this.relationMarker=null;this.talking=false;}
    this.menu?.remove();this.menu=null;if(this.ready&&!this.paused)this.canvas.focus({preventScroll:true});}
  talk(person){
    const menu=this.openMenu('Conversar con '+person.name),box=document.getElementById('relationshipBox');if(!box)return;
    this.relationMarker=document.createComment('Conversación nativa: posición original');box.before(this.relationMarker);menu.append(box);this.talking=true;this.api.talk(person.index);
  }
  activities(){
    if(!this.ready)return;const menu=this.openMenu('Un rato en '+this.map.title);
    menu.append(el('p','','El personaje se acercará al lugar antes de realizar la actividad. Cada actividad conserva sus efectos, tiempo y habilidades.'));
    for(const a of this.api.actions())menu.append(this.button(a.title+' · '+a.minutes+' min'+(a.xp?' · +'+a.xp+' XP':''),()=>{this.closeMenu();const id=this.map.id==='park'?{walk:'lake',sport:'exercise',stroll:'monument',rest:'lake-bench'}[a.id]:{music:'music',talk:'fountain',social:'fountain',listen:'terrace-west'}[a.id];this.approach(this.map.targets.find(o=>o.id===id),a.id);}));
  }
  people(){const menu=this.openMenu('Vecinos en '+this.map.title);for(const [i,p] of this.data.people.entries())menu.append(this.button('Hablar con '+p.name,()=>{this.closeMenu();this.approachPerson({...this.map.people[i%this.map.people.length],...p});}));}
  nativeMenu(kind){this.closeMenu();window.DosMundosLegacy?.menu(kind);const id={phone:'dm42-phone',duo:'dm61-overlay',online:'dm41-panel',radio:'dm381-radio-panel'}[kind];
    document.getElementById(id)?.querySelector('button,input,a')?.focus({preventScroll:true});}
  options(){if(!this.ready)return;const menu=this.openMenu('Disfrutar de Madrid');menu.append(this.button('Actividades del lugar',()=>this.activities()),this.button('Hablar con los vecinos',()=>this.people()),
    this.button('Teléfono y chat',()=>this.nativeMenu('phone')),this.button('Planes juntos',()=>this.nativeMenu('duo')),
    this.button('Radio',()=>this.nativeMenu('radio')),this.button('Conexión online',()=>this.nativeMenu('online')),
    this.button('Actividades anteriores',()=>this.showClassic()),this.button('Salir a Madrid',()=>this.api.exit()));}
  showClassic(){this.closeMenu();this.cancelWalk();this.stand();this.paused=true;this.root.hidden=true;this.api.resume();document.body.classList.remove('dm-outdoor-active');
    this.returnButton=this.button('Volver a '+this.map.title,()=>{this.returnButton.remove();this.paused=false;this.root.hidden=false;this.api.pause();document.body.classList.add('dm-outdoor-active');this.renderer.resize();this.data=this.api.snapshot();this.canvas.focus({preventScroll:true});},'dm-outdoor-return');document.body.append(this.returnButton);}
  save(){const point=this.returnPoint||this.actor;const p=canStand(point,this.map)&&!contains(point,this.map.exit)?{x:point.x,y:point.y,face:point.face}:this.map.spawn;
    try{localStorage.setItem(this.key,JSON.stringify({version:1,position:p}));}catch{/* Native progress is independent and preserved. */}}
  destroy(){if(this.disposed)return;this.disposed=true;this.save();this.closeMenu();cancelAnimationFrame(this.frame);this.abort.abort();this.renderer?.destroy();this.root?.remove();this.returnButton?.remove();document.body.classList.remove('dm-outdoor-active');}
  snapshot(){return {ready:this.ready,room:this.map.id,role:this.actor.role,position:{x:this.actor.x,y:this.actor.y},face:this.actor.face,pose:this.actor.pose,walking:!!this.path.length,target:this.target?.id||null,paused:!!this.paused,people:this.data.people,peer:this.data.peer,overview:!!this.renderer?.overview};}
}
