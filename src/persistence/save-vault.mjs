import {readLocal, pack, unpack, fingerprint, mergePayload, writeLocal} from './save-format.mjs';

const VAULT = 'dos-mundos-save-vault-v1';
const MUSEUM = 'dos-mundos-private-museum';
let pending = Promise.resolve();

function exclusive(task) {
  if (navigator.locks) return navigator.locks.request(VAULT, task);
  const result = pending.then(task);
  pending = result.catch(() => {});
  return result;
}

function openDatabase(name, upgrade) {
  return new Promise((resolve, reject) => {
    let blocked = false;
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => upgrade(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      blocked = true;
      reject(new Error('Cierra las otras pestañas del juego y vuelve a intentarlo.'));
    };
    request.onsuccess = () => {
      if (blocked) { request.result.close(); return; }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
}

async function transaction(name, store, mode, action) {
  const db = await openDatabase(name, db => {
    db.createObjectStore(store, {keyPath: 'id'});
  });
  return new Promise((resolve, reject) => {
    let result;
    const tx = db.transaction(store, mode);
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onabort = () => { db.close(); reject(tx.error || new Error('Operación cancelada.')); };
    tx.onerror = () => {}; // onabort reports the transaction error.
    try {
      const request = action(tx.objectStore(store));
      if (request) request.onsuccess = () => { result = request.result; };
    } catch (error) {
      tx.abort(); db.close(); reject(error);
    }
  });
}

// Reading a never-opened museum creates its empty store, but never adds photos.
export function readPhotos() {
  return transaction(MUSEUM, 'photos', 'readonly', store => store.getAll());
}

export async function capture() {
  const photos = await readPhotos();
  return {local: readLocal(), photos};
}

async function storeSnapshot(data, reason) {
  const envelope = await pack(data);
  const record = {id: crypto.randomUUID(), reason, envelope};
  await transaction(VAULT, 'snapshots', 'readwrite', store => store.add(record));
  // Do not prune automatically: the first recovery point must remain available.
  return record;
}

export function createSnapshot(reason = 'manual') {
  return exclusive(async () => {
    const data = await capture();
    const checksum = await fingerprint(data);
    const records = await listSnapshots();
    const identical = records.find(record => record.envelope.checksum === checksum);
    return identical || storeSnapshot(data, reason);
  });
}

export async function listSnapshots() {
  const records = await transaction(VAULT, 'snapshots', 'readonly', store => store.getAll());
  return records.sort((a, b) => b.envelope.createdAt.localeCompare(a.envelope.createdAt));
}

export async function exportCurrent() {
  // A download must remain possible even when the backup vault is full.
  return JSON.stringify(await pack(await capture()), null, 2);
}

export async function previewImport(text) {
  const backup = await unpack(text);
  const current = await capture();
  return {backup, currentChecksum: await fingerprint(current),
    conflicts: Object.keys(backup.data.local).filter(key =>
      Object.hasOwn(current.local, key) && current.local[key] !== backup.data.local[key]),
    photoConflicts: backup.data.photos.filter(photo => current.photos.some(other =>
      other.id === photo.id && JSON.stringify(other) !== JSON.stringify(photo))).map(photo => photo.id)};
}

export function restoreImport(preview) {
  return exclusive(async () => {
    // Revalidate even if the caller changed the preview object after inspecting it.
    const backup = await unpack(JSON.stringify(preview.backup));
    const before = await capture();
    if (await fingerprint(before) !== preview.currentChecksum) {
      throw new Error('La partida ha cambiado. Cierra el juego y vuelve a revisar la copia.');
    }
    const target = mergePayload(before, backup.data);
    // If the vault is unavailable/full, stop before touching any save.
    const recovery = await storeSnapshot(before, 'before-restore');
    if (await fingerprint(await capture()) !== preview.currentChecksum) {
      throw new Error('La partida ha cambiado durante la copia. Cierra las otras pestañas y revisa de nuevo.');
    }
    // Museum writes are atomic. LocalStorage writes are rolled back on quota errors.
    // If the browser closes mid-operation the durable recovery point remains available.
    await transaction(MUSEUM, 'photos', 'readwrite', store => {
      for (const photo of target.photos) store.put(photo);
    });
    try {
      writeLocal(target.local);
    } catch (error) {
      await transaction(MUSEUM, 'photos', 'readwrite', store => {
        store.clear();
        for (const photo of before.photos) store.put(photo);
      });
      throw error;
    }
    return recovery;
  });
}
