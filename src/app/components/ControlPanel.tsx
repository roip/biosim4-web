'use client';

import { SimParams } from '@/lib/biosim4/config';
import { SurvivalCriteria, BarrierType } from '@/lib/biosim4/types';

interface ControlPanelProps {
  params: SimParams;
  isRunning: boolean;
  isPaused: boolean;
  stepsPerFrame: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onStep: () => void;
  onStepGeneration: () => void;
  onParamsChange: (params: Partial<SimParams>) => void;
  onSpeedChange: (speed: number) => void;
}

const sectionStyle: React.CSSProperties = {
  marginBottom: '1rem',
  padding: '0.75rem',
  background: '#ffffff',
  borderRadius: '8px',
  border: '1px solid #e0e0e0',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '0.8rem',
  color: '#555',
  marginBottom: '0.35rem',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#16a34a',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  marginBottom: '0.6rem',
  fontFamily: 'monospace',
};

const sliderStyle: React.CSSProperties = {
  width: '100%',
  accentColor: '#16a34a',
};

const btnBase: React.CSSProperties = {
  padding: '0.5rem 1rem',
  borderRadius: '6px',
  border: '1px solid #d0d0d0',
  background: '#f5f5f5',
  color: '#333',
  fontSize: '0.8rem',
  cursor: 'pointer',
  fontFamily: 'monospace',
  transition: 'background 0.15s',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.35rem',
  borderRadius: '4px',
  background: '#ffffff',
  color: '#333',
  border: '1px solid #d0d0d0',
  fontSize: '0.8rem',
};

