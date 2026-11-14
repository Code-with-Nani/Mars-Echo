import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Grid3X3,
  Info,
  Mountain,
  RotateCcw,
  Sliders,
  XCircle,
} from 'lucide-react';
import {
  DEFAULT_SLOPE_THRESHOLDS,
  SYNTHETIC_TERRAIN_PRESETS,
  analyzeTerrainGrid,
  normalizeSlopeThresholds,
  type DifficultyLevel,
  type ElevationUnit,
  type SlopeThresholds,
  type TerrainCellAnalysis,
} from '../utils/terrainAnalyzer';

function getDifficultyVisual(
  difficultyClass: DifficultyLevel | null,
  isValid: boolean
): {
  cellBg: string;
  borderClass: string;
  accentText: string;
  badgeClass: string;
  label: string;
} {
  if (!isValid || difficultyClass === null) {
    return {
      cellBg: 'bg-[#07173F]',
      borderClass: 'border-dashed border-[#8E1100]',
      accentText: 'text-[#FFFFFF]/60',
      badgeClass: 'bg-[#8E1100] text-[#FFFFFF]',
      label: 'Invalid',
    };
  }

  switch (difficultyClass) {
    case 0:
      return {
        cellBg: 'bg-[#0042A6]/40',
        borderClass: 'border-[#2F96F5]/75',
        accentText: 'text-[#2F96F5]',
        badgeClass: 'text-[#2F96F5]',
        label: '0 – Easy',
      };
    case 1:
      return {
        cellBg: 'bg-[#0960E1]/35',
        borderClass: 'border-[#2F96F5]',
        accentText: 'text-[#FFFFFF]',
        badgeClass: 'text-[#FFFFFF]',
        label: '1 – Moderate',
      };
    case 2:
      return {
        cellBg: 'bg-[#EAFE07]/15',
        borderClass: 'border-[#EAFE07]/75',
        accentText: 'text-[#EAFE07]',
        badgeClass: 'text-[#EAFE07]',
        label: '2 – Difficult',
      };
    case 3:
      return {
        cellBg: 'bg-[#E43700]/25',
        borderClass: 'border-[#E43700]',
        accentText: 'text-[#E43700]',
        badgeClass: 'bg-[#8E1100] text-[#FFFFFF] border border-[#E43700]/70',
        label: '3 – Very Difficult',
      };
  }
}

