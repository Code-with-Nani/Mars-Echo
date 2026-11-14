import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import 'ol/ol.css';
import OlMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import Graticule from 'ol/layer/Graticule';
import XYZ from 'ol/source/XYZ';
import TileWMS from 'ol/source/TileWMS';
import TileSource from 'ol/source/Tile';
import VectorSource from 'ol/source/Vector';
import TileGrid from 'ol/tilegrid/TileGrid';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Polygon from 'ol/geom/Polygon';
import {
  Circle as CircleStyle,
  Fill,
  Icon,
  Stroke,
  Style,
  Text,
} from 'ol/style';
import { defaults as defaultInteractions } from 'ol/interaction/defaults';
import {
  Plus,
  Minus,
  Crosshair,
  Maximize2,
  Minimize2,
  Compass,
  AlertTriangle,
} from 'lucide-react';
import type {
  ElevationDatasetId,
  ExplorationRegion,
  ExplorerSettings,
  FilterableMarkerCategory,
  MapLayerId,
  MarsLocation,
  TerrainAnalysisScope,
  TerrainOverlayCellInfo,
  TileHealthState,
} from '../types/mars';
import { MARS_LAYER_BY_ID, MARS_MAP_LAYERS } from '../data/marsLayers';
import {
  JEZERO_CRATER_SITE,
  MARS_REFERENCE_SITES,
  createCustomSurfaceLocation,
} from '../data/marsLocations';
import { clampLat, normalizeLon } from '../utils/marsCoordinates';
import { MARKER_ICON_URIS } from '../utils/markerIcons';
import {
  ELEVATION_DATASET_BY_ID,
  evaluateTerrainOverlay,
  fetchMarsElevationPatch,
  type SampledElevationPatch,
} from '../utils/marsDemService';
import {
  normalizeSlopeThresholds,
  type SlopeThresholds,
} from '../utils/terrainAnalyzer';
import { MapLayerControl } from './MapLayerControl';
import { CoordinateDisplay } from './CoordinateDisplay';
import { MapDataInfoPanel } from './MapDataInfoPanel';
import {
  TerrainRiskLegend,
  type TerrainOverlayLoadState,
} from './TerrainRiskLegend';

interface MarsMapProps {
  activeLayerId: MapLayerId;
  onSelectLayer: (layerId: MapLayerId) => void;
  selectedLocation: MarsLocation;
  onSelectLocation: (location: MarsLocation) => void;
  selectedRegion: ExplorationRegion;
  flyToTarget: { lat: number; lon: number; zoom?: number; nonce: number } | null;
  settings: ExplorerSettings;
  onUpdateSettings: (patch: Partial<ExplorerSettings>) => void;
  onToggleMarkerCategory: (category: FilterableMarkerCategory) => void;
  tileHealth: TileHealthState;
  onTileHealthChange: (health: TileHealthState) => void;
  onResetToJezero: () => void;
  showTerrainRisk: boolean;
  onToggleTerrainRisk: () => void;
  elevationDatasetId: ElevationDatasetId;
  onSelectElevationDataset: (id: ElevationDatasetId) => void;
  terrainScope: TerrainAnalysisScope;
  onSelectTerrainScope: (scope: TerrainAnalysisScope) => void;
  terrainThresholds: SlopeThresholds;
  onUpdateTerrainThresholds: (thresholds: SlopeThresholds) => void;
  terrainOpacity: number;
  onChangeTerrainOpacity: (opacity: number) => void;
  selectedTerrainCell: TerrainOverlayCellInfo | null;
  onSelectTerrainCell: (cell: TerrainOverlayCellInfo | null) => void;
}

function getTerrainCellRgba(
  cell: TerrainOverlayCellInfo,
  opacity: number
): string {
  const alpha = Math.max(0.15, Math.min(0.95, opacity));
  if (!cell.isValid || cell.difficultyClass === null) {
    return `rgba(107, 114, 128, ${alpha})`; // Missing data: Gray
  }
  switch (cell.difficultyClass) {
    case 0:
      return `rgba(34, 197, 94, ${alpha})`; // Easy: Green
    case 1:
      return `rgba(234, 254, 7, ${alpha})`; // Moderate: Yellow
    case 2:
      return `rgba(249, 115, 22, ${alpha})`; // Difficult: Orange
    case 3:
      return `rgba(228, 55, 0, ${alpha})`; // Very Difficult: Red
  }
}

