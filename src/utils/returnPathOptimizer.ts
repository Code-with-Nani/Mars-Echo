import type {
  CandidateRouteEvaluation,
  DirectedRouteLeg,
  MissionDecisionOutcome,
  RouteOptimizationResult,
  RoutePointInput,
  RouteResourceComparisonItem,
  RouteStrategyId,
  RouteWaypoint,
  TerrainOverlayCellInfo,
  TraversalRules,
} from '../types/mars';
import type { EvaluatedTerrainOverlay } from './marsDemService';
import {
  calculateMissionResources,
  estimateReturnFeasibility,
  type AstronautResourceProfile,
  type ResourceThresholds,
} from './resourceCalculator';

/**
 * Official NASA PDS4 MOLA MEGDR Mars spherical radius in meters
 * (from <cart:a_axis_radius unit="km">3396.0</cart:a_axis_radius>).
 */
export const MARS_PDS4_RADIUS_METERS = 3396000;

export const DEFAULT_TRAVERSAL_RULES: TraversalRules = {
  allowDifficult: true,
  allowVeryDifficult: false,
  baseSpeedKmh: 3.0,
  safetyReservePct: 15,
};

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function roundToTwo(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * Computes true Mars great-circle surface distance in meters between two planetocentric
 * (lat, lon) coordinates using the PDS4 Mars radius (3,396.0 km).
 */
export function computeMarsGeodesicMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const dPhi = toRad(lat2 - lat1);
  let dLonDeg = lon2 - lon1;
  if (dLonDeg > 180) dLonDeg -= 360;
  if (dLonDeg < -180) dLonDeg += 360;
  const dLambda = toRad(dLonDeg);

  const sinDPhi = Math.sin(dPhi / 2);
  const sinDLambda = Math.sin(dLambda / 2);
  const a =
    sinDPhi * sinDPhi +
    Math.cos(phi1) * Math.cos(phi2) * sinDLambda * sinDLambda;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
  return MARS_PDS4_RADIUS_METERS * c;
}

export function isValidMarsCoordinate(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

/**
 * Computes a padded geographic bounding box enclosing Habitat and Destination
 * for corridor terrain sampling, returning null if coordinates are invalid or exceed
 * maximum regional EVA corridor span.
 */
export function computeMissionCorridorBounds(
  habitat: RoutePointInput,
  destination: RoutePointInput
): {
  bounds: [number, number, number, number] | null;
  error?: string;
} {
  if (!isValidMarsCoordinate(habitat.lat, habitat.lon)) {
    return {
      bounds: null,
      error: 'Habitat coordinates must lie within Lat [-90°, 90°] and Lon [-180°, 180°].',
    };
  }
  if (!isValidMarsCoordinate(destination.lat, destination.lon)) {
    return {
      bounds: null,
      error: 'Destination coordinates must lie within Lat [-90°, 90°] and Lon [-180°, 180°].',
    };
  }

  const minLon = Math.min(habitat.lon, destination.lon);
  const maxLon = Math.max(habitat.lon, destination.lon);
  const minLat = Math.min(habitat.lat, destination.lat);
  const maxLat = Math.max(habitat.lat, destination.lat);

  const lonSpan = maxLon - minLon;
  const latSpan = maxLat - minLat;

  if (lonSpan > 6 || latSpan > 6) {
    return {
      bounds: null,
      error:
        'Habitat and Destination are more than 6° (~355 km) apart, exceeding regional EVA corridor terrain sampling limits.',
    };
  }

  const padLon = Math.max(0.12, lonSpan * 0.35);
  const padLat = Math.max(0.12, latSpan * 0.35);

  const bMinLon = Math.max(-180, minLon - padLon);
  const bMaxLon = Math.min(180, maxLon + padLon);
  const bMinLat = Math.max(-90, minLat - padLat);
  const bMaxLat = Math.min(90, maxLat + padLat);

  return {
    bounds: [
      Math.round(bMinLon * 10000) / 10000,
      Math.round(bMinLat * 10000) / 10000,
      Math.round(bMaxLon * 10000) / 10000,
      Math.round(bMaxLat * 10000) / 10000,
    ],
  };
}

/**
 * Locates the grid cell matching (lat, lon) if it lies within the sampled grid extent.
 */
export function locateGridCellForPoint(
  overlay: EvaluatedTerrainOverlay,
  lat: number,
  lon: number
): TerrainOverlayCellInfo | null {
  if (!isValidMarsCoordinate(lat, lon)) return null;
  const rows = overlay.analysis.summary.rows;
  const cols = overlay.analysis.summary.cols;
  if (rows === 0 || cols === 0) return null;

  const [bMinLon, bMinLat, bMaxLon, bMaxLat] = overlay.patch.bounds;
  const cellLatDeg = (bMaxLat - bMinLat) / rows;
  const cellLonDeg = (bMaxLon - bMinLon) / cols;

  // Check if point falls outside sampled patch bounds (with half-cell edge tolerance)
  if (
    lat < bMinLat - cellLatDeg * 0.6 ||
    lat > bMaxLat + cellLatDeg * 0.6 ||
    lon < bMinLon - cellLonDeg * 0.6 ||
    lon > bMaxLon + cellLonDeg * 0.6
  ) {
    return null;
  }

  let bestCell: TerrainOverlayCellInfo | null = null;
  let bestDistSq = Number.POSITIVE_INFINITY;

  for (const cell of overlay.cells) {
    const dLat = cell.lat - lat;
    const dLon = cell.lon - lon;
    const dSq = dLat * dLat + dLon * dLon;
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      bestCell = cell;
    }
  }

  return bestCell;
}

