import React from 'react';
import type { ResourceStatus } from '../../utils/resourceCalculator';
import { getResourceStatusStyle } from '../../utils/resourceStatusStyles';

export interface ResourceStatusCardProps {
  title: string;
  Icon: React.ComponentType<{ className?: string }>;
  remainingDisplay: string;
  remainingUnit: string;
  initialDisplay: string;
  consumptionRateDisplay: string;
  percentage: number;
  status: ResourceStatus;
  zeroMarkHours: number | null;
}

export const ResourceStatusCard: React.FC<ResourceStatusCardProps> = ({
  title,
  Icon,
  remainingDisplay,
  remainingUnit,
  initialDisplay,
  consumptionRateDisplay,
  percentage,
  status,
  zeroMarkHours,
}) => {
  const style = getResourceStatusStyle(status);
  const StatusIcon = style.Icon;
  const clampedPct = Math.max(0, Math.min(100, percentage));

  // Circular radial indicator geometry
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedPct / 100) * circumference;

  return (
    <article
      className={`rounded-md border bg-[#0042A6]/25 p-4 flex flex-col justify-between gap-3.5 transition-colors ${style.borderClass}`}
      aria-label={`${title} status`}
    >
      {/* Card Header: Resource Title + Non-Hue-Only Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className="h-4 w-4 shrink-0 text-[#2F96F5]" aria-hidden="true" />
          <h3 className="text-xs font-semibold text-[#FFFFFF] truncate">
            {title}
          </h3>
        </div>

        <span
          className={`inline-flex items-center gap-1 text-xs font-semibold shrink-0 whitespace-nowrap ${style.labelContainerClass}`}
        >
          <StatusIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{status}</span>
        </span>
      </div>

      {/* Primary Metric + Circular Ring Gauge */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-2xl font-semibold tabular-nums text-[#FFFFFF]">
              {remainingDisplay}
            </span>
            <span className="font-mono text-xs text-[#FFFFFF]/70">
              {remainingUnit}
            </span>
          </div>
          <div className="mt-0.5 font-mono text-xs tabular-nums text-[#FFFFFF]/80">
            <span>{clampedPct.toFixed(1)}% remaining</span>
          </div>
        </div>

        {/* Circular SVG Indicator */}
        <div
          className="relative flex h-14 w-14 shrink-0 items-center justify-center"
          role="img"
          aria-label={`${title}: ${clampedPct.toFixed(1)}% remaining`}
        >
          <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90">
            <circle
              cx="28"
              cy="28"
              r={radius}
              fill="none"
              stroke="#07173F"
              strokeWidth="5"
            />
            <circle
              cx="28"
              cy="28"
              r={radius}
              fill="none"
              stroke={style.hex}
              strokeWidth="5"
              strokeLinecap="butt"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-150"
            />
          </svg>
          <span className="absolute font-mono text-[11px] font-semibold tabular-nums text-[#FFFFFF]">
            {Math.round(clampedPct)}%
          </span>
        </div>
      </div>

      {/* Linear Progress Bar */}
      <div
        className="h-2 w-full overflow-hidden rounded-sm border border-[#0042A6] bg-[#07173F]"
        role="progressbar"
        aria-valuenow={Math.round(clampedPct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${title} remaining percentage`}
      >
        <div
          className={`h-full transition-all duration-150 ${style.barClass}`}
          style={{ width: `${clampedPct}%` }}
        />
      </div>

      {/* Resource Breakdown Metadata */}
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-[#0042A6]/80 pt-2.5 text-[11px]">
        <div>
          <dt className="text-[#FFFFFF]/60">Initial</dt>
          <dd className="font-mono tabular-nums text-[#FFFFFF]">
            {initialDisplay}
          </dd>
        </div>
        <div>
          <dt className="text-[#FFFFFF]/60">Rate</dt>
          <dd className="font-mono tabular-nums text-[#FFFFFF]">
            {consumptionRateDisplay}
          </dd>
        </div>
        <div className="col-span-2 flex items-center justify-between border-t border-[#0042A6]/45 pt-1.5">
          <dt className="text-[#FFFFFF]/60">Estimated zero-mark</dt>
          <dd className="font-mono tabular-nums text-[#2F96F5]">
            {zeroMarkHours !== null ? `T+${zeroMarkHours.toFixed(2)} hrs` : 'N/A (0 rate)'}
          </dd>
        </div>
      </dl>
    </article>
  );
};
