'use client';

import type { GenerationStats } from '@/lib/biosim4/analysis';

interface StatsPanelProps {
  stats: GenerationStats | null;
  generationHistory: GenerationStats[];
}

const statBoxStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '0.5rem',
  background: '#f9fafb',
  borderRadius: '6px',
  border: '1px solid #e5e7eb',
  minWidth: '90px',
};

const statLabelStyle: React.CSSProperties = {
  fontSize: '0.65rem',
  color: '#888',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  marginBottom: '0.2rem',
};

const statValueStyle: React.CSSProperties = {
  fontSize: '1.1rem',
  fontWeight: 600,
  fontFamily: 'monospace',
  color: '#1a1a2e',
};

export default function StatsPanel({ stats, generationHistory }: StatsPanelProps) {
  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '12px',
      padding: '1rem',
      border: '1px solid #e0e0e0',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{
        fontSize: '0.75rem',
        fontWeight: 600,
        color: '#16a34a',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: '0.75rem',
        fontFamily: 'monospace',
      }}>
        Generation Statistics
      </div>

      {/* Current stats */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div style={statBoxStyle}>
          <span style={statLabelStyle}>Generation</span>
          <span style={{ ...statValueStyle, color: '#16a34a' }}>
            {stats?.generation ?? 0}
          </span>
        </div>
        <div style={statBoxStyle}>
          <span style={statLabelStyle}>Survivors</span>
          <span style={statValueStyle}>
            {stats?.survivors ?? 0}
          </span>
        </div>
        <div style={statBoxStyle}>
          <span style={statLabelStyle}>Survival %</span>
          <span style={statValueStyle}>
            {stats ? (stats.survivalRate * 100).toFixed(1) : '0.0'}%
          </span>
        </div>
        <div style={statBoxStyle}>
          <span style={statLabelStyle}>Diversity</span>
          <span style={statValueStyle}>
            {stats ? stats.geneticDiversity.toFixed(3) : '0.000'}
          </span>
        </div>
        <div style={statBoxStyle}>
          <span style={statLabelStyle}>Avg Genome</span>
          <span style={statValueStyle}>
            {stats ? stats.avgGenomeLength.toFixed(1) : '0'}
          </span>
        </div>
        {stats && stats.killDeaths > 0 && (
          <div style={statBoxStyle}>
            <span style={statLabelStyle}>Kill Deaths</span>
            <span style={{ ...statValueStyle, color: '#ef4444' }}>
              {stats.killDeaths}
            </span>
          </div>
        )}
      </div>

      {/* Mini chart: survival rate history */}
      {generationHistory.length > 1 && (
        <div>
          <div style={{
            fontSize: '0.7rem',
            color: '#888',
            marginBottom: '0.5rem',
            fontFamily: 'monospace',
          }}>
            Survival Rate Over Generations
          </div>
          <SurvivalChart history={generationHistory} />
        </div>
      )}
    </div>
  );
}

function SurvivalChart({ history }: { history: GenerationStats[] }) {
  const width = 500;
  const height = 80;
  const padding = { top: 4, right: 4, bottom: 16, left: 30 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Only show last 200 generations for performance
  const data = history.slice(-200);
  const maxGen = data.length;

  const maxSurvival = Math.max(...data.map(d => d.survivalRate), 0.01);

  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(maxGen - 1, 1)) * chartW;
    const y = padding.top + chartH - (d.survivalRate / maxSurvival) * chartH;
    return `${x},${y}`;
  }).join(' ');

  // Diversity line
  const maxDiversity = Math.max(...data.map(d => d.geneticDiversity), 0.01);
  const divPoints = data.map((d, i) => {
    const x = padding.left + (i / Math.max(maxGen - 1, 1)) * chartW;
    const y = padding.top + chartH - (d.geneticDiversity / maxDiversity) * chartH;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: '100%', height: 'auto' }}
    >
      {/* Grid lines */}
      <line
        x1={padding.left} y1={padding.top}
        x2={padding.left} y2={padding.top + chartH}
        stroke="#e0e0e0" strokeWidth={1}
      />
      <line
        x1={padding.left} y1={padding.top + chartH}
        x2={padding.left + chartW} y2={padding.top + chartH}
        stroke="#e0e0e0" strokeWidth={1}
      />

      {/* Survival rate line */}
      {data.length > 1 && (
        <polyline
          points={points}
          fill="none"
          stroke="#16a34a"
          strokeWidth={1.5}
        />
      )}

      {/* Diversity line */}
      {data.length > 1 && (
        <polyline
          points={divPoints}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={1}
          strokeDasharray="3,3"
        />
      )}

      {/* Labels */}
      <text x={padding.left - 2} y={padding.top + 8} fill="#999" fontSize={8} textAnchor="end">
        {(maxSurvival * 100).toFixed(0)}%
      </text>
      <text x={padding.left - 2} y={padding.top + chartH} fill="#999" fontSize={8} textAnchor="end">
        0%
      </text>
      <text x={padding.left} y={height - 2} fill="#999" fontSize={8}>
        Gen {data[0]?.generation ?? 0}
      </text>
      <text x={padding.left + chartW} y={height - 2} fill="#999" fontSize={8} textAnchor="end">
        {data[data.length - 1]?.generation ?? 0}
      </text>

      {/* Legend */}
      <line x1={padding.left + chartW - 80} y1={padding.top + 4} x2={padding.left + chartW - 65} y2={padding.top + 4} stroke="#16a34a" strokeWidth={1.5} />
      <text x={padding.left + chartW - 62} y={padding.top + 7} fill="#666" fontSize={7}>Survival</text>
      <line x1={padding.left + chartW - 80} y1={padding.top + 14} x2={padding.left + chartW - 65} y2={padding.top + 14} stroke="#3b82f6" strokeWidth={1} strokeDasharray="3,3" />
      <text x={padding.left + chartW - 62} y={padding.top + 17} fill="#666" fontSize={7}>Diversity</text>
    </svg>
  );
}
