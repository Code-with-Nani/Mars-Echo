import { useState, useCallback } from 'react';
import type {
  ElevationDatasetId,
  ExplorationRegion,
  ExplorerSettings,
  FilterableMarkerCategory,
  MapLayerId,
  MarsLocation,
  NavSectionId,
  TerrainAnalysisScope,
  TerrainOverlayCellInfo,
  TileHealthState,
} from './types/mars';
import {
  DEFAULT_SLOPE_THRESHOLDS,
  type SlopeThresholds,
} from './utils/terrainAnalyzer';
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
import { StatusBar } from './components/StatusBar';
import {
  MissionOverviewView,
  SettingsView,
  PlannedModuleView,
} from './components/AuxiliaryViews';
import { ResourceCalculatorView } from './components/ResourceCalculatorView';
import { TerrainAnalysisView } from './components/TerrainAnalysisView';

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

  const handleSelectSiteAndFly = useCallback(
    (location: MarsLocation) => {
      setSelectedLocation(location);
      setActiveSection('explorer');
      triggerFlyTo(location.lat, location.lon, location.recommendedZoom ?? 7);
    },
    [triggerFlyTo]
  );

  const handleSelectRegion = useCallback(
    (region: ExplorationRegion) => {
      setSelectedRegion(region);
      setActiveSection('explorer');
      triggerFlyTo(region.centerLat, region.centerLon, region.recommendedZoom);
    },
    [triggerFlyTo]
  );

  const handleSearchCoordinate = useCallback(
    (lat: number, lon: number) => {
      const customLoc = createCustomSurfaceLocation(lat, lon);
      setSelectedLocation(customLoc);
      setActiveSection('explorer');
      triggerFlyTo(lat, lon, 7);
    },
    [triggerFlyTo]
  );

  const handleResetToJezero = useCallback(() => {
    setSelectedLocation(JEZERO_CRATER_SITE);
    setSelectedRegion(DEFAULT_EXPLORATION_REGION);
    setActiveSection('explorer');
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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#07173F] text-[#FFFFFF]">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
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
          {activeSection === 'explorer' && (
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
                />
              </div>

              {isRightPanelOpen && (
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
            </>
          )}

          {activeSection === 'overview' && (
            <div className="flex-1 min-w-0 h-full">
              <MissionOverviewView
                onOpenExplorer={() => setActiveSection('explorer')}
                onSelectSiteAndExplore={handleSelectSiteById}
              />
            </div>
          )}

          {activeSection === 'eva-resources' && (
            <div className="flex-1 min-w-0 h-full">
              <ResourceCalculatorView />
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
                onOpenExplorer={() => setActiveSection('explorer')}
              />
            </div>
          )}

          {(activeSection === 'route-planning' ||
            activeSection === 'science-locations' ||
            activeSection === 'mission-data') && (
            <div className="flex-1 min-w-0 h-full">
              <PlannedModuleView
                sectionId={activeSection}
                onOpenExplorer={() => setActiveSection('explorer')}
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
