import React from 'react';
import {
  Globe2,
  MapPin,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';
import type {
  CoordinateFormat,
  ExplorerSettings,
  ScaleUnit,
} from '../types/mars';
import { MARS_MAP_LAYERS } from '../data/marsLayers';
import { MARS_REFERENCE_SITES } from '../data/marsLocations';
import { formatCoordinatePair } from '../utils/marsCoordinates';

interface MissionOverviewViewProps {
  onOpenExplorer: () => void;
  onSelectSiteAndExplore: (siteId: string) => void;
}

export const MissionOverviewView: React.FC<MissionOverviewViewProps> = ({
  onOpenExplorer,
  onSelectSiteAndExplore,
}) => {
  return (
    <div className="h-full overflow-y-auto bg-[#07173F] p-6 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Briefing Header */}
        <div className="flex flex-col gap-4 border-b border-[#0042A6] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5 max-w-2xl">
            <div className="text-xs font-medium text-[#E43700]">
              NASA Space Apps Challenge 2026 · Mission Briefing
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-[#FFFFFF]">
              MARS ECHO Surface Exploration Platform
            </h2>
            <p className="text-sm leading-relaxed text-[#FFFFFF]/75">
              A scientific GIS workspace built for astronauts and mission planners to
              inspect Martian orbital imagery, evaluate regional topography, and
              examine cataloged surface exploration zones.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenExplorer}
            className="inline-flex shrink-0 items-center gap-2 rounded-md bg-[#2F96F5] px-4 py-2 text-xs font-semibold text-[#07173F] hover:bg-[#FFFFFF] transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EAFE07]"
          >
            <Globe2 className="h-4 w-4" />
            <span>Open Mars Explorer</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Active Datasets Grid */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#FFFFFF]">
              Integrated Orbital Datasets
            </h3>
            <span className="font-mono text-xs text-[#2F96F5]">
              Equirectangular EPSG:104905
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {MARS_MAP_LAYERS.map((layer) => (
              <div
                key={layer.id}
                className="rounded-md border border-[#0042A6] bg-[#0042A6]/35 p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[#FFFFFF]">
                      {layer.name}
                    </div>
                    <div className="text-xs text-[#2F96F5]">
                      {layer.datasetTitle}
                    </div>
                  </div>
                  <span className="font-mono text-xs tabular-nums text-[#EAFE07] whitespace-nowrap">
                    {layer.resolutionLabel}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-[#FFFFFF]/75">
                  {layer.description}
                </p>
                <div className="pt-1 text-[11px] text-[#FFFFFF]/65">
                  {layer.instrument} · {layer.dataSource}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Reference Sites Directory */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#FFFFFF]">
              Primary Reference Sites
            </h3>
            <span className="text-xs text-[#FFFFFF]/70">
              Select any site to inspect in Mars Explorer
            </span>
          </div>

          <div className="overflow-hidden rounded-md border border-[#0042A6] bg-[#0042A6]/30">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#0042A6] bg-[#0042A6]/60 text-[11px] text-[#FFFFFF]/80">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Location</th>
                  <th className="px-4 py-2.5 font-medium hidden sm:table-cell">
                    Region
                  </th>
                  <th className="px-4 py-2.5 font-medium">Coordinates</th>
                  <th className="px-4 py-2.5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#0042A6]">
                {MARS_REFERENCE_SITES.filter((s) => s.isReferenceSite).map((site) => (
                  <tr
                    key={site.id}
                    className="hover:bg-[#0042A6]/45 transition-colors"
                  >
                    <td className="px-4 py-2.5 font-medium text-[#FFFFFF]">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-[#E43700]" />
                        <span>{site.name.replace(', Mars', '')}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-[#FFFFFF]/75 hidden sm:table-cell">
                      {site.region}
                    </td>
                    <td className="px-4 py-2.5 font-mono tabular-nums text-[#FFFFFF]">
                      {formatCoordinatePair(site.lat, site.lon, 'hemisphere', 2)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => onSelectSiteAndExplore(site.id)}
                        className="text-xs font-medium text-[#2F96F5] hover:text-[#FFFFFF] transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

interface SettingsViewProps {
  settings: ExplorerSettings;
  onUpdateSettings: (patch: Partial<ExplorerSettings>) => void;
  onOpenExplorer: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onOpenExplorer,
}) => {
  const coordFormats: { id: CoordinateFormat; label: string; example: string }[] = [
    { id: 'hemisphere', label: 'Hemisphere (N/S, E/W)', example: '18.3847° N, 77.4509° E' },
    { id: 'decimal', label: 'Signed Decimal (±180°)', example: '18.3847°, 77.4509°' },
    { id: 'east360', label: 'Planetocentric East (0–360°)', example: '18.3847°, 77.4509° E' },
  ];

  const scaleUnits: { id: ScaleUnit; label: string }[] = [
    { id: 'metric', label: 'Metric (km / m)' },
    { id: 'miles', label: 'Statute Miles (mi)' },
  ];

  return (
    <div className="h-full overflow-y-auto bg-[#07173F] p-6 lg:p-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-[#0042A6] pb-4">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="h-5 w-5 text-[#2F96F5]" />
            <div>
              <h2 className="text-lg font-semibold text-[#FFFFFF]">
                Explorer Preferences
              </h2>
              <p className="text-xs text-[#FFFFFF]/70">
                Configure coordinate notation, map grid overlays, and scale bar units.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenExplorer}
            className="rounded-md border border-[#2F96F5]/50 bg-[#0042A6] px-3 py-1.5 text-xs font-medium text-[#FFFFFF] hover:bg-[#0960E1] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F96F5]"
          >
            Back to Map
          </button>
        </div>

        {/* Coordinate Notation */}
        <div className="rounded-md border border-[#0042A6] bg-[#0042A6]/30 p-4 space-y-3">
          <div className="text-xs font-semibold text-[#FFFFFF]">
            Coordinate Display Convention
          </div>
          <div className="space-y-2">
            {coordFormats.map((fmt) => {
              const selected = settings.coordinateFormat === fmt.id;
              return (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => onUpdateSettings({ coordinateFormat: fmt.id })}
                  className={`flex w-full items-center justify-between rounded-md border px-3 py-2.5 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F96F5] ${
                    selected
                      ? 'border-[#2F96F5] bg-[#0042A6] text-[#FFFFFF]'
                      : 'border-[#0042A6] bg-[#07173F]/60 text-[#FFFFFF]/80 hover:text-[#FFFFFF]'
                  }`}
                >
                  <span className="font-medium">{fmt.label}</span>
                  <span
                    className={`font-mono text-[11px] tabular-nums ${
                      selected ? 'text-[#EAFE07]' : 'text-[#2F96F5]'
                    }`}
                  >
                    {fmt.example}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Map Overlays & Scale Units */}
        <div className="rounded-md border border-[#0042A6] bg-[#0042A6]/30 p-4 space-y-4">
          <div className="text-xs font-semibold text-[#FFFFFF]">
            Map Overlays & Geodesy
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-[#FFFFFF]">
                Latitude / Longitude Graticule
              </div>
              <div className="text-[11px] text-[#FFFFFF]/70">
                Display planetocentric coordinate grid lines on the map canvas.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.showGraticule}
              onClick={() =>
                onUpdateSettings({ showGraticule: !settings.showGraticule })
              }
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F96F5] ${
                settings.showGraticule
                  ? 'border-[#2F96F5] bg-[#0960E1] text-[#FFFFFF]'
                  : 'border-[#0042A6] bg-[#07173F] text-[#FFFFFF]/75'
              }`}
            >
              {settings.showGraticule ? 'Enabled' : 'Disabled'}
            </button>
          </div>

          <div className="flex items-center justify-between border-t border-[#0042A6] pt-4">
            <div>
              <div className="text-xs font-medium text-[#FFFFFF]">
                Reference Site Markers
              </div>
              <div className="text-[11px] text-[#FFFFFF]/70">
                Render clickable reticles for cataloged landing sites and landmarks.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.showReferenceSites}
              onClick={() =>
                onUpdateSettings({
                  showReferenceSites: !settings.showReferenceSites,
                })
              }
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F96F5] ${
                settings.showReferenceSites
                  ? 'border-[#2F96F5] bg-[#0960E1] text-[#FFFFFF]'
                  : 'border-[#0042A6] bg-[#07173F] text-[#FFFFFF]/75'
              }`}
            >
              {settings.showReferenceSites ? 'Visible' : 'Hidden'}
            </button>
          </div>

          <div className="flex items-center justify-between border-t border-[#0042A6] pt-4">
            <div>
              <div className="text-xs font-medium text-[#FFFFFF]">
                Scale Bar Units
              </div>
              <div className="text-[11px] text-[#FFFFFF]/70">
                Calculated using IAU 2000 Mars equatorial radius (3,396.19 km).
              </div>
            </div>
            <div className="flex items-center gap-1 rounded-md border border-[#0042A6] bg-[#07173F] p-0.5">
              {scaleUnits.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => onUpdateSettings({ scaleUnit: u.id })}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                    settings.scaleUnit === u.id
                      ? 'bg-[#0960E1] text-[#FFFFFF]'
                      : 'text-[#FFFFFF]/75 hover:text-[#FFFFFF]'
                  }`}
                >
                  {u.id === 'metric' ? 'Metric' : 'Miles'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
