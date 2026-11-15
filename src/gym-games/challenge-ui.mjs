import {GymGame,TYPES,LEVELS,codeFor,parseCode} from './model.mjs';
const node=(tag,cls='',text='')=>{const e=document.createElement(tag);e.className=cls;if(text)e.textContent=text;return e;};
const glyph={left:'←',right:'→',up:'↑',down:'↓'};
export class GymChallengeUI{
  constructor(scene,api){this.scene=scene;this.api=api;this.abort=new AbortController();
    window.addEventListener('keydown',e=>this.key(e,true),{capture:true,signal:this.abort.signal});window.addEventListener('keyup',e=>this.key(e,false),{capture:true,signal:this.abort.signal});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.pause();},{signal:this.abort.signal});window.addEventListener('blur',()=>this.pause(),{signal:this.abort.signal});
    window.addEventListener('orientationchange',()=>this.pause(),{signal:this.abort.signal});window.addEventListener('pagehide',()=>this.pause(),{signal:this.abort.signal});
  }
  get open(){return !!this.root;}
  button(label,fn){const b=node('button','',label);b.type='button';b.addEventListener('click',fn);return b;}
  mount(){
    this.close();this.root=node('section','dm-gym-challenge');this.root.id='dm-gym-challenge';this.root.setAttribute('aria-label','Entrenamiento jugable');this.root.setAttribute('role','region');
    this.scene.root.dataset.challenge='';this.previousOverview=this.scene.renderer.overview;this.scene.renderer.overview=false;this.scene.plan.disabled=true;this.scene.held.clear();this.scene.path=[];this.scene.pending=null;
    this.scene.root.append(this.root);this.savedFocus=document.activeElement;
  }
  openBrief(object,spec=null){
    this.mount();this.object=object;this.type=object?.action||'weights';this.level=spec?.level||'normal';this.seed=spec?.seed??crypto.getRandomValues(new Uint32Array(1))[0]%0x1000000;this.practice=false;this.ticket=null;this.game=null;
    const data=this.api.snapshot();this.root.append(node('h2','',object?TYPES[this.type].name:'Juega el mismo reto'));
    if(data.active&&data.active.status!=='claimed'){
      this.root.append(node('p','','Tienes una sesión interrumpida. Sus segundos están en pausa y todavía no se han aplicado minutos ni XP.'),this.button('Retomar sesión',()=>this.scene.resumeChallenge(data.active)),this.button('Descartar sesión interrumpida',()=>{const r=this.api.abandon(data.active.id);if(r.ok)this.openBrief(object,spec);else this.note(r.message);}));
    }else if(object){
      const copy={weights:'Mantén el botón para levantar. Suelta dentro de la franja verde. La franja cambia en cada repetición: completa ocho.',cardio:'Alterna izquierda y derecha cuando cada nota alcance la línea dorada. El ritmo cambia durante la serie.',silks:'Mira la secuencia y repítela. Después corrige el equilibrio con izquierda/derecha y cierra la figura en el momento preciso.',stretch:'Mantén el botón durante «Inspirar» y suéltalo durante «Soltar». Completa cinco ciclos tranquilos.'};
      this.root.append(node('p','',copy[this.type]));
      const row=node('div','gm-settings'),difficulty=node('select');difficulty.setAttribute('aria-label','Dificultad del reto');
      for(const [id,cfg] of Object.entries(LEVELS)){const option=node('option','',cfg.name);option.value=id;difficulty.append(option);}difficulty.value=this.level;difficulty.onchange=()=>{this.level=difficulty.value;if(this.codeInput)this.codeInput.value=codeFor(this.type,this.level,this.seed);};
      const practice=node('label','gm-practice'),checkbox=node('input');checkbox.type='checkbox';checkbox.onchange=()=>{this.practice=checkbox.checked;};practice.append(checkbox,document.createTextNode('Ensayo gratis · sin minutos ni XP'));row.append(difficulty,practice);this.root.append(row);
      this.root.append(node('small','',TYPES[this.type].minutes+' min del juego al guardar la sesión · '+TYPES[this.type].energy+' de energía necesarios · La puntuación no multiplica los premios.'),this.button('Empezar reto',()=>this.start()));
    }
    const code=node('div','gm-code'),input=node('input');this.codeInput=input;input.type='text';input.autocapitalize='characters';input.spellcheck=false;input.placeholder='ATLAS-T-N-4F2A91';input.setAttribute('aria-label','Código de reto');input.value=object?codeFor(this.type,this.level,this.seed):'';
    code.append(input,this.button('Jugar este código',()=>{const parsed=parseCode(input.value);if(!parsed){this.note('Escribe un código como ATLAS-T-N-4F2A91.');return;}if(this.api.snapshot().active?.status==='playing'){this.note('Retoma o descarta primero la sesión interrumpida.');return;}this.close();this.scene.startChallengeRoute(parsed.type,parsed);}));this.root.append(code);
    this.root.append(this.button('Volver al club',()=>this.close()));this.notice=node('p','gm-notice');this.notice.setAttribute('role','status');this.root.append(this.notice);this.root.querySelector('button')?.focus({preventScroll:true});
    if(!data.ok)this.note(data.message);
  }
  note(text){if(this.notice)this.notice.textContent=text;}
  start(){
    const r=this.api.create(this.type,this.level,this.seed,this.practice);if(!r.ok){this.note(r.message);return;}
    this.ticket=r.ticket;this.game=new GymGame(this.type,this.level,this.seed);this.game.start();this.scene.placeForChallenge(this.object);this.buildControls();this.persist();
  }
  resume(ticket,object){
    this.mount();this.ticket=ticket;this.object=object;this.type=ticket.type;this.level=ticket.level;this.seed=ticket.seed;this.practice=ticket.practice;
    try{this.game=ticket.model?GymGame.restore(ticket.model):new GymGame(ticket.type,ticket.level,ticket.seed);if(this.game.state.phase==='ready')this.game.start();this.game.pause();this.scene.placeForChallenge(object);this.buildControls();this.refresh();}
    catch(error){this.root.append(node('p','',error.message),this.button('Descartar sesión interrumpida',()=>{this.api.abandon(ticket.id);this.close();}));}
  }
  control(label,action){
    const b=node('button','gm-input',label);b.type='button';b.dataset.action=action;
    b.addEventListener('pointerdown',e=>{if(b.disabled)return;e.preventDefault();b.setPointerCapture(e.pointerId);this.input(action,true);});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(type,e=>{e.preventDefault();this.input(action,false);});return b;
  }
  buildControls(){
    this.root.replaceChildren();const head=node('div','gm-live-head');this.title=node('strong','',TYPES[this.type].name);this.progress=node('span');head.append(this.title,this.progress,this.button('Pausa',()=>this.pause()));this.root.append(head);
    this.cue=node('p','gm-cue');this.root.append(this.cue);this.stage=node('canvas','gm-game-canvas');this.stage.width=600;this.stage.height=100;this.stage.setAttribute('role','img');this.root.append(this.stage);
    this.sequence=node('div','gm-sequence');this.root.append(this.sequence);const controls=node('div','gm-live-controls');
    this.arrows=node('div','gm-arrows');for(const key of ['left','up','down','right']){const b=this.control(glyph[key],key);b.setAttribute('aria-label','Movimiento '+{left:'izquierda',up:'arriba',down:'abajo',right:'derecha'}[key]);this.arrows.append(b);}
    this.action=this.control('Mantén y suelta','action');controls.append(this.arrows,this.action);this.root.append(controls);
    this.notice=node('p','gm-notice');this.notice.setAttribute('role','status');this.root.append(this.notice);this.pauseBox=node('div','gm-paused');this.pauseBox.hidden=true;
    this.pauseBox.append(node('strong','','Reto en pausa'),this.button('Continuar reto',()=>{this.game.resume();this.pauseBox.hidden=true;this.persist();}),this.button('Salir y conservar el reto',()=>{this.persist();this.close(false);}));this.root.append(this.pauseBox);this.refresh();
  }
  input(action,on){if(!this.game||this.game.state.phase==='done')return;this.game.input(action,on);this.refresh();if(!on)this.persist();}
  key(e,on){
    if(!this.open||document.getElementById('dm-life-modal')||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
    if(e.key==='Escape'&&on){e.preventDefault();e.stopImmediatePropagation();if(this.game?.state.phase==='done')this.close();else if(this.game)this.pause();else this.close();return;}
    if(!this.game)return;const button=e.target.closest?.('button');
    if(button&&!button.dataset.action&&[' ','Enter'].includes(e.key))return;
    if(this.game.state.paused||this.game.state.phase==='done'){if(e.key.startsWith('Arrow'))e.stopImmediatePropagation();return;}
    const action=[' ','Enter'].includes(e.key)&&button?.dataset.action?button.dataset.action:{ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',a:'left',d:'right',w:'up',s:'down',' ':'action',Enter:'action'}[e.key];
    if(action){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)this.input(action,on);}
  }
  pause(){if(!this.game||this.game.state.phase==='done')return;this.game.pause();if(this.pauseBox)this.pauseBox.hidden=false;this.persist();}
  update(dt,now){
    if(!this.open||!this.game)return;if(this.api.role!==this.ticket.role){this.close(false);this.scene.api.exit();return;}
    if(this.game.state.phase!=='done')this.game.update(dt);
    if(this.game.state.phase==='done'&&!this.resultShown){this.showResult();return;}
    if(!this.resultShown)this.refresh();if(now-(this.lastSaved||0)>1000){this.persist();this.lastSaved=now;}
  }
  persist(){if(!this.ticket||!this.game||this.applied)return;const r=this.api.saveRun(this.ticket.id,this.game.snapshot());if(!r.ok)this.note(r.message);}
  refresh(){
    if(!this.game||this.resultShown)return;const s=this.game.state,cfg=LEVELS[s.level];this.pauseBox.hidden=!s.paused;
    this.progress.textContent=Math.floor(s.elapsed)+' s · Combo '+s.combo;
    const descriptions={weights:'Mantén para levantar; suelta dentro del verde. '+Math.min(s.rep+1,8)+'/8',cardio:'Pulsa el lado de la nota al cruzar la línea dorada.',preview:'Mira y memoriza la secuencia.',sequence:'Repite la secuencia con las flechas.',balance:'Mantén el punto cerca del centro: corrige con izquierda y derecha.',figure:'Cierra la figura cuando el indicador esté en la zona dorada.',stretch:s.elapsed%4<2?'Inspirar · mantén el botón':'Soltar · suelta el botón'};
    this.cue.textContent=descriptions[s.type==='silks'?s.phase:s.type];this.action.hidden=s.type==='cardio'||s.type==='silks'&&s.phase!=='figure';this.arrows.hidden=!(s.type==='cardio'||s.type==='silks'&&['sequence','balance'].includes(s.phase));
    this.action.textContent=s.type==='silks'?'Cerrar figura':s.type==='stretch'?'Mantén al inspirar':'Levantar · mantén y suelta';
    for(const b of this.arrows.children)b.hidden=(s.type==='cardio'||s.phase==='balance')&&!['left','right'].includes(b.dataset.action);
    const signature=s.phase+':'+s.sequence+':'+s.index+':'+s.level;if(this.seqSignature!==signature){this.seqSignature=signature;this.sequence.replaceChildren();
      if(s.type==='silks'&&['preview','sequence'].includes(s.phase)){s.sequences[s.sequence]?.forEach((d,i)=>{const known=s.phase==='preview'||s.level==='suave'||i<s.index;const item=node('span',i===s.index?'current':'',known?glyph[d]:'?');this.sequence.append(item);});}}
    this.note(s.feedback);this.drawTrack(s,cfg);this.stage.setAttribute('aria-label',this.cue.textContent);
  }
  drawTrack(s,cfg){
    const g=this.stage.getContext('2d'),w=this.stage.width,h=this.stage.height;g.clearRect(0,0,w,h);g.fillStyle='#1c3438';g.fillRect(0,0,w,h);g.font='bold 20px system-ui';g.textAlign='center';
    if(s.type==='cardio'){
      g.strokeStyle='#e8ca88';g.lineWidth=4;g.beginPath();g.moveTo(110,8);g.lineTo(110,h-8);g.stroke();
      for(const n of s.notes){const x=110+(n.at-s.elapsed)*150;if(x<-30||x>w+30)continue;const y=n.side==='left'?29:72;g.fillStyle=n.result==='miss'?'#886563':n.result?'#b9d1a1':n.side==='left'?'#b0d4cc':'#e2bc91';g.beginPath();g.arc(x,y,18,0,Math.PI*2);g.fill();g.fillStyle='#213d41';g.fillText(n.side==='left'?'←':'→',x,y+7);}
    }else if(s.type==='silks'&&['preview','sequence'].includes(s.phase)){
      g.fillStyle='#e8d0a4';g.fillText(s.phase==='preview'?'Secuencia '+(s.sequence+1)+' · observa':'Movimiento '+(s.index+1),w/2,59);
    }else{
      const balance=s.type==='silks'&&s.phase==='balance';const center=s.type==='weights'?(s.targets[s.rep]||.7):balance ? .5 : s.type==='silks' ? .72 : .5;
      const band=s.type==='weights'?cfg.window*.5:balance?cfg.band/2:s.type==='silks'?cfg.window:.13;
      g.fillStyle='#4a695c';g.fillRect(24+(center-band)*(w-48),20,band*2*(w-48),60);g.fillStyle='#d9c28d';g.fillRect(24+center*(w-48)-2,20,4,60);
      const value=s.type==='weights'?s.power:balance?(s.balance+1)/2:s.type==='silks'?this.game.needle():(Math.sin(s.elapsed*Math.PI/2-Math.PI/2)+1)/2;
      g.fillStyle='#fff1cf';g.fillRect(20+Math.min(1,Math.max(0,value))*(w-48),11,8,78);
      if(s.type==='stretch'){g.fillStyle='#e8d0a4';g.fillText(s.elapsed%4<2?'INSPIRAR':'SOLTAR',w/2,61);}
    }
  }
  showResult(){
    this.resultShown=true;this.persist();const r=this.game.result();this.root.replaceChildren();this.root.append(node('h2','',r.medal+' · '+r.score+'/1000'),node('p','',r.effort?'Combo máximo '+r.maxCombo+' · '+(this.type==='silks'?'Equilibrio '+r.balanced+'%':this.type==='stretch'?'Coordinación '+r.aligned+'%':r.hits+' aciertos de '+r.attempts):'Faltaron movimientos para completar la sesión. Puedes volver a intentarlo.'));
    const reward=this.button(this.practice?'Guardar ensayo':'Guardar sesión y marca',()=>{this.persist();const result=this.api.act(this.type,this.ticket.id,r);this.note(result.message);if(result.ok){this.applied=true;reward.disabled=true;reward.textContent='Guardado';}});reward.disabled=!r.effort;this.root.append(reward);
    this.root.append(node('small','',this.practice?'Ensayo: no cambia energía, minutos ni XP.':'Guardar aplica una sola vez la sesión habitual de '+TYPES[this.type].minutes+' min. El resultado conserva las mismas recompensas de entrenamiento.'));
    const text=node('input');text.readOnly=true;text.value=codeFor(this.type,this.level,this.seed);text.setAttribute('aria-label','Código para compartir el reto');this.root.append(text,this.button('Copiar código y puntuación',async()=>{const message=text.value+' · '+r.score+'/1000';try{await navigator.clipboard.writeText(message);this.note('Código copiado. Puedes pasárselo a Gabi o JC para jugar el mismo reto.');}catch{text.focus();text.select();this.note('Selecciona y copia el código para compartir el mismo reto.');}}));
    this.root.append(this.button('Volver a intentarlo',()=>{const object=this.object;this.api.abandon(this.ticket.id);this.close(false);this.openBrief(object,{level:this.level,seed:this.seed});}),this.button('Volver al club',()=>{if(!this.applied)this.api.abandon(this.ticket.id);this.close(false);}));
    this.notice=node('p','gm-notice');this.notice.setAttribute('role','status');this.root.append(this.notice);reward.focus({preventScroll:true});
  }
  records(){
    this.mount();const d=this.api.snapshot();this.root.append(node('h2','','Tus marcas de Atlas'));const rows=Object.entries(d.bests);
    if(!rows.length)this.root.append(node('p','','Completa un reto y guarda la sesión para estrenar tus marcas personales. Los ensayos se conservan en el historial, por separado.'));
    for(const [key,r] of rows){if(!r||!TYPES[r.type]||!LEVELS[r.level])continue;const card=node('article','gm-record');card.append(node('strong','',TYPES[r.type].name+' · '+LEVELS[r.level].name),node('span','',r.score+'/1000 · '+r.medal),node('small','',codeFor(r.type,r.level,r.seed)));this.root.append(card);}
    if(d.history.length){this.root.append(node('h3','','Últimas sesiones y ensayos'));for(const r of d.history.filter(r=>r&&TYPES[r.type]&&LEVELS[r.level]).slice(0,8)){const card=node('article','gm-record');card.append(node('strong','',(r.practice?'Ensayo':'Sesión')+' · '+TYPES[r.type].name),node('small','',r.score+'/1000 · '+LEVELS[r.level].name+' · '+new Date(r.at).toLocaleDateString('es-ES')));this.root.append(card);}}
    this.root.append(this.button('Jugar un código',()=>this.openBrief(null)),this.button('Volver al club',()=>this.close()));
  }
  visual(){return this.game&&this.game.state.phase!=='ready'?{type:this.type,object:this.object,started:0,duration:60000,challenge:this.game.state}:null;}
  close(save=true){
    if(!this.root)return;if(save&&this.game){this.game.pause();this.persist();}this.scene.restoreAfterChallenge();this.root.remove();this.root=null;delete this.scene.root.dataset.challenge;this.scene.plan.disabled=false;this.scene.renderer.overview=!!this.previousOverview;
    this.game=null;this.ticket=null;this.resultShown=false;this.applied=false;this.seqSignature='';this.scene.canvas.focus({preventScroll:true});
  }
  destroy(){this.close();this.abort.abort();}
  snapshot(){return this.root?{type:this.type||null,code:this.game?codeFor(this.type,this.level,this.seed):null,phase:this.game?.state.phase||'briefing',paused:!!this.game?.state.paused,model:this.game?.snapshot()||null,result:this.game?.result()||null,applied:!!this.applied}:null;}
}
