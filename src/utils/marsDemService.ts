import type {
  ElevationDatasetId,
  Pds4DatasetMetadata,
  TerrainOverlayCellInfo,
} from '../types/mars';
import {
  SYNTHETIC_TERRAIN_PRESETS,
  analyzeTerrainGrid,
  type SlopeThresholds,
  type TerrainGridAnalysis,
} from './terrainAnalyzer';

export interface ElevationDatasetMeta {
  id: ElevationDatasetId;
  name: string;
  shortName: string;
  dataSource: string;
  resolutionLabel: string;
  coverageLabel: string;
  projection: string;
  isAvailable: boolean;
  isSynthetic: boolean;
  unavailableReason?: string;
  description: string;
  pds4BundleLid?: string;
  pds4BundleVersion?: string;
  pds4Doi?: string;
  pds4CollectionUrl?: string;
}

export const ELEVATION_DATASETS: ElevationDatasetMeta[] = [
  {
    id: 'mola-pds4-meg128',
    name: 'NASA PDS4 MOLA MEGDR 128 ppd (463 m/px)',
    shortName: 'PDS4 MOLA 128 ppd',
    dataSource: 'NASA PDS4 MGS MOLA Bundle (WUSTL Geosciences Node)',
    resolutionLabel: '463.06 m/px (128 ppd)',
    coverageLabel: '88° S–88° N, 0°–360° E (16 Regional Tiles)',
    projection: 'IAU2000_MARS Equirectangular (Planetocentric, +East)',
    isAvailable: true,
    isSynthetic: false,
    description:
      'Authentic NASA PDS4 MGS MOLA Mission Experiment Gridded Data Record (meg128/megt*hb). SignedMSB2 integer meters relative to GMM3 areoid; latitudes beyond ±88° report No Data.',
    pds4BundleLid: 'urn:nasa:pds:mgs_mola_topography_derived',
    pds4BundleVersion: '1.0',
    pds4Doi: '10.17189/1z1b-kv84',
    pds4CollectionUrl:
      'https://pds-geosciences.wustl.edu/mgs/urn-nasa-pds-mgs_mola_topography_derived/meg128/',
  },
  {
    id: 'mola-pds4-meg064',
    name: 'NASA PDS4 MOLA MEGDR 64 ppd (926 m/px)',
    shortName: 'PDS4 MOLA 64 ppd',
    dataSource: 'NASA PDS4 MGS MOLA Bundle (WUSTL Geosciences Node)',
    resolutionLabel: '926.12 m/px (64 ppd)',
    coverageLabel: 'Global ±90° Lat, 0°–360° E (4 Quadrant Tiles)',
    projection: 'IAU2000_MARS Equirectangular (Planetocentric, +East)',
    isAvailable: true,
    isSynthetic: false,
    description:
      'Authentic NASA PDS4 MGS MOLA 64 ppd topography (meg064/megt*gb) with full polar coverage to ±90° latitude in SignedMSB2 meters relative to GMM3 areoid.',
    pds4BundleLid: 'urn:nasa:pds:mgs_mola_topography_derived',
    pds4BundleVersion: '1.0',
    pds4Doi: '10.17189/1z1b-kv84',
    pds4CollectionUrl:
      'https://pds-geosciences.wustl.edu/mgs/urn-nasa-pds-mgs_mola_topography_derived/meg064/',
  },
  {
    id: 'hrsc-mola-200m',
    name: 'MOLA + HRSC Blended DEM (200 m/px)',
    shortName: 'HRSC+MOLA DEM 200m',
    dataSource: 'NASA PDS / ESA Mars Express / USGS',
    resolutionLabel: '200 m/px',
    coverageLabel: 'Global (±90° Lat)',
    projection: 'Equirectangular (EPSG:104905)',
    isAvailable: false,
    isSynthetic: false,
    unavailableReason:
      'Raw 200 m/px blended GeoTIFF elevation grid is not hosted in the NASA PDS4 MOLA MEGDR bundle and lacks an available HTTP Range GeoTIFF endpoint.',
    description:
      'Higher-resolution blended DEM product; not included in the MOLA MEGDR PDS4 archive.',
  },
  {
    id: 'synthetic-test',
    name: 'Synthetic Testing Mode (Dev Matrix)',
    shortName: 'Synthetic Test Grid',
    dataSource: 'REDLINE Synthetic Verification Matrix',
    resolutionLabel: 'Region-fitted test cells',
    coverageLabel: 'Active Region Bounds (Synthetic Only)',
    projection: 'EPSG:4326 Testing Projection',
    isAvailable: true,
    isSynthetic: true,
    description:
      'Explicitly isolated synthetic elevation matrix containing steep slopes and intentional null gaps for testing risk classification—NOT real NASA Mars data.',
  },
];

