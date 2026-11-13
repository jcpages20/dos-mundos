import {HouseScene} from './house-scene.mjs?casa=3';
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
if (api.room === 'home') enter();
const badge = document.getElementById('dm33Badge');
if (badge) badge.textContent = 'DOS MUNDOS · NUESTRA CASA';
