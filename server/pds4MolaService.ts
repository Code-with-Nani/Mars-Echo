import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  ElevationDatasetId,
  Pds4DatasetMetadata,
} from '../src/types/mars.ts';

export const PDS4_BUNDLE_BASE_URL =
  'https://pds-geosciences.wustl.edu/mgs/urn-nasa-pds-mgs_mola_topography_derived';
export const PDS4_BUNDLE_LID = 'urn:nasa:pds:mgs_mola_topography_derived';
export const PDS4_BUNDLE_VERSION = '1.0';
export const PDS4_BUNDLE_DOI = '10.17189/1z1b-kv84';

const CACHE_ROOT = path.resolve(process.cwd(), '.cache', 'pds4-mola');
const LABEL_CACHE_DIR = path.join(CACHE_ROOT, 'labels');
const PATCH_CACHE_DIR = path.join(CACHE_ROOT, 'patches');

const REQUEST_TIMEOUT_MS = 20000;
const DEFAULT_TARGET_MAX_ROWS = 32;
const RANGE_CONCURRENCY = 6;

export interface ServerElevationDatasetInfo {
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

export const SERVER_ELEVATION_DATASETS: ServerElevationDatasetInfo[] = [
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
    pds4BundleLid: PDS4_BUNDLE_LID,
    pds4BundleVersion: PDS4_BUNDLE_VERSION,
    pds4Doi: PDS4_BUNDLE_DOI,
    pds4CollectionUrl: `${PDS4_BUNDLE_BASE_URL}/meg128/`,
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
    pds4BundleLid: PDS4_BUNDLE_LID,
    pds4BundleVersion: PDS4_BUNDLE_VERSION,
    pds4Doi: PDS4_BUNDLE_DOI,
    pds4CollectionUrl: `${PDS4_BUNDLE_BASE_URL}/meg064/`,
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
      'Explicitly isolated synthetic elevation matrix for deterministic slope & missing-data verification—NOT real NASA Mars data.',
  },
];

interface Pds4TileDescriptor {
  productId: string;
  collection: 'meg128' | 'meg064';
  southLat: number;
  northLat: number;
  westLonEast: number;
  eastLonEast: number;
  imgUrl: string;
  xmlUrl: string;
}

interface ParsedPds4TileLabel {
  productId: string;
  logicalIdentifier: string;
  versionId: string;
  creationDateTime: string;
  modificationDate: string;
  westLonEast: number;
  eastLonEast: number;
  northLat: number;
  southLat: number;
  projectionName: string;
  centralMeridianDeg: number;
  pixelResolutionKm: number;
  pixelScalePpd: number;
  marsRadiusKm: number;
  latitudeType: string;
  longitudeDirection: string;
  referenceFrame: string;
  dataType: string;
  unit: string;
  lines: number;
  samples: number;
  bytesOffset: number;
}

export interface ServerMolaGridResponse {
  dataset: ServerElevationDatasetInfo;
  bounds: [number, number, number, number];
  elevationGrid: (number | null)[][];
  cellBoundsGrid: [number, number, number, number][][];
  cellCenterGrid: { lat: number; lon: number }[][];
  cellDistanceMeters: number;
  pds4Metadata: Pds4DatasetMetadata;
}

const MEG128_TILES: Pds4TileDescriptor[] = (() => {
  const latBands = [
    { prefix: '88n', south: 44, north: 88 },
    { prefix: '44n', south: 0, north: 44 },
    { prefix: '00n', south: -44, north: 0 },
    { prefix: '44s', south: -88, north: -44 },
  ];
  const lonBands = [
    { code: '000', west: 0, east: 90 },
    { code: '090', west: 90, east: 180 },
    { code: '180', west: 180, east: 270 },
    { code: '270', west: 270, east: 360 },
  ];
  const tiles: Pds4TileDescriptor[] = [];
  for (const latB of latBands) {
    for (const lonB of lonBands) {
      const productId = `megt${latB.prefix}${lonB.code}hb`;
      tiles.push({
        productId,
        collection: 'meg128',
        southLat: latB.south,
        northLat: latB.north,
        westLonEast: lonB.west,
        eastLonEast: lonB.east,
        imgUrl: `${PDS4_BUNDLE_BASE_URL}/meg128/${productId}.img`,
        xmlUrl: `${PDS4_BUNDLE_BASE_URL}/meg128/${productId}.xml`,
      });
    }
  }
  return tiles;
})();

