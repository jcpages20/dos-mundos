// Runs in the existing closure. Observe successful native actions; all money,
// time, ingredients, needs and primary XP remain owned by their original code.
export function installLegacyLifeBridge(){
  let gesture=null,depth=0,applying=false;
  const clock=()=>state?state.day*1440+state.time:0;
  function snapshot(){if(!state)return null;const life=dm55Load(),peer=dm41Online.connected&&dm41Online.other;
    return {name:state.name,role:dm51LocalIdentity(),room:indoor,clock:clock(),day:state.day,time:state.time,money:state.money,energy:state.energy,fun:state.fun,
      meals:Number(life.totalMeals)||0,recipes:DM55_RECIPES.map(p=>({id:p.id,label:p.label,time:p.time,xp:p.xp})),
      connected:!!dm41Online.connected,peer:peer&&peer.online===true?{room:peer.room,updated:peer.updated}:null};}
  function classify(text='',room=indoor){
    const t=String(text).toLowerCase();
    if(/telas|aéreas|silks/.test(t))return {kind:'aerial'};
    if(/fuerza|pesas|weights/.test(t))return {kind:'strength'};
    if(/cardio|corredora|bicicleta/.test(t))return {kind:'cardio'};
    if(/estirar|movilidad|stretch/.test(t))return {kind:'mobility'};
    if(/deporte/.test(t))return {kind:'sport'};
    if(/leer|lectura|estudi|novela|libro/.test(t))return {kind:'reading',xpTarget:'estudio'};
    if(/dormir|descans|respirar|\brest\b/.test(t)||(room==='park'&&/sentart/.test(t)))return {kind:'rest'};
    if(room==='park'&&/pase|aire libre|walk/.test(t))return {kind:'park'};
    if(room==='cinema'&&/butaca|sentar|película|cinema/.test(t))return {kind:'cinema'};
    if(room==='cafe'&&/café|tarta|charla|musical|cita|portátil|escribir/.test(t))return {kind:'coffee',tags:/musical/.test(t)?['music']:[]};
    if(/charl|convers|preguntar|hablar|broma|ayuda|social/.test(t))return {kind:'social'};
    if(/música|músico/.test(t))return {kind:'music'};
    if(/regar|cosechar|abonar/.test(t))return {kind:'garden'};
    if(/trabaj|turno|oficina/.test(t))return {kind:'work'};
    return null;
  }
  function finish(before,label,hint){
    if(applying||!before||!state)return;const after=snapshot();if(after.role!==before.role||after.name!==before.name||after.clock<=before.clock)return;
    let info=hint||classify(label,before.room);
    if(after.meals>before.meals){const recipe=DM55_RECIPES.find(p=>String(label).includes(p.label));info={kind:'cook',recipe:recipe?.id||'',xpTarget:'cooking'};}
    if(!info)return;
    const event={...info,label:String(label||info.kind).slice(0,110),room:before.room,clock:after.clock,day:after.day,time:after.time,energy:after.energy,at:Date.now(),role:before.role,name:before.name};
    window.dispatchEvent(new CustomEvent('dos-mundos:life-activity',{detail:event}));
  }
  function observe(fn,hintFor){return function(...args){
    const hint=hintFor?.(...args);if(gesture){if(!gesture.hint&&hint)gesture.hint=hint;return fn.apply(this,args);}
    const root=depth===0,before=root?snapshot():null;depth++;
    try{return fn.apply(this,args);}finally{depth--;if(root)finish(before,hint?.label||String(args[0]?.name||args[0]?.title||args[0]||''),hint);}
  };}
  doAction=observe(doAction,type=>({work:{kind:'work'},gym:{kind:'strength'},study:{kind:'reading',xpTarget:'estudio'},rest:{kind:'rest'},walk:indoor==='park'?{kind:'park'}:null,social:{kind:'social'},coffee:{kind:'coffee'},cinema:{kind:'cinema'}}[type]||null));
  performDetailed=observe(performDetailed,(a,o)=>classify(a.name+' '+o.title,indoor));
  dm56Act=observe(dm56Act,a=>{
    if(dm56Scene?.id==='library'&&['read','browse'].includes(a.id))return {kind:'reading',xpTarget:'reading',label:'Leer en la biblioteca'};
    return classify(a.id==='weights'?'fuerza':a.id==='seat'?'butacas':a.id,indoor);
  });
  dm56Effect=observe(dm56Effect,c=>classify(c.label,indoor));
  relationshipChoice=observe(relationshipChoice,()=>({kind:'social'}));
  // Adapt the modular scenes before their installers capture these frozen APIs.
  const adapters={DosMundosLegacy:{read:'reading',rest:'rest'},DosMundosGymLegacy:{weights:'strength',cardio:'cardio',stretch:'mobility',silks:'aerial',rest:'rest'},DosMundosOutdoorLegacy:{walk:'park',stroll:'park',sport:'sport',rest:'rest',music:'music',talk:'social',social:'social',listen:'music'},DosMundosFarmLegacy:{water:'garden',fertilize:'garden',harvest:'garden'}};
  for(const [key,types] of Object.entries(adapters)){
    const api=window[key];if(!api)continue;const descriptors=Object.getOwnPropertyDescriptors(api);
    descriptors.act={...descriptors.act,value:observe(api.act,type=>types[type]?{kind:types[type],label:{reading:'Leer',strength:'Entrenar fuerza',cardio:'Hacer cardio',mobility:'Estirar',aerial:'Telas aéreas',park:'Pasear por el parque',sport:'Deporte en el parque',rest:'Descansar',music:'Escuchar música',social:'Conversar',garden:'Cuidar el huerto'}[types[type]]}:null)};
    window[key]=Object.freeze(Object.defineProperties({},descriptors));
  }
  document.addEventListener('click',event=>{
    if(applying||gesture||!state)return;const button=event.target.closest?.('button');if(!button||button.closest('#dm-life-modal'))return;
    const item={before:snapshot(),label:button.textContent,hint:null,event};gesture=item;
    // Trusted browser events can run microtasks between capture and onclick.
    // Finish at bubble (or the next task if a legacy listener stops propagation).
    setTimeout(()=>{if(gesture===item){gesture=null;finish(item.before,item.label,item.hint);}},0);
  },true);
  window.addEventListener('click',event=>{if(gesture?.event===event){const item=gesture;gesture=null;finish(item.before,item.label,item.hint);}});
  const oldPhone=dm42OpenPhone;dm42OpenPhone=function(){const result=oldPhone();window.dispatchEvent(new CustomEvent('dos-mundos:life-phone'));return result;};
  const oldAlbum=dm61Album;dm61Album=function(content){oldAlbum(content);window.DosMundosLife?.mountAlbum(content);};
  window.DosMundosLifeLegacy=Object.freeze({
    snapshot,
    pause(){cancelWalk();},
    bonus(award){
      if(!state)return;applying=true;
      try{state.fun=clamp(state.fun+Math.min(3,Math.max(0,Number(award.fun)||0)));
        if(award.xp===2){if(['cooking','reading'].includes(award.xpTarget))dm55XP(2,award.xpTarget);else if(award.xpTarget==='estudio'){state.skills??={};state.skills.estudio=(Number(state.skills.estudio)||0)+2;}}
        recalcMood();refreshUI();
      }finally{applying=false;}
    },
    connected(){return !!(dm41Online.connected&&dm41Online.api?.dbMod&&dm41Online.uid&&DM41_UIDS.includes(dm41Online.uid));},
    subscribe(next,error){if(!this.connected())return ()=>{};const c=dm41Online;return c.api.dbMod.onValue(c.api.dbMod.ref(c.db,'dosMundos/duo/vidaV1/plans'),snap=>next(snap.val()),error);},
    transact(update){
      if(!this.connected())return Promise.reject(new Error('Conecta tu cuenta para compartir los planes.'));
      const c=dm41Online,uid=c.uid,role=dm51LocalIdentity(),dbm=c.api.dbMod;
      if(uid!==DM41_UIDS[role==='jc'?0:1])return Promise.reject(new Error('Esta cuenta no corresponde a tu personaje.'));
      return dbm.runTransaction(dbm.ref(c.db,'dosMundos/duo/vidaV1/plans'),value=>{
        if(dm41Online.uid!==uid||dm51LocalIdentity()!==role)throw new Error('La sesión cambió. Vuelve a abrir los planes.');return update(value);
      },{applyLocally:false});
    },
    go(id){document.querySelector('#dm42-phone .dm42-x')?.click();document.getElementById('dm61-overlay')?.remove();document.getElementById('dm55-overlay')?.remove();
      if(window.DosMundosFarmLegacy?.open)window.DosMundosFarmLegacy.exit();
      else document.querySelector('#dm58-overlay .dm58-head button')?.click();
      if(dm56Scene)dm56Close();document.querySelector('#dm37-cafe-modal .dm37-close')?.click();
      if(dm59Scene)dm59Return();if(indoor)closeInterior();tabs('world');return window.DosMundosCityLegacy?.walkTo(id);},
    recipes(){dm55Show('cook');},phone(){dm42OpenPhone();},online(){dm41Modal();},album(){dm61Modal();dm61Render('album');}
  });
}
export const lifeBridgeSource=()=>`(${installLegacyLifeBridge.toString()})();\n`;
