import {DISHES,FOOD_NAMES,clamp} from './recipes.mjs?cocina=14';
import {CookingGame} from './cooking-model.mjs?cocina=14';
import {KitchenRenderer} from './kitchen-renderer.mjs?cocina=14';
import {KitchenViewport} from './kitchen-viewport.mjs?cocina=14';
const el=(tag,cls='',text='')=>{const n=document.createElement(tag);n.className=cls;if(text)n.textContent=text;return n;};
const set=(node,key,value)=>{if(node[key]!==value)node[key]=value;};

export class KitchenScene {
  constructor(house,api){this.house=house;this.api=api;this.easy=true;}
  get open(){return !!this.root;}
  button(label,fn){const b=el('button','',label);b.type='button';b.addEventListener('click',fn);return b;}
  async show(recipe='omelet'){
    if(this.open)return;this.role=this.api.role;this.selected=DISHES[recipe]?recipe:'omelet';this.abort=new AbortController();this.paintDirty=true;this.lastDraw=-Infinity;this.lastHUD=-Infinity;this.savedModel=null;
    this.root=el('section','dm-kitchen-scene');this.root.id='dm-kitchen-scene';this.root.setAttribute('role','dialog');this.root.setAttribute('aria-modal','true');this.root.setAttribute('aria-label','Nuestra cocina: tres platos para preparar');
    const header=el('header','ck-header'),name=el('div');name.append(el('small','','DOS MUNDOS · EN CASA'));this.title=el('h1','','Nuestra cocina');name.append(this.title);this.mode=this.button('',()=>this.setMode(!this.easy));this.mode.setAttribute('aria-label','Control fácil');header.append(name,this.mode,this.button('Pausa',()=>this.pause()),this.button('Salir',()=>this.close()));
    const stage=el('div','ck-stage');this.canvas=el('canvas');this.canvas.id='dm-kitchen-canvas';this.canvas.tabIndex=0;this.canvas.setAttribute('aria-label','Mesa de cocina: corta, remueve y mueve los alimentos con el dedo');stage.append(this.canvas);
    this.panel=el('div','ck-panel');this.root.append(header,stage,this.panel);document.body.append(this.root);document.body.classList.add('dm-kitchen-active');
    this.viewport=new KitchenViewport(this.root,()=>this.cancelGesture());this.setMode(this.easy);
    this.renderer=new KitchenRenderer(this.canvas,this.house.renderer,()=>this.cancelGesture());this.panel.append(el('p','','Preparando la tabla, los utensilios y la despensa…'));
    const signal=this.abort.signal;
    stage.addEventListener('touchmove',e=>e.preventDefault(),{passive:false,signal});this.canvas.addEventListener('contextmenu',e=>e.preventDefault(),{signal});
    this.canvas.addEventListener('pointerdown',e=>{if(!this.game?.active()||this.pointerId!=null||!e.isPrimary)return;e.preventDefault();this.viewport.beginGesture();this.pointerId=e.pointerId;this.pointerBounds=this.canvas.getBoundingClientRect();this.canvas.setPointerCapture(e.pointerId);const p=this.renderer.point(e,this.pointerBounds);this.game.begin(p.x,p.y);this.changed();},{signal});
    this.canvas.addEventListener('pointermove',e=>{if(e.pointerId!==this.pointerId||!this.game?.pointer)return;e.preventDefault();for(const sample of e.getCoalescedEvents?.()||[]){const p=this.renderer.point(sample,this.pointerBounds);this.game.move(p.x,p.y);}const p=this.renderer.point(e,this.pointerBounds);this.game.move(p.x,p.y);this.changed(false);},{signal});
    this.canvas.addEventListener('pointerup',e=>{if(e.pointerId!==this.pointerId)return;e.preventDefault();if(this.game?.pointer){const p=this.renderer.point(e,this.pointerBounds);this.game.end(p.x,p.y);}this.cancelGesture();this.changed();this.persist();},{signal});
    for(const type of ['pointercancel','lostpointercapture'])this.canvas.addEventListener(type,e=>{if(e.pointerId===this.pointerId){this.cancelGesture();this.persist();}},{signal});
    // Mobile browser controls can blur or rotate a visible page. Only a real
    // background transition (or the player's pause button) freezes the recipe.
    window.addEventListener('keydown',e=>this.key(e),{capture:true,signal});window.addEventListener('blur',()=>{this.cancelGesture();if(document.hidden)this.pause();},{signal});window.addEventListener('orientationchange',()=>this.cancelGesture(),{signal});window.addEventListener('pagehide',e=>{this.pause();if(e.persisted===false)this.viewport?.destroy();},{signal});window.addEventListener('pageshow',()=>{if(this.root&&this.viewport?.destroyed)this.viewport=new KitchenViewport(this.root,()=>this.cancelGesture());},{signal});document.addEventListener('visibilitychange',()=>{if(document.hidden)this.pause();},{signal});
    const root=this.root;let timeout;
    try{await Promise.race([this.renderer.load(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('La cocina está tardando demasiado en cargar.')),20000);})]);if(this.root!==root)return;this.ready=true;this.catalog();}
    catch(error){if(this.root!==root)return;this.panel.replaceChildren(el('p','',error.message),this.button('Abrir recetario rápido',()=>{this.close();this.house.api.menu('recipes');}),this.button('Volver a casa',()=>this.close()));}
    finally{clearTimeout(timeout);}
  }
  catalog(){
    this.cancelGesture();this.game=null;this.ticket=null;this.applied=false;this.resultShown=false;this.savedModel=null;this.signature='';this.title.textContent='Nuestra cocina';this.root.dataset.view='catalog';this.panel.replaceChildren();
    const data=this.api.snapshot();
    if(!data.ok){this.panel.append(el('p','',data.message),this.button('Volver a casa',()=>this.close()));return;}
    if(data.active&&data.active.status!=='served'){
      this.panel.append(el('h2','','Una preparación pendiente'),el('p','','Puedes continuar donde lo dejaste. La despensa todavía no se ha descontado.'),this.button('Retomar preparación',()=>this.resumeTicket(data.active)),this.button('Descartar preparación',()=>{const r=this.api.abandon(data.active.id);if(r.ok)this.catalog();else this.message(r.message);}),this.button('Volver a casa',()=>this.close()));return;
    }
    const gallery=el('div','ck-dishes');gallery.setAttribute('role','group');gallery.setAttribute('aria-label','Elige uno de los tres platos');this.cards=[];
    for(const [id,dish] of Object.entries(DISHES)){
      const b=this.button('',()=>{this.selected=id;this.selection(data);});b.dataset.dish=id;const preview=el('canvas');preview.width=120;preview.height=120;this.renderer.preview(preview,dish.plate);b.append(preview,el('strong','',dish.name),el('small','',data.bests[id]?data.bests[id].quality+' · '+data.bests[id].score+'/1000':'Cuatro pasos'));gallery.append(b);this.cards.push(b);
    }
    this.detail=el('p','ck-detail');this.practice=false;const practice=el('label','ck-practice'),checkbox=el('input');checkbox.type='checkbox';checkbox.onchange=()=>{this.practice=checkbox.checked;};practice.append(checkbox,document.createTextNode('Ensayo gratis · sin ingredientes ni alimentación'));
    const actions=el('div','ck-actions');actions.append(this.button('Empezar receta',()=>this.start()),this.button('Despensa',()=>this.pantry()),this.button('Recetario rápido',()=>{this.close();this.house.api.menu('recipes');}));this.panel.append(gallery,this.detail,practice,actions);this.notice=el('p','ck-notice');this.notice.setAttribute('role','status');this.panel.append(this.notice);this.selection(data);
  }
  selection(data){for(const b of this.cards)b.setAttribute('aria-pressed',String(b.dataset.dish===this.selected));const d=DISHES[this.selected],r=data.recipes.find(r=>r.id===this.selected);this.detail.textContent=Object.entries(d.needs).map(([k,n])=>FOOD_NAMES[k]+' ×'+n).join(' · ')+' · '+d.minutes+' min del mundo · '+d.xp+' XP'+(r?.missing.length?' · Faltan ingredientes':'');}
  setMode(easy){this.cancelGesture();this.easy=easy;this.root.dataset.controls=easy?'easy':'gestures';this.mode.textContent=easy?'Fácil':'Gestos';this.mode.setAttribute('aria-pressed',String(easy));this.mode.title=easy?'Control fácil activo. Cambiar a gestos.':'Gestos activos. Cambiar a control fácil.';if(this.game){this.game.easy=easy;this.game.selectedPortion=null;this.signature='';this.changed();}}
  focusKeyboard(){if(matchMedia('(pointer: fine)').matches)this.canvas.focus({preventScroll:true});}
  primeHeat(){if(this.easy&&this.game.active()&&this.game.step.seconds)this.game.setHeat(.55);}
  start(){const r=this.api.create(this.selected,this.practice);if(!r.ok){this.message(r.message);return;}this.ticket=r.ticket;this.game=new CookingGame(this.selected);this.game.easy=this.easy;this.game.start();this.buildLive();this.persist();}
  resumeTicket(ticket){
    try{this.ticket=ticket;this.selected=ticket.recipe;this.practice=ticket.practice;this.game=ticket.model?CookingGame.restore(ticket.model):new CookingGame(ticket.recipe);this.game.easy=this.easy;if(this.game.state.phase==='ready')this.game.start();this.buildLive();if(this.game.state.phase==='done')this.showResult();else this.pause();}
    catch(error){this.game=null;this.panel.replaceChildren(el('p','',error.message),this.button('Descartar preparación',()=>{const r=this.api.abandon(ticket.id);if(r.ok)this.catalog();}));}
  }
  buildLive(){
    this.title.textContent=DISHES[this.selected].name;this.root.dataset.view='playing';this.panel.replaceChildren();this.signature='';this.quarter=0;
    const row=el('div','ck-step-head');this.stepLabel=el('strong');this.timer=el('span');row.append(this.stepLabel,this.timer);this.tip=el('p','ck-tip');this.progress=el('progress');this.progress.max=1;this.progress.setAttribute('aria-label','Progreso del paso de cocina');
    this.heatBox=el('label','ck-heat');this.heatText=el('span');this.heat=el('input');this.heat.type='range';this.heat.min=0;this.heat.max=100;this.heat.value=0;this.heat.setAttribute('aria-label','Potencia del fuego');this.heat.addEventListener('input',()=>{this.game.setHeat(Number(this.heat.value)/100);this.changed();});this.heatBox.append(this.heatText,this.heat);
    const slot=el('div','ck-heat-slot');this.controlHint=el('p','ck-control-hint');slot.append(this.heatBox,this.controlHint);
    const actions=el('div','ck-actions');this.action=this.button('',()=>this.accessibleAction());this.next=this.button('Siguiente paso',()=>this.nextStep());this.retry=this.button('Repetir paso',()=>{this.cancelGesture();this.quarter=0;this.game.retry();this.primeHeat();this.changed();this.persist();});actions.append(this.action,this.next,this.retry);
    this.notice=el('p','ck-notice');this.notice.setAttribute('role','status');this.panel.append(row,this.tip,this.progress,slot,actions,this.notice);this.changed();this.focusKeyboard();
  }
  accessibleAction(){
    if(!this.game||this.game.state.paused)return;if(this.game.state.phase==='stepDone'){this.nextStep();return;}const s=this.game.state,step=this.game.step;
    if(step.kind==='cut')this.game.cut();else if(step.kind==='mix'&&s.eggs<2)this.game.crack();else if(step.kind==='plate')this.game.plate([0,1,2].find(i=>!s.plated.includes(i)));else if(step.flip)this.game.flip();else if(step.drain)this.game.drain();else if(step.turns)this.game.stirQuarter();
    this.changed();this.persist();
  }
  nextStep(){if(this.game?.next()){this.cancelGesture();this.quarter=0;this.primeHeat();this.persist();if(this.game.state.phase==='done')this.showResult();else this.changed();}}
  changed(immediate=true){this.paintDirty=true;this.refreshHUD(performance.now(),immediate);}
  refreshHUD(now,immediate=false){
    if(!this.game||this.resultShown)return;const s=this.game.state,step=this.game.step,done=s.phase==='stepDone';
    if(s.phase==='done'){this.showResult();return;}
    const signature=s.step+':'+s.phase;
    if(!immediate&&signature===this.signature&&now-this.lastHUD<100)return;this.lastHUD=now;
    if(signature!==this.signature){this.signature=signature;this.stepLabel.textContent='Paso '+(s.step+1)+'/4 · '+step.name;this.tip.textContent=this.easy?({cut:'Toca la comida una vez por corte.',mix:'Toca los huevos y después mantén el dedo sobre el cuenco.',wash:'Mantén el dedo sobre el agua para lavar el arroz.',plate:'Toca un ingrediente y después el centro del plato.',pan:'Fuego medio: 55%. Toca la tortilla cuando esté cuajada.',boil:'Fuego medio: 55%. Toca el colador al estar lista.',sauce:'Mantén el dedo sobre la sartén para remover.',saute:'Mantén el dedo sobre la sartén para remover.'})[step.kind]:step.tip;this.next.textContent=s.step===3?'Ver mi plato':'Siguiente paso';}
    set(this.timer,'textContent',Math.floor(s.elapsed)+' s');set(this.next,'hidden',!done);set(this.action,'hidden',done);set(this.heatBox,'hidden',!step.seconds||done);set(this.retry,'hidden',!done&&s.stepTime<1);
    set(this.controlHint,'hidden',!!step.seconds&&!done);set(this.controlHint,'textContent',done?'Paso terminado. Continúa cuando quieras.':this.easy?'Control fácil · También puedes usar los botones.':'Control con gestos · También puedes usar los botones.');
    const progress=step.kind==='cut'?s.cuts.length/step.cuts:step.kind==='mix'?s.eggs<2?s.eggs/5:.4+clamp(s.turns/step.turns)*.6:step.kind==='wash'?clamp(s.turns/step.turns):step.kind==='plate'?s.plated.length/3:clamp(s.cooked/step.seconds);
    set(this.progress,'value',Math.round(progress*1000)/1000);set(this.heat,'value',String(Math.round(s.heat*100)));set(this.heatText,'textContent','Fuego '+Math.round(s.heat*100)+'% · '+(s.temperature>.73?'demasiado alto':s.temperature>=.32?'cocinando':'calentando'));
    let action,disabled=false;
    if(step.kind==='cut')action='Cortar siguiente marca';else if(step.kind==='mix')action=s.eggs<2?'Cascar un huevo':'Batir ¼ de vuelta';else if(step.kind==='plate')action='Colocar siguiente alimento';else if(step.flip){action=s.flipped?'Tortilla volteada':'Dar la vuelta';disabled=s.flipped||s.cooked<7;}else if(step.drain){action='Escurrir la pasta';disabled=s.cooked<step.seconds;}else action=step.kind==='wash'?'Lavar ¼ de vuelta':'Remover ¼ de vuelta';
    set(this.action,'disabled',disabled);set(this.action,'textContent',action);
    let hint=s.feedback;
    if(!hint&&step.kind==='cut')hint=s.cuts.length+' de '+step.cuts+' cortes · '+(this.easy?'Toca la comida.':'Desliza y levanta el dedo.');
    if(!hint&&step.turns&&!(step.kind==='mix'&&s.eggs<2))hint=Math.min(step.turns,Math.floor(s.turns*4)/4)+' de '+step.turns+' vueltas · '+(this.easy?'Mantén pulsado.':'En cualquier sentido.')+(step.seconds?' Fuego medio: 55%.':'');
    if(!hint&&step.kind==='plate')hint=s.plated.length+' de 3 ingredientes · '+(this.easy?'Toca ingrediente y después plato.':'Coge arriba y suelta en el plato.');
    if(!hint&&step.seconds)hint=s.cooked>=step.seconds?(step.flip&&!s.flipped?'Desliza hacia arriba para dar la vuelta.':step.drain&&!s.drained?'Lleva la olla hasta el colador.':step.turns&&s.turns<step.turns?'Falta remover la preparación.':''):'Fuego medio recomendado: 55%.';
    this.message(hint||'');
  }
  message(text){if(this.notice)set(this.notice,'textContent',text);}
  cancelGesture(){
    const id=this.pointerId;this.pointerId=null;this.pointerBounds=null;this.game?.cancelGesture();this.paintDirty=true;
    if(id!=null&&this.canvas?.hasPointerCapture(id))this.canvas.releasePointerCapture(id);
    this.viewport?.endGesture();
  }
  key(e){
    if(!this.open||document.getElementById('dm-life-modal'))return;
    if(e.target===this.heat&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)){
      e.preventDefault();e.stopImmediatePropagation();const s=this.game.state,next=e.key==='Home'?0:e.key==='End'?1:s.heat+(['ArrowRight','ArrowUp'].includes(e.key)?.01:-.01);this.game.setHeat(next);this.changed();return;
    }
    if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
    if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(this.game&&!this.resultShown)this.pause();else this.close();return;}
    if(e.key.startsWith('Arrow')||['w','a','s','d'].includes(e.key)){
      e.preventDefault();e.stopImmediatePropagation();
      if(this.game?.active()&&this.game.step.turns&&e.key.startsWith('Arrow')&&!e.repeat){const order=['ArrowRight','ArrowDown','ArrowLeft','ArrowUp'];if(order[(this.quarter||0)%4]===e.key){this.quarter=(this.quarter||0)+1;this.game.stirQuarter();this.changed();}}return;
    }
    if(!this.game||this.game.state.paused||this.resultShown||e.target.closest('button'))return;
    if([' ','Enter'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)this.accessibleAction();}
  }
  pause(){
    if(!this.game||this.resultShown)return;this.cancelGesture();this.game.pause();this.changed();this.persist();if(this.pauseBox)return;
    this.pauseBox=el('section','ck-paused');this.pauseBox.setAttribute('aria-label','Cocina en pausa');this.pauseBox.append(el('h2','','La cocina está en pausa'),el('p','','Los ingredientes siguen en tu despensa. El fuego y los segundos están detenidos.'),this.button('Continuar cocinando',()=>{this.game.resume();this.pauseBox.remove();this.pauseBox=null;this.changed();this.persist();this.focusKeyboard();}),this.button('Salir y conservar la preparación',()=>this.close()));this.root.append(this.pauseBox);
  }
  pantry(){if(this.game)this.pause();this.close();this.house.api.menu('pantry');}
  showResult(){
    if(this.resultShown)return;this.cancelGesture();this.resultShown=true;this.persist();this.root.dataset.view='result';const r=this.game.result();this.panel.replaceChildren(el('h2','',r.quality+' · '+r.score+'/1000'),el('p','',DISHES[this.selected].name+' · Cuatro pasos completados.'));
    const serve=this.button(this.practice?'Guardar ensayo':'Servir y comer',()=>{this.persist();const response=this.api.act(this.selected,this.ticket.id,r);this.message(response.message);if(response.ok){this.applied=true;serve.disabled=true;serve.textContent=this.practice?'Ensayo guardado':'Plato servido';}});serve.disabled=!r.effort;
    this.panel.append(serve,el('small','',this.practice?'El ensayo no consume ingredientes ni alimenta al personaje.':'Servir consume los ingredientes y aplica una vez tu receta habitual: '+DISHES[this.selected].minutes+' min del mundo y '+DISHES[this.selected].xp+' XP de cocina.'),this.button('Elegir otra receta',()=>{if(!this.applied){const response=this.api.abandon(this.ticket.id);if(!response.ok){this.message(response.message);return;}}this.catalog();}),this.button('Despensa',()=>this.pantry()),this.button('Volver a casa',()=>this.close()));this.notice=el('p','ck-notice');this.notice.setAttribute('role','status');this.panel.append(this.notice);serve.focus({preventScroll:true});
  }
  update(dt,now){
    if(!this.open)return;if(!this.api.open||this.role!==this.api.role){this.close();return;}if(!this.ready)return;
    if(this.game?.active()&&!this.resultShown){this.game.update(dt);this.refreshHUD(now);if(!this.game.active()){this.paintDirty=true;this.persist();}else if(now-this.lastSaved>1000)this.persist();}
    // Keep sampling gestures and simulation at the house frame rate. Painting
    // needs at most 30 fps, and static/paused scenes need no repeated redraws.
    const animated=this.game?.active()&&(this.game.step.seconds||this.easy&&this.game.pointer&&this.game.step.turns);
    if((this.paintDirty||animated)&&now-this.lastDraw>=1000/30){this.renderer.draw(this.game,this.role,this.house.api.snapshot()?.time);this.lastDraw=now;this.paintDirty=false;}
  }
  persist(){
    if(!this.game||!this.ticket||this.applied)return;this.lastSaved=performance.now();const model=this.game.snapshot(),signature=this.ticket.id+':'+JSON.stringify(model);if(signature===this.savedModel)return;
    const r=this.api.saveRun(this.ticket.id,model);if(r.ok)this.savedModel=signature;else this.message(r.message);
  }
  close(){if(!this.root)return;this.cancelGesture();if(this.game){this.game.pause();this.persist();}this.abort.abort();this.renderer?.destroy();this.root.remove();this.viewport?.destroy();this.viewport=null;this.root=null;this.pauseBox=null;this.ready=false;this.game=null;this.ticket=null;this.renderer=null;this.applied=false;this.resultShown=false;document.body.classList.remove('dm-kitchen-active');if(matchMedia('(pointer: fine)').matches)this.house.canvas?.focus({preventScroll:true});}
  snapshot(){return this.open?{ready:!!this.ready,role:this.role,controls:this.easy?'easy':'gestures',selectedPortion:this.game?.selectedPortion??null,recipe:this.selected,phase:this.game?.state.phase||'catalog',paused:!!this.game?.state.paused,model:this.game?.snapshot()||null,result:this.game?.result()||null,applied:!!this.applied}:null;}
}
