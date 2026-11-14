import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SLOPE_THRESHOLDS,
  type DifficultyLabel,
  type DifficultyLevel,
} from '../src/utils/terrainAnalyzer.ts';
import {
  ELEVATION_DATASET_BY_ID,
  evaluateTerrainOverlay,
  type EvaluatedTerrainOverlay,
  type SampledElevationPatch,
} from '../src/utils/marsDemService.ts';
import {
  DEFAULT_ASTRONAUT_PROFILE,
  DEFAULT_RESOURCE_THRESHOLDS,
} from '../src/utils/resourceCalculator.ts';
import {
  DEFAULT_TRAVERSAL_RULES,
  optimizeReturnMission,
} from '../src/utils/returnPathOptimizer.ts';

function createOverlayFromGrid(
  elevationGrid: (number | null)[][],
  difficultyOverrides: Array<{
    row: number;
    col: number;
    difficultyClass: DifficultyLevel;
    slopeDegrees: number;
  }> = []
): EvaluatedTerrainOverlay {
  const rows = elevationGrid.length;
  const cols = elevationGrid[0].length;
  const bounds: [number, number, number, number] = [0, 0, cols * 0.01, rows * 0.01];
  const dLat = 0.01;
  const dLon = 0.01;

  const cellBoundsGrid: [number, number, number, number][][] = [];
  const cellCenterGrid: { lat: number; lon: number }[][] = [];

  for (let r = 0; r < rows; r += 1) {
    const bRow: [number, number, number, number][] = [];
    const cRow: { lat: number; lon: number }[] = [];
    const latMax = bounds[3] - r * dLat;
    const latMin = latMax - dLat;
    for (let c = 0; c < cols; c += 1) {
      const lonMin = bounds[0] + c * dLon;
      const lonMax = lonMin + dLon;
      bRow.push([lonMin, latMin, lonMax, latMax]);
      cRow.push({ lat: (latMin + latMax) / 2, lon: (lonMin + lonMax) / 2 });
    }
    cellBoundsGrid.push(bRow);
    cellCenterGrid.push(cRow);
  }

  const patch: SampledElevationPatch = {
    dataset: ELEVATION_DATASET_BY_ID['synthetic-test'],
    bounds,
    elevationGrid: elevationGrid.map((r) => [...r]),
    cellBoundsGrid,
    cellCenterGrid,
    cellDistanceMeters: 500,
  };

  const overlay = evaluateTerrainOverlay(patch, DEFAULT_SLOPE_THRESHOLDS);
  const labelMap: Record<DifficultyLevel, DifficultyLabel> = {
    0: 'Easy',
    1: 'Moderate',
    2: 'Difficult',
    3: 'Very Difficult',
  };

  for (const ov of difficultyOverrides) {
    const cell = overlay.cells.find((c) => c.row === ov.row && c.col === ov.col);
    if (cell) {
      cell.difficultyClass = ov.difficultyClass;
      cell.difficultyLabel = labelMap[ov.difficultyClass];
      cell.slopeDegrees = ov.slopeDegrees;
      cell.isValid = true;
    }
  }

  return overlay;
}

function cellCoord(overlay: EvaluatedTerrainOverlay, row: number, col: number) {
  const cell = overlay.cells.find((c) => c.row === row && c.col === col);
  assert.ok(cell, `Expected cell (${row}, ${col}) to exist`);
  return { label: `(${row},${col})`, lat: cell.lat, lon: cell.lon };
}

test('1. Diagonal move succeeds directly when BOTH adjacent orthogonal cells are traversable', () => {
  // 2x2 all-Easy flat grid: (0,0) -> (1,1) has orthogonal neighbors (0,1) and (1,0) both traversable
  const overlay = createOverlayFromGrid([
    [0, 0],
    [0, 0],
  ]);

  const result = optimizeReturnMission({
    overlay,
    habitat: cellCoord(overlay, 0, 0),
    destination: cellCoord(overlay, 1, 1),
    evaProfile: DEFAULT_ASTRONAUT_PROFILE,
    evaThresholds: DEFAULT_RESOURCE_THRESHOLDS,
    preDepartureElapsedHours: 0,
    rules: { ...DEFAULT_TRAVERSAL_RULES, allowDifficult: false, allowVeryDifficult: false },
  });

  const shortest = result.strategies.shortest;
  assert.equal(shortest.outbound.found, true);
  assert.equal(shortest.returnLeg.found, true);
  assert.deepEqual(
    shortest.outbound.waypoints.map((w) => [w.row, w.col]),
    [
      [0, 0],
      [1, 1],
    ]
  );
  assert.deepEqual(
    shortest.returnLeg.waypoints.map((w) => [w.row, w.col]),
    [
      [1, 1],
      [0, 0],
    ]
  );
});