export default function ControlPanel({
  params,
  isRunning,
  isPaused,
  stepsPerFrame,
  onStart,
  onPause,
  onResume,
  onReset,
  onStep,
  onStepGeneration,
  onParamsChange,
  onSpeedChange,
}: ControlPanelProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.25rem',
      overflowY: 'auto',
      maxHeight: 'calc(100vh - 100px)',
      paddingRight: '0.5rem',
    }}>
      {/* Simulation Controls */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Simulation</div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {!isRunning ? (
            <button onClick={onStart} style={{ ...btnBase, background: '#dcfce7', color: '#16a34a', borderColor: '#86efac' }}>
              Start
            </button>
          ) : (
            <button onClick={onPause} style={{ ...btnBase, background: '#fef9c3', color: '#a16207', borderColor: '#fde047' }}>
              Pause
            </button>
          )}
          {isPaused && (
            <button onClick={onResume} style={{ ...btnBase, background: '#dcfce7', color: '#16a34a', borderColor: '#86efac' }}>
              Resume
            </button>
          )}
          <button onClick={onReset} style={{ ...btnBase, background: '#fee2e2', color: '#dc2626', borderColor: '#fca5a5' }}>
            Reset
          </button>
          <button onClick={onStep} style={btnBase} disabled={isRunning}>
            Step
          </button>
          <button onClick={onStepGeneration} style={btnBase} disabled={isRunning}>
            Gen
          </button>
        </div>
      </div>

      {/* Speed */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Speed</div>
        <div style={labelStyle}>
          <span>Steps per frame</span>
          <span style={{ color: '#16a34a', fontFamily: 'monospace' }}>{stepsPerFrame}</span>
        </div>
        <input
          type="range"
          min={1}
          max={50}
          value={stepsPerFrame}
          onChange={e => onSpeedChange(Number(e.target.value))}
          style={sliderStyle}
        />
      </div>

      {/* Population */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Population</div>
        <div style={labelStyle}>
          <span>Population size</span>
          <span style={{ fontFamily: 'monospace' }}>{params.population}</span>
        </div>
        <input
          type="range"
          min={100}
          max={5000}
          step={100}
          value={params.population}
          onChange={e => onParamsChange({ population: Number(e.target.value) })}
          style={sliderStyle}
        />

        <div style={labelStyle}>
          <span>Steps per generation</span>
          <span style={{ fontFamily: 'monospace' }}>{params.stepsPerGeneration}</span>
        </div>
        <input
          type="range"
          min={50}
          max={1000}
          step={10}
          value={params.stepsPerGeneration}
          onChange={e => onParamsChange({ stepsPerGeneration: Number(e.target.value) })}
          style={sliderStyle}
        />

        <div style={labelStyle}>
          <span>Max generations</span>
          <span style={{ fontFamily: 'monospace' }}>{params.maxGenerations}</span>
        </div>
        <input
          type="range"
          min={10}
          max={5000}
          step={10}
          value={params.maxGenerations}
          onChange={e => onParamsChange({ maxGenerations: Number(e.target.value) })}
          style={sliderStyle}
        />
      </div>

      {/* World */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>World</div>
        <div style={labelStyle}>
          <span>Grid size</span>
          <span style={{ fontFamily: 'monospace' }}>{params.sizeX} x {params.sizeY}</span>
        </div>
        <input
          type="range"
          min={32}
          max={256}
          step={16}
          value={params.sizeX}
          onChange={e => onParamsChange({ sizeX: Number(e.target.value), sizeY: Number(e.target.value) })}
          style={sliderStyle}
        />
      </div>

      {/* Genome */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Genome</div>

        <div style={labelStyle}>
          <span>Initial genome length</span>
          <span style={{ fontFamily: 'monospace' }}>{params.genomeInitialLengthMin}-{params.genomeInitialLengthMax}</span>
        </div>
        <input
          type="range"
          min={4}
          max={100}
          value={params.genomeInitialLengthMax}
          onChange={e => {
            const v = Number(e.target.value);
            onParamsChange({ genomeInitialLengthMin: v, genomeInitialLengthMax: v });
          }}
          style={sliderStyle}
        />

        <div style={labelStyle}>
          <span>Max genome length</span>
          <span style={{ fontFamily: 'monospace' }}>{params.genomeMaxLength}</span>
        </div>
        <input
          type="range"
          min={24}
          max={1000}
          step={10}
          value={params.genomeMaxLength}
          onChange={e => onParamsChange({ genomeMaxLength: Number(e.target.value) })}
          style={sliderStyle}
        />

        <div style={labelStyle}>
          <span>Internal neurons</span>
          <span style={{ fontFamily: 'monospace' }}>{params.maxNumberNeurons}</span>
        </div>
        <input
          type="range"
          min={1}
          max={20}
          value={params.maxNumberNeurons}
          onChange={e => onParamsChange({ maxNumberNeurons: Number(e.target.value) })}
          style={sliderStyle}
        />
      </div>

      {/* Mutation */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Mutation</div>

        <div style={labelStyle}>
          <span>Point mutation rate</span>
          <span style={{ fontFamily: 'monospace' }}>{params.pointMutationRate.toFixed(4)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={0.01}
          step={0.0001}
          value={params.pointMutationRate}
          onChange={e => onParamsChange({ pointMutationRate: Number(e.target.value) })}
          style={sliderStyle}
        />

        <div style={labelStyle}>
          <span>Insertion/deletion rate</span>
          <span style={{ fontFamily: 'monospace' }}>{params.geneInsertionDeletionRate.toFixed(4)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={0.005}
          step={0.0001}
          value={params.geneInsertionDeletionRate}
          onChange={e => onParamsChange({ geneInsertionDeletionRate: Number(e.target.value) })}
          style={sliderStyle}
        />
      </div>

      {/* Reproduction */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Reproduction</div>
        <label style={{ ...labelStyle, cursor: 'pointer' }}>
          <span>Sexual reproduction</span>
          <input
            type="checkbox"
            checked={params.sexualReproduction}
            onChange={e => onParamsChange({ sexualReproduction: e.target.checked })}
            style={{ accentColor: '#16a34a' }}
          />
        </label>
        <label style={{ ...labelStyle, cursor: 'pointer' }}>
          <span>Choose parents by fitness</span>
          <input
            type="checkbox"
            checked={params.chooseParentsByFitness}
            onChange={e => onParamsChange({ chooseParentsByFitness: e.target.checked })}
            style={{ accentColor: '#16a34a' }}
          />
        </label>
        <label style={{ ...labelStyle, cursor: 'pointer' }}>
          <span>Kill enabled</span>
          <input
            type="checkbox"
            checked={params.killEnable}
            onChange={e => onParamsChange({ killEnable: e.target.checked })}
            style={{ accentColor: '#16a34a' }}
          />
        </label>
      </div>

      {/* Survival Criteria (multi-select) */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Survival Zones</div>
        <p style={{ fontSize: '0.7rem', color: '#888', marginBottom: '0.5rem' }}>
          Select one or more. Creature survives if it satisfies ANY active zone.
        </p>
        {([
          [SurvivalCriteria.CIRCLE, 'Circle (center)'],
          [SurvivalCriteria.LEFT_EIGHTH, 'Left Eighth'],
          [SurvivalCriteria.RIGHT_EIGHTH, 'Right Eighth'],
          [SurvivalCriteria.CENTER_WEIGHTED, 'Center Weighted'],
          [SurvivalCriteria.CORNER_WEIGHTED, 'Corner Weighted'],
          [SurvivalCriteria.PAIRS, 'Pairs (neighbors)'],
          [SurvivalCriteria.CONTACT, 'Contact'],
          [SurvivalCriteria.AGAINST_ANY_WALL, 'Against Any Wall'],
          [SurvivalCriteria.TOUCH_ANY_WALL, 'Touch Any Wall'],
        ] as [SurvivalCriteria, string][]).map(([value, label]) => {
          const active = params.survivalCriteria.includes(value);
          return (
            <label key={value} style={{ ...labelStyle, cursor: 'pointer' }}>
              <span>{label}</span>
              <input
                type="checkbox"
                checked={active}
                onChange={e => {
                  const next = e.target.checked
                    ? [...params.survivalCriteria, value]
                    : params.survivalCriteria.filter(c => c !== value);
                  onParamsChange({ survivalCriteria: next.length > 0 ? next : [value] });
                }}
                style={{ accentColor: '#16a34a' }}
              />
            </label>
          );
        })}
      </div>

      {/* Barriers */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Barriers</div>
        <select
          value={params.barrierType}
          onChange={e => onParamsChange({ barrierType: Number(e.target.value) as BarrierType })}
          style={selectStyle}
        >
          <option value={BarrierType.NONE}>None</option>
          <option value={BarrierType.VERTICAL_BAR_CONSTANT}>Vertical Bar (fixed)</option>
          <option value={BarrierType.VERTICAL_BAR_RANDOM}>Vertical Bar (random)</option>
          <option value={BarrierType.FIVE_BLOCKS}>Five Blocks</option>
          <option value={BarrierType.HORIZONTAL_BAR_CONSTANT}>Horizontal Bar</option>
          <option value={BarrierType.FLOATING_ISLANDS}>Floating Islands</option>
          <option value={BarrierType.SPOTS}>Spots</option>
        </select>
      </div>

      {/* Seed */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>RNG Seed</div>
        <div style={labelStyle}>
          <span>Seed value</span>
          <span style={{ fontFamily: 'monospace' }}>{params.rngSeed}</span>
        </div>
        <input
          type="number"
          value={params.rngSeed}
          onChange={e => onParamsChange({ rngSeed: Number(e.target.value) })}
          style={{
            ...selectStyle,
            width: '100%',
          }}
        />
        <p style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.25rem' }}>
          Change seed and reset for a different run. Same seed = same results.
        </p>
      </div>
    </div>
  );
}
