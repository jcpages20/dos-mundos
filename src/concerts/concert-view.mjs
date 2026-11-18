import {ConcertRenderer,AUDIENCE} from './concert-renderer.mjs';
import {ConcertStore,encodeConcert,presenceLabel,readPresence} from './concert-model.mjs';
import {trackURL,embedURL} from './catalogue.mjs';
import {element,link} from './concert-ui.mjs';
import {canStand,distance,findPath,moveSafely} from '../engine/navigation.mjs';
const MAP={width:960,height:960,collisions:[{x:0,y:0,w:960,h:372},{x:0,y:0,w:100,h:960},{x:860,y:0,w:100,h:960},{x:0,y:934,w:960,h:26},{x:134,y:792,w:161,h:35},{x:675,y:792,w:161,h:35},...AUDIENCE.map(p=>({x:p.x-13,y:p.y-10,w:26,h:16}))]};
export class ConcertView{
  constructor(parent,artist,bill){this.parent=parent;this.api=parent.api;this.artist=artist;this.bill=bill;this.abort=new AbortController();this.actor={x:parent.actor.role==='jc'?458:507,y:600,face:'up',pose:'stand',role:parent.actor.role,moving:false};this.path=[];this.held=new Set();this.store=new ConcertStore({name:parent.data.name,role:this.actor.role});}
  button(text,fn,css=''){const b=element('button',css,text);b.type='button';b.addEventListener('click',fn,{signal:this.abort.signal});return b;}
  async mount(){
    this.previousFocus=document.activeElement;this.previous=[...this.parent.root.children].map(node=>({node,inert:node.inert}));for(const p of this.previous)p.node.inert=true;
    this.root=element('section','dm-concert-view');this.root.id='dm-concert-view';this.root.style.setProperty('--concert-color',this.artist.color);this.root.setAttribute('role','dialog');this.root.setAttribute('aria-modal','true');this.root.setAttribute('aria-label','Concierto de '+this.artist.name);
    const header=element('header','dm-concert-head'),name=element('div');name.append(element('small','','LAS NOCHES DEL RETIRO'),element('h2','',this.artist.name),element('p','',this.artist.style+' · entrada libre'));
    this.exit=this.button('Volver al parque',()=>this.parent.closeConcert(),'dm-concert-exit');header.append(name,this.exit);
    const stage=element('div','dm-concert-stage');this.canvas=element('canvas');this.canvas.tabIndex=0;this.canvas.setAttribute('aria-label','Escenario y público. Toca el suelo para caminar o usa las flechas.');stage.append(this.canvas);
    this.status=element('p','dm-concert-status','Preparando los instrumentos…');this.status.setAttribute('role','status');
    const actions=element('nav','dm-concert-actions');actions.setAttribute('aria-label','Disfrutar del concierto');this.dance=this.button('Bailar',()=>this.pose(this.actor.pose==='dance'?'stand':'dance'));this.dance.setAttribute('aria-pressed','false');
    this.music=this.button('Escuchar canción',()=>this.openMusic(),'dm-concert-listen');this.memory=this.button('Guardar mi recuerdo',()=>this.remember());
    actions.append(this.music,this.dance,this.button('Aplaudir',()=>this.pose('clap')),this.button('Pedir otra',()=>{this.encore=true;this.pose('encore');}),this.memory);
    this.note=element('p','dm-concert-note','Toca el suelo para acercarte · El sonido se inicia desde Spotify');this.root.append(header,stage,this.status,actions,this.note);this.parent.root.append(this.root);this.exit.focus({preventScroll:true});
    this.renderer=new ConcertRenderer(this.canvas,this.artist);
    this.canvas.addEventListener('pointerdown',e=>{if(!this.ready||this.panel)return;e.preventDefault();this.canvas.focus({preventScroll:true});const p=this.renderer.point(e);if(!canStand(p,MAP)){this.feedback('Hay sitio libre frente al escenario y entre el público.');return;}this.actor.pose='stand';this.dance.setAttribute('aria-pressed','false');this.dance.textContent='Bailar';this.held.clear();this.path=findPath(this.actor,p,MAP)||[];},{signal:this.abort.signal});
    document.addEventListener('keydown',e=>this.key(e,true),{capture:true,signal:this.abort.signal});document.addEventListener('keyup',e=>this.key(e,false),{capture:true,signal:this.abort.signal});
    window.addEventListener('blur',()=>this.held.clear(),{signal:this.abort.signal});document.addEventListener('visibilitychange',()=>{this.held.clear();this.path=[];},{signal:this.abort.signal});
    let timeout;try{await Promise.race([this.renderer.load(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('El escenario tarda en cargar. Vuelve a intentarlo desde el quiosco.')),18000);})]);}finally{clearTimeout(timeout);}
    if(this.disposed)return;this.ready=true;this.feedback('Estás frente al escenario. Camina entre el público, baila o elige la canción.');
  }
  feedback(message){this.status.textContent=message;}
  pose(pose){if(!this.ready)return;this.path=[];this.held.clear();this.actor.pose=pose;this.actor.face='up';this.poseUntil=pose==='clap'||pose==='encore'?performance.now()+3500:0;this.dance.textContent=pose==='dance'?'Dejar de bailar':'Bailar';this.dance.setAttribute('aria-pressed',String(pose==='dance'));this.feedback({stand:'Un momento para escuchar entre los árboles.',dance:'Bailando frente al escenario.',clap:'Los aplausos recorren el quiosco.',encore:'¡Una más! El escenario se ilumina para el bis.'}[pose]);}
  update(dt,now,data){
    if(this.disposed||!this.ready)return;if(data.role!==this.actor.role||data.name!==this.store.identity.name){this.parent.closeConcert();return;}
    if(this.poseUntil&&now>this.poseUntil){this.actor.pose='stand';this.poseUntil=0;}
    const before={x:this.actor.x,y:this.actor.y};
    if(!this.panel){let dx=Number(this.held.has('right'))-Number(this.held.has('left')),dy=Number(this.held.has('down'))-Number(this.held.has('up'));if(dx||dy){const l=Math.hypot(dx,dy);Object.assign(this.actor,moveSafely(this.actor,dx/l*dt*170,dy/l*dt*170,MAP));this.actor.face=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';}
      else if(this.path.length){const p=this.path[0],len=distance(this.actor,p),step=Math.min(len,dt*210);if(len>.1){dx=(p.x-this.actor.x)/len;dy=(p.y-this.actor.y)/len;Object.assign(this.actor,moveSafely(this.actor,dx*step,dy*step,MAP));this.actor.face=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';}if(distance(this.actor,p)<1.5){Object.assign(this.actor,p);this.path.shift();}else if(distance(before,this.actor)<.01)this.path=[];}}
    this.actor.moving=distance(before,this.actor)>.05;
    this.api.position({...encodeConcert(this.actor),place:presenceLabel(this.bill.edition,this.artist.id,this.actor.pose)});
    this.peer=readPresence(data.peer,this.bill.edition,this.artist.id);if(this.peer)this.peer.role=this.actor.role==='jc'?'gabi':'jc';
    const label=this.peer?' · '+(this.peer.role==='jc'?'JC':'Gabi')+' está aquí':' · Puedes venir por tu cuenta';if(this.note.dataset.party!==label){this.note.dataset.party=label;this.note.textContent='Toca el suelo para caminar'+label;}
    if(!this.lastDraw||now-this.lastDraw>=1000/(this.renderer.reduced?12:30)){this.renderer.render(this.actor,this.peer,now,this.encore);this.lastDraw=now;}
  }
  remember(){
    if(!this.ready)return;const peer=readPresence(this.api.snapshot().peer,this.bill.edition,this.artist.id),result=this.store.remember(this.bill.edition,this.artist,peer);
    this.feedback(result.ok?(result.already?'Este concierto ya está en tu álbum.':'Recuerdo guardado: '+this.artist.name+' en el Retiro'+(peer?' con '+(this.actor.role==='jc'?'Gabi':'JC'):'')+'. Puedes verlo en vuestro álbum.'):result.message);if(result.ok)this.memory.textContent='Recuerdo guardado';
  }
  openMusic(){
    if(!this.ready)return;this.closeMusic(false);this.path=[];this.held.clear();this.panel=element('section','dm-concert-player');this.panel.setAttribute('role','dialog');this.panel.setAttribute('aria-label','Música de '+this.artist.name);
    const close=this.button('Cerrar música',()=>this.closeMusic());this.panel.append(element('h3','',this.artist.name),close,element('p','','Pulsa reproducir en Spotify para escuchar. Spotify decide si ofrece la canción completa o una muestra.'));
    for(const track of this.artist.tracks){if(this.artist.tracks.length>1)this.panel.append(this.button('Elegir '+track.title,()=>this.embed(track)));this.panel.append(link('Abrir '+track.title+' en Spotify ↗',trackURL(track)));}
    this.playerSlot=element('div','dm-concert-player-slot');this.panel.append(this.playerSlot);this.root.append(this.panel);this.embed(this.artist.tracks[0]);close.focus({preventScroll:true});
  }
  embed(track){
    if(!this.panel)return;document.querySelector('.dm381-radio-stop')?.click();this.playerSlot.replaceChildren();const frame=element('iframe');frame.title='Spotify · '+track.title;frame.src=embedURL(track);frame.width='100%';frame.height='152';frame.allow='autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';frame.referrerPolicy='strict-origin-when-cross-origin';this.playerSlot.append(frame);this.playerSlot.append(link('Si no carga, abrir en Spotify ↗',trackURL(track)));
  }
  closeMusic(focus=true){this.panel?.remove();this.panel=null;this.playerSlot=null;if(focus)this.music?.focus({preventScroll:true});}
  key(e,on){
    if(!this.root.contains(e.target)||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;const dir={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',a:'left',s:'down',d:'right'}[e.key];
    if(dir&&e.target===this.canvas){e.preventDefault();e.stopImmediatePropagation();if(on){this.path=[];this.pose('stand');this.held.add(dir);}else this.held.delete(dir);}
    if(on&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(this.panel)this.closeMusic();else this.parent.closeConcert();}
    if(on&&e.key==='Tab'){const scope=this.panel||this.root,buttons=[...scope.querySelectorAll('button,a[href],canvas,iframe')].filter(x=>!x.disabled&&x.getClientRects().length),first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&e.target===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&e.target===last){e.preventDefault();first.focus();}}
  }
  destroy(){if(this.disposed)return;this.disposed=true;this.closeMusic(false);this.abort.abort();this.renderer?.destroy();this.root?.remove();for(const p of this.previous||[])p.node.inert=p.inert;this.held.clear();this.path=[];}
  snapshot(){return {ready:!!this.ready,artist:this.artist.id,edition:this.bill.edition,role:this.actor.role,position:{x:this.actor.x,y:this.actor.y},pose:this.actor.pose,peer:this.peer||null,walking:!!this.path.length,encore:!!this.encore,music:!!this.panel,memories:this.store.memories(),view:{scale:this.renderer?.scale,offset:this.renderer?.offset}};}
}
