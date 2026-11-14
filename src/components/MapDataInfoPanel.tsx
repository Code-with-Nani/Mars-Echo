import React, { useState } from 'react';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';
import type {
  CoordinateFormat,
  ExplorationRegion,
  MarsLayerConfig,
  TileHealthState,
} from '../types/mars';
import { formatLat, formatLon } from '../utils/marsCoordinates';

interface MapDataInfoPanelProps {
  activeLayer: MarsLayerConfig;
  tileHealth: TileHealthState;
  selectedRegion: ExplorationRegion;
  coordinateFormat: CoordinateFormat;
}

export const MapDataInfoPanel: React.FC<MapDataInfoPanelProps> = ({
  activeLayer,
  tileHealth,
  selectedRegion,
  coordinateFormat,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const availabilityLabel =
    tileHealth === 'loading'
      ? 'Syncing orbital tiles...'
      : tileHealth === 'degraded'
        ? 'Unavailable / Degraded'
        : 'Available (Live Tile Feed)';

  const availabilityColor =
    tileHealth === 'degraded'
      ? 'text-[#E43700]'
      : tileHealth === 'loading'
        ? 'text-[#2F96F5]'
        : 'text-[#EAFE07]';

  const [minLon, minLat, maxLon, maxLat] = selectedRegion.bounds;

  return (
    <div className="w-[310px] rounded-md border border-[#0042A6] bg-[#07173F]/95 shadow-lg">
      <button
        type="button"
        onClick={() => setIsCollapsed((prev) => !prev)}
        className="flex w-full items-center justify-between px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F96F5]"
        aria-expanded={!isCollapsed}
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-[#FFFFFF]">
          <Info className="h-3.5 w-3.5 text-[#2F96F5]" />
          <span>Map Data Information</span>
        </span>
        <span className="flex items-center gap-2">
          <span className={`font-mono text-[10px] ${availabilityColor}`}>
            {tileHealth === 'degraded'
              ? 'Degraded'
              : tileHealth === 'loading'
                ? 'Syncing'
                : 'Live'}
          </span>
          {isCollapsed ? (
            <ChevronUp className="h-3.5 w-3.5 text-[#FFFFFF]/80" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-[#FFFFFF]/80" />
          )}
        </span>
      </button>

      {!isCollapsed && (
        <div className="border-t border-[#0042A6] px-3 py-2.5 space-y-2 text-[11px]">
          <dl className="space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <dt className="text-[#FFFFFF]/65 shrink-0">Active Layer</dt>
              <dd className="text-right font-medium text-[#FFFFFF]">
                {activeLayer.name}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-2">
              <dt className="text-[#FFFFFF]/65 shrink-0">Dataset</dt>
              <dd className="text-right text-[#FFFFFF] truncate max-w-[195px]" title={activeLayer.datasetTitle}>
                {activeLayer.datasetTitle}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-2">
              <dt className="text-[#FFFFFF]/65 shrink-0">Data Source</dt>
              <dd className="text-right text-[#2F96F5]">
                {activeLayer.dataSource}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-2">
              <dt className="text-[#FFFFFF]/65 shrink-0">Availability</dt>
              <dd className={`text-right font-medium ${availabilityColor}`}>
                {availabilityLabel}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-2">
              <dt className="text-[#FFFFFF]/65 shrink-0">Coverage</dt>
              <dd className="text-right font-mono tabular-nums text-[#FFFFFF]">
                {activeLayer.coverageLabel}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-2">
              <dt className="text-[#FFFFFF]/65 shrink-0">Region Bounds</dt>
              <dd className="text-right font-mono text-[10px] tabular-nums text-[#FFFFFF]/90">
                {formatLat(minLat, coordinateFormat, 2)} – {formatLat(maxLat, coordinateFormat, 2)}
                <br />
                {formatLon(minLon, coordinateFormat, 2)} – {formatLon(maxLon, coordinateFormat, 2)}
              </dd>
            </div>
          </dl>

          <div className="border-t border-[#0042A6] pt-2 text-[10px] leading-relaxed text-[#FFFFFF]/70">
            <span className="font-medium text-[#FFFFFF]">Provenance:</span>{' '}
            Orbital imagery, topography, and THEMIS geology are live NASA/USGS datasets. Astronaut, habitat, and rover markers are{' '}
            <span className="text-[#EAFE07]">illustrative sample entities</span>. Point DEM queries are unavailable in Module 1.
          </div>
        </div>
      )}
    </div>
  );
};
