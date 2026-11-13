import {createSnapshot} from '../persistence/save-vault.mjs';
import {extendLegacyBuilder} from '../legacy/house-bridge.mjs?interiores=2';

async function start() {
  const response = await fetch(new URL('../../index6.3.html', import.meta.url));
  if (!response.ok) throw new Error('No se encuentra la versión original del juego.');
  const source = new DOMParser().parseFromString(await response.text(), 'text/html');
  const scripts = [...source.querySelectorAll('script')];
  const builder = scripts.find(script => !script.type && script.textContent.includes('frame.srcdoc = game;'));
  const controller = source.querySelector('#dm60-controller');
  if (!builder || !controller || !source.getElementById('dm-art-source')) {
    throw new Error('La versión original cambió. Puedes abrir 6.1 desde el enlace inferior.');
  }
  const code = extendLegacyBuilder(builder.textContent, {
    stylesURL: new URL('../../styles/house.css', import.meta.url).href,
    installerURL: new URL('../interiors/install-house.mjs?casa=3', import.meta.url).href
  });
  for (const style of source.head.querySelectorAll('style')) document.head.append(style.cloneNode(true));
  for (const element of [...source.body.children]) {
    if (element.tagName === 'SCRIPT' && !element.type) continue;
    document.body.append(element.cloneNode(true));
  }
  document.getElementById('house-start').hidden = true;
  for (const text of [code, controller.textContent]) {
    const script = document.createElement('script'); script.textContent = text; document.body.append(script);
  }
}

const message = document.getElementById('house-start-status');
try {
  await createSnapshot('before-house-rpg-v1');
  await start();
} catch (error) {
  message.textContent = 'No se pudo preparar la casa: ' + error.message;
  const button = document.getElementById('house-continue');
  button.hidden = false;
  button.onclick = async () => {
    button.disabled = true;
    try { await start(); } catch (failure) { message.textContent = failure.message; button.disabled = false; }
  };
}
