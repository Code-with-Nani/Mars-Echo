import type { MarsLayerConfig } from '../types/mars';

/**
 * Modular registry of Martian planetary map layers.
 * All layers use Equirectangular Planetocentric projection (EPSG:104905 / EPSG:4326)
 * with [-180, 90] origin and 2:1 global tile matrix aspect ratio.
 */
export const MARS_MAP_LAYERS: MarsLayerConfig[] = [
  {
    id: 'orbital',
    name: 'Orbital Imagery',
    shortName: 'Orbital Imagery',
    datasetTitle: 'Viking MDIM 2.1 Colorized Global Mosaic',
    instrument: 'Viking Orbiter VIS',
    resolutionLabel: '232 m/px',
    dataSource: 'NASA Mars Trek WMTS',
    projection: 'Equirectangular (EPSG:104905)',
    coverageLabel: 'Global (±90° Lat · 232 m/px)',
    sourceType: 'xyz',
    urlTemplate:
      'https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg',
    extent: [-180, -90, 180, 90],
    tileSize: 256,
    minZoom: 0,
    maxZoom: 7,
    z0Resolution: 0.703125,
    description:
      'Natural-color global surface mosaic compiled from NASA Viking Orbiter imagery geometrically controlled to MDIM 2.1.',
  },
  {
    id: 'elevation',
    name: 'Elevation / Topography',
    shortName: 'Elevation',
    datasetTitle: 'MGS MOLA Color Shaded Relief',
    instrument: 'Mars Global Surveyor MOLA',
    resolutionLabel: '463 m/px',
    dataSource: 'NASA Mars Trek WMTS',
    projection: 'Equirectangular (EPSG:104905)',
    coverageLabel: 'Global (±90° Lat · 463 m/px)',
    sourceType: 'xyz',
    urlTemplate:
      'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg',
    extent: [-180, -90, 180, 90],
    tileSize: 256,
    minZoom: 0,
    maxZoom: 7,
    z0Resolution: 0.703125,
    description:
      'Color-coded global altimetry and shaded relief derived from Mars Orbiter Laser Altimeter (MOLA) elevation measurements.',
  },
  {
    id: 'hillshade',
    name: 'Hillshade',
    shortName: 'Hillshade',
    datasetTitle: 'MOLA + HRSC Blended Shaded Relief',
    instrument: 'MOLA & Mars Express HRSC',
    resolutionLabel: '200 m/px',
    dataSource: 'NASA Mars Trek WMTS',
    projection: 'Equirectangular (EPSG:104905)',
    coverageLabel: 'Global (±90° Lat · 200 m/px)',
    sourceType: 'xyz',
    urlTemplate:
      'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MOLA_blend200ppx_HRSC_Shade_clon0dd_200mpp_lzw/1.0.0/default/default028mm/{z}/{y}/{x}.jpg',
    extent: [-180, -90, 180, 90],
    tileSize: 256,
    minZoom: 0,
    maxZoom: 8,
    z0Resolution: 0.703125,
    description:
      'Blended grayscale topographic hillshade combining MGS MOLA laser altimetry with ESA Mars Express HRSC stereo terrain relief.',
  },
  {
    id: 'geology',
    name: 'Geological Observations',
    shortName: 'THEMIS Geology',
    datasetTitle: 'Mars Odyssey THEMIS IR Day 100m Controlled Mosaic',
    instrument: 'Mars Odyssey THEMIS IR',
    resolutionLabel: '100 m/px',
    dataSource: 'NASA Mars Odyssey / USGS Astrogeology WMS',
    projection: 'Equirectangular (EPSG:4326)',
    coverageLabel: 'Near-Global (65° S – 65° N · 100 m/px)',
    sourceType: 'wms',
    wmsUrl:
      'https://planetarymaps.usgs.gov/cgi-bin/mapserv?map=/maps/mars/mars_simp_cyl.map',
    wmsLayers: 'THEMIS_controlled',
    wmsFormat: 'image/jpeg',
    extent: [-180, -65, 180, 65],
    tileSize: 256,
    minZoom: 0,
    maxZoom: 11,
    z0Resolution: 0.703125,
    description:
      'Controlled daytime thermal-infrared mosaic from NASA Mars Odyssey THEMIS revealing bedrock exposures, dust cover, and surface geological units between 65° S and 65° N.',
  },
  {
    id: 'terrain',
    name: 'High-Res Terrain (CTX)',
    shortName: 'Terrain (CTX)',
    datasetTitle: 'MRO CTX Global Mosaic (Caltech Beta 01)',
    instrument: 'Mars Reconnaissance Orbiter CTX',
    resolutionLabel: '5 m/px',
    dataSource: 'NASA Mars Trek / Caltech / USGS',
    projection: 'Equirectangular (EPSG:104905)',
    coverageLabel: 'Near-Global Mosaic (5 m/px)',
    sourceType: 'xyz',
    urlTemplate:
      'https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer/tile/{z}/{y}/{x}',
    extent: [-180, -90, 180, 90],
    tileSize: 512,
    minZoom: 0,
    maxZoom: 11,
    z0Resolution: 0.3515625,
    description:
      'High-resolution monochrome terrain imagery from the MRO Context Camera revealing crater walls, channels, and delta morphology.',
  },
];

export const MARS_LAYER_BY_ID: Record<MarsLayerConfig['id'], MarsLayerConfig> =
  MARS_MAP_LAYERS.reduce(
    (acc, layer) => {
      acc[layer.id] = layer;
      return acc;
    },
    {} as Record<MarsLayerConfig['id'], MarsLayerConfig>
  );
