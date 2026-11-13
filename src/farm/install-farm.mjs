import {FarmScene} from './farm-scene.mjs';
import {loadFarmAssets} from './farm-assets.mjs';
const api=window.DosMundosFarmLegacy;let scene=null;
async function enter(){
  if(!api?.open||scene)return;const candidate=new FarmScene(api);scene=candidate;
  try{await candidate.mount();if(!candidate.disposed)window.DosMundosCityLegacy?.installFarmArt(candidate.renderer.art);}
  catch(error){candidate.destroy();if(scene!==candidate)return;scene=null;if(api.open)api.resume();console.warn('Huerto:',error);}
}
function leave(){scene?.destroy();scene=null;}
window.addEventListener('dos-mundos:farm',event=>{if(event.detail.type==='enter')enter();else leave();});
new MutationObserver(()=>{if(scene&&!api.open){leave();window.dispatchEvent(new CustomEvent('dos-mundos:city-state'));}}).observe(document.body,{childList:true});
window.addEventListener('pagehide',()=>scene?.save());
window.DosMundosFarm=Object.freeze({getSnapshot:()=>scene?.snapshot()||null});
loadFarmAssets().then(art=>window.DosMundosCityLegacy?.installFarmArt(art)).catch(error=>console.warn('Ilustraciones del huerto:',error));
if(api?.open)enter();