class MinHeap<T> {
  private heap: Array<{ item: T; priority: number }> = [];

  get size(): number {
    return this.heap.length;
  }

  push(item: T, priority: number): void {
    this.heap.push({ item, priority });
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): T | undefined {
    if (this.heap.length === 0) return undefined;
    const top = this.heap[0].item;
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.sinkDown(0);
    }
    return top;
  }

  private bubbleUp(idx: number): void {
    while (idx > 0) {
      const parent = Math.floor((idx - 1) / 2);
      if (this.heap[idx].priority >= this.heap[parent].priority) break;
      const tmp = this.heap[idx];
      this.heap[idx] = this.heap[parent];
      this.heap[parent] = tmp;
      idx = parent;
    }
  }

  private sinkDown(idx: number): void {
    const len = this.heap.length;
    while (true) {
      const left = idx * 2 + 1;
      const right = idx * 2 + 2;
      let smallest = idx;
      if (left < len && this.heap[left].priority < this.heap[smallest].priority) {
        smallest = left;
      }
      if (right < len && this.heap[right].priority < this.heap[smallest].priority) {
        smallest = right;
      }
      if (smallest === idx) break;
      const tmp = this.heap[idx];
      this.heap[idx] = this.heap[smallest];
      this.heap[smallest] = tmp;
      idx = smallest;
    }
  }
}

const DIFFICULTY_SPEED_FACTORS: Record<0 | 1 | 2 | 3, number> = {
  0: 1.0,
  1: 0.78,
  2: 0.52,
  3: 0.32,
};

const STRATEGY_META: Record<
  RouteStrategyId,
  { name: string; summary: string }
> = {
  shortest: {
    name: 'Shortest Distance',
    summary: 'Minimizes physical 3D Mars surface distance across valid cells.',
  },
  'lowest-risk': {
    name: 'Lowest Terrain Risk',
    summary: 'Strongly penalizes steep slopes and moderate/difficult classes.',
  },
  balanced: {
    name: 'Balanced Route',
    summary: 'Balances traverse distance against slope grade and difficulty.',
  },
};

function isCellTraversable(
  cell: TerrainOverlayCellInfo,
  rules: TraversalRules
): boolean {
  if (
    !cell.isValid ||
    cell.elevationMeters === null ||
    cell.difficultyClass === null
  ) {
    return false;
  }
  if (cell.difficultyClass === 3 && !rules.allowVeryDifficult) {
    return false;
  }
  if (cell.difficultyClass === 2 && !rules.allowDifficult) {
    return false;
  }
  return true;
}

