import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Performance} from '../src/concerts/performance.mjs';
import {ARTISTS} from '../src/concerts/catalogue.mjs';
const advance=(show,seconds)=>{for(let t=0;t<seconds;t+=.05)show.update(.05);};
test('a show starts with a count-in but never invents Spotify playback or progress',()=>{
 const show=new Performance();assert.equal(show.phase,'ready');show.start();assert.equal(show.snapshot().countdown,3);advance(show,3.1);assert.equal(show.phase,'show');assert.equal(show.audio,'idle');assert.equal(show.position,0);assert.equal(show.duration,0);assert.equal(show.frame(120)>=0,true);
});
test('only provider playback is labelled live; pause, buffering and end remain distinct',()=>{
 const show=new Performance();show.start();advance(show,3.1);show.playback({status:'playing',position:1000,duration:30000});assert.equal(show.phase,'live');show.playback({status:'buffering'});assert.equal(show.phase,'show');show.playback({status:'paused',position:10000});assert.equal(show.phase,'paused');assert.equal(show.frame(120),0);show.playback({status:'paused',position:29900});assert.equal(show.phase,'finished');
});
test('the visible official play button can start the show without a separate start gesture',()=>{const show=new Performance();show.playback({status:'playing',position:500,duration:30000});assert.equal(show.phase,'live');assert.equal(show.started,true);});
test('a provider that resets to zero at the end still produces a finale',()=>{const show=new Performance();show.playback({status:'playing',position:29500,duration:30000});show.playback({status:'paused',position:0,duration:30000});assert.equal(show.phase,'finished');show.next();assert.equal(show.position,0);});
test('next songs reset real progress and unknown or invalid updates cannot falsify it',()=>{const show=new Performance();show.playback({status:'playing',position:3000,duration:30000});show.next();assert.equal(show.position,0);assert.equal(show.duration,0);show.playback({status:'invented',position:999});assert.equal(show.position,0);show.playback({status:'ready',position:-5,duration:NaN});assert.equal(show.position,0);assert.equal(show.duration,0);});
test('the articulated pose loop changes frames during the show and stays still before start',()=>{const show=new Performance();assert.equal(show.frame(120),0);show.start();advance(show,3.1);const frames=new Set();for(let i=0;i<40;i++){show.update(.05);frames.add(show.frame(120));}assert.deepEqual([...frames].sort(),[0,1,2]);});
test('nine acts have three different playable song titles and three distinct animation frames',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../assets/concerts/animation-atlas.json',import.meta.url)));for(const artist of ARTISTS){assert.equal(artist.tracks.length,3,artist.id);assert.equal(new Set(artist.tracks.map(t=>t.title.toLowerCase())).size,3);const sheet=Object.values(manifest.atlases).find(s=>s.frames[artist.id]);assert.ok(sheet);assert.equal(sheet.frames[artist.id].length,3);assert.equal(new Set(sheet.frames[artist.id].map(f=>f.join(','))).size,3);}
 for(const sheet of Object.values(manifest.atlases)){const bytes=readFileSync(new URL('../assets/concerts/'+sheet.image,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),sheet.sha256);assert.equal(bytes.readUInt32BE(16),sheet.width);assert.equal(bytes.readUInt32BE(20),sheet.height);for(const frames of Object.values(sheet.frames))for(const [x,y,w,h] of frames)assert.ok(x>=0&&y>=0&&x+w<=sheet.width&&y+h<=sheet.height);}
});
