import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GYM,gymContains} from '../src/interiors/gym-map.mjs';
import {canStand,clearSegment,findPath,moveSafely,nearestApproach} from '../src/engine/navigation.mjs';

test('every gym machine and all four zones have reachable clear approaches',()=>{
  assert.ok(canStand(GYM.spawn,GYM));assert.equal(gymContains(GYM.spawn,GYM.exit),false);
  for(const object of GYM.objects){
    const option=nearestApproach(GYM.spawn,object,GYM);assert.ok(option,object.id);
    let previous=GYM.spawn;
    for(const target of option.path){assert.ok(clearSegment(previous,target,GYM),object.id);assert.equal(gymContains(target,GYM.exit),false,object.id);previous=target;}
  }
  for(const route of GYM.routes)assert.ok(findPath(GYM.spawn,route.point,GYM),route.id);
});
test('large movement cannot pass through treadmill, silks mat or walls',()=>{
  assert.ok(moveSafely({x:668,y:282},0,-400,GYM).y>=268);
  assert.ok(moveSafely({x:132,y:748},0,-300,GYM).y>=718);
  assert.ok(moveSafely({x:40,y:470},-200,0,GYM).x>=30);
});
test('paths connect the four zones without crossing furniture or the exit',()=>{
  for(const from of GYM.routes)for(const to of GYM.routes){
    const path=findPath(from.point,to.point,GYM);assert.ok(path,from.id+'-'+to.id);
    let previous=from.point;
    for(const point of path){assert.ok(clearSegment(previous,point,GYM));assert.equal(gymContains(point,GYM.exit),false);previous=point;}
  }
});
test('both aerial stations have room to approach and authored equipment frames',async()=>{
  const atlas=JSON.parse(await readFile(new URL('../assets/gym/gym-atlas.json',import.meta.url),'utf8'));
  assert.equal(Object.keys(atlas.frames).length,24);
  for(const object of [...GYM.objects,...GYM.mirrors.map(box=>({...box,sprite:'mirror'}))]){
    const frame=atlas.frames[object.sprite];assert.ok(frame,object.sprite);
    const [x,y,w,h]=frame;assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=atlas.width&&y+h<=atlas.height,object.sprite);
  }
  const silks=GYM.objects.filter(object=>object.action==='silks');assert.equal(silks.length,2);
  for(const station of silks){assert.ok(canStand(station.approaches[0],GYM));assert.ok(station.h>=200);assert.ok(station.exercise);}
});
