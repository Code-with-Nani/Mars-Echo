import React from 'react';
import type { CoordinateFormat, ScaleUnit } from '../types/mars';
import {
  computeMarsScaleBar,
  formatCoordinatePair,
} from '../utils/marsCoordinates';

interface CoordinateDisplayProps {
  hoverCoords: { lat: number; lon: number } | null;
  selectedCoords: { lat: number; lon: number };
  resolutionDegPerPx: number;
  centerLatDeg: number;
  coordinateFormat: CoordinateFormat;
  scaleUnit: ScaleUnit;
}

export const CoordinateDisplay: React.FC<CoordinateDisplayProps> = ({
  hoverCoords,
  selectedCoords,
  resolutionDegPerPx,
  centerLatDeg,
  coordinateFormat,
  scaleUnit,
}) => {
  const scale = computeMarsScaleBar(resolutionDegPerPx, centerLatDeg, scaleUnit);

  return (
    <div className="flex flex-wrap items-center gap-3.5 rounded-md border border-[#0042A6] bg-[#07173F]/95 px-3 py-2 text-xs shadow-lg">
      {/* Mars Geodesy Scale Bar */}
      <div className="flex flex-col gap-1 pr-3 border-r border-[#0042A6]">
        <div className="flex items-center justify-between gap-2 text-[10px] font-mono tabular-nums text-[#FFFFFF]">
          <span>0</span>
          <span>{scale.label}</span>
        </div>
        <div
          className="h-1.5 border-x border-b border-[#FFFFFF]"
          style={{ width: `${scale.widthPx}px` }}
          aria-label={`Map scale: ${scale.label}`}
        />
      </div>

      {/* Selected & Live Cursor Coordinates */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <span className="mr-1.5 text-[11px] text-[#FFFFFF]/70">Selected:</span>
          <span className="font-mono text-xs font-medium tabular-nums text-[#EAFE07]">
            {formatCoordinatePair(
              selectedCoords.lat,
              selectedCoords.lon,
              coordinateFormat,
              4
            )}
          </span>
        </div>

        <span className="hidden sm:inline text-[#0042A6]" aria-hidden="true">
          |
        </span>

        <div className="hidden sm:block">
          <span className="mr-1.5 text-[11px] text-[#FFFFFF]/70">Cursor:</span>
          <span className="font-mono text-xs tabular-nums text-[#FFFFFF]">
            {hoverCoords
              ? formatCoordinatePair(hoverCoords.lat, hoverCoords.lon, coordinateFormat, 4)
              : '—'}
          </span>
        </div>
      </div>
    </div>
  );
};
