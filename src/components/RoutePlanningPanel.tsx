import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Flag,
  Home,
  Info,
  Loader2,
  Route as RouteIcon,
  ShieldAlert,
  Sliders,
  X,
  XCircle,
} from 'lucide-react';
import type {
  CandidateRouteEvaluation,
  CoordinateFormat,
  ElevationDatasetId,
  MissionDecisionOutcome,
  RouteOptimizationResult,
  RoutePointInput,
  RouteStrategyId,
  TraversalRules,
} from '../types/mars';
import type { TerrainOverlayLoadState } from './TerrainRiskLegend';
import { ELEVATION_DATASETS, type ElevationDatasetMeta } from '../utils/marsDemService';
import type { AstronautResourceProfile } from '../utils/resourceCalculator';
import { formatCoordinatePair } from '../utils/marsCoordinates';

export type RoutePickMode = 'none' | 'habitat' | 'destination';

interface RoutePlanningPanelProps {
  habitat: RoutePointInput | null;
  destination: RoutePointInput | null;
  onChangeHabitat: (point: RoutePointInput) => void;
  onChangeDestination: (point: RoutePointInput) => void;
  pickMode: RoutePickMode;
  onChangePickMode: (mode: RoutePickMode) => void;
  onLoadJezeroPreset: () => void;
  onCenterOnRoutes: () => void;
  elevationDatasetId: ElevationDatasetId;
  onSelectElevationDataset: (id: ElevationDatasetId) => void;
  activeDataset: ElevationDatasetMeta;
  terrainLoadState: TerrainOverlayLoadState;
  terrainError: string | null;
  traversalRules: TraversalRules;
  onChangeTraversalRules: (rules: TraversalRules) => void;
  evaProfile: AstronautResourceProfile;
  onChangeEvaProfile: React.Dispatch<React.SetStateAction<AstronautResourceProfile>>;
  evaElapsedHours: number;
  onChangeEvaElapsedHours: (hours: number) => void;
  optimizationResult: RouteOptimizationResult;
  selectedStrategyId: RouteStrategyId;
  onSelectStrategy: (id: RouteStrategyId) => void;
  coordinateFormat: CoordinateFormat;
  onOpenEvaDashboard: () => void;
  onCloseMobile?: () => void;
}

function getDecisionStyle(decision: MissionDecisionOutcome): {
  border: string;
  bg: string;
  text: string;
  badgeBg: string;
  Icon: React.ComponentType<{ className?: string }>;
} {
  switch (decision) {
    case 'FEASIBLE':
      return {
        border: 'border-[#22C55E]/70',
        bg: 'bg-[#22C55E]/15',
        text: 'text-[#22C55E]',
        badgeBg: 'bg-[#22C55E] text-[#07173F]',
        Icon: CheckCircle2,
      };
    case 'AT RISK':
      return {
        border: 'border-[#EAFE07]/75',
        bg: 'bg-[#EAFE07]/15',
        text: 'text-[#EAFE07]',
        badgeBg: 'bg-[#EAFE07] text-[#07173F]',
        Icon: AlertTriangle,
      };
    case 'NOT FEASIBLE':
      return {
        border: 'border-[#E43700]',
        bg: 'bg-[#8E1100]/45',
        text: 'text-[#E43700]',
        badgeBg: 'bg-[#E43700] text-[#FFFFFF]',
        Icon: XCircle,
      };
    case 'INSUFFICIENT DATA':
      return {
        border: 'border-[#6B7280]',
        bg: 'bg-[#0042A6]/40',
        text: 'text-[#FFFFFF]/80',
        badgeBg: 'bg-[#6B7280] text-[#FFFFFF]',
        Icon: Info,
      };
  }
}