export const ELEVATION_DATASET_BY_ID: Record<
  ElevationDatasetId,
  ElevationDatasetMeta
> = ELEVATION_DATASETS.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<ElevationDatasetId, ElevationDatasetMeta>
);

export interface SampledElevationPatch {
  dataset: ElevationDatasetMeta;
  bounds: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  elevationGrid: (number | null)[][];
  cellBoundsGrid: [number, number, number, number][][];
  cellCenterGrid: { lat: number; lon: number }[][];
  cellDistanceMeters: number;
  pds4Metadata?: Pds4DatasetMetadata;
}

const patchCache = new Map<string, SampledElevationPatch>();

function buildBoundsCacheKey(
  datasetId: ElevationDatasetId,
  bounds: [number, number, number, number],
  maxRows: number
): string {
  return `${datasetId}:${bounds.map((v) => v.toFixed(4)).join(',')}:r${maxRows}`;
}

/**
 * Fetches a geographically aligned elevation grid from the backend NASA PDS4 MOLA MEGDR
 * service (or isolated synthetic testing mode when explicitly selected).
 * Never fabricates real elevation data on failure.
 */
export async function fetchMarsElevationPatch(
  datasetId: ElevationDatasetId,
  rawBounds: [number, number, number, number],
  signal?: AbortSignal,
  maxRows = 32
): Promise<SampledElevationPatch> {
  const dataset = ELEVATION_DATASET_BY_ID[datasetId];
  if (!dataset) {
    throw new Error(`Unknown elevation dataset: ${datasetId}`);
  }
  if (!dataset.isAvailable) {
    throw new Error(
      dataset.unavailableReason ?? `${dataset.name} is currently unavailable.`
    );
  }

  const minLon = Math.max(-180, Math.min(180, rawBounds[0]));
  const minLat = Math.max(-90, Math.min(90, rawBounds[1]));
  const maxLon = Math.max(-180, Math.min(180, rawBounds[2]));
  const maxLat = Math.max(-90, Math.min(90, rawBounds[3]));

  if (maxLon <= minLon || maxLat <= minLat) {
    throw new Error('Invalid geographic bounding box for terrain sampling.');
  }

  const normalizedBounds: [number, number, number, number] = [
    Math.round(minLon * 10000) / 10000,
    Math.round(minLat * 10000) / 10000,
    Math.round(maxLon * 10000) / 10000,
    Math.round(maxLat * 10000) / 10000,
  ];
  const safeMaxRows = Math.max(16, Math.min(56, Math.round(maxRows)));
  const cacheKey = buildBoundsCacheKey(datasetId, normalizedBounds, safeMaxRows);
  const cached = patchCache.get(cacheKey);
  if (cached) return cached;

  // Explicit synthetic testing mode: fit synthetic test grid cleanly to region bounds
  if (datasetId === 'synthetic-test') {
    const preset = SYNTHETIC_TERRAIN_PRESETS[1];
    const rows = preset.grid.length;
    const cols = preset.grid[0].length;
    const dLat = (normalizedBounds[3] - normalizedBounds[1]) / rows;
    const dLon = (normalizedBounds[2] - normalizedBounds[0]) / cols;

    const cellBoundsGrid: [number, number, number, number][][] = [];
    const cellCenterGrid: { lat: number; lon: number }[][] = [];

    for (let r = 0; r < rows; r += 1) {
      const bRow: [number, number, number, number][] = [];
      const cRow: { lat: number; lon: number }[] = [];
      const cellLatMax = normalizedBounds[3] - r * dLat;
      const cellLatMin = cellLatMax - dLat;
      for (let c = 0; c < cols; c += 1) {
        const cellLonMin = normalizedBounds[0] + c * dLon;
        const cellLonMax = cellLonMin + dLon;
        bRow.push([cellLonMin, cellLatMin, cellLonMax, cellLatMax]);
        cRow.push({
          lat: (cellLatMin + cellLatMax) / 2,
          lon: (cellLonMin + cellLonMax) / 2,
        });
      }
      cellBoundsGrid.push(bRow);
      cellCenterGrid.push(cRow);
    }

    const patch: SampledElevationPatch = {
      dataset,
      bounds: normalizedBounds,
      elevationGrid: preset.grid.map((r) => [...r]),
      cellBoundsGrid,
      cellCenterGrid,
      cellDistanceMeters: preset.cellDistanceMeters,
    };
    patchCache.set(cacheKey, patch);
    return patch;
  }

  // Real NASA PDS4 MOLA MEGDR acquisition via backend service
  const params = new URLSearchParams({
    dataset: datasetId,
    minLon: String(normalizedBounds[0]),
    minLat: String(normalizedBounds[1]),
    maxLon: String(normalizedBounds[2]),
    maxLat: String(normalizedBounds[3]),
    maxRows: String(safeMaxRows),
  });

  const res = await fetch(`/api/terrain/mola-grid?${params.toString()}`, {
    signal,
  });

  if (!res.ok) {
    let errDetail = `Backend PDS4 MOLA request failed (HTTP ${res.status})`;
    try {
      const errBody = (await res.json()) as { error?: string };
      if (errBody.error) errDetail = errBody.error;
    } catch {
      // Ignore JSON parse fallback
    }
    throw new Error(errDetail);
  }

  const payload = (await res.json()) as SampledElevationPatch;
  patchCache.set(cacheKey, payload);
  return payload;
}

