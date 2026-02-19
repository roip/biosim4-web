// Sensor implementations for biosim4
// Port of getSensor.cpp from C++ original
// All 21 sensors that individuals can use to perceive their environment

import {
  Sensor, Coord, Dir, Compass, coordAdd,
  BARRIER, EMPTY,
} from './types';
import { Indiv } from './indiv';
import { Grid } from './grid';
import { Signals } from './signals';
import { Peeps } from './peeps';
import { SimParams } from './config';
import { PRNG } from './random';
import { genomeSimilarity } from './genome';

export interface SensorContext {
  grid: Grid;
  signals: Signals;
  peeps: Peeps;
  params: SimParams;
  rng: PRNG;
  simStep: number;
  stepsPerGeneration: number;
}

/**
 * Get a sensor value for an individual. Returns a value in [0, 1].
 * This is the main sensor dispatch function.
 */
export function getSensor(
  indiv: Indiv,
  sensor: Sensor,
  ctx: SensorContext,
): number {
  switch (sensor) {
    case Sensor.LOC_X:
      // Normalized X location (0..1)
      return indiv.loc.x / (ctx.params.sizeX - 1);

    case Sensor.LOC_Y:
      // Normalized Y location (0..1)
      return indiv.loc.y / (ctx.params.sizeY - 1);

    case Sensor.BOUNDARY_DIST_X: {
      // Distance to nearest X boundary, normalized 0..1 (0 = at boundary)
      const distX = Math.min(indiv.loc.x, ctx.params.sizeX - 1 - indiv.loc.x);
      return distX / (ctx.params.sizeX / 2.0);
    }

    case Sensor.BOUNDARY_DIST_Y: {
      // Distance to nearest Y boundary, normalized 0..1
      const distY = Math.min(indiv.loc.y, ctx.params.sizeY - 1 - indiv.loc.y);
      return distY / (ctx.params.sizeY / 2.0);
    }

    case Sensor.BOUNDARY_DIST: {
      // Distance to nearest boundary in any direction
      const distX = Math.min(indiv.loc.x, ctx.params.sizeX - 1 - indiv.loc.x);
      const distY = Math.min(indiv.loc.y, ctx.params.sizeY - 1 - indiv.loc.y);
      const closest = Math.min(distX, distY);
      const maxDist = Math.min(ctx.params.sizeX, ctx.params.sizeY) / 2.0;
      return closest / maxDist;
    }

    case Sensor.GENETIC_SIM_FWD: {
      // Genetic similarity with the individual ahead in last-move direction
      const fwd = indiv.lastMoveDir.asNormalizedCoord();
      const aheadLoc = coordAdd(indiv.loc, fwd);
      if (ctx.grid.isInBounds(aheadLoc) && ctx.grid.isOccupiedAt(aheadLoc)) {
        const otherIdx = ctx.grid.at(aheadLoc);
        const other = ctx.peeps.get(otherIdx);
        if (other && other.alive) {
          return genomeSimilarity(indiv.genome, other.genome);
        }
      }
      return 0;
    }

    case Sensor.LAST_MOVE_DIR_X: {
      // X component of last movement direction, mapped to 0..1
      const d = indiv.lastMoveDir.asNormalizedCoord();
      return (d.x + 1) / 2.0; // -1..1 → 0..1
    }

    case Sensor.LAST_MOVE_DIR_Y: {
      // Y component of last movement direction, mapped to 0..1
      const d = indiv.lastMoveDir.asNormalizedCoord();
      return (d.y + 1) / 2.0;
    }

    case Sensor.LONGPROBE_POP_FWD: {
      // Count individuals along a long probe in forward direction
      const fwd = indiv.lastMoveDir.asNormalizedCoord();
      if (fwd.x === 0 && fwd.y === 0) return 0;
      let count = 0;
      let loc = { ...indiv.loc };
      for (let d = 1; d <= indiv.longProbeDist; d++) {
        loc = coordAdd(loc, fwd);
        if (!ctx.grid.isInBounds(loc)) break;
        if (ctx.grid.isBarrierAt(loc)) break;
        if (ctx.grid.isOccupiedAt(loc)) count++;
      }
      return Math.min(1.0, count / indiv.longProbeDist);
    }

    case Sensor.LONGPROBE_BARRIER_FWD: {
      // Distance to nearest barrier in forward direction, normalized
      const fwd = indiv.lastMoveDir.asNormalizedCoord();
      if (fwd.x === 0 && fwd.y === 0) return 0;
      let loc = { ...indiv.loc };
      for (let d = 1; d <= indiv.longProbeDist; d++) {
        loc = coordAdd(loc, fwd);
        if (!ctx.grid.isInBounds(loc) || ctx.grid.isBarrierAt(loc)) {
          return d / indiv.longProbeDist;
        }
      }
      return 1.0; // No barrier found within range
    }

    case Sensor.POPULATION: {
      // Population density in neighborhood
      let count = 0;
      let total = 0;
      ctx.grid.visitNeighborhood(indiv.loc, ctx.params.populationSensorRadius, (loc) => {
        total++;
        if (ctx.grid.isOccupiedAt(loc)) count++;
      });
      return total > 0 ? count / total : 0;
    }

    case Sensor.POPULATION_FWD: {
      // Population in forward direction within short range
      const fwd = indiv.lastMoveDir.asNormalizedCoord();
      if (fwd.x === 0 && fwd.y === 0) return 0;
      let count = 0;
      for (let d = 1; d <= ctx.params.shortProbeBarrierDistance; d++) {
        const loc = coordAdd(indiv.loc, { x: fwd.x * d, y: fwd.y * d });
        if (!ctx.grid.isInBounds(loc)) break;
        if (ctx.grid.isOccupiedAt(loc)) count++;
      }
      return Math.min(1.0, count / ctx.params.shortProbeBarrierDistance);
    }

    case Sensor.POPULATION_LR: {
      // Population density to left vs right of forward direction
      const fwd = indiv.lastMoveDir;
      const right = fwd.rotate90CW().asNormalizedCoord();
      const left = fwd.rotate90CCW().asNormalizedCoord();
      let rightCount = 0, leftCount = 0;
      for (let d = 1; d <= ctx.params.shortProbeBarrierDistance; d++) {
        const rLoc = coordAdd(indiv.loc, { x: right.x * d, y: right.y * d });
        const lLoc = coordAdd(indiv.loc, { x: left.x * d, y: left.y * d });
        if (ctx.grid.isInBounds(rLoc) && ctx.grid.isOccupiedAt(rLoc)) rightCount++;
        if (ctx.grid.isInBounds(lLoc) && ctx.grid.isOccupiedAt(lLoc)) leftCount++;
      }
      const total = rightCount + leftCount;
      return total > 0 ? rightCount / total : 0.5;
    }

    case Sensor.OSC1: {
      // Oscillator output, sinusoidal with individual's period
      const phase = (ctx.simStep % indiv.oscPeriod) / indiv.oscPeriod;
      return (Math.sin(phase * 2 * Math.PI) + 1) / 2.0;
    }

    case Sensor.AGE: {
      // Age as fraction of generation lifespan
      return indiv.age / ctx.stepsPerGeneration;
    }

    case Sensor.BARRIER_FWD: {
      // Distance to nearest barrier in forward direction (short range)
      const fwd = indiv.lastMoveDir.asNormalizedCoord();
      if (fwd.x === 0 && fwd.y === 0) return 1.0; // No direction
      for (let d = 1; d <= ctx.params.shortProbeBarrierDistance; d++) {
        const loc = coordAdd(indiv.loc, { x: fwd.x * d, y: fwd.y * d });
        if (!ctx.grid.isInBounds(loc) || ctx.grid.isBarrierAt(loc)) {
          return 1.0 - (d / (ctx.params.shortProbeBarrierDistance + 1));
        }
      }
      return 0; // No barrier nearby
    }

    case Sensor.BARRIER_LR: {
      // Barrier presence left vs right
      const fwd = indiv.lastMoveDir;
      const right = fwd.rotate90CW().asNormalizedCoord();
      const left = fwd.rotate90CCW().asNormalizedCoord();
      let rightBarrier = false, leftBarrier = false;
      for (let d = 1; d <= ctx.params.shortProbeBarrierDistance; d++) {
        const rLoc = coordAdd(indiv.loc, { x: right.x * d, y: right.y * d });
        const lLoc = coordAdd(indiv.loc, { x: left.x * d, y: left.y * d });
        if (ctx.grid.isInBounds(rLoc) && ctx.grid.isBarrierAt(rLoc)) rightBarrier = true;
        if (ctx.grid.isInBounds(lLoc) && ctx.grid.isBarrierAt(lLoc)) leftBarrier = true;
      }
      if (rightBarrier && !leftBarrier) return 0;
      if (!rightBarrier && leftBarrier) return 1;
      return 0.5;
    }

    case Sensor.RANDOM:
      return ctx.rng.next();

    case Sensor.SIGNAL0: {
      // Signal density at current location
      return ctx.signals.getSignalDensity(0, indiv.loc, ctx.params.signalSensorRadius);
    }

    case Sensor.SIGNAL0_FWD: {
      // Signal in forward direction
      const fwd = indiv.lastMoveDir.asNormalizedCoord();
      if (fwd.x === 0 && fwd.y === 0) return 0;
      const aheadLoc = coordAdd(indiv.loc, fwd);
      if (ctx.grid.isInBounds(aheadLoc)) {
        return ctx.signals.getSignalDensity(0, aheadLoc, ctx.params.signalSensorRadius);
      }
      return 0;
    }

    case Sensor.SIGNAL0_LR: {
      // Signal left vs right
      const fwd = indiv.lastMoveDir;
      const right = fwd.rotate90CW().asNormalizedCoord();
      const left = fwd.rotate90CCW().asNormalizedCoord();
      const rLoc = coordAdd(indiv.loc, right);
      const lLoc = coordAdd(indiv.loc, left);
      const rSig = ctx.grid.isInBounds(rLoc)
        ? ctx.signals.getSignalDensity(0, rLoc, ctx.params.signalSensorRadius) : 0;
      const lSig = ctx.grid.isInBounds(lLoc)
        ? ctx.signals.getSignalDensity(0, lLoc, ctx.params.signalSensorRadius) : 0;
      const total = rSig + lSig;
      return total > 0 ? rSig / total : 0.5;
    }

    default:
      return 0;
  }
}