function computeStepMetrics(
  from: TerrainOverlayCellInfo,
  to: TerrainOverlayCellInfo,
  strategy: RouteStrategyId,
  rules: TraversalRules,
  evaProfile: AstronautResourceProfile
): {
  aStarCost: number;
  surfaceMeters: number;
  hours: number;
  elevDelta: number;
  segSlopeDeg: number;
  oxygenCost: number;
  batteryCost: number;
  coolingCost: number;
} {
  const horizMeters = Math.max(
    1,
    computeMarsGeodesicMeters(from.lat, from.lon, to.lat, to.lon)
  );
  const elevDelta =
    (to.elevationMeters ?? 0) - (from.elevationMeters ?? 0);
  const surfaceMeters = Math.hypot(horizMeters, elevDelta);
  const segSlopeDeg =
    (Math.atan(Math.abs(elevDelta) / horizMeters) * 180) / Math.PI;
  const uphillDeg = elevDelta > 0 ? segSlopeDeg : 0;

  const diffClass = (to.difficultyClass ?? 0) as 0 | 1 | 2 | 3;
  const cellSlope = to.slopeDegrees ?? segSlopeDeg;

  let aStarCost: number;
  if (strategy === 'shortest') {
    aStarCost = surfaceMeters * (1 + diffClass * 0.01);
  } else if (strategy === 'lowest-risk') {
    const diffWeights: Record<0 | 1 | 2 | 3, number> = {
      0: 1.0,
      1: 2.8,
      2: 9.0,
      3: 32.0,
    };
    const slopePenalty =
      1 + Math.pow(cellSlope / 12, 2) * 0.8 + uphillDeg * 0.08;
    aStarCost = surfaceMeters * diffWeights[diffClass] * slopePenalty;
  } else {
    const diffWeights: Record<0 | 1 | 2 | 3, number> = {
      0: 1.0,
      1: 1.5,
      2: 3.4,
      3: 11.0,
    };
    const slopePenalty =
      1 + Math.pow(cellSlope / 18, 2) * 0.35 + uphillDeg * 0.035;
    aStarCost = surfaceMeters * diffWeights[diffClass] * slopePenalty;
  }

  // Deterministic simulated EVA speed & exertion scaling
  const safeSpeedKmh = Math.max(0.25, rules.baseSpeedKmh);
  const diffSpeed = DIFFICULTY_SPEED_FACTORS[diffClass];
  const gradeSpeed =
    elevDelta > 0
      ? 1 / (1 + uphillDeg * 0.045)
      : 1 / (1 + Math.max(0, segSlopeDeg - 6) * 0.015);
  const effectiveSpeedKmh = Math.max(0.25, safeSpeedKmh * diffSpeed * gradeSpeed);
  const hours = surfaceMeters / 1000 / effectiveSpeedKmh;

  const oxygenEffort = 1 + uphillDeg * 0.035 + diffClass * 0.08;
  const batteryEffort = 1 + uphillDeg * 0.04 + diffClass * 0.06;
  const coolingEffort = 1 + uphillDeg * 0.025 + diffClass * 0.05;

  return {
    aStarCost,
    surfaceMeters,
    hours,
    elevDelta,
    segSlopeDeg,
    oxygenCost: evaProfile.oxygenConsumptionPerHour * hours * oxygenEffort,
    batteryCost: evaProfile.batteryConsumptionPerHour * hours * batteryEffort,
    coolingCost: evaProfile.coolingConsumptionPerHour * hours * coolingEffort,
  };
}

const NEIGHBOR_OFFSETS: ReadonlyArray<[number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
  [-1, -1],
  [-1, 1],
  [1, -1],
  [1, 1],
];

function emptyFailedLeg(reason: string): DirectedRouteLeg {
  return {
    found: false,
    failureReason: reason,
    waypoints: [],
    distanceMeters: 0,
    estimatedHours: 0,
    elevationGainMeters: 0,
    elevationLossMeters: 0,
    maxSlopeDegrees: 0,
    meanSlopeDegrees: 0,
    maxDifficultyClass: null,
    classStepCounts: { 0: 0, 1: 0, 2: 0, 3: 0 },
    oxygenRequired: 0,
    batteryRequired: 0,
    coolingRequired: 0,
  };
}

/**
 * Runs 8-neighbor A* pathfinding between startCell and goalCell over the evaluated grid.
 */
