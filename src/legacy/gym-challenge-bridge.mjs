export function installLegacyGymChallengeBridge(){
  const valid=['weights','cardio','silks','stretch'],levels=['suave','normal','reto'];
  const clone=v=>JSON.parse(JSON.stringify(v));
  const key=()=>`dos-mundos-gym-retos-v1:${dm51LocalIdentity()}:${encodeURIComponent(state?.name||'')}`;
  const empty=()=>({version:1,bests:{},history:[],active:null});
  function load(){const raw=localStorage.getItem(key());if(!raw)return empty();const d=JSON.parse(raw);if(d?.version!==1||!d.bests||!Array.isArray(d.history))throw new Error('Este guardado de retos se conserva, pero esta versión no puede editarlo.');return d;}
  const write=d=>localStorage.setItem(key(),JSON.stringify(d));
  const current=()=>!!state&&indoor==='gym'&&window.DosMundosGymLegacy?.open;
  function failure(error){return {ok:false,message:error?.message||'No se pudo guardar el reto. Se conserva el progreso anterior.'};}
  window.DosMundosGymChallengeLegacy=Object.freeze({
    get role(){return dm51LocalIdentity();},
    snapshot(){try{return {ok:true,...load(),name:state?.name,role:dm51LocalIdentity(),energy:state?.energy};}catch(error){return {...failure(error),version:1,bests:{},history:[],active:null};}},
    create(type,level,seed,practice=false){
      try{
        if(!current()||!valid.includes(type)||!levels.includes(level)||!Number.isInteger(seed)||seed<0||seed>0xffffff)return {ok:false,message:'Entra en Atlas y elige un reto válido.'};
        const d=load();if(d.active&&d.active.status!=='claimed')return {ok:false,message:'Tienes un reto interrumpido. Retómalo o descártalo antes de comenzar otro.'};
        const need={weights:19,cardio:13,silks:15,stretch:0}[type];if(!practice&&state.energy<need)return {ok:false,message:'Necesitas al menos '+need+' de energía para esta sesión. Puedes ensayar gratis.'};
        d.active={id:'g-'+crypto.randomUUID(),type,level,seed,practice:!!practice,role:dm51LocalIdentity(),name:state.name,status:'playing',createdAt:Date.now(),model:null};write(d);return {ok:true,ticket:clone(d.active)};
      }catch(error){return failure(error);}
    },
    saveRun(id,model){try{const d=load(),a=d.active;if(!a||a.id!==id||a.status==='claimed'||a.role!==dm51LocalIdentity()||a.name!==state.name)return {ok:false,message:'La partida del reto ha cambiado en otra pestaña.'};
      if(model?.version!==1||model.type!==a.type||model.level!==a.level||model.seed!==a.seed||!Number.isFinite(model.elapsed)||model.elapsed<0||model.elapsed>180)return {ok:false,message:'No se pudo conservar esta secuencia.'};
      a.model=clone(model);write(d);return {ok:true};}catch(error){return failure(error);}},
    abandon(id){try{const d=load();if(d.active?.id===id){d.active=null;write(d);}return {ok:true};}catch(error){return failure(error);}},
    act(type,id,result){
      if(!current())return {ok:false,message:'Vuelve al gimnasio para guardar esta sesión.'};
      let captured=null,before=null,life=null,owner=null,garden=null;
      const owned=k=>k.startsWith('dos-mundos-')||k.startsWith('dm58-life-');
      try{
        const d=load(),a=d.active;if(!a||a.id!==id||a.type!==type||a.role!==dm51LocalIdentity()||a.name!==state.name)return {ok:false,message:'Esta sesión ya no corresponde a tu personaje.'};
        if(a.status==='claimed')return {ok:true,already:true,message:'Esta marca ya está guardada. La sesión se contabilizó una sola vez.'};
        if(!a.model||a.model.phase!=='done'||!Number.isInteger(result?.score)||result.score<0||result.score>1000||result.score!==a.model.score||!Number.isFinite(result.inputs)||result.inputs<2||!result.effort)return {ok:false,message:'Completa los movimientos del reto para guardar una marca.'};
        captured=Object.fromEntries(Object.entries(localStorage).filter(([k])=>owned(k)));before=clone(state);life=dm55Store?clone(dm55Store):null;owner=dm55Owner;garden=dm58Store?clone(dm58Store):null;
        let response={ok:true,message:'Ensayo completado. Tu energía, minutos y XP no han cambiado.'};
        if(!a.practice){response=window.DosMundosGymLegacy.act(type);if(!response.ok)return response;}
        const entry={id:a.id,type,level:a.level,seed:a.seed,practice:a.practice,score:result.score,combo:result.maxCombo||0,medal:result.medal,at:Date.now()};
        if(!d.history.some(h=>h.id===id))d.history=[entry,...d.history].slice(0,30);
        if(!a.practice){const rank=type+':'+a.level,previous=d.bests[rank];if(!previous||entry.score>previous.score)d.bests[rank]=entry;}
        a.status='claimed';a.result=entry;write(d);
        // Native helpers swallow quota errors; explicit writes keep a failed
        // reward transaction observable and recoverable before Life sees it.
        if(!a.practice){localStorage.setItem(KEY,JSON.stringify(state));if(dm55Store)localStorage.setItem(dm55Owner,JSON.stringify(dm55Store));}
        return {ok:true,practice:a.practice,entry,message:response.message+(a.practice?'':' · Marca guardada: '+entry.score+'/1000')};
      }catch(error){
        if(captured){state=before;dm55Store=life;dm55Owner=owner;dm58Store=garden;
          try{for(const k of Object.keys(localStorage))if(owned(k)&&!(k in captured))localStorage.removeItem(k);for(const [k,v] of Object.entries(captured))if(localStorage.getItem(k)!==v)localStorage.setItem(k,v);}catch{}
          try{refreshUI();}catch{}
        }
        return {ok:false,message:'No se pudo guardar la sesión. Se conserva el progreso anterior; puedes reintentar sin duplicar premios.'};
      }
    }
  });
}
export const gymChallengeBridgeSource=()=>`(${installLegacyGymChallengeBridge.toString()})();\n`;
