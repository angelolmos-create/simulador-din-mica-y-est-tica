import test from 'node:test';
import assert from 'node:assert/strict';
import { computePulleyPhysics } from './pulleyPhysics';

test('pulley physics: equal masses in Atwood machine stay in equilibrium', () => {
  const res = computePulleyPhysics({
    setup: 'atwood',
    m1: 5,
    m2: 5,
    axleFriction: 0,
    loadMass: 10,
    pullForce: 49,
  });
  assert.equal(res.netForce, 0);
  assert.equal(res.acceleration, 0);
  assert.ok(Math.abs(res.tension - 49) < 1e-6);
  assert.equal(res.predMatchKey, 'eq');
});

test('pulley physics: Atwood machine accelerates with total mass m1 + m2', () => {
  const res = computePulleyPhysics({
    setup: 'atwood',
    m1: 4,
    m2: 8,
    axleFriction: 0,
    loadMass: 10,
    pullForce: 49,
  });
  const expectedAcc = ((8 - 4) * 9.8) / 12;
  assert.ok(Math.abs(res.acceleration - expectedAcc) < 1e-6);
  assert.equal(res.predMatchKey, 'right');
});

test('pulley physics: movable pulley 2:1 holds 10 kg (98 N) with 49 N', () => {
  const eqRes = computePulleyPhysics({
    setup: 'movable',
    m1: 5,
    m2: 5,
    axleFriction: 0,
    loadMass: 10,
    pullForce: 49,
  });
  assert.ok(Math.abs(eqRes.netForce) < 1e-6);
  assert.equal(eqRes.predMatchKey, 'eq');

  const upRes = computePulleyPhysics({
    setup: 'movable',
    m1: 5,
    m2: 5,
    axleFriction: 0,
    loadMass: 10,
    pullForce: 64,
  });
  assert.ok(Math.abs(upRes.netForce - 30) < 1e-6);
  assert.ok(Math.abs(upRes.acceleration - 3.0) < 1e-6);
  assert.equal(upRes.predMatchKey, 'up');
});

test('pulley physics: Atwood axle friction produces different tensions T1 and T2 on each side', () => {
  // Held in static equilibrium by axle friction: T1 = W1, T2 = W2
  const staticRes = computePulleyPhysics({
    setup: 'atwood',
    m1: 5,
    m2: 6,
    axleFriction: 20,
    loadMass: 10,
    pullForce: 49,
  });
  assert.equal(staticRes.acceleration, 0);
  assert.ok(Math.abs(staticRes.tension1 - 5 * 9.8) < 1e-6);
  assert.ok(Math.abs(staticRes.tension2 - 6 * 9.8) < 1e-6);
  assert.ok(Math.abs((staticRes.tension2 - staticRes.tension1) - 9.8) < 1e-6);

  // Accelerating with axle friction = 15 N: T2 - T1 = 15 N
  const movingRes = computePulleyPhysics({
    setup: 'atwood',
    m1: 4,
    m2: 8,
    axleFriction: 15,
    loadMass: 10,
    pullForce: 49,
  });
  assert.ok(movingRes.acceleration > 0);
  assert.ok(Math.abs((movingRes.tension2 - movingRes.tension1) - 15) < 1e-6);
  assert.ok(Math.abs(movingRes.tension1 - 4 * (9.8 + movingRes.acceleration)) < 1e-6);
  assert.ok(Math.abs(movingRes.tension2 - 8 * (9.8 - movingRes.acceleration)) < 1e-6);
});
