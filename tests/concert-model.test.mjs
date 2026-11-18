import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ARTISTS,trackURL,embedURL} from '../src/concerts/catalogue.mjs';
import {ANCHOR,ROTATION_MS,programme,ConcertStore,storeKey,presenceLabel,readPresence,encodeConcert} from '../src/concerts/concert-model.mjs';
const memoryStorage=()=>{const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};
test('the bill changes at the same UTC instant on both phones and stays fixed for three real days',()=>{
  const now=Date.UTC(2026,10,18,23,59),a=programme(now),b=programme(Date.parse(new Date(now).toISOString()));assert.deepEqual(a,b);assert.deepEqual(programme(a.startsAt),a);assert.deepEqual(programme(a.endsAt-1),a);assert.notDeepEqual(programme(a.endsAt).artists,a.artists);assert.equal(a.endsAt-a.startsAt,ROTATION_MS);
});
test('each bill mixes the radio and the couple playlist with no immediate repeats for the current disjoint pools',()=>{
  let previous=[];const seen=new Set();for(let i=-20;i<30;i++){const p=programme(ANCHOR+i*ROTATION_MS);assert.equal(p.artists.length,3);assert.equal(new Set(p.artists.map(a=>a.id)).size,3);assert.ok(p.artists.some(a=>a.tastes.includes('shared')));assert.ok(p.artists.some(a=>a.tastes.includes('gabi')));assert.ok(p.artists.every(a=>!previous.includes(a.id)),`edition ${i}`);previous=p.artists.map(a=>a.id);for(const a of p.artists)seen.add(a.id);}assert.equal(seen.size,ARTISTS.length);
});
test('a single playlist, overlapping tastes and short pools still yield unique entries',()=>{
  for(const cat of [[],ARTISTS.slice(0,1),ARTISTS.slice(0,4),[{id:'a',tastes:['shared','gabi']},{id:'b',tastes:['gabi']}],ARTISTS.map(a=>({...a,tastes:['jc','gabi']}))])for(let i=0;i<8;i++){const p=programme(ANCHOR+i*ROTATION_MS,cat);assert.equal(p.artists.length,Math.min(3,cat.length));assert.equal(new Set(p.artists.map(a=>a.id)).size,p.artists.length);}
});
test('memories are per character, idempotent per concert, and never modify old saves',()=>{
  const storage=memoryStorage(),jc=new ConcertStore({role:'jc',name:'JC QA'},storage),gabi=new ConcertStore({role:'gabi',name:'Gabi QA'},storage);storage.setItem('dos-mundos-v29','{ raw legacy value }');storage.setItem('dos-mundos-61-duo-v1','{ keep album }');const first=jc.remember(10,ARTISTS[0],{name:'Gabi'},1700000000000);assert.equal(first.memory.with,'gabi');assert.ok(jc.remember(10,ARTISTS[0]).already);assert.equal(jc.memories().length,1);assert.equal(gabi.memories().length,0);assert.ok(gabi.remember(10,ARTISTS[0]).ok);assert.equal(gabi.memories()[0].with,null);assert.equal(storage.getItem('dos-mundos-v29'),'{ raw legacy value }');assert.equal(storage.getItem('dos-mundos-61-duo-v1'),'{ keep album }');
});
test('unknown versions, corrupt records and storage failures are preserved without a false success',()=>{
  const storage=memoryStorage(),id={role:'jc',name:'JC'},store=new ConcertStore(id,storage),key=storeKey(id);for(const raw of ['{broken','{"version":77,"custom":"keep"}','{"version":1,"memories":null}']){storage.setItem(key,raw);assert.equal(store.remember(1,ARTISTS[0]).ok,false);assert.equal(storage.getItem(key),raw);}storage.setItem(key,'{"version":1,"memories":[]}');storage.setItem=()=>{throw new Error('QA quota');};assert.equal(store.remember(1,ARTISTS[0]).ok,false);assert.equal(store.memories().length,0);
});
test('presence reuses existing coordinates and place, and rejects stale, offline or different gigs',()=>{
  const now=1700000000000,peer={...encodeConcert({x:507,y:600,face:'up'}),name:'Gabi',online:true,room:'park',updated:now,place:presenceLabel(12,'strokes','dance')};assert.equal(readPresence(peer,12,'strokes',now).pose,'dance');assert.ok(Math.abs(readPresence(peer,12,'strokes',now).x-507)<.001);
  for(const change of [{online:false},{room:'plaza'},{updated:now-46000},{roomX:Infinity},{roomY:146},{place:presenceLabel(11,'strokes','dance')},{place:presenceLabel(12,'alice','dance')},{place:'Concierto · 12 · strokes · unknown'}])assert.equal(readPresence({...peer,...change},12,'strokes',now),null);
});
test('song links use verified Spotify track identifiers, never previews or arbitrary URLs',()=>{
  for(const artist of ARTISTS)for(const track of artist.tracks){assert.match(trackURL(track),/^https:\/\/open.spotify.com\/track\/[a-zA-Z0-9]{22}$/);assert.match(embedURL(track),/^https:\/\/open.spotify.com\/embed\/track\//);}assert.equal(trackURL({uri:'javascript:alert(1)'}),null);assert.equal(embedURL({}),null);
});
test('original atlases match their declared checksums and every band has a valid distinct sprite frame',()=>{
  const data=JSON.parse(readFileSync(new URL('../assets/concerts/concert-atlas.json',import.meta.url)));for(const sheet of [data,data.shared]){const bytes=readFileSync(new URL('../assets/concerts/'+sheet.image,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),sheet.sha256);assert.equal(bytes.readUInt32BE(16),sheet.width);assert.equal(bytes.readUInt32BE(20),sheet.height);for(const [x,y,w,h] of Object.values(sheet.frames)){assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=sheet.width&&y+h<=sheet.height);}}
  const keys=ARTISTS.map(a=>a.art);assert.equal(new Set(keys).size,ARTISTS.length);for(const key of keys)assert.ok(data.frames[key]||data.shared.frames[key]);
});
