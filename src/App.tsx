import { useState, useCallback, useMemo } from 'react';
import type {
  ElevationDatasetId,
  ExplorationRegion,
  ExplorerSettings,
  FilterableMarkerCategory,
  MapLayerId,
  MarsLocation,
  NavSectionId,
  RoutePointInput,
  RouteStrategyId,
  TerrainAnalysisScope,
  TerrainOverlayCellInfo,
  TileHealthState,
  TraversalRules,
} from './types/mars';
import {
  DEFAULT_SLOPE_THRESHOLDS,
  type SlopeThresholds,
} from './utils/terrainAnalyzer';
import {
  ELEVATION_DATASET_BY_ID,
  type EvaluatedTerrainOverlay,
} from './utils/marsDemService';
import {
  DEFAULT_ASTRONAUT_PROFILE,
  DEFAULT_RESOURCE_THRESHOLDS,
  DEFAULT_RETURN_JOURNEY_PROFILE,
  type AstronautResourceProfile,
  type ResourceThresholds,
  type ReturnJourneyProfile,
} from './utils/resourceCalculator';
import {
  DEFAULT_TRAVERSAL_RULES,
  optimizeReturnMission,
} from './utils/returnPathOptimizer';
import { MARS_LAYER_BY_ID } from './data/marsLayers';
import {
  DEFAULT_EXPLORATION_REGION,
  JEZERO_CRATER_SITE,
  MARS_REFERENCE_SITES,
  createCustomSurfaceLocation,
} from './data/marsLocations';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { MarsMap } from './components/MarsMap';
import { LocationPanel } from './components/LocationPanel';
import {
  RoutePlanningPanel,
  type RoutePickMode,
} from './components/RoutePlanningPanel';
import { StatusBar } from './components/StatusBar';
import { MissionOverviewView, SettingsView } from './components/AuxiliaryViews';
import { ResourceCalculatorView } from './components/ResourceCalculatorView';
import { TerrainAnalysisView } from './components/TerrainAnalysisView';
import type { TerrainOverlayLoadState } from './components/TerrainRiskLegend';

const DEFAULT_HABITAT_POINT: RoutePointInput = {
  label: 'Habitat Base',
  lat: 18.375,
  lon: 77.465,
};

