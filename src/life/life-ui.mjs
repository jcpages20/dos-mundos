import {TRAITS,LIKES,MOODS,PLANS,progressFor,bothReady,FITNESS} from './life-model.mjs';
const el=(tag,cls='',text='')=>{const n=document.createElement(tag);n.className=cls;if(text)n.textContent=text;return n;};
export class LifeUI{
  constructor(controller){this.controller=controller;this.abort=new AbortController();this.tab='plans';}
  button(text,fn,cls=''){const b=el('button',cls,text);b.type='button';b.addEventListener('click',fn);return b;}
  open(tab='plans'){
    if(!this.controller.ensure())return;this.close(false);this.controller.api.pause();this.tab=tab;
    this.previousFocus=document.activeElement;this.root=el('div','dm-life-modal');this.root.id='dm-life-modal';this.root.setAttribute('role','presentation');
    const panel=el('section','dm-life-panel');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','Vida y planes');
    const header=el('header','dm-life-head'),title=el('div');title.append(el('small','','DOS MUNDOS · LO QUE NOS MUEVE'),el('h2','','Vida y planes'));
    this.closeButton=this.button('Cerrar',()=>this.close());header.append(title,this.closeButton);this.nav=el('nav','dm-life-tabs');this.nav.setAttribute('aria-label','Secciones de vida y planes');
    this.status=el('p','dm-life-sync');this.status.setAttribute('role','status');this.body=el('div','dm-life-body');this.message=el('p','dm-life-message');this.message.setAttribute('role','status');
    panel.append(header,this.nav,this.status,this.body,this.message);this.root.append(panel);document.body.append(this.root);
    this.inerted=[];for(const node of document.body.children)if(node!==this.root&&!['SCRIPT','STYLE','LINK'].includes(node.tagName)){this.inerted.push([node,node.inert]);node.inert=true;}
    this.root.addEventListener('pointerdown',e=>{if(e.target===this.root)this.close();});this.render(true);this.closeButton.focus({preventScroll:true});
  }
  close(restore=true){if(!this.root)return;this.root.remove();this.root=null;for(const [node,was] of this.inerted||[])node.inert=was;this.inerted=[];this.signature='';this.renderOwner=null;if(restore&&this.previousFocus?.isConnected)this.previousFocus.focus({preventScroll:true});}
  key(e){if(!this.root)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();this.close();return;}
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(e.key)&&!['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))e.stopImmediatePropagation();
    if(e.key==='Tab'){const list=[...this.root.querySelectorAll('button:not(:disabled),input:not(:disabled),select')].filter(n=>n.getClientRects().length),first=list[0],last=list.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
  }
  feedback(result){if(this.message)this.message.textContent=result.ok?'Guardado.':result.message;}
  render(force=false){
    if(!this.root)return;const s=this.controller.snapshot();if(!s){this.close();return;}
    if(this.renderOwner&&this.renderOwner!==s.game.role+':'+s.game.name){this.close();return;}this.renderOwner=s.game.role+':'+s.game.name;
    this.status.textContent=s.syncMessage+(s.pending?' · '+s.pending+' aportaciones pendientes':'');
    const signature=JSON.stringify([this.tab,s.profile,s.plans,s.errors,s.game.room,s.game.peer?.room,!!s.game.peer&&Date.now()-s.game.peer.updated<45000,s.game.connected,s.game.clock]);
    if(!force&&signature===this.signature)return;
    // Keep in-progress form edits and keyboard focus during background sync.
    if(!force&&this.tab==='profile')return;
    if(!force&&this.root.contains(document.activeElement)&&['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;
    this.signature=signature;const active=document.activeElement?.dataset.lifeFocus;this.nav.replaceChildren();
    for(const [id,label] of [['plans','Planes'],['profile','Personalidad'],['moods','Ánimo'],['memories','Recuerdos']]){const b=this.button(label,()=>{this.tab=id;this.render(true);});b.setAttribute('aria-pressed',String(this.tab===id));b.dataset.lifeFocus='tab-'+id;this.nav.append(b);}
    this.body.replaceChildren();if(s.readOnly)this.body.append(el('p','dm-life-warning','Se conserva el guardado anterior. Revisa las copias del baúl antes de editar este perfil.'));
    if(this.tab==='profile')this.profile(s);else if(this.tab==='moods')this.moods(s);else if(this.tab==='memories')this.memories(this.body,true);else this.plans(s);
    if(active)this.root.querySelector('[data-life-focus="'+active+'"]')?.focus({preventScroll:true});
  }
  profile(s){
    const form=el('form','dm-life-profile');form.append(el('h3','',s.game.role==='gabi'?'La personalidad de Gabi':'La personalidad de JC'),el('p','','Elige hasta dos rasgos y tres actividades favoritas. Puedes cambiarlos cuando quieras. Guardar preferencias no gasta dinero, tiempo ni concede recompensas.'));
    const fields=(title,options,selected,name,max)=>{const field=el('fieldset');field.append(el('legend','',title));for(const [id,data] of Object.entries(options)){
      const label=el('label','dm-life-choice'),input=el('input');input.type='checkbox';input.name=name;input.value=id;input.checked=selected.includes(id);const text=el('span');text.append(el('strong','',typeof data==='string'?data:data.name));if(data.note)text.append(el('small','',data.note));label.append(input,text);field.append(label);
      input.addEventListener('change',()=>{if(field.querySelectorAll('input:checked').length>max){input.checked=false;this.message.textContent='Puedes elegir hasta '+max+' '+(name==='trait'?'rasgos':'gustos')+'.';}});
    }form.append(field);};
    fields('Tus rasgos · hasta 2',TRAITS,s.profile.traits,'trait',2);fields('Actividades favoritas · hasta 3',LIKES,s.profile.likes,'like',3);
    const label=el('label','dm-life-food','Tu plato favorito'),select=el('select');select.name='food';select.setAttribute('aria-label','Plato favorito');const none=el('option','','Todavía sin elegir');none.value='';select.append(none);
    for(const recipe of s.game.recipes){const option=el('option','',recipe.label);option.value=recipe.id;select.append(option);}select.value=s.profile.favoriteFood;label.append(select);form.append(label,el('p','','Tus gustos y rasgos pueden añadir hasta 3 puntos de diversión por actividad. La inspiración o concentración pueden añadir 2 XP a una actividad compatible; se consumen al utilizarlos.'));
    const save=this.button('Guardar mi personalidad',()=>{});save.type='submit';save.disabled=s.readOnly;form.append(save);form.addEventListener('submit',e=>{e.preventDefault();const data=new FormData(form);this.feedback(this.controller.configure({traits:data.getAll('trait'),likes:data.getAll('like'),favoriteFood:data.get('food')}));});this.body.append(form);
  }
  moods(s){
    this.body.append(el('h3','','Cómo te sientes'),el('p','','Los estados siguen el reloj del juego. Se conservan al cerrar la aplicación y cambian con lo que haces. Tu indicador habitual de ánimo y tus necesidades siguen funcionando.'));
    if(!s.profile.configured&&!s.profile.traits.length&&!s.profile.likes.length&&!s.profile.favoriteFood)this.body.append(el('p','dm-life-warning','Guarda tu personalidad para activar las pequeñas mejoras de los estados de ánimo. Hasta entonces conservas exactamente las recompensas habituales.'));
    if(!s.moods.length)this.body.append(el('p','dm-life-empty','Todavía no tienes un estado temporal. Prueba a leer, pasear, descansar o entrenar.'));
    for(const m of s.moods){const card=el('article','dm-life-card');card.append(el('h4','',MOODS[m.id].name),el('p','',m.reason),el('p','',MOODS[m.id].note),el('small','',Math.ceil(m.until-s.game.clock)+' min del juego restantes'));this.body.append(card);}
    if(s.lastBonus)this.body.append(el('p','dm-life-result',s.lastBonus));
    const row=el('div','dm-life-buttons');row.append(this.button('Ir a leer',()=>this.go('library')),this.button('Pasear por el parque',()=>this.go('park')),this.button('Volver a casa',()=>this.go('home')));this.body.append(row);
  }
  plans(s){
    this.body.append(el('h3','','Nuestros planes'),el('p','','Hasta dos planes activos, sin fecha límite. Únete y realiza las actividades de siempre: se registran después de empezar el plan. Cada uno controla y aporta con su propio personaje.'));
    for(const [id,cfg] of Object.entries(PLANS)){
      const plan=s.plans[id],card=el('article','dm-life-card');card.dataset.plan=id;card.append(el('h4','',cfg.name),el('p','',cfg.description));
      if(plan?.status==='completed'){card.append(el('p','dm-life-result','Recuerdo conseguido'),this.button('Ver el recuerdo',()=>{this.tab='memories';this.render(true);}));this.body.append(card);continue;}
      for(const role of ['jc','gabi']){const p=plan?progressFor(plan,role):{count:0,total:cfg.distinct||cfg.requirements.length,joined:false,items:[]};const row=el('div','dm-life-person');row.append(el('strong','',role==='jc'?'JC':'Gabi'),el('span','',p.joined?p.count+' de '+p.total:'Pendiente de unirse'));const progress=el('progress');progress.max=p.total;progress.value=p.count;progress.setAttribute('aria-label','Progreso de '+role+' en '+cfg.name);row.append(progress);card.append(row);
        if(p.items.length)card.append(el('small','',p.items.map(x=>LIKES[x]||'Deporte en el parque').join(' · ')));}
      const own=plan?.members?.[s.game.role];
      if(!own?.active){const b=this.button(plan?'Unirme al plan':'Comenzar este plan',()=>{this.feedback(this.controller.command('join',{plan:id}));this.render(true);});b.disabled=s.readOnly;card.append(b);}
      else{
        const b=this.button('Dejar este plan',()=>{this.feedback(this.controller.command('leave',{plan:id}));this.render(true);});b.disabled=s.readOnly;card.append(b,el('small','','Al dejarlo se conservan tus aportaciones. Puedes retomarlo cuando haya espacio.'));
        const go=el('div','dm-life-buttons');for(const kind of cfg.requirements){const target={cook:'home',park:'park',coffee:'cafe',cinema:'cinema',strength:'gym',cardio:'gym',aerial:'gym',mobility:'gym',sport:'park'}[kind];if(target&&!go.querySelector('[data-target="'+target+'"]')){const link=this.button({home:'Ir a casa',park:'Ir al parque',cafe:'Ir a la cafetería',cinema:'Ir al cine',gym:'Ir al gimnasio'}[target],()=>this.go(target));link.dataset.target=target;go.append(link);}}card.append(go);
      }
      if(plan&&bothReady(plan)&&cfg.room){
        const here=s.game.connected&&s.game.room===cfg.room&&s.game.peer?.room===cfg.room&&Math.abs(Date.now()-s.game.peer.updated)<45000;
        card.append(el('p','','Las aportaciones están listas. Reuníos '+(cfg.room==='home'?'en casa':'en el cine')+' y confirmad los dos en un plazo de dos minutos.'));
        const confirm=this.button(cfg.finish,()=>{this.feedback(this.controller.confirm(id));this.render(true);});confirm.disabled=!here||s.readOnly;card.append(confirm);
        if(plan.confirmations?.[s.game.role])card.append(el('p','','Tu confirmación está guardada. Esperando la de '+(s.game.role==='jc'?'Gabi':'JC')+'.'));
      }
      this.body.append(card);
    }
    if(s.pending)this.body.append(el('p','dm-life-warning','Estas aportaciones están guardadas en este dispositivo. El otro jugador las verá cuando se sincronicen.'));
    for(const error of s.errors){const card=el('div','dm-life-warning');card.append(el('p','',error.message),this.button('Descartar solicitud pendiente',()=>{this.controller.sync.discard(error.id);this.render(true);}));this.body.append(card);}
    const row=el('div','dm-life-buttons');row.append(this.button('Reintentar sincronización',()=>{this.controller.sync.retry();this.render(true);}),this.button('Conectar mi cuenta',()=>{this.close();this.controller.api.online();document.getElementById('dm41-panel')?.querySelector('button')?.focus();}));this.body.append(row);
  }
  memories(parent,editable=false){
    const memories=this.controller.memories();parent.append(el('h3','','Historias que habéis conseguido'));
    if(!memories.length)parent.append(el('p','dm-life-empty','Los planes completados dejarán aquí su fecha y las aportaciones de cada uno.'));
    for(const m of memories){const card=el('article','dm-life-card');card.append(el('h4','',m.customTitle||m.title),el('small','',new Date(m.at).toLocaleDateString('es-ES')+(m.day?' · Día '+m.day:' del juego')),el('p','',m.detail));
      if(editable){const form=el('form','dm-life-title'),input=el('input');input.type='text';input.maxLength=90;input.value=m.customTitle||m.title;input.setAttribute('aria-label','Título del recuerdo '+m.title);const save=this.button('Guardar título',()=>{});save.type='submit';form.append(input,save);form.addEventListener('submit',e=>{e.preventDefault();this.feedback(this.controller.command('rename',{plan:m.id.replace('vida-',''),title:input.value}));});card.append(form);}parent.append(card);}
    if(editable)parent.append(this.button('Abrir nuestro álbum completo',()=>{this.close();this.controller.api.album();document.querySelector('#dm61-overlay button')?.focus();}));
  }
  go(id){this.close();this.controller.api.go(id);}
  mountAlbum(parent){parent.querySelector('.dm-life-album')?.remove();const section=el('section','dm-life-album');this.memories(section);section.append(this.button('Abrir nuestros planes',()=>this.open()));parent.append(section);}
  refreshLaunchers(){
    if(!this.controller.ensure())return;const phone=document.querySelector('#dm42-phone .dm42-head-text');
    if(phone&&!phone.querySelector('[data-dm-life-open]')){const b=this.button('Nuestros planes y personalidad',()=>this.open());b.dataset.dmLifeOpen='';b.classList.add('dm-life-launch');phone.append(b);}
    const panel=document.querySelector('#dm-city-actions .dm-city-panel');if(panel&&!panel.querySelector('[data-dm-life-open]')){const b=this.button('Nuestros planes y personalidad',()=>this.open());b.dataset.dmLifeOpen='';panel.prepend(b);}
    const life=document.getElementById('life');if(life&&!life.querySelector('.dm-life-summary')){const card=el('section','dm-life-summary');card.append(el('h3','','Tu personalidad y vuestros planes'),this.button('Elegir mis gustos',()=>this.open('profile')),this.button('Nuestros planes',()=>this.open()));life.prepend(card);}
  }
}