export const RoutePlanningPanel: React.FC<RoutePlanningPanelProps> = ({
  habitat,
  destination,
  onChangeHabitat,
  onChangeDestination,
  pickMode,
  onChangePickMode,
  onLoadJezeroPreset,
  onCenterOnRoutes,
  elevationDatasetId,
  onSelectElevationDataset,
  activeDataset,
  terrainLoadState,
  terrainError,
  traversalRules,
  onChangeTraversalRules,
  evaProfile,
  onChangeEvaProfile,
  evaElapsedHours,
  onChangeEvaElapsedHours,
  optimizationResult,
  selectedStrategyId,
  onSelectStrategy,
  coordinateFormat,
  onOpenEvaDashboard,
  onCloseMobile,
}) => {
  const [showEvaConfig, setShowEvaConfig] = useState(false);

  const selectedEval: CandidateRouteEvaluation =
    optimizationResult.strategies[selectedStrategyId];
  const decisionStyle = getDecisionStyle(selectedEval.decision);
  const DecisionIcon = decisionStyle.Icon;

  const strategyList: CandidateRouteEvaluation[] = [
    optimizationResult.strategies.shortest,
    optimizationResult.strategies['lowest-risk'],
    optimizationResult.strategies.balanced,
  ];

  const handleCoordInput = (
    role: 'habitat' | 'destination',
    field: 'lat' | 'lon',
    rawVal: string
  ) => {
    const parsed = parseFloat(rawVal);
    const val = Number.isNaN(parsed) ? Number.NaN : parsed;
    const base =
      role === 'habitat'
        ? habitat ?? { label: 'Habitat Base', lat: 18.375, lon: 77.465 }
        : destination ?? {
            label: 'Exploration Destination',
            lat: 18.408,
            lon: 77.43,
          };
    const next = { ...base, [field]: val };
    if (role === 'habitat') onChangeHabitat(next);
    else onChangeDestination(next);
  };

  const updateEvaField = (
    field: keyof AstronautResourceProfile,
    rawVal: string
  ) => {
    const parsed = parseFloat(rawVal);
    const val = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    const clamped =
      field === 'startingOxygenPct' ||
      field === 'startingBatteryPct' ||
      field === 'startingCoolingPct'
        ? Math.min(100, val)
        : field === 'availableMissionHours'
          ? Math.min(24, val)
          : Math.min(100, val);
    onChangeEvaProfile((prev) => ({ ...prev, [field]: clamped }));
  };

  return (
    <aside
      className="flex h-full w-full flex-col border-l border-[#0042A6] bg-[#07173F] md:w-[392px] xl:w-[420px] shrink-0"
      aria-label="Return Path Optimizer"
    >
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#0042A6] bg-[#0042A6]/45 px-4">
        <div className="flex items-center gap-2">
          <RouteIcon className="h-4 w-4 text-[#EAFE07]" />
          <h2 className="text-sm font-semibold tracking-tight text-[#FFFFFF]">
            Return Path Optimizer
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onCenterOnRoutes}
            className="flex items-center gap-1 rounded border border-[#2F96F5]/50 bg-[#0042A6] px-2 py-1 text-[11px] font-medium text-[#FFFFFF] hover:bg-[#0960E1] transition-colors"
            title="Fit map to Habitat & Destination corridor"
          >
            <Crosshair className="h-3 w-3 text-[#2F96F5]" />
            <span>Fit</span>
          </button>
          <button
            type="button"
            onClick={onLoadJezeroPreset}
            className="rounded border border-[#2F96F5]/50 bg-[#0042A6] px-2 py-1 text-[11px] font-medium text-[#FFFFFF] hover:bg-[#0960E1] transition-colors"
            title="Load Jezero Delta sample corridor"
          >
            Jezero Preset
          </button>
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="rounded p-1 text-[#FFFFFF]/75 hover:bg-[#0042A6] hover:text-[#FFFFFF] md:hidden"
              aria-label="Close Return Path Optimizer panel"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* Terrain Source & Status */}
        <section className="rounded-md border border-[#0042A6] bg-[#0042A6]/25 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="route-dem-dataset"
              className="text-[11px] font-semibold text-[#FFFFFF]"
            >
              Elevation Dataset
            </label>
            <span className="flex items-center gap-1 font-mono text-[10px]">
              {terrainLoadState === 'loading' && (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-[#2F96F5]" />
                  <span className="text-[#2F96F5]">Fetching PDS4...</span>
                </>
              )}
              {terrainLoadState === 'ready' && (
                <span
                  className={
                    activeDataset.isSynthetic ? 'text-[#EAFE07]' : 'text-[#2F96F5]'
                  }
                >
                  {activeDataset.isSynthetic ? 'Synthetic Mode' : 'NASA PDS4 Ready'}
                </span>
              )}
              {terrainLoadState === 'unavailable' && (
                <span className="text-[#E43700]">Unavailable</span>
              )}
            </span>
          </div>

          <select
            id="route-dem-dataset"
            value={elevationDatasetId}
            onChange={(e) =>
              onSelectElevationDataset(e.target.value as ElevationDatasetId)
            }
            className="w-full rounded border border-[#2F96F5]/50 bg-[#07173F] px-2.5 py-1.5 text-xs text-[#FFFFFF] focus:border-[#2F96F5] focus:outline-none"
          >
            {ELEVATION_DATASETS.map((ds) => (
              <option key={ds.id} value={ds.id}>
                {ds.shortName}
                {!ds.isAvailable
                  ? ' (Unavailable)'
                  : ds.isSynthetic
                    ? ' (Synthetic Only)'
                    : ''}
              </option>
            ))}
          </select>

          {terrainError && (
            <div className="rounded border border-[#E43700] bg-[#8E1100]/40 px-2.5 py-1.5 text-[10px] text-[#FFFFFF]">
              {terrainError}
            </div>
          )}

          {activeDataset.isSynthetic && (
            <div className="flex items-start gap-1.5 rounded border border-[#EAFE07]/60 bg-[#EAFE07]/10 px-2 py-1.5 text-[10px] text-[#EAFE07]">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Synthetic Testing Mode active — terrain &amp; routes do NOT use real NASA MOLA elevation data.
              </span>
            </div>
          )}
        </section>

        {/* A. Mission Location Selection */}
        <section className="rounded-md border border-[#0042A6] bg-[#0042A6]/25 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#FFFFFF]">
              A. Mission Locations
            </span>
            <span className="text-[10px] text-[#FFFFFF]/65">
              Click map after activating Pick
            </span>
          </div>

          {/* Habitat / Start */}
          <div className="rounded border border-[#2F96F5]/35 bg-[#07173F]/80 p-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#2F96F5]">
                <Home className="h-3.5 w-3.5" />
                <span>Habitat / Start</span>
              </span>
              <button
                type="button"
                onClick={() =>
                  onChangePickMode(pickMode === 'habitat' ? 'none' : 'habitat')
                }
                className={`rounded border px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                  pickMode === 'habitat'
                    ? 'border-[#EAFE07] bg-[#EAFE07] text-[#07173F]'
                    : 'border-[#2F96F5]/50 bg-[#0042A6] text-[#FFFFFF] hover:bg-[#0960E1]'
                }`}
              >
                {pickMode === 'habitat' ? 'Click Map Now...' : 'Pick on Map'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <label className="space-y-0.5">
                <span className="block text-[#FFFFFF]/65">Lat (&deg;)</span>
                <input
                  type="number"
                  step={0.005}
                  value={
                    habitat && Number.isFinite(habitat.lat) ? habitat.lat : ''
                  }
                  onChange={(e) =>
                    handleCoordInput('habitat', 'lat', e.target.value)
                  }
                  className="w-full rounded border border-[#2F96F5]/40 bg-[#07173F] px-2 py-1 font-mono text-[11px] tabular-nums text-[#FFFFFF]"
                />
              </label>
              <label className="space-y-0.5">
                <span className="block text-[#FFFFFF]/65">Lon (&deg;)</span>
                <input
                  type="number"
                  step={0.005}
                  value={
                    habitat && Number.isFinite(habitat.lon) ? habitat.lon : ''
                  }
                  onChange={(e) =>
                    handleCoordInput('habitat', 'lon', e.target.value)
                  }
                  className="w-full rounded border border-[#2F96F5]/40 bg-[#07173F] px-2 py-1 font-mono text-[11px] tabular-nums text-[#FFFFFF]"
                />
              </label>
            </div>

            {habitat && Number.isFinite(habitat.lat) && Number.isFinite(habitat.lon) && (
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-mono text-[#FFFFFF]/75">
                  {formatCoordinatePair(habitat.lat, habitat.lon, coordinateFormat, 3)}
                </span>
                <span
                  className={
                    optimizationResult.habitatValid
                      ? 'text-[#22C55E]'
                      : 'text-[#E43700]'
                  }
                >
                  {optimizationResult.habitatCell?.elevationMeters != null
                    ? `${optimizationResult.habitatCell.elevationMeters.toFixed(0)} m · ${optimizationResult.habitatCell.difficultyLabel}`
                    : 'Outside / No Data'}
                </span>
              </div>
            )}
          </div>

          {/* Exploration Destination */}
          <div className="rounded border border-[#2F96F5]/35 bg-[#07173F]/80 p-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#EAFE07]">
                <Flag className="h-3.5 w-3.5" />
                <span>Exploration Destination</span>
              </span>
              <button
                type="button"
                onClick={() =>
                  onChangePickMode(
                    pickMode === 'destination' ? 'none' : 'destination'
                  )
                }
                className={`rounded border px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                  pickMode === 'destination'
                    ? 'border-[#EAFE07] bg-[#EAFE07] text-[#07173F]'
                    : 'border-[#2F96F5]/50 bg-[#0042A6] text-[#FFFFFF] hover:bg-[#0960E1]'
                }`}
              >
                {pickMode === 'destination' ? 'Click Map Now...' : 'Pick on Map'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <label className="space-y-0.5">
                <span className="block text-[#FFFFFF]/65">Lat (&deg;)</span>
                <input
                  type="number"
                  step={0.005}
                  value={
                    destination && Number.isFinite(destination.lat)
                      ? destination.lat
                      : ''
                  }
                  onChange={(e) =>
                    handleCoordInput('destination', 'lat', e.target.value)
                  }
                  className="w-full rounded border border-[#2F96F5]/40 bg-[#07173F] px-2 py-1 font-mono text-[11px] tabular-nums text-[#FFFFFF]"
                />
              </label>
              <label className="space-y-0.5">
                <span className="block text-[#FFFFFF]/65">Lon (&deg;)</span>
                <input
                  type="number"
                  step={0.005}
                  value={
                    destination && Number.isFinite(destination.lon)
                      ? destination.lon
                      : ''
                  }
                  onChange={(e) =>
                    handleCoordInput('destination', 'lon', e.target.value)
                  }
                  className="w-full rounded border border-[#2F96F5]/40 bg-[#07173F] px-2 py-1 font-mono text-[11px] tabular-nums text-[#FFFFFF]"
                />
              </label>
            </div>

            {destination &&
              Number.isFinite(destination.lat) &&
              Number.isFinite(destination.lon) && (
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-mono text-[#FFFFFF]/75">
                    {formatCoordinatePair(
                      destination.lat,
                      destination.lon,
                      coordinateFormat,
                      3
                    )}
                  </span>
                  <span
                    className={
                      optimizationResult.destinationValid
                        ? 'text-[#22C55E]'
                        : 'text-[#E43700]'
                    }
                  >
                    {optimizationResult.destinationCell?.elevationMeters != null
                      ? `${optimizationResult.destinationCell.elevationMeters.toFixed(0)} m · ${optimizationResult.destinationCell.difficultyLabel}`
                      : 'Outside / No Data'}
                  </span>
                </div>
              )}
          </div>

          <div className="text-[10px] leading-snug text-[#FFFFFF]/75">
            {optimizationResult.coverageMessage}
          </div>
        </section>

        {/* B. Traversal & Reserve Rules + Synced EVA Resource Settings */}
        <section className="rounded-md border border-[#0042A6] bg-[#0042A6]/25 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-[#FFFFFF]">
              <Sliders className="h-3.5 w-3.5 text-[#2F96F5]" />
              <span>Traversal &amp; Reserve Rules</span>
            </span>
            <button
              type="button"
              onClick={onOpenEvaDashboard}
              className="text-[10px] font-medium text-[#2F96F5] hover:text-[#FFFFFF] underline"
            >
              EVA Dashboard
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <label className="flex items-center gap-1.5 rounded border border-[#2F96F5]/30 bg-[#07173F]/70 px-2 py-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={traversalRules.allowDifficult}
                onChange={(e) =>
                  onChangeTraversalRules({
                    ...traversalRules,
                    allowDifficult: e.target.checked,
                  })
                }
                className="accent-[#2F96F5]"
              />
              <span className="text-[#FFFFFF]">Allow Difficult (2)</span>
            </label>

            <label className="flex items-center gap-1.5 rounded border border-[#2F96F5]/30 bg-[#07173F]/70 px-2 py-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={traversalRules.allowVeryDifficult}
                onChange={(e) =>
                  onChangeTraversalRules({
                    ...traversalRules,
                    allowVeryDifficult: e.target.checked,
                  })
                }
                className="accent-[#E43700]"
              />
              <span className="text-[#FFFFFF]">Allow Very Diff (3)</span>
            </label>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <label className="space-y-0.5">
              <span className="block text-[#FFFFFF]/65">Speed (km/h)</span>
              <input
                type="number"
                min={0.5}
                max={15}
                step={0.5}
                value={traversalRules.baseSpeedKmh}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  onChangeTraversalRules({
                    ...traversalRules,
                    baseSpeedKmh: Number.isFinite(v)
                      ? Math.max(0.5, Math.min(15, v))
                      : 3,
                  });
                }}
                className="w-full rounded border border-[#2F96F5]/40 bg-[#07173F] px-2 py-1 font-mono text-[11px] tabular-nums text-[#FFFFFF]"
              />
            </label>

            <label className="space-y-0.5">
              <span className="block text-[#FFFFFF]/65">Reserve (%)</span>
              <input
                type="number"
                min={0}
                max={50}
                step={5}
                value={traversalRules.safetyReservePct}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  onChangeTraversalRules({
                    ...traversalRules,
                    safetyReservePct: Number.isFinite(v)
                      ? Math.max(0, Math.min(50, v))
                      : 15,
                  });
                }}
                className="w-full rounded border border-[#2F96F5]/40 bg-[#07173F] px-2 py-1 font-mono text-[11px] tabular-nums text-[#FFFFFF]"
              />
            </label>

            <label className="space-y-0.5">
              <span className="block text-[#FFFFFF]/65">Pre-EVA (h)</span>
              <input
                type="number"
                min={0}
                max={evaProfile.availableMissionHours}
                step={0.5}
                value={evaElapsedHours}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  onChangeEvaElapsedHours(
                    Number.isFinite(v)
                      ? Math.max(0, Math.min(evaProfile.availableMissionHours, v))
                      : 0
                  );
                }}
                className="w-full rounded border border-[#2F96F5]/40 bg-[#07173F] px-2 py-1 font-mono text-[11px] tabular-nums text-[#FFFFFF]"
              />
            </label>
          </div>

          {/* Expandable Simulated EVA Profile Sync */}
          <button
            type="button"
            onClick={() => setShowEvaConfig((p) => !p)}
            className="flex w-full items-center justify-between rounded border border-[#2F96F5]/30 bg-[#07173F]/75 px-2.5 py-1.5 text-[10px] font-medium text-[#FFFFFF]/85 hover:text-[#FFFFFF]"
          >
            <span>Simulated EVA Reserves &amp; Consumption Rates</span>
            {showEvaConfig ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>

          {showEvaConfig && (
            <div className="rounded border border-[#2F96F5]/30 bg-[#07173F] p-2.5 space-y-2 text-[10px]">
              <div className="text-[#EAFE07]">
                Simulated EVA assumptions synced with Module 2 — not real NASA suit telemetry.
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-0.5">
                  <span className="block text-[#FFFFFF]/65">Start O₂ (%)</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={5}
                    value={evaProfile.startingOxygenPct}
                    onChange={(e) =>
                      updateEvaField('startingOxygenPct', e.target.value)
                    }
                    className="w-full rounded border border-[#2F96F5]/40 bg-[#0042A6]/25 px-2 py-1 font-mono text-[#FFFFFF]"
                  />
                </label>
                <label className="space-y-0.5">
                  <span className="block text-[#FFFFFF]/65">Start Battery (%)</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={5}
                    value={evaProfile.startingBatteryPct}
                    onChange={(e) =>
                      updateEvaField('startingBatteryPct', e.target.value)
                    }
                    className="w-full rounded border border-[#2F96F5]/40 bg-[#0042A6]/25 px-2 py-1 font-mono text-[#FFFFFF]"
                  />
                </label>
                <label className="space-y-0.5">
                  <span className="block text-[#FFFFFF]/65">Start Cooling (%)</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={5}
                    value={evaProfile.startingCoolingPct}
                    onChange={(e) =>
                      updateEvaField('startingCoolingPct', e.target.value)
                    }
                    className="w-full rounded border border-[#2F96F5]/40 bg-[#0042A6]/25 px-2 py-1 font-mono text-[#FFFFFF]"
                  />
                </label>
                <label className="space-y-0.5">
                  <span className="block text-[#FFFFFF]/65">Mission Window (h)</span>
                  <input
                    type="number"
                    min={0}
                    max={24}
                    step={0.5}
                    value={evaProfile.availableMissionHours}
                    onChange={(e) =>
                      updateEvaField('availableMissionHours', e.target.value)
                    }
                    className="w-full rounded border border-[#2F96F5]/40 bg-[#0042A6]/25 px-2 py-1 font-mono text-[#FFFFFF]"
                  />
                </label>
                <label className="space-y-0.5">
                  <span className="block text-[#FFFFFF]/65">O₂ Rate (/hr)</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={evaProfile.oxygenConsumptionPerHour}
                    onChange={(e) =>
                      updateEvaField('oxygenConsumptionPerHour', e.target.value)
                    }
                    className="w-full rounded border border-[#2F96F5]/40 bg-[#0042A6]/25 px-2 py-1 font-mono text-[#FFFFFF]"
                  />
                </label>
                <label className="space-y-0.5">
                  <span className="block text-[#FFFFFF]/65">Battery Rate (%/hr)</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={evaProfile.batteryConsumptionPerHour}
                    onChange={(e) =>
                      updateEvaField('batteryConsumptionPerHour', e.target.value)
                    }
                    className="w-full rounded border border-[#2F96F5]/40 bg-[#0042A6]/25 px-2 py-1 font-mono text-[#FFFFFF]"
                  />
                </label>
                <label className="col-span-2 space-y-0.5">
                  <span className="block text-[#FFFFFF]/65">Cooling Rate (%/hr)</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={evaProfile.coolingConsumptionPerHour}
                    onChange={(e) =>
                      updateEvaField('coolingConsumptionPerHour', e.target.value)
                    }
                    className="w-full rounded border border-[#2F96F5]/40 bg-[#0042A6]/25 px-2 py-1 font-mono text-[#FFFFFF]"
                  />
                </label>
              </div>
            </div>
          )}
        </section>

        {/* C. Route Strategy Comparison */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#FFFFFF]">
              C. Route Strategy Comparison
            </span>
            <span className="text-[10px] text-[#FFFFFF]/65">
              Click strategy to inspect on map
            </span>
          </div>

          <div className="space-y-2">
            {strategyList.map((strat) => {
              const isSelected = strat.strategyId === selectedStrategyId;
              const isRec =
                strat.strategyId === optimizationResult.recommendedStrategyId &&
                strat.outbound.found &&
                strat.returnLeg.found;
              const st = getDecisionStyle(strat.decision);

              return (
                <button
                  key={strat.strategyId}
                  type="button"
                  onClick={() => onSelectStrategy(strat.strategyId)}
                  className={`w-full rounded-md border p-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F96F5] ${
                    isSelected
                      ? 'border-[#2F96F5] bg-[#0042A6]/65'
                      : 'border-[#0042A6] bg-[#0042A6]/25 hover:bg-[#0042A6]/45'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-[#FFFFFF]">
                      <span>{strat.strategyName}</span>
                      {isRec && (
                        <span className="rounded bg-[#2F96F5]/25 px-1.5 py-0.5 text-[9px] font-medium text-[#2F96F5]">
                          Recommended
                        </span>
                      )}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold ${st.badgeBg}`}
                    >
                      {strat.decision}
                    </span>
                  </div>

                  {strat.outbound.found && strat.returnLeg.found ? (
                    <div className="mt-2 grid grid-cols-3 gap-2 font-mono text-[10px] tabular-nums">
                      <div>
                        <span className="block font-sans text-[#FFFFFF]/60">
                          Round-Trip
                        </span>
                        <span className="text-[#FFFFFF]">
                          {(strat.totalDistanceMeters / 1000).toFixed(2)} km
                        </span>
                      </div>
                      <div>
                        <span className="block font-sans text-[#FFFFFF]/60">
                          Est. Time
                        </span>
                        <span className="text-[#EAFE07]">
                          {strat.totalEstimatedHours.toFixed(2)} hrs
                        </span>
                      </div>
                      <div>
                        <span className="block font-sans text-[#FFFFFF]/60">
                          Max Slope
                        </span>
                        <span className="text-[#FFFFFF]">
                          {strat.maxSlopeDegrees.toFixed(1)}&deg; ({strat.dominantTerrainLabel})
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1.5 text-[10px] text-[#FFFFFF]/75">
                      {strat.explanation}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* D & E. Mission Decision & Resource Feasibility */}
        <section
          className={`rounded-md border p-3 space-y-3 ${decisionStyle.border} ${decisionStyle.bg}`}
          aria-label="Mission Feasibility Decision"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <DecisionIcon className={`h-4 w-4 shrink-0 ${decisionStyle.text}`} />
              <span className="text-xs font-semibold text-[#FFFFFF]">
                Mission Decision · {selectedEval.strategyName}
              </span>
            </div>
            <span
              className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold ${decisionStyle.badgeBg}`}
            >
              {selectedEval.decision}
            </span>
          </div>

          <p className="text-[11px] leading-relaxed text-[#FFFFFF]/90">
            {selectedEval.explanation}
          </p>

          {selectedEval.outbound.found && selectedEval.returnLeg.found && (
            <div className="grid grid-cols-2 gap-2 rounded border border-[#FFFFFF]/15 bg-[#07173F]/75 p-2 text-[10px]">
              <div>
                <div className="font-semibold text-[#2F96F5]">Outbound Leg</div>
                <div className="font-mono tabular-nums text-[#FFFFFF]">
                  {(selectedEval.outbound.distanceMeters / 1000).toFixed(2)} km ·{' '}
                  {selectedEval.outbound.estimatedHours.toFixed(2)} h
                </div>
                <div className="text-[#FFFFFF]/65">
                  +{selectedEval.outbound.elevationGainMeters.toFixed(0)}m / -
                  {selectedEval.outbound.elevationLossMeters.toFixed(0)}m
                </div>
              </div>
              <div>
                <div className="font-semibold text-[#EAFE07]">Return Leg</div>
                <div className="font-mono tabular-nums text-[#FFFFFF]">
                  {(selectedEval.returnLeg.distanceMeters / 1000).toFixed(2)} km ·{' '}
                  {selectedEval.returnLeg.estimatedHours.toFixed(2)} h
                </div>
                <div className="text-[#FFFFFF]/65">
                  +{selectedEval.returnLeg.elevationGainMeters.toFixed(0)}m / -
                  {selectedEval.returnLeg.elevationLossMeters.toFixed(0)}m
                </div>
              </div>
            </div>
          )}

          {selectedEval.resourceComparison && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-semibold text-[#FFFFFF]">
                  Resource Requirements vs. Reserve ({traversalRules.safetyReservePct}%)
                </span>
                {selectedEval.limitingResource && (
                  <span className="font-mono text-[#EAFE07]">
                    Limiting: {selectedEval.limitingResource.label}
                  </span>
                )}
              </div>

              <div className="overflow-hidden rounded border border-[#0042A6] bg-[#07173F]">
                <table className="w-full text-left font-mono text-[10px] tabular-nums">
                  <thead className="border-b border-[#0042A6] bg-[#0042A6]/45 font-sans text-[#FFFFFF]/75">
                    <tr>
                      <th className="px-2 py-1">Resource</th>
                      <th className="px-1.5 py-1 text-right">Out/Ret</th>
                      <th className="px-1.5 py-1 text-right">Avail</th>
                      <th className="px-2 py-1 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#0042A6]/60">
                    {(
                      [
                        selectedEval.resourceComparison.oxygen,
                        selectedEval.resourceComparison.battery,
                        selectedEval.resourceComparison.cooling,
                        selectedEval.resourceComparison.missionTime,
                      ] as const
                    ).map((item) => {
                      const statusColor =
                        item.status === 'Insufficient'
                          ? 'text-[#E43700]'
                          : item.status === 'Warning'
                            ? 'text-[#EAFE07]'
                            : 'text-[#22C55E]';
                      return (
                        <tr key={item.id}>
                          <td className="px-2 py-1 font-sans text-[#FFFFFF]">
                            {item.label}
                          </td>
                          <td className="px-1.5 py-1 text-right text-[#FFFFFF]/85">
                            {item.outboundRequired.toFixed(1)}/{item.returnRequired.toFixed(1)}
                          </td>
                          <td className="px-1.5 py-1 text-right text-[#FFFFFF]">
                            {item.available.toFixed(1)}
                            {item.unit === '%' ? '%' : ''}
                          </td>
                          <td className={`px-2 py-1 text-right font-semibold ${statusColor}`}>
                            {item.status}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-start gap-1.5 border-t border-[#FFFFFF]/15 pt-2 text-[10px] text-[#FFFFFF]/70">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#EAFE07]" />
            <span>
              Simulated EVA planning model only. Not a NASA-certified astronaut safety system.
            </span>
          </div>
        </section>
      </div>
    </aside>
  );
};
