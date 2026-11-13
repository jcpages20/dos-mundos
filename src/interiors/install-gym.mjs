import {GymScene} from './gym-scene.mjs';

const api=window.DosMundosGymLegacy;
let scene=null;
async function enter(){
  if(!api?.open||scene)return;
  const candidate=new GymScene(api);scene=candidate;
  try{await candidate.mount();}
  catch(error){
    candidate.destroy();if(scene!==candidate)return;scene=null;
    if(api.open){api.resume();const message=document.getElementById('dm56-message');if(message)message.textContent='El gimnasio anterior sigue disponible. '+error.message;}
    console.warn('Atlas:',error);
  }
}
function leave(){scene?.destroy();scene=null;}
window.addEventListener('dos-mundos:gym',event=>{if(event.detail.type==='enter')enter();else leave();});
window.addEventListener('pagehide',()=>scene?.save());
window.DosMundosGym=Object.freeze({getSnapshot:()=>scene?.snapshot()||null});
if(api?.open)enter();
