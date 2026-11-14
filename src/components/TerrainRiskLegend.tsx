import React, { useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import type { Pds4DatasetMetadata, TerrainOverlayCellInfo } from '../types/mars';
import type { ElevationDatasetMeta } from '../utils/marsDemService';
import type {
  SlopeThresholds,
  TerrainAnalysisSummary,
} from '../utils/terrainAnalyzer';

export type TerrainOverlayLoadState = 'idle' | 'loading' | 'ready' | 'unavailable';

interface TerrainRiskLegendProps {
  loadState: TerrainOverlayLoadState;
  errorMessage: string | null;
  dataset: ElevationDatasetMeta;
  pds4Metadata?: Pds4DatasetMetadata | null;
  summary: TerrainAnalysisSummary | null;
  cellDistanceMeters: number | null;
  thresholds: SlopeThresholds;
  selectedCell: TerrainOverlayCellInfo | null;
}

export const TerrainRiskLegend: React.FC<TerrainRiskLegendProps> = ({
  loadState,
  errorMessage,
  dataset,
  pds4Metadata = null,
  summary,
  cellDistanceMeters,
  thresholds,
  selectedCell,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="w-[300px] rounded-md border border-[#2F96F5]/45 bg-[#07173F]/95 shadow-lg">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsCollapsed((prev) => !prev)}
        className="flex w-full items-center justify-between px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F96F5]"
        aria-expanded={!isCollapsed}
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-[#FFFFFF]">
          <ShieldAlert className="h-3.5 w-3.5 text-[#EAFE07]" aria-hidden="true" />
          <span>Terrain Risk Legend</span>
        </span>
        <span className="flex items-center gap-2">
          {loadState === 'loading' && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2F96F5]" />
          )}
          <span
            className={`font-mono text-[10px] ${
              loadState === 'unavailable'
                ? 'text-[#E43700]'
                : dataset.isSynthetic
                  ? 'text-[#EAFE07]'
                  : 'text-[#2F96F5]'
            }`}
          >
            {loadState === 'loading'
              ? 'Loading'
              : loadState === 'unavailable'
                ? 'Unavailable'
                : dataset.isSynthetic
                  ? 'Synthetic'
                  : 'PDS4 Live'}
          </span>
          {isCollapsed ? (
            <ChevronDown className="h-3.5 w-3.5 text-[#FFFFFF]/80" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5 text-[#FFFFFF]/80" />
          )}
        </span>
      </button>

      {!isCollapsed && (
        <div className="border-t border-[#0042A6] px-3 py-2.5 space-y-2.5 text-[11px]">
          {/* Synthetic Testing Mode Warning */}
          {dataset.isSynthetic && loadState === 'ready' && (
            <div className="flex items-start gap-1.5 rounded border border-[#EAFE07]/65 bg-[#EAFE07]/10 px-2 py-1.5 text-[10px] text-[#EAFE07]">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                SYNTHETIC TESTING MODE — Not real NASA Mars elevation data.
              </span>
            </div>
          )}

          {/* Unavailable Data State */}
          {loadState === 'unavailable' && (
            <div className="flex items-start gap-2 rounded border border-[#E43700] bg-[#8E1100]/45 px-2.5 py-2 text-[11px] text-[#FFFFFF]">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#EAFE07]" />
              <div className="space-y-0.5">
                <div className="font-semibold">Elevation Data Unavailable</div>
                <div className="text-[10px] text-[#FFFFFF]/85 leading-relaxed">
                  {errorMessage ?? dataset.unavailableReason}
                </div>
              </div>
            </div>
          )}

          {/* 5-Color Difficulty Legend (Explicit Task Requirement Colors) */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-medium text-[#FFFFFF]/70">
              Slope Difficulty Classes
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[#FFFFFF]">
                  <span
                    className="inline-block h-3 w-3 rounded-xs border border-[#FFFFFF]/30"
                    style={{ backgroundColor: '#22C55E' }}
                    aria-hidden="true"
                  />
                  <span>0 · Easy (&le;{thresholds.easyMaxDeg}&deg;)</span>
                </span>
                <span className="font-mono text-[10px] tabular-nums text-[#FFFFFF]/75">
                  {summary ? summary.classCounts[0] : '—'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[#FFFFFF]">
                  <span
                    className="inline-block h-3 w-3 rounded-xs border border-[#FFFFFF]/30"
                    style={{ backgroundColor: '#EAFE07' }}
                    aria-hidden="true"
                  />
                  <span>
                    1 · Moderate ({thresholds.easyMaxDeg}&ndash;{thresholds.moderateMaxDeg}&deg;)
                  </span>
                </span>
                <span className="font-mono text-[10px] tabular-nums text-[#FFFFFF]/75">
                  {summary ? summary.classCounts[1] : '—'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[#FFFFFF]">
                  <span
                    className="inline-block h-3 w-3 rounded-xs border border-[#FFFFFF]/30"
                    style={{ backgroundColor: '#F97316' }}
                    aria-hidden="true"
                  />
                  <span>
                    2 · Difficult ({thresholds.moderateMaxDeg}&ndash;{thresholds.difficultMaxDeg}&deg;)
                  </span>
                </span>
                <span className="font-mono text-[10px] tabular-nums text-[#FFFFFF]/75">
                  {summary ? summary.classCounts[2] : '—'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[#FFFFFF]">
                  <span
                    className="inline-block h-3 w-3 rounded-xs border border-[#FFFFFF]/30"
                    style={{ backgroundColor: '#E43700' }}
                    aria-hidden="true"
                  />
                  <span>
                    3 · Very Difficult (&gt;{thresholds.difficultMaxDeg}&deg;)
                  </span>
                </span>
                <span className="font-mono text-[10px] tabular-nums text-[#FFFFFF]/75">
                  {summary ? summary.classCounts[3] : '—'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[#FFFFFF]/80">
                  <span
                    className="inline-block h-3 w-3 rounded-xs border border-[#FFFFFF]/30"
                    style={{ backgroundColor: '#6B7280' }}
                    aria-hidden="true"
                  />
                  <span>No Data / Invalid</span>
                </span>
                <span className="font-mono text-[10px] tabular-nums text-[#FFFFFF]/75">
                  {summary ? summary.invalidCells : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Dataset Source, PDS4 Version, CRS & Coverage */}
          <dl className="border-t border-[#0042A6] pt-2 space-y-1 text-[10px]">
            <div className="flex justify-between gap-2">
              <dt className="text-[#FFFFFF]/65 shrink-0">Source</dt>
              <dd className="text-right text-[#2F96F5] truncate" title={dataset.dataSource}>
                {dataset.shortName}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[#FFFFFF]/65 shrink-0">Resolution</dt>
              <dd className="text-right font-mono text-[#FFFFFF]/90 truncate">
                {dataset.resolutionLabel}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[#FFFFFF]/65 shrink-0">Coverage</dt>
              <dd className="text-right font-mono text-[#FFFFFF]/85 truncate" title={dataset.coverageLabel}>
                {dataset.coverageLabel}
              </dd>
            </div>
            {pds4Metadata && !dataset.isSynthetic && (
              <>
                <div className="flex justify-between gap-2">
                  <dt className="text-[#FFFFFF]/65 shrink-0">PDS4 Version</dt>
                  <dd
                    className="text-right font-mono text-[#FFFFFF]/90 truncate"
                    title={`${pds4Metadata.bundleLid} · DOI ${pds4Metadata.doi}`}
                  >
                    Bundle v{pds4Metadata.bundleVersion} · Prod v{pds4Metadata.productVersion}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[#FFFFFF]/65 shrink-0">Mars CRS</dt>
                  <dd
                    className="text-right font-mono text-[#FFFFFF]/85 truncate"
                    title={`${pds4Metadata.coordinateSystem} · R=${pds4Metadata.marsRadiusKm} km`}
                  >
                    IAU2000 · +East · R={pds4Metadata.marsRadiusKm}km
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[#FFFFFF]/65 shrink-0">PDS4 Tiles</dt>
                  <dd
                    className="text-right font-mono text-[#2F96F5] truncate"
                    title={pds4Metadata.productFiles.join(', ')}
                  >
                    {pds4Metadata.productFiles.join(', ')}
                  </dd>
                </div>
              </>
            )}
            {summary && cellDistanceMeters !== null && (
              <div className="flex justify-between gap-2">
                <dt className="text-[#FFFFFF]/65 shrink-0">Analyzed Grid</dt>
                <dd className="text-right font-mono tabular-nums text-[#FFFFFF]">
                  {summary.rows}&times;{summary.cols} (~{Math.round(cellDistanceMeters)} m/cell)
                </dd>
              </div>
            )}
            {summary &&
              summary.minElevationMeters !== null &&
              summary.maxElevationMeters !== null && (
                <div className="flex justify-between gap-2">
                  <dt className="text-[#FFFFFF]/65 shrink-0">Elev. Range</dt>
                  <dd className="text-right font-mono tabular-nums text-[#FFFFFF]">
                    {summary.minElevationMeters.toFixed(0)}m to{' '}
                    {summary.maxElevationMeters.toFixed(0)}m
                  </dd>
                </div>
              )}
          </dl>

          {/* Compact Selected Cell Readout (for mobile/collapsed side panel) */}
          {selectedCell && loadState === 'ready' && (
            <div className="border-t border-[#0042A6] pt-2 text-[10px] space-y-0.5">
              <div className="font-semibold text-[#FFFFFF]">
                Selected Cell ({selectedCell.row}, {selectedCell.col})
              </div>
              <div className="flex justify-between font-mono tabular-nums text-[#FFFFFF]/85">
                <span>
                  {selectedCell.elevationMeters !== null
                    ? `${selectedCell.elevationMeters.toFixed(0)} m`
                    : 'No Data'}
                </span>
                <span className="text-[#EAFE07]">
                  {selectedCell.slopeDegrees !== null
                    ? `${selectedCell.slopeDegrees.toFixed(2)}° · ${selectedCell.difficultyLabel}`
                    : 'No Data'}
                </span>
              </div>
            </div>
          )}

          {/* Scope Caveat */}
          <div className="flex items-start gap-1.5 border-t border-[#0042A6] pt-2 text-[10px] leading-snug text-[#FFFFFF]/65">
            <Info className="mt-0.5 h-3 w-3 shrink-0 text-[#2F96F5]" />
            <span>
              Derived from macro elevation gradients only (~463–926 m/px MOLA grid).
              Does not detect rocks or sub-grid hazards. Click any cell to inspect.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
