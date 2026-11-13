// Executed inside the historical closure. Existing workouts retain their own
// time, needs, experience, journal and session-count functions.
export function installLegacyGymWorldBridge(){
  const emit=type=>window.dispatchEvent(new CustomEvent('dos-mundos:gym',{detail:{type}}));
  const originalOpen=dm56OpenVenue,originalClose=dm56Close;
  dm56OpenVenue=function(id){const result=originalOpen(id);if(id==='gym'&&dm56Scene?.id==='gym')emit('enter');return result;};
  dm56Close=function(){if(dm56Scene?.id==='gym')emit('leave');originalClose();};
  function resume(){
    if(indoor!=='gym'||dm56Scene?.id!=='gym')return;
    const root=dm56Scene.overlay;root.hidden=false;root.inert=false;root.style.removeProperty('display');
    const panel=root.querySelector('.dm-gym-progress'),count=Number(dm56Progress().fitness)||0;
    if(panel)panel.textContent=count+(count===1?' sesión':' sesiones')+' · Nivel físico '+(1+Math.floor(count/4))+' · Energía '+Math.round(state.energy)+'/100';
    if(!dm56Frame)dm56Draw();
    if(!root.querySelector('.dm-gym-return')){
      const button=document.createElement('button');button.type='button';button.className='dm-gym-return';button.textContent='Volver al gimnasio amplio';
      button.onclick=()=>emit('enter');root.querySelector('.dm56-footer').append(button);
    }
    root.querySelector('.dm56-exit').focus({preventScroll:true});
  }
  window.DosMundosGymLegacy=Object.freeze({
    get room(){return indoor;},get role(){return dm51LocalIdentity();},
    get open(){return indoor==='gym'&&dm56Scene?.id==='gym';},
    snapshot(){
      const base=window.DosMundosLegacy.snapshot();if(!base)return null;
      const progress=dm56Progress(),life=dm55Load();
      return {...base,sessions:Number(progress.fitness)||0,fitnessXP:Number(life.skills.fitness)||0,
        aerialXP:Number(life.skills.aerial)||0,xp:Number(life.xp)||0};
    },
    pause(){
      if(!this.open)return;
      if(dm56Frame)cancelAnimationFrame(dm56Frame);dm56Frame=0;
      const root=dm56Scene.overlay;root.hidden=true;root.inert=true;root.style.display='none';
    },
    resume,
    legacy(){emit('leave');resume();},
    exit(){dm56Close();closeInterior();document.getElementById('enter')?.focus({preventScroll:true});document.getElementById('world')?.scrollIntoView({block:'start'});},
    act(type){
      if(!this.open)return {ok:false,message:'Entra en el gimnasio para usar el material.'};
      const before=Number(dm56Progress().fitness)||0;
      if(['weights','cardio','stretch','routine'].includes(type)){
        dm56Act({id:type});
        return {ok:type==='routine'||Number(dm56Progress().fitness)>before,message:document.getElementById('dm56-message')?.textContent||'Actividad del gimnasio.'};
      }
      const configs={
        silks:{mins:45,energy:-15,hunger:-6,fun:14,xp:18,skill:'fitness',label:'Has practicado una sesión de telas aéreas'},
        water:{mins:5,energy:3,fun:2,label:'Has bebido agua y hecho una pequeña pausa'},
        rest:{mins:15,energy:7,fun:2,label:'Has recuperado el aliento en el banco de descanso'}
      };
      if(!configs[type])return {ok:false,message:'Ese objeto se puede observar.'};
      const ok=dm56Effect(configs[type]);
      if(ok&&type==='silks'){
        const progress=dm56Progress();progress.fitness++;dm56SaveProgress(progress);
        const life=dm55Load();life.skills.aerial=(Number(life.skills.aerial)||0)+18;dm55Save();
      }
      return {ok,message:document.getElementById('dm56-message')?.textContent||'Una pausa en Atlas.'};
    }
  });
}
export function gymWorldBridgeSource(){return `(${installLegacyGymWorldBridge.toString()})();\n`;}
