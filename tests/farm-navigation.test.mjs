import test from 'node:test';
import assert from 'node:assert/strict';
import {FARM} from '../src/farm/farm-map.mjs';
import {canStand,nearestApproach,moveSafely,clearSegment} from '../src/engine/navigation.mjs';
import {cropStatus} from '../src/farm/farm-model.mjs';

test('all twelve plots and every piece of farm furniture have reachable approaches',()=>{
  assert.ok(canStand(FARM.spawn,FARM));assert.equal(FARM.plots.length,12);
  for(const object of FARM.targets){const result=nearestApproach(FARM.spawn,object,FARM);assert.ok(result,object.id);
    let before=FARM.spawn;for(const p of result.path){assert.ok(clearSegment(before,p,FARM),object.id);before=p;}}
});
test('plots and the greenhouse block movement and the exit remains reachable',()=>{
  const plot=FARM.plots[0],p=moveSafely({x:plot.x+111,y:plot.y+111},0,-200,FARM);
  assert.ok(p.y>=plot.collision.y+plot.collision.h+6);
  assert.ok(clearSegment(FARM.spawn,{x:552,y:876},FARM));
});
test('legacy growth, drought, recovery and sale value retain their original rules',()=>{
  const now=1800000000000,catalog={tomato:{name:'Tomates',hours:9,yield:19}};
  const plant={type:'tomato',planted:now-10*36e5,watered:now,health:70,dryApplied:0};
  const ready=cropStatus(plant,catalog,now);assert.equal(ready.growth,100);assert.equal(ready.earnings,13);assert.ok(ready.ready);
  const dry={...plant,watered:now-48*36e5,health:100};
  assert.equal(cropStatus(dry,catalog,now).health,40);assert.equal(dry.health,100);
  assert.equal(cropStatus({...dry,health:40,dryApplied:5},catalog,now).health,40);
  assert.equal(cropStatus({...plant,health:10},catalog,now).ready,false);
});
test('future timestamps cannot grow a crop and unknown legacy types remain visible',()=>{
  const cfg={basil:{name:'Albahaca',hours:5,yield:12}};
  assert.equal(cropStatus({type:'basil',planted:2000,watered:2000,health:100},cfg,1000).growth,0);
  assert.deepEqual(cropStatus({type:'future-crop'},cfg,1000),{unknown:true,type:'future-crop'});
});
