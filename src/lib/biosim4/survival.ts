// Survival criteria for biosim4
// Supports multiple simultaneous survival zones — an individual survives
// if it satisfies ANY of the active criteria.

import { SurvivalCriteria, Coord } from './types';
import { Indiv } from './indiv';
import { Grid } from './grid';
import { Peeps } from './peeps';
import { SimParams } from './config';

/**
 * Evaluate whether an individual survives based on a single criterion.
 */
export function survives(
  indiv: Indiv,
  criteria: SurvivalCriteria,
  params: SimParams,
  grid: Grid,
  peeps: Peeps,
): boolean {
  switch (criteria) {
    case SurvivalCriteria.CIRCLE:
      return surviveCircle(indiv, params);

    case SurvivalCriteria.RIGHT_EIGHTH:
      return indiv.loc.x > params.sizeX * 7 / 8;

    case SurvivalCriteria.LEFT_EIGHTH:
      return indiv.loc.x < params.sizeX / 8;

    case SurvivalCriteria.CENTER_WEIGHTED:
      return surviveCenterWeighted(indiv, params);

    case SurvivalCriteria.CORNER_WEIGHTED:
      return surviveCornerWeighted(indiv, params);

    case SurvivalCriteria.PAIRS:
      return survivePairs(indiv, grid, peeps);

    case SurvivalCriteria.CONTACT:
      return surviveContact(indiv, grid);

    case SurvivalCriteria.AGAINST_ANY_WALL:
      return surviveAgainstAnyWall(indiv, params);

    case SurvivalCriteria.TOUCH_ANY_WALL:
      return surviveTouchAnyWall(indiv, params);

    default:
      return true;
  }
}

/**
 * Get all survivors from the population based on multiple criteria.
 * An individual survives if it satisfies ANY of the active criteria.
 */
export function getSurvivors(
  criteriaList: SurvivalCriteria[],
  params: SimParams,
  grid: Grid,
  peeps: Peeps,
): Indiv[] {
  const survivors: Indiv[] = [];
  const living = peeps.getLiving();

  for (const indiv of living) {
    const survived = criteriaList.length === 0 ||
      criteriaList.some(c => survives(indiv, c, params, grid, peeps));
    if (survived) {
      survivors.push(indiv);
    }
  }

  return survivors;
}

// ── Individual survival criteria implementations ─────────────────────

/** Survive if within a circle in the center of the grid */
function surviveCircle(indiv: Indiv, params: SimParams): boolean {
  const centerX = params.sizeX / 2.0;
  const centerY = params.sizeY / 2.0;
  const radius = Math.min(params.sizeX, params.sizeY) / 4.0;

  const dx = indiv.loc.x - centerX;
  const dy = indiv.loc.y - centerY;
  return (dx * dx + dy * dy) <= (radius * radius);
}

/** Survive with probability proportional to distance from center (closer = more likely) */
function surviveCenterWeighted(indiv: Indiv, params: SimParams): boolean {
  const centerX = params.sizeX / 2.0;
  const centerY = params.sizeY / 2.0;
  const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

  const dx = indiv.loc.x - centerX;
  const dy = indiv.loc.y - centerY;
  const dist = Math.sqrt(dx * dx + dy * dy);

  const prob = 1.0 - (dist / maxDist);
  return prob > 0.5;
}

/** Survive with probability proportional to distance from nearest corner */
function surviveCornerWeighted(indiv: Indiv, params: SimParams): boolean {
  const corners = [
    { x: 0, y: 0 },
    { x: params.sizeX - 1, y: 0 },
    { x: 0, y: params.sizeY - 1 },
    { x: params.sizeX - 1, y: params.sizeY - 1 },
  ];

  let minDist = Infinity;
  for (const corner of corners) {
    const dx = indiv.loc.x - corner.x;
    const dy = indiv.loc.y - corner.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) minDist = dist;
  }

  const maxDist = Math.sqrt(params.sizeX * params.sizeX + params.sizeY * params.sizeY) / 2;
  return minDist < maxDist * 0.25;
}

/** Survive if paired with at least one neighbor */
function survivePairs(indiv: Indiv, grid: Grid, peeps: Peeps): boolean {
  let hasNeighbor = false;
  grid.visitNeighborhood(indiv.loc, 1.5, (loc) => {
    if (loc.x !== indiv.loc.x || loc.y !== indiv.loc.y) {
      if (grid.isOccupiedAt(loc)) {
        hasNeighbor = true;
      }
    }
  });
  return hasNeighbor;
}

/** Survive if in contact with at least one other individual (adjacent) */
function surviveContact(indiv: Indiv, grid: Grid): boolean {
  const offsets = [
    { x: -1, y: 0 }, { x: 1, y: 0 },
    { x: 0, y: -1 }, { x: 0, y: 1 },
  ];
  for (const offset of offsets) {
    const loc: Coord = { x: indiv.loc.x + offset.x, y: indiv.loc.y + offset.y };
    if (grid.isInBounds(loc) && grid.isOccupiedAt(loc)) {
      return true;
    }
  }
  return false;
}

/** Survive if directly against any wall */
function surviveAgainstAnyWall(indiv: Indiv, params: SimParams): boolean {
  return (
    indiv.loc.x === 0 ||
    indiv.loc.x === params.sizeX - 1 ||
    indiv.loc.y === 0 ||
    indiv.loc.y === params.sizeY - 1
  );
}

/** Survive if touching any wall (within 1 cell) */
function surviveTouchAnyWall(indiv: Indiv, params: SimParams): boolean {
  return (
    indiv.loc.x <= 1 ||
    indiv.loc.x >= params.sizeX - 2 ||
    indiv.loc.y <= 1 ||
    indiv.loc.y >= params.sizeY - 2
  );
}
