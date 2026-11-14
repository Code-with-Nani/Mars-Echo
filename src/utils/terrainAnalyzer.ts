export type ElevationUnit = 'meters' | 'kilometers';

export type DifficultyLevel = 0 | 1 | 2 | 3;

export type DifficultyLabel =
  | 'Easy'
  | 'Moderate'
  | 'Difficult'
  | 'Very Difficult';

export type SlopeGradientMethod =
  | 'central-difference'
  | 'one-sided-fallback'
  | 'invalid-elevation'
  | 'insufficient-neighbors'
  | 'invalid-cell-distance';

export interface SlopeThresholds {
  /** Maximum slope in degrees (inclusive) for 0 – Easy. */
  easyMaxDeg: number;
  /** Maximum slope in degrees (inclusive) for 1 – Moderate. */
  moderateMaxDeg: number;
  /** Maximum slope in degrees (inclusive) for 2 – Difficult; above is 3 – Very Difficult. */
  difficultMaxDeg: number;
}

export interface TerrainAnalysisOptions {
  /** Horizontal center-to-center spacing between adjacent grid cells. Must be > 0. */
  cellDistance: number;
  /** Unit of cellDistance (defaults to 'meters'). */
  cellDistanceUnit?: ElevationUnit;
  /** Unit of elevation values in the input grid (defaults to 'meters'). */
  elevationUnit?: ElevationUnit;
  /** Configurable slope classification thresholds in degrees. */
  thresholds?: SlopeThresholds;
}

export interface TerrainCellAnalysis {
  row: number;
  col: number;
  /** Original input elevation in the provided elevationUnit (null if missing or non-finite). */
  rawElevation: number | null;
  /** Input elevation converted to meters (null if invalid). */
  elevationMeters: number | null;
  /** Calculated terrain slope magnitude in degrees [0, 90) (null if invalid). */
  slopeDegrees: number | null;
  /** Calculated slope grade in percent (tan(theta) * 100) (null if invalid). */
  slopePercent: number | null;
  /** West-to-east directional gradient dz/dx in m/m (null if invalid). */
  gradientX: number | null;
  /** North-to-south directional gradient dz/dy in m/m (null if invalid). */
  gradientY: number | null;
  /** Difficulty classification 0–3 (null if invalid). */
  difficultyClass: DifficultyLevel | null;
  /** Human-readable difficulty class label. */
  difficultyLabel: DifficultyLabel | 'Invalid';
  /** True only when elevation is finite and slope could be derived from neighbors. */
  isValid: boolean;
  /** True when the cell's own elevation value is a finite number. */
  hasValidElevation: boolean;
  /** Method used to derive gradient or reason the cell is invalid. */
  method: SlopeGradientMethod;
}

export interface TerrainAnalysisSummary {
  rows: number;
  cols: number;
  totalCells: number;
  validCells: number;
  invalidCells: number;
  minElevationMeters: number | null;
  maxElevationMeters: number | null;
  minSlopeDegrees: number | null;
  maxSlopeDegrees: number | null;
  meanSlopeDegrees: number | null;
  classCounts: Record<DifficultyLevel, number>;
}

export interface TerrainGridAnalysis {
  cells: TerrainCellAnalysis[][];
  summary: TerrainAnalysisSummary;
  cellDistanceMeters: number;
  elevationUnit: ElevationUnit;
  thresholds: SlopeThresholds;
}

export type RawElevationGrid = ReadonlyArray<
  ReadonlyArray<number | null | undefined>
>;

export const DEFAULT_SLOPE_THRESHOLDS: SlopeThresholds = {
  easyMaxDeg: 5,
  moderateMaxDeg: 15,
  difficultMaxDeg: 25,
};

