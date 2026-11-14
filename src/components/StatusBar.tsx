import React from 'react';
import type {
  CoordinateFormat,
  MarsLayerConfig,
  MarsLocation,
  TileHealthState,
} from '../types/mars';
import { formatCoordinatePair } from '../utils/marsCoordinates';

interface StatusBarProps {
  selectedLocation: MarsLocation;
  activeLayer: MarsLayerConfig;
  tileHealth: TileHealthState;
  coordinateFormat: CoordinateFormat;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  selectedLocation,
  activeLayer,
  tileHealth,
  coordinateFormat,
}) => {
  const healthLabel =
    tileHealth === 'loading'
      ? 'Syncing map tiles...'
      : tileHealth === 'degraded'
        ? 'Tile feed degraded'
        : 'Available (Reference Imagery)';

  const healthColorClass =
    tileHealth === 'degraded'
      ? 'text-[#E43700]'
      : tileHealth === 'loading'
        ? 'text-[#2F96F5]'
        : 'text-[#FFFFFF]';

  return (
    <footer className="flex h-8 shrink-0 items-center justify-between gap-4 border-t border-[#0042A6] bg-[#07173F] px-4 text-[11px] text-[#FFFFFF]/70">
      <div className="flex items-center gap-3 min-w-0 overflow-hidden">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span>Coordinates:</span>
          <span className="font-mono tabular-nums text-[#EAFE07]">
            {formatCoordinatePair(
              selectedLocation.lat,
              selectedLocation.lon,
              coordinateFormat,
              4
            )}
          </span>
        </div>

        <span className="hidden sm:inline text-[#0042A6]" aria-hidden="true">
          |
        </span>

        <div className="hidden sm:flex items-center gap-1.5 whitespace-nowrap truncate">
          <span>Layer:</span>
          <span className="text-[#FFFFFF]">{activeLayer.name}</span>
        </div>

        <span className="hidden md:inline text-[#0042A6]" aria-hidden="true">
          |
        </span>

        <div className="hidden md:flex items-center gap-1.5 whitespace-nowrap truncate">
          <span>Data Source:</span>
          <span className="text-[#2F96F5]">{activeLayer.dataSource}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden lg:flex items-center gap-1.5 whitespace-nowrap">
          <span>Availability:</span>
          <span className={healthColorClass}>{healthLabel}</span>
        </div>

        <span className="hidden lg:inline text-[#0042A6]" aria-hidden="true">
          |
        </span>

        <span className="font-mono text-[#FFFFFF]/65 whitespace-nowrap">
          MARS ECHO v0.1.0
        </span>
      </div>
    </footer>
  );
};
