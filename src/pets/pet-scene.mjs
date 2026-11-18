import {KitchenViewport as TouchViewport} from '../kitchen/kitchen-viewport.mjs?cocina=14';
import {CareSession} from './care-session.mjs';
import {PetRenderer} from './pet-renderer.mjs';
const el=(tag,cls='',text='')=>{const n=document.createElement(tag);n.className=cls;if(text)n.textContent=text;return n;};
const MODES={stroke:'Acariciar',brush:'Cepillar',feed:'Comida',drink:'Agua',fetch:'Pelota',train:'Sentarse',rest:'Descansar'};
const TIPS={stroke:'Desliza sobre su cabeza y su cuerpo, o mantén el dedo para acariciarlo.',brush:'Pasa el cepillo por el cuerpo, o mantén el dedo sobre el pelo.',feed:'Toca el cuenco o a tu podenco para ofrecerle comida.',drink:'Toca el cuenco o a tu podenco para ofrecerle agua fresca.',fetch:'Arrastra la pelota y suelta. También puedes tocar el suelo para lanzarla.',train:'Dile «siéntate» y, cuando lo haga, toca el premio para felicitarlo.',rest:'Un pequeño descanso en su cama para recuperar energía.'};
export class PetScene{
  constructor(owner){this.owner=owner;this.house=owner.house;this.store=owner.store;}
  get open(){return !!this.root;}
  button(text,fn,cls=''){const b=el('button',cls,text);b.type='button';b.addEventListener('click',fn,{signal:this.abort.signal});return b;}
  async show(){
    if(this.open||this.house.cooking?.open||!this.house.ready)return;
    this.abort=new AbortController();this.role=this.house.actor.role;this.lastDraw=-Infinity;this.lastHUD=-Infinity;this.ready=false;this.busy=false;this.pending=null;this.applied=false;this.session=null;this.hidden=false;this.store.reload();
    this.root=el('section','dm-pet-scene');this.root.id='dm-pet-scene';this.root.setAttribute('role','dialog');this.root.setAttribute('aria-modal','true');this.root.setAttribute('aria-label','Tu podenco: cuidados y juegos');
    const header=el('header','pet-header'),identity=el('div');identity.append(el('small','','DOS MUNDOS · UN NUEVO COMPAÑERO'));this.title=el('h1','',this.store.doc.pet?.name||'Un podenco en casa');identity.append(this.title);header.append(identity,this.button('Volver a casa',()=>this.close()));
    this.needs=el('div','pet-needs');this.stage=el('div','pet-stage');this.canvas=el('canvas');this.canvas.id='dm-pet-canvas';this.canvas.tabIndex=0;this.canvas.setAttribute('aria-label','Podenco: acaricia o usa los objetos con el dedo');this.stage.append(this.canvas);
    this.panel=el('div','pet-panel');this.root.append(header,this.needs,this.stage,this.panel);document.body.append(this.root);document.body.classList.add('dm-pet-active');
    this.wasInert=this.house.root.inert;this.house.root.inert=true;this.house.held.clear();this.house.path=[];this.house.pendingAction=null;
    this.viewport=new TouchViewport(this.root,()=>this.cancelGesture());const signal=this.abort.signal;
    this.stage.addEventListener('touchmove',e=>e.preventDefault(),{signal,passive:false});this.canvas.addEventListener('contextmenu',e=>e.preventDefault(),{signal});
    this.canvas.addEventListener('pointerdown',e=>this.down(e),{signal});
    window.addEventListener('pointermove',e=>this.move(e),{signal,capture:true});
    window.addEventListener('pointerup',e=>this.up(e),{signal,capture:true});
    window.addEventListener('pointercancel',e=>{if(e.pointerId===this.pointerId)this.cancelGesture();},{signal,capture:true});
    this.canvas.addEventListener('lostpointercapture',e=>{if(e.pointerId===this.pointerId)this.cancelGesture();},{signal});
    document.addEventListener('visibilitychange',()=>{this.hidden=document.hidden;if(this.hidden)this.cancelGesture();},{signal});
    window.addEventListener('blur',()=>this.cancelGesture(),{signal});window.addEventListener('orientationchange',()=>this.cancelGesture(),{signal});
    window.addEventListener('pagehide',()=>{this.cancelGesture();this.viewport?.destroy();},{signal});
    window.addEventListener('pageshow',()=>{if(this.root&&this.viewport?.destroyed)this.viewport=new TouchViewport(this.root,()=>this.cancelGesture());},{signal});
    window.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();this.close();}else if(!/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)&&(e.key.startsWith('Arrow')||['w','a','s','d'].includes(e.key))){e.preventDefault();e.stopImmediatePropagation();}},{signal,capture:true});
    this.panel.append(el('p','','Preparando a tu nuevo compañero…'));const root=this.root;
    try{const art=await this.owner.load();if(root!==this.root)return;this.renderer=new PetRenderer(this.canvas,art);this.ready=true;this.build();}
    catch(error){if(root!==this.root)return;this.panel.replaceChildren(el('p','',error.message),this.button('Reintentar',()=>{this.close();this.show();}));}
  }
  build(){
    this.panel.replaceChildren();this.root.dataset.view=this.store.doc.pet?'care':'adopt';
    if(this.store.readOnly){this.panel.append(el('p','',this.store.error));return;}
    if(!this.store.doc.pet){this.adoption();return;}
    this.title.textContent=this.store.doc.pet.name;this.buildNeeds();
    this.tip=el('p','pet-tip');this.progress=el('progress');this.progress.max=1;this.progress.setAttribute('aria-label','Avance del cuidado');
    this.notice=el('p','pet-notice');this.notice.setAttribute('role','status');this.notice.setAttribute('aria-live','polite');
    this.actions=el('div','pet-result-actions');this.repeat=this.button('Otra vez',()=>this.choose(this.session.kind));this.repeat.hidden=true;this.retry=this.button('Guardar cuidado',()=>this.commit());this.retry.hidden=true;this.actions.append(this.repeat,this.retry);
    const modes=el('nav','pet-modes');modes.setAttribute('aria-label','Cuidados y juegos');this.buttons=[];
    for(const [kind,label] of Object.entries(MODES)){const b=this.button(label,()=>this.choose(kind));b.dataset.petMode=kind;modes.append(b);this.buttons.push(b);}
    this.panel.append(this.tip,this.progress,this.notice,this.actions,modes,el('small','pet-local','Primera adopción y cuidados incluidos · Se guarda en este dispositivo.'));
    this.choose('stroke');
  }
  adoption(){
    this.needs.replaceChildren(el('p','','Orejas enormes, pasos curiosos y un hogar por descubrir.'));
    const form=el('form','pet-adoption');const label=el('label','','¿Cómo se llamará?');this.nameInput=el('input');this.nameInput.name='pet-name';this.nameInput.maxLength=24;this.nameInput.value='Canela';this.nameInput.required=true;this.nameInput.autocomplete='off';label.append(this.nameInput);
    this.adoptButton=el('button','','Adoptar a nuestro podenco');this.adoptButton.type='submit';this.notice=el('p','pet-notice');this.notice.setAttribute('role','status');
    form.append(label,this.adoptButton,this.notice);form.addEventListener('submit',e=>{e.preventDefault();this.adopt();},{signal:this.abort.signal});
    this.panel.append(el('p','pet-tip','Un cachorro canela y blanco, curioso y juguetón. Tú y '+(this.role==='jc'?'Gabi':'JC')+' podréis cuidarlo y enseñarle a sentarse.'),form,el('small','pet-local','Adopción gratis · Esta primera versión se guarda en este dispositivo.'));
    this.adoptTicket=this.store.ticket('adopt');
  }
  async adopt(){
    if(this.busy)return;const root=this.root;this.busy=true;this.adoptButton.disabled=true;const command={...this.adoptTicket,name:this.nameInput.value,role:this.role,at:Date.now()};
    const r=await this.store.execute(command);this.owner.changed();
    if(this.root!==root)return;this.busy=false;if(r.ok){this.nameInput.blur();this.close();this.house.feedback(r.message||'Tu podenco ya está en casa. Tócalo o pulsa Cuidar.');}else{this.notice.textContent=r.message;this.adoptButton.disabled=false;this.adoptTicket=this.store.ticket('adopt');}
  }
  buildNeeds(){this.needs.replaceChildren();this.bars={};for(const [id,label] of Object.entries({food:'Comida',water:'Agua',clean:'Aseo',energy:'Energía',joy:'Ánimo'})){const n=el('label','',label),bar=el('meter');bar.min=0;bar.max=100;bar.setAttribute('aria-label',label+' del podenco');n.append(bar);this.needs.append(n);this.bars[id]=bar;}}
  choose(kind){
    if(this.busy)return;this.cancelGesture();this.store.reload();if(this.store.readOnly||!this.store.doc.pet){this.build();return;}
    this.session=new CareSession(kind);this.ticket=this.store.ticket(kind);this.applied=false;this.pending=null;this.progress.value=0;this.notice.textContent='';this.repeat.hidden=true;this.retry.hidden=true;this.tip.textContent=TIPS[kind];
    for(const b of this.buttons)b.setAttribute('aria-pressed',String(b.dataset.petMode===kind));this.dirty=true;this.refreshHUD();
  }
  down(e){
    if(!this.ready||this.busy||!this.session||this.session.completed||!e.isPrimary||this.pointerId!=null)return;
    e.preventDefault();this.pointerId=e.pointerId;this.bounds=this.canvas.getBoundingClientRect();this.viewport.beginGesture();this.canvas.setPointerCapture(e.pointerId);this.session.down(this.renderer.point(e,this.bounds));this.dirty=true;
  }
  move(e){if(e.pointerId!==this.pointerId)return;e.preventDefault();for(const sample of e.getCoalescedEvents?.()||[])this.session.move(this.renderer.point(sample,this.bounds));this.session.move(this.renderer.point(e,this.bounds));this.dirty=true;}
  up(e){if(e.pointerId!==this.pointerId)return;e.preventDefault();this.session.up(this.renderer.point(e,this.bounds));this.cancelGesture();this.dirty=true;}
  cancelGesture(){const id=this.pointerId;this.pointerId=null;this.bounds=null;this.session?.cancel();if(id!=null&&this.canvas?.hasPointerCapture(id))this.canvas.releasePointerCapture(id);this.viewport?.endGesture();this.dirty=true;}
  async commit(){
    if(this.busy||this.applied||!this.session?.completed)return;const root=this.root;this.busy=true;this.retry.hidden=true;this.notice.textContent='Guardando este cuidado…';
    this.pending??={...this.ticket,role:this.role,at:Date.now(),result:this.session.result()};const r=await this.store.execute(this.pending);this.owner.changed();
    if(this.root!==root)return;this.busy=false;this.applied=r.ok;this.notice.textContent=r.ok?(r.message||'Cuidado guardado.')+' Confianza con '+(this.role==='jc'?'JC':'Gabi')+': '+Math.round(this.store.doc.pet.bond[this.role])+'/100.':r.message;
    this.repeat.hidden=!r.ok;this.retry.hidden=r.ok;for(const b of this.buttons)b.disabled=false;this.refreshHUD();
  }
  refreshHUD(){const p=this.store.view().pet;if(!p||!this.bars)return;for(const [key,bar] of Object.entries(this.bars))bar.value=p.needs[key];if(this.session?.kind==='train'&&!this.session.completed)this.tip.textContent=this.session.phase==='reward'?'¡Se ha sentado! Toca el cuenco de premios o a tu podenco para felicitarlo. Aprendizaje '+p.training.sit+'/3.':p.training.sit===3?'Ya conoce «siéntate». Practicad y dale un premio.':TIPS.train;}
  update(dt,now){
    if(!this.open)return;if(this.house.actor.role!==this.role){this.close();return;}if(!this.ready||this.hidden)return;
    if(this.session&&!this.busy){this.session.update(dt);if(this.progress)this.progress.value=this.session.progress;if(this.session.completed&&!this.applied&&!this.pending){for(const b of this.buttons)b.disabled=true;this.commit();}}
    if(now-this.lastHUD>300){this.refreshHUD();this.lastHUD=now;}
    if(now-this.lastDraw>1000/(this.renderer.reduced?12:30)){this.renderer.draw(this.session,now,!this.store.doc.pet);this.lastDraw=now;}
  }
  close(){if(!this.root)return;this.cancelGesture();this.abort.abort();this.viewport?.destroy();this.root.remove();this.root=null;this.ready=false;this.house.root.inert=this.wasInert;document.body.classList.remove('dm-pet-active');this.owner.changed();this.house.petButton?.focus({preventScroll:true});}
  snapshot(){return this.open?{ready:this.ready,view:this.store.doc.pet?'care':'adopt',role:this.role,kind:this.session?.kind||null,phase:this.session?.phase||null,progress:this.session?.progress||0,completed:!!this.session?.completed,applied:this.applied,busy:this.busy,gesture:this.pointerId!=null,board:this.session?{dog:{...this.session.dog},ball:{...this.session.ball}}:null}:null;}
}