const MEG064_TILES: Pds4TileDescriptor[] = (() => {
  const latBands = [
    { prefix: '90n', south: 0, north: 90 },
    { prefix: '00n', south: -90, north: 0 },
  ];
  const lonBands = [
    { code: '000', west: 0, east: 180 },
    { code: '180', west: 180, east: 360 },
  ];
  const tiles: Pds4TileDescriptor[] = [];
  for (const latB of latBands) {
    for (const lonB of lonBands) {
      const productId = `megt${latB.prefix}${lonB.code}gb`;
      tiles.push({
        productId,
        collection: 'meg064',
        southLat: latB.south,
        northLat: latB.north,
        westLonEast: lonB.west,
        eastLonEast: lonB.east,
        imgUrl: `${PDS4_BUNDLE_BASE_URL}/meg064/${productId}.img`,
        xmlUrl: `${PDS4_BUNDLE_BASE_URL}/meg064/${productId}.xml`,
      });
    }
  }
  return tiles;
})();

const labelMemoryCache = new Map<string, ParsedPds4TileLabel>();
const labelInFlight = new Map<string, Promise<ParsedPds4TileLabel>>();
const patchMemoryCache = new Map<string, ServerMolaGridResponse>();

function extractXmlTag(xml: string, tagName: string): string | null {
  const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = xml.match(
    new RegExp(`<${escaped}(?:\\s[^>]*)?>\\s*([^<]+?)\\s*</${escaped}>`, 'i')
  );
  return match ? match[1].trim() : null;
}

function extractLastXmlTag(xml: string, tagName: string): string | null {
  const escaped = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `<${escaped}(?:\\s[^>]*)?>\\s*([^<]+?)\\s*</${escaped}>`,
    'gi'
  );
  let last: string | null = null;
  let m: RegExpExecArray | null = re.exec(xml);
  while (m) {
    last = m[1].trim();
    m = re.exec(xml);
  }
  return last;
}

function extractAxisElements(xml: string, axisName: 'Line' | 'Sample'): number {
  const re = new RegExp(
    `<Axis_Array>\\s*<axis_name>${axisName}</axis_name>\\s*<elements>(\\d+)</elements>`,
    'i'
  );
  const match = xml.match(re);
  if (!match) {
    throw new Error(`PDS4 XML missing ${axisName} axis elements`);
  }
  return Number(match[1]);
}

function parsePds4TileXml(productId: string, xml: string): ParsedPds4TileLabel {
  const logicalIdentifier = extractXmlTag(xml, 'logical_identifier') ?? '';
  const idAreaMatch = xml.match(/<Identification_Area>[\s\S]*?<\/Identification_Area>/i);
  const idArea = idAreaMatch ? idAreaMatch[0] : xml;
  const versionId = extractXmlTag(idArea, 'version_id') ?? '1.0';
  const modificationDate = extractLastXmlTag(idArea, 'modification_date') ?? '';
  const creationDateTime = extractXmlTag(xml, 'creation_date_time') ?? '';

  const westLonEast = Number(extractXmlTag(xml, 'cart:west_bounding_coordinate'));
  const eastLonEast = Number(extractXmlTag(xml, 'cart:east_bounding_coordinate'));
  const northLat = Number(extractXmlTag(xml, 'cart:north_bounding_coordinate'));
  const southLat = Number(extractXmlTag(xml, 'cart:south_bounding_coordinate'));

  const projectionName =
    extractXmlTag(xml, 'cart:map_projection_name') ?? 'Equirectangular';
  const centralMeridianDeg = Number(
    extractXmlTag(xml, 'cart:longitude_of_central_meridian') ?? '180'
  );
  const pixelResolutionKm = Number(extractXmlTag(xml, 'cart:pixel_resolution_x'));
  const pixelScalePpd = Number(extractXmlTag(xml, 'cart:pixel_scale_x'));
  const marsRadiusKm = Number(extractXmlTag(xml, 'cart:a_axis_radius') ?? '3396');
  const latitudeType =
    extractXmlTag(xml, 'cart:latitude_type') ?? 'Planetocentric';
  const longitudeDirection =
    extractXmlTag(xml, 'cart:longitude_direction') ?? 'Positive East';

  const refFrameSection = xml.match(
    /<geom:Reference_Frame_Identification>[\s\S]*?<\/geom:Reference_Frame_Identification>/i
  );
  const referenceFrame =
    (refFrameSection ? extractXmlTag(refFrameSection[0], 'geom:name') : null) ??
    'IAU2000_MARS';

  const dataType = extractXmlTag(xml, 'data_type') ?? '';
  const unit = extractXmlTag(xml, 'unit') ?? '';
  const lines = extractAxisElements(xml, 'Line');
  const samples = extractAxisElements(xml, 'Sample');

  const arraySection = xml.match(/<Array_2D_Image>[\s\S]*?<\/Array_2D_Image>/i);
  const bytesOffset = Number(
    (arraySection ? extractXmlTag(arraySection[0], 'offset') : null) ?? '0'
  );

  if (
    !logicalIdentifier ||
    !Number.isFinite(westLonEast) ||
    !Number.isFinite(eastLonEast) ||
    !Number.isFinite(northLat) ||
    !Number.isFinite(southLat) ||
    !Number.isFinite(pixelScalePpd) ||
    !Number.isFinite(pixelResolutionKm)
  ) {
    throw new Error(`Incomplete PDS4 cartography metadata in ${productId}.xml`);
  }
  if (dataType !== 'SignedMSB2') {
    throw new Error(
      `Unsupported PDS4 sample data_type "${dataType}" in ${productId}.xml (expected SignedMSB2)`
    );
  }
  if (unit !== 'meter') {
    throw new Error(
      `Unsupported elevation unit "${unit}" in ${productId}.xml (expected meter)`
    );
  }
  if (longitudeDirection !== 'Positive East') {
    throw new Error(
      `Unsupported longitude direction "${longitudeDirection}" in ${productId}.xml`
    );
  }

  return {
    productId,
    logicalIdentifier,
    versionId,
    creationDateTime,
    modificationDate,
    westLonEast,
    eastLonEast,
    northLat,
    southLat,
    projectionName,
    centralMeridianDeg,
    pixelResolutionKm,
    pixelScalePpd,
    marsRadiusKm,
    latitudeType,
    longitudeDirection,
    referenceFrame,
    dataType,
    unit,
    lines,
    samples,
    bytesOffset,
  };
}

