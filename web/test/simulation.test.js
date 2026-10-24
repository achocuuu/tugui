import test from 'node:test';
import assert from 'node:assert/strict';
import { advance, createSimulation, pressTurn, releaseTurn, samplePosition } from '../src/simulation.js';

test('automatic movement uses configured speed and integer logical centers', () => {
  const s = createSimulation({ speed: 4 });
  advance(s, .125);
  assert.equal(s.y, 11);
  assert.equal(s.progress, .5);
  assert.deepEqual(samplePosition(s), { x: 7, y: 10.5 });
  advance(s, .125);
  assert.equal(s.y, 10);
  assert.equal(s.progress, 0);
});

for (const [turn, direction, x] of [['left', 3, 6], ['right', 1, 8]]) {
  test(`${turn} applies at the next center, then moves in the new direction`, () => {
    const s = createSimulation();
    pressTurn(s, turn);
    assert.equal(s.direction, 0);
    advance(s, .5);
    assert.equal(s.direction, direction);
    assert.equal(s.y, 10);
    advance(s, .5);
    assert.equal(s.x, x);
    assert.equal(s.y, 10);
  });
}

test('first input wins even after release and an opposite press', () => {
  const s = createSimulation();
  assert.equal(pressTurn(s, 'left'), true);
  releaseTurn(s, 'left');
  assert.equal(pressTurn(s, 'right'), false);
  assert.equal(pressTurn(s, 'left'), false);
  advance(s, .5);
  assert.equal(s.direction, 3);
});

test('turning preserves elapsed movement and remainder across a center', () => {
  const s = createSimulation();
  advance(s, .375);
  pressTurn(s, 'right');
  assert.equal(s.progress, .75);
  advance(s, .25);
  assert.equal(s.y, 10);
  assert.equal(s.direction, 1);
  assert.equal(s.progress, .25);
  assert.deepEqual(samplePosition(s), { x: 7.25, y: 10 });
});

test('held keys cannot repeat at subsequent centers; release allows a new turn', () => {
  const s = createSimulation();
  pressTurn(s, 'left');
  advance(s, .5);
  assert.equal(pressTurn(s, 'left'), false);
  advance(s, .5);
  assert.equal(s.direction, 3);
  releaseTurn(s, 'left');
  assert.equal(pressTurn(s, 'left'), true);
  advance(s, .5);
  assert.equal(s.direction, 2);
});

test('input at and after a crossed center belongs to the following center', () => {
  for (const elapsed of [.5, .625]) {
    const s = createSimulation();
    advance(s, elapsed);
    pressTurn(s, 'right');
    assert.equal(s.direction, 0);
    advance(s, 1 - elapsed);
    assert.equal(s.y, 9);
    assert.equal(s.direction, 1);
  }
});

test('large updates cross multiple centers without changing the schedule', () => {
  const a = createSimulation(), b = createSimulation();
  pressTurn(a, 'right');
  pressTurn(b, 'right');
  advance(a, 1.125);
  for (let i = 0; i < 9; i++) advance(b, .125);
  assert.deepEqual(a, b);
});

test('leaving the grid fails and further updates cannot move the player', () => {
  const s = createSimulation();
  advance(s, 5.5);
  assert.equal(s.y, 0);
  assert.equal(s.status, 'running');
  advance(s, .5);
  assert.equal(s.status, 'failed');
  assert.equal(s.y, 0);
  advance(s, 10);
  assert.equal(s.steps, 11);
  assert.equal(pressTurn(s, 'left'), false);
});

test('render sampling never mutates logical state; restart creates a fresh run', () => {
  const s = createSimulation();
  advance(s, .125);
  const before = structuredClone(s);
  samplePosition(s);
  assert.deepEqual(s, before);
  const fresh = createSimulation();
  assert.equal(fresh.progress, 0);
  assert.equal(fresh.steps, 0);
  assert.equal(fresh.queuedTurn, null);
});
