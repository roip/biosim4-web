'use client';

import { useRef, useEffect, useCallback } from 'react';
import type { SerializableState } from '@/lib/biosim4/worker';
import { SurvivalCriteria } from '@/lib/biosim4/types';

interface SimulationCanvasProps {
  state: SerializableState | null;
  showSignals: boolean;
  showBarriers: boolean;
  showSurvivalZone: boolean;
  survivalCriteria: SurvivalCriteria[];
  zoom: number;
  onCellClick?: (x: number, y: number) => void;
}

const BARRIER_COLOR: [number, number, number] = [60, 60, 70];
const SIGNAL_COLOR: [number, number, number] = [100, 180, 255];
const BG_COLOR: [number, number, number] = [245, 245, 248];
const ZONE_COLOR: [number, number, number] = [22, 163, 74]; // green-600

export default function SimulationCanvas({
  state,
  showSignals,
  showBarriers,
  showSurvivalZone,
  survivalCriteria,
  zoom,
  onCellClick,
}: SimulationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !state) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { sizeX, sizeY, gridData: gridBuf, signalData: signalBuf, colorData: colorBuf } = state;
    const gridData = new Uint16Array(gridBuf);
    const signalData = new Uint8Array(signalBuf);
    const colorData = new Uint8Array(colorBuf);

    const cellSize = zoom;
    const width = sizeX * cellSize;
    const height = sizeY * cellSize;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    // Create image data for pixel-level rendering
    const imageData = ctx.createImageData(width, height);
    const pixels = imageData.data;

    for (let gy = 0; gy < sizeY; gy++) {
      for (let gx = 0; gx < sizeX; gx++) {
        const gridIdx = gy * sizeX + gx;
        const val = gridData[gridIdx];

        let r = BG_COLOR[0];
        let g = BG_COLOR[1];
        let b = BG_COLOR[2];

        // Signal layer (background tint)
        if (showSignals && signalData[gridIdx] > 0) {
          const sig = signalData[gridIdx] / 255;
          r = Math.round(BG_COLOR[0] + (SIGNAL_COLOR[0] - BG_COLOR[0]) * sig * 0.4);
          g = Math.round(BG_COLOR[1] + (SIGNAL_COLOR[1] - BG_COLOR[1]) * sig * 0.4);
          b = Math.round(BG_COLOR[2] + (SIGNAL_COLOR[2] - BG_COLOR[2]) * sig * 0.4);
        }

        // Barrier
        if (val === 0xFFFF && showBarriers) {
          r = BARRIER_COLOR[0];
          g = BARRIER_COLOR[1];
          b = BARRIER_COLOR[2];
        }
        // Individual
        else if (val > 0 && val !== 0xFFFF) {
          r = colorData[gridIdx * 3];
          g = colorData[gridIdx * 3 + 1];
          b = colorData[gridIdx * 3 + 2];
        }

        // Fill the cell (zoom > 1 means multiple pixels per cell)
        for (let py = 0; py < cellSize; py++) {
          for (let px = 0; px < cellSize; px++) {
            const pixelX = gx * cellSize + px;
            const pixelY = gy * cellSize + py;
            const pixelIdx = (pixelY * width + pixelX) * 4;
            pixels[pixelIdx] = r;
            pixels[pixelIdx + 1] = g;
            pixels[pixelIdx + 2] = b;
            pixels[pixelIdx + 3] = 255;
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Draw survival zone overlay for each active criterion
    if (showSurvivalZone) {
      for (const criteria of survivalCriteria) {
        drawSurvivalZone(ctx, sizeX, sizeY, cellSize, criteria);
      }
    }
  }, [state, showSignals, showBarriers, showSurvivalZone, survivalCriteria, zoom]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(() => render());
    return () => cancelAnimationFrame(animRef.current);
  }, [render]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onCellClick || !state || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX / zoom);
    const y = Math.floor((e.clientY - rect.top) * scaleY / zoom);
    if (x >= 0 && x < state.sizeX && y >= 0 && y < state.sizeY) {
      onCellClick(x, y);
    }
  }, [onCellClick, state, zoom]);

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      style={{
        width: '100%',
        maxWidth: state ? state.sizeX * zoom : 512,
        height: 'auto',
        aspectRatio: state ? `${state.sizeX} / ${state.sizeY}` : '1',
        imageRendering: 'pixelated',
        border: '1px solid #d0d0d0',
        borderRadius: '8px',
        cursor: onCellClick ? 'crosshair' : 'default',
        background: '#f5f5f8',
      }}
    />
  );
}

