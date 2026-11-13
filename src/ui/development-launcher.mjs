import {createSnapshot} from '../persistence/save-vault.mjs';

const status = document.querySelector('#backup-status');
const frame = document.querySelector('#development-game');
function launch() {
  const url = new URL('../../index6.3.html', import.meta.url);
  url.search = location.search; // Preserve ?gabi=1 and ?carta=1, including replay.
  url.hash = location.hash;
  frame.src = url.href;
  frame.hidden = false;
  document.querySelector('#launch-message').hidden = true;
}

try {
  await createSnapshot('before-development-6.3');
  status.textContent = 'Copia local lista · Desarrollo 6.3+';
  launch();
} catch (error) {
  status.textContent = 'No se pudo crear la copia local';
  document.querySelector('#launch-detail').textContent =
    'Tu partida sigue intacta. ' + error.message + ' Puedes abrir Mis copias o continuar.';
  const button = document.querySelector('#continue-without-backup');
  button.hidden = false;
  button.onclick = launch;
}
