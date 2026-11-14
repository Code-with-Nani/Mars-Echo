import React, { useMemo, useState } from 'react';
import { TrendingDown } from 'lucide-react';
import {
  calculateMissionResources,
  generateMissionTimeline,
  type AstronautResourceProfile,
  type MissionResourceReport,
  type ResourceThresholds,
} from '../../utils/resourceCalculator';

interface ResourceConsumptionChartProps {
  profile: AstronautResourceProfile;
  thresholds: ResourceThresholds;
  currentReport: MissionResourceReport;
}

const CHART_WIDTH = 760;
const CHART_HEIGHT = 270;
const PAD_LEFT = 48;
const PAD_RIGHT = 24;
const PAD_TOP = 20;
const PAD_BOTTOM = 36;

export const ResourceConsumptionChart: React.FC<ResourceConsumptionChartProps> = ({
  profile,
  thresholds,
  currentReport,
}) => {
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);

  const timeline = useMemo(
    () => generateMissionTimeline(profile, thresholds, 0.5),
    [profile, thresholds]
  );

  const maxHours = Math.max(0.5, profile.availableMissionHours);
  const plotWidth = CHART_WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

  const xForHour = (hr: number) =>
    PAD_LEFT + (Math.max(0, Math.min(maxHours, hr)) / maxHours) * plotWidth;
  const yForPct = (pct: number) =>
    PAD_TOP + ((100 - Math.max(0, Math.min(100, pct))) / 100) * plotHeight;

  const oxygenPath = useMemo(() => {
    if (timeline.length === 0) return '';
    return timeline
      .map(
        (pt, idx) =>
          `${idx === 0 ? 'M' : 'L'} ${xForHour(pt.elapsedHours).toFixed(2)} ${yForPct(pt.oxygenPct).toFixed(2)}`
      )
      .join(' ');
  }, [timeline, maxHours]);

  const batteryPath = useMemo(() => {
    if (timeline.length === 0) return '';
    return timeline
      .map(
        (pt, idx) =>
          `${idx === 0 ? 'M' : 'L'} ${xForHour(pt.elapsedHours).toFixed(2)} ${yForPct(pt.batteryPct).toFixed(2)}`
      )
      .join(' ');
  }, [timeline, maxHours]);

  const coolingPath = useMemo(() => {
    if (timeline.length === 0) return '';
    return timeline
      .map(
        (pt, idx) =>
          `${idx === 0 ? 'M' : 'L'} ${xForHour(pt.elapsedHours).toFixed(2)} ${yForPct(pt.coolingPct).toFixed(2)}`
      )
      .join(' ');
  }, [timeline, maxHours]);

  const inspectedHour =
    hoveredHour !== null ? hoveredHour : currentReport.elapsedHours;

  const inspectedReport = useMemo(() => {
    if (hoveredHour === null) return currentReport;
    return calculateMissionResources(profile, hoveredHour, thresholds);
  }, [hoveredHour, currentReport, profile, thresholds]);

  const cursorX = xForHour(currentReport.elapsedHours);
  const inspectedX = xForHour(inspectedHour);

  // X-axis tick marks
  const xTicks = useMemo(() => {
    const step = maxHours <= 8 ? 1 : maxHours <= 16 ? 2 : 4;
    const ticks: number[] = [];
    for (let t = 0; t <= maxHours; t += step) {
      ticks.push(Math.round(t * 100) / 100);
    }
    if (ticks[ticks.length - 1] < maxHours) {
      ticks.push(Math.round(maxHours * 100) / 100);
    }
    return ticks;
  }, [maxHours]);

  const yTicks = [0, 25, 50, 75, 100];

  const handlePointerMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const svgX = ((e.clientX - rect.left) / rect.width) * CHART_WIDTH;
    const ratio = (svgX - PAD_LEFT) / plotWidth;
    if (ratio < 0 || ratio > 1) {
      setHoveredHour(null);
      return;
    }
    const rawHour = ratio * profile.availableMissionHours;
    const snapped = Math.round(rawHour * 20) / 20;
    setHoveredHour(Math.max(0, Math.min(profile.availableMissionHours, snapped)));
  };

  return (
    <section
      className="rounded-md border border-[#0042A6] bg-[#0042A6]/25 p-4 space-y-3"
      aria-label="Resource Consumption Over Mission Time"
    >
      {/* Header + Legend */}
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between border-b border-[#0042A6]/80 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-[#2F96F5]" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-[#FFFFFF]">
              Projected Resource Consumption Curve
            </h3>
          </div>
          <p className="text-[11px] text-[#FFFFFF]/70">
            Deterministic decay calculated from T+0h to T+{profile.availableMissionHours.toFixed(1)}h via resourceCalculator
          </p>
        </div>

        {/* Line Legend (clean unboxed indicators) */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1.5 text-[#FFFFFF]">
            <svg width="20" height="6" aria-hidden="true">
              <line
                x1="0"
                y1="3"
                x2="20"
                y2="3"
                stroke="#2F96F5"
                strokeWidth="2.5"
              />
            </svg>
            <span>Oxygen</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-[#FFFFFF]">
            <svg width="20" height="6" aria-hidden="true">
              <line
                x1="0"
                y1="3"
                x2="20"
                y2="3"
                stroke="#FFFFFF"
                strokeWidth="2.5"
                strokeDasharray="5 3"
              />
            </svg>
            <span>Battery</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-[#FFFFFF]">
            <svg width="20" height="6" aria-hidden="true">
              <line
                x1="0"
                y1="3"
                x2="20"
                y2="3"
                stroke="#EAFE07"
                strokeWidth="2.5"
                strokeDasharray="2 3"
              />
            </svg>
            <span>Cooling</span>
          </span>
        </div>
      </div>

      {/* Live Inspected Point Readout HUD */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-[#0042A6] bg-[#07173F] px-3 py-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[#FFFFFF]/65">
            {hoveredHour !== null ? 'Inspected Time:' : 'Current Sim Time:'}
          </span>
          <span className="font-mono font-semibold tabular-nums text-[#EAFE07]">
            T+{inspectedReport.elapsedHours.toFixed(2)}h
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 font-mono tabular-nums">
          <span className="text-[#2F96F5]">
            O2: {inspectedReport.oxygen.percentage.toFixed(1)}%
          </span>
          <span className="text-[#FFFFFF]">
            Battery: {inspectedReport.battery.percentage.toFixed(1)}%
          </span>
          <span className="text-[#EAFE07]">
            Cooling: {inspectedReport.cooling.percentage.toFixed(1)}%
          </span>
          <span className="text-[#FFFFFF]/75">
            Window Left: {inspectedReport.missionTime.remainingHours.toFixed(2)}h
          </span>
        </div>
      </div>

      {/* Responsive SVG Line Chart */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="w-full min-w-[460px] h-auto select-none cursor-crosshair rounded border border-[#0042A6]/80 bg-[#07173F]"
          onMouseMove={handlePointerMove}
          onMouseLeave={() => setHoveredHour(null)}
          role="img"
          aria-label="Chart of Oxygen, Battery, and Cooling remaining percentage over mission hours"
        >
          {/* Horizontal Y-Gridlines & Labels */}
          {yTicks.map((tick) => {
            const y = yForPct(tick);
            return (
              <g key={tick}>
                <line
                  x1={PAD_LEFT}
                  y1={y}
                  x2={CHART_WIDTH - PAD_RIGHT}
                  y2={y}
                  stroke="#0042A6"
                  strokeOpacity={tick === 0 || tick === 100 ? 0.9 : 0.45}
                  strokeWidth="1"
                />
                <text
                  x={PAD_LEFT - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fill="#FFFFFF"
                  fillOpacity="0.65"
                  fontSize="10"
                  fontFamily="IBM Plex Mono, monospace"
                >
                  {tick}%
                </text>
              </g>
            );
          })}

          {/* Vertical X-Gridlines & Hour Labels */}
          {xTicks.map((hr) => {
            const x = xForHour(hr);
            return (
              <g key={hr}>
                <line
                  x1={x}
                  y1={PAD_TOP}
                  x2={x}
                  y2={CHART_HEIGHT - PAD_BOTTOM}
                  stroke="#0042A6"
                  strokeOpacity="0.4"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={CHART_HEIGHT - PAD_BOTTOM + 16}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fillOpacity="0.7"
                  fontSize="10"
                  fontFamily="IBM Plex Mono, monospace"
                >
                  {hr}h
                </text>
              </g>
            );
          })}

          {/* Warning Threshold Reference Line */}
          <line
            x1={PAD_LEFT}
            y1={yForPct(thresholds.warningPct)}
            x2={CHART_WIDTH - PAD_RIGHT}
            y2={yForPct(thresholds.warningPct)}
            stroke="#EAFE07"
            strokeOpacity="0.4"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <text
            x={CHART_WIDTH - PAD_RIGHT - 4}
            y={yForPct(thresholds.warningPct) - 4}
            textAnchor="end"
            fill="#EAFE07"
            fillOpacity="0.85"
            fontSize="9.5"
            fontFamily="IBM Plex Mono, monospace"
          >
            Warning ({thresholds.warningPct}%)
          </text>

          {/* Critical Threshold Reference Line */}
          <line
            x1={PAD_LEFT}
            y1={yForPct(thresholds.criticalPct)}
            x2={CHART_WIDTH - PAD_RIGHT}
            y2={yForPct(thresholds.criticalPct)}
            stroke="#E43700"
            strokeOpacity="0.65"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <text
            x={CHART_WIDTH - PAD_RIGHT - 4}
            y={yForPct(thresholds.criticalPct) - 4}
            textAnchor="end"
            fill="#E43700"
            fontSize="9.5"
            fontFamily="IBM Plex Mono, monospace"
          >
            Critical ({thresholds.criticalPct}%)
          </text>

          {/* Resource Decay Curves */}
          {oxygenPath && (
            <path
              d={oxygenPath}
              fill="none"
              stroke="#2F96F5"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          )}
          {batteryPath && (
            <path
              d={batteryPath}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.2"
              strokeDasharray="6 3"
              strokeLinejoin="round"
            />
          )}
          {coolingPath && (
            <path
              d={coolingPath}
              fill="none"
              stroke="#EAFE07"
              strokeWidth="2.4"
              strokeDasharray="2 3"
              strokeLinejoin="round"
            />
          )}

          {/* Hover Inspection Crosshair (when hovering away from current time) */}
          {hoveredHour !== null && (
            <line
              x1={inspectedX}
              y1={PAD_TOP}
              x2={inspectedX}
              y2={CHART_HEIGHT - PAD_BOTTOM}
              stroke="#FFFFFF"
              strokeOpacity="0.45"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
          )}

          {/* Active Simulation Elapsed Time Cursor */}
          <line
            x1={cursorX}
            y1={PAD_TOP}
            x2={cursorX}
            y2={CHART_HEIGHT - PAD_BOTTOM}
            stroke="#2F96F5"
            strokeWidth="1.5"
          />

          {/* Active Data Point Markers at Inspected / Current Time */}
          <circle
            cx={inspectedX}
            cy={yForPct(inspectedReport.oxygen.percentage)}
            r="4.5"
            fill="#2F96F5"
            stroke="#07173F"
            strokeWidth="1.5"
          />
          <circle
            cx={inspectedX}
            cy={yForPct(inspectedReport.battery.percentage)}
            r="4.5"
            fill="#FFFFFF"
            stroke="#07173F"
            strokeWidth="1.5"
          />
          <circle
            cx={inspectedX}
            cy={yForPct(inspectedReport.cooling.percentage)}
            r="4.5"
            fill="#EAFE07"
            stroke="#07173F"
            strokeWidth="1.5"
          />

          {/* Axis Title */}
          <text
            x={PAD_LEFT + plotWidth / 2}
            y={CHART_HEIGHT - 6}
            textAnchor="middle"
            fill="#FFFFFF"
            fillOpacity="0.6"
            fontSize="10"
            fontFamily="Fira Sans, sans-serif"
          >
            Simulated Elapsed Mission Time (hours)
          </text>
        </svg>
      </div>
    </section>
  );
};
