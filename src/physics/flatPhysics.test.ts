import test from 'node:test';
import assert from 'node:assert/strict';
import { computeFlatPhysics, evaluateFlatPrediction } from './flatPhysics';

test('flat physics: static equilibrium when push <= max friction', () => {
  const res = computeFlatPhysics(50, 75, 100, 0);
  assert.equal(res.fr, -75);
  assert.equal(res.frType, 'static');
  assert.equal(res.fnet, 0);
  assert.equal(res.acc, 0);
  assert.equal(res.isStatic, true);
  assert.equal(evaluateFlatPrediction(res.acc, 0), 'rest');
});

test('flat physics: exceeds max friction and accelerates according to F = m*a', () => {
  const res = computeFlatPhysics(50, 150, 50, 0);
  assert.equal(res.fr, -50);
  assert.equal(res.frType, 'kinetic');
  assert.equal(res.fnet, 100);
  assert.equal(res.acc, 2);
  assert.equal(evaluateFlatPrediction(res.acc, 0), 'right');
});

test('flat physics: constant velocity when moving with balanced friction (1st law)', () => {
  const res = computeFlatPhysics(50, 150, 150, 4.0);
  assert.equal(res.fr, -150);
  assert.equal(res.fnet, 0);
  assert.equal(res.acc, 0);
  assert.equal(evaluateFlatPrediction(res.acc, 4.0), 'const');
});