/** Draw a translucent overlay showing the survival zone */
function drawSurvivalZone(
  ctx: CanvasRenderingContext2D,
  sizeX: number,
  sizeY: number,
  cellSize: number,
  criteria: SurvivalCriteria,
): void {
  const w = sizeX * cellSize;
  const h = sizeY * cellSize;

  ctx.save();

  // Draw the OUTSIDE of the survival zone as a dark overlay,
  // leaving the survival zone clear with a green border
  switch (criteria) {
    case SurvivalCriteria.CIRCLE: {
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(sizeX, sizeY) / 4.0 * cellSize;
      // Tint the circle green
      ctx.fillStyle = `rgba(${ZONE_COLOR[0]}, ${ZONE_COLOR[1]}, ${ZONE_COLOR[2]}, 0.08)`;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      // Dashed border
      ctx.strokeStyle = `rgba(${ZONE_COLOR[0]}, ${ZONE_COLOR[1]}, ${ZONE_COLOR[2]}, 0.6)`;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }

    case SurvivalCriteria.RIGHT_EIGHTH: {
      // Right 1/8 of grid is the survival zone
      const zoneX = Math.floor(sizeX * 7 / 8) * cellSize;
      // Tint the survival strip green
      ctx.fillStyle = `rgba(${ZONE_COLOR[0]}, ${ZONE_COLOR[1]}, ${ZONE_COLOR[2]}, 0.10)`;
      ctx.fillRect(zoneX, 0, w - zoneX, h);
      // Dashed border
      ctx.strokeStyle = `rgba(${ZONE_COLOR[0]}, ${ZONE_COLOR[1]}, ${ZONE_COLOR[2]}, 0.6)`;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(zoneX, 0);
      ctx.lineTo(zoneX, h);
      ctx.stroke();
      break;
    }

    case SurvivalCriteria.LEFT_EIGHTH: {
      // Left 1/8 of grid is the survival zone
      const zoneX = Math.floor(sizeX / 8) * cellSize;
      ctx.fillStyle = `rgba(${ZONE_COLOR[0]}, ${ZONE_COLOR[1]}, ${ZONE_COLOR[2]}, 0.10)`;
      ctx.fillRect(0, 0, zoneX, h);
      ctx.strokeStyle = `rgba(${ZONE_COLOR[0]}, ${ZONE_COLOR[1]}, ${ZONE_COLOR[2]}, 0.6)`;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(zoneX, 0);
      ctx.lineTo(zoneX, h);
      ctx.stroke();
      break;
    }

    case SurvivalCriteria.CENTER_WEIGHTED: {
      // Radial gradient: center is safe, edges are not
      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.sqrt(cx * cx + cy * cy);
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.04)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.12)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      break;
    }

    case SurvivalCriteria.CORNER_WEIGHTED: {
      const cornerR = Math.sqrt(sizeX * sizeX + sizeY * sizeY) / 2 * 0.25 * cellSize;
      const corners = [
        [0, 0], [w, 0], [0, h], [w, h],
      ];
      ctx.fillStyle = `rgba(${ZONE_COLOR[0]}, ${ZONE_COLOR[1]}, ${ZONE_COLOR[2]}, 0.08)`;
      for (const [cx, cy] of corners) {
        ctx.beginPath();
        ctx.arc(cx, cy, cornerR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = `rgba(${ZONE_COLOR[0]}, ${ZONE_COLOR[1]}, ${ZONE_COLOR[2]}, 0.5)`;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      for (const [cx, cy] of corners) {
        ctx.beginPath();
        ctx.arc(cx, cy, cornerR, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }

    case SurvivalCriteria.AGAINST_ANY_WALL: {
      const edge = cellSize;
      // Tint the wall ring
      ctx.fillStyle = `rgba(${ZONE_COLOR[0]}, ${ZONE_COLOR[1]}, ${ZONE_COLOR[2]}, 0.08)`;
      ctx.fillRect(0, 0, w, edge); // top
      ctx.fillRect(0, h - edge, w, edge); // bottom
      ctx.fillRect(0, edge, edge, h - edge * 2); // left
      ctx.fillRect(w - edge, edge, edge, h - edge * 2); // right
      ctx.strokeStyle = `rgba(${ZONE_COLOR[0]}, ${ZONE_COLOR[1]}, ${ZONE_COLOR[2]}, 0.5)`;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(edge, edge, w - edge * 2, h - edge * 2);
      break;
    }

    case SurvivalCriteria.TOUCH_ANY_WALL: {
      const edge = 2 * cellSize;
      ctx.fillStyle = `rgba(${ZONE_COLOR[0]}, ${ZONE_COLOR[1]}, ${ZONE_COLOR[2]}, 0.08)`;
      ctx.fillRect(0, 0, w, edge);
      ctx.fillRect(0, h - edge, w, edge);
      ctx.fillRect(0, edge, edge, h - edge * 2);
      ctx.fillRect(w - edge, edge, edge, h - edge * 2);
      ctx.strokeStyle = `rgba(${ZONE_COLOR[0]}, ${ZONE_COLOR[1]}, ${ZONE_COLOR[2]}, 0.5)`;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(edge, edge, w - edge * 2, h - edge * 2);
      break;
    }

    case SurvivalCriteria.PAIRS:
    case SurvivalCriteria.CONTACT:
      // These are neighbor-based, no fixed zone to draw
      // Just add a subtle label
      break;
  }

  ctx.restore();
}
