import {CITY_LANDMARKS} from '../world/city-landmarks.mjs';

export function installLegacyFarmBridge(landmarks){
  const notify=type=>window.dispatchEvent(new CustomEvent('dos-mundos:farm',{detail:{type}}));
  const cityChanged=()=>window.dispatchEvent(new CustomEvent('dos-mundos:city-state'));
  const originalOpen=dm58Show,originalPlace=openPlace,originalBlocked=blockedPoint,originalNearby=currentNearby;
  const active=()=>dm58Opened==='garden'&&!!document.getElementById('dm58-overlay');
  const clone=v=>JSON.parse(JSON.stringify(v));
  const gameKey=k=>k.startsWith('dos-mundos-')||k.startsWith('dm58-life-');
  function capture(){return Object.fromEntries(Object.entries(localStorage).filter(([k])=>gameKey(k)));}
  function transaction(fn){
    let raw,before,store,life,owner;
    try{
      raw=capture();before=clone(state);store=dm58Store?clone(dm58Store):null;
      life=dm55Store?clone(dm55Store):null;owner=dm55Owner;
      const current=JSON.parse(localStorage.getItem(KEY)||'null');
      if(current&&(current.name!==state.name||current.money!==state.money))return {ok:false,message:'La partida cambió en otra pestaña. Recarga antes de continuar.'};
      dm58Store=null;dm58Load();
      const result=fn();if(!result.ok)return result;
      // Native helpers preserve time, needs, goals and health. Explicit writes
      // make storage failures observable instead of silently granting free items.
      localStorage.setItem(dm58Key(),JSON.stringify(dm58Store));
      localStorage.setItem(KEY,JSON.stringify(state));
      return result;
    }catch(error){
      if(before)state=before;
      if(raw){try{
        for(const k of Object.keys(localStorage))if(gameKey(k)&&!(k in raw))localStorage.removeItem(k);
        for(const [k,v] of Object.entries(raw))if(localStorage.getItem(k)!==v)localStorage.setItem(k,v);
      }catch{/* The automatic vault snapshot remains available if storage is unavailable. */}}
      dm58Store=store;dm55Store=life;dm55Owner=owner;
      if(before)try{refreshUI();}catch{}
      return {ok:false,message:'No se pudo guardar la acción. Se conserva el progreso anterior. Libera espacio y vuelve a intentarlo.'};
    }
  }
  function close(){notify('leave');document.getElementById('dm58-overlay')?.remove();dm58Opened=null;
    if(state&&!indoor&&tab==='world'){drawMap();startStreetAnimation();}cityChanged();}
  dm58Show=function(id){
    notify('leave');originalOpen(id);
    const root=document.getElementById('dm58-overlay');
    const x=root?.querySelector('.dm58-head button');if(x)x.onclick=close;
    if(root)root.addEventListener('click',event=>{if(event.target===root)close();});
    cityChanged();if(id==='garden')notify('enter');
  };
  openPlace=function(id){if(landmarks.some(p=>p.id===id)){dm58Show(id);return;}originalPlace(id);};
  currentNearby=function(){
    const p=originalNearby();if(p||!state)return p;
    return landmarks.find(p=>{const q=routeToEntrance(p);return Math.hypot(state.x-q.x,state.y-q.y)<=36;})||null;
  };
  blockedPoint=function(x,y){return originalBlocked(x,y)||landmarks.some(p=>x>p.x-12&&x<p.x+p.w+12&&y>p.y-12&&y<p.y+p.h+8);};
  const map=document.getElementById('map');
  map.addEventListener('click',event=>{
    if(!state||indoor||tab!=='world'||document.getElementById('dm58-overlay'))return;
    const r=map.getBoundingClientRect(),cam=viewOffset();
    const x=(event.clientX-r.left)*map.width/r.width+cam.x,y=(event.clientY-r.top)*map.height/r.height+cam.y;
    const p=landmarks.find(p=>x>=p.x-12&&x<=p.x+p.w+12&&y>=p.y-28&&y<=p.y+p.h+20);
    if(p){event.preventDefault();event.stopImmediatePropagation();const entrance=routeToEntrance(p);walkToward(entrance.x,entrance.y,p.id);}
  },true);
  window.DosMundosFarmLegacy=Object.freeze({
    landmarks:clone(landmarks),get open(){return active();},get role(){return dm51LocalIdentity();},
    snapshot(){
      if(!state)return null;const p=dm58Load();
      return {name:state.name,role:dm51LocalIdentity(),money:state.money,day:state.day,time:state.time,
        x:state.x,y:state.y,city:state.city,district:state.district,weather:{...dm40Weather(state.day,state.time)},
        plants:clone(p.garden),harvests:p.harvests,catalog:clone(DM58_PLANTS),key:dm58Key()};
    },
    pause(){stopStreetAnimation();const root=document.getElementById('dm58-overlay');if(root){root.hidden=true;root.inert=true;}},
    resume(){const root=document.getElementById('dm58-overlay');if(root){root.hidden=false;root.inert=false;const body=root.querySelector('.dm58-body');if(body)dm58Garden(body);}},
    exit:close,
    act(type,index,seed,stamp){
      if(!active()||!state)return {ok:false,message:'Vuelve a entrar en el huerto.'};
      if(!Number.isInteger(index)||index<0||index>=12)return {ok:false,message:'Elige una parcela válida.'};
      return transaction(()=>{
        const p=dm58Load();
        if(type==='expand'){
          if(index!==p.garden.length||p.garden.length>=12)return {ok:false,message:'Amplía primero la siguiente parcela disponible.'};
          if(state.money<25)return {ok:false,message:'Necesitas 25 € para preparar otra parcela.'};
          state.money-=25;p.garden.push(null);dm58Time(30);dm58Save();
          return {ok:true,message:'Parcela '+(index+1)+' preparada. Ahora puedes sembrar en ella.'};
        }
        if(index>=p.garden.length)return {ok:false,message:'Esta parcela todavía no está preparada.'};
        const plant=p.garden[index];
        if(type==='plant'){
          const cfg=Object.hasOwn(DM58_PLANTS,seed)?DM58_PLANTS[seed]:null;
          if(plant||!cfg)return {ok:false,message:'Elige una parcela vacía y una semilla del catálogo.'};
          if(state.money<cfg.cost)return {ok:false,message:'No tienes dinero suficiente para esas semillas.'};
          state.money-=cfg.cost;p.garden[index]={type:seed,planted:Date.now(),watered:Date.now(),dryApplied:0,health:100};
          refreshUI();dm58Save();return {ok:true,message:'Has sembrado '+cfg.name.toLowerCase()+'. Crecerá aunque cierres el juego.'};
        }
        if(!plant||plant.planted!==stamp)return {ok:false,message:'La parcela ha cambiado. Revisa su estado antes de actuar.'};
        const status=dm58Tick(plant);
        if(!status)return {ok:false,message:'Se conserva este cultivo anterior. No se ha modificado.'};
        if(type==='water'){
          plant.watered=Date.now();plant.dryApplied=0;plant.health=Math.min(100,(plant.health||100)+12);
          dm58Time(10);dm58Save();return {ok:true,message:'Has regado '+status.cfg.name+'. Salud '+plant.health+'/100.'};
        }
        if(type==='fertilize'){
          if(status.health>=100)return {ok:false,message:'Esta planta ya tiene toda su salud. No necesitas gastar abono.'};
          if(state.money<3)return {ok:false,message:'Necesitas 3 € para abonar esta parcela.'};
          state.money-=3;plant.health=Math.min(100,plant.health+20);dm58Time(15);dm58Save();
          return {ok:true,message:'Abono aplicado. Salud '+plant.health+'/100.'};
        }
        if(type==='harvest'){
          if(!status.ready)return {ok:false,message:status.growth<100?'Todavía está creciendo. Vuelve cuando madure.':'Necesita recuperar salud. Riega o abona la planta.'};
          const earnings=Math.round(status.cfg.yield*status.health/100);
          dm58AddMoney(earnings);dm58Time(15);p.harvests++;p.garden[index]=null;dm58Save();
          return {ok:true,message:'Cosecha recogida y vendida: +'+earnings+' €. La parcela vuelve a estar libre.',earnings};
        }
        return {ok:false,message:'Elige sembrar, regar, abonar o cosechar.'};
      });
    }
  });
}
export const farmBridgeSource=()=>`(${installLegacyFarmBridge.toString()})(${JSON.stringify(CITY_LANDMARKS)});\n`;