function runAStarDirectedLeg(
  cellMatrix: TerrainOverlayCellInfo[][],
  rows: number,
  cols: number,
  startCell: TerrainOverlayCellInfo,
  goalCell: TerrainOverlayCellInfo,
  strategy: RouteStrategyId,
  rules: TraversalRules,
  evaProfile: AstronautResourceProfile
): DirectedRouteLeg {
  if (!isCellTraversable(startCell, rules)) {
    return emptyFailedLeg(
      startCell.difficultyClass === 3 && !rules.allowVeryDifficult
        ? 'Start cell is classified as Very Difficult (disallowed by traversal rules).'
        : startCell.difficultyClass === 2 && !rules.allowDifficult
          ? 'Start cell is classified as Difficult (disallowed by traversal rules).'
          : 'Start cell lacks valid terrain elevation/slope data.'
    );
  }
  if (!isCellTraversable(goalCell, rules)) {
    return emptyFailedLeg(
      goalCell.difficultyClass === 3 && !rules.allowVeryDifficult
        ? 'Destination cell is classified as Very Difficult (disallowed by traversal rules).'
        : goalCell.difficultyClass === 2 && !rules.allowDifficult
          ? 'Destination cell is classified as Difficult (disallowed by traversal rules).'
          : 'Destination cell lacks valid terrain elevation/slope data.'
    );
  }

  const totalNodes = rows * cols;
  const startIdx = startCell.row * cols + startCell.col;
  const goalIdx = goalCell.row * cols + goalCell.col;

  if (startIdx === goalIdx) {
    const wp: RouteWaypoint = {
      row: startCell.row,
      col: startCell.col,
      lat: startCell.lat,
      lon: startCell.lon,
      elevationMeters: startCell.elevationMeters ?? 0,
      slopeDegrees: startCell.slopeDegrees ?? 0,
      difficultyClass: (startCell.difficultyClass ?? 0) as 0 | 1 | 2 | 3,
    };
    return {
      found: true,
      waypoints: [wp],
      distanceMeters: 0,
      estimatedHours: 0,
      elevationGainMeters: 0,
      elevationLossMeters: 0,
      maxSlopeDegrees: wp.slopeDegrees,
      meanSlopeDegrees: wp.slopeDegrees,
      maxDifficultyClass: wp.difficultyClass,
      classStepCounts: {
        0: wp.difficultyClass === 0 ? 1 : 0,
        1: wp.difficultyClass === 1 ? 1 : 0,
        2: wp.difficultyClass === 2 ? 1 : 0,
        3: wp.difficultyClass === 3 ? 1 : 0,
      },
      oxygenRequired: 0,
      batteryRequired: 0,
      coolingRequired: 0,
    };
  }

  const gScore = new Float64Array(totalNodes);
  gScore.fill(Number.POSITIVE_INFINITY);
  gScore[startIdx] = 0;

  const cameFrom = new Int32Array(totalNodes);
  cameFrom.fill(-1);

  const closed = new Uint8Array(totalNodes);
  const openHeap = new MinHeap<number>();

  const initialH = computeMarsGeodesicMeters(
    startCell.lat,
    startCell.lon,
    goalCell.lat,
    goalCell.lon
  );
  openHeap.push(startIdx, initialH);

  let foundGoal = false;

  while (openHeap.size > 0) {
    const currentIdx = openHeap.pop()!;
    if (closed[currentIdx]) continue;
    if (currentIdx === goalIdx) {
      foundGoal = true;
      break;
    }
    closed[currentIdx] = 1;

    const r = Math.floor(currentIdx / cols);
    const c = currentIdx % cols;
    const currentCell = cellMatrix[r][c];

    for (const [dr, dc] of NEIGHBOR_OFFSETS) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;

      const nextIdx = nr * cols + nc;
      if (closed[nextIdx]) continue;

      const nextCell = cellMatrix[nr][nc];
      if (!isCellTraversable(nextCell, rules)) continue;

      // Prevent diagonal corner-cutting: require BOTH adjacent orthogonal cells to be traversable
      if (dr !== 0 && dc !== 0) {
        const adj1 = cellMatrix[r + dr][c];
        const adj2 = cellMatrix[r][c + dc];
        if (
          !isCellTraversable(adj1, rules) ||
          !isCellTraversable(adj2, rules)
        ) {
          continue;
        }
      }

      const step = computeStepMetrics(
        currentCell,
        nextCell,
        strategy,
        rules,
        evaProfile
      );
      const tentativeG = gScore[currentIdx] + step.aStarCost;

      if (tentativeG < gScore[nextIdx]) {
        cameFrom[nextIdx] = currentIdx;
        gScore[nextIdx] = tentativeG;
        const h = computeMarsGeodesicMeters(
          nextCell.lat,
          nextCell.lon,
          goalCell.lat,
          goalCell.lon
        );
        openHeap.push(nextIdx, tentativeG + h);
      }
    }
  }

  if (!foundGoal) {
    return emptyFailedLeg(
      'No traversable path exists without crossing blocked terrain or No Data cells.'
    );
  }

  // Reconstruct cell sequence from startIdx -> goalIdx
  const idxPath: number[] = [];
  let cursor = goalIdx;
  while (cursor !== -1) {
    idxPath.push(cursor);
    if (cursor === startIdx) break;
    cursor = cameFrom[cursor];
  }
  idxPath.reverse();

  const waypoints: RouteWaypoint[] = idxPath.map((idx) => {
    const r = Math.floor(idx / cols);
    const c = idx % cols;
    const cell = cellMatrix[r][c];
    return {
      row: cell.row,
      col: cell.col,
      lat: cell.lat,
      lon: cell.lon,
      elevationMeters: cell.elevationMeters ?? 0,
      slopeDegrees: cell.slopeDegrees ?? 0,
      difficultyClass: (cell.difficultyClass ?? 0) as 0 | 1 | 2 | 3,
    };
  });

  let distanceMeters = 0;
  let estimatedHours = 0;
  let elevationGainMeters = 0;
  let elevationLossMeters = 0;
  let maxSlopeDegrees = waypoints[0].slopeDegrees;
  let slopeSum = 0;
  let maxDifficultyClass: 0 | 1 | 2 | 3 = waypoints[0].difficultyClass;
  const classStepCounts: Record<0 | 1 | 2 | 3, number> = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
  };
  let oxygenRequired = 0;
  let batteryRequired = 0;
  let coolingRequired = 0;

  for (let i = 0; i < idxPath.length; i += 1) {
    const wp = waypoints[i];
    if (wp.difficultyClass > maxDifficultyClass) {
      maxDifficultyClass = wp.difficultyClass;
    }
    maxSlopeDegrees = Math.max(maxSlopeDegrees, wp.slopeDegrees);
    slopeSum += wp.slopeDegrees;

    if (i > 0) {
      classStepCounts[wp.difficultyClass] += 1;
      const prevIdx = idxPath[i - 1];
      const curIdx = idxPath[i];
      const prevCell = cellMatrix[Math.floor(prevIdx / cols)][prevIdx % cols];
      const curCell = cellMatrix[Math.floor(curIdx / cols)][curIdx % cols];
      const step = computeStepMetrics(
        prevCell,
        curCell,
        strategy,
        rules,
        evaProfile
      );
      distanceMeters += step.surfaceMeters;
      estimatedHours += step.hours;
      if (step.elevDelta > 0) elevationGainMeters += step.elevDelta;
      else elevationLossMeters += Math.abs(step.elevDelta);
      oxygenRequired += step.oxygenCost;
      batteryRequired += step.batteryCost;
      coolingRequired += step.coolingCost;
    }
  }

  return {
    found: true,
    waypoints,
    distanceMeters: roundToTwo(distanceMeters),
    estimatedHours: roundToTwo(estimatedHours),
    elevationGainMeters: roundToTwo(elevationGainMeters),
    elevationLossMeters: roundToTwo(elevationLossMeters),
    maxSlopeDegrees: roundToTwo(maxSlopeDegrees),
    meanSlopeDegrees: roundToTwo(slopeSum / Math.max(1, waypoints.length)),
    maxDifficultyClass,
    classStepCounts,
    oxygenRequired: roundToTwo(oxygenRequired),
    batteryRequired: roundToTwo(batteryRequired),
    coolingRequired: roundToTwo(coolingRequired),
  };
}