export const DIFFICULTY_LABELS: Record<DifficultyLevel, DifficultyLabel> = {
  0: 'Easy',
  1: 'Moderate',
  2: 'Difficult',
  3: 'Very Difficult',
};

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundToFour(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export function toMeters(value: number, unit: ElevationUnit): number {
  return unit === 'kilometers' ? value * 1000 : value;
}

function isFiniteElevation(
  value: number | null | undefined
): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Normalizes slope thresholds to guarantee valid ascending bounds in [0, 90]:
 * 0 <= easyMaxDeg <= moderateMaxDeg <= difficultMaxDeg <= 90.
 */
export function normalizeSlopeThresholds(
  thresholds: SlopeThresholds = DEFAULT_SLOPE_THRESHOLDS
): SlopeThresholds {
  const clampDeg = (v: number, fallback: number) =>
    Number.isFinite(v) ? Math.max(0, Math.min(90, v)) : fallback;

  const easyMaxDeg = clampDeg(
    thresholds.easyMaxDeg,
    DEFAULT_SLOPE_THRESHOLDS.easyMaxDeg
  );
  const moderateMaxDeg = Math.max(
    easyMaxDeg,
    clampDeg(thresholds.moderateMaxDeg, DEFAULT_SLOPE_THRESHOLDS.moderateMaxDeg)
  );
  const difficultMaxDeg = Math.max(
    moderateMaxDeg,
    clampDeg(
      thresholds.difficultMaxDeg,
      DEFAULT_SLOPE_THRESHOLDS.difficultMaxDeg
    )
  );

  return {
    easyMaxDeg: roundToTwo(easyMaxDeg),
    moderateMaxDeg: roundToTwo(moderateMaxDeg),
    difficultMaxDeg: roundToTwo(difficultMaxDeg),
  };
}

/**
 * Classifies a valid slope angle (degrees) into difficulty levels 0–3.
 */
export function classifySlopeDifficulty(
  slopeDegrees: number,
  thresholds: SlopeThresholds = DEFAULT_SLOPE_THRESHOLDS
): { difficultyClass: DifficultyLevel; difficultyLabel: DifficultyLabel } {
  const t = normalizeSlopeThresholds(thresholds);

  if (slopeDegrees <= t.easyMaxDeg) {
    return { difficultyClass: 0, difficultyLabel: DIFFICULTY_LABELS[0] };
  }
  if (slopeDegrees <= t.moderateMaxDeg) {
    return { difficultyClass: 1, difficultyLabel: DIFFICULTY_LABELS[1] };
  }
  if (slopeDegrees <= t.difficultMaxDeg) {
    return { difficultyClass: 2, difficultyLabel: DIFFICULTY_LABELS[2] };
  }
  return { difficultyClass: 3, difficultyLabel: DIFFICULTY_LABELS[3] };
}

interface AxisGradientResult {
  gradient: number | null;
  usedCentral: boolean;
}

function computeAxisGradient(
  centerMeters: number,
  prevMeters: number | null,
  nextMeters: number | null,
  spacingMeters: number
): AxisGradientResult {
  if (prevMeters !== null && nextMeters !== null) {
    return {
      gradient: (nextMeters - prevMeters) / (2 * spacingMeters),
      usedCentral: true,
    };
  }
  if (nextMeters !== null) {
    return {
      gradient: (nextMeters - centerMeters) / spacingMeters,
      usedCentral: false,
    };
  }
  if (prevMeters !== null) {
    return {
      gradient: (centerMeters - prevMeters) / spacingMeters,
      usedCentral: false,
    };
  }
  return {
    gradient: null,
    usedCentral: false,
  };
}

/**
 * Deterministic Terrain Slope and Difficulty Calculation Engine.
 *
 * Assumptions:
 * - Grid cells are uniformly spaced horizontally by `cellDistance` in both X and Y.
 * - Slope is calculated from finite-difference gradients across cardinal neighbors
 *   (central difference when both opposite neighbors are valid; one-sided difference
 *   at grid boundaries or adjacent to missing/invalid cells).
 * - Represents macro-scale grid slope only; does NOT detect rocks, boulders,
 *   sub-grid roughness, or craters.
 */
export function analyzeTerrainGrid(
  elevationGrid: RawElevationGrid,
  options: TerrainAnalysisOptions
): TerrainGridAnalysis {
  const elevationUnit: ElevationUnit = options.elevationUnit ?? 'meters';
  const cellDistanceUnit: ElevationUnit = options.cellDistanceUnit ?? 'meters';
  const normalizedThresholds = normalizeSlopeThresholds(options.thresholds);

  const rawSpacingMeters =
    typeof options.cellDistance === 'number' &&
    Number.isFinite(options.cellDistance)
      ? toMeters(options.cellDistance, cellDistanceUnit)
      : 0;
  const hasValidSpacing = rawSpacingMeters > 0;
  const cellDistanceMeters = hasValidSpacing ? roundToFour(rawSpacingMeters) : 0;

  const rows = elevationGrid.length;
  const cols = rows > 0 ? Math.max(...elevationGrid.map((r) => r.length), 0) : 0;

  // Normalize raw & meter elevation matrices safely (handles jagged rows & invalid values)
  const rawMatrix: (number | null)[][] = [];
  const metersMatrix: (number | null)[][] = [];

  for (let r = 0; r < rows; r += 1) {
    const row = elevationGrid[r] ?? [];
    const rawRow: (number | null)[] = [];
    const metersRow: (number | null)[] = [];
    for (let c = 0; c < cols; c += 1) {
      const val = row[c];
      if (isFiniteElevation(val)) {
        rawRow.push(val);
        metersRow.push(toMeters(val, elevationUnit));
      } else {
        rawRow.push(null);
        metersRow.push(null);
      }
    }
    rawMatrix.push(rawRow);
    metersMatrix.push(metersRow);
  }

  const cells: TerrainCellAnalysis[][] = [];
  const classCounts: Record<DifficultyLevel, number> = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
  };

  let validCells = 0;
  let invalidCells = 0;
  let minElevationMeters: number | null = null;
  let maxElevationMeters: number | null = null;
  let minSlopeDegrees: number | null = null;
  let maxSlopeDegrees: number | null = null;
  let slopeSum = 0;

  for (let r = 0; r < rows; r += 1) {
    const analyzedRow: TerrainCellAnalysis[] = [];
    for (let c = 0; c < cols; c += 1) {
      const rawElevation = rawMatrix[r][c];
      const elevationMeters = metersMatrix[r][c];
      const hasValidElevation = elevationMeters !== null;

      if (elevationMeters !== null) {
        minElevationMeters =
          minElevationMeters === null
            ? elevationMeters
            : Math.min(minElevationMeters, elevationMeters);
        maxElevationMeters =
          maxElevationMeters === null
            ? elevationMeters
            : Math.max(maxElevationMeters, elevationMeters);
      }

      if (!hasValidElevation) {
        invalidCells += 1;
        analyzedRow.push({
          row: r,
          col: c,
          rawElevation: null,
          elevationMeters: null,
          slopeDegrees: null,
          slopePercent: null,
          gradientX: null,
          gradientY: null,
          difficultyClass: null,
          difficultyLabel: 'Invalid',
          isValid: false,
          hasValidElevation: false,
          method: 'invalid-elevation',
        });
        continue;
      }

      if (!hasValidSpacing) {
        invalidCells += 1;
        analyzedRow.push({
          row: r,
          col: c,
          rawElevation,
          elevationMeters: roundToTwo(elevationMeters),
          slopeDegrees: null,
          slopePercent: null,
          gradientX: null,
          gradientY: null,
          difficultyClass: null,
          difficultyLabel: 'Invalid',
          isValid: false,
          hasValidElevation: true,
          method: 'invalid-cell-distance',
        });
        continue;
      }

      const west = c > 0 ? metersMatrix[r][c - 1] : null;
      const east = c + 1 < cols ? metersMatrix[r][c + 1] : null;
      const north = r > 0 ? metersMatrix[r - 1][c] : null;
      const south = r + 1 < rows ? metersMatrix[r + 1][c] : null;

      const xRes = computeAxisGradient(
        elevationMeters,
        west,
        east,
        rawSpacingMeters
      );
      const yRes = computeAxisGradient(
        elevationMeters,
        north,
        south,
        rawSpacingMeters
      );

      if (xRes.gradient === null && yRes.gradient === null) {
        invalidCells += 1;
        analyzedRow.push({
          row: r,
          col: c,
          rawElevation,
          elevationMeters: roundToTwo(elevationMeters),
          slopeDegrees: null,
          slopePercent: null,
          gradientX: null,
          gradientY: null,
          difficultyClass: null,
          difficultyLabel: 'Invalid',
          isValid: false,
          hasValidElevation: true,
          method: 'insufficient-neighbors',
        });
        continue;
      }

      const gx = xRes.gradient ?? 0;
      const gy = yRes.gradient ?? 0;
      const magnitude = Math.hypot(gx, gy);
      const slopeDegrees = roundToTwo((Math.atan(magnitude) * 180) / Math.PI);
      const slopePercent = roundToTwo(magnitude * 100);
      const { difficultyClass, difficultyLabel } = classifySlopeDifficulty(
        slopeDegrees,
        normalizedThresholds
      );

      const method: SlopeGradientMethod =
        xRes.usedCentral && yRes.usedCentral
          ? 'central-difference'
          : 'one-sided-fallback';

      validCells += 1;
      classCounts[difficultyClass] += 1;
      slopeSum += slopeDegrees;
      minSlopeDegrees =
        minSlopeDegrees === null
          ? slopeDegrees
          : Math.min(minSlopeDegrees, slopeDegrees);
      maxSlopeDegrees =
        maxSlopeDegrees === null
          ? slopeDegrees
          : Math.max(maxSlopeDegrees, slopeDegrees);

      analyzedRow.push({
        row: r,
        col: c,
        rawElevation,
        elevationMeters: roundToTwo(elevationMeters),
        slopeDegrees,
        slopePercent,
        gradientX: roundToFour(gx),
        gradientY: roundToFour(gy),
        difficultyClass,
        difficultyLabel,
        isValid: true,
        hasValidElevation: true,
        method,
      });
    }
    cells.push(analyzedRow);
  }

  const totalCells = rows * cols;
  const meanSlopeDegrees =
    validCells > 0 ? roundToTwo(slopeSum / validCells) : null;

  return {
    cells,
    summary: {
      rows,
      cols,
      totalCells,
      validCells,
      invalidCells,
      minElevationMeters:
        minElevationMeters !== null ? roundToTwo(minElevationMeters) : null,
      maxElevationMeters:
        maxElevationMeters !== null ? roundToTwo(maxElevationMeters) : null,
      minSlopeDegrees,
      maxSlopeDegrees,
      meanSlopeDegrees,
      classCounts,
    },
    cellDistanceMeters,
    elevationUnit,
    thresholds: normalizedThresholds,
  };
}

