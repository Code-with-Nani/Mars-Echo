import React from 'react';
import { Clock, Pause, Play, RotateCcw, FastForward } from 'lucide-react';

export type SimulationSpeed = 1 | 2 | 4;

interface SimulationControlsProps {
  elapsedHours: number;
  availableMissionHours: number;
  isRunning: boolean;
  simSpeed: SimulationSpeed;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onStepHours: (delta: number) => void;
  onSetElapsedHours: (hours: number) => void;
  onChangeSpeed: (speed: SimulationSpeed) => void;
}

const SPEED_OPTIONS: Array<{ value: SimulationSpeed; label: string; desc: string }> = [
  { value: 1, label: '1x', desc: '0.25 hr/sec' },
  { value: 2, label: '2x', desc: '0.50 hr/sec' },
  { value: 4, label: '4x', desc: '1.00 hr/sec' },
];

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  elapsedHours,
  availableMissionHours,
  isRunning,
  simSpeed,
  onStart,
  onPause,
  onReset,
  onStepHours,
  onSetElapsedHours,
  onChangeSpeed,
}) => {
  const hasDuration = availableMissionHours > 0;
  const isAtEnd = elapsedHours >= availableMissionHours;
  const isAtStart = elapsedHours <= 0;

  // Build integer hour presets strictly within [0, availableMissionHours]
  const presets: number[] = [];
  const maxInt = Math.floor(availableMissionHours);
  for (let h = 0; h <= maxInt; h += 1) {
    presets.push(h);
  }
  if (
    availableMissionHours > 0 &&
    Math.abs(availableMissionHours - maxInt) > 0.01
  ) {
    presets.push(Math.round(availableMissionHours * 100) / 100);
  }

  return (
    <section
      className="rounded-md border border-[#0042A6] bg-[#0042A6]/30 p-4 space-y-4"
      aria-label="Mission Simulation Controls"
    >
      {/* Top Row: Playback Actions + Elapsed Readout */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onStart}
            disabled={isRunning || !hasDuration || isAtEnd}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#2F96F5] bg-[#2F96F5] px-3.5 py-2 text-xs font-semibold text-[#07173F] transition-colors hover:bg-[#0960E1] hover:text-[#FFFFFF] hover:border-[#0960E1] disabled:cursor-not-allowed disabled:border-[#0042A6] disabled:bg-[#07173F] disabled:text-[#FFFFFF]/40 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F96F5]"
          >
            <Play className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Start Simulation</span>
          </button>

          <button
            type="button"
            onClick={onPause}
            disabled={!isRunning}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#0960E1] bg-[#0042A6] px-3.5 py-2 text-xs font-medium text-[#FFFFFF] transition-colors hover:bg-[#0960E1] disabled:cursor-not-allowed disabled:border-[#0042A6] disabled:bg-[#07173F] disabled:text-[#FFFFFF]/40 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F96F5]"
          >
            <Pause className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Pause</span>
          </button>

          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-md border border-[#2F96F5]/45 bg-[#07173F] px-3.5 py-2 text-xs font-medium text-[#FFFFFF] transition-colors hover:bg-[#0960E1] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F96F5]"
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Reset</span>
          </button>

          {/* Simulation Speed Selector */}
          <div
            className="flex items-center gap-1 rounded-md border border-[#0042A6] bg-[#07173F] p-0.5 ml-0 sm:ml-2"
            role="group"
            aria-label="Simulation speed"
          >
            <span className="flex items-center gap-1 px-2 text-[11px] text-[#FFFFFF]/70 whitespace-nowrap">
              <FastForward className="h-3 w-3 text-[#2F96F5]" aria-hidden="true" />
              <span>Speed</span>
            </span>
            {SPEED_OPTIONS.map((opt) => {
              const active = simSpeed === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChangeSpeed(opt.value)}
                  title={opt.desc}
                  className={`rounded px-2.5 py-1 font-mono text-xs font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F96F5] ${
                    active
                      ? 'bg-[#0960E1] text-[#FFFFFF]'
                      : 'text-[#FFFFFF]/70 hover:text-[#FFFFFF] hover:bg-[#0042A6]/60'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Simulation State + Elapsed Clock */}
        <div className="flex items-center justify-between gap-4 sm:justify-end">
          <div className="flex items-center gap-2 text-xs">
            <Clock className="h-4 w-4 text-[#EAFE07]" aria-hidden="true" />
            <span className="text-[#FFFFFF]/75">State:</span>
            <span
              className={`font-semibold ${
                isRunning
                  ? 'text-[#2F96F5]'
                  : isAtEnd && hasDuration
                    ? 'text-[#EAFE07]'
                    : 'text-[#FFFFFF]'
              }`}
            >
              {isRunning
                ? 'Running'
                : isAtEnd && hasDuration
                  ? 'Duration Reached'
                  : 'Paused'}
            </span>
          </div>

          <div className="flex items-baseline gap-1.5 border-l border-[#0042A6] pl-4">
            <span className="text-xs text-[#FFFFFF]/70">Elapsed</span>
            <span className="font-mono text-lg font-semibold tabular-nums text-[#EAFE07]">
              T+{elapsedHours.toFixed(2)}h
            </span>
            <span className="font-mono text-xs tabular-nums text-[#FFFFFF]/60">
              / {availableMissionHours.toFixed(1)}h
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Row: Manual Time Advancement & Presets */}
      <div className="flex flex-col gap-3 border-t border-[#0042A6]/80 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[11px] font-medium text-[#FFFFFF]/70">
              Jump to:
            </span>
            {presets.map((hr) => {
              const isActive = Math.abs(elapsedHours - hr) < 0.02;
              return (
                <button
                  key={hr}
                  type="button"
                  onClick={() => onSetElapsedHours(hr)}
                  className={`rounded border px-2.5 py-1 font-mono text-xs tabular-nums transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F96F5] ${
                    isActive
                      ? 'border-[#2F96F5] bg-[#2F96F5] font-semibold text-[#07173F]'
                      : 'border-[#2F96F5]/40 bg-[#07173F] text-[#FFFFFF] hover:bg-[#0960E1]'
                  }`}
                >
                  {hr}h
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="mr-1 text-[11px] font-medium text-[#FFFFFF]/70">
              Step:
            </span>
            <button
              type="button"
              disabled={isAtStart}
              onClick={() => onStepHours(-0.5)}
              className="rounded border border-[#2F96F5]/45 bg-[#07173F] px-2.5 py-1 font-mono text-xs text-[#FFFFFF] transition-colors hover:bg-[#0960E1] disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F96F5]"
            >
              −0.5h
            </button>
            <button
              type="button"
              disabled={isAtEnd || !hasDuration}
              onClick={() => onStepHours(0.5)}
              className="rounded border border-[#2F96F5]/45 bg-[#07173F] px-2.5 py-1 font-mono text-xs text-[#FFFFFF] transition-colors hover:bg-[#0960E1] disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F96F5]"
            >
              +0.5h
            </button>
            <button
              type="button"
              disabled={isAtEnd || !hasDuration}
              onClick={() => onStepHours(1)}
              className="rounded border border-[#2F96F5]/45 bg-[#07173F] px-2.5 py-1 font-mono text-xs text-[#FFFFFF] transition-colors hover:bg-[#0960E1] disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F96F5]"
            >
              +1.0h
            </button>
          </div>
        </div>

        {/* Fine Timeline Scrubber */}
        <div className="flex items-center gap-3">
          <label
            htmlFor="eva-sim-scrubber"
            className="text-[11px] text-[#FFFFFF]/75 whitespace-nowrap"
          >
            Timeline Scrubber (0–{availableMissionHours.toFixed(1)}h)
          </label>
          <input
            id="eva-sim-scrubber"
            type="range"
            min={0}
            max={Math.max(0.25, availableMissionHours)}
            step={0.05}
            disabled={!hasDuration}
            value={Math.min(elapsedHours, availableMissionHours)}
            onChange={(e) => onSetElapsedHours(parseFloat(e.target.value))}
            className="h-1.5 flex-1 cursor-pointer accent-[#2F96F5] disabled:cursor-not-allowed"
          />
        </div>
      </div>
    </section>
  );
};
