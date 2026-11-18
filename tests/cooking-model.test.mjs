import test from 'node:test';
import assert from 'node:assert/strict';
import {CookingGame} from '../src/kitchen/cooking-model.mjs';
import {DISHES,cutLine,servingSource} from '../src/kitchen/recipes.mjs';
const advance=(g,t)=>{for(let n=0;n<t-1e-8;n+=.02)g.update(Math.min(.02,t-n));};
const circles=(g,n)=>{g.begin(.72,.6);for(let i=1;i<=Math.ceil(n*48);i++){const a=i/48*Math.PI*2;g.move(.5+Math.cos(a)*.22,.6+Math.sin(a)*.22);}g.end(.72,.6);};
function finishStep(g){
 const s=g.state,step=g.step;
 if(step.kind==='cut'){for(let i=0;i<step.cuts;i++){const x=cutLine(step,i);g.begin(x,.35);g.end(x,.85);}}
 else if(step.kind==='mix'){for(const x of [.32,.68]){g.begin(x,.54);g.end(x,.54);}circles(g,3.1);}
 else if(step.kind==='wash')circles(g,3.1);
 else if(step.kind==='plate'){for(let i=0;i<3;i++){const p=servingSource(i);g.begin(p.x,p.y);g.end(.5,.67);}}
 else{g.setHeat(.55);if(step.turns)circles(g,2.1);advance(g,11);if(step.flip){g.begin(.5,.8);g.end(.5,.4);}advance(g,3);if(step.drain){g.begin(.5,.6);g.end(.86,.65);}}
 assert.equal(g.state.phase,'stepDone',step.kind);g.next();
}
test('three original recipes have different four-step preparations and match the native ingredients',()=>{
 assert.deepEqual(Object.keys(DISHES),['omelet','pasta','chickenrice']);assert.deepEqual(DISHES.omelet.needs,{egg:2,veg:1});assert.deepEqual(DISHES.pasta.needs,{pasta:1,tomato:1,cheese:1});assert.deepEqual(DISHES.chickenrice.needs,{chicken:1,rice:1,veg:1});
 assert.equal(new Set(Object.values(DISHES).map(d=>d.steps.map(s=>s.kind).join(','))).size,3);
});
test('all three dishes can be finished using actual gesture paths and controlled heat',()=>{
 for(const recipe of Object.keys(DISHES)){const g=new CookingGame(recipe);g.start();for(let i=0;i<4;i++)finishStep(g);const r=g.result();assert.equal(r.recipe,recipe);assert.equal(r.effort,true);assert.equal(r.steps.length,4);assert.ok(r.score>=950,JSON.stringify(r));}
});
test('cutting needs a long stroke along the next guide; taps and horizontal drags do not cut',()=>{
 const g=new CookingGame('omelet');g.start();const x=cutLine(g.step,0);g.begin(x,.6);g.end(x,.6);g.begin(.3,.6);g.end(.7,.6);assert.equal(g.state.cuts.length,0);g.begin(x,.35);g.end(x,.85);assert.deepEqual(g.state.cuts,[0]);assert.ok(g.state.errors>=2);
});
test('stirring checks a circle around the bowl and cannot farm turns by tapping or wiggling',()=>{
 const g=new CookingGame('chickenrice');g.start();finishStep(g);for(let i=0;i<20;i++){g.begin(.5,.6);g.move(.51,.61);g.end(.51,.61);}assert.equal(g.state.turns,0);circles(g,1);assert.ok(g.state.turns>.95);assert.equal(g.state.phase,'playing');circles(g,2.1);assert.equal(g.state.phase,'stepDone');
});
test('eggs must be cracked before mixing and each egg is used once',()=>{
 const g=new CookingGame('omelet');g.start();finishStep(g);circles(g,4);assert.equal(g.state.turns,0);g.crack();g.crack();g.crack();assert.equal(g.state.eggs,2);circles(g,3.1);assert.equal(g.state.phase,'stepDone');
});
test('heat, flipping and draining are distinct actions; idle preparations never become a served meal',()=>{
 const g=new CookingGame('omelet');g.start();finishStep(g);finishStep(g);advance(g,45);assert.equal(g.state.cooked,0);g.flip();assert.equal(g.state.flipped,false);g.setHeat(.55);advance(g,14);assert.equal(g.state.phase,'playing');g.flip();assert.equal(g.state.phase,'stepDone');
 const p=new CookingGame('pasta');p.start();finishStep(p);p.drain();assert.equal(p.state.drained,false);p.setHeat(.55);advance(p,14);assert.equal(p.state.phase,'playing');p.drain();assert.equal(p.state.phase,'stepDone');
});
test('overheating changes quality and repeating a step permits a clean attempt',()=>{
 const g=new CookingGame('chickenrice');g.start();finishStep(g);finishStep(g);g.setHeat(1);circles(g,2.1);advance(g,14);assert.equal(g.state.phase,'stepDone');assert.ok(g.grade()<.5);g.retry();g.setHeat(.55);circles(g,2.1);advance(g,14);assert.ok(g.grade()>.95);assert.equal(g.state.completed.length,2);
});
test('plating requires a source and a drop on the plate; one portion cannot be counted twice',()=>{
 const g=new CookingGame('omelet');g.start();for(let i=0;i<3;i++)finishStep(g);const p=servingSource(0);g.begin(p.x,p.y);g.end(.9,.9);assert.equal(g.state.plated.length,0);g.begin(p.x,p.y);g.end(.5,.67);g.begin(p.x,p.y);g.end(.5,.67);assert.deepEqual(g.state.plated,[0]);
});
test('pause and restored saves keep steps, heat and timer but never resume a held gesture',()=>{
 const g=new CookingGame('pasta');g.start();finishStep(g);g.setHeat(.55);advance(g,3);g.begin(.5,.6);g.pause();const raw=g.snapshot();advance(g,15);assert.deepEqual(g.snapshot(),raw);const r=CookingGame.restore(raw);assert.equal(r.state.paused,true);assert.equal(r.pointer,null);r.resume();advance(r,1);assert.ok(r.state.cooked>g.state.cooked);
 for(const bad of [{...raw,version:9},{...raw,heat:NaN},{...raw,plated:[0,0]},{...raw,completed:[]},{...raw,step:8}])assert.throws(()=>CookingGame.restore(bad));
});
test('accessible controls complete the same tasks and cannot advance an unfinished step',()=>{
 const g=new CookingGame('omelet');g.start();assert.equal(g.next(),false);for(let i=0;i<5;i++)g.cut();g.next();g.crack();g.crack();for(let i=0;i<12;i++)g.stirQuarter();g.next();g.setHeat(.55);advance(g,11);g.flip();advance(g,3);g.next();for(let i=0;i<3;i++)g.plate(i);g.next();assert.equal(g.result().effort,true);assert.ok(g.result().score>950);
});
test('shorter cuts allow finger drift in either vertical direction but still need a real stroke',()=>{
 const g=new CookingGame('omelet');g.start();
 for(let i=0;i<5;i++){const x=cutLine(g.step,i)+.085,up=i%2;g.begin(x,up?.71:.46);g.end(x+.035,up?.46:.71);assert.equal(g.state.cuts.length,i+1);}
 assert.equal(g.state.phase,'stepDone');assert.ok(g.grade()>.7);
});
test('assisted cuts reject taps, sideways movement and strokes outside the board or target',()=>{
 const g=new CookingGame('pasta');g.start();
 for(const [a,b] of [[[.34,.6],[.34,.6]],[[.3,.6],[.6,.6]],[[.95,.4],[.95,.8]],[[.34,.01],[.34,.25]],[[.34,.53],[.34,.62]]]){g.begin(...a);g.end(...b);}
 assert.deepEqual(g.state.cuts,[]);assert.equal(g.state.phase,'playing');
});
test('small oval stirring works clockwise and counterclockwise even with sparse samples',()=>{
 for(const direction of [-1,1]){
  const g=new CookingGame('chickenrice');g.start();finishStep(g);g.begin(.595,.6);
  for(let i=1;i<=20;i++){const a=i/6*Math.PI*2*direction;g.move(.5+Math.cos(a)*.095,.6+Math.sin(a)*.065);}
  g.end(.595,.6);assert.equal(g.state.phase,'stepDone');assert.ok(g.state.turns>=3);
 }
});
test('stirring jitter cannot accumulate turns and a slight reversal does not erase progress',()=>{
 const g=new CookingGame('chickenrice');g.start();finishStep(g);g.begin(.7,.6);
 for(let i=0;i<400;i++){const a=(i%2?.15:0);g.move(.5+Math.cos(a)*.2,.6+Math.sin(a)*.2);}assert.ok(g.state.turns<.03);
 for(let i=1;i<=24;i++){const a=i/24*Math.PI*2;g.move(.5+Math.cos(a)*.2,.6+Math.sin(a)*.2);}const turns=g.state.turns;g.move(.5+Math.cos(-.1)*.2,.6+Math.sin(-.1)*.2);assert.equal(g.state.turns,turns);
});
test('stirring can continue with a different direction after lifting or restoring a preparation',()=>{
 const g=new CookingGame('chickenrice');g.start();finishStep(g);circles(g,1);const raw=g.snapshot(),r=CookingGame.restore(raw);r.resume();r.begin(.72,.6);
 for(let i=1;i<=110;i++){const a=-i/48*Math.PI*2;r.move(.5+Math.cos(a)*.22,.6+Math.sin(a)*.22);}r.end(.72,.6);assert.equal(r.state.phase,'stepDone');assert.equal(r.state.version,1);
});
test('plating picks the visible edge of food and accepts the rim while rejecting outside drops',()=>{
 const g=new CookingGame('omelet');g.start();for(let i=0;i<3;i++)finishStep(g);g.begin(.2,.53);assert.equal(g.pointer.drag,0);g.end(.77,.68);assert.deepEqual(g.state.plated,[0]);
 g.begin(.5,.53);assert.equal(g.pointer.drag,1);g.end(.95,.95);assert.deepEqual(g.state.plated,[0]);g.begin(.5,.53);g.end(.5,.88);assert.deepEqual(g.state.plated,[0,1]);
});
test('a canceled drag or a contact that did not pick food cannot add a portion',()=>{
 const g=new CookingGame('omelet');g.start();for(let i=0;i<3;i++)finishStep(g);g.begin(.2,.53);g.move(.5,.67);g.cancelGesture();g.end(.5,.67);assert.deepEqual(g.state.plated,[]);assert.match(g.state.feedback,/vuelve arriba/);g.begin(.95,.1);g.end(.5,.67);assert.deepEqual(g.state.plated,[]);
});
test('exactly three full turns finish despite floating point roundoff at different sampling rates',()=>{
 for(const samples of [6,12,36,48])for(const direction of [-1,1]){
  const g=new CookingGame('chickenrice');g.start();finishStep(g);g.begin(.63,.6);
  for(let i=1;i<=samples*3;i++){const a=direction*i/samples*Math.PI*2;g.move(.5+Math.cos(a)*.13,.6+Math.sin(a)*.1);if(i===samples*2)assert.equal(g.state.phase,'playing');}
  g.end(.63,.6);assert.equal(g.state.phase,'stepDone',samples+':'+direction);assert.ok(g.state.turns>=3);
 }
});