export interface SyntheticTerrainPreset {
  id: string;
  name: string;
  isSynthetic: true;
  cellDistanceMeters: number;
  elevationUnit: ElevationUnit;
  description: string;
  grid: (number | null)[][];
}

/**
 * Clearly labeled synthetic elevation grids for deterministic testing and inspection.
 * These are NOT real Mars orbital elevation measurements.
 */
export const SYNTHETIC_TERRAIN_PRESETS: SyntheticTerrainPreset[] = [
  {
    id: 'synthetic-escarpment',
    name: 'Synthetic Escarpment Ramp (6×8)',
    isSynthetic: true,
    cellDistanceMeters: 30,
    elevationUnit: 'meters',
    description:
      'Synthetic test grid stepping from a gentle floor (≤5°) across moderate (6–15°) and difficult (16–25°) slopes to a steep scarp (>25°).',
    grid: [
      [100.0, 101.2, 103.5, 108.0, 114.8, 124.2, 137.0, 156.5],
      [100.5, 101.8, 104.2, 109.0, 116.0, 125.8, 139.0, 159.0],
      [101.0, 102.4, 105.0, 110.2, 117.6, 127.8, 141.5, 162.0],
      [101.5, 103.0, 105.8, 111.5, 119.2, 129.8, 144.0, 165.0],
      [102.0, 103.5, 106.5, 112.4, 120.5, 131.5, 146.2, 167.5],
      [102.3, 103.9, 107.0, 113.0, 121.4, 132.8, 148.0, 169.5],
    ],
  },
  {
    id: 'synthetic-missing-gaps',
    name: 'Synthetic Ridge with Missing Cells (6×8)',
    isSynthetic: true,
    cellDistanceMeters: 25,
    elevationUnit: 'meters',
    description:
      'Synthetic validation grid containing intentional null gaps and an isolated cell to verify safe missing-data handling and one-sided neighbor fallbacks.',
    grid: [
      [200, 201, 203, 208, 215, 224, 232, 236],
      [201, 202, null, 210, 218, 228, 236, 240],
      [202, 204, 207, 213, null, 231, 241, 246],
      [203, 205, 209, 217, 226, 235, null, null],
      [null, null, 211, 219, 229, 239, null, 250],
      [null, 206, 212, 221, 231, 241, null, null],
    ],
  },
  {
    id: 'synthetic-basin',
    name: 'Synthetic Multi-Slope Basin (6×8)',
    isSynthetic: true,
    cellDistanceMeters: 25,
    elevationUnit: 'meters',
    description:
      'Synthetic bowl-shaped elevation field demonstrating flat Easy basin floor (0), Moderate inner slopes (1), Difficult walls (2), and Very Difficult rim (3).',
    grid: [
      [58, 44, 32, 24, 24, 32, 44, 58],
      [44, 28, 17, 11, 11, 17, 28, 44],
      [32, 16, 4.5, 3.0, 3.0, 4.5, 16, 32],
      [32, 16, 4.5, 2.5, 2.5, 4.5, 16, 32],
      [45, 29, 18, 12, 12, 18, 29, 45],
      [60, 46, 34, 25, 25, 34, 46, 60],
    ],
  },
];
