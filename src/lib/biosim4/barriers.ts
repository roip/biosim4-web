// Barrier creation for biosim4
// Port of createBarrier.cpp from C++ original

import { Coord, BarrierType, BARRIER } from './types';
import { Grid } from './grid';
import { PRNG } from './random';

/** Create barriers on the grid based on barrier type */
export function createBarrier(grid: Grid, barrierType: BarrierType, rng: PRNG): void {
  switch (barrierType) {
    case BarrierType.NONE:
      break;

    case BarrierType.VERTICAL_BAR_CONSTANT:
      createVerticalBarConstant(grid);
      break;

    case BarrierType.VERTICAL_BAR_RANDOM:
      createVerticalBarRandom(grid, rng);
      break;

    case BarrierType.FIVE_BLOCKS:
      createFiveBlocks(grid);
      break;

    case BarrierType.HORIZONTAL_BAR_CONSTANT:
      createHorizontalBarConstant(grid);
      break;

    case BarrierType.FLOATING_ISLANDS:
      createFloatingIslands(grid, rng);
      break;

    case BarrierType.SPOTS:
      createSpots(grid);
      break;
  }
}

/** Place a barrier at a specific location */
function setBarrier(grid: Grid, loc: Coord): void {
  if (grid.isInBounds(loc)) {
    grid.set(loc, BARRIER);
  }
}

/** Vertical bar in center of the grid */
function createVerticalBarConstant(grid: Grid): void {
  const midX = Math.floor(grid.sizeX / 2);
  const startY = Math.floor(grid.sizeY / 4);
  const endY = grid.sizeY - startY;

  for (let y = startY; y < endY; y++) {
    setBarrier(grid, { x: midX, y });
  }
}

/** Vertical bar at a random X position */
function createVerticalBarRandom(grid: Grid, rng: PRNG): void {
  const x = Math.floor(grid.sizeX / 4) + rng.nextInt(Math.floor(grid.sizeX / 2));
  const startY = Math.floor(grid.sizeY / 4);
  const endY = grid.sizeY - startY;

  for (let y = startY; y < endY; y++) {
    setBarrier(grid, { x, y });
  }
}

/** Five evenly-spaced tall vertical bars */
function createFiveBlocks(grid: Grid): void {
  const halfWidth = Math.max(1, Math.floor(grid.sizeX / 50));
  const halfHeight = Math.max(4, Math.floor(grid.sizeY / 6));
  const positions = [
    { x: grid.sizeX / 4, y: grid.sizeY / 4 },
    { x: 3 * grid.sizeX / 4, y: grid.sizeY / 4 },
    { x: grid.sizeX / 2, y: grid.sizeY / 2 },
    { x: grid.sizeX / 4, y: 3 * grid.sizeY / 4 },
    { x: 3 * grid.sizeX / 4, y: 3 * grid.sizeY / 4 },
  ];

  for (const pos of positions) {
    const cx = Math.floor(pos.x);
    const cy = Math.floor(pos.y);
    for (let dx = -halfWidth; dx <= halfWidth; dx++) {
      for (let dy = -halfHeight; dy <= halfHeight; dy++) {
        setBarrier(grid, { x: cx + dx, y: cy + dy });
      }
    }
  }
}

/** Horizontal bar in center of the grid */
function createHorizontalBarConstant(grid: Grid): void {
  const midY = Math.floor(grid.sizeY / 2);
  const startX = Math.floor(grid.sizeX / 4);
  const endX = grid.sizeX - startX;

  for (let x = startX; x < endX; x++) {
    setBarrier(grid, { x, y: midY });
  }
}

/** Several floating island clusters placed randomly */
function createFloatingIslands(grid: Grid, rng: PRNG): void {
  const numIslands = 5;
  const islandRadius = Math.max(2, Math.floor(Math.min(grid.sizeX, grid.sizeY) / 12));

  for (let i = 0; i < numIslands; i++) {
    const cx = Math.floor(grid.sizeX * 0.15) + rng.nextInt(Math.floor(grid.sizeX * 0.7));
    const cy = Math.floor(grid.sizeY * 0.15) + rng.nextInt(Math.floor(grid.sizeY * 0.7));

    for (let dx = -islandRadius; dx <= islandRadius; dx++) {
      for (let dy = -islandRadius; dy <= islandRadius; dy++) {
        if (dx * dx + dy * dy <= islandRadius * islandRadius) {
          setBarrier(grid, { x: cx + dx, y: cy + dy });
        }
      }
    }
  }
}

/** Regularly-spaced spots */
function createSpots(grid: Grid): void {
  const spotRadius = Math.max(1, Math.floor(Math.min(grid.sizeX, grid.sizeY) / 20));
  const spacing = Math.floor(Math.min(grid.sizeX, grid.sizeY) / 4);

  for (let cx = spacing; cx < grid.sizeX; cx += spacing) {
    for (let cy = spacing; cy < grid.sizeY; cy += spacing) {
      for (let dx = -spotRadius; dx <= spotRadius; dx++) {
        for (let dy = -spotRadius; dy <= spotRadius; dy++) {
          if (dx * dx + dy * dy <= spotRadius * spotRadius) {
            setBarrier(grid, { x: cx + dx, y: cy + dy });
          }
        }
      }
    }
  }
}
