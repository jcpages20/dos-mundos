import {MAX_BYTES} from '../persistence/save-format.mjs';
import {createSnapshot, listSnapshots, exportCurrent, previewImport, restoreImport} from '../persistence/save-vault.mjs';

const $ = selector => document.querySelector(selector);
let preview = null;
let busy = false;
function report(message) { $('#vault-status').textContent = message; }
function download(text, name) {
  const url = URL.createObjectURL(new Blob([text], {type: 'application/json'}));
  const link = document.createElement('a');
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function name(envelope) {
  return 'dos-mundos-' + envelope.createdAt.replace(/[:.]/g, '-') + '.json';
}
function cancel() {
  preview = null;
  $('#import-preview').hidden = true;
  $('#closed-games').checked = false;
  $('#restore-backup').disabled = true;
}
async function review(text) {
  cancel();
  preview = await previewImport(text);
  const {backup, conflicts, photoConflicts} = preview;
  $('#preview-summary').textContent = new Date(backup.createdAt).toLocaleString('es-ES') +
    ' · ' + Object.keys(backup.data.local).length + ' claves · ' + backup.data.photos.length +
    ' fotos. Cambiarán ' + conflicts.length + ' claves existentes y ' + photoConflicts.length + ' fotos existentes.';
  $('#preview-origin').textContent = backup.origin === location.origin ?
    'Copia de este sitio.' : 'Copia creada en otro sitio: ' + backup.origin;
  $('#preview-keys').replaceChildren(...Object.keys(backup.data.local).map(key => {
    const item = document.createElement('li'); item.textContent = key; return item;
  }));
  $('#import-preview').hidden = false;
  report('Copia verificada. Revisa su contenido antes de recuperarla.');
}
async function refresh() {
  const list = $('#snapshot-list');
  const records = await listSnapshots();
  list.replaceChildren();
  if (!records.length) list.textContent = 'Todavía no hay copias.';
  for (const {envelope, reason} of records) {
    const item = document.createElement('li');
    const title = document.createElement('p');
    title.textContent = new Date(envelope.createdAt).toLocaleString('es-ES') +
      (reason === 'before-restore' ? ' · Antes de recuperar una copia' : ' · Progreso local');
    const save = document.createElement('button'); save.textContent = 'Descargar';
    save.onclick = () => download(JSON.stringify(envelope, null, 2), name(envelope));
    const recover = document.createElement('button'); recover.textContent = 'Revisar para recuperar';
    recover.className = 'secondary';
    recover.onclick = () => run(async () => {
      await review(JSON.stringify(envelope));
      $('#import-preview').scrollIntoView({block: 'start', behavior: 'smooth'});
    });
    item.append(title, save, recover); list.append(item);
  }
}
async function run(action) {
  if (busy) return;
  busy = true;
  $('#restore-backup').disabled = true;
  try { await action(); }
  catch (error) { report('No se ha completado la operación: ' + error.message); }
  finally {
    busy = false;
    $('#restore-backup').disabled = !preview || !$('#closed-games').checked;
  }
}
$('#closed-games').onchange = () => {
  $('#restore-backup').disabled = busy || !preview || !$('#closed-games').checked;
};
$('#cancel-import').onclick = () => { cancel(); report('Recuperación cancelada. Tu progreso sigue intacto.'); };
$('#import-file').onchange = () => run(async () => {
  cancel();
  const file = $('#import-file').files[0];
  if (!file) return;
  if (file.size > MAX_BYTES) throw new Error('La copia supera 40 MB.');
  await review(await file.text());
});
$('#restore-backup').onclick = () => run(async () => {
  if (!preview || !$('#closed-games').checked) return;
  await restoreImport(preview);
  cancel();
  report('Progreso recuperado. El estado anterior también está en tus copias. Vuelve al juego para cargarlo.');
  await refresh();
});
$('#export-current').onclick = () => run(async () => {
  const text = await exportCurrent();
  download(text, name(JSON.parse(text)));
  report('Copia descargada. Guárdala en un lugar donde puedas encontrarla.');
});
await run(async () => {
  await createSnapshot('open-backup-tool');
  await refresh();
  report('Tu progreso local está protegido con una copia en este navegador.');
});
// Export is read-only and can work even if the snapshot vault is full.
$('#export-current').disabled = false;