function buildResourceComparisonItem(params: {
  id: 'oxygen' | 'battery' | 'cooling' | 'missionTime';
  label: string;
  unit: string;
  available: number;
  outboundRequired: number;
  returnRequired: number;
  safetyReserveRequired: number;
}): RouteResourceComparisonItem {
  const totalRequired = roundToTwo(params.outboundRequired + params.returnRequired);
  const postMissionRemaining = roundToTwo(params.available - totalRequired);
  const marginAfterReserve = roundToTwo(
    postMissionRemaining - params.safetyReserveRequired
  );

  const status: RouteResourceComparisonItem['status'] =
    postMissionRemaining < 0
      ? 'Insufficient'
      : marginAfterReserve < 0
        ? 'Warning'
        : 'Sufficient';

  return {
    id: params.id,
    label: params.label,
    unit: params.unit,
    available: roundToTwo(params.available),
    outboundRequired: roundToTwo(params.outboundRequired),
    returnRequired: roundToTwo(params.returnRequired),
    totalRequired,
    safetyReserveRequired: roundToTwo(params.safetyReserveRequired),
    postMissionRemaining,
    marginAfterReserve,
    status,
  };
}

function getDifficultyName(cls: 0 | 1 | 2 | 3 | null): string {
  switch (cls) {
    case 0:
      return 'Easy';
    case 1:
      return 'Moderate';
    case 2:
      return 'Difficult';
    case 3:
      return 'Very Difficult';
    default:
      return 'Unavailable';
  }
}

export interface OptimizeReturnMissionParams {
  overlay: EvaluatedTerrainOverlay | null;
  terrainUnavailableReason?: string | null;
  habitat: RoutePointInput | null;
  destination: RoutePointInput | null;
  evaProfile: AstronautResourceProfile;
  evaThresholds: ResourceThresholds;
  preDepartureElapsedHours: number;
  rules: TraversalRules;
}

/**
 * Pure, deterministic Module 4 Return Path Optimizer.
 * Computes outbound & return A* routes across Shortest Distance, Lowest Terrain Risk,
 * and Balanced strategies, then evaluates total & return-leg feasibility against
 * the shared Module 2 resourceCalculator engine.
 */