export interface EvaluatedTerrainOverlay {
  patch: SampledElevationPatch;
  analysis: TerrainGridAnalysis;
  cells: TerrainOverlayCellInfo[];
}

/**
 * Connects the fetched NASA PDS4 Mars elevation patch directly to the pure terrainAnalyzer engine
 * and projects results into geographically aligned OpenLayers-ready cells.
 */
export function evaluateTerrainOverlay(
  patch: SampledElevationPatch,
  thresholds: SlopeThresholds
): EvaluatedTerrainOverlay {
  const analysis = analyzeTerrainGrid(patch.elevationGrid, {
    cellDistance: patch.cellDistanceMeters,
    cellDistanceUnit: 'meters',
    elevationUnit: 'meters',
    thresholds,
  });

  const pds4Version = patch.pds4Metadata
    ? `Bundle v${patch.pds4Metadata.bundleVersion} · Product v${patch.pds4Metadata.productVersion}`
    : undefined;
  const pds4ProductLids = patch.pds4Metadata?.productLids;

  const cells: TerrainOverlayCellInfo[] = [];
  for (let r = 0; r < analysis.cells.length; r += 1) {
    for (let c = 0; c < analysis.cells[r].length; c += 1) {
      const cell = analysis.cells[r][c];
      const bounds = patch.cellBoundsGrid[r][c];
      const center = patch.cellCenterGrid[r][c];
      cells.push({
        row: cell.row,
        col: cell.col,
        lat: center.lat,
        lon: center.lon,
        bounds,
        rawElevation: cell.rawElevation,
        elevationMeters: cell.elevationMeters,
        slopeDegrees: cell.slopeDegrees,
        slopePercent: cell.slopePercent,
        difficultyClass: cell.difficultyClass,
        difficultyLabel: cell.difficultyLabel,
        isValid: cell.isValid,
        hasValidElevation: cell.hasValidElevation,
        method: cell.method,
        datasetName: patch.dataset.name,
        dataSource: patch.dataset.dataSource,
        coverageLabel: patch.dataset.coverageLabel,
        isSynthetic: patch.dataset.isSynthetic,
        pds4Version,
        pds4ProductLids,
      });
    }
  }

  return { patch, analysis, cells };
}
