import test from 'node:test';
import assert from 'node:assert/strict';
import {HOUSE} from '../src/interiors/house-map.mjs';
import {canStand, clearSegment, distance, findPath, moveSafely, nearestApproach} from '../src/engine/navigation.mjs';

test('all four rooms, their doors and every object have a reachable approach', () => {
  assert.equal(canStand(HOUSE.spawn, HOUSE), true);
  for (const door of HOUSE.doors) assert.ok(findPath(HOUSE.spawn, door, HOUSE), door.id);
  for (const object of HOUSE.objects) {
    const option = nearestApproach(HOUSE.spawn, object, HOUSE);
    assert.ok(option, object.id);
    let previous = HOUSE.spawn;
    for (const point of option.path) {
      assert.equal(clearSegment(previous, point, HOUSE), true, object.id);
      previous = point;
    }
  }
});

test('large movement deltas cannot tunnel through the sofa or bedroom partition', () => {
  const sofa = moveSafely({x: 128, y: 424}, 0, -300, HOUSE);
  assert.ok(sofa.y >= 420);
  const wall = moveSafely({x: 360, y: 180}, 150, 0, HOUSE);
  assert.ok(wall.x <= 386);
  assert.equal(canStand(sofa, HOUSE), true);
  assert.equal(canStand(wall, HOUSE), true);
});

test('paths through the hallway stay collision-free including smoothing', () => {
  const from = {x: 204, y: 160}, to = {x: 672, y: 164};
  const path = findPath(from, to, HOUSE);
  assert.ok(path && path.length > 1);
  let previous = from;
  for (const point of path) {
    for (let t = 0; t <= 1; t += .05) assert.ok(canStand({x: previous.x + (point.x - previous.x) * t,
      y: previous.y + (point.y - previous.y) * t}, HOUSE));
    previous = point;
  }
  assert.ok(distance(previous, to) < 1);
});

test('blocked and invalid spawn positions cannot create an unsafe path', () => {
  assert.equal(canStand({x: -1, y: 40}, HOUSE), false);
  assert.equal(canStand({x: 150, y: 150}, HOUSE), false);
  assert.equal(findPath({x: 150, y: 150}, HOUSE.spawn, HOUSE), null);
  assert.equal(findPath({x: NaN, y: 200}, HOUSE.spawn, HOUSE), null);
});

test('the sofa has two distinct seat anchors with safe standing positions', () => {
  assert.equal(HOUSE.seats.length, 2);
  assert.notEqual(HOUSE.seats[0].id, HOUSE.seats[1].id);
  assert.ok(distance(HOUSE.seats[0], HOUSE.seats[1]) >= 40);
  for (const seat of HOUSE.seats) assert.ok(canStand(seat.approach, HOUSE));
});

test('the movement integrator can follow planned paths to every furniture item', () => {
  for (const object of HOUSE.objects) {
    const option = nearestApproach(HOUSE.spawn, object, HOUSE);
    let current = {...HOUSE.spawn};
    for (const target of option.path) {
      let steps = 0;
      while (distance(current, target) > .1 && steps++ < 1000) {
        const length = distance(current, target), delta = Math.min(1.75, length);
        current = moveSafely(current, (target.x - current.x) / length * delta,
          (target.y - current.y) / length * delta, HOUSE);
      }
      assert.ok(steps < 1000, object.id + ' path became stuck');
    }
  }
});
