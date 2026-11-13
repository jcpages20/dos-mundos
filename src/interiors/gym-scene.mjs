import {GYM,gymContains,gymZoneAt} from './gym-map.mjs';
import {GymRenderer} from './gym-renderer.mjs';
import {canStand,clearSegment,distance,findPath,moveSafely,nearestApproach} from '../engine/navigation.mjs';

const actions={weights:'Entrenar fuerza',cardio:'Hacer cardio',stretch:'Estirar y recuperar',silks:'Practicar telas',
  water:'Beber agua',rest:'Descansar',routine:'Consultar progreso',look:'Examinar'};
const duration={weights:3200,cardio:3600,stretch:3200,silks:5600,water:1500,rest:2400};
const node=(tag,css='',text='')=>{const element=document.createElement(tag);if(css)element.className=css;if(text)element.textContent=text;return element;};

export class GymScene{
  constructor(api){
    this.api=api;const state=api.snapshot();
    this.key=`dos-mundos-gym-rpg-v1:${api.role}:${encodeURIComponent(state.name)}`;
    this.actor={...GYM.spawn,role:api.role,pose:'stand',moving:false};this.path=[];this.held=new Set();this.abort=new AbortController();
    this.target=null;this.training=null;this.menu=null;this.ready=false;this.disposed=false;
    try{const saved=JSON.parse(localStorage.getItem(this.key));
      if(saved?.version===1&&saved.position&&canStand(saved.position,GYM)&&!gymContains(saved.position,GYM.exit)){
        this.actor.x=saved.position.x;this.actor.y=saved.position.y;
        if(['up','down','left','right'].includes(saved.position.face))this.actor.face=saved.position.face;
      }
    }catch{/* Previous namespaces and raw save values remain untouched. */}
    this.origin={x:state.x,y:state.y,city:state.city,district:state.district};
  }
  button(label,callback,css=''){
    const button=node('button',css,label);button.type='button';button.addEventListener('click',callback,{signal:this.abort.signal});return button;
  }
  async mount(){
    this.root=node('section','dm-gym-scene');this.root.id='dm-gym-scene';this.root.setAttribute('aria-label','Club Atlas: gimnasio y telas aéreas');
    const header=node('header','dm-gym-header'),identity=node('div','dm-gym-identity');
    this.zoneLabel=node('span','dm-gym-eyebrow','UN RATO PARA TI');identity.append(this.zoneLabel,node('h1','','Club Atlas'));
    const buttons=node('div','dm-gym-head-actions');
    this.plan=this.button('Plano',()=>{if(!this.ready)return;this.renderer.overview=!this.renderer.overview;this.plan.setAttribute('aria-pressed',String(this.renderer.overview));this.plan.textContent=this.renderer.overview?'Seguir':'Plano';});
    this.plan.setAttribute('aria-pressed','false');
    buttons.append(this.plan,this.button('Menú',()=>this.openMenu()),this.button('Calle',()=>this.api.exit(),'dm-gym-exit'));
    header.append(identity,buttons);this.stats=node('p','dm-gym-stats');header.append(this.stats);
    const stage=node('div','dm-gym-stage');this.canvas=node('canvas');this.canvas.id='dm-gym-canvas';this.canvas.tabIndex=0;
    this.canvas.setAttribute('aria-label','Gimnasio: toca el suelo para caminar o una máquina para acercarte');stage.append(this.canvas);
    this.workout=node('div','dm-gym-workout');this.workout.hidden=true;
    this.workoutLabel=node('strong');this.workoutProgress=node('progress');this.workoutProgress.max=1;this.workoutProgress.value=0;
    this.workout.append(this.workoutLabel,this.workoutProgress);stage.append(this.workout);
    const routes=node('nav','dm-gym-routes');routes.setAttribute('aria-label','Zonas del gimnasio');
    for(const route of GYM.routes){const button=this.button(route.name,()=>this.walkTo(route.point,'Caminando hacia '+route.name.toLowerCase()+'…'));button.setAttribute('aria-label','Ir a '+route.name);routes.append(button);}
    this.message=node('p','dm-gym-message','Preparando Club Atlas y vuestro rincón de telas…');this.message.setAttribute('role','status');
    const footer=node('footer','dm-gym-controls'),pad=node('div','dm-gym-pad');
    for(const [direction,glyph] of [['up','▲'],['left','◀'],['down','▼'],['right','▶']]){
      const button=this.button(glyph,()=>{});button.dataset.direction=direction;
      button.setAttribute('aria-label','Caminar '+{up:'arriba',left:'izquierda',down:'abajo',right:'derecha'}[direction]);
      button.addEventListener('pointerdown',event=>{event.preventDefault();if(!this.ready||this.menu)return;button.setPointerCapture(event.pointerId);this.stopTraining();this.path=[];this.pending=null;this.held.add(direction);},{signal:this.abort.signal});
      for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,()=>this.held.delete(direction),{signal:this.abort.signal});pad.append(button);
    }
    const context=node('div','dm-gym-context');this.objectLabel=node('strong','','Bienvenidos a Atlas');
    this.primary=this.button('Preparando…',()=>this.primaryAction(),'dm-gym-primary');this.primary.disabled=true;
    context.append(this.objectLabel,this.primary);footer.append(pad,context);
    this.root.append(header,stage,routes,this.message,footer);document.body.append(this.root);document.body.classList.add('dm-gym-active');
    this.api.pause();this.renderer=new GymRenderer(this.canvas);
    this.renderer.camera={x:Math.max(0,this.actor.x-this.canvas.width/2),y:Math.max(0,this.actor.y-this.canvas.height*.6)};
    this.canvas.addEventListener('pointerdown',event=>this.tap(event),{signal:this.abort.signal});
    document.addEventListener('keydown',event=>this.keyEvent(event,true),{capture:true,signal:this.abort.signal});
    document.addEventListener('keyup',event=>this.keyEvent(event,false),{capture:true,signal:this.abort.signal});
    window.addEventListener('blur',()=>this.held.clear(),{signal:this.abort.signal});
    document.addEventListener('visibilitychange',()=>{this.held.clear();if(document.hidden)this.save();},{signal:this.abort.signal});
    let timeout;
    try{await Promise.race([this.renderer.load(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('La carga del material está tardando demasiado.')),20000);})]);}
    finally{clearTimeout(timeout);}
    if(this.disposed||!this.root.isConnected)return;
    this.ready=true;this.primary.disabled=false;this.feedback('Explora el club. Toca una máquina para acercarte; las telas esperan en la sala de madera.');
    this.previous=performance.now();this.update(0,this.previous);
    const tick=now=>{if(this.disposed)return;this.update(Math.min((now-this.previous)/1000,.05),now);this.previous=now;if(!this.disposed)this.frame=requestAnimationFrame(tick);};
    this.frame=requestAnimationFrame(tick);
  }
  feedback(text){if(this.message)this.message.textContent=text;}
  stopTraining(){
    if(!this.training)return;
    Object.assign(this.actor,this.returnPoint||GYM.spawn,{pose:'stand',moving:false});this.training=null;this.returnPoint=null;
    this.workout.hidden=true;this.target=null;this.save();
  }
  walkTo(point,message='Caminando por Atlas…'){
    if(!this.ready||this.menu)return;
    this.stopTraining();this.held.clear();this.target=null;this.pending=null;
    const path=findPath(this.actor,point,GYM);
    if(!path){this.feedback('Hay material en ese lugar. Prueba un pasillo libre.');return;}
    this.path=path;this.feedback(message);
  }
  tap(event){
    if(!this.ready||this.menu)return;event.preventDefault();const point=this.renderer.worldPoint(event);if(!point)return;
    const object=[...GYM.objects].reverse().find(object=>gymContains(point,object));
    if(object)this.approach(object);else this.walkTo(point);
  }
  approach(object,perform=false){
    if(!this.ready)return;this.stopTraining();this.held.clear();
    const option=nearestApproach(this.actor,object,GYM);
    if(!option){this.feedback('Acércate por el pasillo para llegar a '+object.name.toLowerCase()+'.');return;}
    this.target=object;this.path=option.path;
    this.pending=()=>{this.actor.face=option.point.face||'up';this.target=object;this.feedback(object.description);if(perform)this.primaryAction();};
    this.feedback('Acercándote a '+object.name.toLowerCase()+'…');
  }
  primaryAction(){
    if(!this.ready||this.menu)return;
    if(this.training){this.stopTraining();this.feedback('Un momento para respirar. Puedes seguir explorando el club.');return;}
    const object=this.target;
    if(!object){if(distance(this.actor,GYM.spawn)<60)this.api.exit();return;}
    if(this.path.length||Math.min(...object.approaches.map(point=>distance(this.actor,point)))>40){this.approach(object,true);return;}
    if(object.action==='look'){this.feedback(object.description);return;}
    const result=this.api.act(object.action);this.feedback(result.message);
    if(!result.ok)return;
    if(object.action==='routine'){this.openMenu(true);return;}
    this.returnPoint={x:this.actor.x,y:this.actor.y,face:this.actor.face};
    const started=performance.now();this.training={type:object.action,object,started,duration:duration[object.action]||2000,message:result.message};
    if(object.exercise)Object.assign(this.actor,object.exercise);
    this.actor.pose=object.action;this.actor.moving=false;this.path=[];this.held.clear();
    this.workout.hidden=false;this.workoutLabel.textContent=object.action==='silks'?'Un rato en las telas':object.name;
    this.workoutProgress.setAttribute('aria-label','Animación de '+object.name);this.save();
  }
  keyEvent(event,pressed){
    if(this.disposed||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName))return;
    if(pressed&&event.key==='Escape'){
      event.preventDefault();event.stopImmediatePropagation();if(this.menu)this.closeMenu();else if(this.training)this.stopTraining();else this.api.exit();return;
    }
    if(this.menu){
      if(pressed&&event.key==='Tab'){
        const buttons=[...this.menu.querySelectorAll('button')],first=buttons[0],last=buttons.at(-1);
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      }
      return;
    }
    const directions={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',a:'left',s:'down',d:'right'};
    if(directions[event.key]){
      event.preventDefault();event.stopImmediatePropagation();if(!this.ready)return;
      if(pressed){this.stopTraining();this.path=[];this.pending=null;this.held.add(directions[event.key]);}else this.held.delete(directions[event.key]);
    }else if(pressed&&['Enter',' '].includes(event.key)&&!event.target.closest('button,a,summary')){
      event.preventDefault();event.stopImmediatePropagation();this.primaryAction();
    }
  }
  update(dt,now){
    if(this.disposed)return;
    if(!this.api.open){this.api.exit();return;}
    if(this.training){
      this.workoutProgress.value=Math.min(1,(now-this.training.started)/this.training.duration);
      if(now-this.training.started>this.training.duration){const text=this.training.message;this.stopTraining();this.feedback(text);}
    }
    const before={x:this.actor.x,y:this.actor.y};
    if(!this.menu&&!this.training){
      let dx=Number(this.held.has('right'))-Number(this.held.has('left')),dy=Number(this.held.has('down'))-Number(this.held.has('up'));
      if(dx||dy){
        const size=Math.hypot(dx,dy);dx/=size;dy/=size;
        Object.assign(this.actor,moveSafely(this.actor,dx*dt*132,dy*dt*132,GYM));
        this.actor.face=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';
      }else if(this.path.length){
        const next=this.path[0],length=distance(this.actor,next),step=Math.min(dt*156,length);
        if(length>.1){dx=(next.x-this.actor.x)/length;dy=(next.y-this.actor.y)/length;Object.assign(this.actor,moveSafely(this.actor,dx*step,dy*step,GYM));this.actor.face=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';}
        if(distance(this.actor,next)<1.5&&clearSegment(this.actor,next,GYM)){Object.assign(this.actor,next);this.path.shift();}
        else if(distance(before,this.actor)<.01&&length>2){this.path=[];this.pending=null;this.feedback('Ese camino está ocupado por una máquina. Toca otro punto.');}
      }
      if(!this.path.length&&this.pending){const callback=this.pending;this.pending=null;callback();}
      if(gymContains(this.actor,GYM.exit)){this.api.exit();return;}
    }
    this.actor.moving=!this.training&&distance(before,this.actor)>.05;
    if(!this.path.length&&!this.training){
      const nearest=GYM.objects.flatMap(object=>object.approaches.map(point=>({object,gap:distance(this.actor,point)}))).filter(option=>option.gap<40).sort((a,b)=>a.gap-b.gap)[0];
      this.target=nearest?.object||null;
    }
    const state=this.api.snapshot();if(!state)return;
    this.zoneLabel.textContent=gymZoneAt(this.actor).name;
    const time=String(Math.floor(state.time/60)%24).padStart(2,'0')+':'+String(Math.floor(state.time)%60).padStart(2,'0');
    this.stats.textContent=(this.actor.role==='gabi'?'Gabi':'JC')+' · Día '+state.day+' · '+time+' · '+state.money+' € · Energía '+Math.round(state.energy)+'/100';
    this.objectLabel.textContent=this.training?this.training.object.name:this.target?.name||'Pasillo libre';
    this.primary.textContent=this.training?'Seguir caminando':this.target?actions[this.target.action]:distance(this.actor,GYM.spawn)<60?'Salir a la calle':'Explorar el club';
    this.primary.disabled=!this.training&&!this.target&&distance(this.actor,GYM.spawn)>=60;
    this.renderer.draw(this.actor,state,this.target,this.training,now);
  }
  closeMenu(){this.menu?.remove();this.menu=null;this.canvas?.focus({preventScroll:true});}
  openMenu(progressOnly=false){
    if(this.menu)return;this.held.clear();this.menu=node('section','dm-gym-menu');this.menu.setAttribute('role','dialog');this.menu.setAttribute('aria-modal','true');this.menu.setAttribute('aria-label','Menú de Club Atlas');
    const close=this.button('Cerrar',()=>this.closeMenu());this.menu.append(node('h2','','Tu rato en Atlas'),close);
    const state=this.api.snapshot();
    const card=node('section','dm-gym-progress-card');card.append(node('strong','',state.sessions+(state.sessions===1?' sesión de entrenamiento':' sesiones de entrenamiento')),
      node('p','','Fitness · '+state.fitnessXP+' XP'),node('p','','Telas aéreas · '+state.aerialXP+' XP · Nivel '+(1+Math.floor(state.aerialXP/54))));
    this.menu.append(card);
    if(!progressOnly){
      this.menu.append(node('h3','','Elige tu próxima sesión'));
      for(const [label,id] of [['Fuerza · 60 min','dumbbells'],['Cardio · 35 min','treadmill-1'],['Estirar · 20 min','floor-mat'],['Telas aéreas · 45 min','silks-burgundy']]){
        this.menu.append(this.button(label,()=>{this.closeMenu();this.approach(GYM.objects.find(object=>object.id===id),true);}));
      }
    }
    this.menu.append(this.button('Vista anterior y actividades',()=>{this.closeMenu();this.api.legacy();}),this.button('Salir a la calle',()=>this.api.exit()));
    this.root.append(this.menu);close.focus({preventScroll:true});
  }
  save(){
    const candidate=this.training?this.returnPoint:this.actor;
    const position=candidate&&canStand(candidate,GYM)&&!gymContains(candidate,GYM.exit)?{x:candidate.x,y:candidate.y,face:candidate.face}:{...GYM.spawn};
    try{localStorage.setItem(this.key,JSON.stringify({version:1,position,updated:Date.now()}));}catch{this.feedback('El navegador no ha podido guardar la posición del gimnasio.');}
  }
  destroy(){
    if(this.disposed)return;this.disposed=true;this.save();cancelAnimationFrame(this.frame);this.abort.abort();this.renderer?.destroy();this.root?.remove();document.body.classList.remove('dm-gym-active');
  }
  snapshot(){return{ready:this.ready,role:this.actor.role,position:{x:this.actor.x,y:this.actor.y},face:this.actor.face,zone:gymZoneAt(this.actor).id,
    pose:this.actor.pose,moving:this.actor.moving,walking:this.path.length>0,target:this.target?.id||null,training:this.training?.type||null,origin:this.origin};}
}
