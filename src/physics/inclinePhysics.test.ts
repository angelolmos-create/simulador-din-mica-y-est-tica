import test from 'node:test';
import assert from 'node:assert/strict';
import { computeInclinePhysics } from './inclinePhysics';

test('incline physics: frictionless ramp at 30 deg accelerates at g*sin(30) = 4.9 m/s^2', () => {
  const res = computeInclinePhysics({ mass: 5, theta: 30, muS: 0, muK: 0 });
  assert.equal(res.state, 'slide');
  assert.ok(Math.abs(res.acceleration - 4.9) < 1e-6);
  assert.ok(Math.abs(res.parallel - 24.5) < 1e-6);
});

test('incline physics: static equilibrium below critical angle', () => {
  const res = computeInclinePhysics({ mass: 5, theta: 20, muS: 0.6, muK: 0.4 });
  assert.equal(res.state, 'rest');
  assert.equal(res.acceleration, 0);
  assert.ok(Math.abs(res.friction - res.parallel) < 1e-6);
});

test('incline physics: critical angle is independent of mass', () => {
  const light = computeInclinePhysics({ mass: 5, theta: 25, muS: 0.5, muK: 0.35 });
  const heavy = computeInclinePhysics({ mass: 15, theta: 25, muS: 0.5, muK: 0.35 });
  assert.equal(light.state, 'rest');
  assert.equal(heavy.state, 'rest');
  assert.ok(Math.abs(light.criticalAngle - heavy.criticalAngle) < 1e-9);
});

test('incline physics: slides above critical angle using kinetic friction', () => {
  const res = computeInclinePhysics({ mass: 5, theta: 45, muS: 0.4, muK: 0.3 });
  assert.equal(res.state, 'slide');
  assert.ok(res.acceleration > 0);
  assert.ok(Math.abs(res.friction - res.muK * res.normal) < 1e-6);
});
