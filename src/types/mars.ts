export type MapLayerId =
  | 'orbital'
  | 'elevation'
  | 'hillshade'
  | 'geology'
  | 'terrain';

export type NavSectionId =
  | 'overview'
  | 'explorer'
  | 'eva-resources'
  | 'terrain-analysis'
  | 'route-planning'
  | 'science-locations'
  | 'mission-data'
  | 'settings';

export type CoordinateFormat = 'hemisphere' | 'decimal' | 'east360';

export type ScaleUnit = 'metric' | 'miles';

export type TileHealthState = 'idle' | 'loading' | 'available' | 'degraded';

export type MarkerCategory =
  | 'astronaut'
  | 'habitat'
  | 'rover'
  | 'science'
  | 'custom';

export type FilterableMarkerCategory = Exclude<MarkerCategory, 'custom'>;

export interface MarsLayerConfig {
  id: MapLayerId;
  name: string;
  shortName: string;
  datasetTitle: string;
  instrument: string;
  resolutionLabel: string;
  dataSource: string;
  projection: string;
  coverageLabel: string;
  sourceType: 'xyz' | 'wms';
  urlTemplate?: string;
  wmsUrl?: string;
  wmsLayers?: string;
  wmsFormat?: string;
  extent: [number, number, number, number];
  tileSize: 256 | 512;
  minZoom: number;
  maxZoom: number;
  z0Resolution: number;
  description: string;
}

export interface MarsLocation {
  id: string;
  name: string;
  region: string;
  category: MarkerCategory;
  isSampleData: boolean;
  lat: number;
  lon: number;
  elevation: string;
  terrainClassification: string;
  dataSource: string;
  observationStatus: string;
  description: string;
  isReferenceSite: boolean;
  recommendedZoom?: number;
}

export interface ExplorationRegion {
  id: string;
  name: string;
  quadrangle: string;
  centerLat: number;
  centerLon: number;
  bounds: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  recommendedZoom: number;
  description: string;
}

export type ElevationDatasetId =
  | 'mola-pds4-meg128'
  | 'mola-pds4-meg064'
  | 'hrsc-mola-200m'
  | 'synthetic-test';

export type TerrainAnalysisScope = 'region' | 'viewport';

export interface Pds4DatasetMetadata {
  bundleLid: string;
  bundleVersion: string;
  doi: string;
  productVersion: string;
  productLids: string[];
  productFiles: string[];
  creationDateTime: string;
  modificationDate: string;
  coordinateSystem: string;
  projection: string;
  marsRadiusKm: number;
  verticalDatum: string;
  rasterFormat: string;
  pixelScalePpd: number;
  pixelResolutionMeters: number;
  cacheStatus: 'hit' | 'miss';
  bytesTransferred: number;
  sampledCells: number;
  noDataCells: number;
}

export interface TerrainOverlayCellInfo {
  row: number;
  col: number;
  lat: number;
  lon: number;
  bounds: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  rawElevation: number | null;
  elevationMeters: number | null;
  slopeDegrees: number | null;
  slopePercent: number | null;
  difficultyClass: 0 | 1 | 2 | 3 | null;
  difficultyLabel: 'Easy' | 'Moderate' | 'Difficult' | 'Very Difficult' | 'Invalid';
  isValid: boolean;
  hasValidElevation: boolean;
  method: string;
  datasetName: string;
  dataSource: string;
  coverageLabel: string;
  isSynthetic: boolean;
  pds4Version?: string;
  pds4ProductLids?: string[];
}

export interface ExplorerSettings {
  coordinateFormat: CoordinateFormat;
  showGraticule: boolean;
  showReferenceSites: boolean;
  showRegionBounds: boolean;
  markerFilters: Record<FilterableMarkerCategory, boolean>;
  layerOpacity: number;
  scaleUnit: ScaleUnit;
}

