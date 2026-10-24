// Coordinates name the last reached center; progress describes the outgoing edge.
export const LEVEL = Object.freeze({ width: 15, height: 15, x: 7, y: 11, direction: 0 });
export const DIRECTIONS = Object.freeze([
  Object.freeze({ x: 0, y: -1, name: 'North' }),
  Object.freeze({ x: 1, y: 0, name: 'East' }),
  Object.freeze({ x: 0, y: 1, name: 'South' }),
  Object.freeze({ x: -1, y: 0, name: 'West' }),
]);

export function createSimulation({ speed = 2, level = LEVEL } = {}) {
  if (!Number.isFinite(speed) || speed <= 0) throw new RangeError('Speed must be positive');
  return { level, speed, x: level.x, y: level.y, direction: level.direction,
    progress: 0, queuedTurn: null, status: 'running', steps: 0, held: new Set() };
}

export function pressTurn(state, turn) {
  if (turn !== 'left' && turn !== 'right') throw new RangeError('Unknown turn');
  if (state.held.has(turn)) return false;
  state.held.add(turn);
  if (state.status !== 'running' || state.queuedTurn !== null) return false;
  state.queuedTurn = turn;
  return true;
}

export function releaseTurn(state, turn) { state.held.delete(turn); }

export function advance(state, seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError('Invalid elapsed time');
  if (state.status !== 'running') return;
  state.progress += seconds * state.speed;
  while (state.progress >= 1) {
    const delta = DIRECTIONS[state.direction];
    const x = state.x + delta.x;
    const y = state.y + delta.y;
    if (x < 0 || y < 0 || x >= state.level.width || y >= state.level.height) {
      state.status = 'failed';
      state.progress = 0;
      state.queuedTurn = null;
      return;
    }
    state.x = x;
    state.y = y;
    state.steps++;
    state.progress -= 1;
    if (state.queuedTurn !== null) {
      state.direction = (state.direction + (state.queuedTurn === 'left' ? 3 : 1)) % 4;
      state.queuedTurn = null;
    }
  }
}

// A read-only visual sample. Rendering never writes into the simulation.
export function samplePosition(state) {
  const delta = DIRECTIONS[state.direction];
  // Stay on the final tile while approaching an invalid edge, then fail on time.
  const inside = state.x + delta.x >= 0 && state.y + delta.y >= 0 &&
    state.x + delta.x < state.level.width && state.y + delta.y < state.level.height;
  const t = inside ? state.progress : 0;
  return { x: state.x + delta.x * t, y: state.y + delta.y * t };
}