test('2. Diagonal move is forbidden when ONE adjacent orthogonal cell is blocked (must detour orthogonally, never corner-cut)', () => {
  // 2x2 grid: (0,0) -> (1,1).
  // (0,1) is blocked (Very Difficult, disallowed), while (1,0) is Easy (traversable).
  // Outbound MUST go (0,0) -> (1,0) -> (1,1), and Return MUST go (1,1) -> (1,0) -> (0,0).
  const overlay = createOverlayFromGrid(
    [
      [0, 0],
      [0, 0],
    ],
    [{ row: 0, col: 1, difficultyClass: 3, slopeDegrees: 32 }]
  );

  const result = optimizeReturnMission({
    overlay,
    habitat: cellCoord(overlay, 0, 0),
    destination: cellCoord(overlay, 1, 1),
    evaProfile: DEFAULT_ASTRONAUT_PROFILE,
    evaThresholds: DEFAULT_RESOURCE_THRESHOLDS,
    preDepartureElapsedHours: 0,
    rules: { ...DEFAULT_TRAVERSAL_RULES, allowDifficult: false, allowVeryDifficult: false },
  });

  for (const strategyId of ['shortest', 'lowest-risk', 'balanced'] as const) {
    const strat = result.strategies[strategyId];
    assert.equal(strat.outbound.found, true, `${strategyId} outbound should detour via (1,0)`);
    assert.equal(strat.returnLeg.found, true, `${strategyId} return should detour via (1,0)`);
    assert.deepEqual(
      strat.outbound.waypoints.map((w) => [w.row, w.col]),
      [
        [0, 0],
        [1, 0],
        [1, 1],
      ]
    );
    assert.deepEqual(
      strat.returnLeg.waypoints.map((w) => [w.row, w.col]),
      [
        [1, 1],
        [1, 0],
        [0, 0],
      ]
    );
  }
});

test('2b. Diagonal barrier with one blocked corner on each side blocks crossing completely (no corner squeeze)', () => {
  // 3x3 grid where an anti-diagonal barrier runs from (0,2) -> (1,1) -> (2,0)
  // Wait: simpler 3x3 checkerboard pinch between (0,0) and (2,2):
  // Let's block (0,1) and (1,2) and (1,0) only? No:
  // Suppose we only block (0,1) and (1,0) -> that's Test 3.
  // Suppose we put a diagonal wall at (0,1) and (1,0) -> covered below.
  // What about a 2x3 grid where row 0 col 1 is blocked and row 1 col 2 is NOT reachable without crossing?
  // Grid:
  // [ Easy(0,0), Blocked(0,1), Easy(0,2) ]
  // [ Easy(1,0), Blocked(1,1)? ] No, diagonal pinch:
  // [ Easy(0,0), Blocked(0,1) ]
  // [ Blocked(1,0)? ] -> that's 2 adjacent blocked.
  // What about a 2-row staggered pinch where ONLY one adjacent cell of every diagonal is blocked?
  // [ Easy(0,0), Blocked(0,1), Easy(0,2) ]
  // [ Easy(1,0), Blocked(1,1) -> Wait if (1,1) is Easy and (0,1) is Blocked, (0,0)->(1,1) goes via (1,0).
  // If (1,0) is Easy and (0,1) is Blocked, AND (1,2) is Blocked while (0,2) is Easy:
  // From (0,0) to (0,2):
  //   (0,0) -> (1,0) -> (1,1) is valid, then from (1,1) to (0,2), orthogonal neighbors are (0,1)=Blocked and (1,2)=Blocked!
  const overlay = createOverlayFromGrid(
    [
      [0, 0, 0],
      [0, 0, 0],
    ],
    [
      { row: 0, col: 1, difficultyClass: 3, slopeDegrees: 35 },
      { row: 1, col: 2, difficultyClass: 3, slopeDegrees: 35 },
    ]
  );

  const result = optimizeReturnMission({
    overlay,
    habitat: cellCoord(overlay, 0, 0),
    destination: cellCoord(overlay, 0, 2),
    evaProfile: DEFAULT_ASTRONAUT_PROFILE,
    evaThresholds: DEFAULT_RESOURCE_THRESHOLDS,
    preDepartureElapsedHours: 0,
    rules: { ...DEFAULT_TRAVERSAL_RULES, allowDifficult: false, allowVeryDifficult: false },
  });

  assert.equal(result.strategies.balanced.outbound.found, false);
  assert.equal(result.strategies.balanced.returnLeg.found, false);
  assert.equal(result.strategies.balanced.decision, 'NOT FEASIBLE');
});

