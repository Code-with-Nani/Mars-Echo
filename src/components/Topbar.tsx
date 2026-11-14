import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  MapPin,
  Menu,
  PanelRightClose,
  PanelRightOpen,
  UserCheck,
  Database,
} from 'lucide-react';
import type { MarsLocation, NavSectionId } from '../types/mars';
import { MARS_REFERENCE_SITES } from '../data/marsLocations';
import { parseMarsCoordinateQuery, formatCoordinatePair } from '../utils/marsCoordinates';

interface TopbarProps {
  activeSection: NavSectionId;
  selectedLocation: MarsLocation;
  activeDataSource: string;
  isRightPanelOpen: boolean;
  onToggleRightPanel: () => void;
  onOpenMobileSidebar: () => void;
  onSelectSite: (location: MarsLocation) => void;
  onSearchCoordinate: (lat: number, lon: number) => void;
  onFocusSelectedLocation: () => void;
}

const SECTION_TITLES: Record<NavSectionId, string> = {
  overview: 'Mission Overview',
  explorer: 'Mars Surface Explorer',
  'eva-resources': 'EVA Resource Monitor',
  'terrain-analysis': 'Terrain Analysis',
  'route-planning': 'Route Planning',
  'science-locations': 'Science Locations',
  'mission-data': 'Mission Data',
  settings: 'System Settings',
};

