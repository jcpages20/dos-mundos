// Adapt the original recipe buttons, including their ingredient and meal logic.
// This function is serialized inside the historical game's closure.
export function installLegacyKitchenBridge(){
  const supported=['omelet','pasta','chickenrice'],clone=v=>JSON.parse(JSON.stringify(v));
  const key=()=>`dos-mundos-cocina-jugable-v1:${dm51LocalIdentity()}:${encodeURIComponent(state?.name||'')}`;
  const empty=()=>({version:1,active:null,bests:{},history:[]});
  const current=()=>!!state&&indoor==='home';
  const failure=e=>({ok:false,message:e?.message||'No se pudo guardar. Tu despensa se conserva.'});
  function load(){const raw=localStorage.getItem(key());if(!raw)return empty();const d=JSON.parse(raw);if(d?.version!==1||!d.bests||!Array.isArray(d.history))throw new Error('Este recetario guardado se conserva, pero esta versión no puede editarlo.');return d;}
  const write=d=>localStorage.setItem(key(),JSON.stringify(d));
  function recipes(){const have=dm55Ingredients();return DM55_RECIPES.filter(r=>supported.includes(r.id)).map(r=>({...clone(r),missing:Object.entries(r.needs).filter(([id,n])=>have[id]<n).map(([id,n])=>({id,need:n,have:have[id]||0}))}));}
  window.DosMundosKitchenLegacy=Object.freeze({
    get role(){return dm51LocalIdentity();},get open(){return current();},
    snapshot(){try{const d=load(),s=dm55Load();return {ok:true,...d,role:dm51LocalIdentity(),name:state?.name,money:state?.money,recipes:state?recipes():[],pantry:state?dm55Ingredients():{},meals:s.totalMeals,cookingXP:s.skills.cooking||0};}catch(e){return {...failure(e),...empty(),recipes:[],pantry:{}};}},
    create(recipe,practice=false){try{
      if(!current()||!supported.includes(recipe))return {ok:false,message:'Entra en casa para preparar uno de estos tres platos.'};
      const d=load();if(d.active&&d.active.status!=='served')return {ok:false,message:'Tienes una preparación pendiente. Retómala o descártala antes de empezar otra.'};
      const r=recipes().find(r=>r.id===recipe);if(!r)return {ok:false,message:'La receta original no está disponible.'};
      if(!practice&&r.missing.length)return {ok:false,message:'Faltan ingredientes. Abre la despensa o marca Ensayo gratis.'};
      d.active={id:'c-'+crypto.randomUUID(),recipe,practice:!!practice,role:dm51LocalIdentity(),name:state.name,status:'playing',createdAt:Date.now(),model:null};write(d);return {ok:true,ticket:clone(d.active)};
    }catch(e){return failure(e);}},
    saveRun(id,model){try{const d=load(),a=d.active;if(!a||a.id!==id||a.status==='served'||a.role!==dm51LocalIdentity()||a.name!==state.name)return {ok:false,message:'Esta preparación pertenece a otra sesión.'};
      if(model?.version!==1||model.recipe!==a.recipe||!Number.isFinite(model.elapsed)||model.elapsed<0||model.elapsed>7200)return {ok:false,message:'No se puede conservar esta preparación.'};
      a.model=clone(model);write(d);return {ok:true};}catch(e){return failure(e);}},
    abandon(id){try{const d=load();if(d.active?.id===id){d.active=null;write(d);}return {ok:true};}catch(e){return failure(e);}},
    act(recipe,id,result){
      if(!current())return {ok:false,message:'Vuelve a la cocina de casa para servir.'};
      let captured=null,before=null,life=null,owner=null,barrio=null,garden=null;
      const owned=k=>k.startsWith('dos-mundos-')||k.startsWith('dm58-life-');
      try{
        const d=load(),a=d.active;
        if(!a||a.id!==id||a.recipe!==recipe||a.role!==dm51LocalIdentity()||a.name!==state.name)return {ok:false,message:'Esta preparación no corresponde a tu personaje.'};
        if(a.status==='served')return {ok:true,already:true,message:'Este plato ya se sirvió una sola vez.'};
        if(a.model?.phase!=='done'||a.model.completed?.length!==4||!result?.effort||result.recipe!==recipe||!Number.isInteger(result.score)||result.score<0||result.score>1000||result.score!==a.model.score)return {ok:false,message:'Termina los cuatro pasos antes de servir.'};
        const r=recipes().find(r=>r.id===recipe);if(!r||!a.practice&&r.missing.length)return {ok:false,message:'Faltan ingredientes para servir. La preparación queda guardada; puedes comprar y volver.'};
        captured=Object.fromEntries(Object.entries(localStorage).filter(([k])=>owned(k)));before=clone(state);life=dm55Store?clone(dm55Store):null;owner=dm55Owner;barrio=clone(dm54DB);garden=dm58Store?clone(dm58Store):null;
        if(!a.practice){
          // Reuse the original callback rather than copying hunger, XP, daily
          // quests or ingredient handling. It also recognises Barrio Vivo food.
          const previous=document.getElementById('dm55-overlay');previous?.remove();
          let overlay;
          try{
            const meals=dm55Load().totalMeals;dm55Show('cook');overlay=document.getElementById('dm55-overlay');overlay.style.setProperty('display','none','important');
            const button=[...overlay.querySelectorAll('.dm55-area button')].find(b=>b.textContent.startsWith(r.label+' · '));
            if(!button||button.disabled)throw new Error('La receta original no está disponible.');
            button.click();if(dm55Load().totalMeals!==meals+1)throw new Error('No se pudo completar la receta original.');
          }finally{overlay?.remove();if(previous)document.body.append(previous);}
        }
        const entry={id:a.id,recipe,practice:a.practice,score:result.score,quality:result.quality,elapsed:result.elapsed,at:Date.now()};
        d.history=[entry,...d.history.filter(h=>h.id!==id)].slice(0,30);
        if(!a.practice&&(!d.bests[recipe]||d.bests[recipe].score<entry.score))d.bests[recipe]=entry;
        a.status='served';a.result=entry;write(d);
        // The original helpers catch storage errors; explicit writes expose a
        // failed meal so the whole local transaction can be restored.
        if(!a.practice){localStorage.setItem(KEY,JSON.stringify(state));localStorage.setItem(dm55Owner,JSON.stringify(dm55Store));localStorage.setItem(dm54Key(),JSON.stringify(dm54DB));}
        return {ok:true,entry,message:a.practice?'Ensayo guardado. No cambian ingredientes, minutos, alimentación ni XP.':r.label+' servido. Ingredientes y recompensa de tu receta habitual; una sola vez.'};
      }catch(e){
        if(captured){state=before;dm55Store=life;dm55Owner=owner;dm54DB=barrio;dm58Store=garden;
          try{for(const k of Object.keys(localStorage))if(owned(k)&&!(k in captured))localStorage.removeItem(k);for(const [k,v] of Object.entries(captured))if(localStorage.getItem(k)!==v)localStorage.setItem(k,v);}catch{}
          try{refreshUI();}catch{}
        }
        return {ok:false,message:'No se pudo guardar el plato. Se conserva tu despensa y el progreso anterior; puedes reintentar.'};
      }
    }
  });
}
export const kitchenBridgeSource=()=>`(${installLegacyKitchenBridge.toString()})();\n`;