const DEFAULT_DESTINATION_POINT: RoutePointInput = {
  label: 'Exploration Destination',
  lat: 18.408,
  lon: 77.43,
};

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSectionId>('explorer');
  const [activeLayerId, setActiveLayerId] = useState<MapLayerId>('orbital');
  const [selectedLocation, setSelectedLocation] = useState<MarsLocation>(
    JEZERO_CRATER_SITE
  );
  const [selectedRegion, setSelectedRegion] = useState<ExplorationRegion>(
    DEFAULT_EXPLORATION_REGION
  );
  const [flyToTarget, setFlyToTarget] = useState<{
    lat: number;
    lon: number;
    zoom?: number;
    nonce: number;
  } | null>(null);

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  const [tileHealth, setTileHealth] = useState<TileHealthState>('loading');

  // Module 3: Terrain Risk Map State
  const [showTerrainRisk, setShowTerrainRisk] = useState<boolean>(false);
  const [elevationDatasetId, setElevationDatasetId] =
    useState<ElevationDatasetId>('mola-pds4-meg128');
  const [terrainScope, setTerrainScope] =
    useState<TerrainAnalysisScope>('region');
  const [terrainThresholds, setTerrainThresholds] = useState<SlopeThresholds>(
    DEFAULT_SLOPE_THRESHOLDS
  );
  const [terrainOpacity, setTerrainOpacity] = useState<number>(0.6);
  const [selectedTerrainCell, setSelectedTerrainCell] =
    useState<TerrainOverlayCellInfo | null>(null);

  // Module 2: Lifted EVA Resource State (shared across EVA Monitor & Return Path Optimizer)
  const [evaProfile, setEvaProfile] = useState<AstronautResourceProfile>(
    DEFAULT_ASTRONAUT_PROFILE
  );
  const [evaThresholds, setEvaThresholds] = useState<ResourceThresholds>(
    DEFAULT_RESOURCE_THRESHOLDS
  );
  const [evaElapsedHours, setEvaElapsedHours] = useState<number>(0);
  const [returnProfile, setReturnProfile] = useState<ReturnJourneyProfile>(
    DEFAULT_RETURN_JOURNEY_PROFILE
  );

  // Module 4: Return Path Optimizer State
  const [habitatPoint, setHabitatPoint] = useState<RoutePointInput>(
    DEFAULT_HABITAT_POINT
  );
  const [destinationPoint, setDestinationPoint] = useState<RoutePointInput>(
    DEFAULT_DESTINATION_POINT
  );
  const [routePickMode, setRoutePickMode] = useState<RoutePickMode>('none');
  const [traversalRules, setTraversalRules] = useState<TraversalRules>(
    DEFAULT_TRAVERSAL_RULES
  );
  const [selectedStrategyId, setSelectedStrategyId] =
    useState<RouteStrategyId>('balanced');
  const [terrainSnapshot, setTerrainSnapshot] = useState<{
    overlay: EvaluatedTerrainOverlay | null;
    loadState: TerrainOverlayLoadState;
    error: string | null;
  }>({
    overlay: null,
    loadState: 'idle',
    error: null,
  });

  const [settings, setSettings] = useState<ExplorerSettings>({
    coordinateFormat: 'hemisphere',
    showGraticule: true,
    showReferenceSites: true,
    showRegionBounds: true,
    markerFilters: {
      astronaut: true,
      habitat: true,
      rover: true,
      science: true,
    },
    layerOpacity: 1,
    scaleUnit: 'metric',
  });

  const activeLayer = MARS_LAYER_BY_ID[activeLayerId];
  const activeElevationDataset = ELEVATION_DATASET_BY_ID[elevationDatasetId];

  const handleUpdateSettings = useCallback((patch: Partial<ExplorerSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleToggleMarkerCategory = useCallback(
    (category: FilterableMarkerCategory) => {
      setSettings((prev) => ({
        ...prev,
        markerFilters: {
          ...prev.markerFilters,
          [category]: !prev.markerFilters[category],
        },
      }));
    },
    []
  );

  const triggerFlyTo = useCallback(
    (lat: number, lon: number, zoom?: number) => {
      setFlyToTarget({
        lat,
        lon,
        zoom,
        nonce: Date.now() + Math.random(),
      });
    },
    []
  );

  const handleSelectSection = useCallback((section: NavSectionId) => {
    setActiveSection(section);
    if (section === 'route-planning') {
      setShowTerrainRisk(true);
      setIsRightPanelOpen(true);
    } else {
      setRoutePickMode('none');
    }
  }, []);

  const handleSelectSiteAndFly = useCallback(
    (location: MarsLocation) => {
      setSelectedLocation(location);
      setActiveSection('explorer');
      setRoutePickMode('none');
      triggerFlyTo(location.lat, location.lon, location.recommendedZoom ?? 7);
    },
    [triggerFlyTo]
  );

  const handleSelectRegion = useCallback(
    (region: ExplorationRegion) => {
      setSelectedRegion(region);
      setActiveSection('explorer');
      setRoutePickMode('none');
      triggerFlyTo(region.centerLat, region.centerLon, region.recommendedZoom);
    },
    [triggerFlyTo]
  );

  const handleSearchCoordinate = useCallback(
    (lat: number, lon: number) => {
      const customLoc = createCustomSurfaceLocation(lat, lon);
      setSelectedLocation(customLoc);
      setActiveSection('explorer');
      setRoutePickMode('none');
      triggerFlyTo(lat, lon, 7);
    },
    [triggerFlyTo]
  );

  const handleResetToJezero = useCallback(() => {
    setSelectedLocation(JEZERO_CRATER_SITE);
    setSelectedRegion(DEFAULT_EXPLORATION_REGION);
    triggerFlyTo(
      JEZERO_CRATER_SITE.lat,
      JEZERO_CRATER_SITE.lon,
      JEZERO_CRATER_SITE.recommendedZoom ?? 8
    );
  }, [triggerFlyTo]);

  const handleSelectSiteById = useCallback(
    (siteId: string) => {
      const found = MARS_REFERENCE_SITES.find((s) => s.id === siteId);
      if (found) {
        handleSelectSiteAndFly(found);
      }
    },
    [handleSelectSiteAndFly]
  );

  const handleResetEvaDefaults = useCallback(() => {
    setEvaProfile(DEFAULT_ASTRONAUT_PROFILE);
    setEvaThresholds(DEFAULT_RESOURCE_THRESHOLDS);
    setEvaElapsedHours(0);
    setReturnProfile(DEFAULT_RETURN_JOURNEY_PROFILE);
  }, []);

  const handlePickRoutePoint = useCallback(
    (role: 'habitat' | 'destination', lat: number, lon: number) => {
      if (role === 'habitat') {
        setHabitatPoint({ label: 'Habitat Base', lat, lon });
      } else {
        setDestinationPoint({ label: 'Exploration Destination', lat, lon });
      }
      setRoutePickMode('none');
    },
    []
  );

  const handleLoadJezeroPreset = useCallback(() => {
    setHabitatPoint(DEFAULT_HABITAT_POINT);
    setDestinationPoint(DEFAULT_DESTINATION_POINT);
    setSelectedRegion(DEFAULT_EXPLORATION_REGION);
    setRoutePickMode('none');
    triggerFlyTo(18.4, 77.417, 9);
  }, [triggerFlyTo]);

  const handleCenterOnRoutes = useCallback(() => {
    if (
      Number.isFinite(habitatPoint.lat) &&
      Number.isFinite(habitatPoint.lon) &&
      Number.isFinite(destinationPoint.lat) &&
      Number.isFinite(destinationPoint.lon)
    ) {
      const midLat = (habitatPoint.lat + destinationPoint.lat) / 2;
      const midLon = (habitatPoint.lon + destinationPoint.lon) / 2;
      const maxSpan = Math.max(
        Math.abs(habitatPoint.lat - destinationPoint.lat),
        Math.abs(habitatPoint.lon - destinationPoint.lon)
      );
      const zoom = maxSpan > 1.5 ? 6 : maxSpan > 0.6 ? 7 : maxSpan > 0.2 ? 8 : 9;
      triggerFlyTo(midLat, midLon, zoom);
    }
  }, [habitatPoint, destinationPoint, triggerFlyTo]);

  const handleTerrainStateUpdate = useCallback(
    (next: {
      overlay: EvaluatedTerrainOverlay | null;
      loadState: TerrainOverlayLoadState;
      error: string | null;
    }) => {
      setTerrainSnapshot(next);
    },
    []
  );

  const optimizationResult = useMemo(
    () =>
      optimizeReturnMission({
        overlay: terrainSnapshot.overlay,
        terrainUnavailableReason:
          terrainSnapshot.loadState === 'unavailable'
            ? (terrainSnapshot.error ?? 'Elevation dataset unavailable.')
            : null,
        habitat: habitatPoint,
        destination: destinationPoint,
        evaProfile,
        evaThresholds,
        preDepartureElapsedHours: evaElapsedHours,
        rules: traversalRules,
      }),
    [
      terrainSnapshot,
      habitatPoint,
      destinationPoint,
      evaProfile,
      evaThresholds,
      evaElapsedHours,
      traversalRules,
    ]
  );

  const isMapWorkspaceActive =
    activeSection === 'explorer' || activeSection === 'route-planning';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#07173F] text-[#FFFFFF]">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
        selectedLocationName={selectedLocation.name}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Topbar
          activeSection={activeSection}
          selectedLocation={selectedLocation}
          activeDataSource={activeLayer.dataSource}
          isRightPanelOpen={isRightPanelOpen}
          onToggleRightPanel={() => setIsRightPanelOpen((prev) => !prev)}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onSelectSite={handleSelectSiteAndFly}
          onSearchCoordinate={handleSearchCoordinate}
          onFocusSelectedLocation={() =>
            handleSelectSiteAndFly(selectedLocation)
          }
        />

        <main className="relative flex flex-1 min-h-0 overflow-hidden">
          {isMapWorkspaceActive && (
            <>
              <div className="flex-1 min-w-0 h-full">
                <MarsMap
                  activeLayerId={activeLayerId}
                  onSelectLayer={setActiveLayerId}
                  selectedLocation={selectedLocation}
                  onSelectLocation={setSelectedLocation}
                  selectedRegion={selectedRegion}
                  flyToTarget={flyToTarget}
                  settings={settings}
                  onUpdateSettings={handleUpdateSettings}
                  onToggleMarkerCategory={handleToggleMarkerCategory}
                  tileHealth={tileHealth}
                  onTileHealthChange={setTileHealth}
                  onResetToJezero={handleResetToJezero}
                  showTerrainRisk={showTerrainRisk}
                  onToggleTerrainRisk={() => {
                    setShowTerrainRisk((prev) => !prev);
                    setSelectedTerrainCell(null);
                  }}
                  elevationDatasetId={elevationDatasetId}
                  onSelectElevationDataset={(id) => {
                    setElevationDatasetId(id);
                    setSelectedTerrainCell(null);
                  }}
                  terrainScope={terrainScope}
                  onSelectTerrainScope={(scope) => {
                    setTerrainScope(scope);
                    setSelectedTerrainCell(null);
                  }}
                  terrainThresholds={terrainThresholds}
                  onUpdateTerrainThresholds={setTerrainThresholds}
                  terrainOpacity={terrainOpacity}
                  onChangeTerrainOpacity={setTerrainOpacity}
                  selectedTerrainCell={selectedTerrainCell}
                  onSelectTerrainCell={setSelectedTerrainCell}
                  isRoutePlanningMode={activeSection === 'route-planning'}
                  routePickMode={routePickMode}
                  onCancelRoutePick={() => setRoutePickMode('none')}
                  onPickRoutePoint={handlePickRoutePoint}
                  habitatPoint={habitatPoint}
                  destinationPoint={destinationPoint}
                  activeRouteEvaluation={
                    optimizationResult.strategies[selectedStrategyId]
                  }
                  onTerrainStateUpdate={handleTerrainStateUpdate}
                />
              </div>

              {isRightPanelOpen && activeSection === 'explorer' && (
                <div className="fixed inset-y-14 right-0 z-30 flex w-full max-w-[368px] md:static md:inset-auto md:w-auto">
                  <LocationPanel
                    selectedLocation={selectedLocation}
                    selectedRegion={selectedRegion}
                    onSelectRegion={handleSelectRegion}
                    coordinateFormat={settings.coordinateFormat}
                    onCenterOnLocation={(loc) =>
                      triggerFlyTo(loc.lat, loc.lon, loc.recommendedZoom ?? 7)
                    }
                    onSelectReferenceSite={handleSelectSiteAndFly}
                    onResetToJezero={handleResetToJezero}
                    onCloseMobile={() => setIsRightPanelOpen(false)}
                    showTerrainRisk={showTerrainRisk}
                    selectedTerrainCell={selectedTerrainCell}
                  />
                </div>
              )}

              {isRightPanelOpen && activeSection === 'route-planning' && (
                <div className="fixed inset-y-14 right-0 z-30 flex w-full max-w-[420px] md:static md:inset-auto md:w-auto">
                  <RoutePlanningPanel
                    habitat={habitatPoint}
                    destination={destinationPoint}
                    onChangeHabitat={setHabitatPoint}
                    onChangeDestination={setDestinationPoint}
                    pickMode={routePickMode}
                    onChangePickMode={setRoutePickMode}
                    onLoadJezeroPreset={handleLoadJezeroPreset}
                    onCenterOnRoutes={handleCenterOnRoutes}
                    elevationDatasetId={elevationDatasetId}
                    onSelectElevationDataset={(id) => {
                      setElevationDatasetId(id);
                      setSelectedTerrainCell(null);
                    }}
                    activeDataset={activeElevationDataset}
                    terrainLoadState={terrainSnapshot.loadState}
                    terrainError={terrainSnapshot.error}
                    traversalRules={traversalRules}
                    onChangeTraversalRules={setTraversalRules}
                    evaProfile={evaProfile}
                    onChangeEvaProfile={setEvaProfile}
                    evaElapsedHours={evaElapsedHours}
                    onChangeEvaElapsedHours={setEvaElapsedHours}
                    optimizationResult={optimizationResult}
                    selectedStrategyId={selectedStrategyId}
                    onSelectStrategy={setSelectedStrategyId}
                    coordinateFormat={settings.coordinateFormat}
                    onOpenEvaDashboard={() =>
                      handleSelectSection('eva-resources')
                    }
                    onCloseMobile={() => setIsRightPanelOpen(false)}
                  />
                </div>
              )}
            </>
          )}

          {activeSection === 'overview' && (
            <div className="flex-1 min-w-0 h-full">
              <MissionOverviewView
                onOpenExplorer={() => handleSelectSection('explorer')}
                onSelectSiteAndExplore={handleSelectSiteById}
              />
            </div>
          )}

          {activeSection === 'eva-resources' && (
            <div className="flex-1 min-w-0 h-full">
              <ResourceCalculatorView
                profile={evaProfile}
                onChangeProfile={setEvaProfile}
                thresholds={evaThresholds}
                onChangeThresholds={setEvaThresholds}
                elapsedHours={evaElapsedHours}
                onChangeElapsedHours={setEvaElapsedHours}
                returnProfile={returnProfile}
                onChangeReturnProfile={setReturnProfile}
                onResetAll={handleResetEvaDefaults}
              />
            </div>
          )}

          {activeSection === 'terrain-analysis' && (
            <div className="flex-1 min-w-0 h-full">
              <TerrainAnalysisView />
            </div>
          )}

          {activeSection === 'settings' && (
            <div className="flex-1 min-w-0 h-full">
              <SettingsView
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                onOpenExplorer={() => handleSelectSection('explorer')}
              />
            </div>
          )}
        </main>

        <StatusBar
          selectedLocation={selectedLocation}
          activeLayer={activeLayer}
          tileHealth={tileHealth}
          coordinateFormat={settings.coordinateFormat}
        />
      </div>
    </div>
  );
}
