import {HouseScene} from './house-scene.mjs?rendimiento=12';
import {installCityActions} from '../ui/city-actions.mjs';

const api = window.DosMundosLegacy;
if (!api) throw new Error('No se ha instalado el adaptador de la casa.');
installCityActions();
let scene = null;

async function enter() {
  if (api.room !== 'home') return;
  api.stopOldAnimation();
  if (scene) return;
  scene = new HouseScene(api);
  try { await scene.mount(); }
  catch (error) {
    scene?.destroy(); scene = null;
    console.error('Casa RPG:', error);
    api.resumeOldAnimation();
    const message = document.getElementById('roomHot');
    if (message) message.textContent = 'La casa anterior sigue disponible. No se pudo cargar la nueva escena: ' + error.message;
  }
}
function leave() { scene?.destroy(); scene = null; }

window.addEventListener('dos-mundos:house', event => {
  if (event.detail.type === 'enter') enter(); else leave();
});
window.addEventListener('pagehide', () => scene?.save());
// Keep the existing entry button, but let it lead into the actual house scene.
// Dates and the album remain available from the house menu.
document.addEventListener('click', event => {
  if (!event.target.closest?.('#dm61-open')) return;
  event.preventDefault(); event.stopImmediatePropagation();
  document.getElementById('goHome')?.click();
}, true);
window.DosMundosHouse = Object.freeze({getSnapshot: () => scene?.snapshot() || null});
window.DosMundosKitchen=Object.freeze({getSnapshot:()=>scene?.cooking?.snapshot()||null,open:recipe=>scene?.startCookingRoute(recipe)});
// Keep all five quick recipes, adding one entry into the playable kitchen.
new MutationObserver(records=>{
  if(!records.some(r=>r.target.classList?.contains('dm55-area')||[...r.addedNodes].some(n=>n.id==='dm55-overlay')))return;
  const area=document.querySelector('#dm55-overlay .dm55-area');
  if(api.room!=='home'||!scene?.ready||!area||!area.querySelector('h3')?.textContent.includes('Recetario')||area.querySelector('.dm-kitchen-native-entry'))return;
  const button=document.createElement('button');button.type='button';button.className='dm55-button dm-kitchen-native-entry';button.textContent='Cocinar jugando · 3 platos';button.onclick=()=>scene.startCookingRoute();area.prepend(button);
}).observe(document.body,{childList:true,subtree:true});
if (api.room === 'home') enter();
const badge = document.getElementById('dm33Badge');
if (badge) badge.textContent = 'DOS MUNDOS · NUESTRA CASA';
