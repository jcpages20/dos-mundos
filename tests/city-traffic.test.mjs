import test from 'node:test';
import assert from 'node:assert/strict';
import {CITY,createTraffic,stepTraffic} from '../src/world/city-layout.mjs';

test('traffic stays in both asphalt lanes, with fourteen independent cars',()=>{
  const cars=createTraffic();assert.equal(cars.length,14);
  for(let now=0;now<60000;now+=100){
    stepTraffic(cars,.1,now);
    for(const car of cars){
      const streets=car.axis==='x'?CITY.roadsY:CITY.roadsX;
      assert.ok(streets.some(center=>car.lane===center+14||car.lane===center+40));
      const length=car.axis==='x'?CITY.width:CITY.height;
      assert.ok(car.position>=-60&&car.position<=length+60);
    }
  }
});

test('cars stop before red crossings and resume on green',()=>{
  const car={axis:'y',lane:270,position:210,direction:1,speed:40};
  stepTraffic([car],.1,100);assert.equal(car.position,212);
  stepTraffic([car],.1,200);assert.equal(car.position,212);
  stepTraffic([car],.1,8100);assert.equal(car.position,216);
  const reverse={axis:'x',lane:276,position:340,direction:-1,speed:60};
  stepTraffic([reverse],.1,8100);assert.equal(reverse.position,335);
  stepTraffic([reverse],.1,8200);assert.equal(reverse.position,335);
  stepTraffic([reverse],.1,16100);assert.equal(reverse.position,329);
});

test('returning from a hidden tab cannot jump a red signal or jump across town',()=>{
  const car={axis:'y',lane:270,position:210,direction:1,speed:40};
  stepTraffic([car],20,100);assert.equal(car.position,212);
  stepTraffic([car],20,8100);assert.equal(car.position,216.8);
});