export function optimizeReturnMission(
  params: OptimizeReturnMissionParams
): RouteOptimizationResult {
  const {
    overlay,
    terrainUnavailableReason,
    habitat,
    destination,
    evaProfile,
    evaThresholds,
    preDepartureElapsedHours,
    rules,
  } = params;

  const buildInsufficientStrategy = (
    strategyId: RouteStrategyId,
    reason: string
  ): CandidateRouteEvaluation => ({
    strategyId,
    strategyName: STRATEGY_META[strategyId].name,
    strategySummary: STRATEGY_META[strategyId].summary,
    outbound: emptyFailedLeg(reason),
    returnLeg: emptyFailedLeg(reason),
    totalDistanceMeters: 0,
    totalEstimatedHours: 0,
    maxDifficultyClass: null,
    maxSlopeDegrees: 0,
    dominantTerrainLabel: 'Unavailable',
    decision: 'INSUFFICIENT DATA',
    explanation: reason,
    limitingResource: null,
    resourceComparison: null,
  });

  const makeInsufficientAll = (
    reason: string,
    habitatValid = false,
    destinationValid = false,
    habitatCell: TerrainOverlayCellInfo | null = null,
    destinationCell: TerrainOverlayCellInfo | null = null
  ): RouteOptimizationResult => ({
    habitatValid,
    destinationValid,
    coverageMessage: reason,
    habitatCell,
    destinationCell,
    strategies: {
      shortest: buildInsufficientStrategy('shortest', reason),
      'lowest-risk': buildInsufficientStrategy('lowest-risk', reason),
      balanced: buildInsufficientStrategy('balanced', reason),
    },
    recommendedStrategyId: 'balanced',
  });

  if (!habitat || !destination) {
    return makeInsufficientAll(
      'Select both a Habitat / Start location and an Exploration Destination on the Mars map.'
    );
  }

  if (!isValidMarsCoordinate(habitat.lat, habitat.lon)) {
    return makeInsufficientAll(
      'Invalid Habitat coordinates: latitude must be in [-90°, 90°] and longitude in [-180°, 180°].'
    );
  }
  if (!isValidMarsCoordinate(destination.lat, destination.lon)) {
    return makeInsufficientAll(
      'Invalid Destination coordinates: latitude must be in [-90°, 90°] and longitude in [-180°, 180°].'
    );
  }

  if (terrainUnavailableReason) {
    return makeInsufficientAll(
      `Terrain elevation dataset unavailable: ${terrainUnavailableReason}`
    );
  }

  if (!overlay || overlay.analysis.summary.rows < 2 || overlay.analysis.summary.cols < 2) {
    return makeInsufficientAll(
      'Terrain elevation grid has not finished loading or lacks sufficient spatial resolution.'
    );
  }

  if (
    !Number.isFinite(evaProfile.availableMissionHours) ||
    evaProfile.availableMissionHours <= 0 ||
    !Number.isFinite(evaProfile.startingOxygenPct) ||
    !Number.isFinite(evaProfile.startingBatteryPct) ||
    !Number.isFinite(evaProfile.startingCoolingPct)
  ) {
    return makeInsufficientAll(
      'Resource profile contains invalid or zero available mission duration.'
    );
  }

  const habitatCell = locateGridCellForPoint(overlay, habitat.lat, habitat.lon);
  const destinationCell = locateGridCellForPoint(
    overlay,
    destination.lat,
    destination.lon
  );

  const habitatCellValid = Boolean(
    habitatCell &&
      habitatCell.isValid &&
      habitatCell.elevationMeters !== null &&
      habitatCell.difficultyClass !== null
  );
  const destinationCellValid = Boolean(
    destinationCell &&
      destinationCell.isValid &&
      destinationCell.elevationMeters !== null &&
      destinationCell.difficultyClass !== null
  );

  if (!habitatCell || !destinationCell) {
    return makeInsufficientAll(
      'One or both selected coordinates fall outside the loaded terrain elevation coverage bounds.',
      habitatCellValid,
      destinationCellValid,
      habitatCell,
      destinationCell
    );
  }

  if (!habitatCellValid || !destinationCellValid) {
    const missingSide =
      !habitatCellValid && !destinationCellValid
        ? 'Both Habitat and Destination'
        : !habitatCellValid
          ? 'Habitat'
          : 'Destination';
    return makeInsufficientAll(
      `${missingSide} falls on a Missing / No Data elevation cell (${overlay.patch.dataset.shortName}). Select a point inside valid terrain coverage.`,
      habitatCellValid,
      destinationCellValid,
      habitatCell,
      destinationCell
    );
  }

  // Build 2D lookup matrix from evaluated cells
  const rows = overlay.analysis.summary.rows;
  const cols = overlay.analysis.summary.cols;
  const cellMatrix: TerrainOverlayCellInfo[][] = Array.from(
    { length: rows },
    () => new Array<TerrainOverlayCellInfo>(cols)
  );
  for (const cell of overlay.cells) {
    cellMatrix[cell.row][cell.col] = cell;
  }

  // Query Module 2 deterministic calculator for available resources at departure
  const preMissionReport = calculateMissionResources(
    evaProfile,
    preDepartureElapsedHours,
    evaThresholds
  );

  const reserveFraction = Math.max(0, Math.min(50, rules.safetyReservePct)) / 100;
  const oxygenReserve = roundToTwo(100 * reserveFraction);
  const batteryReserve = roundToTwo(100 * reserveFraction);
  const coolingReserve = roundToTwo(100 * reserveFraction);
  const timeReserveHours = roundToTwo(
    preMissionReport.missionTime.availableHours * reserveFraction
  );

  const strategyIds: RouteStrategyId[] = ['shortest', 'lowest-risk', 'balanced'];
  const strategies = {} as Record<RouteStrategyId, CandidateRouteEvaluation>;

  for (const strategyId of strategyIds) {
    const outbound = runAStarDirectedLeg(
      cellMatrix,
      rows,
      cols,
      habitatCell,
      destinationCell,
      strategyId,
      rules,
      evaProfile
    );
    const returnLeg = runAStarDirectedLeg(
      cellMatrix,
      rows,
      cols,
      destinationCell,
      habitatCell,
      strategyId,
      rules,
      evaProfile
    );

    if (!outbound.found || !returnLeg.found) {
      const legMsg = !outbound.found
        ? `Outbound path failed: ${outbound.failureReason}`
        : `Return path failed: ${returnLeg.failureReason}`;
      strategies[strategyId] = {
        strategyId,
        strategyName: STRATEGY_META[strategyId].name,
        strategySummary: STRATEGY_META[strategyId].summary,
        outbound,
        returnLeg,
        totalDistanceMeters: 0,
        totalEstimatedHours: 0,
        maxDifficultyClass: null,
        maxSlopeDegrees: 0,
        dominantTerrainLabel: 'Blocked',
        decision: 'NOT FEASIBLE',
        explanation: `${legMsg} Return safety cannot be established.`,
        limitingResource: null,
        resourceComparison: null,
      };
      continue;
    }

    const totalDistanceMeters = roundToTwo(
      outbound.distanceMeters + returnLeg.distanceMeters
    );
    const totalEstimatedHours = roundToTwo(
      outbound.estimatedHours + returnLeg.estimatedHours
    );
    const maxDifficultyClass = Math.max(
      outbound.maxDifficultyClass ?? 0,
      returnLeg.maxDifficultyClass ?? 0
    ) as 0 | 1 | 2 | 3;
    const maxSlopeDegrees = roundToTwo(
      Math.max(outbound.maxSlopeDegrees, returnLeg.maxSlopeDegrees)
    );

    const totalStepsByClass: Record<0 | 1 | 2 | 3, number> = {
      0: outbound.classStepCounts[0] + returnLeg.classStepCounts[0],
      1: outbound.classStepCounts[1] + returnLeg.classStepCounts[1],
      2: outbound.classStepCounts[2] + returnLeg.classStepCounts[2],
      3: outbound.classStepCounts[3] + returnLeg.classStepCounts[3],
    };
    const dominantClass = ([0, 1, 2, 3] as const).reduce((best, cur) =>
      totalStepsByClass[cur] > totalStepsByClass[best] ? cur : best
    , 0 as 0 | 1 | 2 | 3);

    const oxygenItem = buildResourceComparisonItem({
      id: 'oxygen',
      label: 'Oxygen',
      unit: 'units',
      available: preMissionReport.oxygen.remainingAmount,
      outboundRequired: outbound.oxygenRequired,
      returnRequired: returnLeg.oxygenRequired,
      safetyReserveRequired: oxygenReserve,
    });
    const batteryItem = buildResourceComparisonItem({
      id: 'battery',
      label: 'Battery',
      unit: '%',
      available: preMissionReport.battery.remainingAmount,
      outboundRequired: outbound.batteryRequired,
      returnRequired: returnLeg.batteryRequired,
      safetyReserveRequired: batteryReserve,
    });
    const coolingItem = buildResourceComparisonItem({
      id: 'cooling',
      label: 'Cooling Capacity',
      unit: '%',
      available: preMissionReport.cooling.remainingAmount,
      outboundRequired: outbound.coolingRequired,
      returnRequired: returnLeg.coolingRequired,
      safetyReserveRequired: coolingReserve,
    });
    const timeItem = buildResourceComparisonItem({
      id: 'missionTime',
      label: 'Mission Time',
      unit: 'hrs',
      available: preMissionReport.missionTime.remainingHours,
      outboundRequired: outbound.estimatedHours,
      returnRequired: returnLeg.estimatedHours,
      safetyReserveRequired: timeReserveHours,
    });

    // Cross-check return-leg feasibility using Module 2's estimateReturnFeasibility
    const postOutboundReport = calculateMissionResources(
      {
        ...evaProfile,
        startingOxygenPct: Math.max(
          0,
          preMissionReport.oxygen.remainingAmount - outbound.oxygenRequired
        ),
        startingBatteryPct: Math.max(
          0,
          preMissionReport.battery.remainingAmount - outbound.batteryRequired
        ),
        startingCoolingPct: Math.max(
          0,
          preMissionReport.cooling.remainingAmount - outbound.coolingRequired
        ),
        availableMissionHours: Math.max(
          0,
          preMissionReport.missionTime.remainingHours - outbound.estimatedHours
        ),
      },
      0,
      evaThresholds
    );

    const returnEffOxyRate =
      returnLeg.estimatedHours > 0
        ? returnLeg.oxygenRequired / returnLeg.estimatedHours
        : evaProfile.oxygenConsumptionPerHour;
    const returnEffBattRate =
      returnLeg.estimatedHours > 0
        ? returnLeg.batteryRequired / returnLeg.estimatedHours
        : evaProfile.batteryConsumptionPerHour;
    const returnEffCoolRate =
      returnLeg.estimatedHours > 0
        ? returnLeg.coolingRequired / returnLeg.estimatedHours
        : evaProfile.coolingConsumptionPerHour;

    const module2ReturnCheck = estimateReturnFeasibility(
      postOutboundReport,
      {
        returnDurationHours: returnLeg.estimatedHours,
        oxygenRatePerHour: returnEffOxyRate,
        batteryRatePerHour: returnEffBattRate,
        coolingRatePerHour: returnEffCoolRate,
      },
      evaThresholds
    );

    const items = [oxygenItem, batteryItem, coolingItem, timeItem];
    const severityOrder = { Insufficient: 2, Warning: 1, Sufficient: 0 };
    const sortedItems = [...items].sort((a, b) => {
      const sevDiff = severityOrder[b.status] - severityOrder[a.status];
      if (sevDiff !== 0) return sevDiff;
      return a.marginAfterReserve - b.marginAfterReserve;
    });
    const limitingResource = sortedItems[0];

    const hasInsufficient = items.some((i) => i.status === 'Insufficient');
    const hasReserveWarning =
      items.some((i) => i.status === 'Warning') ||
      module2ReturnCheck.overallResult === 'RETURN AT RISK';
    const crossesVeryDifficult = maxDifficultyClass === 3;

    let decision: MissionDecisionOutcome;
    let explanation: string;
    const unitTxt =
      limitingResource.unit === '%' ? '%' : ` ${limitingResource.unit}`;

    if (hasInsufficient || module2ReturnCheck.overallResult === 'RETURN NOT FEASIBLE') {
      decision = 'NOT FEASIBLE';
      const deficit = Math.abs(limitingResource.postMissionRemaining).toFixed(1);
      explanation = `${limitingResource.label} is the limiting resource: round-trip requires ${limitingResource.totalRequired.toFixed(1)}${unitTxt} (${outbound.distanceMeters > 0 ? (totalDistanceMeters / 1000).toFixed(2) : '0.00'} km round-trip), exceeding available ${limitingResource.available.toFixed(1)}${unitTxt} by ${deficit}${unitTxt}.`;
    } else if (hasReserveWarning || crossesVeryDifficult) {
      decision = 'AT RISK';
      if (crossesVeryDifficult && !hasReserveWarning) {
        explanation = `Resources cover the ${(totalDistanceMeters / 1000).toFixed(2)} km round-trip, but the path traverses Very Difficult terrain (max slope ${maxSlopeDegrees.toFixed(1)}°). Tightest resource is ${limitingResource.label} with ${limitingResource.postMissionRemaining.toFixed(1)}${unitTxt} post-return.`;
      } else {
        explanation = `Route completes within absolute capacity, but ${limitingResource.label} leaves ${limitingResource.postMissionRemaining.toFixed(1)}${unitTxt} post-return — below the configured ${rules.safetyReservePct}% safety reserve (${limitingResource.safetyReserveRequired.toFixed(1)}${unitTxt}).`;
      }
    } else {
      decision = 'FEASIBLE';
      explanation = `Outbound and return paths verified (${(totalDistanceMeters / 1000).toFixed(2)} km total, max ${getDifficultyName(maxDifficultyClass)} terrain). All resources satisfy the ${rules.safetyReservePct}% safety reserve; tightest margin is ${limitingResource.label} (${limitingResource.marginAfterReserve.toFixed(1)}${unitTxt} above reserve).`;
    }

    strategies[strategyId] = {
      strategyId,
      strategyName: STRATEGY_META[strategyId].name,
      strategySummary: STRATEGY_META[strategyId].summary,
      outbound,
      returnLeg,
      totalDistanceMeters,
      totalEstimatedHours,
      maxDifficultyClass,
      maxSlopeDegrees,
      dominantTerrainLabel: getDifficultyName(dominantClass),
      decision,
      explanation,
      limitingResource,
      resourceComparison: {
        oxygen: oxygenItem,
        battery: batteryItem,
        cooling: coolingItem,
        missionTime: timeItem,
      },
    };
  }

  // Recommend highest-feasibility strategy (prefer FEASIBLE > AT RISK > NOT FEASIBLE, then balanced/lowest-risk)
  const decisionRank: Record<MissionDecisionOutcome, number> = {
    FEASIBLE: 3,
    'AT RISK': 2,
    'NOT FEASIBLE': 1,
    'INSUFFICIENT DATA': 0,
  };
  const preferenceOrder: RouteStrategyId[] = [
    'balanced',
    'lowest-risk',
    'shortest',
  ];
  const recommendedStrategyId = preferenceOrder.reduce((best, cur) =>
    decisionRank[strategies[cur].decision] > decisionRank[strategies[best].decision]
      ? cur
      : best
  );

  return {
    habitatValid: true,
    destinationValid: true,
    coverageMessage: `Both locations verified within ${overlay.patch.dataset.shortName} (${rows}×${cols} grid, ~${Math.round(overlay.patch.cellDistanceMeters)} m/cell).`,
    habitatCell,
    destinationCell,
    strategies,
    recommendedStrategyId,
  };
}