export const TerrainAnalysisView: React.FC = () => {
  const initialPreset = SYNTHETIC_TERRAIN_PRESETS[0];

  const [presetId, setPresetId] = useState<string>(initialPreset.id);
  const [grid, setGrid] = useState<(number | null)[][]>(() =>
    initialPreset.grid.map((r) => [...r])
  );
  const [cellDistance, setCellDistance] = useState<number>(
    initialPreset.cellDistanceMeters
  );
  const [elevationUnit, setElevationUnit] = useState<ElevationUnit>(
    initialPreset.elevationUnit
  );
  const [thresholds, setThresholds] = useState<SlopeThresholds>(
    DEFAULT_SLOPE_THRESHOLDS
  );
  const [selectedCoords, setSelectedCoords] = useState<{
    row: number;
    col: number;
  }>({ row: 2, col: 3 });

  const normalizedThresholds = useMemo(
    () => normalizeSlopeThresholds(thresholds),
    [thresholds]
  );

  const analysis = useMemo(
    () =>
      analyzeTerrainGrid(grid, {
        cellDistance,
        cellDistanceUnit: 'meters',
        elevationUnit,
        thresholds: normalizedThresholds,
      }),
    [grid, cellDistance, elevationUnit, normalizedThresholds]
  );

  const activePreset =
    SYNTHETIC_TERRAIN_PRESETS.find((p) => p.id === presetId) ?? initialPreset;

  const selectedCell: TerrainCellAnalysis | null =
    analysis.cells[selectedCoords.row]?.[selectedCoords.col] ?? null;

  const handleSelectPreset = (nextId: string) => {
    const found = SYNTHETIC_TERRAIN_PRESETS.find((p) => p.id === nextId);
    if (!found) return;
    setPresetId(found.id);
    setGrid(found.grid.map((r) => [...r]));
    setCellDistance(found.cellDistanceMeters);
    setElevationUnit(found.elevationUnit);
    setSelectedCoords({ row: 2, col: 3 });
  };

  const handleReset = () => {
    setGrid(activePreset.grid.map((r) => [...r]));
    setCellDistance(activePreset.cellDistanceMeters);
    setElevationUnit(activePreset.elevationUnit);
    setThresholds(DEFAULT_SLOPE_THRESHOLDS);
  };

  const handleCellElevationChange = (rawVal: string) => {
    const { row, col } = selectedCoords;
    setGrid((prev) =>
      prev.map((r, rIdx) =>
        rIdx === row
          ? r.map((c, cIdx) => {
              if (cIdx !== col) return c;
              if (rawVal.trim() === '') return null;
              const parsed = parseFloat(rawVal);
              return Number.isFinite(parsed) ? parsed : null;
            })
          : r
      )
    );
  };

  const updateThreshold = (field: keyof SlopeThresholds, rawVal: string) => {
    const parsed = parseFloat(rawVal);
    const val = Number.isFinite(parsed) ? Math.max(0, Math.min(90, parsed)) : 0;
    setThresholds((prev) => ({ ...prev, [field]: val }));
  };

  const selectedVis = selectedCell
    ? getDifficultyVisual(selectedCell.difficultyClass, selectedCell.isValid)
    : null;

  return (
    <div className="h-full overflow-y-auto bg-[#07173F] p-4 sm:p-5 lg:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        {/* Header */}
        <div className="flex flex-col gap-3 border-b border-[#0042A6] pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1 max-w-3xl">
            <div className="text-xs font-medium text-[#2F96F5]">
              Module 3 · Terrain Intelligence Engine
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-[#FFFFFF]">
              Terrain Slope &amp; Difficulty Calculation Engine
            </h2>
            <p className="text-xs leading-relaxed text-[#FFFFFF]/75">
              Deterministic finite-difference slope calculator and 4-level terrain
              difficulty classifier built as a standalone utility for future map
              and route integration.
            </p>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 self-start lg:self-auto rounded-md border border-[#2F96F5]/50 bg-[#0042A6] px-3 py-2 text-xs font-medium text-[#FFFFFF] hover:bg-[#0960E1] transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F96F5]"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reset Test Grid</span>
          </button>
        </div>

        {/* Synthetic Data & Scope Disclaimers */}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-start gap-2.5 rounded-md border border-[#2F96F5]/45 bg-[#0042A6]/30 px-3.5 py-2.5 text-xs text-[#FFFFFF]/85">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#EAFE07]" aria-hidden="true" />
            <div>
              <span className="font-semibold text-[#FFFFFF]">
                Synthetic Test Data Notice:
              </span>{' '}
              Grids shown here are synthetic mathematical elevation matrices for
              algorithm verification—not real NASA MOLA or HiRISE terrain measurements.
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-md border border-[#0042A6] bg-[#0042A6]/25 px-3.5 py-2.5 text-xs text-[#FFFFFF]/85">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#2F96F5]" aria-hidden="true" />
            <div>
              <span className="font-semibold text-[#FFFFFF]">
                Macro Slope Scope Only:
              </span>{' '}
              Computes cell-to-cell geometric slope angle from elevation differences
              alone; does not detect rocks, boulders, loose dust, or sub-grid craters.
            </div>
          </div>
        </div>

        {/* Configuration Controls */}
        <section
          className="rounded-md border border-[#0042A6] bg-[#0042A6]/25 p-4 space-y-4"
          aria-label="Terrain Engine Configuration"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-[#0042A6]/80 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-[#2F96F5]" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-[#FFFFFF]">
                Synthetic Grid &amp; Slope Threshold Controls
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {SYNTHETIC_TERRAIN_PRESETS.map((preset) => {
                const active = preset.id === presetId;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`rounded border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F96F5] ${
                      active
                        ? 'border-[#2F96F5] bg-[#2F96F5] font-semibold text-[#07173F]'
                        : 'border-[#2F96F5]/40 bg-[#07173F] text-[#FFFFFF] hover:bg-[#0960E1]'
                    }`}
                  >
                    {preset.name.replace(' (6×8)', '')}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] text-[#FFFFFF]/75">{activePreset.description}</p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="block space-y-1">
              <span className="text-[11px] text-[#FFFFFF]/75">
                Cell Spacing (meters)
              </span>
              <input
                type="number"
                min={1}
                max={5000}
                step={5}
                value={cellDistance}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  setCellDistance(Number.isFinite(v) ? Math.max(0, v) : 0);
                }}
                className="w-full rounded border border-[#2F96F5]/45 bg-[#07173F] px-2.5 py-1.5 font-mono text-xs tabular-nums text-[#FFFFFF] focus:border-[#2F96F5] focus:outline-none"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-[11px] text-[#FFFFFF]/75">
                Elevation Input Unit
              </span>
              <select
                value={elevationUnit}
                onChange={(e) =>
                  setElevationUnit(e.target.value as ElevationUnit)
                }
                className="w-full rounded border border-[#2F96F5]/45 bg-[#07173F] px-2.5 py-1.5 text-xs text-[#FFFFFF] focus:border-[#2F96F5] focus:outline-none"
              >
                <option value="meters">Meters (m)</option>
                <option value="kilometers">Kilometers (km)</option>
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-[11px] text-[#FFFFFF]/75">
                0 – Easy Max (&deg;)
              </span>
              <input
                type="number"
                min={0}
                max={90}
                step={1}
                value={thresholds.easyMaxDeg}
                onChange={(e) => updateThreshold('easyMaxDeg', e.target.value)}
                className="w-full rounded border border-[#2F96F5]/45 bg-[#07173F] px-2.5 py-1.5 font-mono text-xs tabular-nums text-[#FFFFFF] focus:border-[#2F96F5] focus:outline-none"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-[11px] text-[#FFFFFF]/75">
                1 – Moderate Max (&deg;)
              </span>
              <input
                type="number"
                min={0}
                max={90}
                step={1}
                value={thresholds.moderateMaxDeg}
                onChange={(e) =>
                  updateThreshold('moderateMaxDeg', e.target.value)
                }
                className="w-full rounded border border-[#2F96F5]/45 bg-[#07173F] px-2.5 py-1.5 font-mono text-xs tabular-nums text-[#FFFFFF] focus:border-[#2F96F5] focus:outline-none"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-[11px] text-[#FFFFFF]/75">
                2 – Difficult Max (&deg;)
              </span>
              <input
                type="number"
                min={0}
                max={90}
                step={1}
                value={thresholds.difficultMaxDeg}
                onChange={(e) =>
                  updateThreshold('difficultMaxDeg', e.target.value)
                }
                className="w-full rounded border border-[#2F96F5]/45 bg-[#07173F] px-2.5 py-1.5 font-mono text-xs tabular-nums text-[#FFFFFF] focus:border-[#2F96F5] focus:outline-none"
              />
            </label>
          </div>
        </section>

        {/* Main Workspace: Interactive Output Grid + Cell Inspector */}
        <div className="grid gap-5 lg:grid-cols-12 items-start">
          {/* Classified Elevation & Slope Grid */}
          <section
            className="lg:col-span-8 rounded-md border border-[#0042A6] bg-[#0042A6]/25 p-4 space-y-3.5"
            aria-label="Classified Terrain Grid"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Grid3X3 className="h-4 w-4 text-[#2F96F5]" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-[#FFFFFF]">
                  Computed Slope &amp; Difficulty Matrix ({analysis.summary.rows}&times;
                  {analysis.summary.cols})
                </h3>
              </div>
              <span className="text-[11px] text-[#FFFFFF]/70">
                Click any cell to inspect or edit elevation
              </span>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 border-y border-[#0042A6]/70 py-2 text-[11px]">
              <span className="inline-flex items-center gap-1.5 text-[#2F96F5]">
                <span className="inline-block h-2.5 w-2.5 rounded-xs border border-[#2F96F5] bg-[#0042A6]/60" />
                <span>0 · Easy (&le;{normalizedThresholds.easyMaxDeg}&deg;)</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#FFFFFF]">
                <span className="inline-block h-2.5 w-2.5 rounded-xs border border-[#2F96F5] bg-[#0960E1]/60" />
                <span>
                  1 · Moderate ({normalizedThresholds.easyMaxDeg}–
                  {normalizedThresholds.moderateMaxDeg}&deg;)
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#EAFE07]">
                <span className="inline-block h-2.5 w-2.5 rounded-xs border border-[#EAFE07] bg-[#EAFE07]/25" />
                <span>
                  2 · Difficult ({normalizedThresholds.moderateMaxDeg}–
                  {normalizedThresholds.difficultMaxDeg}&deg;)
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#E43700]">
                <span className="inline-block h-2.5 w-2.5 rounded-xs border border-[#E43700] bg-[#E43700]/35" />
                <span>
                  3 · Very Difficult (&gt;{normalizedThresholds.difficultMaxDeg}&deg;)
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#FFFFFF]/70">
                <span className="inline-block h-2.5 w-2.5 rounded-xs border border-dashed border-[#8E1100] bg-[#07173F]" />
                <span>Invalid / Missing</span>
              </span>
            </div>

            {/* 6x8 Cell Matrix */}
            <div className="overflow-x-auto">
              <div className="grid min-w-[540px] grid-cols-8 gap-1.5">
                {analysis.cells.map((rowArr) =>
                  rowArr.map((cell) => {
                    const vis = getDifficultyVisual(
                      cell.difficultyClass,
                      cell.isValid
                    );
                    const isSelected =
                      selectedCoords.row === cell.row &&
                      selectedCoords.col === cell.col;

                    return (
                      <button
                        key={`${cell.row}-${cell.col}`}
                        type="button"
                        onClick={() =>
                          setSelectedCoords({ row: cell.row, col: cell.col })
                        }
                        className={`rounded border p-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EAFE07] ${vis.cellBg} ${vis.borderClass} ${
                          isSelected
                            ? 'ring-2 ring-[#FFFFFF] ring-offset-1 ring-offset-[#07173F]'
                            : 'hover:brightness-125'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-mono text-[#FFFFFF]/55">
                            {cell.row},{cell.col}
                          </span>
                          <span
                            className={`font-mono font-semibold px-1 rounded-xs ${vis.badgeClass}`}
                          >
                            {cell.isValid ? `C${cell.difficultyClass}` : 'N/A'}
                          </span>
                        </div>
                        <div className="mt-1 font-mono text-xs font-semibold tabular-nums text-[#FFFFFF]">
                          {cell.isValid && cell.slopeDegrees !== null
                            ? `${cell.slopeDegrees.toFixed(1)}°`
                            : 'Invalid'}
                        </div>
                        <div className="font-mono text-[10px] tabular-nums text-[#FFFFFF]/70">
                          {cell.rawElevation !== null
                            ? `${cell.rawElevation}${elevationUnit === 'kilometers' ? 'km' : 'm'}`
                            : 'null'}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </section>

          {/* Selected Cell Inspector + Grid Summary */}
          <aside className="lg:col-span-4 space-y-4">
            {/* Selected Cell Detail */}
            <section
              className="rounded-md border border-[#0042A6] bg-[#0042A6]/25 p-4 space-y-3"
              aria-label="Selected Cell Details"
            >
              <div className="flex items-center justify-between border-b border-[#0042A6]/80 pb-2">
                <div className="flex items-center gap-2">
                  <Mountain className="h-4 w-4 text-[#2F96F5]" aria-hidden="true" />
                  <h3 className="text-xs font-semibold text-[#FFFFFF]">
                    Cell ({selectedCoords.row}, {selectedCoords.col}) Inspection
                  </h3>
                </div>
                {selectedCell && (
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                      selectedCell.isValid ? 'text-[#2F96F5]' : 'text-[#E43700]'
                    }`}
                  >
                    {selectedCell.isValid ? (
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    <span>{selectedCell.isValid ? 'Valid' : 'Invalid'}</span>
                  </span>
                )}
              </div>

              {selectedCell && selectedVis && (
                <>
                  <dl className="space-y-1.5 text-xs">
                    <div className="flex justify-between gap-2">
                      <dt className="text-[#FFFFFF]/70">Elevation</dt>
                      <dd className="font-mono tabular-nums text-[#FFFFFF]">
                        {selectedCell.elevationMeters !== null
                          ? `${selectedCell.elevationMeters.toFixed(2)} m`
                          : 'Missing / Invalid'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-[#FFFFFF]/70">Calculated Slope</dt>
                      <dd className="font-mono tabular-nums text-[#EAFE07] font-semibold">
                        {selectedCell.slopeDegrees !== null
                          ? `${selectedCell.slopeDegrees.toFixed(2)}° (${selectedCell.slopePercent?.toFixed(1)}%)`
                          : 'N/A'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-[#FFFFFF]/70">Difficulty Class</dt>
                      <dd className={`font-semibold ${selectedVis.accentText}`}>
                        {selectedVis.label}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-[#FFFFFF]/70">Gradient (dx, dy)</dt>
                      <dd className="font-mono text-[11px] tabular-nums text-[#FFFFFF]/80">
                        {selectedCell.gradientX !== null &&
                        selectedCell.gradientY !== null
                          ? `${selectedCell.gradientX.toFixed(3)}, ${selectedCell.gradientY.toFixed(3)}`
                          : 'N/A'}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-[#FFFFFF]/70">Calculation Method</dt>
                      <dd className="font-mono text-[11px] text-[#2F96F5]">
                        {selectedCell.method}
                      </dd>
                    </div>
                  </dl>

                  {/* Interactive Cell Elevation Editor for Missing-Data Testing */}
                  <div className="border-t border-[#0042A6]/80 pt-3 space-y-2">
                    <label className="block space-y-1">
                      <span className="text-[11px] text-[#FFFFFF]/75">
                        Edit Cell Elevation ({elevationUnit})
                      </span>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step={elevationUnit === 'kilometers' ? 0.01 : 1}
                          value={selectedCell.rawElevation ?? ''}
                          placeholder="null (missing)"
                          onChange={(e) =>
                            handleCellElevationChange(e.target.value)
                          }
                          className="min-w-0 flex-1 rounded border border-[#2F96F5]/45 bg-[#07173F] px-2.5 py-1.5 font-mono text-xs tabular-nums text-[#FFFFFF] focus:border-[#2F96F5] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleCellElevationChange('')}
                          className="rounded border border-[#E43700]/70 bg-[#8E1100]/60 px-2.5 py-1.5 text-[11px] font-medium text-[#FFFFFF] hover:bg-[#8E1100] transition-colors whitespace-nowrap"
                        >
                          Set Null
                        </button>
                      </div>
                    </label>
                  </div>
                </>
              )}
            </section>

            {/* Grid Summary Statistics */}
            <section
              className="rounded-md border border-[#0042A6] bg-[#0042A6]/25 p-4 space-y-2.5"
              aria-label="Terrain Grid Summary"
            >
              <h3 className="text-xs font-semibold text-[#FFFFFF] border-b border-[#0042A6]/80 pb-2">
                Grid Analysis Summary
              </h3>
              <dl className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <dt className="text-[#FFFFFF]/70">Valid / Total Cells</dt>
                  <dd className="font-mono tabular-nums text-[#FFFFFF]">
                    {analysis.summary.validCells} / {analysis.summary.totalCells}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#FFFFFF]/70">Invalid Cells</dt>
                  <dd className="font-mono tabular-nums text-[#E43700]">
                    {analysis.summary.invalidCells}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#FFFFFF]/70">Slope Range</dt>
                  <dd className="font-mono tabular-nums text-[#FFFFFF]">
                    {analysis.summary.minSlopeDegrees !== null &&
                    analysis.summary.maxSlopeDegrees !== null
                      ? `${analysis.summary.minSlopeDegrees.toFixed(1)}° – ${analysis.summary.maxSlopeDegrees.toFixed(1)}°`
                      : 'N/A'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#FFFFFF]/70">Mean Slope</dt>
                  <dd className="font-mono tabular-nums text-[#2F96F5]">
                    {analysis.summary.meanSlopeDegrees !== null
                      ? `${analysis.summary.meanSlopeDegrees.toFixed(2)}°`
                      : 'N/A'}
                  </dd>
                </div>
              </dl>

              <div className="border-t border-[#0042A6]/80 pt-2.5 grid grid-cols-2 gap-2 text-[11px] font-mono tabular-nums">
                <div className="flex justify-between text-[#2F96F5]">
                  <span>0 Easy:</span>
                  <span>{analysis.summary.classCounts[0]}</span>
                </div>
                <div className="flex justify-between text-[#FFFFFF]">
                  <span>1 Mod:</span>
                  <span>{analysis.summary.classCounts[1]}</span>
                </div>
                <div className="flex justify-between text-[#EAFE07]">
                  <span>2 Diff:</span>
                  <span>{analysis.summary.classCounts[2]}</span>
                </div>
                <div className="flex justify-between text-[#E43700]">
                  <span>3 V.Diff:</span>
                  <span>{analysis.summary.classCounts[3]}</span>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};
