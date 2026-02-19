'use client';

import type { IndivInfo } from '@/lib/biosim4/worker';

interface NetworkSummary {
  sensors: string[];
  actions: string[];
  connections: { from: string; to: string; weight: number }[];
}

interface GenomeViewerProps {
  data: NetworkSummary | null;
  info: IndivInfo | null;
  onClose: () => void;
}

export default function GenomeViewer({ data, info, onClose }: GenomeViewerProps) {
  if (!data || !info) return null;

  // Determine unique internal neurons
  const internalNeurons = new Set<string>();
  for (const conn of data.connections) {
    if (!data.sensors.includes(conn.from) && !data.actions.includes(conn.from)) {
      internalNeurons.add(conn.from);
    }
    if (!data.sensors.includes(conn.to) && !data.actions.includes(conn.to)) {
      internalNeurons.add(conn.to);
    }
  }

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '12px',
      padding: '1rem',
      border: '1px solid #86efac',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.75rem',
      }}>
        <div style={{
          fontSize: '0.75rem',
          fontWeight: 600,
          color: '#16a34a',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontFamily: 'monospace',
        }}>
          Individual #{info.index} — Genome Inspector
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#888',
            cursor: 'pointer',
            fontSize: '1.2rem',
            padding: '0 0.25rem',
          }}
        >
          x
        </button>
      </div>

      {/* Individual info */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        marginBottom: '1rem',
        fontSize: '0.8rem',
        color: '#555',
        fontFamily: 'monospace',
      }}>
        <span>Loc: ({info.loc.x}, {info.loc.y})</span>
        <span>Age: {info.age}</span>
        <span>Resp: {info.responsiveness.toFixed(2)}</span>
        <span>Osc: {info.oscPeriod}</span>
        <span>Genes: {info.genomeLength}</span>
      </div>

      {/* Network visualization */}
      <NetworkDiagram
        sensors={data.sensors}
        actions={data.actions}
        internalNeurons={Array.from(internalNeurons)}
        connections={data.connections}
      />
    </div>
  );
}

function NetworkDiagram({
  sensors,
  actions,
  internalNeurons,
  connections,
}: {
  sensors: string[];
  actions: string[];
  internalNeurons: string[];
  connections: { from: string; to: string; weight: number }[];
}) {
  const width = 500;
  const height = Math.max(180, Math.max(sensors.length, actions.length) * 22 + 40);
  const layerX = [60, 250, 440];

  // Position nodes
  const nodePositions = new Map<string, { x: number; y: number }>();

  sensors.forEach((s, i) => {
    nodePositions.set(s, { x: layerX[0], y: 30 + i * 22 });
  });

  internalNeurons.forEach((n, i) => {
    nodePositions.set(n, { x: layerX[1], y: 30 + i * 22 });
  });

  actions.forEach((a, i) => {
    nodePositions.set(a, { x: layerX[2], y: 30 + i * 22 });
  });

  // Max weight for coloring
  const maxWeight = Math.max(...connections.map(c => Math.abs(c.weight)), 0.01);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
      {/* Connections */}
      {connections.map((conn, i) => {
        const from = nodePositions.get(conn.from);
        const to = nodePositions.get(conn.to);
        if (!from || !to) return null;

        const intensity = Math.abs(conn.weight) / maxWeight;
        const color = conn.weight > 0
          ? `rgba(34, 197, 94, ${0.2 + intensity * 0.8})`
          : `rgba(239, 68, 68, ${0.2 + intensity * 0.8})`;

        return (
          <line
            key={i}
            x1={from.x + 4}
            y1={from.y}
            x2={to.x - 4}
            y2={to.y}
            stroke={color}
            strokeWidth={0.5 + intensity * 2}
          />
        );
      })}

      {/* Sensor nodes */}
      {sensors.map(s => {
        const pos = nodePositions.get(s)!;
        return (
          <g key={s}>
            <circle cx={pos.x} cy={pos.y} r={4} fill="#3b82f6" />
            <text x={pos.x - 8} y={pos.y + 3} fill="#555" fontSize={7} textAnchor="end">
              {s.replace('_', ' ')}
            </text>
          </g>
        );
      })}

      {/* Internal neuron nodes */}
      {internalNeurons.map(n => {
        const pos = nodePositions.get(n)!;
        return (
          <g key={n}>
            <circle cx={pos.x} cy={pos.y} r={5} fill="none" stroke="#ca8a04" strokeWidth={1.5} />
            <text x={pos.x} y={pos.y + 3} fill="#555" fontSize={7} textAnchor="middle">
              {n}
            </text>
          </g>
        );
      })}

      {/* Action nodes */}
      {actions.map(a => {
        const pos = nodePositions.get(a)!;
        return (
          <g key={a}>
            <circle cx={pos.x} cy={pos.y} r={4} fill="#ef4444" />
            <text x={pos.x + 8} y={pos.y + 3} fill="#555" fontSize={7} textAnchor="start">
              {a.replace('_', ' ')}
            </text>
          </g>
        );
      })}

      {/* Layer labels */}
      <text x={layerX[0]} y={14} fill="#3b82f6" fontSize={8} textAnchor="middle" fontWeight="bold">SENSORS</text>
      <text x={layerX[1]} y={14} fill="#ca8a04" fontSize={8} textAnchor="middle" fontWeight="bold">NEURONS</text>
      <text x={layerX[2]} y={14} fill="#ef4444" fontSize={8} textAnchor="middle" fontWeight="bold">ACTIONS</text>
    </svg>
  );
}
