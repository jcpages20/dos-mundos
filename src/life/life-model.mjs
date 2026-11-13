export const TRAITS={creative:{name:'Creativo',note:'Leer te inspira para la siguiente receta o sesión de estudio.'},social:{name:'Sociable',note:'Conversar y compartir actividades te divierte un poco más.'},homebody:{name:'Casero',note:'Disfrutas especialmente de cocinar y descansar en casa.'},active:{name:'Deportista',note:'Disfrutas especialmente del ejercicio y las telas.'}};
export const LIKES={cook:'Cocinar',reading:'Leer',strength:'Fuerza',cardio:'Cardio',aerial:'Telas aéreas',mobility:'Estiramientos',park:'Pasear por el parque',coffee:'Cafeterías',cinema:'Cine',music:'Música',social:'Conversar',garden:'Cultivar'};
export const FITNESS=['strength','cardio','aerial','mobility','sport'];
export const MOODS={inspired:{name:'Inspirado',note:'La siguiente receta o sesión de estudio recibe 2 XP adicionales.'},focused:{name:'Concentrado',note:'La siguiente sesión de estudio recibe 2 XP adicionales.'},relaxed:{name:'Relajado',note:'La siguiente actividad recibe un punto adicional de diversión.'},proud:{name:'Orgulloso',note:'La siguiente conversación recibe un punto adicional de diversión.'},tired:{name:'Cansado',note:'Tu energía está baja. Descansar te ayudará a recuperarla.'}};
export const PLANS={
  dinner:{name:'Una cena entre los dos',description:'Cada uno prepara una receta con los ingredientes de su despensa. Después os encontráis en casa para compartir el momento.',requirements:['cook'],room:'home',finish:'Confirmar nuestra cena',reward:'Nuestra cena en casa'},
  madrid:{name:'Una tarde por Madrid',description:'Cada uno disfruta del parque, una actividad en la cafetería y un rato en el cine. Os reunís en el cine para cerrar la tarde.',requirements:['park','coffee','cinema'],room:'cinema',finish:'Confirmar nuestra tarde',reward:'Una tarde por Madrid'},
  active:{name:'Nuestro reto activo',description:'Cada uno completa tres actividades deportivas diferentes: fuerza, cardio, telas, estiramientos o deporte en el parque.',requirements:FITNESS,distinct:3,reward:'Nuestro reto activo, conseguido'}
};
const clone=v=>JSON.parse(JSON.stringify(v));
const unique=(a,allowed,max)=>[...new Set(Array.isArray(a)?a.filter(x=>Object.hasOwn(allowed,x)):[])].slice(0,max);
export function profileDefault(){return {version:1,configured:false,traits:[],likes:[],favoriteFood:'',moods:[],lastFitness:0,updatedAt:0};}
export function cleanProfile(raw){
  if(raw?.version!==1)return profileDefault();return {...raw,version:1,traits:unique(raw.traits,TRAITS,2),likes:unique(raw.likes,LIKES,3),favoriteFood:typeof raw.favoriteFood==='string'?raw.favoriteFood.slice(0,40):'',moods:Array.isArray(raw.moods)?raw.moods.filter(m=>Object.hasOwn(MOODS,m.id)&&Number.isFinite(m.until)&&Number.isFinite(m.since)).slice(-6):[],lastFitness:Number(raw.lastFitness)||0};
}
export function activeMoods(profile,clock){return profile.moods.filter(m=>m.until>clock&&m.since<=clock);}
export function evolveProfile(profile,event){
  const next=clone(profile),moods=activeMoods(profile,event.clock);let fun=0,xp=0,xpTarget=null;
  if(profile.likes.some(k=>k===event.kind||event.tags?.includes(k)))fun+=2;
  if(profile.traits.includes('social')&&['social','coffee','music'].includes(event.kind))fun++;
  if(profile.traits.includes('active')&&FITNESS.includes(event.kind))fun++;
  if(profile.traits.includes('homebody')&&event.room==='home'&&['cook','rest'].includes(event.kind))fun++;
  if(event.kind==='cook'&&profile.favoriteFood&&event.recipe===profile.favoriteFood)fun+=2;
  const inspired=moods.find(m=>m.id==='inspired'),focused=moods.find(m=>m.id==='focused');
  if(event.kind==='cook'&&inspired){xp=2;xpTarget='cooking';moods.splice(moods.indexOf(inspired),1);}
  else if(event.kind==='reading'&&(inspired||focused)){const used=inspired||focused;xp=2;xpTarget=event.xpTarget||'estudio';moods.splice(moods.indexOf(used),1);}
  const relaxed=moods.find(m=>m.id==='relaxed'),proud=moods.find(m=>m.id==='proud');
  if(relaxed){fun++;moods.splice(moods.indexOf(relaxed),1);}
  if(event.kind==='social'&&proud){fun++;moods.splice(moods.indexOf(proud),1);}
  const add=(id,minutes,reason)=>{for(let i=moods.length-1;i>=0;i--)if(moods[i].id===id)moods.splice(i,1);moods.push({id,since:event.clock,until:event.clock+minutes,reason});};
  if(event.kind==='reading')add(profile.traits.includes('creative')?'inspired':'focused',120,'Has dedicado un rato a leer y aprender.');
  if(['park','rest','mobility'].includes(event.kind))add('relaxed',180,'Has tenido un momento para bajar el ritmo.');
  if(FITNESS.includes(event.kind)){add('proud',150,'Has completado una actividad física.');next.lastFitness=event.clock;if(event.energy<25)add('tired',120,'El ejercicio y tu energía actual piden una pausa.');}
  if(event.kind==='rest'&&event.energy>=25){for(let i=moods.length-1;i>=0;i--)if(moods[i].id==='tired')moods.splice(i,1);}
  next.moods=moods.slice(-5);next.updatedAt=event.at;
  // Preferences are opt-in; a character without selections keeps native rewards.
  const chosen=profile.configured||profile.traits.length||profile.likes.length||profile.favoriteFood;
  return {profile:next,bonus:{fun:chosen?Math.min(3,fun):0,xp:chosen?xp:0,xpTarget},event};
}
export const emptyPlans=()=>({version:1,plans:{},receipts:{}});
export function validatePlans(raw){
  if(raw==null)return emptyPlans();if(raw.version!==1||!raw.plans||typeof raw.plans!=='object'||Array.isArray(raw.plans))throw new Error('Se conserva una versión de planes que este juego todavía no puede editar.');
  return {...clone(raw),receipts:raw.receipts&&typeof raw.receipts==='object'?{...raw.receipts}:{}};
}
export function progressFor(plan,role){
  const cfg=PLANS[plan.id],member=plan.members?.[role],got=Object.keys(member?.progress||{}).filter(k=>cfg.requirements.includes(k));
  return {count:Math.min(cfg.distinct||cfg.requirements.length,got.length),total:cfg.distinct||cfg.requirements.length,done:got.length>=(cfg.distinct||cfg.requirements.length),joined:!!member?.active,items:got};
}
export const bothReady=plan=>['jc','gabi'].every(role=>progressFor(plan,role).done&&progressFor(plan,role).joined);
export function applyPlanCommand(raw,command,owner){
  const state=validatePlans(raw),c=command;
  const fail=message=>({ok:false,state,message});
  if(!c||!['jc','gabi'].includes(owner)||c.role!==owner||typeof c.id!=='string'||!/^[a-zA-Z0-9_-]{6,100}$/.test(c.id)||!Number.isFinite(c.at))return fail('No se pudo identificar esta aportación.');
  if(Object.hasOwn(state.receipts,c.id))return {ok:true,state,duplicate:true};
  const activeCount=()=>Object.values(state.plans).filter(p=>p.status==='active').length;
  if(c.type==='event'){
    if(!Object.hasOwn({...LIKES,sport:true,rest:true,work:true},c.event?.kind))return fail('Esa actividad no forma parte de los planes.');
    for(const plan of Object.values(state.plans)){
      const cfg=PLANS[plan.id],member=plan.members?.[owner];if(!cfg||plan.status!=='active'||!member?.active||c.at<member.joinedAt||!cfg.requirements.includes(c.event.kind))continue;
      member.progress??={};if(!member.progress[c.event.kind])member.progress[c.event.kind]={id:c.id,at:c.at,day:c.event.day,time:c.event.time,label:String(c.event.label||LIKES[c.event.kind]||'Deporte').slice(0,90),recipe:String(c.event.recipe||'').slice(0,40)};
      if(plan.confirmations)delete plan.confirmations[owner];
      if(plan.id==='active'&&bothReady(plan)){plan.status='completed';plan.finishedAt=c.at;plan.finishedDay=c.event.day;}
    }
  }else{
    if(!Object.hasOwn(PLANS,c.plan))return fail('Elige un plan disponible.');
    let plan=state.plans[c.plan];
    if(c.type==='join'){
      if(plan?.status==='completed')return fail('Este recuerdo ya está conseguido.');
      if(plan?.status!=='active'&&activeCount()>=2)return fail('Ya tenéis dos planes activos. Deja o termina uno para comenzar otro.');
      plan??={id:c.plan,createdAt:c.at,createdBy:owner,members:{},status:'active'};plan.status='active';plan.members??={};
      plan.members[owner]={...plan.members[owner],active:true,joinedAt:plan.members[owner]?.joinedAt||c.at,progress:plan.members[owner]?.progress||{}};state.plans[c.plan]=plan;
    }else if(c.type==='leave'){
      if(!plan||plan.status==='completed')return fail('Este plan ya no está activo.');
      if(plan.members?.[owner])plan.members[owner].active=false;
      if(plan.confirmations)delete plan.confirmations[owner];
      if(!Object.values(plan.members||{}).some(m=>m.active))plan.status='paused';
    }else if(c.type==='rename'){
      if(!plan||plan.status!=='completed'||typeof c.title!=='string'||!c.title.trim()||c.title.length>90)return fail('Escribe un título de hasta 90 caracteres para un recuerdo conseguido.');
      plan.title=c.title.trim();plan.titleBy=owner;
    }else if(c.type==='confirm'){
      const cfg=PLANS[c.plan];if(!plan||plan.status!=='active'||!bothReady(plan)||!cfg.room)return fail('Todavía faltan aportaciones para compartir este momento.');
      if(c.room!==cfg.room||!Number.isFinite(c.peerAt)||Math.abs(c.at-c.peerAt)>45000)return fail('Necesitáis estar conectados los dos en el lugar del plan.');
      plan.confirmations??={};plan.confirmations[owner]={at:c.at,room:c.room};
      const other=plan.confirmations[owner==='jc'?'gabi':'jc'];
      if(other&&other.room===cfg.room&&Math.abs(c.at-other.at)<=120000){plan.status='completed';plan.finishedAt=c.at;plan.finishedDay=c.day;}
    }else return fail('La acción del plan no está disponible.');
  }
  state.receipts[c.id]=true;return {ok:true,state};
}
export function planMemory(plan){
  const cfg=PLANS[plan.id];if(!cfg||plan.status!=='completed')return null;
  const details=['jc','gabi'].map(role=>{const m=plan.members?.[role];const parts=Object.values(m?.progress||{}).map(p=>p.label);return (role==='jc'?'JC':'Gabi')+': '+parts.join(', ');});
  return {id:'vida-'+plan.id,title:cfg.reward,at:plan.finishedAt,day:plan.finishedDay,detail:details.join(' · '),customTitle:plan.title||''};
}
