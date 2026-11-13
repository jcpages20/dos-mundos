import test from 'node:test';
import assert from 'node:assert/strict';
import {MAPS,encodePosition,decodePosition} from '../src/outdoors/outdoor-maps.mjs';
import {canStand,clearSegment,nearestApproach,moveSafely} from '../src/engine/navigation.mjs';
import {distanceToSeat} from '../src/outdoors/outdoor-seats.mjs';

test('every Madrid landmark and bench has a collision-free reachable approach',()=>{
  for(const map of Object.values(MAPS)){
    assert.ok(canStand(map.spawn,map));
    for(const object of map.targets){const result=nearestApproach(map.spawn,object,map);assert.ok(result,object.id);
      let before=map.spawn;for(const p of result.path){assert.ok(clearSegment(before,p,map),object.id);before=p;}}
  }
});
test('water and building bases block movement; both exits remain open',()=>{
  for(const map of Object.values(MAPS)){
    assert.ok(clearSegment(map.spawn,{x:640,y:936},map));
    for(const o of map.objects.filter(o=>o.solid)){
      const s=o.solid;assert.equal(canStand({x:s.x+s.w/2,y:s.y+s.h/2},map),false,o.id);
    }
  }
  const p=moveSafely({x:720,y:475},250,0,MAPS.park);assert.ok(p.x<=754);assert.equal(canStand({x:920,y:460},MAPS.park),false);
});
test('all NPC anchors can be approached without entering furniture or water',()=>{
  for(const map of Object.values(MAPS))for(const p of map.people){assert.ok(canStand(p,map));assert.ok(nearestApproach(map.spawn,{approaches:[{x:p.x,y:p.y+40}]},map));}
});
test('JC and Gabi have distinct seats and positions fit the existing Firebase schema',()=>{
  for(const map of Object.values(MAPS))for(const o of map.objects.filter(o=>o.seats)){
    assert.notDeepEqual(o.seats[0],o.seats[1]);
    for(const s of o.seats){const encoded=encodePosition(s,map),decoded=decodePosition({roomX:Math.round(encoded.roomX),roomY:Math.round(encoded.roomY)},map);
      assert.ok(encoded.roomX>=28&&encoded.roomX<=484);assert.ok(encoded.roomY>=146&&encoded.roomY<=290);
      assert.ok(Math.hypot(s.x-decoded.x,s.y-decoded.y)<4);assert.equal(distanceToSeat(decoded,map).object.id,o.id);}
  }
});
