import {OutdoorScene} from './outdoor-scene.mjs';
const api=window.DosMundosOutdoorLegacy;let scene=null;
function leave(){scene?.destroy();scene=null;}
async function enter(){
  if(!api?.open)return;if(scene?.map.id===api.room)return;leave();const candidate=new OutdoorScene(api);scene=candidate;
  try{await candidate.mount();}catch(error){candidate.destroy();if(scene!==candidate)return;scene=null;if(api.open)api.resume();console.warn('Madrid conserva sus actividades anteriores:',error);}
}
window.addEventListener('dos-mundos:outdoors',event=>{if(event.detail.type==='enter')enter();else if(event.detail.type==='leave')leave();});
window.addEventListener('pagehide',()=>scene?.save());
window.DosMundosOutdoors=Object.freeze({getSnapshot:()=>scene?.snapshot()||null});
if(api?.open)enter();
