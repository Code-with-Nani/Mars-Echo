import React, { useState } from 'react';
import {
  Layers,
  ChevronDown,
  ChevronUp,
  Grid,
  SquareDashed,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';
import type {
  ElevationDatasetId,
  FilterableMarkerCategory,
  MapLayerId,
  TerrainAnalysisScope,
} from '../types/mars';
import { MARS_MAP_LAYERS } from '../data/marsLayers';
import { ELEVATION_DATASETS } from '../utils/marsDemService';
import { MARKER_CATEGORY_META } from '../utils/markerIcons';
import type { SlopeThresholds } from '../utils/terrainAnalyzer';

interface MapLayerControlProps {
  activeLayerId: MapLayerId;
  onSelectLayer: (layerId: MapLayerId) => void;
  showGraticule: boolean;
  onToggleGraticule: () => void;
  showRegionBounds: boolean;
  onToggleRegionBounds: () => void;
  markerFilters: Record<FilterableMarkerCategory, boolean>;
  onToggleMarkerCategory: (category: FilterableMarkerCategory) => void;
  layerOpacity: number;
  onChangeOpacity: (opacity: number) => void;
  showTerrainRisk: boolean;
  onToggleTerrainRisk: () => void;
  elevationDatasetId: ElevationDatasetId;
  onSelectElevationDataset: (id: ElevationDatasetId) => void;
  terrainScope: TerrainAnalysisScope;
  onSelectTerrainScope: (scope: TerrainAnalysisScope) => void;
  onRefreshViewportTerrain: () => void;
  terrainThresholds: SlopeThresholds;
  onUpdateTerrainThresholds: (thresholds: SlopeThresholds) => void;
  terrainOpacity: number;
  onChangeTerrainOpacity: (opacity: number) => void;
}

const MARKER_CATEGORIES: FilterableMarkerCategory[] = [
  'astronaut',
  'habitat',
  'rover',
  'science',
];

export const MapLayerControl: React.FC<MapLayerControlProps> = ({
  activeLayerId,
  onSelectLayer,
  showGraticule,
  onToggleGraticule,
  showRegionBounds,
  onToggleRegionBounds,
  markerFilters,
  onToggleMarkerCategory,
  layerOpacity,
  onChangeOpacity,
  showTerrainRisk,
  onToggleTerrainRisk,
  elevationDatasetId,
  onSelectElevationDataset,
  terrainScope,
  onSelectTerrainScope,
  onRefreshViewportTerrain,
  terrainThresholds,
  onUpdateTerrainThresholds,
  terrainOpacity,
  onChangeTerrainOpacity,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const updateThresholdField = (
    field: keyof SlopeThresholds,
    rawVal: string
  ) => {
    const parsed = parseFloat(rawVal);
    const clamped = Number.isFinite(parsed)
      ? Math.max(0, Math.min(90, parsed))
      : 0;
    onUpdateTerrainThresholds({ ...terrainThresholds, [field]: clamped });
  };

  return (
    <div className="w-[272px] rounded-md border border-[#2F96F5]/45 bg-[#0042A6]/95 shadow-lg">
      <button
        type="button"
        onClick={() => setIsCollapsed((prev) => !prev)}
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F96F5]"
        aria-expanded={!isCollapsed}
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-[#FFFFFF]">
          <Layers className="h-3.5 w-3.5 text-[#E43700]" />
          <span>Map Layers &amp; Markers</span>
        </span>
        {isCollapsed ? (
          <ChevronDown className="h-3.5 w-3.5 text-[#FFFFFF]/80" />
        ) : (
          <ChevronUp className="h-3.5 w-3.5 text-[#FFFFFF]/80" />
        )}
      </button>

      {!isCollapsed && (
        <div className="max-h-[calc(100vh-220px)] overflow-y-auto border-t border-[#2F96F5]/30 p-2.5 space-y-2.5">
          {/* Selectable Planetary Layers */}
          <div
            className="space-y-1"
            role="radiogroup"
            aria-label="Martian surface map layers"
          >
            {MARS_MAP_LAYERS.map((layer) => {
              const isSelected = layer.id === activeLayerId;
              return (
                <button
                  key={layer.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => onSelectLayer(layer.id)}
                  className={`flex w-full items-start gap-2.5 rounded border px-2.5 py-1.5 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F96F5] ${
                    isSelected
                      ? 'border-[#2F96F5] bg-[#07173F] text-[#FFFFFF]'
                      : 'border-transparent bg-transparent text-[#FFFFFF]/85 hover:bg-[#07173F]/55 hover:text-[#FFFFFF]'
                  }`}
                >
                  <span
                    className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full border ${
                      isSelected
                        ? 'border-[#2F96F5] bg-[#2F96F5]'
                        : 'border-[#FFFFFF]/60 bg-transparent'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-[#FFFFFF] leading-snug">
                      {layer.name}
                    </span>
                    <span className="block text-[10px] text-[#FFFFFF]/70 truncate">
                      {layer.dataSource} · {layer.resolutionLabel}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Toggleable Terrain Risk Analysis Layer */}
          <div className="border-t border-[#2F96F5]/30 pt-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#FFFFFF]">
                <ShieldAlert className="h-3.5 w-3.5 text-[#EAFE07]" />
                <span>Terrain Risk Layer</span>
              </span>
              <button
                type="button"
                aria-pressed={showTerrainRisk}
                onClick={onToggleTerrainRisk}
                className={`rounded border px-2.5 py-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F96F5] ${
                  showTerrainRisk
                    ? 'border-[#EAFE07] bg-[#EAFE07] text-[#07173F]'
                    : 'border-[#2F96F5]/50 bg-[#07173F] text-[#FFFFFF] hover:bg-[#0960E1]'
                }`}
              >
                {showTerrainRisk ? 'Active' : 'Enable'}
              </button>
            </div>

            {showTerrainRisk && (
              <div className="rounded border border-[#2F96F5]/35 bg-[#07173F]/85 p-2 space-y-2">
                <label className="block space-y-1">
                  <span className="text-[10px] text-[#FFFFFF]/75">
                    Elevation Dataset
                  </span>
                  <select
                    value={elevationDatasetId}
                    onChange={(e) =>
                      onSelectElevationDataset(
                        e.target.value as ElevationDatasetId
                      )
                    }
                    className="w-full rounded border border-[#2F96F5]/45 bg-[#07173F] px-2 py-1 text-[11px] text-[#FFFFFF] focus:border-[#2F96F5] focus:outline-none"
                  >
                    {ELEVATION_DATASETS.map((ds) => (
                      <option key={ds.id} value={ds.id}>
                        {ds.shortName}
                        {!ds.isAvailable
                          ? ' (Unavailable)'
                          : ds.isSynthetic
                            ? ' (Synthetic)'
                            : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="space-y-1">
                  <div className="text-[10px] text-[#FFFFFF]/75">
                    Analysis Footprint
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => onSelectTerrainScope('region')}
                      className={`rounded border px-2 py-1 text-[10px] font-medium transition-colors ${
                        terrainScope === 'region'
                          ? 'border-[#2F96F5] bg-[#0960E1] text-[#FFFFFF]'
                          : 'border-[#2F96F5]/30 bg-[#07173F] text-[#FFFFFF]/75 hover:text-[#FFFFFF]'
                      }`}
                    >
                      Active Region
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectTerrainScope('viewport')}
                      className={`rounded border px-2 py-1 text-[10px] font-medium transition-colors ${
                        terrainScope === 'viewport'
                          ? 'border-[#2F96F5] bg-[#0960E1] text-[#FFFFFF]'
                          : 'border-[#2F96F5]/30 bg-[#07173F] text-[#FFFFFF]/75 hover:text-[#FFFFFF]'
                      }`}
                    >
                      Current View
                    </button>
                  </div>
                  {terrainScope === 'viewport' && (
                    <button
                      type="button"
                      onClick={onRefreshViewportTerrain}
                      className="mt-1 flex w-full items-center justify-center gap-1 rounded border border-[#2F96F5]/40 bg-[#0042A6]/60 px-2 py-1 text-[10px] font-medium text-[#FFFFFF] hover:bg-[#0960E1] transition-colors"
                    >
                      <RefreshCw className="h-3 w-3 text-[#2F96F5]" />
                      <span>Sample Current Map View</span>
                    </button>
                  )}
                </div>

                {/* Slope Thresholds */}
                <div className="space-y-1">
                  <div className="text-[10px] text-[#FFFFFF]/75">
                    Slope Thresholds (&deg; max)
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[10px]">
                    <label className="space-y-0.5">
                      <span className="block text-[#FFFFFF]/65">Easy</span>
                      <input
                        type="number"
                        min={0}
                        max={90}
                        step={1}
                        value={terrainThresholds.easyMaxDeg}
                        onChange={(e) =>
                          updateThresholdField('easyMaxDeg', e.target.value)
                        }
                        className="w-full rounded border border-[#2F96F5]/40 bg-[#07173F] px-1.5 py-1 font-mono text-[10px] tabular-nums text-[#FFFFFF]"
                      />
                    </label>
                    <label className="space-y-0.5">
                      <span className="block text-[#FFFFFF]/65">Mod</span>
                      <input
                        type="number"
                        min={0}
                        max={90}
                        step={1}
                        value={terrainThresholds.moderateMaxDeg}
                        onChange={(e) =>
                          updateThresholdField('moderateMaxDeg', e.target.value)
                        }
                        className="w-full rounded border border-[#2F96F5]/40 bg-[#07173F] px-1.5 py-1 font-mono text-[10px] tabular-nums text-[#FFFFFF]"
                      />
                    </label>
                    <label className="space-y-0.5">
                      <span className="block text-[#FFFFFF]/65">Diff</span>
                      <input
                        type="number"
                        min={0}
                        max={90}
                        step={1}
                        value={terrainThresholds.difficultMaxDeg}
                        onChange={(e) =>
                          updateThresholdField('difficultMaxDeg', e.target.value)
                        }
                        className="w-full rounded border border-[#2F96F5]/40 bg-[#07173F] px-1.5 py-1 font-mono text-[10px] tabular-nums text-[#FFFFFF]"
                      />
                    </label>
                  </div>
                </div>

                {/* Risk Overlay Opacity */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <label
                      htmlFor="terrain-opacity-slider"
                      className="text-[#FFFFFF]/75"
                    >
                      Risk Opacity
                    </label>
                    <span className="font-mono tabular-nums text-[#FFFFFF]">
                      {Math.round(terrainOpacity * 100)}%
                    </span>
                  </div>
                  <input
                    id="terrain-opacity-slider"
                    type="range"
                    min={0.25}
                    max={0.9}
                    step={0.05}
                    value={terrainOpacity}
                    onChange={(e) =>
                      onChangeTerrainOpacity(parseFloat(e.target.value))
                    }
                    className="h-1.5 w-full cursor-pointer accent-[#EAFE07]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Exploration Markers Category Filters */}
          <div className="border-t border-[#2F96F5]/30 pt-2.5 space-y-1.5">
            <div className="text-[11px] font-medium text-[#FFFFFF]/80">
              Exploration Markers
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {MARKER_CATEGORIES.map((category) => {
                const meta = MARKER_CATEGORY_META[category];
                const enabled = markerFilters[category];
                return (
                  <button
                    key={category}
                    type="button"
                    aria-pressed={enabled}
                    onClick={() => onToggleMarkerCategory(category)}
                    className={`flex items-center gap-1.5 rounded border px-2 py-1.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F96F5] ${
                      enabled
                        ? 'border-[#2F96F5] bg-[#07173F] text-[#FFFFFF]'
                        : 'border-[#2F96F5]/30 bg-[#07173F]/40 text-[#FFFFFF]/55 hover:text-[#FFFFFF]'
                    }`}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        backgroundColor: enabled ? meta.colorHex : 'transparent',
                        border: `1.5px solid ${meta.colorHex}`,
                      }}
                      aria-hidden="true"
                    />
                    <span className="truncate">{meta.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Opacity & Coordinate Overlays */}
          <div className="border-t border-[#2F96F5]/30 pt-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <label
                htmlFor="layer-opacity-slider"
                className="text-[11px] text-[#FFFFFF]/80"
              >
                Base Layer Opacity
              </label>
              <span className="font-mono text-[11px] tabular-nums text-[#FFFFFF]">
                {Math.round(layerOpacity * 100)}%
              </span>
            </div>
            <input
              id="layer-opacity-slider"
              type="range"
              min={0.35}
              max={1}
              step={0.05}
              value={layerOpacity}
              onChange={(e) => onChangeOpacity(parseFloat(e.target.value))}
              className="h-1.5 w-full cursor-pointer accent-[#2F96F5]"
            />

            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                type="button"
                onClick={onToggleGraticule}
                aria-pressed={showGraticule}
                className={`flex items-center justify-center gap-1.5 rounded border px-2 py-1.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F96F5] ${
                  showGraticule
                    ? 'border-[#2F96F5] bg-[#0960E1] text-[#FFFFFF]'
                    : 'border-[#2F96F5]/35 bg-[#07173F]/65 text-[#FFFFFF]/80 hover:text-[#FFFFFF]'
                }`}
              >
                <Grid className="h-3 w-3 text-[#FFFFFF]" />
                <span>Grid</span>
              </button>

              <button
                type="button"
                onClick={onToggleRegionBounds}
                aria-pressed={showRegionBounds}
                className={`flex items-center justify-center gap-1.5 rounded border px-2 py-1.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F96F5] ${
                  showRegionBounds
                    ? 'border-[#2F96F5] bg-[#0960E1] text-[#FFFFFF]'
                    : 'border-[#2F96F5]/35 bg-[#07173F]/65 text-[#FFFFFF]/80 hover:text-[#FFFFFF]'
                }`}
              >
                <SquareDashed className="h-3 w-3 text-[#2F96F5]" />
                <span>Region Box</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
