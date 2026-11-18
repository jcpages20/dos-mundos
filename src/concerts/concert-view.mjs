import {ConcertRenderer,AUDIENCE} from './concert-renderer.mjs?conciertos=17';
import {ConcertStore,encodeConcert,presenceLabel,readPresence} from './concert-model.mjs?conciertos=17';
import {trackURL} from './catalogue.mjs?conciertos=17';
import {Performance} from './performance.mjs';
import {SpotifyPlayer} from './spotify-player.mjs';
import {ConcertSound} from './concert-sound.mjs';
import {element,link} from './concert-ui.mjs?conciertos=17';
import {canStand,distance,findPath,moveSafely} from '../engine/navigation.mjs';
const MAP={width:960,height:960,collisions:[{x:0,y:0,w:960,h:372},{x:0,y:0,w:100,h:960},{x:860,y:0,w:100,h:960},{x:0,y:934,w:960,h:26},{x:134,y:792,w:161,h:35},{x:675,y:792,w:161,h:35},...AUDIENCE.map(p=>({x:p.x-13,y:p.y-10,w:26,h:16}))]};
export class ConcertView{
  constructor(parent,artist,bill){this.parent=parent;this.api=parent.api;this.artist=artist;this.bill=bill;this.abort=new AbortController();this.actor={x:parent.actor.role==='jc'?458:507,y:600,face:'up',pose:'stand',role:parent.actor.role,moving:false};this.path=[];this.held=new Set();this.store=new ConcertStore({name:parent.data.name,role:this.actor.role});this.show=new Performance();this.sound=new ConcertSound();this.trackIndex=0;}
  button(text,fn,css=''){const b=element('button',css,text);b.type='button';b.addEventListener('click',fn,{signal:this.abort.signal});return b;}
  async mount(){
    this.previousFocus=document.activeElement;this.previous=[...this.parent.root.children].map(node=>({node,inert:node.inert}));for(const p of this.previous)p.node.inert=true;
    this.root=element('section','dm-concert-view');this.root.id='dm-concert-view';this.root.style.setProperty('--concert-color',this.artist.color);this.root.setAttribute('role','dialog');this.root.setAttribute('aria-modal','true');this.root.setAttribute('aria-label','Concierto de '+this.artist.name);
    const header=element('header','dm-concert-head'),name=element('div');name.append(element('small','','LAS NOCHES DEL RETIRO'),element('h2','',this.artist.name),element('p','',this.artist.style+' · entrada libre'));
    this.exit=this.button('Volver al parque',()=>this.parent.closeConcert(),'dm-concert-exit');header.append(name,this.exit);
    const stage=element('div','dm-concert-stage');this.canvas=element('canvas');this.canvas.tabIndex=0;this.canvas.setAttribute('aria-label','Escenario y público. Toca el suelo para caminar o usa las flechas.');stage.append(this.canvas);
    this.status=element('p','dm-concert-status','Preparando los instrumentos…');this.status.setAttribute('role','status');
    const actions=element('nav','dm-concert-actions');actions.setAttribute('aria-label','Disfrutar del concierto');this.dance=this.button('Bailar',()=>this.pose(this.actor.pose==='dance'?'stand':'dance'));this.dance.setAttribute('aria-pressed','false');
    this.music=this.button('Canciones',()=>this.openMusic(),'dm-concert-listen');this.memory=this.button('Guardar mi recuerdo',()=>this.remember());
    actions.append(this.music,this.dance,this.button('Aplaudir',()=>{this.sound.unlock().then(()=>this.sound.applause());this.pose('clap');}),this.button('Pedir otra',()=>{this.encore=true;this.pose('encore');this.chooseTrack((this.trackIndex+1)%this.artist.tracks.length);}),this.memory);
    this.dock=element('section','dm-concert-dock');this.dock.setAttribute('aria-label','Música del concierto');const musicHead=element('div','dm-concert-music-head');this.startButton=this.button('Empezar concierto',()=>this.startShow(),'dm-concert-start');this.startButton.disabled=true;this.song=element('strong','dm-concert-song',this.artist.tracks[0].title);musicHead.append(this.song,this.startButton);
    this.audioStatus=element('p','dm-concert-audio-status','Pulsa Empezar concierto para recibir a la banda y activar la música.');this.playerSlot=element('div','dm-concert-player-slot');this.seek=element('progress','dm-concert-progress');this.seek.max=1;this.seek.value=0;this.seek.setAttribute('aria-label','Progreso real de la canción');this.external=link('Abrir en Spotify ↗',trackURL(this.artist.tracks[0]));this.dock.append(musicHead,this.audioStatus,this.playerSlot,this.seek,this.external);
    this.note=element('p','dm-concert-note','Toca el suelo para acercarte');this.root.append(header,stage,this.dock,this.status,actions,this.note);this.parent.root.append(this.root);this.exit.focus({preventScroll:true});
    this.renderer=new ConcertRenderer(this.canvas,this.artist);
    this.canvas.addEventListener('pointerdown',e=>{if(!this.ready||this.panel)return;e.preventDefault();this.canvas.focus({preventScroll:true});const p=this.renderer.point(e);if(!canStand(p,MAP)){this.feedback('Hay sitio libre frente al escenario y entre el público.');return;}this.actor.pose='stand';this.dance.setAttribute('aria-pressed','false');this.dance.textContent='Bailar';this.held.clear();this.path=findPath(this.actor,p,MAP)||[];},{signal:this.abort.signal});
    document.addEventListener('keydown',e=>this.key(e,true),{capture:true,signal:this.abort.signal});document.addEventListener('keyup',e=>this.key(e,false),{capture:true,signal:this.abort.signal});
    window.addEventListener('blur',()=>this.held.clear(),{signal:this.abort.signal});document.addEventListener('visibilitychange',()=>{this.held.clear();this.path=[];},{signal:this.abort.signal});
    let timeout;try{await Promise.race([this.renderer.load(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('El escenario tarda en cargar. Vuelve a intentarlo desde el quiosco.')),18000);})]);}finally{clearTimeout(timeout);}
    if(this.disposed)return;this.ready=true;this.feedback('La banda está lista. Pulsa Empezar concierto para comenzar.');this.player=new SpotifyPlayer(this.playerSlot,this.artist.tracks[0],state=>{if(state.status==='playing'&&!this.radioStopped){document.querySelector('.dm381-radio-stop')?.click();this.radioStopped=true;}this.show.playback(state);this.syncMusic();});
  }
  startShow(){
    if(!this.ready)return;document.querySelector('.dm381-radio-stop')?.click();this.radioStopped=true;
    if(this.show.phase==='finished'){this.chooseTrack(this.trackIndex);return;}
    if(this.show.audio==='playing'&&this.show.phase==='live'){this.player.pause();return;}
    this.sound.unlock();this.show.start();this.player.play();this.feedback(this.show.intro<3?'Las luces bajan. La banda sube al escenario…':'Actuación en marcha. Si falta sonido, pulsa ▶ en el reproductor Spotify.');this.syncMusic();
  }
  syncMusic(){
    if(this.disposed||!this.startButton)return;const s=this.show.snapshot();this.startButton.disabled=!this.ready||s.phase==='intro'||s.audio==='loading';
    this.startButton.textContent=s.audio==='loading'?'Preparando música…':s.phase==='intro'?'Empieza en '+s.countdown:!s.started?'Empezar concierto':s.phase==='finished'?'Volver a escuchar':s.audio==='playing'?'Pausar música':s.audio==='paused'?'Continuar concierto':'Activar música';
    this.audioStatus.textContent=s.audio==='loading'?'Preparando la canción en Spotify…':!s.started?'Pulsa Empezar concierto. También puedes usar ▶ en Spotify.':s.phase==='intro'?'Cuenta atrás · recibimos a los músicos':s.audio==='playing'?'Sonando en Spotify · '+this.artist.tracks[this.trackIndex].title:s.audio==='paused'?'Música en pausa · puedes continuar cuando quieras.':s.audio==='buffering'?'Spotify está cargando la canción…':'La actuación está en marcha. Pulsa ▶ dentro de Spotify para escuchar; puede ofrecer una muestra.';
    this.seek.max=s.duration||1;this.seek.value=Math.min(s.position,this.seek.max);this.seek.hidden=!s.duration;
    if(s.phase==='finished'&&!this.finished){this.finished=true;this.sound.applause();this.feedback('¡Gracias, Madrid! Pide otra canción o guarda el recuerdo de esta noche.');}else if(s.phase!=='finished')this.finished=false;
  }
  chooseTrack(index){if(!this.ready)return;document.querySelector('.dm381-radio-stop')?.click();this.radioStopped=true;this.trackIndex=index;this.show.next();this.show.start();this.song.textContent=this.artist.tracks[index].title;this.external.href=trackURL(this.artist.tracks[index]);this.player.change(this.artist.tracks[index]);this.sound.unlock().then(()=>this.sound.applause());this.syncMusic();}
  feedback(message){this.status.textContent=message;}
  pose(pose){if(!this.ready)return;this.path=[];this.held.clear();this.actor.pose=pose;this.actor.face='up';this.poseUntil=pose==='clap'||pose==='encore'?performance.now()+3500:0;this.dance.textContent=pose==='dance'?'Dejar de bailar':'Bailar';this.dance.setAttribute('aria-pressed',String(pose==='dance'));this.feedback({stand:'Un momento para escuchar entre los árboles.',dance:'Bailando frente al escenario.',clap:'Los aplausos recorren el quiosco.',encore:'¡Una más! El escenario se ilumina para el bis.'}[pose]);}
  update(dt,now,data){
    if(this.disposed||!this.ready)return;if(data.role!==this.actor.role||data.name!==this.store.identity.name){this.parent.closeConcert();return;}
    const previous=this.show.snapshot();this.show.update(dt);const current=this.show.snapshot();if(previous.countdown!==current.countdown){if(current.phase==='intro')this.sound.click();else if(previous.phase==='intro'){this.sound.applause();this.feedback('La banda ya está en el escenario. Puedes bailar, aplaudir o pedir otra.');}this.syncMusic();}
    if(this.poseUntil&&now>this.poseUntil){this.actor.pose='stand';this.poseUntil=0;}
    const before={x:this.actor.x,y:this.actor.y};
    if(!this.panel){let dx=Number(this.held.has('right'))-Number(this.held.has('left')),dy=Number(this.held.has('down'))-Number(this.held.has('up'));if(dx||dy){const l=Math.hypot(dx,dy);Object.assign(this.actor,moveSafely(this.actor,dx/l*dt*170,dy/l*dt*170,MAP));this.actor.face=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';}
      else if(this.path.length){const p=this.path[0],len=distance(this.actor,p),step=Math.min(len,dt*210);if(len>.1){dx=(p.x-this.actor.x)/len;dy=(p.y-this.actor.y)/len;Object.assign(this.actor,moveSafely(this.actor,dx*step,dy*step,MAP));this.actor.face=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';}if(distance(this.actor,p)<1.5){Object.assign(this.actor,p);this.path.shift();}else if(distance(before,this.actor)<.01)this.path=[];}}
    this.actor.moving=distance(before,this.actor)>.05;
    this.api.position({...encodeConcert(this.actor),place:presenceLabel(this.bill.edition,this.artist.id,this.actor.pose)});
    this.peer=readPresence(data.peer,this.bill.edition,this.artist.id);if(this.peer)this.peer.role=this.actor.role==='jc'?'gabi':'jc';
    const label=this.peer?' · '+(this.peer.role==='jc'?'JC':'Gabi')+' está aquí':' · Puedes venir por tu cuenta';if(this.note.dataset.party!==label){this.note.dataset.party=label;this.note.textContent='Toca el suelo para caminar'+label;}
    if(!this.lastDraw||now-this.lastDraw>=1000/(this.renderer.reduced?12:30)){this.renderer.render(this.actor,this.peer,now,this.encore,this.show);this.lastDraw=now;}
  }
  remember(){
    if(!this.ready)return;const peer=readPresence(this.api.snapshot().peer,this.bill.edition,this.artist.id),result=this.store.remember(this.bill.edition,{...this.artist,tracks:[this.artist.tracks[this.trackIndex]]},peer);
    this.feedback(result.ok?(result.already?'Este concierto ya está en tu álbum.':'Recuerdo guardado: '+this.artist.name+' en el Retiro'+(peer?' con '+(this.actor.role==='jc'?'Gabi':'JC'):'')+'. Puedes verlo en vuestro álbum.'):result.message);if(result.ok)this.memory.textContent='Recuerdo guardado';
  }
  openMusic(){
    if(!this.ready)return;this.closeMusic(false);this.path=[];this.held.clear();this.panel=element('section','dm-concert-player');this.panel.setAttribute('role','dialog');this.panel.setAttribute('aria-label','Música de '+this.artist.name);
    const close=this.button('Volver al concierto',()=>this.closeMusic());this.panel.append(element('h3','',this.artist.name),close,element('p','','El repertorio de esta noche. La música sigue sonando al cerrar esta lista.'));
    this.artist.tracks.forEach((track,i)=>{this.panel.append(this.button((i+1)+'. '+track.title,()=>{this.chooseTrack(i);this.closeMusic();}),link('Abrir en Spotify ↗',trackURL(track)));});this.root.append(this.panel);close.focus({preventScroll:true});
  }
  closeMusic(focus=true){this.panel?.remove();this.panel=null;if(focus)this.music?.focus({preventScroll:true});}
  key(e,on){
    if(!this.root.contains(e.target)||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;const dir={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',a:'left',s:'down',d:'right'}[e.key];
    if(dir&&e.target===this.canvas){e.preventDefault();e.stopImmediatePropagation();if(on){this.path=[];this.pose('stand');this.held.add(dir);}else this.held.delete(dir);}
    if(on&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(this.panel)this.closeMusic();else this.parent.closeConcert();}
    if(on&&e.key==='Tab'){const scope=this.panel||this.root,buttons=[...scope.querySelectorAll('button,a[href],canvas,iframe')].filter(x=>!x.disabled&&x.getClientRects().length),first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&e.target===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&e.target===last){e.preventDefault();first.focus();}}
  }
  destroy(){if(this.disposed)return;this.disposed=true;this.player?.destroy();this.sound.destroy();this.closeMusic(false);this.abort.abort();this.renderer?.destroy();this.root?.remove();for(const p of this.previous||[])p.node.inert=p.inert;this.held.clear();this.path=[];}
  snapshot(){return {ready:!!this.ready,artist:this.artist.id,edition:this.bill.edition,role:this.actor.role,position:{x:this.actor.x,y:this.actor.y},pose:this.actor.pose,peer:this.peer||null,walking:!!this.path.length,encore:!!this.encore,music:!!this.panel,performance:this.show.snapshot(),track:this.trackIndex,animation:{loaded:!!this.renderer?.motion,frame:this.show.frame(this.artist.bpm)},memories:this.store.memories(),view:{scale:this.renderer?.scale,offset:this.renderer?.offset}};}
}