test('3. Diagonal move is forbidden when BOTH adjacent orthogonal cells are blocked', () => {
  const overlay = createOverlayFromGrid(
    [
      [0, 0],
      [0, 0],
    ],
    [
      { row: 0, col: 1, difficultyClass: 3, slopeDegrees: 30 },
      { row: 1, col: 0, difficultyClass: 3, slopeDegrees: 30 },
    ]
  );

  const result = optimizeReturnMission({
    overlay,
    habitat: cellCoord(overlay, 0, 0),
    destination: cellCoord(overlay, 1, 1),
    evaProfile: DEFAULT_ASTRONAUT_PROFILE,
    evaThresholds: DEFAULT_RESOURCE_THRESHOLDS,
    preDepartureElapsedHours: 0,
    rules: { ...DEFAULT_TRAVERSAL_RULES, allowDifficult: false, allowVeryDifficult: false },
  });

  for (const strategyId of ['shortest', 'lowest-risk', 'balanced'] as const) {
    const strat = result.strategies[strategyId];
    assert.equal(strat.outbound.found, false);
    assert.equal(strat.returnLeg.found, false);
    assert.equal(strat.decision, 'NOT FEASIBLE');
  }
});

test('4. Route containing No Data cells never crosses or corner-cuts No Data cells and rejects No Data endpoints', () => {
  // 4a: (0,1) is null (No Data), so (0,0) -> (1,1) must NOT cut across the No Data cell
  const corridorWithNull = createOverlayFromGrid([
    [0, null, 0],
    [0, 0, 0],
    [0, 0, 0],
  ]);

  const routeAroundNull = optimizeReturnMission({
    overlay: corridorWithNull,
    habitat: cellCoord(corridorWithNull, 0, 0),
    destination: cellCoord(corridorWithNull, 0, 2),
    evaProfile: DEFAULT_ASTRONAUT_PROFILE,
    evaThresholds: DEFAULT_RESOURCE_THRESHOLDS,
    preDepartureElapsedHours: 0,
    rules: DEFAULT_TRAVERSAL_RULES,
  });

  const outSteps = routeAroundNull.strategies.shortest.outbound.waypoints;
  const retSteps = routeAroundNull.strategies.shortest.returnLeg.waypoints;
  assert.equal(routeAroundNull.strategies.shortest.outbound.found, true);
  assert.equal(routeAroundNull.strategies.shortest.returnLeg.found, true);

  // Neither leg may enter (0,1) nor take diagonal steps touching (0,1)'s corners ((0,0)->(1,1) or (1,1)->(0,2))
  for (const leg of [outSteps, retSteps]) {
    for (const wp of leg) {
      assert.notEqual(`${wp.row},${wp.col}`, '0,1', 'Route must never step on No Data cell');
    }
    for (let i = 1; i < leg.length; i += 1) {
      const dr = Math.abs(leg[i].row - leg[i - 1].row);
      const dc = Math.abs(leg[i].col - leg[i - 1].col);
      assert.ok(dr + dc <= 2);
      if (dr === 1 && dc === 1) {
        // Any diagonal taken must not have (0,1) as one of its orthogonal corner neighbors
        const cornerA = `${leg[i].row},${leg[i - 1].col}`;
        const cornerB = `${leg[i - 1].row},${leg[i].col}`;
        assert.notEqual(cornerA, '0,1', 'Diagonal step must not corner-cut No Data cell');
        assert.notEqual(cornerB, '0,1', 'Diagonal step must not corner-cut No Data cell');
      }
    }
  }
  // Specifically for (0,0) -> (0,2), valid shortest path must pass through (1,0) -> (1,1) -> (1,2) -> (0,2)
  assert.deepEqual(
    outSteps.map((w) => [w.row, w.col]),
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [1, 2],
      [0, 2],
    ]
  );

  // 4b: Endpoint landing on No Data returns INSUFFICIENT DATA
  const invalidEndpointRes = optimizeReturnMission({
    overlay: corridorWithNull,
    habitat: cellCoord(corridorWithNull, 0, 0),
    destination: cellCoord(corridorWithNull, 0, 1),
    evaProfile: DEFAULT_ASTRONAUT_PROFILE,
    evaThresholds: DEFAULT_RESOURCE_THRESHOLDS,
    preDepartureElapsedHours: 0,
    rules: DEFAULT_TRAVERSAL_RULES,
  });
  assert.equal(invalidEndpointRes.destinationValid, false);
  assert.equal(invalidEndpointRes.strategies.balanced.decision, 'INSUFFICIENT DATA');
});