export const MarsMap: React.FC<MarsMapProps> = ({
  activeLayerId,
  onSelectLayer,
  selectedLocation,
  onSelectLocation,
  selectedRegion,
  flyToTarget,
  settings,
  onUpdateSettings,
  onToggleMarkerCategory,
  tileHealth,
  onTileHealthChange,
  onResetToJezero,
  showTerrainRisk,
  onToggleTerrainRisk,
  elevationDatasetId,
  onSelectElevationDataset,
  terrainScope,
  onSelectTerrainScope,
  terrainThresholds,
  onUpdateTerrainThresholds,
  terrainOpacity,
  onChangeTerrainOpacity,
  selectedTerrainCell,
  onSelectTerrainCell,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mapTargetRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<OlMap | null>(null);
  const tileLayersRef = useRef<Record<MapLayerId, TileLayer<TileSource>> | null>(
    null
  );
  const terrainRiskLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const terrainRiskSourceRef = useRef<VectorSource | null>(null);
  const graticuleLayerRef = useRef<Graticule | null>(null);
  const regionLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const regionSourceRef = useRef<VectorSource | null>(null);
  const sitesLayerRef = useRef<VectorLayer<VectorSource> | null>(null);
  const selectionSourceRef = useRef<VectorSource | null>(null);
  const syncActiveHealthRef = useRef<((layerId: MapLayerId) => void) | null>(null);

  const onSelectLocationRef = useRef(onSelectLocation);
  onSelectLocationRef.current = onSelectLocation;
  const activeLayerIdRef = useRef(activeLayerId);
  activeLayerIdRef.current = activeLayerId;
  const onTileHealthChangeRef = useRef(onTileHealthChange);
  onTileHealthChangeRef.current = onTileHealthChange;
  const markerFiltersRef = useRef(settings.markerFilters);
  markerFiltersRef.current = settings.markerFilters;

  const showTerrainRiskRef = useRef(showTerrainRisk);
  showTerrainRiskRef.current = showTerrainRisk;
  const terrainOpacityRef = useRef(terrainOpacity);
  terrainOpacityRef.current = terrainOpacity;
  const selectedTerrainCellRef = useRef(selectedTerrainCell);
  selectedTerrainCellRef.current = selectedTerrainCell;
  const onSelectTerrainCellRef = useRef(onSelectTerrainCell);
  onSelectTerrainCellRef.current = onSelectTerrainCell;

  const activeLayer = MARS_LAYER_BY_ID[activeLayerId];
  const activeElevationDataset = ELEVATION_DATASET_BY_ID[elevationDatasetId];

  const [hoverCoords, setHoverCoords] = useState<{ lat: number; lon: number } | null>(
    null
  );
  const [resolutionDegPerPx, setResolutionDegPerPx] = useState<number>(
    0.703125 / 128
  );
  const [centerLatDeg, setCenterLatDeg] = useState<number>(
    JEZERO_CRATER_SITE.lat
  );
  const [zoomLevel, setZoomLevel] = useState<number>(8);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [tileWarning, setTileWarning] = useState<boolean>(false);
  const [isHoveringInteractive, setIsHoveringInteractive] = useState<boolean>(false);

  const [sampledPatch, setSampledPatch] = useState<SampledElevationPatch | null>(
    null
  );
  const [terrainLoadState, setTerrainLoadState] =
    useState<TerrainOverlayLoadState>('idle');
  const [terrainError, setTerrainError] = useState<string | null>(null);
  const [viewportNonce, setViewportNonce] = useState<number>(0);

  const normalizedThresholds = useMemo(
    () => normalizeSlopeThresholds(terrainThresholds),
    [terrainThresholds]
  );

  const evaluatedOverlay = useMemo(() => {
    if (!showTerrainRisk || !sampledPatch) return null;
    return evaluateTerrainOverlay(sampledPatch, normalizedThresholds);
  }, [showTerrainRisk, sampledPatch, normalizedThresholds]);

  // Initialize OpenLayers Map once
  useEffect(() => {
    if (!mapTargetRef.current) return;

    const layersRecord = {} as Record<MapLayerId, TileLayer<TileSource>>;
    const tileStats: Record<
      MapLayerId,
      { loading: number; errors: number; loaded: number }
    > = {
      orbital: { loading: 0, errors: 0, loaded: 0 },
      elevation: { loading: 0, errors: 0, loaded: 0 },
      hillshade: { loading: 0, errors: 0, loaded: 0 },
      geology: { loading: 0, errors: 0, loaded: 0 },
      terrain: { loading: 0, errors: 0, loaded: 0 },
    };

    const syncHealthForActive = (layerId: MapLayerId) => {
      if (layerId !== activeLayerIdRef.current) return;
      const stats = tileStats[layerId];
      if (stats.loading > 0) {
        onTileHealthChangeRef.current('loading');
      } else if (stats.errors > 0 && stats.loaded === 0) {
        onTileHealthChangeRef.current('degraded');
        setTileWarning(true);
      } else {
        onTileHealthChangeRef.current('available');
        setTileWarning(false);
      }
    };
    syncActiveHealthRef.current = syncHealthForActive;

    MARS_MAP_LAYERS.forEach((cfg) => {
      let source: TileSource;

      if (cfg.sourceType === 'wms' && cfg.wmsUrl && cfg.wmsLayers) {
        source = new TileWMS({
          url: cfg.wmsUrl,
          params: {
            LAYERS: cfg.wmsLayers,
            FORMAT: cfg.wmsFormat ?? 'image/jpeg',
            VERSION: '1.1.1',
          },
          projection: 'EPSG:4326',
          crossOrigin: 'anonymous',
          wrapX: false,
        });
      } else {
        const resolutions = Array.from(
          { length: cfg.maxZoom + 1 },
          (_, z) => cfg.z0Resolution / Math.pow(2, z)
        );

        const tileGrid = new TileGrid({
          extent: [-180, -90, 180, 90],
          origin: [-180, 90],
          resolutions,
          tileSize: cfg.tileSize,
        });

        source = new XYZ({
          projection: 'EPSG:4326',
          tileGrid,
          crossOrigin: 'anonymous',
          wrapX: false,
          tileUrlFunction: (tileCoord) => {
            if (!tileCoord) return undefined;
            const [z, x, y] = tileCoord;
            if (z < 0 || z > cfg.maxZoom) return undefined;
            const matrixW = 2 * Math.pow(2, z);
            const matrixH = 1 * Math.pow(2, z);
            if (x < 0 || x >= matrixW || y < 0 || y >= matrixH) return undefined;
            return (cfg.urlTemplate ?? '')
              .replace('{z}', String(z))
              .replace('{y}', String(y))
              .replace('{x}', String(x));
          },
        });
      }

      source.on('tileloadstart', () => {
        tileStats[cfg.id].loading += 1;
        syncHealthForActive(cfg.id);
      });
      source.on('tileloadend', () => {
        tileStats[cfg.id].loading = Math.max(0, tileStats[cfg.id].loading - 1);
        tileStats[cfg.id].loaded += 1;
        syncHealthForActive(cfg.id);
      });
      source.on('tileloaderror', () => {
        tileStats[cfg.id].loading = Math.max(0, tileStats[cfg.id].loading - 1);
        tileStats[cfg.id].errors += 1;
        syncHealthForActive(cfg.id);
      });

      const layer = new TileLayer({
        source,
        visible: cfg.id === activeLayerIdRef.current,
        opacity: settings.layerOpacity,
        extent: cfg.extent,
      });

      layersRecord[cfg.id] = layer;
    });

    tileLayersRef.current = layersRecord;

    // Terrain Risk Cell Overlay Layer (EPSG:4326 aligned polygons)
    const terrainRiskSource = new VectorSource();
    terrainRiskSourceRef.current = terrainRiskSource;

    const terrainRiskLayer = new VectorLayer({
      source: terrainRiskSource,
      visible: showTerrainRiskRef.current,
      style: (feature) => {
        const cellData = feature.get('terrainCellData') as
          | TerrainOverlayCellInfo
          | undefined;
        if (!cellData) return undefined;
        const selected = selectedTerrainCellRef.current;
        const isSelected =
          selected !== null &&
          selected.row === cellData.row &&
          selected.col === cellData.col;

        return new Style({
          fill: new Fill({
            color: getTerrainCellRgba(cellData, terrainOpacityRef.current),
          }),
          stroke: new Stroke({
            color: isSelected ? '#FFFFFF' : 'rgba(7, 23, 63, 0.35)',
            width: isSelected ? 2 : 0.75,
          }),
        });
      },
    });
    terrainRiskLayerRef.current = terrainRiskLayer;

    const graticule = new Graticule({
      strokeStyle: new Stroke({
        color: 'rgba(47, 150, 245, 0.30)',
        width: 1,
        lineDash: [3, 4],
      }),
      showLabels: true,
      wrapX: false,
      visible: settings.showGraticule,
      lonLabelStyle: new Text({
        font: '500 10px "IBM Plex Mono", monospace',
        fill: new Fill({ color: '#FFFFFF' }),
        stroke: new Stroke({ color: '#07173F', width: 3 }),
      }),
      latLabelStyle: new Text({
        font: '500 10px "IBM Plex Mono", monospace',
        fill: new Fill({ color: '#FFFFFF' }),
        stroke: new Stroke({ color: '#07173F', width: 3 }),
      }),
    });
    graticuleLayerRef.current = graticule;

    // Active Exploration Region Boundary Overlay
    const [minLon, minLat, maxLon, maxLat] = selectedRegion.bounds;
    const regionFeature = new Feature({
      geometry: new Polygon([
        [
          [minLon, minLat],
          [maxLon, minLat],
          [maxLon, maxLat],
          [minLon, maxLat],
          [minLon, minLat],
        ],
      ]),
    });
    regionFeature.set('regionName', selectedRegion.name);
    const regionSource = new VectorSource({ features: [regionFeature] });
    regionSourceRef.current = regionSource;

    const regionLayer = new VectorLayer({
      source: regionSource,
      visible: settings.showRegionBounds,
      style: (feature) =>
        new Style({
          stroke: new Stroke({
            color: '#2F96F5',
            width: 1.75,
            lineDash: [6, 5],
          }),
          fill: new Fill({
            color: 'rgba(47, 150, 245, 0.08)',
          }),
          text: new Text({
            text: String(feature.get('regionName') ?? ''),
            placement: 'point',
            offsetY: -10,
            font: '500 11px "Fira Sans", sans-serif',
            fill: new Fill({ color: '#2F96F5' }),
            stroke: new Stroke({ color: '#07173F', width: 3.5 }),
          }),
        }),
    });
    regionLayerRef.current = regionLayer;

    // Exploration Markers Layer (Astronaut, Habitat / Base, Rover, Scientific Destination)
    const siteFeatures = MARS_REFERENCE_SITES.map((site) => {
      const feature = new Feature({
        geometry: new Point([site.lon, site.lat]),
      });
      feature.set('locationData', site);
      return feature;
    });

    const sitesSource = new VectorSource({ features: siteFeatures });
    const sitesLayer = new VectorLayer({
      source: sitesSource,
      visible: settings.showReferenceSites,
      style: (feature, resolution) => {
        const site = feature.get('locationData') as MarsLocation;
        if (site.category !== 'custom' && !markerFiltersRef.current[site.category]) {
          return undefined;
        }
        const iconSrc =
          site.category !== 'custom'
            ? MARKER_ICON_URIS[site.category]
            : MARKER_ICON_URIS.science;

        const isGlobalView = resolution > 0.04;
        const showLabel = !isGlobalView || site.isReferenceSite;

        return new Style({
          image: new Icon({
            src: iconSrc,
            scale: 1,
            anchor: [0.5, 0.5],
          }),
          text: showLabel
            ? new Text({
                text: site.name.replace(', Mars', ''),
                offsetY: -17,
                font: '500 11px "Fira Sans", sans-serif',
                fill: new Fill({ color: '#FFFFFF' }),
                stroke: new Stroke({ color: '#07173F', width: 3.5 }),
              })
            : undefined,
        });
      },
    });
    sitesLayerRef.current = sitesLayer;

    // Active Selected-Location Target Reticle
    const selectionSource = new VectorSource({
      features: [
        new Feature({
          geometry: new Point([JEZERO_CRATER_SITE.lon, JEZERO_CRATER_SITE.lat]),
        }),
      ],
    });
    selectionSourceRef.current = selectionSource;

    const selectionLayer = new VectorLayer({
      source: selectionSource,
      style: [
        new Style({
          image: new CircleStyle({
            radius: 16,
            fill: new Fill({ color: 'rgba(234, 254, 7, 0.08)' }),
            stroke: new Stroke({ color: '#EAFE07', width: 2 }),
          }),
        }),
        new Style({
          image: new CircleStyle({
            radius: 3.5,
            fill: new Fill({ color: '#E43700' }),
            stroke: new Stroke({ color: '#FFFFFF', width: 1.5 }),
          }),
        }),
      ],
    });

    const viewResolutions = Array.from(
      { length: 13 },
      (_, z) => 0.703125 / Math.pow(2, z)
    );

    const view = new View({
      projection: 'EPSG:4326',
      center: [JEZERO_CRATER_SITE.lon, JEZERO_CRATER_SITE.lat],
      zoom: 8,
      minZoom: 1,
      maxZoom: 12,
      resolutions: viewResolutions,
      extent: [-180, -90, 180, 90],
      constrainOnlyCenter: true,
      showFullExtent: true,
    });

    const map = new OlMap({
      target: mapTargetRef.current,
      layers: [
        layersRecord.orbital,
        layersRecord.elevation,
        layersRecord.hillshade,
        layersRecord.geology,
        layersRecord.terrain,
        terrainRiskLayer,
        graticule,
        regionLayer,
        sitesLayer,
        selectionLayer,
      ],
      view,
      controls: [],
      interactions: defaultInteractions({
        pinchRotate: false,
        altShiftDragRotate: false,
      }),
    });

    mapRef.current = map;

    const updateViewTelemetry = () => {
      const res = view.getResolution();
      const center = view.getCenter();
      const z = view.getZoom();
      if (typeof res === 'number') setResolutionDegPerPx(res);
      if (center) setCenterLatDeg(clampLat(center[1]));
      if (typeof z === 'number') setZoomLevel(Math.round(z * 10) / 10);
    };

    updateViewTelemetry();
    view.on('change:resolution', updateViewTelemetry);
    view.on('change:center', updateViewTelemetry);

    map.on('pointermove', (evt) => {
      if (evt.dragging) return;
      const [lon, lat] = evt.coordinate;
      if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        setHoverCoords({ lat: clampLat(lat), lon: normalizeLon(lon) });
      } else {
        setHoverCoords(null);
      }

      const hitFeature = map.forEachFeatureAtPixel(
        evt.pixel,
        (feature) => feature,
        {
          layerFilter: (l) => l === sitesLayer,
          hitTolerance: 8,
        }
      );
      const siteData = hitFeature?.get('locationData') as MarsLocation | undefined;
      const isVisibleSite =
        Boolean(siteData) &&
        (siteData!.category === 'custom' ||
          markerFiltersRef.current[siteData!.category]);

      let isTerrainCell = false;
      if (!isVisibleSite && showTerrainRiskRef.current) {
        const hitCell = map.forEachFeatureAtPixel(
          evt.pixel,
          (feature) => feature,
          {
            layerFilter: (l) => l === terrainRiskLayer,
          }
        );
        isTerrainCell = Boolean(hitCell);
      }

      setIsHoveringInteractive(isVisibleSite || isTerrainCell);
    });

    map.on('singleclick', (evt) => {
      const hitFeature = map.forEachFeatureAtPixel(
        evt.pixel,
        (feature) => feature,
        {
          layerFilter: (l) => l === sitesLayer,
          hitTolerance: 8,
        }
      );

      if (hitFeature) {
        const siteData = hitFeature.get('locationData') as MarsLocation | undefined;
        if (
          siteData &&
          (siteData.category === 'custom' ||
            markerFiltersRef.current[siteData.category])
        ) {
          onSelectLocationRef.current(siteData);
          return;
        }
      }

      if (showTerrainRiskRef.current) {
        const cellFeature = map.forEachFeatureAtPixel(
          evt.pixel,
          (feature) => feature,
          {
            layerFilter: (l) => l === terrainRiskLayer,
          }
        );
        const cellData = cellFeature?.get('terrainCellData') as
          | TerrainOverlayCellInfo
          | undefined;
        if (cellData) {
          onSelectTerrainCellRef.current(cellData);
          const customLoc = createCustomSurfaceLocation(cellData.lat, cellData.lon);
          onSelectLocationRef.current({
            ...customLoc,
            elevation:
              cellData.elevationMeters !== null
                ? `${cellData.elevationMeters.toFixed(1)} m (${cellData.datasetName})`
                : 'Not available (missing DEM cell)',
            terrainClassification:
              cellData.isValid && cellData.slopeDegrees !== null
                ? `${cellData.difficultyClass} – ${cellData.difficultyLabel} (${cellData.slopeDegrees.toFixed(2)}° macro slope)`
                : 'Invalid / Missing elevation cell',
            dataSource: cellData.dataSource,
            observationStatus: cellData.isSynthetic
              ? 'Synthetic testing grid cell (not real Mars telemetry)'
              : cellData.isValid
                ? `Live NASA PDS4 MOLA MEGDR cell (${cellData.pds4Version ?? 'PDS4'})`
                : 'No Data / out-of-coverage elevation cell',
            isSampleData: cellData.isSynthetic,
          });
          return;
        }
      }

      const [rawLon, rawLat] = evt.coordinate;
      if (rawLat < -90 || rawLat > 90) return;
      const lat = clampLat(rawLat);
      const lon = normalizeLon(rawLon);
      onSelectTerrainCellRef.current(null);
      onSelectLocationRef.current(createCustomSurfaceLocation(lat, lon));
    });

    const handlePointerLeave = () => setHoverCoords(null);
    const targetEl = mapTargetRef.current;
    targetEl.addEventListener('mouseleave', handlePointerLeave);

    return () => {
      targetEl.removeEventListener('mouseleave', handlePointerLeave);
      map.setTarget(undefined);
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch elevation grid when Terrain Risk layer, dataset, region, or viewport sample changes
  useEffect(() => {
    if (!showTerrainRisk) {
      setSampledPatch(null);
      setTerrainLoadState('idle');
      setTerrainError(null);
      return;
    }

    let targetBounds: [number, number, number, number] = selectedRegion.bounds;

    if (terrainScope === 'viewport' && mapRef.current) {
      const size = mapRef.current.getSize();
      if (size) {
        const ext = mapRef.current.getView().calculateExtent(size);
        const rawMinLon = Math.max(-180, ext[0]);
        const rawMinLat = Math.max(-90, ext[1]);
        const rawMaxLon = Math.min(180, ext[2]);
        const rawMaxLat = Math.min(90, ext[3]);
        const centerLon = (rawMinLon + rawMaxLon) / 2;
        const centerLat = (rawMinLat + rawMaxLat) / 2;
        // Cap viewport sampling window to max 4° x 3° to stay fast & memory-efficient
        const lonSpan = Math.min(4, Math.max(0.25, rawMaxLon - rawMinLon));
        const latSpan = Math.min(3, Math.max(0.25, rawMaxLat - rawMinLat));
        targetBounds = [
          Math.max(-180, centerLon - lonSpan / 2),
          Math.max(-90, centerLat - latSpan / 2),
          Math.min(180, centerLon + lonSpan / 2),
          Math.min(90, centerLat + latSpan / 2),
        ];
      }
    }

    const controller = new AbortController();
    setTerrainLoadState('loading');
    setTerrainError(null);

    fetchMarsElevationPatch(elevationDatasetId, targetBounds, controller.signal)
      .then((patch) => {
        if (controller.signal.aborted) return;
        setSampledPatch(patch);
        setTerrainLoadState('ready');
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setSampledPatch(null);
        setTerrainLoadState('unavailable');
        setTerrainError(
          err instanceof Error
            ? err.message
            : 'Elevation data is currently unavailable.'
        );
      });

    return () => {
      controller.abort();
    };
  }, [
    showTerrainRisk,
    elevationDatasetId,
    selectedRegion,
    terrainScope,
    viewportNonce,
  ]);

  // Populate OpenLayers Terrain Risk VectorSource when evaluated overlay updates
  useEffect(() => {
    const layer = terrainRiskLayerRef.current;
    const src = terrainRiskSourceRef.current;
    if (!layer || !src) return;

    layer.setVisible(showTerrainRisk && terrainLoadState === 'ready');
    src.clear();

    if (!showTerrainRisk || !evaluatedOverlay || terrainLoadState !== 'ready') {
      return;
    }

    const features = evaluatedOverlay.cells.map((cell) => {
      const [minLon, minLat, maxLon, maxLat] = cell.bounds;
      const feature = new Feature({
        geometry: new Polygon([
          [
            [minLon, minLat],
            [maxLon, minLat],
            [maxLon, maxLat],
            [minLon, maxLat],
            [minLon, minLat],
          ],
        ]),
      });
      feature.set('terrainCellData', cell);
      return feature;
    });

    src.addFeatures(features);

    // Refresh selected cell details if thresholds changed
    const currentSelected = selectedTerrainCellRef.current;
    if (currentSelected) {
      const updatedCell = evaluatedOverlay.cells.find(
        (c) => c.row === currentSelected.row && c.col === currentSelected.col
      );
      if (updatedCell) {
        onSelectTerrainCellRef.current(updatedCell);
      }
    }
  }, [showTerrainRisk, evaluatedOverlay, terrainLoadState]);

  // Re-style Terrain Risk layer when opacity or selected cell changes
  useEffect(() => {
    terrainRiskLayerRef.current?.changed();
  }, [terrainOpacity, selectedTerrainCell]);

  // Sync active tile layer visibility & opacity
  useEffect(() => {
    const layers = tileLayersRef.current;
    if (!layers) return;
    (Object.keys(layers) as MapLayerId[]).forEach((id) => {
      layers[id].setVisible(id === activeLayerId);
      layers[id].setOpacity(settings.layerOpacity);
    });
    syncActiveHealthRef.current?.(activeLayerId);
  }, [activeLayerId, settings.layerOpacity]);

  // Sync Graticule, Region Bounds & Marker Filters
  useEffect(() => {
    graticuleLayerRef.current?.setVisible(settings.showGraticule);
  }, [settings.showGraticule]);

  useEffect(() => {
    regionLayerRef.current?.setVisible(settings.showRegionBounds);
  }, [settings.showRegionBounds]);

  useEffect(() => {
    sitesLayerRef.current?.setVisible(settings.showReferenceSites);
    sitesLayerRef.current?.changed();
  }, [settings.showReferenceSites, settings.markerFilters]);

  // Sync Active Exploration Region Polygon Geometry
  useEffect(() => {
    const src = regionSourceRef.current;
    if (!src) return;
    const features = src.getFeatures();
    if (features[0]) {
      const [minLon, minLat, maxLon, maxLat] = selectedRegion.bounds;
      features[0].setGeometry(
        new Polygon([
          [
            [minLon, minLat],
            [maxLon, minLat],
            [maxLon, maxLat],
            [minLon, maxLat],
            [minLon, minLat],
          ],
        ])
      );
      features[0].set('regionName', selectedRegion.name);
    }
  }, [selectedRegion]);

  // Sync selected marker reticle geometry
  useEffect(() => {
    const src = selectionSourceRef.current;
    if (!src) return;
    const features = src.getFeatures();
    if (features[0]) {
      features[0].setGeometry(new Point([selectedLocation.lon, selectedLocation.lat]));
    }
  }, [selectedLocation.lat, selectedLocation.lon]);

  // Handle programmatic Fly-To animations
  useEffect(() => {
    if (!flyToTarget || !mapRef.current) return;
    const view = mapRef.current.getView();
    view.animate({
      center: [flyToTarget.lon, flyToTarget.lat],
      zoom: flyToTarget.zoom ?? Math.max(view.getZoom() ?? 6, 7),
      duration: 450,
    });
  }, [flyToTarget]);

  // Sync fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
      setTimeout(() => mapRef.current?.updateSize(), 80);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleZoom = useCallback((delta: number) => {
    const view = mapRef.current?.getView();
    if (!view) return;
    const currentZoom = view.getZoom() ?? 6;
    view.animate({
      zoom: Math.max(1, Math.min(12, currentZoom + delta)),
      duration: 180,
    });
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    if (!wrapperRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await wrapperRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      setIsFullscreen((prev) => !prev);
      setTimeout(() => mapRef.current?.updateSize(), 80);
    }
  }, []);

  return (
    <div
      ref={wrapperRef}
      className={`relative h-full w-full overflow-hidden bg-[#07173F] ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
    >
      {/* OpenLayers Canvas */}
      <div
        ref={mapTargetRef}
        className={`h-full w-full ${
          isHoveringInteractive ? 'cursor-pointer' : 'cursor-crosshair'
        }`}
        aria-label="Interactive Mars Surface Map"
      />

      {/* Top-Left: Floating Layer, Terrain Risk & Marker Control */}
      <div className="pointer-events-auto absolute left-3.5 top-3.5 z-10">
        <MapLayerControl
          activeLayerId={activeLayerId}
          onSelectLayer={onSelectLayer}
          showGraticule={settings.showGraticule}
          onToggleGraticule={() =>
            onUpdateSettings({ showGraticule: !settings.showGraticule })
          }
          showRegionBounds={settings.showRegionBounds}
          onToggleRegionBounds={() =>
            onUpdateSettings({ showRegionBounds: !settings.showRegionBounds })
          }
          markerFilters={settings.markerFilters}
          onToggleMarkerCategory={onToggleMarkerCategory}
          layerOpacity={settings.layerOpacity}
          onChangeOpacity={(opacity) =>
            onUpdateSettings({ layerOpacity: opacity })
          }
          showTerrainRisk={showTerrainRisk}
          onToggleTerrainRisk={onToggleTerrainRisk}
          elevationDatasetId={elevationDatasetId}
          onSelectElevationDataset={onSelectElevationDataset}
          terrainScope={terrainScope}
          onSelectTerrainScope={onSelectTerrainScope}
          onRefreshViewportTerrain={() => setViewportNonce((n) => n + 1)}
          terrainThresholds={terrainThresholds}
          onUpdateTerrainThresholds={onUpdateTerrainThresholds}
          terrainOpacity={terrainOpacity}
          onChangeTerrainOpacity={onChangeTerrainOpacity}
        />
      </div>

      {/* Top-Right (Left of Zoom Stack): Terrain Risk Legend & Elevation Source HUD */}
      {showTerrainRisk && (
        <div className="pointer-events-auto hidden sm:block absolute right-16 top-3.5 z-10">
          <TerrainRiskLegend
            loadState={terrainLoadState}
            errorMessage={terrainError}
            dataset={activeElevationDataset}
            pds4Metadata={sampledPatch?.pds4Metadata ?? null}
            summary={evaluatedOverlay?.analysis.summary ?? null}
            cellDistanceMeters={sampledPatch?.cellDistanceMeters ?? null}
            thresholds={normalizedThresholds}
            selectedCell={selectedTerrainCell}
          />
        </div>
      )}

      {/* Top-Right: North Indicator + Zoom / Reset / Fullscreen Controls */}
      <div className="pointer-events-auto absolute right-3.5 top-3.5 z-10 flex flex-col items-center gap-2">
        <div
          className="flex h-10 w-10 flex-col items-center justify-center rounded-md border border-[#2F96F5]/45 bg-[#0042A6]/95 text-[#FFFFFF] shadow-lg"
          title="True North (Equirectangular Projection)"
        >
          <Compass className="h-4 w-4 text-[#2F96F5]" />
          <span className="font-mono text-[9px] font-semibold leading-none mt-0.5">
            N
          </span>
        </div>

        <div className="flex flex-col overflow-hidden rounded-md border border-[#2F96F5]/45 bg-[#0042A6]/95 shadow-lg">
          <button
            type="button"
            onClick={() => handleZoom(1)}
            className="flex h-9 w-10 items-center justify-center border-b border-[#2F96F5]/30 text-[#FFFFFF] hover:bg-[#0960E1] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2F96F5]"
            aria-label="Zoom in"
            title="Zoom in"
          >
            <Plus className="h-4 w-4" />
          </button>

          <div
            className="flex h-6 w-10 items-center justify-center border-b border-[#2F96F5]/30 bg-[#07173F] font-mono text-[10px] tabular-nums text-[#FFFFFF]/80"
            title="Current map zoom level"
          >
            Z{zoomLevel.toFixed(0)}
          </div>

          <button
            type="button"
            onClick={() => handleZoom(-1)}
            className="flex h-9 w-10 items-center justify-center border-b border-[#2F96F5]/30 text-[#FFFFFF] hover:bg-[#0960E1] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2F96F5]"
            aria-label="Zoom out"
            title="Zoom out"
          >
            <Minus className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onResetToJezero}
            className="flex h-9 w-10 items-center justify-center border-b border-[#2F96F5]/30 text-[#EAFE07] hover:bg-[#0960E1] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2F96F5]"
            aria-label="Reset view to Jezero Crater"
            title="Center on Jezero Crater"
          >
            <Crosshair className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="flex h-9 w-10 items-center justify-center text-[#FFFFFF] hover:bg-[#0960E1] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2F96F5]"
            aria-label={isFullscreen ? 'Exit fullscreen map' : 'Enter fullscreen map'}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen map'}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Tile Outage Fallback Notice */}
      {tileWarning && (
        <div className="pointer-events-auto absolute left-1/2 top-3.5 z-10 -translate-x-1/2 flex items-center gap-2 rounded-md border border-[#E43700] bg-[#07173F] px-3 py-2 text-xs text-[#FFFFFF] shadow-lg">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[#E43700]" />
          <span>
            Orbital tile service unreachable for {activeLayer.name} — coordinate grid and markers remain active.
          </span>
        </div>
      )}

      {/* Bottom-Left: Geodesic Scale Bar & Live Coordinates */}
      <div className="pointer-events-auto absolute bottom-3.5 left-3.5 z-10 max-w-[calc(100%-28px)]">
        <CoordinateDisplay
          hoverCoords={hoverCoords}
          selectedCoords={{ lat: selectedLocation.lat, lon: selectedLocation.lon }}
          resolutionDegPerPx={resolutionDegPerPx}
          centerLatDeg={centerLatDeg}
          coordinateFormat={settings.coordinateFormat}
          scaleUnit={settings.scaleUnit}
        />
      </div>

      {/* Bottom-Right: Map Data Information Panel */}
      <div className="pointer-events-auto hidden md:block absolute bottom-3.5 right-3.5 z-10">
        <MapDataInfoPanel
          activeLayer={activeLayer}
          tileHealth={tileHealth}
          selectedRegion={selectedRegion}
          coordinateFormat={settings.coordinateFormat}
        />
      </div>
    </div>
  );
};
