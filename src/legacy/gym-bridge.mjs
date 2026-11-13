import {drawGym} from '../venues/gym.mjs';

export function installLegacyGymBridge(render) {
  const originalDraw=dm56Gym,originalOpen=dm56OpenVenue,originalAct=dm56Act;
  dm56Gym=function(g,time){try{render(g,time,Number(state?.time)||0);}catch(error){dm56Gym=originalDraw;originalDraw(g,time);console.warn('Gimnasio: vista anterior recuperada',error);}};
  function refresh(){
    if(dm56Scene?.id!=='gym')return;
    const panel=dm56Scene.overlay.querySelector('.dm-gym-progress');if(!panel)return;
    const count=dm56Progress().fitness;
    panel.textContent=count+(count===1?' sesión':' sesiones')+' · Nivel físico '+(1+Math.floor(count/4))+' · Energía '+Math.round(state.energy)+'/100';
  }
  dm56Act=function(action){const result=originalAct(action);refresh();return result;};
  dm56OpenVenue=function(id){
    const result=originalOpen(id);if(id!=='gym'||dm56Scene?.id!=='gym')return result;
    const root=dm56Scene.overlay;root.dataset.gym='';
    root.querySelector('.dm56-brand small').textContent='DOS MUNDOS · UN POCO MÁS FUERTE';
    root.querySelector('h2').textContent='Club Atlas';
    root.querySelector('.dm56-brand p').textContent='Pesas, cardio y una pausa para recuperar el ritmo.';
    root.querySelector('.dm56-helper').textContent='Toca una zona de entrenamiento o elige tu actividad';
    root.querySelector('#dm56-message').setAttribute('aria-live','polite');
    const panel=document.createElement('div');panel.className='dm-gym-progress';panel.setAttribute('aria-live','polite');
    root.querySelector('.dm56-footer').prepend(panel);
    root.querySelectorAll('.dm56-action').forEach((button,index)=>button.dataset.gymAction=dm56Venues.gym.actions[index].id);
    refresh();return result;
  };
}
export function gymBridgeSource(){return `(${installLegacyGymBridge.toString()})(${drawGym.toString()});\n`;}
