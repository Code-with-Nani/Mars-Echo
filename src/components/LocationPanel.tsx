import React, { useState } from 'react';
import { Crosshair, RotateCcw, Compass, X } from 'lucide-react';
import type {
  CoordinateFormat,
  ExplorationRegion,
  MarsLocation,
  TerrainOverlayCellInfo,
} from '../types/mars';
import {
  EXPLORATION_REGIONS,
  MARS_REFERENCE_SITES,
} from '../data/marsLocations';
import { formatLat, formatLon } from '../utils/marsCoordinates';
import { MARKER_CATEGORY_META } from '../utils/markerIcons';

interface LocationPanelProps {
  selectedLocation: MarsLocation;
  selectedRegion: ExplorationRegion;
  onSelectRegion: (region: ExplorationRegion) => void;
  coordinateFormat: CoordinateFormat;
  onCenterOnLocation: (location: MarsLocation) => void;
  onSelectReferenceSite: (location: MarsLocation) => void;
  onResetToJezero: () => void;
  onCloseMobile?: () => void;
  showTerrainRisk?: boolean;
  selectedTerrainCell?: TerrainOverlayCellInfo | null;
}

export const LocationPanel: React.FC<LocationPanelProps> = ({
  selectedLocation,
  selectedRegion,
  onSelectRegion,
  coordinateFormat,
  onCenterOnLocation,
  onSelectReferenceSite,
  onResetToJezero,
  onCloseMobile,
  showTerrainRisk = false,
  selectedTerrainCell = null,
}) => {
  const [directoryTab, setDirectoryTab] = useState<'assets' | 'science'>('assets');

  const isJezero = selectedLocation.id === 'jezero-crater';
  const categoryMeta = MARKER_CATEGORY_META[selectedLocation.category];
  const [minLon, minLat, maxLon, maxLat] = selectedRegion.bounds;

  const assetMarkers = MARS_REFERENCE_SITES.filter(
    (s) => s.category === 'astronaut' || s.category === 'habitat' || s.category === 'rover'
  );
  const scienceMarkers = MARS_REFERENCE_SITES.filter(
    (s) => s.category === 'science'
  );
  const visibleDirectory = directoryTab === 'assets' ? assetMarkers : scienceMarkers;

  return (
    <aside
      className="flex h-full w-full flex-col border-l border-[#0042A6] bg-[#07173F] md:w-[348px] xl:w-[368px] shrink-0"
      aria-label="Location Intelligence"
    >
      {/* Panel Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#0042A6] bg-[#0042A6]/45 px-4">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-[#E43700]" />
          <h2 className="text-sm font-semibold tracking-tight text-[#FFFFFF]">
            Location Intelligence
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          {!isJezero && (
            <button
              type="button"
              onClick={onResetToJezero}
              className="flex items-center gap-1 rounded border border-[#2F96F5]/50 bg-[#0042A6] px-2 py-1 text-[11px] font-medium text-[#FFFFFF] hover:bg-[#0960E1] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F96F5]"
              title="Return to default Jezero Crater location"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Jezero</span>
            </button>
          )}
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="rounded p-1 text-[#FFFFFF]/75 hover:bg-[#0042A6] hover:text-[#FFFFFF] md:hidden"
              aria-label="Close Location Intelligence panel"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Intelligence Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Exploration Region Selector & Boundaries */}
        <section className="rounded-md border border-[#0042A6] bg-[#0042A6]/25 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="exploration-region-select"
              className="text-[11px] font-semibold text-[#FFFFFF]"
            >
              Exploration Region
            </label>
            <span className="font-mono text-[10px] text-[#2F96F5]">
              {selectedRegion.quadrangle.split(' ')[0]}
            </span>
          </div>

          <select
            id="exploration-region-select"
            value={selectedRegion.id}
            onChange={(e) => {
              const found = EXPLORATION_REGIONS.find(
                (r) => r.id === e.target.value
              );
              if (found) onSelectRegion(found);
            }}
            className="w-full rounded border border-[#2F96F5]/50 bg-[#07173F] px-2.5 py-1.5 text-xs font-medium text-[#FFFFFF] focus:border-[#2F96F5] focus:outline-none"
          >
            {EXPLORATION_REGIONS.map((region) => (
              <option key={region.id} value={region.id}>
                {region.name}
              </option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-2 pt-1 text-[10px]">
            <div>
              <span className="block text-[#FFFFFF]/60">Lat Bounds</span>
              <span className="font-mono tabular-nums text-[#FFFFFF]">
                {formatLat(minLat, coordinateFormat, 2)} –{' '}
                {formatLat(maxLat, coordinateFormat, 2)}
              </span>
            </div>
            <div>
              <span className="block text-[#FFFFFF]/60">Lon Bounds</span>
              <span className="font-mono tabular-nums text-[#FFFFFF]">
                {formatLon(minLon, coordinateFormat, 2)} –{' '}
                {formatLon(maxLon, coordinateFormat, 2)}
              </span>
            </div>
          </div>
        </section>

        {/* Terrain Risk Cell Inspection (when Terrain Risk Layer is active) */}
        {showTerrainRisk && selectedTerrainCell && (
          <section
            className="rounded-md border border-[#2F96F5]/60 bg-[#0042A6]/30 p-3 space-y-2"
            aria-label="Terrain Risk Cell Inspection"
          >
            <div className="flex items-center justify-between gap-2 border-b border-[#0042A6] pb-1.5">
              <span className="text-[11px] font-semibold text-[#FFFFFF]">
                Terrain Risk Cell ({selectedTerrainCell.row}, {selectedTerrainCell.col})
              </span>
              <span
                className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold text-[#FFFFFF]"
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-xs border border-[#FFFFFF]/40"
                  style={{
                    backgroundColor: !selectedTerrainCell.isValid
                      ? '#6B7280'
                      : selectedTerrainCell.difficultyClass === 0
                        ? '#22C55E'
                        : selectedTerrainCell.difficultyClass === 1
                          ? '#EAFE07'
                          : selectedTerrainCell.difficultyClass === 2
                            ? '#F97316'
                            : '#E43700',
                  }}
                  aria-hidden="true"
                />
                <span>
                  {selectedTerrainCell.isValid &&
                  selectedTerrainCell.difficultyClass !== null
                    ? `${selectedTerrainCell.difficultyClass} – ${selectedTerrainCell.difficultyLabel}`
                    : 'No Data'}
                </span>
              </span>
            </div>

            {selectedTerrainCell.isSynthetic && (
              <div className="text-[10px] font-medium text-[#EAFE07]">
                Synthetic Testing Grid — Not real Mars elevation
              </div>
            )}

            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
              <div>
                <dt className="text-[#FFFFFF]/65">Elevation</dt>
                <dd className="font-mono tabular-nums text-[#FFFFFF]">
                  {selectedTerrainCell.elevationMeters !== null
                    ? `${selectedTerrainCell.elevationMeters.toFixed(1)} m`
                    : 'No Data'}
                </dd>
              </div>
              <div>
                <dt className="text-[#FFFFFF]/65">Calculated Slope</dt>
                <dd className="font-mono tabular-nums text-[#EAFE07]">
                  {selectedTerrainCell.slopeDegrees !== null
                    ? `${selectedTerrainCell.slopeDegrees.toFixed(2)}° (${selectedTerrainCell.slopePercent?.toFixed(1)}%)`
                    : 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="text-[#FFFFFF]/65">Data Validity</dt>
                <dd
                  className={`font-medium ${
                    selectedTerrainCell.isValid
                      ? 'text-[#2F96F5]'
                      : 'text-[#E43700]'
                  }`}
                >
                  {selectedTerrainCell.isValid ? 'Valid' : 'No Data / Invalid'}
                </dd>
              </div>
              <div>
                <dt className="text-[#FFFFFF]/65">Method</dt>
                <dd className="font-mono text-[10px] text-[#FFFFFF]/80 truncate">
                  {selectedTerrainCell.method}
                </dd>
              </div>
              <div className="col-span-2 border-t border-[#0042A6]/70 pt-1 text-[10px] space-y-0.5">
                <div>
                  <span className="text-[#FFFFFF]/65">Dataset: </span>
                  <span className="text-[#2F96F5]">
                    {selectedTerrainCell.datasetName}
                  </span>
                </div>
                {selectedTerrainCell.pds4Version && (
                  <div className="font-mono text-[#FFFFFF]/75">
                    PDS4 {selectedTerrainCell.pds4Version}
                  </div>
                )}
              </div>
            </dl>
          </section>
        )}

        {/* Selected Location Header */}
        <div>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="font-medium text-[#2F96F5]">
              {categoryMeta.label}
            </span>
            <span className="text-[#FFFFFF]/40" aria-hidden="true">
              ·
            </span>
            <span
              className={
                selectedLocation.isSampleData
                  ? 'text-[#EAFE07]'
                  : 'text-[#FFFFFF]/75'
              }
            >
              {selectedLocation.isSampleData
                ? 'Illustrative Sample'
                : selectedLocation.isReferenceSite
                  ? 'Verified NASA/USGS Ref'
                  : 'Map Selection'}
            </span>
          </div>

          <div className="mt-1 flex items-start justify-between gap-2">
            <h3 className="text-lg font-semibold leading-snug text-[#FFFFFF]">
              {selectedLocation.name}
            </h3>
            <button
              type="button"
              onClick={() => onCenterOnLocation(selectedLocation)}
              className="mt-0.5 shrink-0 rounded border border-[#2F96F5]/50 bg-[#0042A6] p-1.5 text-[#FFFFFF] hover:bg-[#2F96F5] hover:text-[#07173F] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F96F5]"
              aria-label="Center map on selected location"
              title="Center map on location"
            >
              <Crosshair className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-0.5 text-[11px] text-[#FFFFFF]/70">
            {selectedLocation.region}
          </div>
        </div>

        {/* Precision Coordinate Pair Grid */}
        <div className="grid grid-cols-2 gap-3 rounded-md border border-[#0042A6] bg-[#0042A6]/25 p-3">
          <div>
            <div className="text-[11px] text-[#FFFFFF]/70">Latitude</div>
            <div className="mt-0.5 font-mono text-base font-semibold tabular-nums text-[#EAFE07]">
              {formatLat(selectedLocation.lat, coordinateFormat, 4)}
            </div>
          </div>

          <div>
            <div className="text-[11px] text-[#FFFFFF]/70">Longitude</div>
            <div className="mt-0.5 font-mono text-base font-semibold tabular-nums text-[#EAFE07]">
              {formatLon(selectedLocation.lon, coordinateFormat, 4)}
            </div>
          </div>
        </div>

        {/* Scientific Telemetry & Attribution Table */}
        <dl className="space-y-3 text-xs">
          <div className="flex flex-col gap-0.5">
            <dt className="text-[11px] text-[#FFFFFF]/65">Elevation</dt>
            <dd
              className={`font-mono text-xs tabular-nums ${
                selectedLocation.elevation.startsWith('Not available')
                  ? 'text-[#FFFFFF]/60'
                  : 'text-[#FFFFFF]'
              }`}
            >
              {selectedLocation.elevation}
            </dd>
          </div>

          <div className="flex flex-col gap-0.5">
            <dt className="text-[11px] text-[#FFFFFF]/65">
              Terrain Classification
            </dt>
            <dd
              className={`text-xs leading-relaxed ${
                selectedLocation.terrainClassification === 'Not available'
                  ? 'text-[#FFFFFF]/60'
                  : 'text-[#FFFFFF]'
              }`}
            >
              {selectedLocation.terrainClassification}
            </dd>
          </div>

          <div className="flex flex-col gap-0.5">
            <dt className="text-[11px] text-[#FFFFFF]/65">Data Source</dt>
            <dd className="text-xs text-[#2F96F5]">
              {selectedLocation.dataSource}
            </dd>
          </div>

          <div className="flex flex-col gap-0.5">
            <dt className="text-[11px] text-[#FFFFFF]/65">Observation Status</dt>
            <dd
              className={`text-xs ${
                selectedLocation.isSampleData
                  ? 'text-[#EAFE07]'
                  : 'text-[#FFFFFF]'
              }`}
            >
              {selectedLocation.observationStatus}
            </dd>
          </div>
        </dl>

        {/* Geological / Operational Context */}
        <div className="border-t border-[#0042A6] pt-4">
          <div className="mb-1.5 text-xs font-semibold text-[#FFFFFF]">
            Location Context
          </div>
          <p className="text-xs leading-relaxed text-[#FFFFFF]/75">
            {selectedLocation.description}
          </p>
        </div>

        {/* Exploration Entities & Reference Sites Directory */}
        <div className="border-t border-[#0042A6] pt-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#FFFFFF]">
              Surface Markers
            </span>
            <div className="flex items-center rounded border border-[#0042A6] bg-[#0042A6]/30 p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setDirectoryTab('assets')}
                className={`rounded px-2 py-0.5 font-medium transition-colors ${
                  directoryTab === 'assets'
                    ? 'bg-[#0960E1] text-[#FFFFFF]'
                    : 'text-[#FFFFFF]/70 hover:text-[#FFFFFF]'
                }`}
              >
                Crew & Assets ({assetMarkers.length})
              </button>
              <button
                type="button"
                onClick={() => setDirectoryTab('science')}
                className={`rounded px-2 py-0.5 font-medium transition-colors ${
                  directoryTab === 'science'
                    ? 'bg-[#0960E1] text-[#FFFFFF]'
                    : 'text-[#FFFFFF]/70 hover:text-[#FFFFFF]'
                }`}
              >
                Science ({scienceMarkers.length})
              </button>
            </div>
          </div>

          <div className="space-y-1">
            {visibleDirectory.map((site) => {
              const isSelected = site.id === selectedLocation.id;
              const meta = MARKER_CATEGORY_META[site.category];
              return (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => onSelectReferenceSite(site)}
                  className={`flex w-full items-center justify-between gap-2 rounded border px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F96F5] ${
                    isSelected
                      ? 'border-[#2F96F5] bg-[#0042A6] text-[#FFFFFF]'
                      : 'border-transparent bg-transparent text-[#FFFFFF]/80 hover:bg-[#0042A6]/45 hover:text-[#FFFFFF]'
                  }`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: meta.colorHex }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium">
                        {site.name.replace(', Mars', '')}
                      </span>
                      <span className="block truncate text-[10px] text-[#FFFFFF]/60">
                        {meta.shortLabel}
                        {site.isSampleData ? ' · Sample' : ' · NASA/USGS'}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-[#FFFFFF]/75">
                    {formatLat(site.lat, coordinateFormat, 1)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
};
