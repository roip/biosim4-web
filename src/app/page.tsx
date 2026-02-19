'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import SimulationCanvas from './components/SimulationCanvas';
import ControlPanel from './components/ControlPanel';
import StatsPanel from './components/StatsPanel';
import GenomeViewer from './components/GenomeViewer';
import { SimParams, DEFAULT_PARAMS } from '@/lib/biosim4/config';
import type { WorkerCommand, WorkerMessage, SerializableState, IndivInfo } from '@/lib/biosim4/worker';
import type { GenerationStats } from '@/lib/biosim4/analysis';

export default function Biosim4Page() {
  const workerRef = useRef<Worker | null>(null);
  const [state, setState] = useState<SerializableState | null>(null);
  const [params, setParams] = useState<SimParams>(DEFAULT_PARAMS);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showSignals, setShowSignals] = useState(false);
  const [showBarriers, setShowBarriers] = useState(true);
  const [showSurvivalZone, setShowSurvivalZone] = useState(false);
  const [zoom, setZoom] = useState(5);
  const [stepsPerFrame, setStepsPerFrame] = useState(1);
  const [inspectedIndiv, setInspectedIndiv] = useState<{
    data: { sensors: string[]; actions: string[]; connections: { from: string; to: string; weight: number }[] } | null;
    info: IndivInfo | null;
  } | null>(null);
  const [generationHistory, setGenerationHistory] = useState<GenerationStats[]>([]);

  // Initialize web worker
  useEffect(() => {
    const worker = new Worker(
      new URL('@/lib/biosim4/worker.ts', import.meta.url),
    );

    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const msg = e.data;
      switch (msg.type) {
        case 'state':
          setState(msg.state);
          setIsRunning(msg.state.running);
          setIsPaused(msg.state.paused);
          if (msg.state.generationHistory.length > 0) {
            setGenerationHistory(msg.state.generationHistory);
          }
          break;
        case 'generationComplete':
          setGenerationHistory(prev => [...prev, msg.stats]);
          break;
        case 'inspectResult':
          setInspectedIndiv({ data: msg.data, info: msg.indivInfo });
          break;
        case 'error':
          console.error('Biosim4 worker error:', msg.message);
          break;
      }
    };

    workerRef.current = worker;

    // Initialize simulation
    worker.postMessage({ type: 'init', params: DEFAULT_PARAMS } as WorkerCommand);

    return () => {
      worker.terminate();
    };
  }, []);

  const sendCommand = useCallback((cmd: WorkerCommand) => {
    workerRef.current?.postMessage(cmd);
  }, []);

  const handleStart = useCallback(() => {
    sendCommand({ type: 'start' });
  }, [sendCommand]);

  const handlePause = useCallback(() => {
    sendCommand({ type: 'pause' });
  }, [sendCommand]);

  const handleResume = useCallback(() => {
    sendCommand({ type: 'resume' });
  }, [sendCommand]);

  const handleReset = useCallback(() => {
    setGenerationHistory([]);
    setInspectedIndiv(null);
    sendCommand({ type: 'reset', params });
  }, [sendCommand, params]);

  const handleStep = useCallback(() => {
    sendCommand({ type: 'step' });
  }, [sendCommand]);

  const handleStepGeneration = useCallback(() => {
    sendCommand({ type: 'stepGeneration' });
  }, [sendCommand]);

  const handleParamsChange = useCallback((newParams: Partial<SimParams>) => {
    setParams(prev => {
      const next = { ...prev, ...newParams };
      // Barrier type or grid size changes require a full reset to take effect
      if ('barrierType' in newParams || 'sizeX' in newParams || 'sizeY' in newParams) {
        sendCommand({ type: 'reset', params: next });
        setGenerationHistory([]);
        setInspectedIndiv(null);
      } else {
        sendCommand({ type: 'updateParams', params: newParams });
      }
      return next;
    });
  }, [sendCommand]);

  const handleSpeedChange = useCallback((speed: number) => {
    setStepsPerFrame(speed);
    sendCommand({ type: 'setSpeed', stepsPerFrame: speed });
  }, [sendCommand]);

  const handleCellClick = useCallback((x: number, y: number) => {
    sendCommand({ type: 'inspect', x, y });
  }, [sendCommand]);

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', color: '#1a1a2e' }}>
      {/* Header */}
      <header style={{
        padding: '1.5rem 2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        borderBottom: '1px solid #e0e0e0',
      }}>
        <h1 style={{
          fontSize: '1.25rem',
          fontWeight: 600,
          color: '#16a34a',
          fontFamily: 'monospace',
        }}>
          biosim4
        </h1>
        <span style={{
          fontSize: '0.75rem',
          color: '#888',
          fontFamily: 'monospace',
        }}>
          Biological Evolution Simulator
        </span>
        <div style={{ flex: 1 }} />
        <a
          href="https://github.com/davidrmiller/biosim4"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: '#666',
            textDecoration: 'none',
            fontSize: '0.8rem',
            fontFamily: 'monospace',
          }}
        >
          Original C++ project
        </a>
      </header>

      {/* Main content area */}
      <main style={{
        display: 'grid',
        gridTemplateColumns: '1fr 340px',
        gap: '1rem',
        padding: '1rem',
        maxWidth: '1600px',
        margin: '0 auto',
        minHeight: 'calc(100vh - 80px)',
      }}>
        {/* Left: Canvas + Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Simulation Canvas */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '1rem',
            border: '1px solid #e0e0e0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.75rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#16a34a' }}>
                  Gen {state?.generation ?? 0}
                </span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#666' }}>
                  Step {state?.simStep ?? 0} / {params.stepsPerGeneration}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <label
                  style={{ fontSize: '0.75rem', color: '#555', cursor: 'pointer' }}
                  title="Pheromone trails left by creatures — blue tint shows where signals have been emitted"
                >
                  <input
                    type="checkbox"
                    checked={showSignals}
                    onChange={e => setShowSignals(e.target.checked)}
                    style={{ marginRight: '4px' }}
                  />
                  Signals
                </label>
                <label
                  style={{ fontSize: '0.75rem', color: '#555', cursor: 'pointer' }}
                  title="Impassable walls placed on the grid — creatures cannot move through them"
                >
                  <input
                    type="checkbox"
                    checked={showBarriers}
                    onChange={e => setShowBarriers(e.target.checked)}
                    style={{ marginRight: '4px' }}
                  />
                  Barriers
                </label>
                <label
                  style={{ fontSize: '0.75rem', color: '#555', cursor: 'pointer' }}
                  title="Green highlighted area where creatures must be at the end of a generation to survive and reproduce"
                >
                  <input
                    type="checkbox"
                    checked={showSurvivalZone}
                    onChange={e => setShowSurvivalZone(e.target.checked)}
                    style={{ marginRight: '4px' }}
                  />
                  Zone
                </label>
                <label style={{ fontSize: '0.75rem', color: '#555' }}>
                  Zoom:
                  <input
                    type="range"
                    min={1}
                    max={8}
                    value={zoom}
                    onChange={e => setZoom(Number(e.target.value))}
                    style={{ width: '60px', marginLeft: '4px', verticalAlign: 'middle' }}
                  />
                  {zoom}x
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', overflow: 'auto' }}>
              <SimulationCanvas
                state={state}
                showSignals={showSignals}
                showBarriers={showBarriers}
                showSurvivalZone={showSurvivalZone}
                survivalCriteria={params.survivalCriteria}
                zoom={zoom}
                onCellClick={handleCellClick}
              />
            </div>
          </div>

          {/* Stats Panel */}
          <StatsPanel
            stats={state?.stats ?? null}
            generationHistory={generationHistory}
          />

          {/* Genome Viewer */}
          {inspectedIndiv && inspectedIndiv.data && (
            <GenomeViewer
              data={inspectedIndiv.data}
              info={inspectedIndiv.info}
              onClose={() => setInspectedIndiv(null)}
            />
          )}
        </div>

        {/* Right: Control Panel */}
        <ControlPanel
          params={params}
          isRunning={isRunning}
          isPaused={isPaused}
          stepsPerFrame={stepsPerFrame}
          onStart={handleStart}
          onPause={handlePause}
          onResume={handleResume}
          onReset={handleReset}
          onStep={handleStep}
          onStepGeneration={handleStepGeneration}
          onParamsChange={handleParamsChange}
          onSpeedChange={handleSpeedChange}
        />
      </main>
    </div>
  );
}
