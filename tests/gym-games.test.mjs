import test from 'node:test';
import assert from 'node:assert/strict';
import {GymGame,parseCode,codeFor} from '../src/gym-games/model.mjs';
const advance=(g,seconds)=>{for(let t=0;t<seconds-1e-7;t+=.01)g.update(Math.min(.01,seconds-t));};
const tap=(g,key)=>{g.input(key,true);g.input(key,false);};

test('shared codes reproduce exactly the same sequences, targets and note timing',()=>{
  for(const type of ['weights','cardio','silks','stretch'])for(const level of ['suave','normal','reto']){
    const spec=parseCode(codeFor(type,level,0xf32ab));assert.deepEqual(spec,{type,level,seed:0xf32ab});assert.deepEqual(new GymGame(type,level,spec.seed).snapshot(),new GymGame(type,level,spec.seed).snapshot());}
  for(const code of ['ATLAS-T-N-ZZZZZZ','ATLAS-X-N-000001','<script>',''])assert.equal(parseCode(code),null);
  assert.deepEqual(parseCode('ATLAS-T-S-000B15 · 930/1000'),{type:'silks',level:'suave',seed:0xb15});
});
test('strength rewards controlled releases instead of rapid taps or holding forever',()=>{
  const g=new GymGame('weights','normal',51);g.start();
  for(let i=0;i<8;i++){g.input('action',true);advance(g,g.state.targets[i]/.58);g.input('action',false);advance(g,.6);}
  assert.equal(g.result().score,1000);assert.equal(g.result().maxCombo,8);assert.ok(g.result().effort);
  const rushed=new GymGame('weights');rushed.start();for(let i=0;i<8;i++){tap(rushed,'action');advance(rushed,.6);}assert.equal(rushed.result().score,0);
  const held=new GymGame('weights');held.start();held.input('action',true);advance(held,40);assert.equal(held.state.phase,'done');assert.equal(held.result().effort,false);
});
test('cardio judges timing and correct side and cannot score one note twice',()=>{
  const g=new GymGame('cardio','normal',3);g.start();for(const note of g.state.notes){advance(g,note.at-g.state.elapsed);tap(g,note.side);tap(g,note.side);}
  advance(g,1);assert.equal(g.result().score,1000);assert.equal(g.result().hits,12);
  const wrong=new GymGame('cardio');wrong.start();advance(wrong,1.8);tap(wrong,'right');assert.equal(wrong.state.notes[0].result,'miss');assert.equal(wrong.state.hits,0);
});
test('silks combines remembered sequences, active balance and a timed figure',()=>{
  const g=new GymGame('silks','normal',721);g.start();
  while(['preview','sequence'].includes(g.state.phase)){
    if(g.state.phase==='preview')advance(g,2.31);
    if(g.state.phase==='sequence'){for(const direction of [...g.state.sequences[g.state.sequence]])tap(g,direction);}
  }
  assert.equal(g.state.phase,'balance');let guard=0;
  while(g.state.phase==='balance'&&guard++<1000){const s=g.state;if(s.balance>.04){g.input('left',true);g.input('right',false);}else if(s.balance<-.04){g.input('right',true);g.input('left',false);}else{g.input('left',false);g.input('right',false);}g.update(.01);}
  while(g.needle()<.72)g.update(.005);tap(g,'action');const result=g.result();assert.ok(result.score>=950);assert.ok(result.effort);assert.equal(result.errors,0);assert.ok(result.balanced>95);
});
test('silks has a bounded recovery path after wrong moves or no response',()=>{
  const g=new GymGame('silks','reto',9);g.start();advance(g,1.81);const wanted=g.state.sequences[0][0];tap(g,wanted==='left'?'right':'left');assert.equal(g.state.index,0);assert.equal(g.state.errors,1);
  advance(g,100);assert.equal(g.state.phase,'done');assert.equal(g.result().effort,false);assert.ok(g.result().score>=0&&g.result().score<=1000);
});
test('mobility follows alternating hold and release instead of rewarding an idle screen',()=>{
  const g=new GymGame('stretch');g.start();for(let i=0;i<5;i++){g.input('action',true);advance(g,2);g.input('action',false);advance(g,2);}assert.ok(g.result().score>995);assert.ok(g.result().effort);
  const idle=new GymGame('stretch');idle.start();advance(idle,21);assert.equal(idle.result().effort,false);
});
test('pause and saved restoration do not consume seconds or leave held controls stuck',()=>{
  const g=new GymGame('weights','suave',44);g.start();g.input('action',true);advance(g,.5);g.pause();const paused=g.snapshot();advance(g,40);assert.deepEqual(g.snapshot(),paused);
  const restored=GymGame.restore(paused);assert.equal(restored.state.paused,true);assert.equal(restored.state.held.length,0);restored.resume();advance(restored,.1);assert.ok(restored.state.elapsed>paused.elapsed);
  assert.throws(()=>GymGame.restore({version:99}));
  assert.throws(()=>GymGame.restore({...paused,notes:null}));assert.throws(()=>GymGame.restore({...paused,targets:[NaN]}));
});
test('different frame rates produce equivalent scoring for the same cardio timings',()=>{
  const play=step=>{const g=new GymGame('cardio','normal',7);g.start();for(const n of g.state.notes){while(n.at-g.state.elapsed>step)g.update(step);g.update(n.at-g.state.elapsed);tap(g,n.side);}while(g.state.phase!=='done')g.update(step);return g.result().score;};
  assert.equal(play(.016),play(.04));
});