async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      headers: {
        'User-Agent': 'REDLINE-Mars-Explorer/1.0 (NASA-PDS4-MOLA-Reader)',
        ...(init.headers ?? {}),
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function getPds4TileLabel(
  tile: Pds4TileDescriptor
): Promise<{ label: ParsedPds4TileLabel; bytesTransferred: number }> {
  const mem = labelMemoryCache.get(tile.productId);
  if (mem) {
    return { label: mem, bytesTransferred: 0 };
  }

  const diskPath = path.join(LABEL_CACHE_DIR, `${tile.productId}.json`);
  try {
    const raw = await fs.readFile(diskPath, 'utf8');
    const parsed = JSON.parse(raw) as ParsedPds4TileLabel;
    labelMemoryCache.set(tile.productId, parsed);
    return { label: parsed, bytesTransferred: 0 };
  } catch {
    // Cache miss — fetch official PDS4 XML label
  }

  let promise = labelInFlight.get(tile.productId);
  let bytesTransferred = 0;
  if (!promise) {
    promise = (async () => {
      const res = await fetchWithTimeout(tile.xmlUrl);
      if (!res.ok) {
        throw new Error(
          `NASA PDS4 XML label fetch failed for ${tile.productId}.xml (HTTP ${res.status})`
        );
      }
      const xmlText = await res.text();
      bytesTransferred = Buffer.byteLength(xmlText, 'utf8');
      const parsed = parsePds4TileXml(tile.productId, xmlText);
      labelMemoryCache.set(tile.productId, parsed);
      try {
        await ensureDir(LABEL_CACHE_DIR);
        await fs.writeFile(diskPath, JSON.stringify(parsed, null, 2), 'utf8');
      } catch {
        // Non-fatal if filesystem cache cannot be written
      }
      return parsed;
    })();
    labelInFlight.set(tile.productId, promise);
  }

  try {
    const label = await promise;
    return { label, bytesTransferred };
  } finally {
    labelInFlight.delete(tile.productId);
  }
}

function findTileForCoord(
  tiles: Pds4TileDescriptor[],
  lat: number,
  lonEast360: number
): Pds4TileDescriptor | null {
  const wrappedLon = ((lonEast360 % 360) + 360) % 360;
  for (const tile of tiles) {
    const latMatches =
      lat <= tile.northLat &&
      (lat > tile.southLat || (tile.southLat === -88 && lat === -88) || (tile.southLat === -90 && lat === -90));
    const lonMatches = wrappedLon >= tile.westLonEast && wrappedLon < tile.eastLonEast;
    if (latMatches && lonMatches) {
      return tile;
    }
  }
  return null;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, idx: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIdx = 0;
  const runWorker = async () => {
    while (nextIdx < items.length) {
      const idx = nextIdx;
      nextIdx += 1;
      results[idx] = await worker(items[idx], idx);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, Math.max(1, items.length)) }, runWorker)
  );
  return results;
}

