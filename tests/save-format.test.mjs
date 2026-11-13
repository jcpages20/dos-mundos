import test from 'node:test';
import assert from 'node:assert/strict';
import {isGameKey, readLocal, pack, unpack, mergePayload, writeLocal} from '../src/persistence/save-format.mjs';

function storage(entries, shouldFail = () => false) {
  const values = new Map(entries);
  return {get length() { return values.size; }, key: i => [...values.keys()][i],
    getItem: key => values.get(key) ?? null, removeItem: key => values.delete(key),
    setItem: (key, value) => { if (shouldFail(key, value)) throw new Error('quota'); values.set(key, value); }};
}

test('capture includes all game namespaces and leaves other Pages projects/auth out', () => {
  const fake = storage([['dos-mundos-v29', 'raw'], ['dm58-life-jc-X', '{}'],
    ['dos-mundos-40-hogar:JC', '[]'], ['other-app', 'private'], ['firebase:authUser', 'token']]);
  assert.deepEqual(readLocal(fake), {'dm58-life-jc-X': '{}', 'dos-mundos-40-hogar:JC': '[]', 'dos-mundos-v29': 'raw'});
  assert.equal(isGameKey('firebase:authUser'), false);
});

test('roundtrip preserves exact legacy text, unknown fields, malformed old JSON and museum photos', async () => {
  const data = {local: {'dos-mundos-v29': '{ "money":753, "unknown": [1,2] }',
    'dos-mundos-v071': '{incompleto'},
  photos: [{id: 'memory', title: 'Prueba', who: 'JC', src: 'data:image/png;base64,YQ==', extra: 'keep'}]};
  const envelope = await pack(data, 'https://jcpages20.github.io');
  assert.deepEqual((await unpack(JSON.stringify(envelope))).data, data);
  envelope.data.local['dos-mundos-v29'] = 'changed';
  await assert.rejects(unpack(JSON.stringify(envelope)), /huella/);
});

test('rejects foreign storage, unsupported versions and malformed/duplicate photos before writes', async () => {
  await assert.rejects(pack({local: {'another-app': 'x'}, photos: []}, 'test'), /ajena/);
  await assert.rejects(unpack('{"format":"dos-mundos-backup","version":999}'), /compatible/);
  await assert.rejects(pack({local: {}, photos: [{id: 'x', src: 'https://private.example'}]}, 'test'), /inválido/);
  const photo = {id: 'x', src: 'data:image/png;base64,YQ=='};
  await assert.rejects(pack({local: {}, photos: [photo, photo]}, 'test'), /duplicado/);
});

test('restore merge retains absent keys and photos, and chooses incoming conflicts explicitly', () => {
  const original = {id: 'a', src: 'data:image/png;base64,YQ=='};
  const incoming = {id: 'b', src: 'data:image/png;base64,Yg=='};
  const data = mergePayload({local: {'dos-mundos-v29': 'old', 'dos-mundos-v07': 'keep'}, photos: [original]},
    {local: {'dos-mundos-v29': 'restore'}, photos: [incoming]});
  assert.deepEqual(data, {local: {'dos-mundos-v29': 'restore', 'dos-mundos-v07': 'keep'}, photos: [original, incoming]});
});

test('quota failure rolls back changed/new keys and leaves other apps untouched', () => {
  const fake = storage([['dos-mundos-v29', 'original'], ['other-app', 'keep']], (_, value) => value === 'fail');
  assert.throws(() => writeLocal({'dos-mundos-v29': 'changed', 'dos-mundos-new': 'added', 'dos-mundos-v07': 'fail'}, fake), /quota/);
  assert.deepEqual(readLocal(fake), {'dos-mundos-v29': 'original'});
  assert.equal(fake.getItem('other-app'), 'keep');
});
