// Keep legacy values as strings: parsing/re-serializing them can lose fields.
export const FORMAT = 'dos-mundos-backup';
export const VERSION = 1;
export const MAX_BYTES = 40 * 1024 * 1024;

export function isGameKey(key) {
  return typeof key === 'string' && /^(dos-mundos-|dm58-life-)/.test(key);
}

export function readLocal(storage = localStorage) {
  const entries = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (isGameKey(key)) entries.push([key, storage.getItem(key)]);
  }
  return Object.fromEntries(entries.sort(([a], [b]) => a.localeCompare(b)));
}

export function validatePayload(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data) ||
      !data.local || typeof data.local !== 'object' || Array.isArray(data.local) ||
      !Array.isArray(data.photos)) throw new Error('Copia incompleta.');
  const keys = Object.keys(data.local);
  if (keys.length > 1000) throw new Error('Demasiadas claves en la copia.');
  for (const key of keys) {
    if (!isGameKey(key) || typeof data.local[key] !== 'string') {
      throw new Error('La copia contiene una clave ajena al juego o un valor inválido.');
    }
  }
  const ids = new Set();
  for (const photo of data.photos) {
    if (!photo || typeof photo.id !== 'string' || !photo.id || ids.has(photo.id) ||
        typeof photo.src !== 'string' ||
        !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo.src)) {
      throw new Error('Recuerdo del museo inválido o duplicado.');
    }
    ids.add(photo.id);
  }
  if (new TextEncoder().encode(JSON.stringify(data)).length > MAX_BYTES) {
    throw new Error('La copia supera 40 MB.');
  }
  return data;
}

function canonical(data) {
  // Property order in photo records is retained on export/import.
  const order = (a, b) => a < b ? -1 : a > b ? 1 : 0;
  return JSON.stringify({local: Object.fromEntries(Object.entries(data.local)
    .sort(([a], [b]) => order(a, b))),
  photos: [...data.photos].sort((a, b) => order(a.id, b.id))});
}

export async function fingerprint(data) {
  const bytes = new TextEncoder().encode(canonical(data));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}

export async function pack(data, origin = location.origin) {
  validatePayload(data);
  const envelope = {format: FORMAT, version: VERSION, createdAt: new Date().toISOString(),
    origin, checksum: await fingerprint(data), data};
  if (new TextEncoder().encode(JSON.stringify(envelope, null, 2)).length > MAX_BYTES) {
    throw new Error('La copia supera 40 MB.');
  }
  return envelope;
}

export async function unpack(text) {
  if (new TextEncoder().encode(text).length > MAX_BYTES) throw new Error('La copia supera 40 MB.');
  let backup;
  try { backup = JSON.parse(text); } catch { throw new Error('El archivo no es un JSON válido.'); }
  if (backup?.format !== FORMAT || backup.version !== VERSION ||
      typeof backup.createdAt !== 'string' || !Number.isFinite(Date.parse(backup.createdAt)) ||
      typeof backup.origin !== 'string') throw new Error('Formato de copia no compatible.');
  validatePayload(backup.data);
  if (backup.checksum !== await fingerprint(backup.data)) {
    throw new Error('La copia está dañada: su huella no coincide.');
  }
  return backup;
}

export function mergePayload(current, incoming) {
  validatePayload(current);
  validatePayload(incoming);
  const photos = new Map(current.photos.map(photo => [photo.id, photo]));
  for (const photo of incoming.photos) photos.set(photo.id, photo);
  return validatePayload({local: {...current.local, ...incoming.local}, photos: [...photos.values()]});
}

export function writeLocal(values, storage = localStorage) {
  const before = readLocal(storage);
  try {
    for (const [key, value] of Object.entries(values)) storage.setItem(key, value);
  } catch (error) {
    // Roll back only attempted keys. Never clear all storage or another app's data.
    // Free space first, so a newly added key cannot prevent restoring an old one.
    for (const key of Object.keys(values)) storage.removeItem(key);
    for (const key of Object.keys(values)) {
      if (Object.hasOwn(before, key)) storage.setItem(key, before[key]);
    }
    throw error;
  }
}