interface RowRangeTask {
  rowIdx: number;
  tile: Pds4TileDescriptor;
  label: ParsedPds4TileLabel;
  tileRow: number;
  minTileCol: number;
  maxTileCol: number;
  colBindings: Array<{ gridColIdx: number; tileCol: number }>;
}

export async function fetchPds4MolaElevationPatch(
  datasetId: 'mola-pds4-meg128' | 'mola-pds4-meg064',
  rawBounds: [number, number, number, number],
  requestedMaxRows = DEFAULT_TARGET_MAX_ROWS
): Promise<ServerMolaGridResponse> {
  const dataset = SERVER_ELEVATION_DATASETS.find((d) => d.id === datasetId);
  if (!dataset) {
    throw new Error(`Unknown PDS4 MOLA dataset: ${datasetId}`);
  }

  const targetMaxRows = Math.max(
    16,
    Math.min(56, Math.round(Number.isFinite(requestedMaxRows) ? requestedMaxRows : DEFAULT_TARGET_MAX_ROWS))
  );

  const minLon = Math.max(-180, Math.min(180, rawBounds[0]));
  const minLat = Math.max(-90, Math.min(90, rawBounds[1]));
  const maxLon = Math.max(-180, Math.min(180, rawBounds[2]));
  const maxLat = Math.max(-90, Math.min(90, rawBounds[3]));

  if (
    !Number.isFinite(minLon) ||
    !Number.isFinite(minLat) ||
    !Number.isFinite(maxLon) ||
    !Number.isFinite(maxLat) ||
    maxLon <= minLon ||
    maxLat <= minLat
  ) {
    throw new Error('Invalid geographic bounding box for PDS4 terrain sampling.');
  }

  const normalizedBounds: [number, number, number, number] = [
    Math.round(minLon * 10000) / 10000,
    Math.round(minLat * 10000) / 10000,
    Math.round(maxLon * 10000) / 10000,
    Math.round(maxLat * 10000) / 10000,
  ];
  const cacheKey = `${datasetId}:${normalizedBounds.join(',')}:r${targetMaxRows}`;

  const memCached = patchMemoryCache.get(cacheKey);
  if (memCached) {
    return {
      ...memCached,
      pds4Metadata: {
        ...memCached.pds4Metadata,
        cacheStatus: 'hit',
        bytesTransferred: 0,
      },
    };
  }

  const diskCacheFile = path.join(
    PATCH_CACHE_DIR,
    `${cacheKey.replace(/[^a-zA-Z0-9._-]/g, '_')}.json`
  );
  try {
    const rawCached = await fs.readFile(diskCacheFile, 'utf8');
    const parsedCached = JSON.parse(rawCached) as ServerMolaGridResponse;
    patchMemoryCache.set(cacheKey, parsedCached);
    return {
      ...parsedCached,
      pds4Metadata: {
        ...parsedCached.pds4Metadata,
        cacheStatus: 'hit',
        bytesTransferred: 0,
      },
    };
  } catch {
    // Disk cache miss — proceed to acquire range slices from NASA PDS4 archive
  }

  const ppd = datasetId === 'mola-pds4-meg128' ? 128 : 64;
  const tiles = datasetId === 'mola-pds4-meg128' ? MEG128_TILES : MEG064_TILES;

  const globalRowStart = Math.max(
    0,
    Math.min(180 * ppd - 1, Math.floor((90 - maxLat) * ppd))
  );
  const globalRowEnd = Math.max(
    globalRowStart,
    Math.min(180 * ppd - 1, Math.floor((90 - minLat) * ppd))
  );
  const globalColStart = Math.max(
    0,
    Math.min(360 * ppd - 1, Math.floor((minLon + 180) * ppd))
  );
  const globalColEnd = Math.max(
    globalColStart,
    Math.min(360 * ppd - 1, Math.floor((maxLon + 180) * ppd))
  );

  const rowSpanPx = globalRowEnd - globalRowStart + 1;
  const rowStride = Math.max(1, Math.ceil(rowSpanPx / targetMaxRows));

  const centerLatRad = (((minLat + maxLat) / 2) * Math.PI) / 180;
  const cosLat = Math.max(0.25, Math.cos(centerLatRad));
  const colStride = Math.max(1, Math.round(rowStride / cosLat));

  const sampledGlobalRows: number[] = [];
  for (let r = globalRowStart; r <= globalRowEnd; r += rowStride) {
    sampledGlobalRows.push(r);
  }
  const sampledGlobalCols: number[] = [];
  for (let c = globalColStart; c <= globalColEnd; c += colStride) {
    sampledGlobalCols.push(c);
  }

  if (sampledGlobalRows.length < 2 || sampledGlobalCols.length < 2) {
    throw new Error(
      'Selected region is too small for multi-cell slope sampling at this resolution.'
    );
  }

  // Determine all intersecting PDS4 tiles and fetch/parse their official XML labels
  const candidateTileMap = new Map<string, Pds4TileDescriptor>();
  const rowLats = sampledGlobalRows.map((gr) => 90 - (gr + 0.5) / ppd);
  const colLonsMap = sampledGlobalCols.map((gc) => -180 + (gc + 0.5) / ppd);
  const colLonsEast360 = colLonsMap.map((lon) => ((lon % 360) + 360) % 360);

  for (const lat of rowLats) {
    for (const lonE of colLonsEast360) {
      const tile = findTileForCoord(tiles, lat, lonE);
      if (tile) {
        candidateTileMap.set(tile.productId, tile);
      }
    }
  }

  let totalBytesTransferred = 0;
  const tileLabels = new Map<string, ParsedPds4TileLabel>();

  if (candidateTileMap.size > 0) {
    const labelResults = await Promise.all(
      Array.from(candidateTileMap.values()).map(async (tile) => {
        const res = await getPds4TileLabel(tile);
        return { tile, ...res };
      })
    );
    for (const item of labelResults) {
      tileLabels.set(item.tile.productId, item.label);
      totalBytesTransferred += item.bytesTransferred;
    }
  }

  // Build compact HTTP Range scanline tasks grouped by (rowIdx, tile)
  const elevationGrid: (number | null)[][] = Array.from(
    { length: rowLats.length },
    () => new Array<number | null>(colLonsMap.length).fill(null)
  );
  const cellBoundsGrid: [number, number, number, number][][] = [];
  const cellCenterGrid: { lat: number; lon: number }[][] = [];

  const halfRowDeg = rowStride / (2 * ppd);
  const halfColDeg = colStride / (2 * ppd);

  const rangeTasks: RowRangeTask[] = [];

  for (let rIdx = 0; rIdx < rowLats.length; rIdx += 1) {
    const lat = rowLats[rIdx];
    const boundsRow: [number, number, number, number][] = [];
    const centerRow: { lat: number; lon: number }[] = [];

    const tasksByTileId = new Map<string, RowRangeTask>();

    for (let cIdx = 0; cIdx < colLonsMap.length; cIdx += 1) {
      const lonMap = colLonsMap[cIdx];
      const lonE = colLonsEast360[cIdx];
      boundsRow.push([
        Math.max(-180, lonMap - halfColDeg),
        Math.max(-90, lat - halfRowDeg),
        Math.min(180, lonMap + halfColDeg),
        Math.min(90, lat + halfRowDeg),
      ]);
      centerRow.push({ lat, lon: lonMap });

      const tile = findTileForCoord(tiles, lat, lonE);
      if (!tile) continue;
      const label = tileLabels.get(tile.productId);
      if (!label) continue;

      const tileRow = Math.max(
        0,
        Math.min(
          label.lines - 1,
          Math.floor((label.northLat - lat) * label.pixelScalePpd)
        )
      );
      const tileCol = Math.max(
        0,
        Math.min(
          label.samples - 1,
          Math.floor((lonE - label.westLonEast) * label.pixelScalePpd)
        )
      );

      let task = tasksByTileId.get(tile.productId);
      if (!task) {
        task = {
          rowIdx: rIdx,
          tile,
          label,
          tileRow,
          minTileCol: tileCol,
          maxTileCol: tileCol,
          colBindings: [],
        };
        tasksByTileId.set(tile.productId, task);
      } else {
        task.minTileCol = Math.min(task.minTileCol, tileCol);
        task.maxTileCol = Math.max(task.maxTileCol, tileCol);
      }
      task.colBindings.push({ gridColIdx: cIdx, tileCol });
    }

    cellBoundsGrid.push(boundsRow);
    cellCenterGrid.push(centerRow);

    for (const task of tasksByTileId.values()) {
      rangeTasks.push(task);
    }
  }

  // Execute HTTP Range byte reads against official PDS4 .img files
  await mapWithConcurrency(rangeTasks, RANGE_CONCURRENCY, async (task) => {
    const startByte =
      task.label.bytesOffset +
      (task.tileRow * task.label.samples + task.minTileCol) * 2;
    const endByte =
      task.label.bytesOffset +
      (task.tileRow * task.label.samples + task.maxTileCol) * 2 +
      1;
    const expectedLen = endByte - startByte + 1;

    const res = await fetchWithTimeout(task.tile.imgUrl, {
      headers: { Range: `bytes=${startByte}-${endByte}` },
    });
    if (!res.ok && res.status !== 206) {
      throw new Error(
        `NASA PDS4 raster range fetch failed for ${task.tile.productId}.img (HTTP ${res.status})`
      );
    }

    const buf = Buffer.from(await res.arrayBuffer());
    totalBytesTransferred += buf.byteLength;

    if (buf.byteLength < expectedLen) {
      throw new Error(
        `Truncated PDS4 raster response for ${task.tile.productId}.img (${buf.byteLength} < ${expectedLen} bytes)`
      );
    }

    for (const binding of task.colBindings) {
      const relOffset = (binding.tileCol - task.minTileCol) * 2;
      // PDS4 label specifies SignedMSB2 (Big-Endian signed 16-bit integer, meters)
      const val = buf.readInt16BE(relOffset);
      // Treat Int16 sentinel or unphysical extremes as No Data (null)
      if (val === -32768 || val < -12000 || val > 25000) {
        elevationGrid[task.rowIdx][binding.gridColIdx] = null;
      } else {
        elevationGrid[task.rowIdx][binding.gridColIdx] = val;
      }
    }
  });

  const referenceLabel =
    tileLabels.values().next().value ??
    (await getPds4TileLabel(tiles[0])).label;

  const pixelResMeters = referenceLabel.pixelResolutionKm * 1000;
  const cellDistanceMeters = Math.round(rowStride * pixelResMeters * 100) / 100;

  let sampledCells = 0;
  let noDataCells = 0;
  for (const row of elevationGrid) {
    for (const cell of row) {
      sampledCells += 1;
      if (cell === null) noDataCells += 1;
    }
  }

  const labelsList = Array.from(tileLabels.values());
  const pds4Metadata: Pds4DatasetMetadata = {
    bundleLid: PDS4_BUNDLE_LID,
    bundleVersion: PDS4_BUNDLE_VERSION,
    doi: PDS4_BUNDLE_DOI,
    productVersion: referenceLabel.versionId,
    productLids: labelsList.map((l) => l.logicalIdentifier),
    productFiles: labelsList.map((l) => `${l.productId}.img`),
    creationDateTime: referenceLabel.creationDateTime,
    modificationDate: referenceLabel.modificationDate,
    coordinateSystem: `${referenceLabel.referenceFrame} · ${referenceLabel.latitudeType} · ${referenceLabel.longitudeDirection} (0°–360° E)`,
    projection: `${referenceLabel.projectionName} (Central Meridian ${referenceLabel.centralMeridianDeg}° E)`,
    marsRadiusKm: referenceLabel.marsRadiusKm,
    verticalDatum: 'GMM3 (mgm1025) Areoid, degree/order 50',
    rasterFormat: `${referenceLabel.dataType} (16-bit Big-Endian Int, ${referenceLabel.unit})`,
    pixelScalePpd: referenceLabel.pixelScalePpd,
    pixelResolutionMeters: Math.round(pixelResMeters * 100) / 100,
    cacheStatus: 'miss',
    bytesTransferred: totalBytesTransferred,
    sampledCells,
    noDataCells,
  };

  const responsePayload: ServerMolaGridResponse = {
    dataset,
    bounds: normalizedBounds,
    elevationGrid,
    cellBoundsGrid,
    cellCenterGrid,
    cellDistanceMeters,
    pds4Metadata,
  };

  patchMemoryCache.set(cacheKey, responsePayload);
  try {
    await ensureDir(PATCH_CACHE_DIR);
    await fs.writeFile(diskCacheFile, JSON.stringify(responsePayload), 'utf8');
  } catch {
    // Non-fatal if filesystem cache cannot be written
  }

  return responsePayload;
}