export const Topbar: React.FC<TopbarProps> = ({
  activeSection,
  selectedLocation,
  activeDataSource,
  isRightPanelOpen,
  onToggleRightPanel,
  onOpenMobileSidebar,
  onSelectSite,
  onSearchCoordinate,
  onFocusSelectedLocation,
}) => {
  const [query, setQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchFocused(false);
      }
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const parsedCoord = parseMarsCoordinateQuery(query);
  const trimmedQuery = query.trim().toLowerCase();

  const matchingSites = trimmedQuery
    ? MARS_REFERENCE_SITES.filter(
        (site) =>
          site.name.toLowerCase().includes(trimmedQuery) ||
          site.region.toLowerCase().includes(trimmedQuery)
      )
    : MARS_REFERENCE_SITES.slice(0, 5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchFeedback(null);

    if (parsedCoord) {
      onSearchCoordinate(parsedCoord.lat, parsedCoord.lon);
      setIsSearchFocused(false);
      return;
    }

    if (trimmedQuery && matchingSites.length > 0) {
      onSelectSite(matchingSites[0]);
      setQuery(matchingSites[0].name.replace(', Mars', ''));
      setIsSearchFocused(false);
      return;
    }

    if (trimmedQuery) {
      setSearchFeedback('Enter valid Mars coordinates (e.g. 18.38° N, 77.45° E) or site name.');
    }
  };

  return (
    <header className="relative z-20 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[#0042A6] bg-[#07173F] px-3 sm:px-4">
      {/* Left: Title + Active Location Indicator */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="rounded-md border border-[#0042A6] bg-[#0042A6]/50 p-1.5 text-[#FFFFFF]/80 hover:bg-[#0042A6] hover:text-[#FFFFFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F96F5] lg:hidden"
          aria-label="Open navigation sidebar"
        >
          <Menu className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2.5 min-w-0">
          <h1 className="text-sm sm:text-[15px] font-semibold tracking-tight text-[#FFFFFF] whitespace-nowrap">
            {SECTION_TITLES[activeSection]}
          </h1>
          <span className="hidden sm:inline text-[#FFFFFF]/35" aria-hidden="true">
            ·
          </span>
          <button
            type="button"
            onClick={onFocusSelectedLocation}
            className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-[#2F96F5] hover:text-[#FFFFFF] transition-colors truncate max-w-[200px] focus-visible:outline-none focus-visible:underline"
            title="Center map on active location"
          >
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#E43700]" />
            <span className="truncate">
              {selectedLocation.name.replace(', Mars', '')}
            </span>
          </button>
        </div>
      </div>

      {/* Center: Coordinate & Location Search */}
      <div
        ref={searchContainerRef}
        className="relative flex-1 max-w-md mx-auto"
      >
        <form onSubmit={handleSubmit} className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#2F96F5]"
            aria-hidden="true"
          />
          <input
            type="text"
            value={query}
            onFocus={() => {
              setIsSearchFocused(true);
              setSearchFeedback(null);
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearchFeedback(null);
              if (!isSearchFocused) setIsSearchFocused(true);
            }}
            placeholder="Search coordinates (18.38° N, 77.45° E) or site..."
            aria-label="Search Martian coordinates or locations"
            className="h-9 w-full rounded-md border border-[#0042A6] bg-[#0042A6]/25 pl-8 pr-3 text-xs text-[#FFFFFF] placeholder:text-[#FFFFFF]/55 focus:border-[#2F96F5] focus:bg-[#07173F] focus:outline-none"
          />
        </form>

        {isSearchFocused && (
          <div className="absolute left-0 right-0 top-10 z-50 rounded-md border border-[#0960E1] bg-[#07173F] py-1.5 shadow-xl">
            {searchFeedback && (
              <div className="px-3 py-1.5 text-xs text-[#E43700]">
                {searchFeedback}
              </div>
            )}

            {parsedCoord && (
              <button
                type="button"
                onClick={() => {
                  onSearchCoordinate(parsedCoord.lat, parsedCoord.lon);
                  setIsSearchFocused(false);
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-[#0042A6] transition-colors"
              >
                <span className="font-medium text-[#2F96F5]">
                  Navigate to coordinate
                </span>
                <span className="font-mono tabular-nums text-[#EAFE07]">
                  {formatCoordinatePair(parsedCoord.lat, parsedCoord.lon, 'hemisphere', 4)}
                </span>
              </button>
            )}

            {matchingSites.length > 0 && (
              <div>
                <div className="px-3 py-1 text-[11px] font-medium text-[#FFFFFF]/65">
                  Martian Reference Locations
                </div>
                {matchingSites.map((site) => (
                  <button
                    key={site.id}
                    type="button"
                    onClick={() => {
                      onSelectSite(site);
                      setQuery(site.name.replace(', Mars', ''));
                      setIsSearchFocused(false);
                    }}
                    className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs hover:bg-[#0042A6] transition-colors"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium text-[#FFFFFF] truncate">
                        {site.name.replace(', Mars', '')}
                      </span>
                      <span className="block text-[11px] text-[#FFFFFF]/70 truncate">
                        {site.region}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-[#2F96F5]">
                      {formatCoordinatePair(site.lat, site.lon, 'hemisphere', 2)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {!parsedCoord && matchingSites.length === 0 && !searchFeedback && (
              <div className="px-3 py-2 text-xs text-[#FFFFFF]/70">
                No matching sites. Try e.g. &ldquo;Jezero&rdquo; or &ldquo;18.38, 77.45&rdquo;.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Data Source Indicator, Panel Toggle & Mission Profile */}
      <div className="flex items-center gap-3 shrink-0">
        <div
          className="hidden xl:flex items-center gap-1.5 text-xs text-[#FFFFFF]/70 whitespace-nowrap"
          title="Active planetary map tile provider"
        >
          <Database className="h-3.5 w-3.5 text-[#2F96F5]" />
          <span>Source:</span>
          <span className="font-medium text-[#FFFFFF]">{activeDataSource}</span>
        </div>

        {activeSection === 'explorer' && (
          <button
            type="button"
            onClick={onToggleRightPanel}
            className="flex items-center gap-1.5 rounded-md border border-[#0960E1] bg-[#0042A6] px-2.5 py-1.5 text-xs font-medium text-[#FFFFFF] hover:bg-[#0960E1] hover:border-[#2F96F5] transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F96F5]"
            aria-label={
              isRightPanelOpen
                ? 'Collapse Location Intelligence panel'
                : 'Expand Location Intelligence panel'
            }
            title={
              isRightPanelOpen
                ? 'Hide Location Intelligence'
                : 'Show Location Intelligence'
            }
          >
            {isRightPanelOpen ? (
              <PanelRightClose className="h-3.5 w-3.5 text-[#2F96F5]" />
            ) : (
              <PanelRightOpen className="h-3.5 w-3.5 text-[#EAFE07]" />
            )}
            <span className="hidden md:inline">Intelligence</span>
          </button>
        )}

        <div ref={profileRef} className="relative">
          <button
            type="button"
            onClick={() => setIsProfileOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-md border border-[#0960E1] bg-[#0042A6] px-2.5 py-1.5 text-xs font-medium text-[#FFFFFF] hover:bg-[#0960E1] hover:border-[#2F96F5] transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F96F5]"
            aria-expanded={isProfileOpen}
          >
            <UserCheck className="h-3.5 w-3.5 text-[#2F96F5]" />
            <span className="hidden sm:inline">Flight Planner</span>
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 top-10 z-50 w-64 rounded-md border border-[#0960E1] bg-[#07173F] p-3 shadow-xl">
              <div className="text-xs font-semibold text-[#FFFFFF]">
                Surface Exploration Team
              </div>
              <div className="mt-0.5 text-[11px] text-[#FFFFFF]/70">
                MARS ECHO Mission Planning Workstation
              </div>
              <div className="mt-2.5 border-t border-[#0042A6] pt-2.5 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[#FFFFFF]/70">Role</span>
                  <span className="text-[#FFFFFF]">Mission Planner</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#FFFFFF]/70">Challenge Track</span>
                  <span className="text-[#2F96F5]">Space Apps 2026</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#FFFFFF]/70">Telemetry Link</span>
                  <span className="text-[#FFFFFF]/70">Reference Only</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
