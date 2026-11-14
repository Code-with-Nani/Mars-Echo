import React from 'react';
import {
  Compass,
  Globe2,
  Activity,
  Mountain,
  Route,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type { NavSectionId } from '../types/mars';

interface SidebarProps {
  activeSection: NavSectionId;
  onSelectSection: (section: NavSectionId) => void;
  selectedLocationName: string;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

interface NavItemConfig {
  id: NavSectionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItemConfig[] = [
  { id: 'overview', label: 'Mission Overview', icon: Compass },
  { id: 'explorer', label: 'Mars Explorer', icon: Globe2 },
  { id: 'eva-resources', label: 'EVA Resource Monitor', icon: Activity },
  { id: 'terrain-analysis', label: 'Terrain Analysis', icon: Mountain },
  { id: 'route-planning', label: 'Return Path Planning', icon: Route },
  { id: 'settings', label: 'Settings', icon: SlidersHorizontal },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  selectedLocationName,
  isOpenMobile,
  onCloseMobile,
}) => {
  return (
    <>
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-30 bg-[#07173F]/80 lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[248px] shrink-0 flex-col border-r border-[#0042A6] bg-[#07173F] transition-transform duration-200 ease-out lg:static lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Primary Mission Navigation"
      >
        {/* Brand Header */}
        <div className="flex h-14 items-center justify-between border-b border-[#0042A6] px-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <svg
              viewBox="0 0 28 28"
              className="h-7 w-7 shrink-0"
              aria-hidden="true"
            >
              <circle
                cx="14"
                cy="14"
                r="12"
                fill="#07173F"
                stroke="#0042A6"
                strokeWidth="1.4"
              />
              <circle
                cx="14"
                cy="14"
                r="6.5"
                fill="#8E1100"
                stroke="#E43700"
                strokeWidth="1"
              />
              <path
                d="M14 2.5 A11.5 11.5 0 0 1 25.5 14"
                fill="none"
                stroke="#2F96F5"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <circle cx="14" cy="14" r="1.5" fill="#EAFE07" />
            </svg>
            <div className="min-w-0">
              <div className="text-sm font-semibold tracking-wider text-[#FFFFFF] whitespace-nowrap">
                MARS ECHO
              </div>
              <div className="text-[11px] text-[#FFFFFF]/70 truncate">
                Surface Exploration GIS
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded p-1.5 text-[#FFFFFF]/70 hover:bg-[#0042A6] hover:text-[#FFFFFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F96F5] lg:hidden"
            aria-label="Close navigation menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="mb-2 px-2.5 text-[11px] font-medium tracking-wide text-[#FFFFFF]/60">
            Navigation
          </div>
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectSection(item.id);
                      onCloseMobile();
                    }}
                    className={`group flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-left text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F96F5] ${
                      isActive
                        ? 'border-[#2F96F5] bg-[#0042A6] text-[#FFFFFF]'
                        : 'border-transparent text-[#FFFFFF]/80 hover:bg-[#0042A6]/45 hover:text-[#FFFFFF]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-colors ${
                          isActive
                            ? 'text-[#2F96F5]'
                            : 'text-[#FFFFFF]/75 group-hover:text-[#2F96F5]'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom Mission Status Section */}
        <div className="border-t border-[#0042A6] bg-[#07173F] px-4 py-3.5">
          <div className="mb-2 text-[11px] font-medium text-[#FFFFFF]/65">
            Mission Status
          </div>
          <dl className="space-y-1.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-[#FFFFFF]/70">Phase</dt>
              <dd className="font-mono text-[11px] text-[#FFFFFF] whitespace-nowrap">
                REDLINE Module 4
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-[#FFFFFF]/70">Focus Site</dt>
              <dd
                className="truncate font-medium text-[#E43700] max-w-[130px]"
                title={selectedLocationName}
              >
                {selectedLocationName.replace(', Mars', '')}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-[#FFFFFF]/70">CRS</dt>
              <dd className="font-mono text-[11px] text-[#2F96F5] whitespace-nowrap">
                EPSG:104905
              </dd>
            </div>
          </dl>
        </div>
      </aside>
    </>
  );
};
