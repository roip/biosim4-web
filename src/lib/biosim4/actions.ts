// Action implementations for biosim4
// Port of executeActions.cpp from C++ original
// All 17 actions that individuals can perform

import {
  Action, Coord, Dir, Compass, coordAdd,
} from './types';
import { Indiv, responsivenessCurve } from './indiv';
import { Grid } from './grid';
import { Signals } from './signals';
import { Peeps } from './peeps';
import { SimParams } from './config';
import { PRNG } from './random';

export interface ActionContext {
  grid: Grid;
  signals: Signals;
  peeps: Peeps;
  params: SimParams;
  rng: PRNG;
}

/**
 * Execute actions for an individual based on action levels from the neural net.
 * Action levels are in [-1, 1] range (tanh output).
 */
export function executeActions(
  indiv: Indiv,
  actionLevels: Float32Array,
  ctx: ActionContext,
): void {
  const responsiveness = responsivenessCurve(
    indiv.responsiveness,
    ctx.params.responsivenessCurveKFactor,
  );

  // Accumulate movement from various move actions
  let moveX = 0;
  let moveY = 0;

  // Process each action
  for (let a = 0; a < Action.NUM_ACTIONS; a++) {
    const level = actionLevels[a];
    // Use prob2bool: the action fires with probability proportional to |level|
    const threshold = responsiveness;

    switch (a as Action) {
      case Action.MOVE_X:
        moveX += level;
        break;

      case Action.MOVE_Y:
        moveY += level;
        break;

      case Action.MOVE_FORWARD: {
        if (Math.abs(level) > threshold * 0.5) {
          const fwd = indiv.lastMoveDir.asNormalizedCoord();
          moveX += fwd.x * level;
          moveY += fwd.y * level;
        }
        break;
      }

      case Action.MOVE_RL: {
        // Positive = turn right, negative = turn left, then move forward
        if (Math.abs(level) > threshold * 0.5) {
          const dir = level > 0
            ? indiv.lastMoveDir.rotate90CW()
            : indiv.lastMoveDir.rotate90CCW();
          const d = dir.asNormalizedCoord();
          moveX += d.x;
          moveY += d.y;
        }
        break;
      }

      case Action.MOVE_RANDOM: {
        if (Math.abs(level) > threshold * 0.5) {
          const dir = Dir.random(ctx.rng.bound());
          const d = dir.asNormalizedCoord();
          moveX += d.x;
          moveY += d.y;
        }
        break;
      }

      case Action.SET_OSCILLATOR_PERIOD: {
        // Adjust oscillator period based on action level
        const newPeriod = 1 + Math.floor(Math.abs(level) * 100);
        indiv.oscPeriod = Math.max(2, newPeriod);
        break;
      }

      case Action.SET_LONGPROBE_DIST: {
        // Adjust long probe distance
        const newDist = 1 + Math.floor(Math.abs(level) * ctx.params.longProbeDistance);
        indiv.longProbeDist = Math.max(1, newDist);
        break;
      }

      case Action.SET_RESPONSIVENESS: {
        // Adjust responsiveness
        indiv.responsiveness = (level + 1) / 2.0; // map -1..1 to 0..1
        break;
      }

      case Action.EMIT_SIGNAL0: {
        if (Math.abs(level) > threshold * 0.5) {
          ctx.signals.emit(0, indiv.loc, 1.5);
        }
        break;
      }

      case Action.KILL_FORWARD: {
        if (ctx.params.killEnable && Math.abs(level) > threshold * 0.5) {
          const fwd = indiv.lastMoveDir.asNormalizedCoord();
          const targetLoc = coordAdd(indiv.loc, fwd);
          if (ctx.grid.isInBounds(targetLoc) && ctx.grid.isOccupiedAt(targetLoc)) {
            const targetIdx = ctx.grid.at(targetLoc);
            const target = ctx.peeps.get(targetIdx);
            if (target && target.alive) {
              ctx.peeps.queueDeath(targetIdx);
            }
          }
        }
        break;
      }

      case Action.MOVE_EAST:
        if (Math.abs(level) > threshold * 0.5) moveX += 1;
        break;

      case Action.MOVE_WEST:
        if (Math.abs(level) > threshold * 0.5) moveX -= 1;
        break;

      case Action.MOVE_NORTH:
        if (Math.abs(level) > threshold * 0.5) moveY -= 1;
        break;

      case Action.MOVE_SOUTH:
        if (Math.abs(level) > threshold * 0.5) moveY += 1;
        break;

      case Action.MOVE_LEFT: {
        if (Math.abs(level) > threshold * 0.5) {
          const left = indiv.lastMoveDir.rotate90CCW().asNormalizedCoord();
          moveX += left.x;
          moveY += left.y;
        }
        break;
      }

      case Action.MOVE_RIGHT: {
        if (Math.abs(level) > threshold * 0.5) {
          const right = indiv.lastMoveDir.rotate90CW().asNormalizedCoord();
          moveX += right.x;
          moveY += right.y;
        }
        break;
      }

      case Action.MOVE_REVERSE: {
        if (Math.abs(level) > threshold * 0.5) {
          const rev = indiv.lastMoveDir.rotate180().asNormalizedCoord();
          moveX += rev.x;
          moveY += rev.y;
        }
        break;
      }
    }
  }

  // Apply accumulated movement
  const dx = moveX > 0.5 ? 1 : (moveX < -0.5 ? -1 : 0);
  const dy = moveY > 0.5 ? 1 : (moveY < -0.5 ? -1 : 0);

  if (dx !== 0 || dy !== 0) {
    const newLoc: Coord = { x: indiv.loc.x + dx, y: indiv.loc.y + dy };
    if (ctx.grid.isInBounds(newLoc) && ctx.grid.isEmptyAt(newLoc)) {
      ctx.peeps.queueMove(indiv.index, newLoc);
      indiv.lastMoveDir = new Dir(
        coordToCompass(dx, dy),
      );
    }
  }
}

/** Convert dx, dy to compass direction */
function coordToCompass(dx: number, dy: number): Compass {
  if (dx === 0 && dy === -1) return Compass.N;
  if (dx === 1 && dy === -1) return Compass.NE;
  if (dx === 1 && dy === 0) return Compass.E;
  if (dx === 1 && dy === 1) return Compass.SE;
  if (dx === 0 && dy === 1) return Compass.S;
  if (dx === -1 && dy === 1) return Compass.SW;
  if (dx === -1 && dy === 0) return Compass.W;
  if (dx === -1 && dy === -1) return Compass.NW;
  return Compass.CENTER;
}
